import {
  countTeacherScheduleSessions,
  getDayRule,
  getJakartaIsoDow,
  jakartaLocalToDate,
  JAKARTA_TZ,
  resolvePolicyForUser,
  toJakartaDateString,
} from "./rfidDailyAttendance.js";

const FINAL_STATUSES = new Set([
  "present",
  "late",
  "absent",
  "excused",
  "not_scheduled",
  "insufficient_hours",
]);

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

const resolveCheckinCutoff = (dayRule, now) => {
  if (!dayRule) return null;

  if (dayRule.checkin_end) {
    return jakartaLocalToDate(toJakartaDateString(now), dayRule.checkin_end);
  }

  if (dayRule.reference_checkin_time) {
    const referenceAt = jakartaLocalToDate(
      toJakartaDateString(now),
      dayRule.reference_checkin_time,
    );
    if (!referenceAt) return null;
    const toleranceMs =
      Number(dayRule.late_tolerance_minutes || 0) * 60 * 1000;
    return new Date(referenceAt.getTime() + toleranceMs + 30 * 60 * 1000);
  }

  return null;
};

const countTeacherSessions = countTeacherScheduleSessions;

const syncTeacherScheduleRequirements = async (
  client,
  { attendanceId, teacherId, homebaseId, periodeId, attendanceDate },
) => {
  await client.query(
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
     SELECT
       $1,
       se.teacher_id,
       se.id,
       se.slot_start_id,
       COALESCE(slot_last.last_slot_id, se.slot_start_id),
       se.class_id,
       ($5::date::timestamp + start_slot.start_time) AT TIME ZONE '${JAKARTA_TZ}',
       ($5::date::timestamp + COALESCE(slot_last.last_end_time, start_slot.end_time)) AT TIME ZONE '${JAKARTA_TZ}',
       'pending'
     FROM lms.l_schedule_entry se
     JOIN lms.l_time_slot start_slot ON start_slot.id = se.slot_start_id
     LEFT JOIN LATERAL (
       SELECT
         ses.slot_id AS last_slot_id,
         ts.end_time AS last_end_time
       FROM lms.l_schedule_entry_slot ses
       JOIN lms.l_time_slot ts ON ts.id = ses.slot_id
       WHERE ses.schedule_entry_id = se.id
       ORDER BY ts.end_time DESC, ses.id DESC
       LIMIT 1
     ) AS slot_last ON true
     JOIN lms.l_schedule_config cfg
       ON cfg.id = se.config_id
      AND cfg.homebase_id = se.homebase_id
      AND cfg.periode_id = se.periode_id
      AND cfg.is_active = true
     WHERE se.homebase_id = $2
       AND se.periode_id = $3
       AND se.teacher_id = $4
       AND se.day_of_week = EXTRACT(ISODOW FROM $5::date)::int
       AND se.status <> 'archived'
     ON CONFLICT (attendance_id, schedule_entry_id) DO NOTHING`,
    [attendanceId, homebaseId, periodeId, teacherId, attendanceDate],
  );
};

const upsertAbsentDailyAttendance = async (
  client,
  {
    homebaseId,
    periodeId,
    userId,
    targetRole,
    policy,
    attendanceDate,
    attendanceStatus,
    requiredToAttend,
    requirementSource,
    notes,
  },
) => {
  await client.query(
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
       notes,
       evaluated_at,
       updated_at
     )
     VALUES (
       $1, $2, $3, $4, $5::date, $6, $7, $8, $9, $10, $11, NOW(), NOW()
     )
     ON CONFLICT (user_id, attendance_date) DO UPDATE
     SET
       attendance_status = EXCLUDED.attendance_status,
       required_to_attend = EXCLUDED.required_to_attend,
       requirement_source = EXCLUDED.requirement_source,
       policy_id = COALESCE(EXCLUDED.policy_id, attendance.daily_attendance.policy_id),
       policy_type = COALESCE(EXCLUDED.policy_type, attendance.daily_attendance.policy_type),
       notes = COALESCE(EXCLUDED.notes, attendance.daily_attendance.notes),
       evaluated_at = NOW(),
       updated_at = NOW()
     WHERE attendance.daily_attendance.checkin_at IS NULL
       AND attendance.daily_attendance.attendance_status IN ('pending', 'incomplete')`,
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
      attendanceStatus,
      notes,
    ],
  );
};

