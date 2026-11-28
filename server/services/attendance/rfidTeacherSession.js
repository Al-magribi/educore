import {
  JAKARTA_TZ,
  getDayRule,
  getJakartaIsoDow,
  jakartaLocalToDate,
  resolvePolicyForUser,
  toJakartaDateString,
} from "./rfidDailyAttendance.js";
import {
  CLASSROOM_CHECKOUT_EARLIEST,
  CLASSROOM_LCD_MESSAGE,
  CLASSROOM_RESULT_STATUS,
  CLASSROOM_SESSION_SWITCH_COOLDOWN_MINUTES,
  getClassroomCooldownRemainingSeconds,
} from "./classroomScanContract.js";

const SESSION_CHECKIN_ACTION = "teacher_session_checkin";
const SESSION_CHECKOUT_ACTION = "teacher_session_checkout";
const SESSION_MATCH_BUFFER_MINUTES = 15;

// Re-export classroom LCD contract for callers.
export {
  CLASSROOM_CHECKOUT_EARLIEST,
  CLASSROOM_LCD_MESSAGE,
  CLASSROOM_RESULT_STATUS,
  CLASSROOM_SESSION_SWITCH_COOLDOWN_MINUTES,
};

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

const buildScheduleWindows = (entries, attendanceDate) =>
  entries
    .map((entry) => {
      const plannedStart = jakartaLocalToDate(attendanceDate, entry.start_time);
      const plannedEnd = jakartaLocalToDate(attendanceDate, entry.end_time);
      return { entry, plannedStart, plannedEnd };
    })
    .filter((item) => item.plannedStart && item.plannedEnd);

const pickNearestByStart = (items, scannedAt) => {
  let nearest = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const item of items) {
    const distance = Math.abs(scannedAt.getTime() - item.plannedStart.getTime());
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = item;
    }
  }
  return nearest;
};

/**
 * Pick schedule entry for CHECK-IN when the teacher has no open session.
 * Skips complete sessions. Prefers strict current period over ±15m buffer overlap
 * (important for multi-class classroom devices at period boundaries).
 */
export const pickScheduleEntryForCheckin = (
  entries,
  scannedAt,
  attendanceDate,
  completeEntryIds = new Set(),
) => {
  if (!entries.length) return null;

  const bufferMs = SESSION_MATCH_BUFFER_MINUTES * 60 * 1000;
  const scannedMs = scannedAt.getTime();
  const withWindows = buildScheduleWindows(entries, attendanceDate).filter(
    (item) => !completeEntryIds.has(Number(item.entry.id)),
  );
  if (!withWindows.length) return null;

  const strictCurrent = withWindows.filter(
    (item) =>
      scannedMs >= item.plannedStart.getTime() &&
      scannedMs <= item.plannedEnd.getTime(),
  );
  if (strictCurrent.length) {
    return pickNearestByStart(strictCurrent, scannedAt).entry;
  }

  const inBuffer = withWindows.filter(
    (item) =>
      scannedMs >= item.plannedStart.getTime() - bufferMs &&
      scannedMs <= item.plannedEnd.getTime() + bufferMs,
  );
  if (inBuffer.length) {
    return pickNearestByStart(inBuffer, scannedAt).entry;
  }

  if (withWindows.length === 1) return withWindows[0].entry;

  return pickNearestByStart(withWindows, scannedAt)?.entry || null;
};

/** @deprecated Prefer pickScheduleEntryForCheckin / resolveClassroomSessionIntent */
export const pickScheduleEntry = (entries, scannedAt, attendanceDate) =>
  pickScheduleEntryForCheckin(entries, scannedAt, attendanceDate, new Set());

const isTeacherSessionComplete = (requirement) =>
  Boolean(requirement?.actual_checkin_at && requirement?.actual_checkout_at);

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

/**
 * Resolve planned session end for too-early checkout.
 * Use the later of schedule-derived end and DB planned_end_at so a stale/wrong
 * requirement row (e.g. first-slot-only) cannot allow checkout mid-block.
 */
const resolvePlannedEndAt = (plannedEndAt, requirement) => {
  const candidates = [];
  if (plannedEndAt) {
    const fromSchedule = new Date(plannedEndAt);
    if (Number.isFinite(fromSchedule.getTime())) candidates.push(fromSchedule);
  }
  if (requirement?.planned_end_at) {
    const fromRequirement = new Date(requirement.planned_end_at);
    if (Number.isFinite(fromRequirement.getTime())) {
      candidates.push(fromRequirement);
    }
  }
  if (!candidates.length) return null;
  return candidates.reduce((latest, item) =>
    item.getTime() > latest.getTime() ? item : latest,
  );
};

