import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const ALLOWED_STATUSES = new Set([
  "Hadir",
  "Telat",
  "Sakit",
  "Izin",
  "Alpa",
  "Alpha",
]);

const normalizeStatus = (status) => {
  if (!status) return null;
  const lower = String(status).toLowerCase();
  if (lower === "alpha") return "Alpa";
  if (lower === "alpa") return "Alpa";
  if (lower === "telat") return "Telat";
  if (lower === "hadir") return "Hadir";
  if (lower === "sakit") return "Sakit";
  if (lower === "izin") return "Izin";
  return status;
};

const ensureActivePeriode = async (pool, homebaseId) => {
  const periodeResult = await pool.query(
    `SELECT id, name 
     FROM a_periode 
     WHERE homebase_id = $1 AND is_active = true 
     ORDER BY id DESC 
     LIMIT 1`,
    [homebaseId],
  );
  return periodeResult.rows[0] || null;
};

// ==========================================
// GET Attendance Students (Role-based)
// ==========================================
router.get(
  "/attendance/students",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, date } = req.query;

    if (!subject_id || !class_id || !date) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan date wajib diisi.",
      });
    }

    if (role === "teacher") {
      const accessCheck = await pool.query(
        `SELECT 1
         FROM at_subject
         WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3
         LIMIT 1`,
        [userId, subject_id, class_id],
      );
      if (accessCheck.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const accessCheck = await pool.query(
        `SELECT 1
         FROM a_subject s
         JOIN a_class c ON c.id = $2
         WHERE s.id = $1 AND s.homebase_id = $3 AND c.homebase_id = $3
         LIMIT 1`,
        [subject_id, class_id, homebase_id],
      );
      if (accessCheck.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    }

    const activePeriode = await ensureActivePeriode(pool, homebase_id);
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const metaResult = await pool.query(
      `SELECT s.name AS subject_name, c.name AS class_name
       FROM a_subject s
       JOIN a_class c ON c.id = $2
       WHERE s.id = $1
       LIMIT 1`,
      [subject_id, class_id],
    );

    const studentResult = await pool.query(
      `SELECT
         u.id AS student_id,
         u.full_name,
         u.gender,
         st.nis,
         st.nisn,
         c.id AS class_id,
         c.name AS class_name,
         a.id AS attendance_id,
         a.status,
         a.date
       FROM u_class_enrollments e
       JOIN u_users u ON e.student_id = u.id
       JOIN u_students st ON e.student_id = st.user_id
       JOIN a_class c ON e.class_id = c.id
       LEFT JOIN l_attendance a
         ON a.student_id = e.student_id
        AND a.class_id = e.class_id
        AND a.subject_id = $1
        AND a.date = $2::date
       WHERE e.class_id = $3
         AND e.periode_id = $4
       ORDER BY u.full_name ASC`,
      [subject_id, date, class_id, activePeriode.id],
    );

    const students = studentResult.rows.map((row) => ({
      ...row,
      status: normalizeStatus(row.status),
    }));

    return res.json({
      status: "success",
      data: {
        meta: {
          subject_id: parseInt(subject_id, 10),
          subject_name: metaResult.rows[0]?.subject_name || "-",
          class_id: parseInt(class_id, 10),
          class_name: metaResult.rows[0]?.class_name || "-",
          date,
          periode_id: activePeriode.id,
          periode_name: activePeriode.name,
          total_students: students.length,
        },
        students,
      },
    });
  }),
);

// ==========================================
// SUBMIT Attendance (Role-based)
// ==========================================
router.post(
  "/attendance/submit",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, date, teacher_id, items } = req.body;

    if (!subject_id || !class_id || !date) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan date wajib diisi.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Data absensi siswa belum ada.",
      });
    }
    const effectiveTeacherId =
      role === "teacher" ? userId : Number(teacher_id || 0) || null;
    if (!effectiveTeacherId) {
      return res.status(400).json({
        status: "error",
        message: "teacher_id wajib diisi.",
      });
    }

    if (role === "teacher") {
      const accessCheck = await client.query(
        `SELECT 1
         FROM at_subject
         WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3
         LIMIT 1`,
        [userId, subject_id, class_id],
      );
      if (accessCheck.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const accessCheck = await client.query(
        `SELECT 1
         FROM a_subject s
         JOIN a_class c ON c.id = $2
         WHERE s.id = $1 AND s.homebase_id = $3 AND c.homebase_id = $3
         LIMIT 1`,
        [subject_id, class_id, homebase_id],
      );
      if (accessCheck.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    }

    await client.query(
      `DELETE FROM l_attendance
       WHERE class_id = $1 AND subject_id = $2 AND date = $3::date`,
      [class_id, subject_id, date],
    );

    for (const item of items) {
      const status = normalizeStatus(item.status);
      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({
          status: "error",
          message: `Status tidak valid: ${item.status}`,
        });
      }

      await client.query(
        `INSERT INTO l_attendance (
           class_id,
           subject_id,
           student_id,
           date,
           status,
           teacher_id
         )
         VALUES ($1, $2, $3, $4::date, $5, $6)`,
        [
          class_id,
          subject_id,
          item.student_id,
          date,
          status,
          effectiveTeacherId,
        ],
      );
    }

    return res.json({
      status: "success",
      message: "Absensi berhasil disimpan.",
    });
  }),
);

export default router;
