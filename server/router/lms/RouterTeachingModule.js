import { Router } from "express";
import path from "path";
import multer from "multer";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import { canManageKurikulum } from "../../utils/staffAssignment.js";
import {
  ensureDir,
  getLmsTeacherDir,
  resolveLmsAssetPath,
  safeUnlink,
} from "../../utils/helper.js";

const router = Router();

const MAX_MODULE_FILE_SIZE = 20 * 1024 * 1024;
const MAX_MODULE_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_MODULE_COVER_SIZE = 5 * 1024 * 1024;

const MODULE_FILE_TYPES = {
  ".pdf": ["application/pdf"],
  ".doc": ["application/msword", "application/octet-stream"],
  ".docx": [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream",
  ],
};

const MODULE_IMAGE_TYPES = {
  ".png": ["image/png"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".webp": ["image/webp"],
};

const getModuleDir = (teacherId) =>
  path.join(getLmsTeacherDir(teacherId), "modul");

const toModuleAssetUrl = (teacherId, filename) =>
  `/assets/lms/${teacherId}/modul/${filename}`;

const createModuleUploader = ({ allowedTypes, maxSize, errorMessage }) =>
  multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const dir = getModuleDir(req.user?.id ?? "unknown");
        ensureDir(dir);
        cb(null, dir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(
          null,
          `${uniqueSuffix}${path.extname(file.originalname).toLowerCase()}`,
        );
      },
    }),
    limits: { fileSize: maxSize },
    fileFilter: (req, file, cb) => {
      const extension = path.extname(file.originalname || "").toLowerCase();
      const mimeType = String(file.mimetype || "").toLowerCase();
      if (!allowedTypes[extension]?.includes(mimeType)) {
        return cb(new Error(errorMessage));
      }
      return cb(null, true);
    },
  });

const moduleFileUploader = createModuleUploader({
  allowedTypes: MODULE_FILE_TYPES,
  maxSize: MAX_MODULE_FILE_SIZE,
  errorMessage: "Format file tidak didukung. Gunakan PDF, DOC, atau DOCX.",
});

const moduleImageUploader = createModuleUploader({
  allowedTypes: MODULE_IMAGE_TYPES,
  maxSize: MAX_MODULE_IMAGE_SIZE,
  errorMessage: "Format gambar tidak didukung. Gunakan PNG, JPG, atau WEBP.",
});

const moduleCoverUploader = createModuleUploader({
  allowedTypes: MODULE_IMAGE_TYPES,
  maxSize: MAX_MODULE_COVER_SIZE,
  errorMessage: "Format cover tidak didukung. Gunakan PNG, JPG, atau WEBP.",
});

const handleSingleUpload = (uploader, sizeLabel) => (req, res, next) => {
  uploader.single("file")(req, res, (error) => {
    if (!error) return next();
    const message =
      error?.code === "LIMIT_FILE_SIZE"
        ? `Ukuran file melebihi batas ${sizeLabel}.`
        : error?.message || "Upload gagal.";
    return res.status(400).json({ status: "error", message });
  });
};

const toPositiveInt = (value) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const discardUploadedFile = (req) => {
  if (!req.file) return;
  safeUnlink(
    resolveLmsAssetPath(toModuleAssetUrl(req.user.id, req.file.filename)),
  );
};

// Gambar di editor diupload ke folder modul guru; kumpulkan URL-nya agar
// file fisik ikut dibersihkan ketika gambar dihapus dari isi modul.
const collectModuleImageUrls = (content) => {
  if (!content) return new Set();
  const serialized =
    typeof content === "string" ? content : JSON.stringify(content);
  const matches = serialized.match(/\/assets\/lms\/\d+\/modul\/[\w.-]+/g);
  return new Set(matches || []);
};

const unlinkRemovedImages = (previousContent, nextContent) => {
  const nextUrls = collectModuleImageUrls(nextContent);
  collectModuleImageUrls(previousContent).forEach((url) => {
    if (!nextUrls.has(url)) safeUnlink(resolveLmsAssetPath(url));
  });
};

const ensureTeacherSubjectAccess = async (db, teacherId, subjectId) => {
  const result = await db.query(
    `SELECT 1 FROM at_subject WHERE teacher_id = $1 AND subject_id = $2 LIMIT 1`,
    [teacherId, subjectId],
  );
  return result.rowCount > 0;
};

