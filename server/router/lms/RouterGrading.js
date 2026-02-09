import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const normalizeScore = (value) => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return 0;
  return Math.round(numberValue);
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
// GET Grading Meta (Homebase  Active Periode)
// ==========================================
router.get(
  "/grading/meta",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;

    if (!homebase_id) {
      return res.status(400).json({
        status: "error",
        message: "Homebase guru tidak ditemukan.",
      });
    }

    const homebaseResult = await pool.query(
      `SELECT id, name, level
       FROM a_homebase
       WHERE id = $1
       LIMIT 1`,
      [homebase_id],
    );

    const activePeriode = await ensureActivePeriode(pool, homebase_id);

    return res.json({
      status: "success",
      data: {
        homebase: homebaseResult.rows[0] || null,
        activePeriode,
      },
    });
  }),
);

// ==========================================
// GET Classes for Grading (Role-based)
// ==========================================
router.get(
  "/grading/classes",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id } = req.query;

    if (!subject_id) {
      return res.status(400).json({
        status: "error",
        message: "subject_id wajib diisi.",
      });
    }

    if (role === "teacher") {
      const result = await pool.query(
        `SELECT DISTINCT cl.id, cl.name, cl.grade_id
         FROM at_subject ats
         JOIN a_class cl ON ats.class_id = cl.id
         WHERE ats.teacher_id = $1
           AND ats.subject_id = $2
           AND cl.homebase_id = $3
         ORDER BY cl.name ASC`,
        [userId, subject_id, homebase_id],
      );
      return res.json({ status: "success", data: result.rows });
    }

    const result = await pool.query(
      `SELECT DISTINCT cl.id, cl.name, cl.grade_id
       FROM at_subject ats
       JOIN a_class cl ON ats.class_id = cl.id
       WHERE ats.subject_id = $1
         AND cl.homebase_id = $2
       ORDER BY cl.name ASC`,
      [subject_id, homebase_id],
    );
    return res.json({ status: "success", data: result.rows });
  }),
);

// ==========================================
// GET Students for Grading (Role-based)
// ==========================================
router.get(
  "/grading/students",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id } = req.query;

    if (!subject_id || !class_id) {
      return res.status(400).json({
        status: "error",
        message: "subject_id dan class_id wajib diisi.",
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

    const classResult = await pool.query(
      `SELECT id, name
       FROM a_class
       WHERE id = $1
       LIMIT 1`,
      [class_id],
    );

    const studentResult = await pool.query(
      `SELECT
         u.id AS student_id,
         u.full_name,
         u.gender,
         st.nis,
         st.nisn,
         c.id AS class_id,
         c.name AS class_name
       FROM u_class_enrollments e
       JOIN u_users u ON e.student_id = u.id
       JOIN u_students st ON e.student_id = st.user_id
       JOIN a_class c ON e.class_id = c.id
       WHERE e.class_id = $1
         AND e.periode_id = $2
       ORDER BY u.full_name ASC`,
      [class_id, activePeriode.id],
    );

    return res.json({
      status: "success",
      data: {
        meta: {
          class_id: parseInt(class_id, 10),
          class_name: classResult.rows[0]?.name || "-",
          periode_id: activePeriode.id,
          periode_name: activePeriode.name,
          total_students: studentResult.rows.length,
        },
        students: studentResult.rows,
      },
    });
  }),
);

// ==========================================
// GET Attitude Scores (Role-based)
// ==========================================
router.get(
  "/grading/attitude",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, month } = req.query;

    if (!subject_id || !class_id || !month) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan month wajib diisi.",
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

    const studentResult = await pool.query(
      `SELECT
         u.id AS student_id,
         u.full_name,
         st.nis,
         a.month,
         a.kinerja,
         a.kedisiplinan,
         a.keaktifan,
         a.percaya_diri,
         a.teacher_note,
         a.average_score
       FROM u_class_enrollments e
       JOIN u_users u ON e.student_id = u.id
       JOIN u_students st ON e.student_id = st.user_id
       LEFT JOIN l_score_attitude a
         ON a.student_id = e.student_id
        AND a.subject_id = $1
        AND a.periode_id = $3
        AND a.month = $4
       WHERE e.class_id = $2
         AND e.periode_id = $3
       ORDER BY u.full_name ASC`,
      [subject_id, class_id, activePeriode.id, month],
    );

    return res.json({
      status: "success",
      data: {
        periode_id: activePeriode.id,
        periode_name: activePeriode.name,
        month,
        students: studentResult.rows,
      },
    });
  }),
);

// ==========================================
// SUBMIT Attitude Scores (Role-based)
// ==========================================
router.post(
  "/grading/attitude/submit",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, month, items } = req.body;

    if (!subject_id || !class_id || !month) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan month wajib diisi.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Data sikap siswa belum ada.",
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

    const activePeriode = await ensureActivePeriode(client, homebase_id);
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const studentIds = items.map((item) => item.student_id).filter(Boolean);
    if (studentIds.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "student_id wajib diisi.",
      });
    }

    await client.query(
      `DELETE FROM l_score_attitude
       WHERE subject_id = $1
         AND periode_id = $2
         AND month = $3
         AND student_id = ANY($4::int[])`,
      [subject_id, activePeriode.id, month, studentIds],
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO l_score_attitude (
           student_id,
           subject_id,
           periode_id,
           month,
           kinerja,
           kedisiplinan,
           keaktifan,
           percaya_diri,
           teacher_note
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
         item.student_id,
         subject_id,
         activePeriode.id,
         month,
          normalizeScore(item.kinerja),
          normalizeScore(item.kedisiplinan),
          normalizeScore(item.keaktifan),
          normalizeScore(item.percaya_diri),
         item.teacher_note || null,
        ],
      );
    }

    return res.json({
      status: "success",
      message: "Nilai sikap berhasil disimpan.",
    });
  }),
);

export default router;
