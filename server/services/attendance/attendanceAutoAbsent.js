import {
  countTeacherScheduleSessions,
  getDayRule,
  getJakartaIsoDow,
  jakartaLocalToDate,
  JAKARTA_TZ,
  resolvePolicyForUser,
  toJakartaDateString,
} from "./rfidDailyAttendance.js";
import { isAttendanceHoliday } from "./holidayCalendar.js";

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

/**
 * Siswa eligible auto-absent / auto-checkout:
 * aktif, enrollment periode aktif, dan punya RFID aktif.
 */
export const listEligibleStudentsForDailyAttendance = async (
  client,
  { homebaseId, periodeId },
) => {
  if (!periodeId) return [];

  const result = await client.query(
    `SELECT DISTINCT
       st.user_id,
       st.current_class_id,
       c.grade_id
     FROM u_students st
     JOIN u_users u
       ON u.id = st.user_id
      AND u.is_active = true
      AND u.role = 'student'
     JOIN u_class_enrollments ce
       ON ce.student_id = st.user_id
      AND ce.periode_id = $2
     JOIN attendance.rfid_card rc
       ON rc.user_id = st.user_id
      AND rc.is_active = true
     LEFT JOIN a_class c ON c.id = st.current_class_id
     WHERE st.homebase_id = $1
     ORDER BY st.user_id ASC`,
    [homebaseId, periodeId],
  );

  return result.rows;
};

/**
 * Guru eligible auto-absent / auto-checkout:
 * aktif dan punya RFID aktif.
 */
export const listEligibleTeachersForDailyAttendance = async (
  client,
  { homebaseId },
) => {
  const result = await client.query(
    `SELECT DISTINCT t.user_id
     FROM u_teachers t
     JOIN u_users u
       ON u.id = t.user_id
      AND u.is_active = true
     JOIN attendance.rfid_card rc
       ON rc.user_id = t.user_id
      AND rc.is_active = true
     WHERE t.homebase_id = $1
     ORDER BY t.user_id ASC`,
    [homebaseId],
  );

  return result.rows;
};

/** Hapus presensi harian siswa yang tidak punya RFID aktif. */
export const purgeStudentAttendanceWithoutRfid = async (
  client,
  { homebaseId, attendanceDate = null } = {},
) => {
  const params = [homebaseId];
  let dateFilter = "";
  if (attendanceDate) {
    params.push(attendanceDate);
    dateFilter = `AND da.attendance_date = $2::date`;
  }

  const result = await client.query(
    `DELETE FROM attendance.daily_attendance da
     WHERE da.homebase_id = $1
       AND da.target_role = 'student'
       ${dateFilter}
       AND NOT EXISTS (
         SELECT 1
         FROM attendance.rfid_card rc
         WHERE rc.user_id = da.user_id
           AND rc.is_active = true
       )
     RETURNING da.id`,
    params,
  );

  return result.rowCount;
};

/** Hapus presensi harian guru yang tidak punya RFID aktif. */
export const purgeTeacherAttendanceWithoutRfid = async (
  client,
  { homebaseId, attendanceDate = null } = {},
) => {
  const params = [homebaseId];
  let dateFilter = "";
  if (attendanceDate) {
    params.push(attendanceDate);
    dateFilter = `AND da.attendance_date = $2::date`;
  }

  const result = await client.query(
    `DELETE FROM attendance.daily_attendance da
     WHERE da.homebase_id = $1
       AND da.target_role = 'teacher'
       ${dateFilter}
       AND NOT EXISTS (
         SELECT 1
         FROM attendance.rfid_card rc
         WHERE rc.user_id = da.user_id
           AND rc.is_active = true
       )
     RETURNING da.id`,
    params,
  );

  return result.rowCount;
};

/** Akhir sesi mengajar terakhir guru di hari itu (fallback cutoff schedule-based). */
export const resolveLastTeacherSessionEndAt = async (
  client,
  { homebaseId, periodeId, teacherId, attendanceDate, dayOfWeek },
) => {
  if (!periodeId) return null;

  const result = await client.query(
    `SELECT MAX(
       ($5::date::timestamp + COALESCE(slot_last.last_end_time, start_slot.end_time))
         AT TIME ZONE '${JAKARTA_TZ}'
     ) AS last_end_at
     FROM lms.l_schedule_entry se
     JOIN lms.l_time_slot start_slot ON start_slot.id = se.slot_start_id
     LEFT JOIN LATERAL (
       SELECT ts.end_time AS last_end_time
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
     WHERE se.homebase_id = $1
       AND se.periode_id = $2
       AND se.teacher_id = $3
       AND se.day_of_week = $4
       AND se.status <> 'archived'`,
    [homebaseId, periodeId, teacherId, dayOfWeek, attendanceDate],
  );

  const value = result.rows[0]?.last_end_at;
  return value ? new Date(value) : null;
};