const validateGrade = async (db, gradeId, homebaseId) => {
  if (!gradeId) return false;
  const result = await db.query(
    `SELECT 1 FROM a_grade WHERE id = $1 AND homebase_id = $2 LIMIT 1`,
    [gradeId, homebaseId],
  );
  return result.rowCount > 0;
};

const validateModuleMeta = async (db, user, { subjectId, gradeId, title }) => {
  if (!subjectId) return "Mata pelajaran tidak valid.";
  if (!title || !String(title).trim()) return "Judul modul wajib diisi.";
  if (!(await validateGrade(db, gradeId, user.homebase_id))) {
    return "Tingkat wajib dipilih.";
  }
  if (!(await ensureTeacherSubjectAccess(db, user.id, subjectId))) {
    return "Anda tidak mengampu mata pelajaran ini.";
  }
  return null;
};

const MODULE_SELECT = `
  SELECT
    m.id,
    m.homebase_id,
    m.teacher_id,
    u.full_name AS teacher_name,
    t.nip AS teacher_nip,
    m.subject_id,
    s.name AS subject_name,
    s.code AS subject_code,
    m.grade_id,
    g.name AS grade_name,
    hb.name AS homebase_name,
    hb.level AS homebase_level,
    m.title,
    m.source_type,
    m.file_url,
    m.file_name,
    m.file_size,
    m.created_at,
    m.updated_at
  FROM lms.l_teaching_module m
  JOIN u_users u ON u.id = m.teacher_id
  LEFT JOIN u_teachers t ON t.user_id = m.teacher_id
  JOIN a_subject s ON s.id = m.subject_id
  LEFT JOIN a_grade g ON g.id = m.grade_id
  LEFT JOIN a_homebase hb ON hb.id = m.homebase_id
`;

const getModuleRow = async (db, id) => {
  const result = await db.query(
    `SELECT m.*, u.full_name AS teacher_name, t.nip AS teacher_nip,
            s.name AS subject_name, s.code AS subject_code,
            g.name AS grade_name, hb.name AS homebase_name,
            hb.level AS homebase_level
     FROM lms.l_teaching_module m
     JOIN u_users u ON u.id = m.teacher_id
     LEFT JOIN u_teachers t ON t.user_id = m.teacher_id
     JOIN a_subject s ON s.id = m.subject_id
     LEFT JOIN a_grade g ON g.id = m.grade_id
     LEFT JOIN a_homebase hb ON hb.id = m.homebase_id
     WHERE m.id = $1
     LIMIT 1`,
    [id],
  );
  return result.rows[0] || null;
};

const canReadModule = (user, row) =>
  Number(row.homebase_id) === Number(user.homebase_id) &&
  (Number(row.teacher_id) === Number(user.id) || canManageKurikulum(user));

const isModuleOwner = (user, row) =>
  user.role === "teacher" &&
  Number(row.teacher_id) === Number(user.id) &&
  Number(row.homebase_id) === Number(user.homebase_id);

// ==========================================
// GET daftar modul ajar milik guru pada mapel
// ==========================================
router.get(
  "/subjects/:subjectId/teaching-modules",
  authorize("teacher"),
  withQuery(async (req, res, pool) => {
    const { id: teacherId, homebase_id } = req.user;
    const subjectId = toPositiveInt(req.params.subjectId);
    const gradeId = toPositiveInt(req.query.grade_id);

    if (
      !subjectId ||
      !(await ensureTeacherSubjectAccess(pool, teacherId, subjectId))
    ) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const result = await pool.query(
      `${MODULE_SELECT}
       WHERE m.teacher_id = $1
         AND m.subject_id = $2
         AND m.homebase_id = $3
         AND ($4::int IS NULL OR m.grade_id = $4)
       ORDER BY m.updated_at DESC, m.id DESC`,
      [teacherId, subjectId, homebase_id, gradeId],
    );

    return res.json({ status: "success", data: result.rows });
  }),
);