/**
 * Classroom checkout is allowed only at/after planned session end.
 * Returns a blocked intent fragment, or null if checkout is allowed.
 */
export const evaluateClassroomCheckoutTooEarly = (
  scannedAt,
  plannedEndAt,
  extras = {},
) => {
  if (!scannedAt || !plannedEndAt) return null;
  if (scannedAt.getTime() >= plannedEndAt.getTime()) return null;

  return {
    blocked: true,
    result_status: CLASSROOM_RESULT_STATUS.TOO_EARLY_CHECKOUT,
    message: CLASSROOM_LCD_MESSAGE.TOO_EARLY_CHECKOUT,
    ...extras,
  };
};

/**
 * Resolve which teaching session a classroom tap targets and whether it is blocked.
 * Pure helper — used by precheck + apply (and unit tests).
 */
export const resolveClassroomSessionIntent = ({
  entries,
  scannedAt,
  attendanceDate,
  requirementsByEntryId = new Map(),
  lastCheckout = null,
  scanAction = SESSION_CHECKIN_ACTION,
  autoResolveSessionAction = true,
}) => {
  if (!entries.length) {
    return { blocked: false, scheduleEntry: null };
  }

  const getRequirement = (entryId) =>
    requirementsByEntryId.get(Number(entryId)) ||
    requirementsByEntryId.get(entryId) ||
    null;

  const openEntries = entries.filter((entry) => {
    const requirement = getRequirement(entry.id);
    return Boolean(
      requirement?.actual_checkin_at && !requirement?.actual_checkout_at,
    );
  });

  // Open session always wins: mid-period tap = checkout attempt (or too-early).
  if (openEntries.length > 0) {
    const openWindows = buildScheduleWindows(openEntries, attendanceDate);
    const scannedMs = scannedAt.getTime();
    const containing = openWindows.filter(
      (item) =>
        scannedMs >= item.plannedStart.getTime() &&
        scannedMs <=
          item.plannedEnd.getTime() + SESSION_MATCH_BUFFER_MINUTES * 60 * 1000,
    );

    let scheduleEntry;
    let plannedStartAt;
    let plannedEndAt;
    let requirement;

    if (openWindows.length > 0) {
      const chosen =
        (containing.length
          ? pickNearestByStart(containing, scannedAt)
          : pickNearestByStart(openWindows, scannedAt)) || openWindows[0];
      scheduleEntry = chosen.entry;
      requirement = getRequirement(scheduleEntry.id);
      plannedStartAt = chosen.plannedStart;
      plannedEndAt = resolvePlannedEndAt(chosen.plannedEnd, requirement);
    } else {
      // Fallback when slot times fail to parse: still enforce checkout rules.
      scheduleEntry = openEntries[0];
      requirement = getRequirement(scheduleEntry.id);
      plannedStartAt = requirement?.planned_start_at
        ? new Date(requirement.planned_start_at)
        : jakartaLocalToDate(attendanceDate, scheduleEntry.start_time);
      plannedEndAt = resolvePlannedEndAt(
        jakartaLocalToDate(attendanceDate, scheduleEntry.end_time),
        requirement,
      );
    }

    const effectiveScanAction = resolveEffectiveSessionAction({
      scanAction,
      autoResolveSessionAction,
      requirement,
      scannedAt,
      plannedStartAt,
      plannedEndAt,
    });

    if (effectiveScanAction === SESSION_CHECKOUT_ACTION) {
      const tooEarly = evaluateClassroomCheckoutTooEarly(
        scannedAt,
        plannedEndAt,
        {
          scheduleEntry,
          requirement,
          plannedStartAt,
          plannedEndAt,
          effectiveScanAction,
        },
      );
      if (tooEarly) return tooEarly;
    }

    return {
      blocked: false,
      scheduleEntry,
      requirement,
      plannedStartAt,
      plannedEndAt,
      effectiveScanAction,
    };
  }

  const completeEntryIds = new Set();
  for (const entry of entries) {
    const requirement = getRequirement(entry.id);
    if (isTeacherSessionComplete(requirement)) {
      completeEntryIds.add(Number(entry.id));
    }
  }

  const scheduleEntry = pickScheduleEntryForCheckin(
    entries,
    scannedAt,
    attendanceDate,
    completeEntryIds,
  );
  if (!scheduleEntry) {
    return { blocked: false, scheduleEntry: null };
  }

  const plannedStartAt = jakartaLocalToDate(
    attendanceDate,
    scheduleEntry.start_time,
  );
  let plannedEndAt = jakartaLocalToDate(attendanceDate, scheduleEntry.end_time);
  if (!plannedStartAt || !plannedEndAt) {
    return { blocked: false, scheduleEntry: null };
  }

  const requirement = getRequirement(scheduleEntry.id);
  plannedEndAt = resolvePlannedEndAt(plannedEndAt, requirement);

  if (isTeacherSessionComplete(requirement)) {
    return {
      blocked: true,
      result_status: CLASSROOM_RESULT_STATUS.DUPLICATE,
      message: CLASSROOM_LCD_MESSAGE.SESSION_COMPLETE,
      scheduleEntry,
      requirement,
      plannedStartAt,
      plannedEndAt,
      effectiveScanAction: SESSION_CHECKIN_ACTION,
    };
  }

  // Cooldown only when same teacher switches to a different session/class.
  const lastCheckoutEntryId =
    lastCheckout?.schedule_entry_id != null
      ? Number(lastCheckout.schedule_entry_id)
      : null;
  if (
    lastCheckout?.actual_checkout_at &&
    lastCheckoutEntryId != null &&
    lastCheckoutEntryId !== Number(scheduleEntry.id)
  ) {
    const retryAfterSeconds = getClassroomCooldownRemainingSeconds(
      lastCheckout.actual_checkout_at,
      scannedAt,
      CLASSROOM_SESSION_SWITCH_COOLDOWN_MINUTES,
    );
    if (retryAfterSeconds > 0) {
      return {
        blocked: true,
        result_status: CLASSROOM_RESULT_STATUS.COOLDOWN,
        message: CLASSROOM_LCD_MESSAGE.COOLDOWN,
        retry_after_seconds: retryAfterSeconds,
        scheduleEntry,
        requirement,
        plannedStartAt,
        plannedEndAt,
        effectiveScanAction: SESSION_CHECKIN_ACTION,
      };
    }
  }

  const effectiveScanAction = resolveEffectiveSessionAction({
    scanAction,
    autoResolveSessionAction,
    requirement,
    scannedAt,
    plannedStartAt,
    plannedEndAt,
  });

  // Same-session checkout via check-in path (e.g. open session missed in window map).
  if (effectiveScanAction === SESSION_CHECKOUT_ACTION) {
    const tooEarly = evaluateClassroomCheckoutTooEarly(
      scannedAt,
      plannedEndAt,
      {
        scheduleEntry,
        requirement,
        plannedStartAt,
        plannedEndAt,
        effectiveScanAction,
      },
    );
    if (tooEarly) return tooEarly;
  }

  return {
    blocked: false,
    scheduleEntry,
    requirement,
    plannedStartAt,
    plannedEndAt,
    effectiveScanAction,
  };
};

