import { Router } from "express";
import { authorize } from "../../middleware/authorize.js";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { getActivePeriode } from "../../utils/helper.js";

const router = Router();

const ensureTeacherSubjectAccess = async (db, teacherId, subjectId) => {
  const result = await db.query(
    `SELECT 1
     FROM at_subject
     WHERE teacher_id = $1
       AND subject_id = $2
     LIMIT 1`,
    [teacherId, subjectId],
  );
  return result.rowCount > 0;
};

const getAllowedTeacherClasses = async (db, teacherId, subjectId) => {
  const result = await db.query(
    `SELECT DISTINCT cl.id, cl.name
     FROM at_subject ats
     JOIN a_class cl ON cl.id = ats.class_id
     WHERE ats.teacher_id = $1
       AND ats.subject_id = $2
     ORDER BY cl.name ASC`,
    [teacherId, subjectId],
  );
  return result.rows;
};

const validateJournalPayload = ({
  class_id,
  journal_date,
  meeting_no,
  learning_material,
  activity,
}) => {
  if (!class_id || Number(class_id) <= 0) {
    return "Kelas wajib dipilih.";
  }
  if (!journal_date || Number.isNaN(new Date(journal_date).getTime())) {
    return "Tanggal jurnal tidak valid.";
  }
  if (!meeting_no || Number(meeting_no) <= 0) {
    return "Pertemuan wajib diisi.";
  }
  if (!learning_material || !String(learning_material).trim()) {
    return "Materi pembelajaran wajib diisi.";
  }
  if (!activity || !String(activity).trim()) {
    return "Kegiatan wajib diisi.";
  }
  return null;
};

const getTeacherJournalDetail = async (db, journalId, teacherId) => {
  const result = await db.query(
    `SELECT
       j.id,
       j.homebase_id,
       j.periode_id,
       j.teacher_id,
       u.full_name AS teacher_name,
       j.subject_id,
       s.name AS subject_name,
       s.code AS subject_code,
       j.class_id,
       cl.name AS class_name,
       j.journal_date,
       j.meeting_no,
       j.learning_material,
       j.activity,
       j.created_at,
       j.updated_at
     FROM lms.l_teacher_journal j
     JOIN u_users u ON u.id = j.teacher_id
     JOIN a_subject s ON s.id = j.subject_id
     JOIN a_class cl ON cl.id = j.class_id
     WHERE j.id = $1
       AND j.teacher_id = $2
     LIMIT 1`,
    [journalId, teacherId],
  );
  return result.rows[0] || null;
};

router.get(
  "/subjects/:subjectId/journals",
  authorize("teacher"),
  withQuery(async (req, res, pool) => {
    const teacherId = req.user.id;
    const homebaseId = req.user.homebase_id;
    const { subjectId } = req.params;
    const { class_id, date } = req.query;

    const hasAccess = await ensureTeacherSubjectAccess(pool, teacherId, subjectId);
    if (!hasAccess) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const periodeId = await getActivePeriode(pool, homebaseId);
    const queryParams = [teacherId, subjectId, periodeId];
    const filters = [];

    if (class_id) {
      queryParams.push(class_id);
      filters.push(`j.class_id = $${queryParams.length}`);
    }

    if (date) {
      queryParams.push(date);
      filters.push(`j.journal_date = $${queryParams.length}`);
    }

    const result = await pool.query(
      `SELECT
         j.id,
         j.homebase_id,
         j.periode_id,
         j.teacher_id,
         u.full_name AS teacher_name,
         j.subject_id,
         s.name AS subject_name,
         s.code AS subject_code,
         j.class_id,
         cl.name AS class_name,
         j.journal_date,
         j.meeting_no,
         j.learning_material,
         j.activity,
         j.created_at,
         j.updated_at
       FROM lms.l_teacher_journal j
       JOIN u_users u ON u.id = j.teacher_id
       JOIN a_subject s ON s.id = j.subject_id
       JOIN a_class cl ON cl.id = j.class_id
       WHERE j.teacher_id = $1
         AND j.subject_id = $2
         AND j.periode_id = $3
         ${filters.length ? `AND ${filters.join("\n         AND ")}` : ""}
       ORDER BY j.journal_date DESC, j.meeting_no DESC, j.updated_at DESC`,
      queryParams,
    );

    const allowedClasses = await getAllowedTeacherClasses(pool, teacherId, subjectId);

    return res.json({
      status: "success",
      data: result.rows,
      meta: {
        subject_id: Number(subjectId),
        subject_name: result.rows[0]?.subject_name || null,
        total_classes: allowedClasses.length,
      },
    });
  }),
);

