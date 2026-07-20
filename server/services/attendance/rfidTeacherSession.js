import {
  JAKARTA_TZ,
  getDayRule,
  getJakartaIsoDow,
  jakartaLocalToDate,
  resolvePolicyForUser,
  toJakartaDateString,
} from "./rfidDailyAttendance.js";

const SESSION_CHECKIN_ACTION = "teacher_session_checkin";
const SESSION_CHECKOUT_ACTION = "teacher_session_checkout";
const SESSION_MATCH_BUFFER_MINUTES = 15;

let teacherSessionLogHasClassId = null;

const teacherSessionLogSupportsClassId = async (client) => {
  if (teacherSessionLogHasClassId !== null) {
    return teacherSessionLogHasClassId;
  }

  const result = await client.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'lms'
       AND table_name = 'l_teacher_session_log'
       AND column_name = 'class_id'
     LIMIT 1`,
  );
  teacherSessionLogHasClassId = result.rowCount > 0;
  return teacherSessionLogHasClassId;
};

const formatTimeHHmm = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  if (!text) return null;
  return text.length >= 5 ? text.slice(0, 5) : text;
};

const normalizeClassIds = (value) => {
  const raw = Array.isArray(value) ? value : value != null ? [value] : [];
  return [
    ...new Set(
      raw
        .map((item) => Number(item))
        .filter((item) => Number.isFinite(item) && item > 0)
        .map((item) => Math.trunc(item)),
    ),
  ];
};

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

const evaluateSessionCheckinStatus = (scannedAt, plannedStartAt, toleranceMinutes) => {
  if (!plannedStartAt) {
    return { sessionStatus: "present", lateMinutes: 0 };
  }

  const diffMinutes = Math.floor(
    (scannedAt.getTime() - plannedStartAt.getTime()) / 60000,
  );
  const tolerance = Number(toleranceMinutes || 0);

  if (diffMinutes <= tolerance) {
    return { sessionStatus: "present", lateMinutes: 0 };
  }

  return { sessionStatus: "late", lateMinutes: diffMinutes };
};

const pickScheduleEntry = (entries, scannedAt, attendanceDate) => {
  if (!entries.length) return null;

  const bufferMs = SESSION_MATCH_BUFFER_MINUTES * 60 * 1000;
  const withWindows = entries
    .map((entry) => {
      const plannedStart = jakartaLocalToDate(attendanceDate, entry.start_time);
      const plannedEnd = jakartaLocalToDate(attendanceDate, entry.end_time);
      return { entry, plannedStart, plannedEnd };
    })
    .filter((item) => item.plannedStart && item.plannedEnd);

  const inWindow = withWindows.find(
    (item) =>
      scannedAt.getTime() >= item.plannedStart.getTime() - bufferMs &&
      scannedAt.getTime() <= item.plannedEnd.getTime() + bufferMs,
  );
  if (inWindow) return inWindow.entry;

  if (entries.length === 1) return entries[0];

  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const item of withWindows) {
    const distance = Math.abs(scannedAt.getTime() - item.plannedStart.getTime());
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = item.entry;
    }
  }

  return nearest;
};

const findTeacherSessionRequirement = async (
  client,
  { userId, attendanceDate, scheduleEntryId },
) => {
  const result = await client.query(
    `SELECT
       tsr.id,
       tsr.actual_checkin_at,
       tsr.actual_checkout_at,
       tsr.session_status,
       tsr.late_minutes
     FROM attendance.teacher_schedule_requirement tsr
     JOIN attendance.daily_attendance da ON da.id = tsr.attendance_id
     WHERE da.user_id = $1
       AND da.attendance_date = $2::date
       AND tsr.schedule_entry_id = $3
     LIMIT 1`,
    [userId, attendanceDate, scheduleEntryId],
  );

  return result.rows[0] || null;
};

const isTeacherSessionComplete = (requirement) =>
  Boolean(requirement?.actual_checkin_at && requirement?.actual_checkout_at);

/**
 * Block classroom taps when the matched teaching session already has
 * both check-in and check-out recorded. No scan log row should be created.
 */
export const precheckTeacherClassroomScan = async (
  client,
  {
    homebaseId,
    periodeId,
    userId,
    classId = null,
    classIds = null,
    scannedAt,
  },
) => {
  if (
    !(await isFeatureEnabled(
      client,
      homebaseId,
      "teacher_class_session_attendance",
    ))
  ) {
    return { blocked: false };
  }

  const resolvedClassIds = normalizeClassIds(
    classIds?.length ? classIds : classId != null ? [classId] : [],
  );
  if (!resolvedClassIds.length) {
    return { blocked: false };
  }

  const attendanceDate = toJakartaDateString(scannedAt);
  const dayOfWeek = getJakartaIsoDow(scannedAt);
  const scheduleEntries = await fetchTeacherScheduleEntries(client, {
    homebaseId,
    periodeId,
    teacherId: userId,
    classIds: resolvedClassIds,
    dayOfWeek,
  });

  const scheduleEntry = pickScheduleEntry(
    scheduleEntries,
    scannedAt,
    attendanceDate,
  );
  if (!scheduleEntry) {
    return { blocked: false };
  }

  const requirement = await findTeacherSessionRequirement(client, {
    userId,
    attendanceDate,
    scheduleEntryId: scheduleEntry.id,
  });

  if (isTeacherSessionComplete(requirement)) {
    return {
      blocked: true,
      result_status: "duplicate",
      message: "Sesi mengajar sudah lengkap (masuk dan keluar tercatat).",
    };
  }

  return { blocked: false };
};

/**
 * Find operational schedule entries for a teacher across one or more classes
 * mapped to a classroom RFID device.
 * Only entries on the active schedule master (non-archived) are considered.
 */
export const fetchTeacherScheduleEntries = async (
  client,
  { homebaseId, periodeId, teacherId, classIds, dayOfWeek },
) => {
  const normalizedClassIds = normalizeClassIds(classIds);
  if (!normalizedClassIds.length || !periodeId) {
    return [];
  }

  const result = await client.query(
    `SELECT
       se.id,
       se.class_id,
       c.name AS class_name,
       se.subject_id,
       sub.name AS subject_name,
       se.slot_start_id AS first_slot_id,
       start_slot.slot_no AS first_slot_no,
       start_slot.start_time,
       COALESCE(slot_last.last_slot_id, se.slot_start_id) AS last_slot_id,
       COALESCE(slot_last.last_slot_no, start_slot.slot_no) AS last_slot_no,
       COALESCE(slot_last.last_end_time, start_slot.end_time) AS end_time
     FROM lms.l_schedule_entry se
     JOIN public.a_class c ON c.id = se.class_id
     LEFT JOIN public.a_subject sub ON sub.id = se.subject_id
     JOIN lms.l_time_slot start_slot
       ON start_slot.id = se.slot_start_id
     JOIN lms.l_schedule_config cfg
       ON cfg.id = se.config_id
      AND cfg.homebase_id = se.homebase_id
      AND cfg.periode_id = se.periode_id
      AND cfg.is_active = true
     LEFT JOIN LATERAL (
       SELECT
         ses.slot_id AS last_slot_id,
         ts.slot_no AS last_slot_no,
         ts.end_time AS last_end_time
       FROM lms.l_schedule_entry_slot ses
       JOIN lms.l_time_slot ts ON ts.id = ses.slot_id
       WHERE ses.schedule_entry_id = se.id
       ORDER BY ts.end_time DESC, ses.id DESC
       LIMIT 1
     ) AS slot_last ON true
     WHERE se.homebase_id = $1
       AND se.periode_id = $2
       AND se.teacher_id = $3
       AND se.class_id = ANY($4::int[])
       AND se.day_of_week = $5
       AND se.status <> 'archived'
     ORDER BY start_slot.start_time ASC, se.id ASC`,
    [homebaseId, periodeId, teacherId, normalizedClassIds, dayOfWeek],
  );

  return result.rows;
};

const ensureTeacherDailyAttendance = async (
  client,
  { homebaseId, periodeId, userId, attendanceDate, policy },
) => {
  const existingRes = await client.query(
    `SELECT id
     FROM attendance.daily_attendance
     WHERE user_id = $1
       AND attendance_date = $2::date
     LIMIT 1`,
    [userId, attendanceDate],
  );
  if (existingRes.rowCount > 0) {
    return existingRes.rows[0].id;
  }

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
       attendance_status,
       evaluated_at,
       updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5::date, 'teacher', $6, true, 'schedule',
       'pending', NOW(), NOW()
     )
     RETURNING id`,
    [
      homebaseId,
      periodeId,
      userId,
      policy?.id || null,
      attendanceDate,
      policy?.policy_type || "teacher_schedule_based",
    ],
  );

  return inserted.rows[0].id;
};

