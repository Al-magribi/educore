import {
  getDayRule,
  getJakartaIsoDow,
  getUserAttendanceContext,
  jakartaLocalToDate,
  toJakartaDateString,
  validateScanTimeWindow,
} from "./rfidDailyAttendance.js";

export const ACTIVITY_GATE_ACTION = "activity_gate";
export const ACTIVITY_CHECKIN_ACTION = "activity_checkin";
export const ACTIVITY_CHECKOUT_ACTION = "activity_checkout";

const isFeatureEnabled = async (client, homebaseId, featureCode) => {
  const result = await client.query(
    `SELECT is_enabled
     FROM attendance.attendance_feature_setting
     WHERE homebase_id = $1
       AND feature_code = $2
     LIMIT 1`,
    [homebaseId, featureCode],
  );
  return result.rows[0]?.is_enabled === true;
};

const formatTimeLabel = (value) => {
  if (!value) return "-";
  const text = String(value).trim();
  return text.length >= 5 ? text.slice(0, 5) : text;
};

/**
 * Ensure the tapped user is assigned to the device-bound activity policy.
 */
export const assertUserAssignedToActivityPolicy = async (
  client,
  {
    homebaseId,
    policyId,
    userId,
    targetRole,
    classId = null,
    gradeId = null,
    attendanceDate,
  },
) => {
  const result = await client.query(
    `SELECT
       a.id,
       a.assignment_scope,
       p.id AS policy_id,
       p.name AS policy_name,
       p.code AS policy_code,
       p.target_role,
       p.policy_type
     FROM attendance.attendance_policy_assignment a
     JOIN attendance.attendance_policy p ON p.id = a.policy_id
     WHERE a.policy_id = $1
       AND p.homebase_id = $2
       AND p.is_active = true
       AND a.is_active = true
       AND p.policy_type = 'activity_fixed'
       AND (p.target_role = 'all' OR p.target_role = $3)
       AND (a.effective_start_date IS NULL OR a.effective_start_date <= $4::date)
       AND (a.effective_end_date IS NULL OR a.effective_end_date >= $4::date)
       AND (
         (a.assignment_scope = 'user' AND a.user_id = $5)
         OR (a.assignment_scope = 'class' AND a.class_id = $6)
         OR (a.assignment_scope = 'grade' AND a.grade_id = $7)
         OR (a.assignment_scope = 'homebase' AND a.homebase_id = $2)
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
    [
      policyId,
      homebaseId,
      targetRole,
      attendanceDate,
      userId,
      classId,
      gradeId,
    ],
  );

  return result.rows[0] || null;
};

export const resolveActivityGateScanAction = async (
  client,
  { homebaseId, userId, policyId, scannedAt },
) => {
  const attendanceDate = toJakartaDateString(scannedAt);
  const existing = await client.query(
    `SELECT id, checkin_at, checkout_at
     FROM attendance.activity_attendance
     WHERE homebase_id = $1
       AND user_id = $2
       AND policy_id = $3
       AND attendance_date = $4::date
     LIMIT 1`,
    [homebaseId, userId, policyId, attendanceDate],
  );

  if (existing.rowCount === 0) {
    return {
      resolvedAction: ACTIVITY_CHECKIN_ACTION,
      error: null,
    };
  }

  const row = existing.rows[0];
  if (!row.checkin_at) {
    return {
      resolvedAction: ACTIVITY_CHECKIN_ACTION,
      error: null,
    };
  }
  if (!row.checkout_at) {
    return {
      resolvedAction: ACTIVITY_CHECKOUT_ACTION,
      error: null,
    };
  }

  return {
    resolvedAction: null,
    error: "Absensi kegiatan hari ini sudah lengkap (check-in + check-out).",
  };
};

const evaluateCheckinStatus = (scannedAt, attendanceDate, dayRule) => {
  if (!dayRule?.reference_checkin_time) {
    return { status: "present", lateMinutes: 0 };
  }

  const referenceAt = jakartaLocalToDate(
    attendanceDate,
    dayRule.reference_checkin_time,
  );
  if (!referenceAt) {
    return { status: "present", lateMinutes: 0 };
  }

  const toleranceMs = Number(dayRule.late_tolerance_minutes || 0) * 60 * 1000;
  const deadline = referenceAt.getTime() + toleranceMs;
  if (scannedAt.getTime() <= deadline) {
    return { status: "present", lateMinutes: 0 };
  }

  const lateMinutes = Math.max(
    0,
    Math.floor((scannedAt.getTime() - referenceAt.getTime()) / 60000),
  );
  return { status: "late", lateMinutes };
};

const upsertActivityAttendanceCheckin = async (
  client,
  {
    homebaseId,
    periodeId,
    userId,
    targetRole,
    policyId,
    deviceId,
    attendanceDate,
    scannedAt,
    scanLogId,
    dayRule,
  },
) => {
  const evaluated = evaluateCheckinStatus(scannedAt, attendanceDate, dayRule);
  const existing = await client.query(
    `SELECT id, checkin_at, checkout_at, attendance_status
     FROM attendance.activity_attendance
     WHERE user_id = $1
       AND policy_id = $2
       AND attendance_date = $3::date
     LIMIT 1`,
    [userId, policyId, attendanceDate],
  );

  if (existing.rowCount === 0) {
    const inserted = await client.query(
      `INSERT INTO attendance.activity_attendance (
         homebase_id,
         periode_id,
         user_id,
         policy_id,
         device_id,
         attendance_date,
         target_role,
         checkin_at,
         first_scan_id,
         last_scan_id,
         attendance_status,
         late_minutes,
         evaluated_at,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6::date, $7, $8::timestamptz, $9, $9, $10, $11, NOW(), NOW()
       )
       RETURNING id, attendance_status, checkin_at, checkout_at, late_minutes`,
      [
        homebaseId,
        periodeId,
        userId,
        policyId,
        deviceId,
        attendanceDate,
        targetRole,
        scannedAt.toISOString(),
        scanLogId,
        evaluated.status,
        evaluated.lateMinutes,
      ],
    );
    return inserted.rows[0];
  }

  const row = existing.rows[0];
  if (row.checkin_at) {
    return {
      ...row,
      duplicate: true,
    };
  }

  const updated = await client.query(
    `UPDATE attendance.activity_attendance
     SET
       device_id = COALESCE($3, device_id),
       checkin_at = $4::timestamptz,
       first_scan_id = COALESCE(first_scan_id, $5),
       last_scan_id = $5,
       attendance_status = $6,
       late_minutes = $7,
       evaluated_at = NOW(),
       updated_at = NOW()
     WHERE id = $1
       AND user_id = $2
     RETURNING id, attendance_status, checkin_at, checkout_at, late_minutes`,
    [
      row.id,
      userId,
      deviceId,
      scannedAt.toISOString(),
      scanLogId,
      evaluated.status,
      evaluated.lateMinutes,
    ],
  );
  return updated.rows[0];
};

const upsertActivityAttendanceCheckout = async (
  client,
  {
    userId,
    policyId,
    deviceId,
    attendanceDate,
    scannedAt,
    scanLogId,
  },
) => {
  const existing = await client.query(
    `SELECT id, checkin_at, checkout_at, attendance_status, late_minutes
     FROM attendance.activity_attendance
     WHERE user_id = $1
       AND policy_id = $2
       AND attendance_date = $3::date
     LIMIT 1`,
    [userId, policyId, attendanceDate],
  );

  if (existing.rowCount === 0 || !existing.rows[0].checkin_at) {
    return { missing_checkin: true };
  }

  const row = existing.rows[0];
  if (row.checkout_at) {
    return { ...row, duplicate: true };
  }

  const checkinAt = new Date(row.checkin_at);
  const presenceMinutes = Math.max(
    0,
    Math.floor((scannedAt.getTime() - checkinAt.getTime()) / 60000),
  );
  const nextStatus =
    row.attendance_status === "late" || row.late_minutes > 0
      ? "late"
      : "present";

  const updated = await client.query(
    `UPDATE attendance.activity_attendance
     SET
       device_id = COALESCE($3, device_id),
       checkout_at = $4::timestamptz,
       last_scan_id = $5,
       presence_minutes = $6,
       attendance_status = $7,
       evaluated_at = NOW(),
       updated_at = NOW()
     WHERE id = $1
       AND user_id = $2
     RETURNING id, attendance_status, checkin_at, checkout_at, late_minutes, presence_minutes`,
    [
      row.id,
      userId,
      deviceId,
      scannedAt.toISOString(),
      scanLogId,
      presenceMinutes,
      nextStatus,
    ],
  );
  return updated.rows[0];
};

export const resolveActivityPolicyForDeviceScan = async (
  client,
  {
    homebaseId,
    userId,
    policyIds = [],
    scannedAt,
  },
) => {
  const candidateIds = [
    ...new Set(
      (Array.isArray(policyIds) ? policyIds : [])
        .map((value) => Number(value))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  if (candidateIds.length === 0) {
    return {
      policyId: null,
      error: "Device ekstra belum terhubung ke policy kegiatan.",
      result_status: "policy_missing",
    };
  }

  const userCtx = await getUserAttendanceContext(client, userId, homebaseId);
  if (!userCtx?.target_role) {
    return {
      policyId: null,
      error: "User bukan siswa/guru aktif di homebase ini.",
      result_status: "rejected",
    };
  }

  const attendanceDate = toJakartaDateString(scannedAt);
  const dayOfWeek = getJakartaIsoDow(scannedAt);
  const matched = [];

  for (const policyId of candidateIds) {
    const policyRes = await client.query(
      `SELECT id, name, code, target_role, policy_type, is_active
       FROM attendance.attendance_policy
       WHERE id = $1
         AND homebase_id = $2
       LIMIT 1`,
      [policyId, homebaseId],
    );
    if (policyRes.rowCount === 0 || policyRes.rows[0].is_active !== true) {
      continue;
    }
    const policy = policyRes.rows[0];
    if (policy.policy_type !== "activity_fixed") continue;
    if (
      policy.target_role !== "all" &&
      policy.target_role !== userCtx.target_role
    ) {
      continue;
    }

    const assignment = await assertUserAssignedToActivityPolicy(client, {
      homebaseId,
      policyId: policy.id,
      userId,
      targetRole: userCtx.target_role,
      classId: userCtx.current_class_id,
      gradeId: userCtx.grade_id,
      attendanceDate,
    });
    if (!assignment) continue;

    const dayRule = await getDayRule(client, policy.id, dayOfWeek);
    if (!dayRule) continue;

    const openAttendance = await client.query(
      `SELECT id, checkin_at, checkout_at
       FROM attendance.activity_attendance
       WHERE homebase_id = $1
         AND user_id = $2
         AND policy_id = $3
         AND attendance_date = $4::date
       LIMIT 1`,
      [homebaseId, userId, policy.id, attendanceDate],
    );
    const openRow = openAttendance.rows[0] || null;
    const needsCheckout = Boolean(openRow?.checkin_at && !openRow?.checkout_at);
    const alreadyComplete = Boolean(openRow?.checkin_at && openRow?.checkout_at);

    matched.push({
      policyId: Number(policy.id),
      needsCheckout,
      alreadyComplete,
      policyName: policy.name,
    });
  }

  if (matched.length === 0) {
    return {
      policyId: null,
      error:
        "User belum ditugaskan ke salah satu policy kegiatan pada device ini, atau hari ini tidak ada jadwal.",
      result_status: "policy_missing",
    };
  }

  const checkoutCandidate = matched.find((item) => item.needsCheckout);
  if (checkoutCandidate) {
    return { policyId: checkoutCandidate.policyId, error: null, result_status: null };
  }

  const openCandidates = matched.filter((item) => !item.alreadyComplete);
  if (openCandidates.length === 0) {
    return {
      policyId: matched[0].policyId,
      error: "Absensi kegiatan hari ini sudah lengkap (check-in + check-out).",
      result_status: "duplicate",
    };
  }

  return { policyId: openCandidates[0].policyId, error: null, result_status: null };
};

export const applyRfidScanToActivityAttendance = async (
  client,
  {
    homebaseId,
    periodeId,
    userId,
    policyId,
    policyIds = null,
    deviceId,
    scanAction,
    scannedAt,
    scanLogId,
    autoResolveAction = false,
  },
) => {
  if (
    !(await isFeatureEnabled(client, homebaseId, "activity_attendance"))
  ) {
    return {
      ok: false,
      result_status: "rejected",
      message: "Fitur absensi kegiatan ekstra belum diaktifkan.",
    };
  }

  const candidatePolicyIds = [
    ...new Set(
      [
        ...(Array.isArray(policyIds) ? policyIds : []),
        policyId,
      ]
        .map((value) => Number(value))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];

  let resolvedPolicyId = candidatePolicyIds[0] || null;
  if (candidatePolicyIds.length > 1) {
    const resolution = await resolveActivityPolicyForDeviceScan(client, {
      homebaseId,
      userId,
      policyIds: candidatePolicyIds,
      scannedAt,
    });
    if (!resolution.policyId) {
      return {
        ok: false,
        result_status: resolution.result_status || "policy_missing",
        message: resolution.error || "Policy kegiatan tidak dapat ditentukan.",
      };
    }
    if (resolution.error) {
      return {
        ok: false,
        result_status: resolution.result_status || "rejected",
        message: resolution.error,
        policy_id: resolution.policyId,
      };
    }
    resolvedPolicyId = resolution.policyId;
  } else if (!resolvedPolicyId) {
    return {
      ok: false,
      result_status: "policy_missing",
      message: "Device ekstra belum terhubung ke policy kegiatan.",
    };
  }

  const policyRes = await client.query(
    `SELECT id, name, code, target_role, policy_type, is_active
     FROM attendance.attendance_policy
     WHERE id = $1
       AND homebase_id = $2
     LIMIT 1`,
    [resolvedPolicyId, homebaseId],
  );
  if (policyRes.rowCount === 0 || policyRes.rows[0].is_active !== true) {
    return {
      ok: false,
      result_status: "policy_missing",
      message: "Policy kegiatan pada device tidak ditemukan/aktif.",
    };
  }
  const policy = policyRes.rows[0];
  if (policy.policy_type !== "activity_fixed") {
    return {
      ok: false,
      result_status: "rejected",
      message: "Device ekstra harus terhubung ke policy bertipe activity_fixed.",
    };
  }

  const userCtx = await getUserAttendanceContext(client, userId, homebaseId);
  if (!userCtx?.target_role) {
    return {
      ok: false,
      result_status: "rejected",
      message: "User bukan siswa/guru aktif di homebase ini.",
    };
  }

  if (
    policy.target_role !== "all" &&
    policy.target_role !== userCtx.target_role
  ) {
    return {
      ok: false,
      result_status: "rejected",
      message: `Policy kegiatan ini hanya untuk ${policy.target_role}.`,
    };
  }

  const attendanceDate = toJakartaDateString(scannedAt);
  const dayOfWeek = getJakartaIsoDow(scannedAt);

  const assignment = await assertUserAssignedToActivityPolicy(client, {
    homebaseId,
    policyId: policy.id,
    userId,
    targetRole: userCtx.target_role,
    classId: userCtx.current_class_id,
    gradeId: userCtx.grade_id,
    attendanceDate,
  });
  if (!assignment) {
    return {
      ok: false,
      result_status: "policy_missing",
      message:
        "User belum ditugaskan ke policy kegiatan ini. Tambahkan assignment per user/kelas.",
    };
  }

  const dayRule = await getDayRule(client, policy.id, dayOfWeek);
  if (!dayRule) {
    return {
      ok: false,
      result_status: "not_scheduled",
      message: "Hari ini tidak ada jadwal kegiatan pada policy.",
    };
  }

  let resolvedAction = scanAction;
  if (
    autoResolveAction ||
    scanAction === ACTIVITY_GATE_ACTION ||
    !scanAction
  ) {
    const gateResolution = await resolveActivityGateScanAction(client, {
      homebaseId,
      userId,
      policyId: policy.id,
      scannedAt,
    });
    if (!gateResolution.resolvedAction) {
      return {
        ok: false,
        result_status: "duplicate",
        message: gateResolution.error,
        policy_id: policy.id,
        policy_name: policy.name,
      };
    }
    resolvedAction = gateResolution.resolvedAction;
  }

  if (
    resolvedAction !== ACTIVITY_CHECKIN_ACTION &&
    resolvedAction !== ACTIVITY_CHECKOUT_ACTION
  ) {
    return {
      ok: false,
      result_status: "rejected",
      message: "scan_action kegiatan tidak valid.",
    };
  }

  const windowCheck = validateScanTimeWindow(
    scannedAt,
    {
      ...dayRule,
      // Reuse daily window validator by mapping activity actions.
    },
    resolvedAction === ACTIVITY_CHECKIN_ACTION
      ? "daily_checkin"
      : "daily_checkout",
  );
  if (!windowCheck.valid) {
    return {
      ok: false,
      result_status: "out_of_window",
      message: windowCheck.reason,
      policy_id: policy.id,
      policy_name: policy.name,
    };
  }

  let record = null;
  if (resolvedAction === ACTIVITY_CHECKIN_ACTION) {
    record = await upsertActivityAttendanceCheckin(client, {
      homebaseId,
      periodeId,
      userId,
      targetRole: userCtx.target_role,
      policyId: policy.id,
      deviceId,
      attendanceDate,
      scannedAt,
      scanLogId,
      dayRule,
    });
    if (record?.duplicate) {
      return {
        ok: false,
        result_status: "duplicate",
        message: "Check-in kegiatan hari ini sudah tercatat.",
        policy_id: policy.id,
        policy_name: policy.name,
      };
    }
  } else {
    record = await upsertActivityAttendanceCheckout(client, {
      userId,
      policyId: policy.id,
      deviceId,
      attendanceDate,
      scannedAt,
      scanLogId,
    });
    if (record?.missing_checkin) {
      return {
        ok: false,
        result_status: "rejected",
        message: "Belum ada check-in kegiatan hari ini.",
        policy_id: policy.id,
        policy_name: policy.name,
      };
    }
    if (record?.duplicate) {
      return {
        ok: false,
        result_status: "duplicate",
        message: "Check-out kegiatan hari ini sudah tercatat.",
        policy_id: policy.id,
        policy_name: policy.name,
      };
    }
  }

  await client.query(
    `UPDATE attendance.rfid_scan_log
     SET
       activity_attendance_id = $2,
       scan_action = $3
     WHERE id = $1`,
    [scanLogId, record.id, resolvedAction],
  );

  return {
    ok: true,
    result_status: "accepted",
    message: null,
    activity_attendance_id: record.id,
    attendance_status: record.attendance_status,
    attendance_date: attendanceDate,
    scan_action: resolvedAction,
    policy_id: policy.id,
    policy_name: policy.name,
    policy_code: policy.code,
    target_role: userCtx.target_role,
    planned_checkin_time: formatTimeLabel(dayRule.reference_checkin_time),
    planned_checkout_time: formatTimeLabel(dayRule.reference_checkout_time),
    checkin_window: dayRule.checkin_start
      ? `${formatTimeLabel(dayRule.checkin_start)}-${formatTimeLabel(dayRule.checkin_end)}`
      : null,
    checkout_window: dayRule.checkout_start
      ? `${formatTimeLabel(dayRule.checkout_start)}-${formatTimeLabel(dayRule.reference_checkout_time)}`
      : null,
    late_minutes: record.late_minutes || 0,
    presence_minutes: record.presence_minutes ?? null,
    actual_checkin_at: record.checkin_at
      ? new Date(record.checkin_at).toISOString()
      : null,
    actual_checkout_at: record.checkout_at
      ? new Date(record.checkout_at).toISOString()
      : null,
  };
};
