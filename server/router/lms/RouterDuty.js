import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const toInt = (value, fallback = null) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const normalizeDate = (value) => {
  if (!value) return formatToday();
  const safeValue = String(value).trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(safeValue)) {
    return null;
  }
  return safeValue;
};

const normalizeTime = (value) => {
  if (!value) return null;
  const safeValue = String(value).trim();
  if (!/^\d{2}:\d{2}$/.test(safeValue)) {
    return null;
  }
  return `${safeValue}:00`;
};

const getIsoDayOfWeek = async (executor, dateValue) => {
  const result = await executor.query(
    `SELECT EXTRACT(ISODOW FROM $1::date)::int AS day_of_week`,
    [dateValue],
  );
  return result.rows[0]?.day_of_week || null;
};

const hasDutyReportNoteColumn = async (executor) => {
  const result = await executor.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'lms'
       AND table_name = 'l_duty_assignment'
       AND column_name = 'report_note'
     LIMIT 1`,
  );
  return result.rowCount > 0;
};

const hasTeacherSessionClassColumn = async (executor) => {
  const result = await executor.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'lms'
       AND table_name = 'l_teacher_session_log'
       AND column_name = 'class_id'
     LIMIT 1`,
  );
  return result.rowCount > 0;
};

const ensureActivePeriode = async (executor, homebaseId, requestedPeriodeId) => {
  if (requestedPeriodeId) return requestedPeriodeId;
  const activePeriode = await executor.query(
    `SELECT id
     FROM public.a_periode
     WHERE homebase_id = $1
       AND is_active = true
     ORDER BY id DESC
     LIMIT 1`,
    [homebaseId],
  );
  return activePeriode.rows[0]?.id || null;
};

