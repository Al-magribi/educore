import { Router } from "express";
import path from "path";
import multer from "multer";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  ensureDir,
  getActivePeriode,
  getLmsStudentSubmissionDir,
  resolveLmsAssetPath,
  safeUnlink,
} from "../../utils/helper.js";

const router = Router();
const ALLOWED_SUBMISSION_EXTENSIONS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".ppt",
  ".pptx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
]);
const ALLOWED_SUBMISSION_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "application/octet-stream",
]);

const studentSubmissionStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const studentId = req.user?.id ?? "unknown";
    const dir = getLmsStudentSubmissionDir(studentId);
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadStudentSubmission = multer({
  storage: studentSubmissionStorage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (req, file, cb) => {
    const extension = path.extname(file.originalname || "").toLowerCase();
    const mimeType = String(file.mimetype || "").toLowerCase();
    if (
      !ALLOWED_SUBMISSION_EXTENSIONS.has(extension) ||
      !ALLOWED_SUBMISSION_MIME_TYPES.has(mimeType)
    ) {
      return cb(
        new Error(
          "Format file tidak didukung. Gunakan PDF, Word, Excel, PowerPoint, atau gambar.",
        ),
      );
    }
    return cb(null, true);
  },
});

const normalizeIdArray = (value) => {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  );
};

const validateTaskPayload = ({ chapter_id, title, instruction, deadline_at, class_ids }) => {
  if (!chapter_id) return "chapter_id wajib diisi.";
  if (!title || !String(title).trim()) return "Nama tugas wajib diisi.";
  if (!instruction || !String(instruction).trim())
    return "Instruksi penugasan wajib diisi.";
  if (!deadline_at || Number.isNaN(new Date(deadline_at).getTime()))
    return "Deadline penugasan tidak valid.";
  if (!Array.isArray(class_ids) || class_ids.length === 0)
    return "Minimal satu kelas wajib dipilih.";
  return null;
};

const ensureTeacherSubjectAccess = async (db, teacherId, subjectId) => {
  const accessResult = await db.query(
    `SELECT 1
     FROM at_subject
     WHERE teacher_id = $1
       AND subject_id = $2
     LIMIT 1`,
    [teacherId, subjectId],
  );
  return accessResult.rowCount > 0;
};

const ensureChapterBelongsToSubject = async (db, chapterId, subjectId) => {
  const chapterResult = await db.query(
    `SELECT id, title
     FROM l_chapter
     WHERE id = $1
       AND subject_id = $2
     LIMIT 1`,
    [chapterId, subjectId],
  );
  return chapterResult.rows[0] || null;
};

const getAllowedTeacherClasses = async (db, teacherId, subjectId) => {
  const classResult = await db.query(
    `SELECT DISTINCT cl.id, cl.name
     FROM at_subject ats
     JOIN a_class cl ON cl.id = ats.class_id
     WHERE ats.teacher_id = $1
       AND ats.subject_id = $2
     ORDER BY cl.name ASC`,
    [teacherId, subjectId],
  );
  return classResult.rows;
};

const getTaskDetail = async (db, taskId, teacherId) => {
  const result = await db.query(
    `SELECT
       t.id,
       t.homebase_id,
       t.periode_id,
       t.subject_id,
       t.chapter_id,
       ch.title AS chapter_title,
       t.teacher_id,
       t.title,
       t.instruction,
       t.deadline_at,
       t.created_at,
       t.updated_at,
       COALESCE(
         ARRAY_AGG(DISTINCT tc.class_id)
           FILTER (WHERE tc.class_id IS NOT NULL),
         '{}'::int[]
       ) AS class_ids,
       COALESCE(
         ARRAY_AGG(DISTINCT cl.name)
           FILTER (WHERE cl.name IS NOT NULL),
         '{}'::text[]
       ) AS class_names
     FROM lms.l_task t
     JOIN l_chapter ch ON ch.id = t.chapter_id
     LEFT JOIN lms.l_task_class tc ON tc.task_id = t.id
     LEFT JOIN a_class cl ON cl.id = tc.class_id
     WHERE t.id = $1
       AND t.teacher_id = $2
     GROUP BY
       t.id,
       t.homebase_id,
       t.periode_id,
       t.subject_id,
       t.chapter_id,
       ch.title,
       t.teacher_id,
       t.title,
       t.instruction,
       t.deadline_at,
       t.created_at,
       t.updated_at`,
    [taskId, teacherId],
  );
  return result.rows[0] || null;
};

