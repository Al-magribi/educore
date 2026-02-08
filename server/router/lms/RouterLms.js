import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// ==========================================
// GET Subjects for LMS (Role-based)
// ==========================================
router.get(
  "/subjects",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;

    // Guru: hanya mapel yang diampu
    if (role === "teacher") {
      const sql = `
        SELECT
          s.id,
          s.name,
          s.code,
          s.kkm,
          s.branch_id,
          b.name AS branch_name,
          c.name AS category_name,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT cl.name), NULL) AS class_names
        FROM at_subject ats
        JOIN a_subject s ON ats.subject_id = s.id
        LEFT JOIN a_class cl ON ats.class_id = cl.id
        LEFT JOIN a_subject_branch b ON s.branch_id = b.id
        LEFT JOIN a_subject_category c ON b.category_id = c.id
        WHERE ats.teacher_id = $1 AND s.homebase_id = $2
        GROUP BY s.id, s.name, s.code, s.kkm, s.branch_id, b.name, c.name
        ORDER BY s.name ASC
      `;
      const result = await pool.query(sql, [userId, homebase_id]);
      return res.json({ status: "success", data: result.rows });
    }

    // Admin Satuan: semua mapel di homebase
    const sql = `
      SELECT
        s.id,
        s.name,
        s.code,
        s.kkm,
        s.branch_id,
        b.name AS branch_name,
        c.name AS category_name
      FROM a_subject s
      LEFT JOIN a_subject_branch b ON s.branch_id = b.id
      LEFT JOIN a_subject_category c ON b.category_id = c.id
      WHERE s.homebase_id = $1
      ORDER BY s.name ASC
    `;
    const result = await pool.query(sql, [homebase_id]);
    return res.json({ status: "success", data: result.rows });
  }),
);

// ==========================================
// GET Grades (Role-based)
// ==========================================
router.get(
  "/grades",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id } = req.query;

    if (role === "teacher") {
      const sql = `
        SELECT DISTINCT g.id, g.name
        FROM a_grade g
        JOIN a_class cl ON cl.grade_id = g.id
        JOIN at_subject ats ON ats.class_id = cl.id
        WHERE ats.teacher_id = $1
          AND ats.subject_id = $2
          AND cl.homebase_id = $3
        ORDER BY g.name ASC
      `;
      const result = await pool.query(sql, [userId, subject_id, homebase_id]);
      return res.json({ status: "success", data: result.rows });
    }

    const sql = `
      SELECT id, name
      FROM a_grade
      WHERE homebase_id = $1
      ORDER BY name ASC
    `;
    const result = await pool.query(sql, [homebase_id]);
    return res.json({ status: "success", data: result.rows });
  }),
);

// ==========================================
// GET Classes (Role-based)
// ==========================================
router.get(
  "/classes",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, grade_id } = req.query;

    if (role === "teacher") {
      const sql = `
        SELECT DISTINCT cl.id, cl.name, cl.grade_id
        FROM a_class cl
        JOIN at_subject ats ON ats.class_id = cl.id
        WHERE ats.teacher_id = $1
          AND ats.subject_id = $2
          AND cl.homebase_id = $3
          AND ($4::int IS NULL OR cl.grade_id = $4)
        ORDER BY cl.name ASC
      `;
      const result = await pool.query(sql, [
        userId,
        subject_id,
        homebase_id,
        grade_id || null,
      ]);
      return res.json({ status: "success", data: result.rows });
    }

    const sql = `
      SELECT id, name, grade_id
      FROM a_class
      WHERE homebase_id = $1
        AND ($2::int IS NULL OR grade_id = $2)
      ORDER BY name ASC
    `;
    const result = await pool.query(sql, [homebase_id, grade_id || null]);
    return res.json({ status: "success", data: result.rows });
  }),
);

