import {
  countTeacherScheduleSessions,
  getDayRule,
  getJakartaIsoDow,
  resolvePolicyForUser,
  toJakartaDateString,
} from "./rfidDailyAttendance.js";
import { isAttendanceHoliday } from "./holidayCalendar.js";
import {
  listEligibleStudentsForDailyAttendance,
  listEligibleTeachersForDailyAttendance,
} from "./attendanceAutoAbsent.js";

const insertPendingDailyAttendance = async (
  client,
  {
    homebaseId,
    periodeId,
    userId,
    targetRole,
    policy,
    attendanceDate,
    requiredToAttend,
    requirementSource,
    notes,
  },
) => {
  const result = await client.query(
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
       $1, $2, $3, $4, $5::date, $6, $7, $8, $9, 'pending', $10, NOW(), NOW()
     )
     ON CONFLICT (user_id, attendance_date) DO NOTHING
     RETURNING id`,
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
      notes,
    ],
  );

  return result.rowCount > 0;
};

const processStudentAutoPending = async (
  client,
  { homebaseId, periodeId, attendanceDate },
) => {
  if (
    await isAttendanceHoliday(client, homebaseId, attendanceDate, "student")
  ) {
    return 0;
  }

  const featureRes = await client.query(
    `SELECT is_enabled
     FROM attendance.attendance_feature_setting
     WHERE homebase_id = $1
       AND feature_code = 'student_daily_attendance'
     LIMIT 1`,
    [homebaseId],
  );
  if (featureRes.rows[0]?.is_enabled !== true) {
    return 0;
  }

  const dayOfWeek = getJakartaIsoDow(
    new Date(`${attendanceDate}T12:00:00+07:00`),
  );
  const students = await listEligibleStudentsForDailyAttendance(client, {
    homebaseId,
    periodeId,
  });

  let created = 0;
  for (const student of students) {
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

    const inserted = await insertPendingDailyAttendance(client, {
      homebaseId,
      periodeId,
      userId: student.user_id,
      targetRole: "student",
      policy,
      attendanceDate,
      requiredToAttend: true,
      requirementSource: "policy",
      notes: "Auto-pending: menunggu tap masuk.",
    });
    if (inserted) created += 1;
  }

  return created;
};

const processTeacherAutoPending = async (
  client,
  { homebaseId, periodeId, attendanceDate },
) => {
  if (
    await isAttendanceHoliday(client, homebaseId, attendanceDate, "teacher")
  ) {
    return 0;
  }

  const featureRes = await client.query(
    `SELECT is_enabled
     FROM attendance.attendance_feature_setting
     WHERE homebase_id = $1
       AND feature_code = 'teacher_daily_attendance'
     LIMIT 1`,
    [homebaseId],
  );
  if (featureRes.rows[0]?.is_enabled !== true) {
    return 0;
  }

  const dayOfWeek = getJakartaIsoDow(
    new Date(`${attendanceDate}T12:00:00+07:00`),
  );
  const teachers = await listEligibleTeachersForDailyAttendance(client, {
    homebaseId,
  });

  let created = 0;
  for (const teacher of teachers) {
    const policy = await resolvePolicyForUser(client, {
      homebaseId,
      userId: teacher.user_id,
      targetRole: "teacher",
      classId: null,
      gradeId: null,
      attendanceDate,
    });
    if (!policy) continue;

    const dayRule = await getDayRule(client, policy.id, dayOfWeek);
    if (!dayRule) continue;

    if (policy.policy_type === "teacher_schedule_based") {
      const sessionCount = await countTeacherScheduleSessions(client, {
        homebaseId,
        periodeId,
        teacherId: teacher.user_id,
        dayOfWeek,
      });
      if (sessionCount === 0) continue;
    }

    const inserted = await insertPendingDailyAttendance(client, {
      homebaseId,
      periodeId,
      userId: teacher.user_id,
      targetRole: "teacher",
      policy,
      attendanceDate,
      requiredToAttend: true,
      requirementSource:
        policy.policy_type === "teacher_schedule_based" ? "schedule" : "policy",
      notes: "Auto-pending: menunggu tap masuk.",
    });
    if (inserted) created += 1;
  }

  return created;
};

export const runAutoPendingForHomebase = async (
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
      students_pending: 0,
      teachers_pending: 0,
      skipped_student_holiday: false,
      skipped_teacher_holiday: false,
    };
  }

  const skippedStudentHoliday = await isAttendanceHoliday(
    client,
    homebaseId,
    evaluationDate,
    "student",
  );
  const skippedTeacherHoliday = await isAttendanceHoliday(
    client,
    homebaseId,
    evaluationDate,
    "teacher",
  );

  const studentsPending = skippedStudentHoliday
    ? 0
    : await processStudentAutoPending(client, {
        homebaseId,
        periodeId,
        attendanceDate: evaluationDate,
      });
  const teachersPending = skippedTeacherHoliday
    ? 0
    : await processTeacherAutoPending(client, {
        homebaseId,
        periodeId,
        attendanceDate: evaluationDate,
      });

  return {
    homebase_id: homebaseId,
    attendance_date: evaluationDate,
    students_pending: studentsPending,
    teachers_pending: teachersPending,
    skipped_student_holiday: skippedStudentHoliday,
    skipped_teacher_holiday: skippedTeacherHoliday,
  };
};

export const runAutoPendingJob = async (pool) => {
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
      const result = await runAutoPendingForHomebase(client, {
        homebaseId: homebase.id,
        now,
      });
      await client.query("COMMIT");
      results.push(result);
    } catch (error) {
      await client.query("ROLLBACK");
      console.error(
        `[attendance] Auto-pending gagal untuk homebase ${homebase.id}:`,
        error.message,
      );
    } finally {
      client.release();
    }
  }

  return results;
};