const getTeacherTaskAccess = async (db, taskId, teacherId) => {
  const result = await db.query(
    `SELECT id, subject_id, periode_id
     FROM lms.l_task
     WHERE id = $1
       AND teacher_id = $2
     LIMIT 1`,
    [taskId, teacherId],
  );
  return result.rows[0] || null;
};

const getStudentTaskAccess = async (db, taskId, studentId, homebaseId) => {
  const studentResult = await db.query(
    `SELECT current_class_id, current_periode_id
     FROM u_students
     WHERE user_id = $1
       AND homebase_id = $2
     LIMIT 1`,
    [studentId, homebaseId],
  );
  if (studentResult.rowCount === 0) return null;

  const currentClassId = Number(studentResult.rows[0].current_class_id || 0);
  const currentPeriodeId = Number(studentResult.rows[0].current_periode_id || 0);
  if (!currentClassId) return null;

  const taskResult = await db.query(
    `SELECT
       t.id,
       sub.id AS submission_id,
       sub.file_url
     FROM lms.l_task t
     JOIN lms.l_task_class tc
       ON tc.task_id = t.id
      AND tc.class_id = $2
     LEFT JOIN lms.l_task_submission sub
       ON sub.task_id = t.id
      AND sub.student_id = $3
     WHERE t.id = $1
       AND t.homebase_id = $4
       AND ($5::int = 0 OR t.periode_id = $5)
     LIMIT 1`,
    [taskId, currentClassId, studentId, homebaseId, currentPeriodeId || 0],
  );

  return taskResult.rows[0] || null;
};

router.get(
  "/student/subjects/:subjectId/tasks",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const studentId = req.user.id;
    const homebaseId = req.user.homebase_id;
    const { subjectId } = req.params;
    const { class_id } = req.query;

    const studentResult = await pool.query(
      `SELECT
         st.user_id,
         st.current_class_id,
         st.current_periode_id,
         cl.name AS class_name
       FROM u_students st
       LEFT JOIN a_class cl ON cl.id = st.current_class_id
       WHERE st.user_id = $1
         AND st.homebase_id = $2
       LIMIT 1`,
      [studentId, homebaseId],
    );

    if (studentResult.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Data siswa tidak ditemukan.",
      });
    }

    const student = studentResult.rows[0];
    const activeClassId = Number(student.current_class_id || 0);
    if (!activeClassId) {
      return res.status(400).json({
        status: "error",
        message: "Kelas aktif siswa belum tersedia.",
      });
    }

    if (class_id && Number(class_id) !== activeClassId) {
      return res.status(403).json({
        status: "error",
        message: "Akses kelas tidak sesuai dengan kelas aktif siswa.",
      });
    }

    const subjectAccessResult = await pool.query(
      `SELECT
         s.id,
         s.name,
         s.code
       FROM a_subject s
       JOIN at_subject ats
         ON ats.subject_id = s.id
        AND ats.class_id = $2
       WHERE s.id = $1
         AND s.homebase_id = $3
       GROUP BY s.id, s.name, s.code
       LIMIT 1`,
      [subjectId, activeClassId, homebaseId],
    );

    if (subjectAccessResult.rowCount === 0) {
      return res.status(403).json({
        status: "error",
        message: "Mata pelajaran tidak tersedia untuk siswa ini.",
      });
    }

    const activePeriodeId =
      Number(student.current_periode_id || 0) || (await getActivePeriode(pool, homebaseId));

    const result = await pool.query(
      `SELECT
         t.id,
         t.subject_id,
         s.name AS subject_name,
         s.code AS subject_code,
         t.chapter_id,
         ch.title AS chapter_title,
         t.title,
         t.instruction,
         t.deadline_at,
         t.created_at,
         t.updated_at,
         tc.class_id AS active_class_id,
         cl.name AS active_class_name,
         sub.id AS submission_id,
         sub.file_name AS submission_file_name,
         sub.file_url AS submission_file_url,
         sub.submitted_at
       FROM lms.l_task t
       JOIN a_subject s ON s.id = t.subject_id
       JOIN l_chapter ch ON ch.id = t.chapter_id
       JOIN lms.l_task_class tc
         ON tc.task_id = t.id
        AND tc.class_id = $2
       JOIN a_class cl ON cl.id = tc.class_id
       LEFT JOIN lms.l_task_submission sub
         ON sub.task_id = t.id
        AND sub.student_id = $3
       WHERE t.subject_id = $1
         AND t.homebase_id = $4
         AND t.periode_id = $5
       ORDER BY t.deadline_at ASC, s.name ASC, t.title ASC, t.id DESC`,
      [subjectId, activeClassId, studentId, homebaseId, activePeriodeId],
    );

    return res.json({
      status: "success",
      data: result.rows,
      meta: {
        subject: subjectAccessResult.rows[0],
        class_id: activeClassId,
        class_name: student.class_name || "-",
      },
    });
  }),
);