/** Batas auto-absent: utamakan Checkin Selesai (checkin_end). */
export const resolveCheckinCutoff = (dayRule, now) => {
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

/** Jam auto-isi checkout: tepat Jam Pulang (reference_checkout_time). */
export const resolveCheckoutFillAt = (dayRule, attendanceDate) => {
  if (!dayRule?.reference_checkout_time) return null;
  return jakartaLocalToDate(attendanceDate, dayRule.reference_checkout_time);
};

export const hasPassedCutoff = (now, cutoff) =>
  Boolean(cutoff) && now.getTime() >= cutoff.getTime();

export const shouldSkipExistingAbsentRow = (existing) => {
  if (!existing) return false;
  if (existing.checkin_at) return true;
  return FINAL_STATUSES.has(existing.attendance_status);
};

/** Auto-isi jam pulang berlaku untuk semua tipe policy yang punya day rule Jam Pulang. */
export const canAutoFillCheckoutForPolicy = (policy) => Boolean(policy);

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

export const resolveAutoCheckoutStatus = ({
  checkinAt,
  checkoutAt,
  currentStatus,
  lateMinutes,
  minPresenceMinutes,
}) => {
  let attendanceStatus = currentStatus || "pending";

  if (attendanceStatus === "pending") {
    attendanceStatus = Number(lateMinutes || 0) > 0 ? "late" : "present";
  }

  if (!checkinAt || !checkoutAt) {
    return { attendanceStatus, presenceMinutes: null };
  }

  const presenceMinutes = Math.max(
    0,
    Math.floor((checkoutAt.getTime() - new Date(checkinAt).getTime()) / 60000),
  );

  if (
    minPresenceMinutes != null &&
    Number.isFinite(Number(minPresenceMinutes)) &&
    presenceMinutes < Number(minPresenceMinutes) &&
    attendanceStatus !== "late"
  ) {
    attendanceStatus = "insufficient_hours";
  }

  return { attendanceStatus, presenceMinutes };
};

const applyAutoCheckout = async (
  client,
  { attendanceId, checkinAt, checkoutAt, currentStatus, lateMinutes, dayRule },
) => {
  const { attendanceStatus, presenceMinutes } = resolveAutoCheckoutStatus({
    checkinAt,
    checkoutAt,
    currentStatus,
    lateMinutes,
    minPresenceMinutes: dayRule?.min_presence_minutes,
  });

  const notes = "Auto-checkout: tidak ada scan pulang hingga jam pulang policy.";

  const updated = await client.query(
    `UPDATE attendance.daily_attendance
     SET
       checkout_at = $2::timestamptz,
       presence_minutes = $3,
       attendance_status = $4,
       notes = COALESCE(notes, $5),
       evaluated_at = NOW(),
       updated_at = NOW()
     WHERE id = $1
       AND checkin_at IS NOT NULL
       AND checkout_at IS NULL
     RETURNING id`,
    [
      attendanceId,
      checkoutAt.toISOString(),
      presenceMinutes,
      attendanceStatus,
      notes,
    ],
  );

  if (updated.rowCount === 0) return false;

  await client.query(
    `INSERT INTO attendance.daily_attendance_event (
       attendance_id,
       scan_log_id,
       event_type,
       event_time,
       event_source,
       event_result,
       notes
     )
     VALUES ($1, NULL, 'auto_checkout', $2::timestamptz, 'system', 'applied', $3)`,
    [attendanceId, checkoutAt.toISOString(), notes],
  );

  return true;
};

const processStudentAutoAbsent = async (
  client,
  { homebaseId, periodeId, attendanceDate, now },
) => {
  if (
    await isAttendanceHoliday(client, homebaseId, attendanceDate, "student")
  ) {
    return 0;
  }

  if (!(await isFeatureEnabled(client, homebaseId, "student_daily_attendance"))) {
    return 0;
  }

  const dayOfWeek = getJakartaIsoDow(new Date(`${attendanceDate}T12:00:00+07:00`));
  const studentsRes = {
    rows: await listEligibleStudentsForDailyAttendance(client, {
      homebaseId,
      periodeId,
    }),
  };

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

    // getDayRule hanya mengembalikan rule hari aktif.
    const dayRule = await getDayRule(client, policy.id, dayOfWeek);
    if (!dayRule) continue;

    const cutoff = resolveCheckinCutoff(dayRule, now);
    if (!hasPassedCutoff(now, cutoff)) continue;

    const existingRes = await client.query(
      `SELECT id, checkin_at, attendance_status
       FROM attendance.daily_attendance
       WHERE user_id = $1
         AND attendance_date = $2::date
       LIMIT 1`,
      [student.user_id, attendanceDate],
    );

    const existing = existingRes.rows[0];
    if (shouldSkipExistingAbsentRow(existing)) continue;

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
  if (
    await isAttendanceHoliday(client, homebaseId, attendanceDate, "teacher")
  ) {
    return 0;
  }

  if (!(await isFeatureEnabled(client, homebaseId, "teacher_daily_attendance"))) {
    return 0;
  }

  const dayOfWeek = getJakartaIsoDow(new Date(`${attendanceDate}T12:00:00+07:00`));
  const teachersRes = {
    rows: await listEligibleTeachersForDailyAttendance(client, { homebaseId }),
  };

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
      if (!dayRule) continue;

      // Prioritas: Jam Pulang policy → Checkin Selesai → akhir sesi terakhir hari itu.
      const cutoff =
        resolveCheckoutFillAt(dayRule, attendanceDate) ||
        resolveCheckinCutoff(dayRule, now) ||
        (await resolveLastTeacherSessionEndAt(client, {
          homebaseId,
          periodeId,
          teacherId: teacher.user_id,
          attendanceDate,
          dayOfWeek,
        }));
      if (!hasPassedCutoff(now, cutoff)) continue;

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
      if (shouldSkipExistingAbsentRow(existing)) continue;

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
        notes: "Auto-absent: tidak ada scan masuk hingga batas kehadiran policy.",
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

    // Fixed daily: Checkin Selesai, atau Jam Pulang jika checkin_end kosong.
    const cutoff =
      resolveCheckinCutoff(dayRule, now) ||
      resolveCheckoutFillAt(dayRule, attendanceDate);
    if (!hasPassedCutoff(now, cutoff)) continue;

    const existingRes = await client.query(
      `SELECT id, checkin_at, attendance_status
       FROM attendance.daily_attendance
       WHERE user_id = $1
         AND attendance_date = $2::date
       LIMIT 1`,
      [teacher.user_id, attendanceDate],
    );
    const existing = existingRes.rows[0];
    if (shouldSkipExistingAbsentRow(existing)) continue;

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
      notes: "Auto-absent: tidak ada scan masuk hingga batas kehadiran policy.",
    });
    marked += 1;
  }

  return marked;
};

