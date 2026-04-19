import { Router } from "express";
import path from "path";
import multer from "multer";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  ensureDir,
  getLmsTeacherDir,
  resolveLmsAssetPath,
  safeUnlink,
} from "../../utils/helper.js";

const router = Router();

// ==========================================
// Upload LMS File (Role-based)
// ==========================================
const lmsStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const teacherId = req.user?.id ?? "unknown";
    const dir = getLmsTeacherDir(teacherId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadLmsFile = multer({ storage: lmsStorage });

const normalizeStringArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === "string" ? item.trim() : ""))
          .filter(Boolean);
      }
      if (typeof parsed === "string" && parsed.trim()) {
        return [parsed.trim()];
      }
    } catch (error) {
      // Keep backward compatibility for plain text URL values.
    }
    return [trimmed];
  }
  return [];
};

const toStoredMediaValue = (values) => {
  if (!values || values.length === 0) return null;
  if (values.length === 1) return values[0];
  return JSON.stringify(values);
};

const parseStoredMediaValue = (value) => normalizeStringArray(value);

const parseContentMedia = (row) => {
  const videoUrls = parseStoredMediaValue(row.video_url);
  const attachmentUrls = parseStoredMediaValue(row.attachment_url);
  const attachmentNames = parseStoredMediaValue(row.attachment_name);

  return {
    ...row,
    video_urls: videoUrls,
    attachment_urls: attachmentUrls,
    attachment_names: attachmentNames,
    video_url: videoUrls[0] || null,
    attachment_url: attachmentUrls[0] || null,
    attachment_name: attachmentNames[0] || null,
  };
};

