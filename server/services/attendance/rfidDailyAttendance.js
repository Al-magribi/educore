export const JAKARTA_TZ = "Asia/Jakarta";

export const toJakartaDateString = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

export const getJakartaIsoDow = (date) => {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TZ,
    weekday: "short",
  }).format(date);
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[weekday] || 1;
};

export const normalizeTimeText = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.length === 5 ? `${text}:00` : text;
};

export const jakartaLocalToDate = (dateStr, timeText) => {
  const time = normalizeTimeText(timeText);
  if (!dateStr || !time) return null;
  return new Date(`${dateStr}T${time}+07:00`);
};

const evaluateCheckinStatus = (scannedAt, dayRule) => {
  if (!dayRule?.reference_checkin_time) {
    return { status: "present", lateMinutes: 0 };
  }

  const attendanceDate = toJakartaDateString(scannedAt);
  const referenceAt = jakartaLocalToDate(
    attendanceDate,
    dayRule.reference_checkin_time,
  );
  if (!referenceAt) {
    return { status: "present", lateMinutes: 0 };
  }

  const toleranceMinutes = Number(dayRule.late_tolerance_minutes || 0);
  const diffMinutes = Math.floor(
    (scannedAt.getTime() - referenceAt.getTime()) / 60000,
  );

  if (diffMinutes <= toleranceMinutes) {
    return { status: "present", lateMinutes: 0 };
  }

  return { status: "late", lateMinutes: diffMinutes };
};