const ensureSessionScheduleEntry = async ({
  executor,
  homebaseId,
  periodeId,
  dayOfWeek,
  classId,
  teacherId,
  createdBy,
}) => {
  const subjectResult = await executor.query(
    `SELECT subject_id
     FROM (
       SELECT ats.subject_id, 1 AS priority, ats.id AS sort_id
       FROM public.at_subject ats
       WHERE ats.teacher_id = $1
         AND ats.class_id = $2

       UNION ALL

       SELECT tl.subject_id, 2 AS priority, tl.id AS sort_id
       FROM lms.l_teaching_load tl
       WHERE tl.homebase_id = $3
         AND tl.periode_id = $4
         AND tl.teacher_id = $1
         AND tl.class_id = $2
         AND tl.is_active = true

       UNION ALL

       SELECT s.id AS subject_id, 3 AS priority, s.id AS sort_id
       FROM public.a_subject s
       WHERE s.homebase_id = $3
     ) subject_candidates
     ORDER BY priority ASC, sort_id ASC
     LIMIT 1`,
    [teacherId, classId, homebaseId, periodeId],
  );

  const subjectId = subjectResult.rows[0]?.subject_id || null;
  if (!subjectId) {
    return null;
  }

  let teachingLoadResult = await executor.query(
    `SELECT id, subject_id
     FROM lms.l_teaching_load
     WHERE homebase_id = $1
       AND periode_id = $2
       AND class_id = $3
       AND teacher_id = $4
       AND is_active = true
     ORDER BY id ASC
     LIMIT 1`,
    [homebaseId, periodeId, classId, teacherId],
  );

  let teachingLoad = teachingLoadResult.rows[0];

  if (!teachingLoad) {
    const insertedTeachingLoad = await executor.query(
      `INSERT INTO lms.l_teaching_load (
         homebase_id,
         periode_id,
         class_id,
         subject_id,
         teacher_id,
         weekly_sessions,
         max_sessions_per_meeting,
         require_different_days,
         allow_same_day_with_gap,
         minimum_gap_slots,
         is_active,
         created_by
       )
       VALUES (
         $1,
         $2,
         $3,
         $4,
         $5,
         1,
         1,
         false,
         true,
         0,
         true,
         $6
       )
       ON CONFLICT (periode_id, class_id, subject_id, teacher_id)
       DO UPDATE SET
         updated_at = CURRENT_TIMESTAMP,
         is_active = true
       RETURNING id, subject_id`,
      [homebaseId, periodeId, classId, subjectId, teacherId, createdBy],
    );

    teachingLoad = insertedTeachingLoad.rows[0] || null;
  }

  if (!teachingLoad) {
    return null;
  }

  let scheduleConfigResult = await executor.query(
    `SELECT id
     FROM lms.l_schedule_config
     WHERE homebase_id = $1
       AND periode_id = $2
     ORDER BY id ASC
     LIMIT 1`,
    [homebaseId, periodeId],
  );

  let scheduleConfigId = scheduleConfigResult.rows[0]?.id || null;

  if (!scheduleConfigId) {
    const insertedConfig = await executor.query(
      `INSERT INTO lms.l_schedule_config (
         homebase_id,
         periode_id,
         session_minutes,
         max_sessions_per_meeting,
         require_different_days_if_over_max,
         allow_same_day_multiple_meetings,
         minimum_gap_slots,
         created_by
       )
       VALUES ($1, $2, 45, 2, false, true, 0, $3)
       ON CONFLICT (homebase_id, periode_id)
       DO UPDATE SET updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [homebaseId, periodeId, createdBy],
    );

    scheduleConfigId = insertedConfig.rows[0]?.id || null;
  }

  if (!scheduleConfigId) {
    return null;
  }

  let slotResult = await executor.query(
    `SELECT ts.id
     FROM lms.l_time_slot ts
     WHERE ts.config_id = $1
       AND ts.day_of_week = $2
       AND ts.is_break = false
     ORDER BY ts.slot_no ASC
     LIMIT 1`,
    [scheduleConfigId, dayOfWeek],
  );

  let slotId = slotResult.rows[0]?.id || null;

  if (!slotId) {
    const insertedSlot = await executor.query(
      `INSERT INTO lms.l_time_slot (
         config_id,
         day_of_week,
         slot_no,
         start_time,
         end_time,
         is_break
       )
       VALUES ($1, $2, 1, '07:00', '07:45', false)
       ON CONFLICT (config_id, day_of_week, slot_no)
       DO UPDATE SET
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         is_break = false,
         updated_at = CURRENT_TIMESTAMP
       RETURNING id`,
      [scheduleConfigId, dayOfWeek],
    );

    slotId = insertedSlot.rows[0]?.id || null;
  }

  if (!slotId) {
    return null;
  }

  const meetingNoResult = await executor.query(
    `SELECT COALESCE(MAX(meeting_no), 0) + 1 AS next_meeting_no
     FROM lms.l_schedule_entry
     WHERE teaching_load_id = $1`,
    [teachingLoad.id],
  );

  const meetingNo = meetingNoResult.rows[0]?.next_meeting_no || 1;

  const insertEntryResult = await executor.query(
    `INSERT INTO lms.l_schedule_entry (
       homebase_id,
       periode_id,
       teaching_load_id,
       class_id,
       subject_id,
       teacher_id,
       day_of_week,
       slot_start_id,
       slot_count,
       meeting_no,
       source_type,
       is_manual_override,
       status,
       created_by
     )
     VALUES (
       $1,
       $2,
       $3,
       $4,
       $5,
       $6,
       $7,
       $8,
       1,
       $9,
       'manual',
       true,
       'draft',
       $10
     )
     RETURNING id`,
    [
      homebaseId,
      periodeId,
      teachingLoad.id,
      classId,
      teachingLoad.subject_id,
      teacherId,
      dayOfWeek,
      slotId,
      meetingNo,
      createdBy,
    ],
  );

  const scheduleEntryId = insertEntryResult.rows[0]?.id || null;
  if (!scheduleEntryId) {
    return null;
  }

  await executor.query(
    `INSERT INTO lms.l_schedule_entry_slot (
       schedule_entry_id,
       periode_id,
       day_of_week,
       slot_id,
       class_id,
       teacher_id
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT DO NOTHING`,
    [scheduleEntryId, periodeId, dayOfWeek, slotId, classId, teacherId],
  );

  return scheduleEntryId;
};

router.get(
  "/duty/bootstrap",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const selectedDate = normalizeDate(req.query.date);
    const requestedPeriodeId = toInt(req.query.periode_id, null);

    if (!selectedDate) {
      return res.status(400).json({
        status: "error",
        message: "Format tanggal tidak valid.",
      });
    }

    const periodeId = await ensureActivePeriode(pool, homebase_id, requestedPeriodeId);
    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const canReadReportNote = await hasDutyReportNoteColumn(pool);

    const [teacherResult, assignmentResult] = await Promise.all([
      pool.query(
        `SELECT u.id, u.full_name, t.nip
         FROM public.u_teachers t
         JOIN public.u_users u ON u.id = t.user_id
         WHERE t.homebase_id = $1
         ORDER BY u.full_name ASC`,
        [homebase_id],
      ),
      pool.query(
        `SELECT
           d.id,
           d.date,
           TO_CHAR(d.date, 'YYYY-MM-DD') AS date_key,
           d.duty_teacher_id,
           d.note,
           ${canReadReportNote ? "d.report_note" : "NULL::text AS report_note"},
           d.status,
           d.created_at,
           d.updated_at,
           u.full_name AS duty_teacher_name,
           t.nip AS duty_teacher_nip,
           assigner.full_name AS assigned_by_name
         FROM lms.l_duty_assignment d
         JOIN public.u_users u ON u.id = d.duty_teacher_id
         JOIN public.u_teachers t ON t.user_id = d.duty_teacher_id
         LEFT JOIN public.u_users assigner ON assigner.id = d.assigned_by
         WHERE d.homebase_id = $1
           AND d.periode_id = $2
           AND d.date = $3::date
           AND d.status <> 'cancelled'
         ORDER BY u.full_name ASC, d.created_at ASC`,
        [homebase_id, periodeId, selectedDate],
      ),
    ]);

    return res.json({
      status: "success",
      data: {
        date: selectedDate,
        periode_id: periodeId,
        teachers: teacherResult.rows,
        assignments: assignmentResult.rows,
      },
    });
  }),
);

router.post(
  "/duty/assignments",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const selectedDate = normalizeDate(req.body?.date);
    const teacherIds = Array.isArray(req.body?.teacher_ids)
      ? req.body.teacher_ids
          .map((item) => toInt(item, null))
          .filter((item) => Number.isFinite(item))
      : [];
    const note = String(req.body?.note || "").trim();
    const requestedPeriodeId = toInt(req.body?.periode_id, null);

    if (!selectedDate) {
      return res.status(400).json({
        status: "error",
        message: "Format tanggal tidak valid.",
      });
    }

    if (!teacherIds.length) {
      return res.status(400).json({
        status: "error",
        message: "Pilih minimal satu guru untuk piket.",
      });
    }

    const periodeId = await ensureActivePeriode(client, homebase_id, requestedPeriodeId);
    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const uniqueTeacherIds = [...new Set(teacherIds)];
    const teacherCheck = await client.query(
      `SELECT user_id
       FROM public.u_teachers
       WHERE homebase_id = $1
         AND user_id = ANY($2::int[])`,
      [homebase_id, uniqueTeacherIds],
    );
    if (teacherCheck.rowCount !== uniqueTeacherIds.length) {
      return res.status(400).json({
        status: "error",
        message: "Ada guru yang tidak valid untuk homebase ini.",
      });
    }

    const savedRows = [];
    for (const teacherId of uniqueTeacherIds) {
      const existingResult = await client.query(
        `SELECT id
         FROM lms.l_duty_assignment
         WHERE homebase_id = $1
           AND periode_id = $2
           AND date = $3::date
           AND duty_teacher_id = $4
         LIMIT 1`,
        [homebase_id, periodeId, selectedDate, teacherId],
      );

      const result = existingResult.rowCount
        ? await client.query(
            `UPDATE lms.l_duty_assignment
             SET assigned_by = $2,
                 note = $3,
                 status = 'assigned',
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [existingResult.rows[0].id, userId, note || null],
          )
        : await client.query(
            `INSERT INTO lms.l_duty_assignment (
               homebase_id,
               periode_id,
               date,
               duty_teacher_id,
               assigned_by,
               note,
               status
             )
             VALUES ($1, $2, $3::date, $4, $5, $6, 'assigned')
             RETURNING *`,
            [homebase_id, periodeId, selectedDate, teacherId, userId, note || null],
          );

      savedRows.push(result.rows[0]);
    }

    return res.json({
      status: "success",
      message: "Penugasan piket berhasil disimpan.",
      data: {
        saved_count: savedRows.length,
        assignments: savedRows,
      },
    });
  }),
);