router.get(
  "/subjects/:subjectId/tasks",
  authorize("teacher"),
  withQuery(async (req, res, pool) => {
    const teacherId = req.user.id;
    const homebaseId = req.user.homebase_id;
    const { subjectId } = req.params;
    const { chapter_id, class_id } = req.query;

    const hasAccess = await ensureTeacherSubjectAccess(pool, teacherId, subjectId);
    if (!hasAccess) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const activePeriodeId = await getActivePeriode(pool, homebaseId);
    const queryParams = [teacherId, subjectId, activePeriodeId];
    const filters = [];

    if (chapter_id) {
      queryParams.push(chapter_id);
      filters.push(`t.chapter_id = $${queryParams.length}`);
    }

    if (class_id) {
      queryParams.push(class_id);
      filters.push(
        `EXISTS (
           SELECT 1
           FROM lms.l_task_class tc_filter
           WHERE tc_filter.task_id = t.id
             AND tc_filter.class_id = $${queryParams.length}
         )`,
      );
    }

    const sql = `
      SELECT
        t.id,
        t.homebase_id,
        t.periode_id,
        t.subject_id,
        t.chapter_id,
        ch.title AS chapter_title,
        t.teacher_id,
        t.title,
        t.instruction,
        t.deadline_at,
        t.created_at,
        t.updated_at,
        COALESCE(
          ARRAY_AGG(DISTINCT tc.class_id)
            FILTER (WHERE tc.class_id IS NOT NULL),
          '{}'::int[]
        ) AS class_ids,
        COALESCE(
          ARRAY_AGG(DISTINCT cl.name)
            FILTER (WHERE cl.name IS NOT NULL),
          '{}'::text[]
        ) AS class_names,
        COUNT(DISTINCT tc.class_id) AS target_class_count
      FROM lms.l_task t
      JOIN l_chapter ch ON ch.id = t.chapter_id
      LEFT JOIN lms.l_task_class tc ON tc.task_id = t.id
      LEFT JOIN a_class cl ON cl.id = tc.class_id
      WHERE t.teacher_id = $1
        AND t.subject_id = $2
        AND t.periode_id = $3
        ${filters.length ? `AND ${filters.join("\n        AND ")}` : ""}
      GROUP BY
        t.id,
        t.homebase_id,
        t.periode_id,
        t.subject_id,
        t.chapter_id,
        ch.title,
        t.teacher_id,
        t.title,
        t.instruction,
        t.deadline_at,
        t.created_at,
        t.updated_at
      ORDER BY t.deadline_at ASC, t.created_at DESC, t.id DESC
    `;

    const result = await pool.query(sql, queryParams);
    return res.json({ status: "success", data: result.rows });
  }),
);

router.get(
  "/tasks/:id/submissions",
  authorize("teacher"),
  withQuery(async (req, res, pool) => {
    const teacherId = req.user.id;
    const { id } = req.params;

    const taskAccess = await getTeacherTaskAccess(pool, id, teacherId);
    if (!taskAccess) {
      return res.status(404).json({
        status: "error",
        message: "Task tidak ditemukan.",
      });
    }

    const taskMetaResult = await pool.query(
      `SELECT
         t.id,
         t.title,
         t.deadline_at,
         ch.title AS chapter_title,
         COALESCE(
           ARRAY_AGG(DISTINCT cl.name)
             FILTER (WHERE cl.name IS NOT NULL),
           '{}'::text[]
         ) AS class_names
       FROM lms.l_task t
       JOIN l_chapter ch ON ch.id = t.chapter_id
       LEFT JOIN lms.l_task_class tc ON tc.task_id = t.id
       LEFT JOIN a_class cl ON cl.id = tc.class_id
       WHERE t.id = $1
       GROUP BY t.id, ch.title`,
      [id],
    );

    const studentResult = await pool.query(
      `SELECT
         e.student_id,
         u.full_name,
         st.nis,
         e.class_id,
         cl.name AS class_name,
         sub.id AS submission_id,
         sub.file_name AS submission_file_name,
         sub.file_url AS submission_file_url,
         sub.submitted_at
       FROM lms.l_task_class tc
       JOIN u_class_enrollments e
         ON e.class_id = tc.class_id
        AND e.periode_id = $2
       JOIN u_users u ON u.id = e.student_id
       JOIN u_students st ON st.user_id = e.student_id
       JOIN a_class cl ON cl.id = e.class_id
       LEFT JOIN lms.l_task_submission sub
         ON sub.task_id = tc.task_id
        AND sub.student_id = e.student_id
       WHERE tc.task_id = $1
       ORDER BY cl.name ASC, u.full_name ASC`,
      [id, taskAccess.periode_id],
    );

    const students = studentResult.rows.map((row) => ({
      ...row,
      status: row.submission_id ? "submitted" : "pending",
    }));
    const submittedCount = students.filter(
      (item) => item.status === "submitted",
    ).length;

    return res.json({
      status: "success",
      data: {
        task: taskMetaResult.rows[0] || null,
        summary: {
          assigned: students.length,
          submitted: submittedCount,
          pending: students.length - submittedCount,
        },
        students,
      },
    });
  }),
);