const processStudentAutoAbsent = async (
  client,
  { homebaseId, periodeId, attendanceDate, now },
) => {
  if (!(await isFeatureEnabled(client, homebaseId, "student_daily_attendance"))) {
    return 0;
  }

  const dayOfWeek = getJakartaIsoDow(new Date(`${attendanceDate}T12:00:00+07:00`));
  const studentsRes = await client.query(
    `SELECT
       st.user_id,
       st.current_class_id,
       c.grade_id
     FROM u_students st
     LEFT JOIN a_class c ON c.id = st.current_class_id
     WHERE st.homebase_id = $1`,
    [homebaseId],
  );

  let marked = 0;

  for (const student of studentsRes.rows) {
    const policy = await resolvePolicyForUser(client, {
      homebaseId,
      userId: student.user_id,
      targetRole: "student",
      classId: student.current_class_id,
      gradeId: student.grade_id,
      attendanceDate,
    });
    if (!policy) continue;

    const dayRule = await getDayRule(client, policy.id, dayOfWeek);
    if (!dayRule) continue;

    const cutoff = resolveCheckinCutoff(dayRule, now);
    if (!cutoff || now.getTime() < cutoff.getTime()) continue;

    const existingRes = await client.query(
      `SELECT id, checkin_at, attendance_status
       FROM attendance.daily_attendance
       WHERE user_id = $1
         AND attendance_date = $2::date
       LIMIT 1`,
      [student.user_id, attendanceDate],
    );

    const existing = existingRes.rows[0];
    if (existing?.checkin_at) continue;
    if (existing && FINAL_STATUSES.has(existing.attendance_status)) {
      if (existing.attendance_status !== "pending") continue;
    }

    await upsertAbsentDailyAttendance(client, {
      homebaseId,
      periodeId,
      userId: student.user_id,
      targetRole: "student",
      policy,
      attendanceDate,
      attendanceStatus: "absent",
      requiredToAttend: true,
      requirementSource: "policy",
      notes: "Auto-absent: tidak ada scan masuk hingga batas checkin.",
    });
    marked += 1;
  }

  return marked;
};

const processTeacherAutoAbsent = async (
  client,
  { homebaseId, periodeId, attendanceDate, now },
) => {
  if (!(await isFeatureEnabled(client, homebaseId, "teacher_daily_attendance"))) {
    return 0;
  }

  const dayOfWeek = getJakartaIsoDow(new Date(`${attendanceDate}T12:00:00+07:00`));
  const teachersRes = await client.query(
    `SELECT user_id
     FROM u_teachers
     WHERE homebase_id = $1`,
    [homebaseId],
  );

  let marked = 0;

  for (const teacher of teachersRes.rows) {
    const policy = await resolvePolicyForUser(client, {
      homebaseId,
      userId: teacher.user_id,
      targetRole: "teacher",
      classId: null,
      gradeId: null,
      attendanceDate,
    });
    if (!policy) continue;

    if (policy.policy_type === "teacher_schedule_based") {
      const sessionCount = await countTeacherSessions(client, {
        homebaseId,
        periodeId,
        teacherId: teacher.user_id,
        dayOfWeek,
      });

      if (sessionCount === 0) {
        continue;
      }

      const dayRule = await getDayRule(client, policy.id, dayOfWeek);
      const cutoff = resolveCheckinCutoff(dayRule, now);
      if (!cutoff || now.getTime() < cutoff.getTime()) continue;

      const attendanceRes = await client.query(
        `SELECT id, checkin_at, attendance_status
         FROM attendance.daily_attendance
         WHERE user_id = $1
           AND attendance_date = $2::date
         LIMIT 1`,
        [teacher.user_id, attendanceDate],
      );
      const existing = attendanceRes.rows[0];
      if (existing?.checkin_at) {
        if (existing.id) {
          await syncTeacherScheduleRequirements(client, {
            attendanceId: existing.id,
            teacherId: teacher.user_id,
            homebaseId,
            periodeId,
            attendanceDate,
          });
        }
        continue;
      }
      if (existing && FINAL_STATUSES.has(existing.attendance_status)) {
        if (existing.attendance_status !== "pending") continue;
      }

      await upsertAbsentDailyAttendance(client, {
        homebaseId,
        periodeId,
        userId: teacher.user_id,
        targetRole: "teacher",
        policy,
        attendanceDate,
        attendanceStatus: "absent",
        requiredToAttend: true,
        requirementSource: "schedule",
        notes: "Auto-absent: tidak ada scan masuk hingga batas checkin.",
      });

      const attendanceIdRes = await client.query(
        `SELECT id
         FROM attendance.daily_attendance
         WHERE user_id = $1
           AND attendance_date = $2::date
         LIMIT 1`,
        [teacher.user_id, attendanceDate],
      );
      if (attendanceIdRes.rows[0]?.id) {
        await syncTeacherScheduleRequirements(client, {
          attendanceId: attendanceIdRes.rows[0].id,
          teacherId: teacher.user_id,
          homebaseId,
          periodeId,
          attendanceDate,
        });
      }

      marked += 1;
      continue;
    }

    const dayRule = await getDayRule(client, policy.id, dayOfWeek);
    if (!dayRule) continue;

    const cutoff = resolveCheckinCutoff(dayRule, now);
    if (!cutoff || now.getTime() < cutoff.getTime()) continue;

    const existingRes = await client.query(
      `SELECT id, checkin_at, attendance_status
       FROM attendance.daily_attendance
       WHERE user_id = $1
         AND attendance_date = $2::date
       LIMIT 1`,
      [teacher.user_id, attendanceDate],
    );
    const existing = existingRes.rows[0];
    if (existing?.checkin_at) continue;
    if (existing && FINAL_STATUSES.has(existing.attendance_status)) {
      if (existing.attendance_status !== "pending") continue;
    }

    await upsertAbsentDailyAttendance(client, {
      homebaseId,
      periodeId,
      userId: teacher.user_id,
      targetRole: "teacher",
      policy,
      attendanceDate,
      attendanceStatus: "absent",
      requiredToAttend: true,
      requirementSource: "policy",
      notes: "Auto-absent: tidak ada scan masuk hingga batas checkin.",
    });
    marked += 1;
  }

  return marked;
};