router.delete(
  "/duty/assignments/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const assignmentId = toInt(req.params.id, null);

    if (!assignmentId) {
      return res.status(400).json({
        status: "error",
        message: "ID penugasan tidak valid.",
      });
    }

    const result = await client.query(
      `UPDATE lms.l_duty_assignment
       SET status = 'cancelled',
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND homebase_id = $2
       RETURNING id`,
      [assignmentId, homebase_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Penugasan piket tidak ditemukan.",
      });
    }

    return res.json({
      status: "success",
      message: "Penugasan piket dibatalkan.",
    });
  }),
);

router.get(
  "/duty/reports",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const selectedDate = normalizeDate(req.query.date);
    const requestedPeriodeId = toInt(req.query.periode_id, null);

    if (!selectedDate) {
      return res.status(400).json({
        status: "error",
        message: "Format tanggal tidak valid.",
      });
    }

    const periodeId = await ensureActivePeriode(pool, homebase_id, requestedPeriodeId);
    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const canReadReportNote = await hasDutyReportNoteColumn(pool);
    const hasSessionClassColumn = await hasTeacherSessionClassColumn(pool);

    const [
      assignmentResult,
      studentAbsenceResult,
      teacherAbsenceResult,
      teacherSessionResult,
    ] = await Promise.all([
      pool.query(
        `SELECT
           d.id,
           d.date,
           TO_CHAR(d.date, 'YYYY-MM-DD') AS date_key,
           d.duty_teacher_id,
           duty_user.full_name AS duty_teacher_name,
           duty_teacher.nip AS duty_teacher_nip,
           d.note,
           ${canReadReportNote ? "d.report_note" : "NULL::text AS report_note"},
           d.status,
           d.created_at,
           d.updated_at
         FROM lms.l_duty_assignment d
         JOIN public.u_users duty_user ON duty_user.id = d.duty_teacher_id
         JOIN public.u_teachers duty_teacher ON duty_teacher.user_id = d.duty_teacher_id
         WHERE d.homebase_id = $1
           AND d.periode_id = $2
           AND d.date = $3::date
           AND d.status <> 'cancelled'
         ORDER BY duty_user.full_name ASC, d.created_at ASC`,
        [homebase_id, periodeId, selectedDate],
      ),
      pool.query(
        `SELECT
           r.id,
           r.date,
           r.reason,
           r.follow_up,
           r.class_id,
           c.name AS class_name,
           student_user.full_name AS student_name,
           reporter_user.full_name AS reporter_teacher_name,
           student_ref.nis
         FROM lms.l_daily_absence_report r
         JOIN public.u_users student_user ON student_user.id = r.target_user_id
         LEFT JOIN public.u_students student_ref ON student_ref.user_id = r.target_user_id
         LEFT JOIN public.a_class c ON c.id = r.class_id
         JOIN public.u_users reporter_user ON reporter_user.id = r.reporter_teacher_id
         WHERE r.homebase_id = $1
           AND r.periode_id = $2
           AND r.date = $3::date
           AND r.target_type = 'student'
         ORDER BY c.name ASC NULLS LAST, student_user.full_name ASC`,
        [homebase_id, periodeId, selectedDate],
      ),
      pool.query(
        `SELECT
           r.id,
           r.date,
           r.reason,
           r.follow_up,
           absent_user.full_name AS teacher_name,
           reporter_user.full_name AS reporter_teacher_name
         FROM lms.l_daily_absence_report r
         JOIN public.u_users absent_user ON absent_user.id = r.target_user_id
         JOIN public.u_users reporter_user ON reporter_user.id = r.reporter_teacher_id
         WHERE r.homebase_id = $1
           AND r.periode_id = $2
           AND r.date = $3::date
           AND r.target_type = 'teacher'
         ORDER BY absent_user.full_name ASC`,
        [homebase_id, periodeId, selectedDate],
      ),
      pool.query(
        `SELECT
           l.id,
           l.date,
           l.schedule_entry_id,
           ${hasSessionClassColumn ? "l.class_id" : "e.class_id"} AS class_id,
           l.teacher_id,
           l.checkin_at,
           l.checkout_at,
           l.note,
           teacher_user.full_name AS teacher_name,
           reporter_user.full_name AS reporter_teacher_name,
           class_ref.name AS class_name,
           COALESCE(subject_ref.name, assign_subject.subject_name) AS subject_name
         FROM lms.l_teacher_session_log l
         JOIN public.u_users teacher_user ON teacher_user.id = l.teacher_id
         LEFT JOIN lms.l_schedule_entry e ON e.id = l.schedule_entry_id
         LEFT JOIN public.a_class class_ref
           ON class_ref.id = ${hasSessionClassColumn ? "l.class_id" : "e.class_id"}
         LEFT JOIN public.a_subject subject_ref ON subject_ref.id = e.subject_id
         LEFT JOIN lms.l_duty_assignment d ON d.id = l.duty_assignment_id
         LEFT JOIN public.u_users reporter_user ON reporter_user.id = d.duty_teacher_id
         LEFT JOIN LATERAL (
           SELECT subj.name AS subject_name
           FROM public.at_subject ats
           JOIN public.a_subject subj ON subj.id = ats.subject_id
           WHERE ats.teacher_id = l.teacher_id
             AND ats.class_id = ${hasSessionClassColumn ? "l.class_id" : "e.class_id"}
           ORDER BY subj.name ASC
           LIMIT 1
         ) assign_subject ON true
         WHERE l.date = $1::date
           AND EXISTS (
             SELECT 1
             FROM lms.l_duty_assignment duty
             WHERE duty.id = l.duty_assignment_id
               AND duty.homebase_id = $2
               AND duty.periode_id = $3
               AND duty.status <> 'cancelled'
           )
         ORDER BY l.checkin_at ASC NULLS LAST, class_ref.name ASC NULLS LAST, teacher_user.full_name ASC`,
        [selectedDate, homebase_id, periodeId],
      ),
    ]);

    return res.json({
      status: "success",
      data: {
        date: selectedDate,
        periode_id: periodeId,
        summary: {
          assignments_count: assignmentResult.rows.length,
          submitted_count: assignmentResult.rows.filter((item) => item.status === "done")
            .length,
          student_absence_count: studentAbsenceResult.rows.length,
          teacher_absence_count: teacherAbsenceResult.rows.length,
          teacher_session_count: teacherSessionResult.rows.length,
          daily_note_count: assignmentResult.rows.filter((item) =>
            String(item.report_note || "").trim(),
          ).length,
        },
        assignments: assignmentResult.rows,
        student_absences: studentAbsenceResult.rows,
        teacher_absences: teacherAbsenceResult.rows,
        teacher_sessions: teacherSessionResult.rows,
        daily_notes: assignmentResult.rows
          .filter((item) => String(item.report_note || "").trim())
          .map((item) => ({
            assignment_id: item.id,
            duty_teacher_id: item.duty_teacher_id,
            duty_teacher_name: item.duty_teacher_name,
            duty_teacher_nip: item.duty_teacher_nip,
            admin_note: item.note,
            daily_note: item.report_note,
            status: item.status,
            updated_at: item.updated_at,
          })),
      },
    });
  }),
);