// ==========================================
// GET data isian otomatis form modul ajar
// ==========================================
router.get(
  "/subjects/:subjectId/teaching-modules/meta",
  authorize("teacher"),
  withQuery(async (req, res, pool) => {
    const { id: teacherId, homebase_id } = req.user;
    const subjectId = toPositiveInt(req.params.subjectId);

    if (
      !subjectId ||
      !(await ensureTeacherSubjectAccess(pool, teacherId, subjectId))
    ) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const [profileResult, periodeResult, lastModuleResult] = await Promise.all([
      pool.query(
        `SELECT u.full_name AS teacher_name, t.nip AS teacher_nip,
                hb.name AS homebase_name, hb.level AS homebase_level,
                s.name AS subject_name
         FROM u_users u
         LEFT JOIN u_teachers t ON t.user_id = u.id
         LEFT JOIN a_homebase hb ON hb.id = $2
         LEFT JOIN a_subject s ON s.id = $3
         WHERE u.id = $1`,
        [teacherId, homebase_id, subjectId],
      ),
      pool.query(
        `SELECT name FROM a_periode
         WHERE homebase_id = $1 AND is_active = true
         ORDER BY id DESC LIMIT 1`,
        [homebase_id],
      ),
      pool.query(
        `SELECT content->'signature' AS signature
         FROM lms.l_teaching_module
         WHERE teacher_id = $1
           AND source_type = 'created'
           AND content ? 'signature'
         ORDER BY updated_at DESC
         LIMIT 1`,
        [teacherId],
      ),
    ]);

    return res.json({
      status: "success",
      data: {
        ...(profileResult.rows[0] || {}),
        periode_name: periodeResult.rows[0]?.name || null,
        last_signature: lastModuleResult.rows[0]?.signature || null,
      },
    });
  }),
);

// ==========================================
// GET detail modul ajar (pemilik atau kurikulum/admin satuan)
// ==========================================
router.get(
  "/teaching-modules/:id",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const id = toPositiveInt(req.params.id);
    const row = id ? await getModuleRow(pool, id) : null;
    if (!row) {
      return res
        .status(404)
        .json({ status: "error", message: "Modul ajar tidak ditemukan." });
    }
    if (!canReadModule(req.user, row)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }
    return res.json({ status: "success", data: row });
  }),
);

// ==========================================
// POST buat modul ajar dari form
// ==========================================
router.post(
  "/teaching-modules",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const subjectId = toPositiveInt(req.body?.subject_id);
    const gradeId = toPositiveInt(req.body?.grade_id);
    const title = String(req.body?.title || "").trim();
    const content = req.body?.content;

    const error = await validateModuleMeta(client, req.user, {
      subjectId,
      gradeId,
      title,
    });
    if (error) {
      return res.status(400).json({ status: "error", message: error });
    }
    if (!content || typeof content !== "object" || Array.isArray(content)) {
      return res
        .status(400)
        .json({ status: "error", message: "Isi modul tidak valid." });
    }

    const result = await client.query(
      `INSERT INTO lms.l_teaching_module
         (homebase_id, teacher_id, subject_id, grade_id, title, source_type, content)
       VALUES ($1, $2, $3, $4, $5, 'created', $6::jsonb)
       RETURNING id`,
      [
        req.user.homebase_id,
        req.user.id,
        subjectId,
        gradeId,
        title,
        JSON.stringify(content),
      ],
    );

    return res.status(201).json({
      status: "success",
      message: "Modul ajar berhasil dibuat.",
      data: { id: result.rows[0].id },
    });
  }),
);

// ==========================================
// PUT perbarui modul ajar buatan (judul, tingkat, isi)
// ==========================================
router.put(
  "/teaching-modules/:id",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const id = toPositiveInt(req.params.id);
    const row = id ? await getModuleRow(client, id) : null;
    if (!row) {
      return res
        .status(404)
        .json({ status: "error", message: "Modul ajar tidak ditemukan." });
    }
    if (!isModuleOwner(req.user, row)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const gradeId = toPositiveInt(req.body?.grade_id);
    const title = String(req.body?.title || "").trim();
    const error = await validateModuleMeta(client, req.user, {
      subjectId: row.subject_id,
      gradeId,
      title,
    });
    if (error) {
      return res.status(400).json({ status: "error", message: error });
    }

    const content = req.body?.content;
    const hasContent =
      content && typeof content === "object" && !Array.isArray(content);
    if (row.source_type === "created" && !hasContent) {
      return res
        .status(400)
        .json({ status: "error", message: "Isi modul tidak valid." });
    }

    await client.query(
      `UPDATE lms.l_teaching_module
       SET title = $1,
           grade_id = $2,
           content = CASE WHEN source_type = 'created' THEN $3::jsonb ELSE content END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $4`,
      [title, gradeId, hasContent ? JSON.stringify(content) : null, id],
    );

    if (row.source_type === "created") {
      unlinkRemovedImages(row.content, content);
    }

    return res.json({
      status: "success",
      message: "Modul ajar diperbarui.",
      data: { id },
    });
  }),
);

