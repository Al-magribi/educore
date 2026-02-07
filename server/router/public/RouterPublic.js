import { Router } from "express";
import { withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// ==========================================
// 1. GET LIST GRADE (Read)
// ==========================================
router.get(
  "/get-grades",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const homebase_id = req.user.homebase_id;

    // Urutkan berdasarkan nama agar rapi
    const result = await pool.query(
      `SELECT * FROM a_grade WHERE homebase_id = $1 ORDER BY name ASC`,
      [homebase_id],
    );
    res.json(result.rows);
  }),
);

// ==========================================
// 2. GET LIST CLASS (Read)
// ==========================================
router.get(
  "/get-classes",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const homebase_id = req.user.homebase_id;
    const { gradeId } = req.query;

    if (gradeId) {
      // PERBAIKAN: Filter berdasarkan grade_id, bukan id kelas
      const result = await pool.query(
        `SELECT * FROM a_class WHERE homebase_id = $1 AND grade_id = $2 ORDER BY name ASC`,
        [homebase_id, gradeId],
      );
      res.json(result.rows);
    } else {
      const result = await pool.query(
        `SELECT * FROM a_class WHERE homebase_id = $1 ORDER BY name ASC`,
        [homebase_id],
      );
      res.json(result.rows);
    }
  }),
);

// ==========================================
// 3. GET LIST SUBJECTS (Read)
// ==========================================
router.get(
  "/get-subject",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const homebase_id = req.user.homebase_id;
    const result = await pool.query(
      `SELECT * FROM a_subject WHERE homebase_id = $1`,
      [homebase_id],
    );
    res.json(result.rows);
  }),
);

// ==========================================
// 3. GET LIST MAJORS (Read)
// ==========================================
router.get(
  "/get-majors",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const homebase_id = req.user.homebase_id;
    const result = await pool.query(
      `SELECT * FROM a_major WHERE homebase_id = $1`,
      [homebase_id],
    );
    res.json(result.rows);
  }),
);

// ==========================================
// 3. GET LIST PERIODE (Read)
// ==========================================
router.get(
  "/get-periodes",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const homebase_id = req.user.homebase_id;
    const result = await pool.query(
      `SELECT * FROM a_periode WHERE homebase_id = $1`,
      [homebase_id],
    );
    res.json(result.rows);
  }),
);

export default router;