router.post(
  "/tasks/:id/submission",
  authorize("student"),
  (req, res, next) => {
    uploadStudentSubmission.single("file")(req, res, (error) => {
      if (!error) return next();
      return res.status(400).json({
        status: "error",
        message:
          error?.message ||
          "Upload gagal. Periksa format file dan ukuran maksimal 10 MB.",
      });
    });
  },
  withTransaction(async (req, res, client) => {
    const studentId = req.user.id;
    const homebaseId = req.user.homebase_id;
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "File tugas wajib diunggah.",
      });
    }

    const taskAccess = await getStudentTaskAccess(client, id, studentId, homebaseId);
    if (!taskAccess) {
      const uploadedPath = resolveLmsAssetPath(
        `/assets/lms/submissions/${studentId}/${req.file.filename}`,
      );
      safeUnlink(uploadedPath);
      return res.status(403).json({
        status: "error",
        message: "Tugas tidak tersedia untuk siswa ini.",
      });
    }

    const fileUrl = `/assets/lms/submissions/${studentId}/${req.file.filename}`;
    const oldFilePath = resolveLmsAssetPath(taskAccess.file_url);

    if (taskAccess.submission_id) {
      await client.query(
        `UPDATE lms.l_task_submission
         SET file_url = $1,
             file_name = $2,
             file_mime = $3,
             submitted_at = CURRENT_TIMESTAMP,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $4`,
        [fileUrl, req.file.originalname, req.file.mimetype, taskAccess.submission_id],
      );
      safeUnlink(oldFilePath);
    } else {
      await client.query(
        `INSERT INTO lms.l_task_submission (
           task_id,
           student_id,
           file_url,
           file_name,
           file_mime
         )
         VALUES ($1, $2, $3, $4, $5)`,
        [id, studentId, fileUrl, req.file.originalname, req.file.mimetype],
      );
    }

    return res.json({
      status: "success",
      data: {
        task_id: Number(id),
        file_url: fileUrl,
        file_name: req.file.originalname,
        file_mime: req.file.mimetype,
      },
    });
  }),
);

router.delete(
  "/tasks/:id/submission",
  authorize("student"),
  withTransaction(async (req, res, client) => {
    const studentId = req.user.id;
    const homebaseId = req.user.homebase_id;
    const { id } = req.params;

    const taskAccess = await getStudentTaskAccess(client, id, studentId, homebaseId);
    if (!taskAccess) {
      return res.status(403).json({
        status: "error",
        message: "Tugas tidak tersedia untuk siswa ini.",
      });
    }

    if (!taskAccess.submission_id) {
      return res.status(404).json({
        status: "error",
        message: "File submission belum tersedia.",
      });
    }

    const filePath = resolveLmsAssetPath(taskAccess.file_url);

    await client.query(
      `DELETE FROM lms.l_task_submission
       WHERE id = $1
         AND student_id = $2`,
      [taskAccess.submission_id, studentId],
    );

    safeUnlink(filePath);

    return res.json({
      status: "success",
      message: "File submission berhasil dihapus.",
    });
  }),
);