const findTeacherSessionRequirement = async (
  client,
  { userId, attendanceDate, scheduleEntryId },
) => {
  const result = await client.query(
    `SELECT
       tsr.id,
       tsr.schedule_entry_id,
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

const findTeacherSessionRequirementsForEntries = async (
  client,
  { userId, attendanceDate, scheduleEntryIds },
) => {
  const ids = [
    ...new Set(
      (scheduleEntryIds || [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  ];
  const byEntryId = new Map();
  if (!ids.length) return byEntryId;

  const result = await client.query(
    `SELECT
       tsr.id,
       tsr.schedule_entry_id,
       tsr.actual_checkin_at,
       tsr.actual_checkout_at,
       tsr.planned_start_at,
       tsr.planned_end_at,
       tsr.session_status,
       tsr.late_minutes
     FROM attendance.teacher_schedule_requirement tsr
     JOIN attendance.daily_attendance da ON da.id = tsr.attendance_id
     WHERE da.user_id = $1
       AND da.attendance_date = $2::date
       AND tsr.schedule_entry_id = ANY($3::int[])`,
    [userId, attendanceDate, ids],
  );

  for (const row of result.rows) {
    byEntryId.set(Number(row.schedule_entry_id), row);
  }
  return byEntryId;
};

/** Latest checkout today for this teacher (cooldown is per-teacher, not per-device). */
const findLastTeacherCheckoutToday = async (
  client,
  { userId, attendanceDate },
) => {
  const result = await client.query(
    `SELECT
       tsr.schedule_entry_id,
       tsr.class_id,
       tsr.actual_checkout_at
     FROM attendance.teacher_schedule_requirement tsr
     JOIN attendance.daily_attendance da ON da.id = tsr.attendance_id
     WHERE da.user_id = $1
       AND da.attendance_date = $2::date
       AND tsr.actual_checkout_at IS NOT NULL
     ORDER BY tsr.actual_checkout_at DESC
     LIMIT 1`,
    [userId, attendanceDate],
  );

  return result.rows[0] || null;
};

const resolveClassroomScanContext = async (
  client,
  {
    homebaseId,
    periodeId,
    userId,
    classIds,
    scannedAt,
    scanAction = SESSION_CHECKIN_ACTION,
    autoResolveSessionAction = true,
  },
) => {
  const attendanceDate = toJakartaDateString(scannedAt);
  const dayOfWeek = getJakartaIsoDow(scannedAt);
  const scheduleEntries = await fetchTeacherScheduleEntries(client, {
    homebaseId,
    periodeId,
    teacherId: userId,
    classIds,
    dayOfWeek,
  });

  const requirementsByEntryId = await findTeacherSessionRequirementsForEntries(
    client,
    {
      userId,
      attendanceDate,
      scheduleEntryIds: scheduleEntries.map((entry) => entry.id),
    },
  );
  const lastCheckout = await findLastTeacherCheckoutToday(client, {
    userId,
    attendanceDate,
  });

  const intent = resolveClassroomSessionIntent({
    entries: scheduleEntries,
    scannedAt,
    attendanceDate,
    requirementsByEntryId,
    lastCheckout,
    scanAction,
    autoResolveSessionAction,
  });

  return { attendanceDate, dayOfWeek, scheduleEntries, intent };
};

/**
 * Block classroom taps when the matched teaching session already has
 * both check-in and check-out recorded, checkout is too early, or
 * inter-class cooldown is active. No accepted scan log should be created.
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

  const { intent } = await resolveClassroomScanContext(client, {
    homebaseId,
    periodeId,
    userId,
    classIds: resolvedClassIds,
    scannedAt,
    scanAction: SESSION_CHECKIN_ACTION,
    autoResolveSessionAction: true,
  });

  if (intent.blocked) {
    return {
      blocked: true,
      result_status: intent.result_status,
      message: intent.message,
      retry_after_seconds: intent.retry_after_seconds ?? null,
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
    `SELECT id, actual_checkin_at, actual_checkout_at, planned_start_at, planned_end_at,
            first_slot_id, last_slot_id, session_status, late_minutes
     FROM attendance.teacher_schedule_requirement
     WHERE attendance_id = $1
       AND schedule_entry_id = $2
     LIMIT 1`,
    [attendanceId, scheduleEntry.id],
  );

  if (existingRes.rowCount > 0) {
    const existing = existingRes.rows[0];
    const nextFirstSlotId =
      scheduleEntry.first_slot_id || existing.first_slot_id || null;
    const nextLastSlotId =
      scheduleEntry.last_slot_id || existing.last_slot_id || null;
    const existingEndMs = existing.planned_end_at
      ? new Date(existing.planned_end_at).getTime()
      : 0;
    const nextEndMs = plannedEndAt?.getTime?.() || 0;
    const shouldSyncSlots =
      Number(existing.first_slot_id || 0) !== Number(nextFirstSlotId || 0) ||
      Number(existing.last_slot_id || 0) !== Number(nextLastSlotId || 0) ||
      (nextEndMs > 0 && nextEndMs > existingEndMs);

    if (shouldSyncSlots) {
      const updated = await client.query(
        `UPDATE attendance.teacher_schedule_requirement
         SET
           first_slot_id = COALESCE($3, first_slot_id),
           last_slot_id = COALESCE($4, last_slot_id),
           planned_start_at = CASE
             WHEN $5::timestamptz IS NOT NULL
               AND (planned_start_at IS NULL OR planned_start_at > $5::timestamptz)
             THEN $5::timestamptz
             ELSE planned_start_at
           END,
           planned_end_at = CASE
             WHEN $6::timestamptz IS NOT NULL
               AND (planned_end_at IS NULL OR planned_end_at < $6::timestamptz)
             THEN $6::timestamptz
             ELSE planned_end_at
           END,
           updated_at = NOW()
         WHERE id = $1
           AND attendance_id = $2
         RETURNING id, actual_checkin_at, actual_checkout_at, planned_start_at, planned_end_at,
                   first_slot_id, last_slot_id, session_status, late_minutes`,
        [
          existing.id,
          attendanceId,
          nextFirstSlotId,
          nextLastSlotId,
          plannedStartAt?.toISOString?.() || null,
          plannedEndAt?.toISOString?.() || null,
        ],
      );
      return updated.rows[0] || existing;
    }

    return existing;
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
     RETURNING id, actual_checkin_at, actual_checkout_at, planned_start_at, planned_end_at,
               first_slot_id, last_slot_id, session_status, late_minutes`,
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

  // Check-in must clear any previous checkout on the same class/day row.
  // Otherwise COALESCE keeps a stale checkout and violates
  // chk_teacher_session_time_order when the new check-in is later.
  await client.query(
    `UPDATE lms.l_teacher_session_log
     SET
       schedule_entry_id = COALESCE($2, schedule_entry_id),
       checkin_at = CASE
         WHEN $3::timestamp IS NOT NULL THEN $3::timestamp
         ELSE checkin_at
       END,
       checkout_at = CASE
         WHEN $3::timestamp IS NOT NULL AND $4::timestamp IS NULL THEN NULL
         WHEN $4::timestamp IS NOT NULL THEN $4::timestamp
         ELSE checkout_at
       END,
       checkin_by = CASE WHEN $3::timestamp IS NOT NULL THEN $5 ELSE checkin_by END,
       checkout_by = CASE
         WHEN $3::timestamp IS NOT NULL AND $4::timestamp IS NULL THEN NULL
         WHEN $4::timestamp IS NOT NULL THEN $5
         ELSE checkout_by
       END,
       updated_at = CURRENT_TIMESTAMP
     WHERE id = $1`,
    [sessionLogId, scheduleEntryId, checkinAt, checkoutAt, userId],
  );

  return sessionLogId;
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

  const { attendanceDate, dayOfWeek, intent } = await resolveClassroomScanContext(
    client,
    {
      homebaseId,
      periodeId,
      userId,
      classIds: resolvedClassIds,
      scannedAt,
      scanAction,
      autoResolveSessionAction,
    },
  );

  if (intent.blocked) {
    return {
      blocked: true,
      result_status: intent.result_status,
      message: intent.message,
      retry_after_seconds: intent.retry_after_seconds ?? null,
    };
  }

  const scheduleEntry = intent.scheduleEntry;
  if (!scheduleEntry) {
    return null;
  }

  let plannedStartAt = intent.plannedStartAt;
  let plannedEndAt = intent.plannedEndAt;
  if (!plannedStartAt || !plannedEndAt) {
    plannedStartAt = jakartaLocalToDate(attendanceDate, scheduleEntry.start_time);
    plannedEndAt = jakartaLocalToDate(attendanceDate, scheduleEntry.end_time);
  }
  if (!plannedStartAt || !plannedEndAt) {
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

  const requirement = await ensureTeacherScheduleRequirement(client, {
    attendanceId,
    teacherId: userId,
    scheduleEntry,
    attendanceDate,
    plannedStartAt,
    plannedEndAt,
  });

  plannedEndAt = resolvePlannedEndAt(plannedEndAt, requirement);

  if (isTeacherSessionComplete(requirement)) {
    return {
      blocked: true,
      result_status: CLASSROOM_RESULT_STATUS.DUPLICATE,
      message: CLASSROOM_LCD_MESSAGE.SESSION_COMPLETE,
    };
  }

  const effectiveScanAction =
    intent.effectiveScanAction ||
    resolveEffectiveSessionAction({
      scanAction,
      autoResolveSessionAction,
      requirement,
      scannedAt,
      plannedStartAt,
      plannedEndAt,
    });

  // Safety net: never accept classroom checkout before planned session end.
  if (effectiveScanAction === SESSION_CHECKOUT_ACTION) {
    const tooEarly = evaluateClassroomCheckoutTooEarly(scannedAt, plannedEndAt);
    if (tooEarly) {
      return {
        blocked: true,
        result_status: tooEarly.result_status,
        message: tooEarly.message,
      };
    }
  }

  if (effectiveScanAction === SESSION_CHECKIN_ACTION) {
    const lastCheckout = await findLastTeacherCheckoutToday(client, {
      userId,
      attendanceDate,
    });
    const lastCheckoutEntryId =
      lastCheckout?.schedule_entry_id != null
        ? Number(lastCheckout.schedule_entry_id)
        : null;
    if (
      lastCheckout?.actual_checkout_at &&
      lastCheckoutEntryId != null &&
      lastCheckoutEntryId !== Number(scheduleEntry.id)
    ) {
      const retryAfterSeconds = getClassroomCooldownRemainingSeconds(
        lastCheckout.actual_checkout_at,
        scannedAt,
        CLASSROOM_SESSION_SWITCH_COOLDOWN_MINUTES,
      );
      if (retryAfterSeconds > 0) {
        return {
          blocked: true,
          result_status: CLASSROOM_RESULT_STATUS.COOLDOWN,
          message: CLASSROOM_LCD_MESSAGE.COOLDOWN,
          retry_after_seconds: retryAfterSeconds,
        };
      }
    }
  }

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