// ==========================================
// POST upload file modul ajar (PDF/DOC/DOCX)
// ==========================================
router.post(
  "/teaching-modules/upload",
  authorize("teacher"),
  handleSingleUpload(moduleFileUploader, "20 MB"),
  withTransaction(async (req, res, client) => {
    if (!req.file) {
      return res
        .status(400)
        .json({ status: "error", message: "File modul wajib diunggah." });
    }

    const subjectId = toPositiveInt(req.body?.subject_id);
    const gradeId = toPositiveInt(req.body?.grade_id);
    const title = String(req.body?.title || "").trim();
    const error = await validateModuleMeta(client, req.user, {
      subjectId,
      gradeId,
      title,
    });
    if (error) {
      discardUploadedFile(req);
      return res.status(400).json({ status: "error", message: error });
    }

    try {
      const result = await client.query(
        `INSERT INTO lms.l_teaching_module
           (homebase_id, teacher_id, subject_id, grade_id, title, source_type,
            file_url, file_name, file_size)
         VALUES ($1, $2, $3, $4, $5, 'uploaded', $6, $7, $8)
         RETURNING id`,
        [
          req.user.homebase_id,
          req.user.id,
          subjectId,
          gradeId,
          title,
          toModuleAssetUrl(req.user.id, req.file.filename),
          req.file.originalname,
          req.file.size,
        ],
      );

      return res.status(201).json({
        status: "success",
        message: "Modul ajar berhasil diupload.",
        data: { id: result.rows[0].id },
      });
    } catch (insertError) {
      discardUploadedFile(req);
      throw insertError;
    }
  }),
);

// ==========================================
// PUT ganti judul/tingkat/file modul ajar upload
// ==========================================
router.put(
  "/teaching-modules/:id/upload",
  authorize("teacher"),
  handleSingleUpload(moduleFileUploader, "20 MB"),
  withTransaction(async (req, res, client) => {
    const id = toPositiveInt(req.params.id);
    const row = id ? await getModuleRow(client, id) : null;
    if (!row || row.source_type !== "uploaded") {
      discardUploadedFile(req);
      return res
        .status(404)
        .json({ status: "error", message: "Modul ajar tidak ditemukan." });
    }
    if (!isModuleOwner(req.user, row)) {
      discardUploadedFile(req);
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const gradeId = toPositiveInt(req.body?.grade_id);
    const title = String(req.body?.title || "").trim();
    const error = await validateModuleMeta(client, req.user, {
      subjectId: row.subject_id,
      gradeId,
      title,
    });
    if (error) {
      discardUploadedFile(req);
      return res.status(400).json({ status: "error", message: error });
    }

    const nextFileUrl = req.file
      ? toModuleAssetUrl(req.user.id, req.file.filename)
      : row.file_url;

    try {
      await client.query(
        `UPDATE lms.l_teaching_module
         SET title = $1,
             grade_id = $2,
             file_url = $3,
             file_name = $4,
             file_size = $5,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6`,
        [
          title,
          gradeId,
          nextFileUrl,
          req.file ? req.file.originalname : row.file_name,
          req.file ? req.file.size : row.file_size,
          id,
        ],
      );
    } catch (updateError) {
      discardUploadedFile(req);
      throw updateError;
    }

    if (req.file) {
      safeUnlink(resolveLmsAssetPath(row.file_url));
    }

    return res.json({
      status: "success",
      message: "Modul ajar diperbarui.",
      data: { id },
    });
  }),
);

const respondUploadedImageUrl = (req, res) => {
  if (!req.file) {
    return res
      .status(400)
      .json({ status: "error", message: "Gambar wajib diunggah." });
  }
  return res.json({
    status: "success",
    data: { url: toModuleAssetUrl(req.user.id, req.file.filename) },
  });
};

// ==========================================
// POST upload gambar untuk isi modul ajar
// ==========================================
router.post(
  "/teaching-modules/images",
  authorize("teacher"),
  handleSingleUpload(moduleImageUploader, "2 MB"),
  respondUploadedImageUrl,
);

// ==========================================
// POST upload cover modul ajar (halaman pertama PDF)
// ==========================================
router.post(
  "/teaching-modules/cover",
  authorize("teacher"),
  handleSingleUpload(moduleCoverUploader, "5 MB"),
  respondUploadedImageUrl,
);

// ==========================================
// DELETE modul ajar (beserta file fisiknya)
// ==========================================
router.delete(
  "/teaching-modules/:id",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const id = toPositiveInt(req.params.id);
    const row = id ? await getModuleRow(client, id) : null;
    if (!row) {
      return res
        .status(404)
        .json({ status: "error", message: "Modul ajar tidak ditemukan." });
    }
    if (!isModuleOwner(req.user, row)) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    await client.query(`DELETE FROM lms.l_teaching_module WHERE id = $1`, [id]);

    if (row.source_type === "uploaded") {
      safeUnlink(resolveLmsAssetPath(row.file_url));
    } else {
      unlinkRemovedImages(row.content, null);
    }

    return res.json({ status: "success", message: "Modul ajar dihapus." });
  }),
);