/**
 * Auto-isi jam pulang tepat pada Jam Pulang policy.
 * Berlaku untuk semua tipe policy (termasuk teacher_schedule_based)
 * selama day rule punya reference_checkout_time dan checkout tidak optional.
 * Siswa: hanya eligible (enrollment periode + RFID aktif).
 */
const processAutoCheckout = async (
  client,
  { homebaseId, periodeId = null, attendanceDate, now, targetRole },
) => {
  if (
    await isAttendanceHoliday(client, homebaseId, attendanceDate, targetRole)
  ) {
    return 0;
  }

  const featureCode =
    targetRole === "teacher"
      ? "teacher_daily_attendance"
      : "student_daily_attendance";
  if (!(await isFeatureEnabled(client, homebaseId, featureCode))) {
    return 0;
  }

  const dayOfWeek = getJakartaIsoDow(new Date(`${attendanceDate}T12:00:00+07:00`));

  const usersRes =
    targetRole === "teacher"
      ? {
          rows: await listEligibleTeachersForDailyAttendance(client, {
            homebaseId,
          }),
        }
      : {
          rows: await listEligibleStudentsForDailyAttendance(client, {
            homebaseId,
            periodeId,
          }),
        };

  let filled = 0;

  for (const row of usersRes.rows) {
    const policy = await resolvePolicyForUser(client, {
      homebaseId,
      userId: row.user_id,
      targetRole,
      classId: row.current_class_id ?? null,
      gradeId: row.grade_id ?? null,
      attendanceDate,
    });
    if (!canAutoFillCheckoutForPolicy(policy)) continue;

    const dayRule = await getDayRule(client, policy.id, dayOfWeek);
    if (!dayRule) continue;
    if (dayRule.checkout_is_optional === true) continue;

    let fillAt = resolveCheckoutFillAt(dayRule, attendanceDate);
    if (
      !fillAt &&
      targetRole === "teacher" &&
      policy.policy_type === "teacher_schedule_based" &&
      periodeId
    ) {
      fillAt = await resolveLastTeacherSessionEndAt(client, {
        homebaseId,
        periodeId,
        teacherId: row.user_id,
        attendanceDate,
        dayOfWeek,
      });
    }
    if (!hasPassedCutoff(now, fillAt)) continue;

    const existingRes = await client.query(
      `SELECT
         id,
         checkin_at,
         checkout_at,
         attendance_status,
         late_minutes
       FROM attendance.daily_attendance
       WHERE user_id = $1
         AND attendance_date = $2::date
       LIMIT 1`,
      [row.user_id, attendanceDate],
    );

    const existing = existingRes.rows[0];
    if (!existing?.checkin_at || existing.checkout_at) continue;
    if (
      existing.attendance_status === "absent" ||
      existing.attendance_status === "excused" ||
      existing.attendance_status === "not_scheduled"
    ) {
      continue;
    }

    const applied = await applyAutoCheckout(client, {
      attendanceId: existing.id,
      checkinAt: existing.checkin_at,
      checkoutAt: fillAt,
      currentStatus: existing.attendance_status,
      lateMinutes: existing.late_minutes,
      dayRule,
    });
    if (applied) filled += 1;
  }

  return filled;
};