const markMissedTeacherSessions = async (
  client,
  { homebaseId, attendanceDate, now },
) => {
  if (
    !(await isFeatureEnabled(
      client,
      homebaseId,
      "teacher_class_session_attendance",
    ))
  ) {
    return 0;
  }

  const result = await client.query(
    `UPDATE attendance.teacher_schedule_requirement tsr
     SET
       session_status = 'missed',
       notes = COALESCE(tsr.notes, 'Auto-missed: tidak ada scan sesi kelas.'),
       updated_at = NOW()
     FROM attendance.daily_attendance da
     WHERE tsr.attendance_id = da.id
       AND da.homebase_id = $1
       AND da.attendance_date = $2::date
       AND tsr.actual_checkin_at IS NULL
       AND tsr.session_status = 'pending'
       AND tsr.planned_end_at IS NOT NULL
       AND tsr.planned_end_at <= $3::timestamptz`,
    [homebaseId, attendanceDate, now.toISOString()],
  );

  return result.rowCount;
};

export const runAutoAbsentForHomebase = async (
  client,
  { homebaseId, attendanceDate = null, now = new Date() } = {},
) => {
  const evaluationDate = attendanceDate || toJakartaDateString(now);
  const periodeRes = await client.query(
    `SELECT id
     FROM a_periode
     WHERE homebase_id = $1
       AND is_active = true
     ORDER BY id DESC
     LIMIT 1`,
    [homebaseId],
  );
  const periodeId = periodeRes.rows[0]?.id || null;
  if (!periodeId) {
    return {
      homebase_id: homebaseId,
      attendance_date: evaluationDate,
      students_marked: 0,
      teachers_marked: 0,
      sessions_marked_missed: 0,
    };
  }

  const studentsMarked = await processStudentAutoAbsent(client, {
    homebaseId,
    periodeId,
    attendanceDate: evaluationDate,
    now,
  });
  const teachersMarked = await processTeacherAutoAbsent(client, {
    homebaseId,
    periodeId,
    attendanceDate: evaluationDate,
    now,
  });
  const sessionsMarkedMissed = await markMissedTeacherSessions(client, {
    homebaseId,
    attendanceDate: evaluationDate,
    now,
  });

  return {
    homebase_id: homebaseId,
    attendance_date: evaluationDate,
    students_marked: studentsMarked,
    teachers_marked: teachersMarked,
    sessions_marked_missed: sessionsMarkedMissed,
  };
};

export const runAutoAbsentJob = async (pool) => {
  const now = new Date();
  const homebasesRes = await pool.query(
    `SELECT id
     FROM a_homebase
     ORDER BY id ASC`,
  );

  const results = [];
  for (const homebase of homebasesRes.rows) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await runAutoAbsentForHomebase(client, {
        homebaseId: homebase.id,
        now,
      });
      await client.query("COMMIT");
      results.push(result);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(
        `[attendance] Auto-absent gagal untuk homebase ${homebase.id}:`,
        error.message,
      );
    } finally {
      client.release();
    }
  }

  return results;
};