router.delete(
  "/duty/reports/daily-note/:assignmentId",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const assignmentId = toInt(req.params.assignmentId, null);
    const canWriteReportNote = await hasDutyReportNoteColumn(client);

    if (!assignmentId) {
      return res.status(400).json({
        status: "error",
        message: "ID penugasan tidak valid.",
      });
    }

    if (!canWriteReportNote) {
      return res.status(400).json({
        status: "error",
        message: "Kolom catatan harian belum tersedia di database.",
      });
    }

    const result = await client.query(
      `UPDATE lms.l_duty_assignment
       SET report_note = NULL,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
         AND homebase_id = $2
         AND status <> 'cancelled'
       RETURNING id`,
      [assignmentId, homebase_id],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Catatan harian tidak ditemukan.",
      });
    }

    return res.json({
      status: "success",
      message: "Catatan harian berhasil dihapus.",
    });
  }),
);

router.get(
  "/duty/teacher/bootstrap",
  authorize("teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, homebase_id } = req.user;
    const selectedDate = normalizeDate(req.query.date);
    const requestedPeriodeId = toInt(req.query.periode_id, null);

    if (!selectedDate) {
      return res.status(400).json({
        status: "error",
        message: "Format tanggal tidak valid.",
      });
    }

    const periodeId = await ensureActivePeriode(pool, homebase_id, requestedPeriodeId);
    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const canReadReportNote = await hasDutyReportNoteColumn(pool);
    const hasSessionClassColumn = await hasTeacherSessionClassColumn(pool);

    const [assignedDatesResult, dutyAssignmentResult] = await Promise.all([
      pool.query(
        `SELECT id, date, TO_CHAR(date, 'YYYY-MM-DD') AS date_key, status, note,
                ${canReadReportNote ? "report_note" : "NULL::text AS report_note"}
         FROM lms.l_duty_assignment
         WHERE homebase_id = $1
           AND periode_id = $2
           AND duty_teacher_id = $3
           AND status <> 'cancelled'
         ORDER BY date DESC`,
        [homebase_id, periodeId, userId],
      ),
      pool.query(
        `SELECT id, date, TO_CHAR(date, 'YYYY-MM-DD') AS date_key, status, note,
                ${canReadReportNote ? "report_note" : "NULL::text AS report_note"}
         FROM lms.l_duty_assignment
         WHERE homebase_id = $1
           AND periode_id = $2
           AND duty_teacher_id = $3
           AND date = $4::date
           AND status <> 'cancelled'
         LIMIT 1`,
        [homebase_id, periodeId, userId, selectedDate],
      ),
    ]);

    const dutyAssignment =
      assignedDatesResult.rows.find((item) => item.date_key === selectedDate) ||
      dutyAssignmentResult.rows[0] ||
      null;

    if (!dutyAssignment) {
      return res.json({
        status: "success",
        data: {
          assigned: false,
          date: selectedDate,
          periode_id: periodeId,
          assigned_dates: assignedDatesResult.rows,
          assignment: null,
          schedule_entries: [],
          session_logs: [],
          student_absences: [],
          teacher_absences: [],
          classes: [],
          students: [],
          teachers: [],
        },
      });
    }

    const dayOfWeek = await getIsoDayOfWeek(pool, selectedDate);

    const [
      scheduleResult,
      sessionLogResult,
      studentAbsenceResult,
      teacherAbsenceResult,
      teacherClassAssignmentResult,
    ] =
      await Promise.all([
        pool.query(
          `SELECT
             e.id,
             e.class_id,
             e.teacher_id,
             e.subject_id,
             c.name AS class_name,
             u.full_name AS teacher_name,
             s.name AS subject_name,
             slot_agg.start_time,
             slot_agg.end_time,
             slot_agg.slot_nos
           FROM lms.l_schedule_entry e
           JOIN public.a_class c ON c.id = e.class_id
           JOIN public.u_users u ON u.id = e.teacher_id
           JOIN public.a_subject s ON s.id = e.subject_id
           LEFT JOIN LATERAL (
             SELECT
               MIN(ts.start_time) AS start_time,
               MAX(ts.end_time) AS end_time,
               ARRAY_AGG(ts.slot_no ORDER BY ts.slot_no) AS slot_nos
             FROM lms.l_schedule_entry_slot es
             JOIN lms.l_time_slot ts ON ts.id = es.slot_id
             WHERE es.schedule_entry_id = e.id
           ) slot_agg ON true
           WHERE e.homebase_id = $1
             AND e.periode_id = $2
             AND e.day_of_week = $3
             AND e.status <> 'archived'
           ORDER BY slot_agg.start_time NULLS LAST, c.name ASC, u.full_name ASC`,
          [homebase_id, periodeId, dayOfWeek],
        ),
        pool.query(
          `SELECT
             l.id,
             l.schedule_entry_id,
             ${hasSessionClassColumn ? "l.class_id" : "e.class_id"} AS class_id,
             l.teacher_id,
             l.checkin_at,
             l.checkout_at,
             l.note,
             class_ref.name AS class_name,
             u.full_name AS teacher_name,
             COALESCE(s.name, assign_subject.subject_name) AS subject_name
           FROM lms.l_teacher_session_log l
           JOIN public.u_users u ON u.id = l.teacher_id
           LEFT JOIN lms.l_schedule_entry e ON e.id = l.schedule_entry_id
           LEFT JOIN public.a_class class_ref
             ON class_ref.id = ${hasSessionClassColumn ? "l.class_id" : "e.class_id"}
           LEFT JOIN public.a_subject s ON s.id = e.subject_id
           LEFT JOIN LATERAL (
             SELECT subj.name AS subject_name
             FROM public.at_subject ats
             JOIN public.a_subject subj ON subj.id = ats.subject_id
             WHERE ats.teacher_id = l.teacher_id
               AND ats.class_id = ${hasSessionClassColumn ? "l.class_id" : "e.class_id"}
             ORDER BY subj.name ASC
             LIMIT 1
           ) assign_subject ON true
           WHERE l.duty_assignment_id = $1
             AND l.date = $2::date
           ORDER BY l.checkin_at ASC NULLS LAST, class_ref.name ASC NULLS LAST, u.full_name ASC`,
          [dutyAssignment.id, selectedDate],
        ),
        pool.query(
          `SELECT
             r.id,
             r.target_user_id AS student_id,
             r.class_id,
             r.reason,
             r.follow_up,
             u.full_name AS student_name,
             st.nis,
             c.name AS class_name
           FROM lms.l_daily_absence_report r
           JOIN public.u_users u ON u.id = r.target_user_id
           LEFT JOIN public.u_students st ON st.user_id = r.target_user_id
           LEFT JOIN public.a_class c ON c.id = r.class_id
           WHERE r.homebase_id = $1
             AND r.periode_id = $2
             AND r.date = $3::date
             AND r.reporter_teacher_id = $4
             AND r.target_type = 'student'
           ORDER BY u.full_name ASC`,
          [homebase_id, periodeId, selectedDate, userId],
        ),
        pool.query(
          `SELECT
             r.id,
             r.target_user_id AS teacher_id,
             r.reason,
             r.follow_up,
             u.full_name AS teacher_name
           FROM lms.l_daily_absence_report r
           JOIN public.u_users u ON u.id = r.target_user_id
           WHERE r.homebase_id = $1
             AND r.periode_id = $2
             AND r.date = $3::date
             AND r.reporter_teacher_id = $4
             AND r.target_type = 'teacher'
           ORDER BY u.full_name ASC`,
          [homebase_id, periodeId, selectedDate, userId],
        ),
        pool.query(
          `SELECT DISTINCT
             ats.teacher_id,
             ats.class_id,
             c.name AS class_name,
             s.id AS subject_id,
             s.name AS subject_name,
             u.full_name AS teacher_name
           FROM public.at_subject ats
           JOIN public.a_class c ON c.id = ats.class_id
           JOIN public.a_subject s ON s.id = ats.subject_id
           JOIN public.u_users u ON u.id = ats.teacher_id
           JOIN public.u_teachers t ON t.user_id = ats.teacher_id
           WHERE t.homebase_id = $1
             AND c.homebase_id = $1
             AND s.homebase_id = $1
           ORDER BY u.full_name ASC, c.name ASC, s.name ASC`,
          [homebase_id],
        ),
      ]);

    const classIds = [
      ...new Set(scheduleResult.rows.map((item) => item.class_id).filter(Boolean)),
    ];
    const teacherIds = [
      ...new Set(scheduleResult.rows.map((item) => item.teacher_id).filter(Boolean)),
    ];

    const [studentResult, teacherResult, classResult] = await Promise.all([
      pool.query(
        `SELECT
           u.id AS student_id,
           u.full_name,
           st.nis,
           e.class_id,
           c.name AS class_name
         FROM public.u_class_enrollments e
         JOIN public.u_users u ON u.id = e.student_id
         JOIN public.u_students st ON st.user_id = e.student_id
         JOIN public.a_class c ON c.id = e.class_id
         WHERE e.periode_id = $1
           AND e.homebase_id = $2
         ORDER BY c.name ASC, u.full_name ASC`,
        [periodeId, homebase_id],
      ),
      pool.query(
        `SELECT u.id, u.full_name, t.nip
         FROM public.u_teachers t
         JOIN public.u_users u ON u.id = t.user_id
         WHERE t.homebase_id = $1
         ORDER BY u.full_name ASC`,
        [homebase_id],
      ),
      pool.query(
        `SELECT id, name
         FROM public.a_class
         WHERE homebase_id = $1
         ORDER BY name ASC`,
        [homebase_id],
      ),
    ]);

    return res.json({
      status: "success",
      data: {
        assigned: true,
        date: selectedDate,
        periode_id: periodeId,
        assigned_dates: assignedDatesResult.rows,
        assignment: dutyAssignment,
        schedule_entries: scheduleResult.rows,
        session_logs: sessionLogResult.rows,
        student_absences: studentAbsenceResult.rows,
        teacher_absences: teacherAbsenceResult.rows,
        teacher_class_assignments: teacherClassAssignmentResult.rows,
        classes: classResult.rows,
        students: studentResult.rows,
        teachers: teacherResult.rows,
      },
    });
  }),
);