// ==========================================
// GET monitoring modul ajar per guru & mapel (admin satuan / kurikulum)
// ==========================================
router.get(
  "/teaching-module-monitoring",
  authorize("satuan", "assignment:kurikulum"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const subjectId = toPositiveInt(req.query.subject_id);
    const gradeId = toPositiveInt(req.query.grade_id);

    const result = await pool.query(
      `WITH pairs AS (
         SELECT DISTINCT ats.teacher_id, ats.subject_id
         FROM at_subject ats
         JOIN a_subject s ON s.id = ats.subject_id
         LEFT JOIN a_class cl ON cl.id = ats.class_id
         WHERE s.homebase_id = $1
           AND ats.teacher_id IS NOT NULL
           AND ($3::int IS NULL OR cl.grade_id = $3)
         UNION
         SELECT DISTINCT m.teacher_id, m.subject_id
         FROM lms.l_teaching_module m
         WHERE m.homebase_id = $1
           AND ($3::int IS NULL OR m.grade_id = $3)
       ),
       taught_grades AS (
         SELECT ats.teacher_id, ats.subject_id,
                ARRAY_AGG(DISTINCT g.name ORDER BY g.name) AS grade_names
         FROM at_subject ats
         JOIN a_class cl ON cl.id = ats.class_id
         JOIN a_grade g ON g.id = cl.grade_id
         WHERE cl.homebase_id = $1
         GROUP BY ats.teacher_id, ats.subject_id
       )
       SELECT
         p.teacher_id,
         u.full_name AS teacher_name,
         t.nip AS teacher_nip,
         p.subject_id,
         s.name AS subject_name,
         s.code AS subject_code,
         COALESCE(tg.grade_names, ARRAY[]::text[]) AS taught_grade_names,
         COUNT(m.id) FILTER (WHERE m.source_type = 'created')::int AS created_count,
         COUNT(m.id) FILTER (WHERE m.source_type = 'uploaded')::int AS uploaded_count,
         MAX(m.updated_at) AS last_updated_at,
         COALESCE(
           JSON_AGG(
             JSON_BUILD_OBJECT(
               'id', m.id,
               'title', m.title,
               'source_type', m.source_type,
               'grade_id', m.grade_id,
               'grade_name', g.name,
               'file_url', m.file_url,
               'file_name', m.file_name,
               'updated_at', m.updated_at
             )
             ORDER BY m.updated_at DESC
           ) FILTER (WHERE m.id IS NOT NULL),
           '[]'::json
         ) AS modules
       FROM pairs p
       JOIN u_users u ON u.id = p.teacher_id
       LEFT JOIN u_teachers t ON t.user_id = p.teacher_id
       JOIN a_subject s ON s.id = p.subject_id
       LEFT JOIN taught_grades tg
         ON tg.teacher_id = p.teacher_id AND tg.subject_id = p.subject_id
       LEFT JOIN lms.l_teaching_module m
         ON m.teacher_id = p.teacher_id
        AND m.subject_id = p.subject_id
        AND m.homebase_id = $1
        AND ($3::int IS NULL OR m.grade_id = $3)
       LEFT JOIN a_grade g ON g.id = m.grade_id
       WHERE u.is_active IS DISTINCT FROM false
         AND ($2::int IS NULL OR p.subject_id = $2)
       GROUP BY p.teacher_id, u.full_name, t.nip, p.subject_id, s.name, s.code,
                tg.grade_names
       ORDER BY u.full_name ASC, s.name ASC`,
      [homebase_id, subjectId, gradeId],
    );

    return res.json({ status: "success", data: result.rows });
  }),
);

export default router;
