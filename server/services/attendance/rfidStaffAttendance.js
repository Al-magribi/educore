import {
  MIN_CHECKIN_TO_CHECKOUT_MINUTES,
  evaluateCheckinStatus,
  getDayRule,
  getJakartaIsoDow,
  toJakartaDateString,
} from "./rfidDailyAttendance.js";

export const STAFF_POLICY_TYPE = "staff_fixed_daily";
export const STAFF_TARGET_ROLE = "staff";

export const findStaffByCardUid = async (client, cardUid) => {
  const result = await client.query(
    `SELECT id, homebase_id, full_name, nip, is_active
     FROM public.u_staff
     WHERE rfid_no IS NOT NULL
       AND lower(trim(rfid_no)) = lower(trim($1))
     LIMIT 1`,
    [cardUid],
  );
  return result.rows[0] || null;
};

export const resolveStaffPolicy = async (client, homebaseId) => {
  const result = await client.query(
    `SELECT id, name, code, policy_type, target_role
     FROM attendance.attendance_policy
     WHERE homebase_id = $1
       AND is_active = true
       AND target_role = $2
       AND policy_type = $3
     ORDER BY updated_at DESC NULLS LAST, id DESC
     LIMIT 1`,
    [homebaseId, STAFF_TARGET_ROLE, STAFF_POLICY_TYPE],
  );
  return result.rows[0] || null;
};

export const resolveStaffPolicyDayRule = async (client, { homebaseId, scannedAt }) => {
  const policy = await resolveStaffPolicy(client, homebaseId);
  if (!policy) return { policy: null, dayRule: null };
  const dayRule = await getDayRule(client, policy.id, getJakartaIsoDow(scannedAt));
  return { policy, dayRule };
};

const findStaffDaily = async (client, staffId, attendanceDate) => {
  const result = await client.query(
    `SELECT id, checkin_at, checkout_at, attendance_status, late_minutes
     FROM attendance.staff_daily_attendance
     WHERE staff_id = $1
       AND attendance_date = $2::date
     LIMIT 1`,
    [staffId, attendanceDate],
  );
  return result.rows[0] || null;
};

export const resolveStaffGateScanAction = async (client, { staffId, scannedAt }) => {
  const daily = await findStaffDaily(client, staffId, toJakartaDateString(scannedAt));

  if (!daily?.checkin_at && !daily?.checkout_at) {
    return { resolvedAction: "daily_checkin", error: null };
  }

  if (!daily.checkout_at) {
    const elapsedMinutes = Math.floor(
      (scannedAt.getTime() - new Date(daily.checkin_at).getTime()) / 60000,
    );
    if (elapsedMinutes < MIN_CHECKIN_TO_CHECKOUT_MINUTES) {
      return {
        resolvedAction: null,
        error: `Tap pulang terlalu cepat. Tunggu minimal ${MIN_CHECKIN_TO_CHECKOUT_MINUTES} menit setelah tap datang.`,
      };
    }
    return { resolvedAction: "daily_checkout", error: null };
  }

  return {
    resolvedAction: null,
    error: "Presensi hari ini sudah lengkap (datang dan pulang tercatat).",
  };
};

const applyStaffCheckin = async (
  client,
  { homebaseId, periodeId, staffId, policy, dayRule, scannedAt, scanLogId },
) => {
  const attendanceDate = toJakartaDateString(scannedAt);
  const { status, lateMinutes } = evaluateCheckinStatus(scannedAt, dayRule);
  const minimumRequiredMinutes = dayRule?.min_presence_minutes ?? null;
  const isCheckoutOptional = dayRule?.checkout_is_optional === true;
  const existing = await findStaffDaily(client, staffId, attendanceDate);

  if (!existing) {
    const inserted = await client.query(
      `INSERT INTO attendance.staff_daily_attendance (
         homebase_id, periode_id, staff_id, policy_id, attendance_date,
         checkin_at, first_gate_scan_id, attendance_status, late_minutes,
         minimum_required_minutes, is_checkout_optional
       )
       VALUES ($1, $2, $3, $4, $5::date, $6::timestamptz, $7, $8, $9, $10, $11)
       RETURNING id, attendance_status`,
      [
        homebaseId,
        periodeId,
        staffId,
        policy?.id || null,
        attendanceDate,
        scannedAt.toISOString(),
        scanLogId,
        status,
        lateMinutes,
        minimumRequiredMinutes,
        isCheckoutOptional,
      ],
    );
    return {
      attendance_id: inserted.rows[0].id,
      attendance_status: inserted.rows[0].attendance_status,
      attendance_date: attendanceDate,
    };
  }

  if (existing.checkin_at) {
    return {
      attendance_id: existing.id,
      attendance_status: existing.attendance_status,
      attendance_date: attendanceDate,
    };
  }

  const updated = await client.query(
    `UPDATE attendance.staff_daily_attendance
     SET policy_id = COALESCE($2, policy_id),
         checkin_at = $3::timestamptz,
         first_gate_scan_id = $4,
         attendance_status = $5,
         late_minutes = $6,
         minimum_required_minutes = COALESCE($7, minimum_required_minutes),
         is_checkout_optional = $8,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, attendance_status`,
    [
      existing.id,
      policy?.id || null,
      scannedAt.toISOString(),
      scanLogId,
      status,
      lateMinutes,
      minimumRequiredMinutes,
      isCheckoutOptional,
    ],
  );
  return {
    attendance_id: updated.rows[0].id,
    attendance_status: updated.rows[0].attendance_status,
    attendance_date: attendanceDate,
  };
};