router.post(
  "/duty/teacher/report",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const selectedDate = normalizeDate(req.body?.date);
    const requestedPeriodeId = toInt(req.body?.periode_id, null);
    const dutyAssignmentId = toInt(req.body?.duty_assignment_id, null);
    const dailyNote = String(req.body?.daily_note || "").trim();
    const studentAbsences = Array.isArray(req.body?.student_absences)
      ? req.body.student_absences
      : [];
    const teacherAbsences = Array.isArray(req.body?.teacher_absences)
      ? req.body.teacher_absences
      : [];
    const teacherSessions = Array.isArray(req.body?.teacher_sessions)
      ? req.body.teacher_sessions
      : [];

    if (!selectedDate || !dutyAssignmentId) {
      return res.status(400).json({
        status: "error",
        message: "date dan duty_assignment_id wajib diisi.",
      });
    }

    const periodeId = await ensureActivePeriode(client, homebase_id, requestedPeriodeId);
    if (!periodeId) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const assignmentResult = await client.query(
      `SELECT *
       FROM lms.l_duty_assignment
       WHERE id = $1
         AND homebase_id = $2
         AND periode_id = $3
         AND duty_teacher_id = $4
         AND date = $5::date
         AND status <> 'cancelled'
       LIMIT 1`,
      [dutyAssignmentId, homebase_id, periodeId, userId, selectedDate],
    );

    if (assignmentResult.rowCount === 0) {
      return res.status(403).json({
        status: "error",
        message: "Penugasan piket tidak ditemukan untuk guru ini.",
      });
    }

    const assignment = assignmentResult.rows[0];
    const dayOfWeek = await getIsoDayOfWeek(client, selectedDate);
    const canWriteReportNote = await hasDutyReportNoteColumn(client);
    const hasSessionClassColumn = await hasTeacherSessionClassColumn(client);

    if (canWriteReportNote) {
      await client.query(
        `UPDATE lms.l_duty_assignment
         SET report_note = $2,
             status = 'done',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [assignment.id, dailyNote || null],
      );
    } else {
      await client.query(
        `UPDATE lms.l_duty_assignment
         SET status = 'done',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $1`,
        [assignment.id],
      );
    }

    await client.query(
      `DELETE FROM lms.l_teacher_session_log
       WHERE duty_assignment_id = $1
         AND date = $2::date`,
      [assignment.id, selectedDate],
    );

    await client.query(
      `DELETE FROM lms.l_daily_absence_report
       WHERE homebase_id = $1
         AND periode_id = $2
         AND date = $3::date
         AND reporter_teacher_id = $4`,
      [homebase_id, periodeId, selectedDate, userId],
    );

    for (const entry of studentAbsences) {
      const studentId = toInt(entry?.student_id, null);
      const classId = toInt(entry?.class_id, null);
      const reason = String(entry?.reason || "").trim();
      const followUp = String(entry?.follow_up || "").trim();

      if (!studentId || !classId || !reason) {
        continue;
      }

      const studentCheck = await client.query(
        `SELECT 1
         FROM public.u_class_enrollments
         WHERE periode_id = $1
           AND class_id = $2
           AND student_id = $3
         LIMIT 1`,
        [periodeId, classId, studentId],
      );
      if (studentCheck.rowCount === 0) {
        continue;
      }

      await client.query(
        `INSERT INTO lms.l_daily_absence_report (
           homebase_id,
           periode_id,
           date,
           reporter_teacher_id,
           target_type,
           target_user_id,
           class_id,
           reason,
           follow_up,
           status
         )
         VALUES ($1, $2, $3::date, $4, 'student', $5, $6, $7, $8, 'open')`,
        [
          homebase_id,
          periodeId,
          selectedDate,
          userId,
          studentId,
          classId,
          reason,
          followUp || null,
        ],
      );
    }

    for (const entry of teacherAbsences) {
      const teacherId = toInt(entry?.teacher_id, null);
      const reason = String(entry?.reason || "").trim();
      const followUp = String(entry?.follow_up || "").trim();

      if (!teacherId || !reason) {
        continue;
      }

      const teacherCheck = await client.query(
        `SELECT 1
         FROM public.u_teachers
         WHERE user_id = $1
           AND homebase_id = $2
         LIMIT 1`,
        [teacherId, homebase_id],
      );
      if (teacherCheck.rowCount === 0) {
        continue;
      }

      await client.query(
        `INSERT INTO lms.l_daily_absence_report (
           homebase_id,
           periode_id,
           date,
           reporter_teacher_id,
           target_type,
           target_user_id,
           reason,
           follow_up,
           status
         )
         VALUES ($1, $2, $3::date, $4, 'teacher', $5, $6, $7, 'open')`,
        [
          homebase_id,
          periodeId,
          selectedDate,
          userId,
          teacherId,
          reason,
          followUp || null,
        ],
      );
    }

    for (const entry of teacherSessions) {
      const scheduleEntryId = toInt(entry?.schedule_entry_id, null);
      const classId = toInt(entry?.class_id, null);
      const teacherId = toInt(entry?.teacher_id, null);
      const checkinAt = normalizeTime(entry?.checkin_time);
      const checkoutAt = normalizeTime(entry?.checkout_time);
      const note = String(entry?.note || "").trim();

      if (!classId || !teacherId) {
        continue;
      }

      if (!checkinAt && !checkoutAt && !note) {
        continue;
      }

      const classAssignmentCheck = await client.query(
        `SELECT 1
         FROM public.at_subject ats
         JOIN public.u_teachers t ON t.user_id = ats.teacher_id
         JOIN public.a_class c ON c.id = ats.class_id
         WHERE ats.teacher_id = $1
           AND ats.class_id = $2
           AND t.homebase_id = $3
           AND c.homebase_id = $3
         LIMIT 1`,
        [teacherId, classId, homebase_id],
      );
      if (classAssignmentCheck.rowCount === 0) {
        continue;
      }

      let resolvedScheduleEntryId = scheduleEntryId;

      if (!resolvedScheduleEntryId) {
        const sameDayScheduleResult = await client.query(
          `SELECT id
           FROM lms.l_schedule_entry
           WHERE homebase_id = $1
             AND periode_id = $2
             AND day_of_week = $3
             AND teacher_id = $4
             AND class_id = $5
           ORDER BY id ASC
           LIMIT 1`,
          [homebase_id, periodeId, dayOfWeek, teacherId, classId],
        );

        resolvedScheduleEntryId = sameDayScheduleResult.rows[0]?.id || null;
      }

      if (!resolvedScheduleEntryId) {
        const anyScheduleResult = await client.query(
          `SELECT id
           FROM lms.l_schedule_entry
           WHERE homebase_id = $1
             AND periode_id = $2
             AND teacher_id = $3
             AND class_id = $4
           ORDER BY day_of_week ASC, id ASC
           LIMIT 1`,
          [homebase_id, periodeId, teacherId, classId],
        );

        resolvedScheduleEntryId = anyScheduleResult.rows[0]?.id || null;
      }

      if (!hasSessionClassColumn && !resolvedScheduleEntryId) {
        resolvedScheduleEntryId = await ensureSessionScheduleEntry({
          executor: client,
          homebaseId: homebase_id,
          periodeId,
          dayOfWeek,
          classId,
          teacherId,
          createdBy: userId,
        });
      }

      if (!hasSessionClassColumn && !resolvedScheduleEntryId) {
        return res.status(400).json({
          status: "error",
          message:
            "Catatan guru masuk kelas belum bisa disimpan karena data teaching load atau slot waktu untuk kelas tersebut belum tersedia.",
        });
      }

      if (hasSessionClassColumn) {
        await client.query(
          `INSERT INTO lms.l_teacher_session_log (
             schedule_entry_id,
             class_id,
             date,
             teacher_id,
             duty_assignment_id,
             checkin_at,
             checkout_at,
             checkin_by,
             checkout_by,
             note
           )
           VALUES (
             $1,
             $2,
             $3::date,
             $4,
             $5,
             $6::timestamp,
             $7::timestamp,
             $8,
             $9,
             $10
           )`,
          [
            resolvedScheduleEntryId,
            classId,
            selectedDate,
            teacherId,
            assignment.id,
            checkinAt ? `${selectedDate} ${checkinAt}` : null,
            checkoutAt ? `${selectedDate} ${checkoutAt}` : null,
            checkinAt ? userId : null,
            checkoutAt ? userId : null,
            note || null,
          ],
        );
      } else {
        await client.query(
          `INSERT INTO lms.l_teacher_session_log (
             schedule_entry_id,
             date,
             teacher_id,
             duty_assignment_id,
             checkin_at,
             checkout_at,
             checkin_by,
             checkout_by,
             note
           )
           VALUES (
             $1,
             $2::date,
             $3,
             $4,
             $5::timestamp,
             $6::timestamp,
             $7,
             $8,
             $9
           )`,
          [
            resolvedScheduleEntryId,
            selectedDate,
            teacherId,
            assignment.id,
            checkinAt ? `${selectedDate} ${checkinAt}` : null,
            checkoutAt ? `${selectedDate} ${checkoutAt}` : null,
            checkinAt ? userId : null,
            checkoutAt ? userId : null,
            note || null,
          ],
        );
      }
    }

    return res.json({
      status: "success",
      message: "Laporan piket harian berhasil disimpan.",
    });
  }),
);

export default router;
