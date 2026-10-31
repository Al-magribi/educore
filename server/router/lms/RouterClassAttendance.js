import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  jakartaLocalToDate,
  reconcilePendingScanLogs,
  resolveScanPolicyDayRule,
  toJakartaDateString,
} from "../../services/attendance/rfidDailyAttendance.js";
import { deleteDailyAttendanceCascade } from "../../services/attendance/attendanceReportDelete.js";
import {
  ensureClassAttendanceOfficerTable,
  resolveClassAttendanceAccess,
} from "../../services/attendance/classAttendanceAccess.js";
import {
  GATE_LINKED_SCAN_EXISTS_SQL,
  STUDENT_REPORT_ROW_VISIBLE_SQL,
  recalculateDailyAttendanceFields,
  toJakartaTimestampSql,
  updateDailyAttendanceRecord,
} from "./RouterAttendance.js";

const router = Router();

ensureClassAttendanceOfficerTable().catch((error) => {
  console.error("[class-attendance] gagal menyiapkan tabel petugas", error);
});

const CLASS_RECORD_STATUSES = new Set([
  "present",
  "late",
  "absent",
  "excused",
  "incomplete",
  "insufficient_hours",
  "pending",
]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^\d{2}:\d{2}(:\d{2})?$/;

const sendError = (res, status, message) =>
  res.status(status).json({ status: "error", message });

const isValidDate = (value) =>
  DATE_PATTERN.test(String(value || "")) &&
  !Number.isNaN(new Date(`${value}T00:00:00+07:00`).getTime());

const loadAccess = async (executor, req, res) => {
  const access = await resolveClassAttendanceAccess(executor, req.user);
  if (!access) {
    sendError(
      res,
      403,
      "Presensi kelas hanya tersedia untuk wali kelas dan petugas presensi.",
    );
    return null;
  }
  return access;
};

/** Petugas tidak boleh mengubah presensinya sendiri. */
const isOwnRecord = (access, req, userId) =>
  access.role === "officer" && Number(userId) === Number(req.user.id);

/** Menghapus baris hasil tap ikut menghapus log mesin, jadi hanya wali kelas yang boleh. */
const canDeleteRecord = (access, req, row) =>
  !isOwnRecord(access, req, row.user_id) &&
  (access.role === "homeroom" || !row.has_machine_tap);

const parseTimes = (res, attendanceDate, body) => {
  const parseOne = (key) => {
    if (!Object.prototype.hasOwnProperty.call(body, key)) return undefined;
    const value = body[key];
    if (value === null || value === "") return null;
    if (!TIME_PATTERN.test(String(value))) return false;
    return jakartaLocalToDate(attendanceDate, String(value));
  };

  const checkinAt = parseOne("checkin_time");
  const checkoutAt = parseOne("checkout_time");
  if (checkinAt === false || checkoutAt === false) {
    sendError(res, 400, "Format jam tidak valid.");
    return null;
  }
  return { checkinAt, checkoutAt };
};

const validateStatus = (res, status) => {
  if (CLASS_RECORD_STATUSES.has(String(status || ""))) return true;
  sendError(res, 400, "Status presensi tidak valid.");
  return false;
};

const findClassRecord = async (client, classInfo, recordId) => {
  const result = await client.query(
    `SELECT
       da.id,
       da.user_id,
       TO_CHAR(da.attendance_date, 'YYYY-MM-DD') AS attendance_date,
       ${GATE_LINKED_SCAN_EXISTS_SQL} AS has_machine_tap
     FROM attendance.daily_attendance da
     JOIN public.u_students st ON st.user_id = da.user_id
     WHERE da.id = $1
       AND da.homebase_id = $2
       AND da.target_role = 'student'
       AND st.current_class_id = $3
     LIMIT 1`,
    [recordId, classInfo.homebase_id, classInfo.id],
  );
  return result.rows[0] || null;
};

router.get(
  "/attendance/class/workspace",
  authorize("teacher", "student"),
  withQuery(async (req, res, pool) => {
    const access = await loadAccess(pool, req, res);
    if (!access) return;

    const { classInfo, role } = access;
    const students = await pool.query(
      `SELECT
         u.id AS user_id,
         u.full_name,
         st.nis,
         (o.student_id IS NOT NULL) AS is_officer
       FROM public.u_students st
       JOIN public.u_users u ON u.id = st.user_id
       LEFT JOIN attendance.class_attendance_officer o
         ON o.student_id = st.user_id
        AND o.class_id = st.current_class_id
       WHERE st.current_class_id = $1
         AND u.is_active = true
       ORDER BY lower(u.full_name) ASC`,
      [classInfo.id],
    );

    return res.json({
      status: "success",
      data: {
        class: {
          id: classInfo.id,
          name: classInfo.name,
          grade_name: classInfo.grade_name,
        },
        access: {
          role,
          can_export: role === "homeroom",
          can_assign: role === "homeroom",
        },
        students: students.rows,
      },
    });
  }),
);

router.get(
  "/attendance/class/records",
  authorize("teacher", "student"),
  withQuery(async (req, res, pool) => {
    const access = await loadAccess(pool, req, res);
    if (!access) return;

    const startDate = String(req.query?.start_date || "").trim();
    const endDate = String(req.query?.end_date || "").trim();
    if (!isValidDate(startDate) || !isValidDate(endDate)) {
      return sendError(res, 400, "Rentang tanggal tidak valid.");
    }

    const { classInfo } = access;
    await reconcilePendingScanLogs(pool, {
      homebaseId: classInfo.homebase_id,
      startDate,
      endDate,
    });

    const result = await pool.query(
      `SELECT
         da.id,
         TO_CHAR(da.attendance_date, 'YYYY-MM-DD') AS attendance_date,
         da.attendance_status,
         ${toJakartaTimestampSql("da.checkin_at")} AS checkin_at,
         ${toJakartaTimestampSql("da.checkout_at")} AS checkout_at,
         da.late_minutes,
         da.presence_minutes,
         da.notes,
         u.id AS user_id,
         u.full_name,
         st.nis,
         ${GATE_LINKED_SCAN_EXISTS_SQL} AS has_machine_tap
       FROM attendance.daily_attendance da
       JOIN public.u_users u ON u.id = da.user_id
       JOIN public.u_students st ON st.user_id = da.user_id
       WHERE da.homebase_id = $1
         AND da.target_role = 'student'
         AND st.current_class_id = $2
         AND da.attendance_date BETWEEN $3::date AND $4::date
         AND ${STUDENT_REPORT_ROW_VISIBLE_SQL}
       ORDER BY da.attendance_date DESC, lower(u.full_name) ASC`,
      [classInfo.homebase_id, classInfo.id, startDate, endDate],
    );

    return res.json({
      status: "success",
      data: result.rows.map((row) => ({
        ...row,
        can_edit: !isOwnRecord(access, req, row.user_id),
        can_delete: canDeleteRecord(access, req, row),
      })),
    });
  }),
);

router.post(
  "/attendance/class/records",
  authorize("teacher", "student"),
  withTransaction(async (req, res, client) => {
    const access = await loadAccess(client, req, res);
    if (!access) return;

    const { classInfo } = access;
    const payload = req.body || {};
    const studentId = Number(payload.user_id);
    const attendanceDate = String(payload.attendance_date || "").trim();

    if (!Number.isInteger(studentId) || studentId <= 0) {
      return sendError(res, 400, "Siswa wajib dipilih.");
    }
    if (!isValidDate(attendanceDate)) {
      return sendError(res, 400, "Tanggal presensi tidak valid.");
    }
    if (attendanceDate > toJakartaDateString(new Date())) {
      return sendError(res, 400, "Presensi tidak boleh diisi untuk tanggal mendatang.");
    }
    if (isOwnRecord(access, req, studentId)) {
      return sendError(res, 403, "Petugas tidak dapat mengisi presensinya sendiri.");
    }
    if (!validateStatus(res, payload.attendance_status)) return;

    const times = parseTimes(res, attendanceDate, payload);
    if (!times) return;
    const checkinAt = times.checkinAt || null;
    const checkoutAt = times.checkoutAt || null;
    if (checkinAt && checkoutAt && checkoutAt.getTime() < checkinAt.getTime()) {
      return sendError(res, 400, "Jam pulang tidak boleh lebih awal dari jam datang.");
    }

    const studentRes = await client.query(
      `SELECT current_periode_id
       FROM public.u_students
       WHERE user_id = $1
         AND current_class_id = $2
       LIMIT 1`,
      [studentId, classInfo.id],
    );
    if (studentRes.rowCount === 0) {
      return sendError(res, 400, "Siswa tidak terdaftar di kelas ini.");
    }

    const dayRule = await resolveScanPolicyDayRule(client, {
      homebaseId: classInfo.homebase_id,
      userId: studentId,
      scannedAt:
        checkinAt || checkoutAt || jakartaLocalToDate(attendanceDate, "12:00"),
    });
    const { lateMinutes, presenceMinutes } = recalculateDailyAttendanceFields({
      checkinAt,
      checkoutAt,
      dayRule,
    });

    const inserted = await client.query(
      `INSERT INTO attendance.daily_attendance (
         homebase_id,
         periode_id,
         user_id,
         attendance_date,
         target_role,
         requirement_source,
         checkin_at,
         checkout_at,
         attendance_status,
         late_minutes,
         presence_minutes,
         minimum_required_minutes,
         notes,
         evaluated_at,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4::date, 'student', 'manual',
         $5::timestamptz, $6::timestamptz, $7, $8, $9, $10, $11, NOW(), NOW()
       )
       ON CONFLICT (user_id, attendance_date) DO NOTHING
       RETURNING id`,
      [
        classInfo.homebase_id,
        studentRes.rows[0].current_periode_id,
        studentId,
        attendanceDate,
        checkinAt ? checkinAt.toISOString() : null,
        checkoutAt ? checkoutAt.toISOString() : null,
        payload.attendance_status,
        lateMinutes,
        presenceMinutes,
        dayRule?.min_presence_minutes ?? null,
        String(payload.notes || "").trim() || null,
      ],
    );
    if (inserted.rowCount === 0) {
      return sendError(
        res,
        409,
        "Presensi siswa pada tanggal ini sudah ada. Silakan edit datanya.",
      );
    }

    return res.status(201).json({
      status: "success",
      message: "Data presensi berhasil ditambahkan.",
      data: { id: inserted.rows[0].id },
    });
  }),
);

router.put(
  "/attendance/class/records/:id",
  authorize("teacher", "student"),
  withTransaction(async (req, res, client) => {
    const access = await loadAccess(client, req, res);
    if (!access) return;

    const recordId = Number(req.params?.id);
    if (!Number.isInteger(recordId) || recordId <= 0) {
      return sendError(res, 400, "ID presensi tidak valid.");
    }

    const { classInfo } = access;
    const record = await findClassRecord(client, classInfo, recordId);
    if (!record) {
      return sendError(res, 404, "Data presensi tidak ditemukan di kelas ini.");
    }
    if (isOwnRecord(access, req, record.user_id)) {
      return sendError(res, 403, "Petugas tidak dapat mengubah presensinya sendiri.");
    }

    const body = req.body || {};
    if (!validateStatus(res, body.attendance_status)) return;

    const times = parseTimes(res, record.attendance_date, body);
    if (!times) return;

    const payload = { attendance_status: body.attendance_status };
    if (times.checkinAt !== undefined) {
      payload.checkin_at = times.checkinAt ? times.checkinAt.toISOString() : null;
    }
    if (times.checkoutAt !== undefined) {
      payload.checkout_at = times.checkoutAt ? times.checkoutAt.toISOString() : null;
    }
    if (Object.prototype.hasOwnProperty.call(body, "notes")) {
      payload.notes = body.notes;
    }

    return updateDailyAttendanceRecord(client, res, {
      homebase_id: classInfo.homebase_id,
      recordId,
      payload,
      requirementSource: "manual",
    });
  }),
);

router.delete(
  "/attendance/class/records/:id",
  authorize("teacher", "student"),
  withTransaction(async (req, res, client) => {
    const access = await loadAccess(client, req, res);
    if (!access) return;

    const recordId = Number(req.params?.id);
    if (!Number.isInteger(recordId) || recordId <= 0) {
      return sendError(res, 400, "ID presensi tidak valid.");
    }

    const { classInfo } = access;
    const record = await findClassRecord(client, classInfo, recordId);
    if (!record) {
      return sendError(res, 404, "Data presensi tidak ditemukan di kelas ini.");
    }
    if (!canDeleteRecord(access, req, record)) {
      return sendError(
        res,
        403,
        "Petugas tidak dapat menghapus presensi sendiri atau hasil tap mesin.",
      );
    }

    await deleteDailyAttendanceCascade(client, {
      homebaseId: classInfo.homebase_id,
      attendanceId: recordId,
    });

    return res.json({
      status: "success",
      message: "Data presensi berhasil dihapus.",
    });
  }),
);

router.put(
  "/attendance/class/officers",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const access = await loadAccess(client, req, res);
    if (!access) return;

    const { classInfo } = access;
    const rawIds = Array.isArray(req.body?.student_ids) ? req.body.student_ids : [];
    const studentIds = [...new Set(rawIds.map(Number))].filter(
      (id) => Number.isInteger(id) && id > 0,
    );

    const validRes = await client.query(
      `SELECT user_id
       FROM public.u_students
       WHERE current_class_id = $1
         AND user_id = ANY($2::int[])`,
      [classInfo.id, studentIds],
    );
    if (validRes.rowCount !== studentIds.length) {
      return sendError(res, 400, "Ada siswa yang tidak terdaftar di kelas ini.");
    }

    await client.query(
      `DELETE FROM attendance.class_attendance_officer
       WHERE class_id = $1
         AND NOT (student_id = ANY($2::int[]))`,
      [classInfo.id, studentIds],
    );
    await client.query(
      `INSERT INTO attendance.class_attendance_officer (
         class_id, student_id, homebase_id, assigned_by
       )
       SELECT $1, student_id, $2, $3
       FROM unnest($4::int[]) AS student_id
       ON CONFLICT (class_id, student_id) DO NOTHING`,
      [classInfo.id, classInfo.homebase_id, req.user.id, studentIds],
    );

    return res.json({
      status: "success",
      message: "Petugas presensi berhasil disimpan.",
    });
  }),
);

export default router;