// ==========================================
// GET Subjects for LMS (Role-based)
// ==========================================
router.get(
  "/subjects",
  authorize("satuan", "teacher", "student"),
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

    // Siswa: hanya mapel pada kelas aktifnya
    if (role === "student") {
      const sql = `
        SELECT
          s.id,
          s.name,
          s.code,
          s.kkm,
          s.branch_id,
          b.name AS branch_name,
          c.name AS category_name,
          cl.id AS class_id,
          cl.name AS class_name,
          ARRAY_REMOVE(ARRAY_AGG(DISTINCT tu.full_name), NULL) AS teacher_names
        FROM u_students st
        JOIN a_class cl ON cl.id = st.current_class_id
        JOIN at_subject ats ON ats.class_id = cl.id
        JOIN a_subject s ON ats.subject_id = s.id
        LEFT JOIN a_subject_branch b ON s.branch_id = b.id
        LEFT JOIN a_subject_category c ON b.category_id = c.id
        LEFT JOIN u_users tu ON tu.id = ats.teacher_id
        WHERE st.user_id = $1
          AND st.homebase_id = $2
          AND s.homebase_id = $2
        GROUP BY
          s.id,
          s.name,
          s.code,
          s.kkm,
          s.branch_id,
          b.name,
          c.name,
          cl.id,
          cl.name
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
// UPLOAD Content File (Role-based)
// ==========================================
router.post(
  "/contents/upload",
  authorize("satuan", "teacher"),
  uploadLmsFile.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ status: "error", message: "File kosong." });
    }
    const teacherId = req.user?.id ?? "unknown";
    const fileUrl = `/assets/lms/${teacherId}/${req.file.filename}`;
    return res.json({
      status: "success",
      data: {
        url: fileUrl,
        name: req.file.originalname,
      },
    });
  },
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
  authorize("satuan", "teacher", "student"),
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
          cl.name AS class_name,
          ch.class_ids,
          cls.class_names
        FROM l_chapter ch
        LEFT JOIN a_grade g ON ch.grade_id = g.id
        LEFT JOIN a_class cl ON ch.class_id = cl.id
        LEFT JOIN LATERAL (
          SELECT ARRAY_AGG(c.name ORDER BY c.name) AS class_names
          FROM a_class c
          WHERE ch.class_ids IS NOT NULL AND c.id = ANY(ch.class_ids)
        ) cls ON true
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
            OR ($4::int = ANY(ch.class_ids))
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

    if (role === "student") {
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
          cl.name AS class_name,
          ch.class_ids,
          cls.class_names
        FROM l_chapter ch
        JOIN a_subject s ON s.id = ch.subject_id
        JOIN u_students st ON st.user_id = $2
        JOIN a_class active_cl ON active_cl.id = st.current_class_id
        LEFT JOIN a_grade g ON ch.grade_id = g.id
        LEFT JOIN a_class cl ON ch.class_id = cl.id
        LEFT JOIN LATERAL (
          SELECT ARRAY_AGG(c.name ORDER BY c.name) AS class_names
          FROM a_class c
          WHERE ch.class_ids IS NOT NULL AND c.id = ANY(ch.class_ids)
        ) cls ON true
        WHERE ch.subject_id = $1
          AND st.homebase_id = $3
          AND s.homebase_id = $3
          AND EXISTS (
            SELECT 1
            FROM at_subject ats
            WHERE ats.subject_id = ch.subject_id
              AND ats.class_id = active_cl.id
          )
          AND (
            ch.grade_id IS NULL
            OR ch.grade_id = active_cl.grade_id
          )
          AND (
            ch.class_id IS NULL
            OR ch.class_id = active_cl.id
            OR active_cl.id = ANY(ch.class_ids)
          )
        ORDER BY COALESCE(ch.order_number, 9999), ch.title ASC
      `;
      const result = await pool.query(sql, [subjectId, userId, homebase_id]);
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
        cl.name AS class_name,
        ch.class_ids,
        cls.class_names
      FROM l_chapter ch
      LEFT JOIN a_grade g ON ch.grade_id = g.id
      LEFT JOIN a_class cl ON ch.class_id = cl.id
      LEFT JOIN LATERAL (
        SELECT ARRAY_AGG(c.name ORDER BY c.name) AS class_names
        FROM a_class c
        WHERE ch.class_ids IS NOT NULL AND c.id = ANY(ch.class_ids)
      ) cls ON true
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
          OR ($4::int = ANY(ch.class_ids))
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
    const {
      title,
      description,
      order_number,
      grade_id,
      class_id,
      class_ids,
    } = req.body;

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

    const resolvedClassIds = Array.isArray(class_ids) ? class_ids : [];
    const resolvedClassId =
      resolvedClassIds.length === 1 ? resolvedClassIds[0] : class_id || null;

    const sql = `
      INSERT INTO l_chapter (
        subject_id,
        title,
        description,
        order_number,
        grade_id,
        class_id,
        class_ids
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const result = await client.query(sql, [
      subjectId,
      title,
      description || null,
      order_number || null,
      grade_id || null,
      resolvedClassId || null,
      resolvedClassIds.length > 0 ? resolvedClassIds : null,
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
    const {
      title,
      description,
      order_number,
      grade_id,
      class_id,
      class_ids,
    } = req.body;

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

    const resolvedClassIds = Array.isArray(class_ids) ? class_ids : [];
    const resolvedClassId =
      resolvedClassIds.length === 1 ? resolvedClassIds[0] : class_id || null;

    const sql = `
      UPDATE l_chapter
      SET title = $1,
          description = $2,
          order_number = $3,
          grade_id = $4,
          class_id = $5,
          class_ids = $6
      WHERE id = $7
    `;
    await client.query(sql, [
      title,
      description || null,
      order_number || null,
      grade_id || null,
      resolvedClassId || null,
      resolvedClassIds.length > 0 ? resolvedClassIds : null,
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
    let attachmentUrls = [];

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
      const fileSql = `
        SELECT c.attachment_url
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        JOIN at_subject ats ON ats.subject_id = ch.subject_id
        WHERE ch.id = $1 AND ats.teacher_id = $2
      `;
      const files = await client.query(fileSql, [id, userId]);
      attachmentUrls = files.rows.flatMap((row) =>
        parseStoredMediaValue(row.attachment_url),
      );
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
      const fileSql = `
        SELECT c.attachment_url
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        JOIN a_subject s ON s.id = ch.subject_id
        WHERE ch.id = $1 AND s.homebase_id = $2
      `;
      const files = await client.query(fileSql, [id, homebase_id]);
      attachmentUrls = files.rows.flatMap((row) =>
        parseStoredMediaValue(row.attachment_url),
      );
    }

    await client.query("DELETE FROM l_content WHERE chapter_id = $1", [id]);
    await client.query("DELETE FROM l_chapter WHERE id = $1", [id]);
    const uniqueUrls = Array.from(new Set(attachmentUrls));
    uniqueUrls.forEach((url) => {
      const filePath = resolveLmsAssetPath(url);
      safeUnlink(filePath);
    });
    return res.json({ status: "success" });
  }),
);

// ==========================================
// GET Contents (Role-based)
// ==========================================
router.get(
  "/chapters/:chapterId/contents",
  authorize("satuan", "teacher", "student"),
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
          c.attachment_name,
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
      return res.json({
        status: "success",
        data: result.rows.map(parseContentMedia),
      });
    }

    if (role === "student") {
      const sql = `
        SELECT
          c.id,
          c.chapter_id,
          c.title,
          c.body,
          c.video_url,
          c.attachment_url,
          c.attachment_name,
          c.order_number,
          c.created_at
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        JOIN a_subject s ON s.id = ch.subject_id
        JOIN u_students st ON st.user_id = $2
        JOIN a_class active_cl ON active_cl.id = st.current_class_id
        WHERE c.chapter_id = $1
          AND st.homebase_id = $3
          AND s.homebase_id = $3
          AND EXISTS (
            SELECT 1
            FROM at_subject ats
            WHERE ats.subject_id = ch.subject_id
              AND ats.class_id = active_cl.id
          )
          AND (
            ch.grade_id IS NULL
            OR ch.grade_id = active_cl.grade_id
          )
          AND (
            ch.class_id IS NULL
            OR ch.class_id = active_cl.id
            OR active_cl.id = ANY(ch.class_ids)
          )
        ORDER BY COALESCE(c.order_number, 9999), c.created_at DESC
      `;
      const result = await pool.query(sql, [chapterId, userId, homebase_id]);
      return res.json({
        status: "success",
        data: result.rows.map(parseContentMedia),
      });
    }

    const sql = `
      SELECT
        c.id,
        c.chapter_id,
        c.title,
        c.body,
        c.video_url,
        c.attachment_url,
        c.attachment_name,
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
    return res.json({
      status: "success",
      data: result.rows.map(parseContentMedia),
    });
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
    const {
      title,
      body,
      video_url,
      video_urls,
      attachment_url,
      attachment_urls,
      attachment_name,
      attachment_names,
      order_number,
    } = req.body;

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

    const normalizedVideoUrls = normalizeStringArray(video_urls).length
      ? normalizeStringArray(video_urls)
      : normalizeStringArray(video_url);
    const normalizedAttachmentUrls = normalizeStringArray(attachment_urls).length
      ? normalizeStringArray(attachment_urls)
      : normalizeStringArray(attachment_url);
    const normalizedAttachmentNames = normalizeStringArray(attachment_names).length
      ? normalizeStringArray(attachment_names)
      : normalizeStringArray(attachment_name);

    const sql = `
      INSERT INTO l_content (
        chapter_id,
        title,
        body,
        video_url,
        attachment_url,
        attachment_name,
        order_number
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
    `;
    const result = await client.query(sql, [
      chapterId,
      title,
      body || null,
      toStoredMediaValue(normalizedVideoUrls),
      toStoredMediaValue(normalizedAttachmentUrls),
      toStoredMediaValue(normalizedAttachmentNames),
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
    const {
      title,
      body,
      video_url,
      video_urls,
      attachment_url,
      attachment_urls,
      attachment_name,
      attachment_names,
      order_number,
    } = req.body;

    let existingAttachmentUrls = [];
    if (role === "teacher") {
      const checkSql = `
        SELECT c.attachment_url
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        JOIN at_subject ats ON ats.subject_id = ch.subject_id
        WHERE c.id = $1 AND ats.teacher_id = $2
      `;
      const check = await client.query(checkSql, [id, userId]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
      existingAttachmentUrls = parseStoredMediaValue(
        check.rows[0]?.attachment_url,
      );
    } else {
      const checkSql = `
        SELECT c.attachment_url
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        JOIN a_subject s ON s.id = ch.subject_id
        WHERE c.id = $1 AND s.homebase_id = $2
      `;
      const check = await client.query(checkSql, [id, homebase_id]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
      existingAttachmentUrls = parseStoredMediaValue(
        check.rows[0]?.attachment_url,
      );
    }

    const normalizedVideoUrls = normalizeStringArray(video_urls).length
      ? normalizeStringArray(video_urls)
      : normalizeStringArray(video_url);
    const normalizedAttachmentUrls = normalizeStringArray(attachment_urls).length
      ? normalizeStringArray(attachment_urls)
      : normalizeStringArray(attachment_url);
    const normalizedAttachmentNames = normalizeStringArray(attachment_names).length
      ? normalizeStringArray(attachment_names)
      : normalizeStringArray(attachment_name);

    const sql = `
      UPDATE l_content
      SET title = $1,
          body = $2,
          video_url = $3,
          attachment_url = $4,
          attachment_name = $5,
          order_number = $6
      WHERE id = $7
    `;
    await client.query(sql, [
      title,
      body || null,
      toStoredMediaValue(normalizedVideoUrls),
      toStoredMediaValue(normalizedAttachmentUrls),
      toStoredMediaValue(normalizedAttachmentNames),
      order_number || null,
      id,
    ]);

    const nextSet = new Set(normalizedAttachmentUrls);
    const removedUrls = existingAttachmentUrls.filter((url) => !nextSet.has(url));
    const uniqueRemovedUrls = Array.from(new Set(removedUrls));
    uniqueRemovedUrls.forEach((url) => {
      const filePath = resolveLmsAssetPath(url);
      safeUnlink(filePath);
    });
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

    let existingAttachmentUrls = [];
    if (role === "teacher") {
      const checkSql = `
        SELECT c.attachment_url
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        JOIN at_subject ats ON ats.subject_id = ch.subject_id
        WHERE c.id = $1 AND ats.teacher_id = $2
      `;
      const check = await client.query(checkSql, [id, userId]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
      existingAttachmentUrls = parseStoredMediaValue(
        check.rows[0]?.attachment_url,
      );
    } else {
      const checkSql = `
        SELECT c.attachment_url
        FROM l_content c
        JOIN l_chapter ch ON ch.id = c.chapter_id
        JOIN a_subject s ON s.id = ch.subject_id
        WHERE c.id = $1 AND s.homebase_id = $2
      `;
      const check = await client.query(checkSql, [id, homebase_id]);
      if (check.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
      existingAttachmentUrls = parseStoredMediaValue(
        check.rows[0]?.attachment_url,
      );
    }

    await client.query("DELETE FROM l_content WHERE id = $1", [id]);
    const uniqueUrls = Array.from(new Set(existingAttachmentUrls));
    uniqueUrls.forEach((url) => {
      const filePath = resolveLmsAssetPath(url);
      safeUnlink(filePath);
    });
    return res.json({ status: "success" });
  }),
);

export default router;