// ==========================================
// GET Chapters (Role-based)
// ==========================================
router.get(
  "/subjects/:subjectId/chapters",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subjectId } = req.params;
    const { grade_id, class_id } = req.query;

    if (role === "teacher") {
      const sql = `
        SELECT
          ch.id,
          ch.subject_id,
          ch.title,
          ch.description,
          ch.order_number,
          ch.grade_id,
          g.name AS grade_name,
          ch.class_id,
          cl.name AS class_name
        FROM l_chapter ch
        LEFT JOIN a_grade g ON ch.grade_id = g.id
        LEFT JOIN a_class cl ON ch.class_id = cl.id
        WHERE ch.subject_id = $1
          AND EXISTS (
            SELECT 1
            FROM at_subject ats
            WHERE ats.teacher_id = $2
              AND ats.subject_id = ch.subject_id
          )
          AND (
            $3::int IS NULL
            OR ch.grade_id = $3
            OR ch.grade_id IS NULL
          )
          AND (
            $4::int IS NULL
            OR ch.class_id = $4
            OR ch.class_id IS NULL
          )
        ORDER BY COALESCE(ch.order_number, 9999), ch.title ASC
      `;
      const result = await pool.query(sql, [
        subjectId,
        userId,
        grade_id || null,
        class_id || null,
      ]);
      return res.json({ status: "success", data: result.rows });
    }

    const sql = `
      SELECT
        ch.id,
        ch.subject_id,
        ch.title,
        ch.description,
        ch.order_number,
        ch.grade_id,
        g.name AS grade_name,
        ch.class_id,
        cl.name AS class_name
      FROM l_chapter ch
      LEFT JOIN a_grade g ON ch.grade_id = g.id
      LEFT JOIN a_class cl ON ch.class_id = cl.id
      JOIN a_subject s ON s.id = ch.subject_id
      WHERE ch.subject_id = $1
        AND s.homebase_id = $2
        AND (
          $3::int IS NULL
          OR ch.grade_id = $3
          OR ch.grade_id IS NULL
        )
        AND (
          $4::int IS NULL
          OR ch.class_id = $4
          OR ch.class_id IS NULL
        )
      ORDER BY COALESCE(ch.order_number, 9999), ch.title ASC
    `;
    const result = await pool.query(sql, [
      subjectId,
      homebase_id,
      grade_id || null,
      class_id || null,
    ]);
    return res.json({ status: "success", data: result.rows });
  }),
);