router.post(
  "/subjects/:subjectId/tasks",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const teacherId = req.user.id;
    const homebaseId = req.user.homebase_id;
    const { subjectId } = req.params;
    const { chapter_id, title, instruction, deadline_at, class_ids } = req.body;

    const normalizedClassIds = normalizeIdArray(class_ids);
    const validationError = validateTaskPayload({
      chapter_id,
      title,
      instruction,
      deadline_at,
      class_ids: normalizedClassIds,
    });
    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }

    const hasAccess = await ensureTeacherSubjectAccess(client, teacherId, subjectId);
    if (!hasAccess) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const chapter = await ensureChapterBelongsToSubject(client, chapter_id, subjectId);
    if (!chapter) {
      return res.status(400).json({
        status: "error",
        message: "Chapter tidak sesuai dengan mata pelajaran ini.",
      });
    }

    const allowedClasses = await getAllowedTeacherClasses(client, teacherId, subjectId);
    const allowedClassIds = new Set(allowedClasses.map((item) => Number(item.id)));
    const invalidClassIds = normalizedClassIds.filter((item) => !allowedClassIds.has(item));
    if (invalidClassIds.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Ada kelas yang tidak terdaftar pada pengampu guru.",
      });
    }

    const periodeId = await getActivePeriode(client, homebaseId);
    const insertResult = await client.query(
      `INSERT INTO lms.l_task (
         homebase_id,
         periode_id,
         subject_id,
         chapter_id,
         teacher_id,
         title,
         instruction,
         deadline_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id`,
      [
        homebaseId,
        periodeId,
        subjectId,
        chapter_id,
        teacherId,
        String(title).trim(),
        String(instruction).trim(),
        deadline_at,
      ],
    );

    const taskId = insertResult.rows[0].id;
    for (const classId of normalizedClassIds) {
      await client.query(
        `INSERT INTO lms.l_task_class (task_id, class_id)
         VALUES ($1, $2)`,
        [taskId, classId],
      );
    }

    const task = await getTaskDetail(client, taskId, teacherId);
    return res.json({ status: "success", data: task });
  }),
);

router.put(
  "/tasks/:id",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const teacherId = req.user.id;
    const { id } = req.params;
    const { chapter_id, title, instruction, deadline_at, class_ids } = req.body;

    const normalizedClassIds = normalizeIdArray(class_ids);
    const validationError = validateTaskPayload({
      chapter_id,
      title,
      instruction,
      deadline_at,
      class_ids: normalizedClassIds,
    });
    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }

    const taskResult = await client.query(
      `SELECT id, subject_id
       FROM lms.l_task
       WHERE id = $1
         AND teacher_id = $2
       LIMIT 1`,
      [id, teacherId],
    );
    if (taskResult.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Task tidak ditemukan.",
      });
    }

    const subjectId = taskResult.rows[0].subject_id;
    const chapter = await ensureChapterBelongsToSubject(client, chapter_id, subjectId);
    if (!chapter) {
      return res.status(400).json({
        status: "error",
        message: "Chapter tidak sesuai dengan mata pelajaran ini.",
      });
    }

    const allowedClasses = await getAllowedTeacherClasses(client, teacherId, subjectId);
    const allowedClassIds = new Set(allowedClasses.map((item) => Number(item.id)));
    const invalidClassIds = normalizedClassIds.filter((item) => !allowedClassIds.has(item));
    if (invalidClassIds.length > 0) {
      return res.status(400).json({
        status: "error",
        message: "Ada kelas yang tidak terdaftar pada pengampu guru.",
      });
    }

    await client.query(
      `UPDATE lms.l_task
       SET chapter_id = $1,
           title = $2,
           instruction = $3,
           deadline_at = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5`,
      [
        chapter_id,
        String(title).trim(),
        String(instruction).trim(),
        deadline_at,
        id,
      ],
    );

    await client.query(`DELETE FROM lms.l_task_class WHERE task_id = $1`, [id]);
    for (const classId of normalizedClassIds) {
      await client.query(
        `INSERT INTO lms.l_task_class (task_id, class_id)
         VALUES ($1, $2)`,
        [id, classId],
      );
    }

    const task = await getTaskDetail(client, id, teacherId);
    return res.json({ status: "success", data: task });
  }),
);

router.delete(
  "/tasks/:id",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const teacherId = req.user.id;
    const { id } = req.params;

    const deleteResult = await client.query(
      `DELETE FROM lms.l_task
       WHERE id = $1
         AND teacher_id = $2
       RETURNING id`,
      [id, teacherId],
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Task tidak ditemukan.",
      });
    }

    return res.json({ status: "success", message: "Task berhasil dihapus." });
  }),
);

export default router;