const ensureTeacherScheduleRequirement = async (
  client,
  {
    attendanceId,
    teacherId,
    scheduleEntry,
    attendanceDate,
    plannedStartAt,
    plannedEndAt,
  },
) => {
  const existingRes = await client.query(
    `SELECT id, actual_checkin_at, actual_checkout_at, session_status, late_minutes
     FROM attendance.teacher_schedule_requirement
     WHERE attendance_id = $1
       AND schedule_entry_id = $2
     LIMIT 1`,
    [attendanceId, scheduleEntry.id],
  );

  if (existingRes.rowCount > 0) {
    return existingRes.rows[0];
  }

  const inserted = await client.query(
    `INSERT INTO attendance.teacher_schedule_requirement (
       attendance_id,
       teacher_id,
       schedule_entry_id,
       first_slot_id,
       last_slot_id,
       class_id,
       planned_start_at,
       planned_end_at,
       session_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::timestamptz, $8::timestamptz, 'pending')
     RETURNING id, actual_checkin_at, actual_checkout_at, session_status, late_minutes`,
    [
      attendanceId,
      teacherId,
      scheduleEntry.id,
      scheduleEntry.first_slot_id,
      scheduleEntry.last_slot_id,
      scheduleEntry.class_id,
      plannedStartAt.toISOString(),
      plannedEndAt.toISOString(),
    ],
  );

  return inserted.rows[0];
};