// ==========================================
// CREATE Chapter (Role-based)
// ==========================================
router.post(
  "/subjects/:subjectId/chapters",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subjectId } = req.params;
    const { title, description, order_number, grade_id, class_id } = req.body;

    if (role === "teacher") {
      const checkSql = `
        SELECT 1
        FROM at_subject ats
        WHERE ats.teacher_id = $1 AND ats.subject_id = $2
        LIMIT 1
      `;
      const check = await client.query(checkSql, [userId, subjectId]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const checkSql = `
        SELECT 1
        FROM a_subject s
        WHERE s.id = $1 AND s.homebase_id = $2
      `;
      const check = await client.query(checkSql, [subjectId, homebase_id]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    }

    const sql = `
      INSERT INTO l_chapter (subject_id, title, description, order_number, grade_id, class_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const result = await client.query(sql, [
      subjectId,
      title,
      description || null,
      order_number || null,
      grade_id || null,
      class_id || null,
    ]);
    return res.json({ status: "success", data: result.rows[0] });
  }),
);

// ==========================================
// UPDATE Chapter (Role-based)
// ==========================================
router.put(
  "/chapters/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const { id } = req.params;
    const { title, description, order_number, grade_id, class_id } = req.body;

    if (role === "teacher") {
      const checkSql = `
        SELECT 1
        FROM l_chapter ch
        JOIN at_subject ats ON ats.subject_id = ch.subject_id
        WHERE ch.id = $1 AND ats.teacher_id = $2
      `;
      const check = await client.query(checkSql, [id, userId]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const checkSql = `
        SELECT 1
        FROM l_chapter ch
        JOIN a_subject s ON s.id = ch.subject_id
        WHERE ch.id = $1 AND s.homebase_id = $2
      `;
      const check = await client.query(checkSql, [id, homebase_id]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    }

    const sql = `
      UPDATE l_chapter
      SET title = $1,
          description = $2,
          order_number = $3,
          grade_id = $4,
          class_id = $5
      WHERE id = $6
    `;
    await client.query(sql, [
      title,
      description || null,
      order_number || null,
      grade_id || null,
      class_id || null,
      id,
    ]);
    return res.json({ status: "success" });
  }),
);

// ==========================================
// DELETE Chapter (Role-based)
// ==========================================
router.delete(
  "/chapters/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const { id } = req.params;

    if (role === "teacher") {
      const checkSql = `
        SELECT 1
        FROM l_chapter ch
        JOIN at_subject ats ON ats.subject_id = ch.subject_id
        WHERE ch.id = $1 AND ats.teacher_id = $2
      `;
      const check = await client.query(checkSql, [id, userId]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const checkSql = `
        SELECT 1
        FROM l_chapter ch
        JOIN a_subject s ON s.id = ch.subject_id
        WHERE ch.id = $1 AND s.homebase_id = $2
      `;
      const check = await client.query(checkSql, [id, homebase_id]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    }

    await client.query("DELETE FROM l_chapter WHERE id = $1", [id]);
    return res.json({ status: "success" });
  }),
);

// ==========================================
// GET Contents (Role-based)
// ==========================================
router.get(
  "/chapters/:chapterId/contents",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { chapterId } = req.params;

    if (role === "teacher") {
      const sql = `
        SELECT
          c.id,
          c.chapter_id,
          c.title,
          c.body,
          c.video_url,
          c.attachment_url,
          c.order_number,
          c.created_at
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        WHERE c.chapter_id = $1
          AND EXISTS (
            SELECT 1
            FROM at_subject ats
            WHERE ats.teacher_id = $2
              AND ats.subject_id = ch.subject_id
          )
        ORDER BY COALESCE(c.order_number, 9999), c.created_at DESC
      `;
      const result = await pool.query(sql, [chapterId, userId]);
      return res.json({ status: "success", data: result.rows });
    }

    const sql = `
      SELECT
        c.id,
        c.chapter_id,
        c.title,
        c.body,
        c.video_url,
        c.attachment_url,
        c.order_number,
        c.created_at
      FROM l_content c
      JOIN l_chapter ch ON ch.id = c.chapter_id
      JOIN a_subject s ON s.id = ch.subject_id
      WHERE c.chapter_id = $1
        AND s.homebase_id = $2
      ORDER BY COALESCE(c.order_number, 9999), c.created_at DESC
    `;
    const result = await pool.query(sql, [chapterId, homebase_id]);
    return res.json({ status: "success", data: result.rows });
  }),
);

// ==========================================
// CREATE Content (Role-based)
// ==========================================
router.post(
  "/chapters/:chapterId/contents",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const { chapterId } = req.params;
    const { title, body, video_url, attachment_url, order_number } = req.body;

    if (role === "teacher") {
      const checkSql = `
        SELECT 1
        FROM l_chapter ch
        JOIN at_subject ats ON ats.subject_id = ch.subject_id
        WHERE ch.id = $1 AND ats.teacher_id = $2
      `;
      const check = await client.query(checkSql, [chapterId, userId]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const checkSql = `
        SELECT 1
        FROM l_chapter ch
        JOIN a_subject s ON s.id = ch.subject_id
        WHERE ch.id = $1 AND s.homebase_id = $2
      `;
      const check = await client.query(checkSql, [chapterId, homebase_id]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    }

    const sql = `
      INSERT INTO l_content (chapter_id, title, body, video_url, attachment_url, order_number)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `;
    const result = await client.query(sql, [
      chapterId,
      title,
      body || null,
      video_url || null,
      attachment_url || null,
      order_number || null,
    ]);
    return res.json({ status: "success", data: result.rows[0] });
  }),
);

// ==========================================
// UPDATE Content (Role-based)
// ==========================================
router.put(
  "/contents/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const { id } = req.params;
    const { title, body, video_url, attachment_url, order_number } = req.body;

    if (role === "teacher") {
      const checkSql = `
        SELECT 1
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        JOIN at_subject ats ON ats.subject_id = ch.subject_id
        WHERE c.id = $1 AND ats.teacher_id = $2
      `;
      const check = await client.query(checkSql, [id, userId]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const checkSql = `
        SELECT 1
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        JOIN a_subject s ON s.id = ch.subject_id
        WHERE c.id = $1 AND s.homebase_id = $2
      `;
      const check = await client.query(checkSql, [id, homebase_id]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    }

    const sql = `
      UPDATE l_content
      SET title = $1,
          body = $2,
          video_url = $3,
          attachment_url = $4,
          order_number = $5
      WHERE id = $6
    `;
    await client.query(sql, [
      title,
      body || null,
      video_url || null,
      attachment_url || null,
      order_number || null,
      id,
    ]);
    return res.json({ status: "success" });
  }),
);

// ==========================================
// DELETE Content (Role-based)
// ==========================================
router.delete(
  "/contents/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const { id } = req.params;

    if (role === "teacher") {
      const checkSql = `
        SELECT 1
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        JOIN at_subject ats ON ats.subject_id = ch.subject_id
        WHERE c.id = $1 AND ats.teacher_id = $2
      `;
      const check = await client.query(checkSql, [id, userId]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const checkSql = `
        SELECT 1
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        JOIN a_subject s ON s.id = ch.subject_id
        WHERE c.id = $1 AND s.homebase_id = $2
      `;
      const check = await client.query(checkSql, [id, homebase_id]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    }

    await client.query("DELETE FROM l_content WHERE id = $1", [id]);
    return res.json({ status: "success" });
  }),
);

export default router;
