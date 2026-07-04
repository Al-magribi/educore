const JAKARTA_TZ = "Asia/Jakarta";

const toJakartaDateString = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: JAKARTA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const getJakartaIsoDow = (date) => {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: JAKARTA_TZ,
    weekday: "short",
  }).format(date);
  const map = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
  return map[weekday] || 1;
};

const normalizeTimeText = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.length === 5 ? `${text}:00` : text;
};

const jakartaLocalToDate = (dateStr, timeText) => {
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

const getUserAttendanceContext = async (client, userId, homebaseId) => {
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

const resolvePolicyForUser = async (
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

const getDayRule = async (client, policyId, dayOfWeek) => {
  const result = await client.query(
    `SELECT
       id,
       day_of_week,
       is_active,
       reference_checkin_time,
       late_tolerance_minutes,
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
  const { status, lateMinutes } = evaluateCheckinStatus(scannedAt, dayRule);
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
         evaluated_at,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5::date, $6, $7, true, 'policy',
         $8::timestamptz, $9, $10, $11, $12, $13, NOW(), NOW()
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
        scannedAt.toISOString(),
        scanLogId,
        status,
        lateMinutes,
        minimumRequiredMinutes,
        isCheckoutOptional,
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
         checkin_at = $4::timestamptz,
         first_gate_scan_id = $5,
         attendance_status = $6,
         late_minutes = $7,
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
        status,
        lateMinutes,
        minimumRequiredMinutes,
        isCheckoutOptional,
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
         evaluated_at,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5::date, $6, $7, true, 'policy',
         $8::timestamptz, $9, 'incomplete', $10, $11, NOW(), NOW()
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
        scannedAt.toISOString(),
        scanLogId,
        minimumRequiredMinutes,
        isCheckoutOptional,
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
  } else {
    attendanceStatus = "incomplete";
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