router.post(
  "/subjects/:subjectId/journals",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const teacherId = req.user.id;
    const homebaseId = req.user.homebase_id;
    const { subjectId } = req.params;
    const { class_id, journal_date, meeting_no, learning_material, activity } =
      req.body;

    const validationError = validateJournalPayload({
      class_id,
      journal_date,
      meeting_no,
      learning_material,
      activity,
    });
    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }

    const hasAccess = await ensureTeacherSubjectAccess(client, teacherId, subjectId);
    if (!hasAccess) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const allowedClasses = await getAllowedTeacherClasses(client, teacherId, subjectId);
    const allowedClassIds = new Set(allowedClasses.map((item) => Number(item.id)));
    if (!allowedClassIds.has(Number(class_id))) {
      return res.status(400).json({
        status: "error",
        message: "Kelas tidak terdaftar pada pengampu mata pelajaran ini.",
      });
    }

    const periodeId = await getActivePeriode(client, homebaseId);
    const insertResult = await client.query(
      `INSERT INTO lms.l_teacher_journal (
         homebase_id,
         periode_id,
         teacher_id,
         subject_id,
         class_id,
         journal_date,
         meeting_no,
         learning_material,
         activity,
         created_by
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $3)
       RETURNING id`,
      [
        homebaseId,
        periodeId,
        teacherId,
        Number(subjectId),
        Number(class_id),
        journal_date,
        Number(meeting_no),
        String(learning_material).trim(),
        String(activity).trim(),
      ],
    );

    const journal = await getTeacherJournalDetail(
      client,
      insertResult.rows[0].id,
      teacherId,
    );
    return res.json({ status: "success", data: journal });
  }),
);

router.put(
  "/journals/:id",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const teacherId = req.user.id;
    const { id } = req.params;
    const { class_id, journal_date, meeting_no, learning_material, activity } =
      req.body;

    const validationError = validateJournalPayload({
      class_id,
      journal_date,
      meeting_no,
      learning_material,
      activity,
    });
    if (validationError) {
      return res.status(400).json({ status: "error", message: validationError });
    }

    const currentResult = await client.query(
      `SELECT id, subject_id
       FROM lms.l_teacher_journal
       WHERE id = $1
         AND teacher_id = $2
       LIMIT 1`,
      [id, teacherId],
    );
    if (currentResult.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Jurnal tidak ditemukan.",
      });
    }

    const subjectId = Number(currentResult.rows[0].subject_id);
    const allowedClasses = await getAllowedTeacherClasses(client, teacherId, subjectId);
    const allowedClassIds = new Set(allowedClasses.map((item) => Number(item.id)));
    if (!allowedClassIds.has(Number(class_id))) {
      return res.status(400).json({
        status: "error",
        message: "Kelas tidak terdaftar pada pengampu mata pelajaran ini.",
      });
    }

    await client.query(
      `UPDATE lms.l_teacher_journal
       SET class_id = $1,
           journal_date = $2,
           meeting_no = $3,
           learning_material = $4,
           activity = $5,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $6
         AND teacher_id = $7`,
      [
        Number(class_id),
        journal_date,
        Number(meeting_no),
        String(learning_material).trim(),
        String(activity).trim(),
        id,
        teacherId,
      ],
    );

    const journal = await getTeacherJournalDetail(client, id, teacherId);
    return res.json({ status: "success", data: journal });
  }),
);

router.delete(
  "/journals/:id",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const teacherId = req.user.id;
    const { id } = req.params;

    const deleteResult = await client.query(
      `DELETE FROM lms.l_teacher_journal
       WHERE id = $1
         AND teacher_id = $2
       RETURNING id`,
      [id, teacherId],
    );

    if (deleteResult.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Jurnal tidak ditemukan.",
      });
    }

    return res.json({
      status: "success",
      message: "Jurnal berhasil dihapus.",
    });
  }),
);

export default router;