const upsertTeacherSessionLog = async (
  client,
  {
    scheduleEntryId,
    classId,
    attendanceDate,
    teacherId,
    checkinAt,
    checkoutAt,
    userId,
  },
) => {
  const supportsClassId = await teacherSessionLogSupportsClassId(client);

  const existingRes = supportsClassId
    ? await client.query(
        `SELECT id
         FROM lms.l_teacher_session_log
         WHERE date = $1::date
           AND teacher_id = $2
           AND class_id = $3
         LIMIT 1`,
        [attendanceDate, teacherId, classId],
      )
    : await client.query(
        `SELECT id
         FROM lms.l_teacher_session_log
         WHERE schedule_entry_id = $1
           AND date = $2::date
         LIMIT 1`,
        [scheduleEntryId, attendanceDate],
      );

  if (existingRes.rowCount === 0) {
    const inserted = supportsClassId
      ? await client.query(
          `INSERT INTO lms.l_teacher_session_log (
             schedule_entry_id,
             class_id,
             date,
             teacher_id,
             checkin_at,
             checkout_at,
             checkin_by,
             checkout_by
           )
           VALUES ($1, $2, $3::date, $4, $5::timestamp, $6::timestamp, $7, $8)
           RETURNING id`,
          [
            scheduleEntryId,
            classId,
            attendanceDate,
            teacherId,
            checkinAt,
            checkoutAt,
            checkinAt ? userId : null,
            checkoutAt ? userId : null,
          ],
        )
      : await client.query(
          `INSERT INTO lms.l_teacher_session_log (
             schedule_entry_id,
             date,
             teacher_id,
             checkin_at,
             checkout_at,
             checkin_by,
             checkout_by
           )
           VALUES ($1, $2::date, $3, $4::timestamp, $5::timestamp, $6, $7)
           RETURNING id`,
          [
            scheduleEntryId,
            attendanceDate,
            teacherId,
            checkinAt,
            checkoutAt,
            checkinAt ? userId : null,
            checkoutAt ? userId : null,
          ],
        );
    return inserted.rows[0].id;
  }

  const sessionLogId = existingRes.rows[0].id;
  await client.query(
    `UPDATE lms.l_teacher_session_log
     SET
       schedule_entry_id = COALESCE($2, schedule_entry_id),
       checkin_at = COALESCE($3::timestamp, checkin_at),
       checkout_at = COALESCE($4::timestamp, checkout_at),
       checkin_by = CASE WHEN $3::timestamp IS NOT NULL THEN $5 ELSE checkin_by END,
       checkout_by = CASE WHEN $4::timestamp IS NOT NULL THEN $5 ELSE checkout_by END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [sessionLogId, scheduleEntryId, checkinAt, checkoutAt, userId],
  );

  return sessionLogId;
};

const resolveEffectiveSessionAction = ({
  scanAction,
  autoResolveSessionAction,
  requirement,
  scannedAt,
  plannedStartAt,
  plannedEndAt,
}) => {
  if (
    scanAction !== SESSION_CHECKIN_ACTION &&
    scanAction !== SESSION_CHECKOUT_ACTION
  ) {
    return scanAction;
  }

  if (!autoResolveSessionAction) {
    return scanAction;
  }

  const hasCheckin = Boolean(requirement?.actual_checkin_at);
  const hasCheckout = Boolean(requirement?.actual_checkout_at);

  // Second tap on same session (without explicit action) → checkout.
  if (hasCheckin && !hasCheckout) {
    return SESSION_CHECKOUT_ACTION;
  }

  if (!plannedStartAt || !plannedEndAt) {
    return SESSION_CHECKIN_ACTION;
  }

  const toStart = Math.abs(scannedAt.getTime() - plannedStartAt.getTime());
  const toEnd = Math.abs(scannedAt.getTime() - plannedEndAt.getTime());
  if (toEnd < toStart && hasCheckin && !hasCheckout) {
    return SESSION_CHECKOUT_ACTION;
  }

  return SESSION_CHECKIN_ACTION;
};

export const applyRfidScanToTeacherSession = async (
  client,
  {
    homebaseId,
    periodeId,
    userId,
    classId = null,
    classIds = null,
    scanAction,
    scannedAt,
    scanLogId,
    autoResolveSessionAction = false,
  },
) => {
  if (
    scanAction !== SESSION_CHECKIN_ACTION &&
    scanAction !== SESSION_CHECKOUT_ACTION
  ) {
    return null;
  }

  if (
    !(await isFeatureEnabled(
      client,
      homebaseId,
      "teacher_class_session_attendance",
    ))
  ) {
    return null;
  }

  const teacherRes = await client.query(
    `SELECT 1
     FROM u_teachers
     WHERE user_id = $1
       AND homebase_id = $2
     LIMIT 1`,
    [userId, homebaseId],
  );
  if (teacherRes.rowCount === 0) {
    return null;
  }

  const resolvedClassIds = normalizeClassIds(
    classIds?.length ? classIds : classId != null ? [classId] : [],
  );
  if (!resolvedClassIds.length) {
    return null;
  }

  const attendanceDate = toJakartaDateString(scannedAt);
  const dayOfWeek = getJakartaIsoDow(scannedAt);
  const scheduleEntries = await fetchTeacherScheduleEntries(client, {
    homebaseId,
    periodeId,
    teacherId: userId,
    classIds: resolvedClassIds,
    dayOfWeek,
  });

  const scheduleEntry = pickScheduleEntry(
    scheduleEntries,
    scannedAt,
    attendanceDate,
  );
  if (!scheduleEntry) {
    return null;
  }

  const matchedClassId = Number(scheduleEntry.class_id);

  const policy = await resolvePolicyForUser(client, {
    homebaseId,
    userId,
    targetRole: "teacher",
    classId: null,
    gradeId: null,
    attendanceDate,
  });
  const dayRule = policy
    ? await getDayRule(client, policy.id, dayOfWeek)
    : null;

  const attendanceId = await ensureTeacherDailyAttendance(client, {
    homebaseId,
    periodeId,
    userId,
    attendanceDate,
    policy,
  });

  const plannedStartAt = jakartaLocalToDate(
    attendanceDate,
    scheduleEntry.start_time,
  );
  const plannedEndAt = jakartaLocalToDate(
    attendanceDate,
    scheduleEntry.end_time,
  );
  if (!plannedStartAt || !plannedEndAt) {
    return null;
  }

  const requirement = await ensureTeacherScheduleRequirement(client, {
    attendanceId,
    teacherId: userId,
    scheduleEntry,
    attendanceDate,
    plannedStartAt,
    plannedEndAt,
  });

  if (isTeacherSessionComplete(requirement)) {
    return {
      blocked: true,
      result_status: "duplicate",
      message: "Sesi mengajar sudah lengkap (masuk dan keluar tercatat).",
    };
  }

  const effectiveScanAction = resolveEffectiveSessionAction({
    scanAction,
    autoResolveSessionAction,
    requirement,
    scannedAt,
    plannedStartAt,
    plannedEndAt,
  });

  const scannedAtLocal = scannedAt
    .toLocaleString("sv-SE", { timeZone: JAKARTA_TZ })
    .replace("T", " ");

  let sessionStatus = requirement.session_status;
  let lateMinutes = requirement.late_minutes || 0;
  let actualCheckinAt = requirement.actual_checkin_at;
  let actualCheckoutAt = requirement.actual_checkout_at;

  if (effectiveScanAction === SESSION_CHECKIN_ACTION) {
    const evaluated = evaluateSessionCheckinStatus(
      scannedAt,
      plannedStartAt,
      dayRule?.late_tolerance_minutes,
    );
    sessionStatus = evaluated.sessionStatus;
    lateMinutes = evaluated.lateMinutes;
    actualCheckinAt = scannedAt;
  } else {
    actualCheckoutAt = scannedAt;
    if (!actualCheckinAt) {
      sessionStatus = "partial";
    } else if (sessionStatus === "pending") {
      sessionStatus = lateMinutes > 0 ? "late" : "present";
    }
  }

  const sessionLogId = await upsertTeacherSessionLog(client, {
    scheduleEntryId: scheduleEntry.id,
    classId: matchedClassId,
    attendanceDate,
    teacherId: userId,
    checkinAt:
      effectiveScanAction === SESSION_CHECKIN_ACTION ? scannedAtLocal : null,
    checkoutAt:
      effectiveScanAction === SESSION_CHECKOUT_ACTION ? scannedAtLocal : null,
    userId,
  });

  await client.query(
    `UPDATE attendance.teacher_schedule_requirement
     SET
       actual_checkin_at = COALESCE($3::timestamptz, actual_checkin_at),
       actual_checkout_at = COALESCE($4::timestamptz, actual_checkout_at),
       teacher_session_log_id = $5,
       session_status = $6,
       late_minutes = $7,
       updated_at = NOW()
     WHERE id = $1
       AND attendance_id = $2`,
    [
      requirement.id,
      attendanceId,
      effectiveScanAction === SESSION_CHECKIN_ACTION
        ? scannedAt.toISOString()
        : null,
      effectiveScanAction === SESSION_CHECKOUT_ACTION
        ? scannedAt.toISOString()
        : null,
      sessionLogId,
      sessionStatus,
      lateMinutes,
    ],
  );

  await client.query(
    `UPDATE attendance.rfid_scan_log
     SET
       attendance_id = $2,
       schedule_entry_id = $3,
       teacher_session_log_id = $4,
       class_id = $5
     WHERE id = $1`,
    [scanLogId, attendanceId, scheduleEntry.id, sessionLogId, matchedClassId],
  );

  const firstSlotNo = Number(scheduleEntry.first_slot_no || 0) || null;
  const lastSlotNo = Number(scheduleEntry.last_slot_no || 0) || null;
  const plannedCheckinTime = formatTimeHHmm(scheduleEntry.start_time);
  const plannedCheckoutTime = formatTimeHHmm(scheduleEntry.end_time);

  return {
    attendance_id: attendanceId,
    schedule_entry_id: scheduleEntry.id,
    teacher_session_log_id: sessionLogId,
    session_status: sessionStatus,
    attendance_date: attendanceDate,
    scan_action: effectiveScanAction,
    class_id: matchedClassId,
    class_name: scheduleEntry.class_name || null,
    subject_id: scheduleEntry.subject_id
      ? Number(scheduleEntry.subject_id)
      : null,
    subject_name: scheduleEntry.subject_name || null,
    first_slot_no: firstSlotNo,
    last_slot_no: lastSlotNo,
    slot_label:
      firstSlotNo && lastSlotNo && firstSlotNo !== lastSlotNo
        ? `Jam ke-${firstSlotNo} s/d ${lastSlotNo}`
        : firstSlotNo
          ? `Jam ke-${firstSlotNo}`
          : null,
    planned_checkin_time: plannedCheckinTime,
    planned_checkout_time: plannedCheckoutTime,
    planned_start_at: plannedStartAt.toISOString(),
    planned_end_at: plannedEndAt.toISOString(),
    actual_checkin_at:
      effectiveScanAction === SESSION_CHECKIN_ACTION
        ? scannedAt.toISOString()
        : actualCheckinAt
          ? new Date(actualCheckinAt).toISOString()
          : null,
    actual_checkout_at:
      effectiveScanAction === SESSION_CHECKOUT_ACTION
        ? scannedAt.toISOString()
        : actualCheckoutAt
          ? new Date(actualCheckoutAt).toISOString()
          : null,
  };
};