const applyStaffCheckout = async (
  client,
  { homebaseId, periodeId, staffId, policy, dayRule, scannedAt, scanLogId },
) => {
  const attendanceDate = toJakartaDateString(scannedAt);
  const minimumRequiredMinutes = dayRule?.min_presence_minutes ?? null;
  const isCheckoutOptional = dayRule?.checkout_is_optional === true;
  const existing = await findStaffDaily(client, staffId, attendanceDate);

  if (!existing) {
    const inserted = await client.query(
      `INSERT INTO attendance.staff_daily_attendance (
         homebase_id, periode_id, staff_id, policy_id, attendance_date,
         checkout_at, last_gate_scan_id, attendance_status,
         minimum_required_minutes, is_checkout_optional
       )
       VALUES ($1, $2, $3, $4, $5::date, $6::timestamptz, $7, 'incomplete', $8, $9)
       RETURNING id, attendance_status`,
      [
        homebaseId,
        periodeId,
        staffId,
        policy?.id || null,
        attendanceDate,
        scannedAt.toISOString(),
        scanLogId,
        minimumRequiredMinutes,
        isCheckoutOptional,
      ],
    );
    return {
      attendance_id: inserted.rows[0].id,
      attendance_status: inserted.rows[0].attendance_status,
      attendance_date: attendanceDate,
    };
  }

  let attendanceStatus = existing.attendance_status || "pending";
  let presenceMinutes = null;
  if (existing.checkin_at) {
    presenceMinutes = Math.max(
      0,
      Math.floor((scannedAt.getTime() - new Date(existing.checkin_at).getTime()) / 60000),
    );
    if (
      minimumRequiredMinutes &&
      presenceMinutes < minimumRequiredMinutes &&
      attendanceStatus !== "late"
    ) {
      attendanceStatus = "insufficient_hours";
    } else if (attendanceStatus === "pending") {
      attendanceStatus = Number(existing.late_minutes) > 0 ? "late" : "present";
    }
  } else {
    attendanceStatus = "incomplete";
  }

  const updated = await client.query(
    `UPDATE attendance.staff_daily_attendance
     SET policy_id = COALESCE($2, policy_id),
         checkout_at = $3::timestamptz,
         last_gate_scan_id = $4,
         attendance_status = $5,
         presence_minutes = $6,
         minimum_required_minutes = COALESCE($7, minimum_required_minutes),
         is_checkout_optional = $8,
         updated_at = NOW()
     WHERE id = $1
     RETURNING id, attendance_status`,
    [
      existing.id,
      policy?.id || null,
      scannedAt.toISOString(),
      scanLogId,
      attendanceStatus,
      presenceMinutes,
      minimumRequiredMinutes,
      isCheckoutOptional,
    ],
  );
  return {
    attendance_id: updated.rows[0].id,
    attendance_status: updated.rows[0].attendance_status,
    attendance_date: attendanceDate,
  };
};

export const applyRfidScanToStaffAttendance = async (client, ctx) => {
  if (ctx.scanAction === "daily_checkin") return applyStaffCheckin(client, ctx);
  if (ctx.scanAction === "daily_checkout") return applyStaffCheckout(client, ctx);
  return null;
};

/** Hapus rekap tendik yang terkait log scan; kembalikan id log scan lain dari rekap yang sama. */
export const deleteStaffAttendanceForScanLogs = async (client, { homebaseId, scanLogIds }) => {
  if (!scanLogIds.length) return [];
  const exists = await client.query(
    `SELECT to_regclass('attendance.staff_daily_attendance') AS rel`,
  );
  if (!exists.rows[0]?.rel) return [];

  const deleted = await client.query(
    `DELETE FROM attendance.staff_daily_attendance
     WHERE homebase_id = $1
       AND (first_gate_scan_id = ANY($2::bigint[]) OR last_gate_scan_id = ANY($2::bigint[]))
     RETURNING first_gate_scan_id, last_gate_scan_id`,
    [homebaseId, scanLogIds],
  );

  return deleted.rows
    .flatMap((row) => [row.first_gate_scan_id, row.last_gate_scan_id])
    .filter(Boolean)
    .map(Number);
};