const markMissedTeacherSessions = async (
  client,
  { homebaseId, attendanceDate, now },
) => {
  if (
    await isAttendanceHoliday(client, homebaseId, attendanceDate, "teacher")
  ) {
    return 0;
  }

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
      students_purged_no_rfid: 0,
      teachers_purged_no_rfid: 0,
      students_marked: 0,
      teachers_marked: 0,
      students_checkout_filled: 0,
      teachers_checkout_filled: 0,
      sessions_marked_missed: 0,
    };
  }

  const runStep = async (stepName, fn) => {
    const savepoint = `sp_${stepName}`;
    try {
      await client.query(`SAVEPOINT ${savepoint}`);
      const value = await fn();
      await client.query(`RELEASE SAVEPOINT ${savepoint}`);
      return value;
    } catch (error) {
      await client.query(`ROLLBACK TO SAVEPOINT ${savepoint}`);
      console.error(
        `[attendance] ${stepName} gagal homebase ${homebaseId}:`,
        error.message,
      );
      return 0;
    }
  };

  const studentsPurgedNoRfid = await runStep("purge_student_no_rfid", () =>
    purgeStudentAttendanceWithoutRfid(client, {
      homebaseId,
      attendanceDate: evaluationDate,
    }),
  );
  const teachersPurgedNoRfid = await runStep("purge_teacher_no_rfid", () =>
    purgeTeacherAttendanceWithoutRfid(client, {
      homebaseId,
      attendanceDate: evaluationDate,
    }),
  );
  const studentsMarked = await runStep("student_absent", () =>
    processStudentAutoAbsent(client, {
      homebaseId,
      periodeId,
      attendanceDate: evaluationDate,
      now,
    }),
  );
  const teachersMarked = await runStep("teacher_absent", () =>
    processTeacherAutoAbsent(client, {
      homebaseId,
      periodeId,
      attendanceDate: evaluationDate,
      now,
    }),
  );
  const studentsCheckoutFilled = await runStep("student_checkout", () =>
    processAutoCheckout(client, {
      homebaseId,
      periodeId,
      attendanceDate: evaluationDate,
      now,
      targetRole: "student",
    }),
  );
  const teachersCheckoutFilled = await runStep("teacher_checkout", () =>
    processAutoCheckout(client, {
      homebaseId,
      periodeId,
      attendanceDate: evaluationDate,
      now,
      targetRole: "teacher",
    }),
  );
  const sessionsMarkedMissed = await runStep("session_missed", () =>
    markMissedTeacherSessions(client, {
      homebaseId,
      attendanceDate: evaluationDate,
      now,
    }),
  );

  return {
    homebase_id: homebaseId,
    attendance_date: evaluationDate,
    students_purged_no_rfid: studentsPurgedNoRfid,
    teachers_purged_no_rfid: teachersPurgedNoRfid,
    students_marked: studentsMarked,
    teachers_marked: teachersMarked,
    students_checkout_filled: studentsCheckoutFilled,
    teachers_checkout_filled: teachersCheckoutFilled,
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