export const countTeacherScheduleSessions = async (
  client,
  { homebaseId, periodeId, teacherId, dayOfWeek },
) => {
  if (!periodeId) return 0;

  const result = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM lms.l_schedule_entry
     WHERE homebase_id = $1
       AND periode_id = $2
       AND teacher_id = $3
       AND day_of_week = $4
       AND status = 'published'`,
    [homebaseId, periodeId, teacherId, dayOfWeek],
  );

  return Number(result.rows[0]?.total || 0);
};

const isTeacherWithoutScheduleToday = async (
  client,
  { targetRole, policy, homebaseId, periodeId, userId, scannedAt },
) => {
  if (
    targetRole !== "teacher" ||
    policy?.policy_type !== "teacher_schedule_based"
  ) {
    return false;
  }

  const sessionCount = await countTeacherScheduleSessions(client, {
    homebaseId,
    periodeId,
    teacherId: userId,
    dayOfWeek: getJakartaIsoDow(scannedAt),
  });

  return sessionCount === 0;
};

const resolveDailyCheckinEvaluation = async (client, ctx) => {
  if (await isTeacherWithoutScheduleToday(client, ctx)) {
    return {
      status: "not_scheduled",
      lateMinutes: 0,
      requiredToAttend: false,
      requirementSource: "schedule",
      notes: "Tap kartu tanpa jadwal mengajar pada hari ini.",
    };
  }

  const { status, lateMinutes } = evaluateCheckinStatus(
    ctx.scannedAt,
    ctx.dayRule,
  );

  return {
    status,
    lateMinutes,
    requiredToAttend: true,
    requirementSource:
      ctx.targetRole === "teacher" &&
      ctx.policy?.policy_type === "teacher_schedule_based"
        ? "schedule"
        : "policy",
    notes: null,
  };
};

export const getUserAttendanceContext = async (client, userId, homebaseId) => {
  const result = await client.query(
    `SELECT
       u.id AS user_id,
       CASE
         WHEN st.user_id IS NOT NULL THEN 'student'
         WHEN t.user_id IS NOT NULL THEN 'teacher'
         ELSE NULL
       END AS target_role,
       st.current_class_id,
       c.grade_id
     FROM u_users u
     LEFT JOIN u_students st ON st.user_id = u.id
     LEFT JOIN u_teachers t ON t.user_id = u.id
     LEFT JOIN a_class c ON c.id = st.current_class_id
     WHERE u.id = $1
       AND (
         (st.user_id IS NOT NULL AND st.homebase_id = $2)
         OR (t.user_id IS NOT NULL AND t.homebase_id = $2)
       )
     LIMIT 1`,
    [userId, homebaseId],
  );

  return result.rows[0] || null;
};

export const resolvePolicyForUser = async (
  client,
  { homebaseId, userId, targetRole, classId, gradeId, attendanceDate },
) => {
  const result = await client.query(
    `SELECT
       p.id,
       p.policy_type,
       p.target_role,
       p.name
     FROM attendance.attendance_policy_assignment a
     JOIN attendance.attendance_policy p ON p.id = a.policy_id
     WHERE p.homebase_id = $1
       AND p.is_active = true
       AND a.is_active = true
       AND p.target_role = $2
       AND (a.effective_start_date IS NULL OR a.effective_start_date <= $3::date)
       AND (a.effective_end_date IS NULL OR a.effective_end_date >= $3::date)
       AND (
         (a.assignment_scope = 'user' AND a.user_id = $4)
         OR (a.assignment_scope = 'class' AND a.class_id = $5)
         OR (a.assignment_scope = 'grade' AND a.grade_id = $6)
         OR (a.assignment_scope = 'homebase' AND a.homebase_id = $1)
       )
     ORDER BY
       CASE a.assignment_scope
         WHEN 'user' THEN 1
         WHEN 'class' THEN 2
         WHEN 'grade' THEN 3
         WHEN 'homebase' THEN 4
         ELSE 5
       END,
       a.id DESC
     LIMIT 1`,
    [homebaseId, targetRole, attendanceDate, userId, classId, gradeId],
  );

  return result.rows[0] || null;
};

export const getDayRule = async (client, policyId, dayOfWeek) => {
  const result = await client.query(
    `SELECT
       id,
       day_of_week,
       is_active,
       checkin_start,
       checkin_end,
       reference_checkin_time,
       late_tolerance_minutes,
       checkout_start,
       reference_checkout_time,
       checkout_is_optional,
       min_presence_minutes
     FROM attendance.attendance_policy_day_rule
     WHERE policy_id = $1
       AND day_of_week = $2
       AND is_active = true
     LIMIT 1`,
    [policyId, dayOfWeek],
  );

  return result.rows[0] || null;
};

const DUPLICATE_DEBOUNCE_MINUTES = 5;
const MIN_CHECKIN_TO_CHECKOUT_MINUTES = 15;

const DAILY_SCAN_ACTIONS = new Set(["daily_checkin", "daily_checkout"]);
export const DAILY_GATE_ACTION = "daily_gate";

export const isDailyGateAction = (scanAction) =>
  String(scanAction || "").trim() === DAILY_GATE_ACTION;

const formatTimeLabel = (value) => {
  const normalized = normalizeTimeText(value);
  if (!normalized) return "-";
  return normalized.slice(0, 5);
};

const isWithinTimeWindow = (scannedAt, attendanceDate, windowStart, windowEnd) => {
  const startAt = jakartaLocalToDate(attendanceDate, windowStart);
  const endAt = jakartaLocalToDate(attendanceDate, windowEnd);
  if (!startAt || !endAt) {
    return { valid: true };
  }

  const scannedMs = scannedAt.getTime();
  if (scannedMs < startAt.getTime()) {
    return {
      valid: false,
      reason: `Scan di luar jendela waktu (mulai ${formatTimeLabel(windowStart)} WIB).`,
    };
  }
  if (scannedMs > endAt.getTime()) {
    return {
      valid: false,
      reason: `Scan di luar jendela waktu (batas ${formatTimeLabel(windowEnd)} WIB).`,
    };
  }

  return { valid: true };
};

export const resolveScanPolicyDayRule = async (
  client,
  { homebaseId, userId, scannedAt },
) => {
  const userCtx = await getUserAttendanceContext(client, userId, homebaseId);
  if (!userCtx?.target_role) {
    return null;
  }

  const attendanceDate = toJakartaDateString(scannedAt);
  const dayOfWeek = getJakartaIsoDow(scannedAt);
  const policy = await resolvePolicyForUser(client, {
    homebaseId,
    userId,
    targetRole: userCtx.target_role,
    classId: userCtx.current_class_id,
    gradeId: userCtx.grade_id,
    attendanceDate,
  });

  if (!policy) {
    return null;
  }

  return getDayRule(client, policy.id, dayOfWeek);
};

export const validateScanTimeWindow = (scannedAt, dayRule, scanAction) => {
  if (!dayRule || !DAILY_SCAN_ACTIONS.has(scanAction)) {
    return { valid: true };
  }

  const attendanceDate = toJakartaDateString(scannedAt);

  if (scanAction === "daily_checkin") {
    if (!dayRule.checkin_start || !dayRule.checkin_end) {
      return { valid: true };
    }
    return isWithinTimeWindow(
      scannedAt,
      attendanceDate,
      dayRule.checkin_start,
      dayRule.checkin_end,
    );
  }

  if (scanAction === "daily_checkout") {
    if (!dayRule.checkout_start || !dayRule.reference_checkout_time) {
      return { valid: true };
    }
    return isWithinTimeWindow(
      scannedAt,
      attendanceDate,
      dayRule.checkout_start,
      dayRule.reference_checkout_time,
    );
  }

  return { valid: true };
};

export const checkDuplicateScan = async (
  client,
  { homebaseId, cardUid, scanAction, scannedAt },
) => {
  const debounceStart = new Date(
    scannedAt.getTime() - DUPLICATE_DEBOUNCE_MINUTES * 60 * 1000,
  );

  const recentRes = await client.query(
    `SELECT id
     FROM attendance.rfid_scan_log
     WHERE homebase_id = $1
       AND card_uid = $2
       AND scan_action = $3
       AND result_status = 'accepted'
       AND scanned_at >= $4::timestamptz
       AND scanned_at < $5::timestamptz
     ORDER BY scanned_at DESC
     LIMIT 1`,
    [
      homebaseId,
      cardUid,
      scanAction,
      debounceStart.toISOString(),
      scannedAt.toISOString(),
    ],
  );

  if (recentRes.rowCount > 0) {
    return {
      isDuplicate: true,
      reason: `Scan duplikat dalam ${DUPLICATE_DEBOUNCE_MINUTES} menit terakhir.`,
    };
  }

  if (!DAILY_SCAN_ACTIONS.has(scanAction)) {
    return { isDuplicate: false };
  }

  const attendanceDate = toJakartaDateString(scannedAt);
  const sameDayRes = await client.query(
    `SELECT id
     FROM attendance.rfid_scan_log
     WHERE homebase_id = $1
       AND card_uid = $2
       AND scan_action = $3
       AND result_status = 'accepted'
       AND (scanned_at AT TIME ZONE '${JAKARTA_TZ}')::date = $4::date
     LIMIT 1`,
    [homebaseId, cardUid, scanAction, attendanceDate],
  );

  if (sameDayRes.rowCount > 0) {
    return {
      isDuplicate: true,
      reason:
        scanAction === "daily_checkin"
          ? "Checkin hari ini sudah tercatat."
          : "Checkout hari ini sudah tercatat.",
    };
  }

  return { isDuplicate: false };
};

export const resolveDailyGateScanAction = async (
  client,
  { homebaseId, userId, cardUid, scannedAt },
) => {
  const attendanceDate = toJakartaDateString(scannedAt);

  const dailyRes = await client.query(
    `SELECT id, checkin_at, checkout_at
     FROM attendance.daily_attendance
     WHERE user_id = $1
       AND attendance_date = $2::date
     LIMIT 1`,
    [userId, attendanceDate],
  );
  const daily = dailyRes.rows[0];

  const checkinScanRes = await client.query(
    `SELECT id
     FROM attendance.rfid_scan_log
     WHERE homebase_id = $1
       AND card_uid = $2
       AND scan_action = 'daily_checkin'
       AND result_status = 'accepted'
       AND (scanned_at AT TIME ZONE '${JAKARTA_TZ}')::date = $3::date
     LIMIT 1`,
    [homebaseId, cardUid, attendanceDate],
  );

  const checkoutScanRes = await client.query(
    `SELECT id
     FROM attendance.rfid_scan_log
     WHERE homebase_id = $1
       AND card_uid = $2
       AND scan_action = 'daily_checkout'
       AND result_status = 'accepted'
       AND (scanned_at AT TIME ZONE '${JAKARTA_TZ}')::date = $3::date
     LIMIT 1`,
    [homebaseId, cardUid, attendanceDate],
  );

  const hasCheckin = Boolean(daily?.checkin_at) || checkinScanRes.rowCount > 0;
  const hasCheckout =
    Boolean(daily?.checkout_at) || checkoutScanRes.rowCount > 0;

  if (!hasCheckin) {
    return { resolvedAction: "daily_checkin", error: null };
  }

  if (!hasCheckout) {
    if (daily?.checkin_at) {
      const checkinAt = new Date(daily.checkin_at);
      const elapsedMinutes = Math.floor(
        (scannedAt.getTime() - checkinAt.getTime()) / 60000,
      );
      if (elapsedMinutes < MIN_CHECKIN_TO_CHECKOUT_MINUTES) {
        return {
          resolvedAction: null,
          error: `Tap pulang terlalu cepat. Tunggu minimal ${MIN_CHECKIN_TO_CHECKOUT_MINUTES} menit setelah tap datang.`,
        };
      }
    }

    return { resolvedAction: "daily_checkout", error: null };
  }

  return {
    resolvedAction: null,
    error: "Presensi hari ini sudah lengkap (datang dan pulang tercatat).",
  };
};

const insertAttendanceEvent = async (
  client,
  { attendanceId, scanLogId, eventType, eventTime },
) => {
  await client.query(
    `INSERT INTO attendance.daily_attendance_event (
       attendance_id,
       scan_log_id,
       event_type,
       event_time,
       event_source,
       event_result
     )
     VALUES ($1, $2, $3, $4::timestamptz, 'rfid', 'applied')`,
    [attendanceId, scanLogId, eventType, eventTime.toISOString()],
  );
};

const applyDailyCheckin = async (
  client,
  {
    homebaseId,
    periodeId,
    userId,
    targetRole,
    policy,
    dayRule,
    scannedAt,
    scanLogId,
  },
) => {
  const attendanceDate = toJakartaDateString(scannedAt);
  const evaluation = await resolveDailyCheckinEvaluation(client, {
    targetRole,
    policy,
    dayRule,
    scannedAt,
    homebaseId,
    periodeId,
    userId,
  });
  const {
    status,
    lateMinutes,
    requiredToAttend,
    requirementSource,
    notes,
  } = evaluation;
  const minimumRequiredMinutes = dayRule?.min_presence_minutes ?? null;
  const isCheckoutOptional = dayRule?.checkout_is_optional === true;

  const existingRes = await client.query(
    `SELECT id, checkin_at
     FROM attendance.daily_attendance
     WHERE user_id = $1
       AND attendance_date = $2::date
     LIMIT 1`,
    [userId, attendanceDate],
  );

  let attendanceId;

  if (existingRes.rowCount === 0) {
    const inserted = await client.query(
      `INSERT INTO attendance.daily_attendance (
         homebase_id,
         periode_id,
         user_id,
         policy_id,
         attendance_date,
         target_role,
         policy_type,
         required_to_attend,
         requirement_source,
         checkin_at,
         first_gate_scan_id,
         attendance_status,
         late_minutes,
         minimum_required_minutes,
         is_checkout_optional,
         notes,
         evaluated_at,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5::date, $6, $7, $8, $9,
         $10::timestamptz, $11, $12, $13, $14, $15, $16, NOW(), NOW()
       )
       RETURNING id, attendance_status`,
      [
        homebaseId,
        periodeId,
        userId,
        policy?.id || null,
        attendanceDate,
        targetRole,
        policy?.policy_type || null,
        requiredToAttend,
        requirementSource,
        scannedAt.toISOString(),
        scanLogId,
        status,
        lateMinutes,
        minimumRequiredMinutes,
        isCheckoutOptional,
        notes,
      ],
    );
    attendanceId = inserted.rows[0].id;
    await insertAttendanceEvent(client, {
      attendanceId,
      scanLogId,
      eventType: "checkin",
      eventTime: scannedAt,
    });

    return {
      attendance_id: attendanceId,
      attendance_status: inserted.rows[0].attendance_status,
      attendance_date: attendanceDate,
      is_new_checkin: true,
    };
  }

  const existing = existingRes.rows[0];
  attendanceId = existing.id;

  if (!existing.checkin_at) {
    const updated = await client.query(
      `UPDATE attendance.daily_attendance
       SET
         policy_id = COALESCE($2, policy_id),
         policy_type = COALESCE($3, policy_type),
         required_to_attend = $4,
         requirement_source = $5,
         checkin_at = $6::timestamptz,
         first_gate_scan_id = $7,
         attendance_status = $8,
         late_minutes = $9,
         minimum_required_minutes = COALESCE($10, minimum_required_minutes),
         is_checkout_optional = COALESCE($11, is_checkout_optional),
         notes = COALESCE($12, notes),
         evaluated_at = NOW(),
         updated_at = NOW()
       WHERE id = $1
       RETURNING id, attendance_status`,
      [
        attendanceId,
        policy?.id || null,
        policy?.policy_type || null,
        requiredToAttend,
        requirementSource,
        scannedAt.toISOString(),
        scanLogId,
        status,
        lateMinutes,
        minimumRequiredMinutes,
        isCheckoutOptional,
        notes,
      ],
    );
    await insertAttendanceEvent(client, {
      attendanceId,
      scanLogId,
      eventType: "checkin",
      eventTime: scannedAt,
    });

    return {
      attendance_id: attendanceId,
      attendance_status: updated.rows[0].attendance_status,
      attendance_date: attendanceDate,
      is_new_checkin: true,
    };
  }

  return {
    attendance_id: attendanceId,
    attendance_status: status,
    attendance_date: attendanceDate,
    is_new_checkin: false,
  };
};

const applyDailyCheckout = async (
  client,
  {
    homebaseId,
    periodeId,
    userId,
    targetRole,
    policy,
    dayRule,
    scannedAt,
    scanLogId,
  },
) => {
  const attendanceDate = toJakartaDateString(scannedAt);
  const minimumRequiredMinutes = dayRule?.min_presence_minutes ?? null;
  const isCheckoutOptional = dayRule?.checkout_is_optional === true;
  const teacherWithoutSchedule = await isTeacherWithoutScheduleToday(client, {
    targetRole,
    policy,
    homebaseId,
    periodeId,
    userId,
    scannedAt,
  });

  const existingRes = await client.query(
    `SELECT id, checkin_at, checkout_at, attendance_status, late_minutes
     FROM attendance.daily_attendance
     WHERE user_id = $1
       AND attendance_date = $2::date
     LIMIT 1`,
    [userId, attendanceDate],
  );

  let attendanceId;
  let checkinAt = existingRes.rows[0]?.checkin_at
    ? new Date(existingRes.rows[0].checkin_at)
    : null;
  let lateMinutes = existingRes.rows[0]?.late_minutes || 0;
  let attendanceStatus = existingRes.rows[0]?.attendance_status || "pending";

  if (existingRes.rowCount === 0) {
    const checkoutStatus = teacherWithoutSchedule ? "not_scheduled" : "incomplete";
    const inserted = await client.query(
      `INSERT INTO attendance.daily_attendance (
         homebase_id,
         periode_id,
         user_id,
         policy_id,
         attendance_date,
         target_role,
         policy_type,
         required_to_attend,
         requirement_source,
         checkout_at,
         last_gate_scan_id,
         attendance_status,
         minimum_required_minutes,
         is_checkout_optional,
         notes,
         evaluated_at,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5::date, $6, $7, $8, $9,
         $10::timestamptz, $11, $12, $13, $14, $15, NOW(), NOW()
       )
       RETURNING id, attendance_status`,
      [
        homebaseId,
        periodeId,
        userId,
        policy?.id || null,
        attendanceDate,
        targetRole,
        policy?.policy_type || null,
        !teacherWithoutSchedule,
        teacherWithoutSchedule ? "schedule" : "policy",
        scannedAt.toISOString(),
        scanLogId,
        checkoutStatus,
        minimumRequiredMinutes,
        isCheckoutOptional,
        teacherWithoutSchedule
          ? "Tap kartu tanpa jadwal mengajar pada hari ini."
          : null,
      ],
    );
    attendanceId = inserted.rows[0].id;
    await insertAttendanceEvent(client, {
      attendanceId,
      scanLogId,
      eventType: "checkout",
      eventTime: scannedAt,
    });

    return {
      attendance_id: attendanceId,
      attendance_status: inserted.rows[0].attendance_status,
      attendance_date: attendanceDate,
    };
  }

  attendanceId = existingRes.rows[0].id;
  if (!checkinAt && existingRes.rows[0].checkin_at) {
    checkinAt = new Date(existingRes.rows[0].checkin_at);
  }

  let presenceMinutes = null;
  if (checkinAt) {
    presenceMinutes = Math.max(
      0,
      Math.floor((scannedAt.getTime() - checkinAt.getTime()) / 60000),
    );
    if (attendanceStatus !== "not_scheduled") {
      if (
        minimumRequiredMinutes &&
        presenceMinutes < minimumRequiredMinutes &&
        attendanceStatus !== "late"
      ) {
        attendanceStatus =
          attendanceStatus === "absent" ? "absent" : "insufficient_hours";
      } else if (attendanceStatus === "pending") {
        attendanceStatus = lateMinutes > 0 ? "late" : "present";
      }
    }
  } else if (!teacherWithoutSchedule && attendanceStatus !== "not_scheduled") {
    attendanceStatus = "incomplete";
  } else if (teacherWithoutSchedule) {
    attendanceStatus = "not_scheduled";
  }

  const updated = await client.query(
    `UPDATE attendance.daily_attendance
     SET
       policy_id = COALESCE($2, policy_id),
       policy_type = COALESCE($3, policy_type),
       checkout_at = $4::timestamptz,
       last_gate_scan_id = $5,
       attendance_status = $6,
       presence_minutes = $7,
       minimum_required_minutes = COALESCE($8, minimum_required_minutes),
       is_checkout_optional = COALESCE($9, is_checkout_optional),
       evaluated_at = NOW(),
       updated_at = NOW()
     WHERE id = $1
     RETURNING id, attendance_status`,
    [
      attendanceId,
      policy?.id || null,
      policy?.policy_type || null,
      scannedAt.toISOString(),
      scanLogId,
      attendanceStatus,
      presenceMinutes,
      minimumRequiredMinutes,
      isCheckoutOptional,
    ],
  );

  await insertAttendanceEvent(client, {
    attendanceId,
    scanLogId,
    eventType: "checkout",
    eventTime: scannedAt,
  });

  return {
    attendance_id: attendanceId,
    attendance_status: updated.rows[0].attendance_status,
    attendance_date: attendanceDate,
  };
};

export const applyRfidScanToDailyAttendance = async (
  client,
  {
    homebaseId,
    periodeId,
    userId,
    scanAction,
    scannedAt,
    scanLogId,
  },
) => {
  if (scanAction !== "daily_checkin" && scanAction !== "daily_checkout") {
    return null;
  }

  const userCtx = await getUserAttendanceContext(client, userId, homebaseId);
  if (!userCtx?.target_role) {
    return null;
  }

  const attendanceDate = toJakartaDateString(scannedAt);
  const dayOfWeek = getJakartaIsoDow(scannedAt);
  const policy = await resolvePolicyForUser(client, {
    homebaseId,
    userId,
    targetRole: userCtx.target_role,
    classId: userCtx.current_class_id,
    gradeId: userCtx.grade_id,
    attendanceDate,
  });

  const dayRule = policy
    ? await getDayRule(client, policy.id, dayOfWeek)
    : null;

  const baseCtx = {
    homebaseId,
    periodeId,
    userId,
    targetRole: userCtx.target_role,
    policy,
    dayRule,
    scannedAt,
    scanLogId,
  };

  const result =
    scanAction === "daily_checkin"
      ? await applyDailyCheckin(client, baseCtx)
      : await applyDailyCheckout(client, baseCtx);

  if (result?.attendance_id) {
    await client.query(
      `UPDATE attendance.rfid_scan_log
       SET attendance_id = $2
       WHERE id = $1`,
      [scanLogId, result.attendance_id],
    );
  }

  return result;
};

export const reconcilePendingScanLogs = async (
  pool,
  { homebaseId, startDate = null, endDate = null } = {},
) => {
  if (!homebaseId) {
    return { pending: 0, processed: 0 };
  }

  const params = [homebaseId];
  const dateFilter =
    startDate && endDate
      ? `AND (sl.scanned_at AT TIME ZONE '${JAKARTA_TZ}')::date BETWEEN $2::date AND $3::date`
      : "";

  if (startDate && endDate) {
    params.push(startDate, endDate);
  }

  const pendingRes = await pool.query(
    `SELECT
       sl.id,
       sl.homebase_id,
       sl.periode_id,
       sl.user_id,
       sl.scan_action,
       sl.scanned_at
     FROM attendance.rfid_scan_log sl
     JOIN attendance.rfid_device d ON d.id = sl.device_id
     WHERE sl.homebase_id = $1
       AND sl.result_status = 'accepted'
       AND sl.attendance_id IS NULL
       AND sl.user_id IS NOT NULL
       AND d.device_type = 'gate'
       AND sl.scan_action IN ('daily_checkin', 'daily_checkout')
       ${dateFilter}
     ORDER BY sl.scanned_at ASC, sl.id ASC`,
    params,
  );

  let processed = 0;

  for (const scan of pendingRes.rows) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await applyRfidScanToDailyAttendance(client, {
        homebaseId: scan.homebase_id,
        periodeId: scan.periode_id,
        userId: scan.user_id,
        scanAction: scan.scan_action,
        scannedAt: new Date(scan.scanned_at),
        scanLogId: scan.id,
      });
      await client.query("COMMIT");
      if (result?.attendance_id) {
        processed += 1;
      }
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(
        `[attendance] Gagal rekonsiliasi scan log ${scan.id}:`,
        error.message,
      );
    } finally {
      client.release();
    }
  }

  return {
    pending: pendingRes.rowCount,
    processed,
  };
};
