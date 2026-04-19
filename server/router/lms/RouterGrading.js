import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const normalizeScore = (value) => {
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return 0;
  return Math.round(numberValue);
};

const normalizeScoreNullable = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numberValue = Number(value);
  if (Number.isNaN(numberValue)) return null;
  return Math.round(numberValue);
};

const MONTHS_ID = [
  "januari",
  "februari",
  "maret",
  "april",
  "mei",
  "juni",
  "juli",
  "agustus",
  "september",
  "oktober",
  "november",
  "desember",
];

const getMonthNumber = (month) => {
  if (!month) return null;
  const normalized = String(month).trim();
  const yyyyMmMatch = normalized.match(/^(\d{4})-(\d{2})$/);
  if (yyyyMmMatch) {
    return Number(yyyyMmMatch[2]);
  }
  const numericMatch = normalized.match(/^(\d{1,2})$/);
  if (numericMatch) {
    return Number(numericMatch[1]);
  }
  const namePart = normalized.split(" ")[0]?.toLowerCase();
  const index = MONTHS_ID.indexOf(namePart);
  if (index >= 0) return index + 1;
  return null;
};

const isSameMonthValue = (storedMonth, targetMonth) => {
  const storedNum = getMonthNumber(storedMonth);
  const targetNum = getMonthNumber(targetMonth);
  if (storedNum != null && targetNum != null) {
    return Number(storedNum) === Number(targetNum);
  }
  return (
    String(storedMonth || "").trim().toLowerCase() ===
    String(targetMonth || "").trim().toLowerCase()
  );
};

const buildFormativeType = (month, chapterId, subchapterId) => {
  const monthNum = getMonthNumber(month);
  const monthPart = monthNum
    ? `M${String(monthNum).padStart(2, "0")}`
    : "M00";
  const chapterPart = `B${chapterId}`;
  const subPart = subchapterId ? `-S${subchapterId}` : "";
  return `${monthPart}-${chapterPart}${subPart}`;
};

const buildSummativeType = (month, chapterId, subchapterId) => {
  const monthNum = getMonthNumber(month);
  const monthPart = monthNum
    ? `M${String(monthNum).padStart(2, "0")}`
    : "M00";
  const chapterPart = `B${chapterId}`;
  const subPart = subchapterId ? `-S${subchapterId}` : "";
  return `${monthPart}-${chapterPart}${subPart}`;
};

const buildSummativeLegacyType = (month, chapterId) => {
  const monthNum = getMonthNumber(month);
  const monthPart = monthNum
    ? `M${String(monthNum).padStart(2, "0")}`
    : "M00";
  const chapterPart = `B${chapterId}`;
  return `${monthPart}-${chapterPart}`;
};

const extractSubchapterFromType = (typeValue) => {
  const raw = String(typeValue || "");
  const match = raw.match(/-S(\d+)/);
  if (match) return Number(match[1]);
  // Legacy type: Mxx-B{chapter} (no subchapter suffix)
  const legacyMatch = raw.match(/^M\d{2}-B\d+$/);
  if (legacyMatch) return 1;
  return null;
};

const normalizeFinalScore = (scoreWritten, scoreSkill) => {
  const written =
    scoreWritten === null || scoreWritten === undefined
      ? null
      : Number(scoreWritten);
  const skill =
    scoreSkill === null || scoreSkill === undefined ? null : Number(scoreSkill);
  const values = [written, skill].filter(
    (value) => value !== null && !Number.isNaN(value),
  );
  if (!values.length) return null;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Number(average.toFixed(2));
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

const getClassHomebaseId = async (pool, classId) => {
  if (!classId) return null;
  const result = await pool.query(
    `SELECT homebase_id
     FROM a_class
     WHERE id = $1
     LIMIT 1`,
    [classId],
  );
  return result.rows[0]?.homebase_id || null;
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
    const { subject_id, class_id, month, semester, teacher_id } = req.query;

    if (!subject_id || !class_id || !month || !semester) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, month, dan semester wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
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

    const classHomebaseId = await getClassHomebaseId(pool, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }
    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
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

    const activePeriode = await ensureActivePeriode(
      pool,
      classHomebaseId || homebase_id,
    );
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
         a.semester,
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
        AND a.semester = $5
        AND a.class_id = $2
        AND a.teacher_id = $6
       WHERE e.class_id = $2
         AND e.periode_id = $3
       ORDER BY u.full_name ASC`,
      [
        subject_id,
        class_id,
        activePeriode.id,
        month,
        semesterValue,
        effectiveTeacherId,
      ],
    );

    return res.json({
      status: "success",
      data: {
        periode_id: activePeriode.id,
        periode_name: activePeriode.name,
        month,
        semester: semesterValue,
        students: studentResult.rows,
      },
    });
  }),
);

// ==========================================
// GET Formative Scores (Role-based)
// ==========================================
router.get(
  "/grading/formative",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const {
      subject_id,
      class_id,
      month,
      semester,
      chapter_id,
      teacher_id,
    } = req.query;

    if (!subject_id || !class_id || !semester) {
      return res.status(400).json({
        status: "error",
        message:
          "subject_id, class_id, dan semester wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
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

    const classHomebaseId = await getClassHomebaseId(pool, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }
    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
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

    const activePeriode = await ensureActivePeriode(
      pool,
      classHomebaseId || homebase_id,
    );
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const joinConditions = [
      "f.student_id = e.student_id",
      "f.subject_id = $1",
      "f.periode_id = $3",
      "f.semester = $4",
      "f.class_id = $2",
      "f.teacher_id = $5",
    ];
    const joinParams = [
      subject_id,
      class_id,
      activePeriode.id,
      semesterValue,
      effectiveTeacherId,
    ];
    let paramIndex = 6;
    if (chapter_id) {
      joinConditions.push(`f.chapter_id = $${paramIndex}`);
      joinParams.push(chapter_id);
      paramIndex += 1;
    }

    const studentResult = await pool.query(
      `SELECT
         u.id AS student_id,
         u.full_name,
         st.nis,
         f.id AS score_id,
         f.month,
         f.chapter_id,
         f.type,
         f.score
       FROM u_class_enrollments e
       JOIN u_users u ON e.student_id = u.id
       JOIN u_students st ON e.student_id = st.user_id
       LEFT JOIN l_score_formative f
         ON ${joinConditions.join("\n        AND ")}
       WHERE e.class_id = $2
         AND e.periode_id = $3
       ORDER BY u.full_name ASC, f.id DESC`,
      joinParams,
    );

    const studentsMap = new Map();
    for (const row of studentResult.rows) {
      const studentId = String(row.student_id);
      if (!studentsMap.has(studentId)) {
        studentsMap.set(studentId, {
          student_id: row.student_id,
          full_name: row.full_name,
          nis: row.nis,
          score: null,
          scores: [],
          _typeSet: new Set(),
        });
      }
      const entry = studentsMap.get(studentId);
      if (!row.type) continue;
      if (month && !isSameMonthValue(row.month, month)) continue;
      if (entry._typeSet.has(row.type)) continue;
      entry._typeSet.add(row.type);
      entry.scores.push({
        type: row.type,
        month: row.month,
        chapter_id: row.chapter_id,
        score: row.score ?? 0,
      });
      if (month && chapter_id && entry.score == null) {
        entry.score = row.score ?? 0;
      }
    }

    const students = Array.from(studentsMap.values()).map((item) => {
      const { _typeSet, ...rest } = item;
      return rest;
    });

    return res.json({
      status: "success",
      data: {
        periode_id: activePeriode.id,
        periode_name: activePeriode.name,
        month: month || null,
        semester: semesterValue,
        chapter_id: chapter_id ? Number(chapter_id) : null,
        students,
      },
    });
  }),
);

// ==========================================
// GET Summative Scores (Role-based)
// ==========================================
router.get(
  "/grading/summative",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const {
      subject_id,
      class_id,
      month,
      semester,
      chapter_id,
      teacher_id,
    } = req.query;

    if (!subject_id || !class_id || !semester) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan semester wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
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

    const classHomebaseId = await getClassHomebaseId(pool, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }
    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
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

    const activePeriode = await ensureActivePeriode(
      pool,
      classHomebaseId || homebase_id,
    );
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const joinConditions = [
      "s.student_id = e.student_id",
      "s.subject_id = $1",
      "s.periode_id = $3",
      "s.semester = $4",
      "s.class_id = $2",
      "s.teacher_id = $5",
    ];
    const joinParams = [
      subject_id,
      class_id,
      activePeriode.id,
      semesterValue,
      effectiveTeacherId,
    ];
    let paramIndex = 6;
    if (chapter_id) {
      joinConditions.push(`s.chapter_id = $${paramIndex}`);
      joinParams.push(chapter_id);
      paramIndex += 1;
    }

    const studentResult = await pool.query(
      `SELECT
         u.id AS student_id,
         u.full_name,
         st.nis,
         s.id AS score_id,
         s.month,
         s.chapter_id,
         s.type,
         s.score_written,
         s.score_skill,
         s.final_score
       FROM u_class_enrollments e
       JOIN u_users u ON e.student_id = u.id
       JOIN u_students st ON e.student_id = st.user_id
       LEFT JOIN l_score_summative s
         ON ${joinConditions.join("\n        AND ")}
       WHERE e.class_id = $2
         AND e.periode_id = $3
       ORDER BY u.full_name ASC, s.id DESC`,
      joinParams,
    );

    const studentsMap = new Map();
    for (const row of studentResult.rows) {
      const studentId = String(row.student_id);
      if (!studentsMap.has(studentId)) {
        studentsMap.set(studentId, {
          student_id: row.student_id,
          full_name: row.full_name,
          nis: row.nis,
          score: null,
          scores: [],
          _subSet: new Set(),
        });
      }
      const entry = studentsMap.get(studentId);
      if (!row.type) continue;
      if (month && !isSameMonthValue(row.month, month)) continue;
      const parsedSubchapter = extractSubchapterFromType(row.type);
      const subchapterId = parsedSubchapter ?? 1;
      if (entry._subSet.has(subchapterId)) continue;
      entry._subSet.add(subchapterId);
      entry.scores.push({
        type: row.type,
        month: row.month,
        chapter_id: row.chapter_id,
        subchapter_id: subchapterId,
        score_written: row.score_written ?? 0,
        score_skill: row.score_skill ?? 0,
        final_score: row.final_score ?? 0,
      });
      if (month && chapter_id) {
        const values = entry.scores
          .map((item) => Number(item.final_score))
          .filter((value) => !Number.isNaN(value));
        if (values.length) {
          entry.score = values.reduce((sum, value) => sum + value, 0) / values.length;
        }
      }
    }

    const students = Array.from(studentsMap.values()).map((item) => {
      const { _subSet, ...rest } = item;
      return rest;
    });

    return res.json({
      status: "success",
      data: {
        periode_id: activePeriode.id,
        periode_name: activePeriode.name,
        month: month || null,
        semester: semesterValue,
        chapter_id: chapter_id ? Number(chapter_id) : null,
        students,
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
    const { subject_id, class_id, month, semester, teacher_id, items } =
      req.body;

    if (!subject_id || !class_id || !month || !semester) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, month, dan semester wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Data sikap siswa belum ada.",
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

    const classHomebaseId = await getClassHomebaseId(client, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }
    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
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

    const activePeriode = await ensureActivePeriode(
      client,
      classHomebaseId || homebase_id,
    );
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
         AND semester = $4
         AND class_id = $5
         AND teacher_id = $6
         AND student_id = ANY($7::int[])`,
      [
        subject_id,
        activePeriode.id,
        month,
        semesterValue,
        class_id,
        effectiveTeacherId,
        studentIds,
      ],
    );

    for (const item of items) {
      await client.query(
        `INSERT INTO l_score_attitude (
           student_id,
           class_id,
           subject_id,
           teacher_id,
           periode_id,
           semester,
           month,
           kinerja,
           kedisiplinan,
           keaktifan,
           percaya_diri,
           teacher_note
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          item.student_id,
          class_id,
          subject_id,
          effectiveTeacherId,
          activePeriode.id,
          semesterValue,
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

// ==========================================
// SUBMIT Formative Scores (Role-based)
// ==========================================
router.post(
  "/grading/formative/submit",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const {
      subject_id,
      class_id,
      month,
      semester,
      chapter_id,
      subchapter_id,
      teacher_id,
      items,
    } = req.body;

    if (!subject_id || !class_id || !month || !semester || !chapter_id) {
      return res.status(400).json({
        status: "error",
        message:
          "subject_id, class_id, month, semester, dan chapter_id wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Data formatif siswa belum ada.",
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

    const classHomebaseId = await getClassHomebaseId(client, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }
    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
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

    const activePeriode = await ensureActivePeriode(
      client,
      classHomebaseId || homebase_id,
    );
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const normalizedItemsMap = new Map();
    for (const item of items) {
      const studentId = Number(item.student_id || 0);
      if (!studentId) continue;
      const itemSubchapterId =
        item.subchapter_id ?? subchapter_id ?? null;
      if (!itemSubchapterId) {
        return res.status(400).json({
          status: "error",
          message: "subchapter_id wajib diisi.",
        });
      }
      const subchapterValue = Number(itemSubchapterId);
      if (!subchapterValue) {
        return res.status(400).json({
          status: "error",
          message: "subchapter_id tidak valid.",
        });
      }
      const key = `${studentId}:${subchapterValue}`;
      const normalizedScore = normalizeScoreNullable(item.score);
      normalizedItemsMap.set(key, {
        student_id: studentId,
        subchapter_id: subchapterValue,
        score: normalizedScore,
      });
    }

    const normalizedItems = Array.from(normalizedItemsMap.values());
    const studentIds = normalizedItems.map((item) => item.student_id);
    if (studentIds.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "student_id wajib diisi.",
      });
    }

    const typeKeys = Array.from(
      new Set(
        normalizedItems.map((item) =>
          buildFormativeType(month, chapter_id, item.subchapter_id),
        ),
      ),
    );

    await client.query(
      `DELETE FROM l_score_formative
       WHERE subject_id = $1
         AND periode_id = $2
         AND month = $3
         AND semester = $4
         AND class_id = $5
         AND chapter_id = $6
         AND teacher_id = $7
         AND type = ANY($8::text[])
         AND student_id = ANY($9::int[])`,
      [
        subject_id,
        activePeriode.id,
        month,
        semesterValue,
        class_id,
        chapter_id,
        effectiveTeacherId,
        typeKeys,
        studentIds,
      ],
    );

    for (const item of normalizedItems) {
      if (item.score == null) {
        continue;
      }
      const typeKey = buildFormativeType(
        month,
        chapter_id,
        item.subchapter_id,
      );
      await client.query(
        `INSERT INTO l_score_formative (
           periode_id,
           semester,
           month,
           class_id,
           student_id,
           teacher_id,
           subject_id,
           chapter_id,
           type,
           score
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          activePeriode.id,
          semesterValue,
          month,
          class_id,
          item.student_id,
          effectiveTeacherId,
          subject_id,
          chapter_id,
          typeKey,
          normalizeScore(item.score),
        ],
      );
    }

    return res.json({
      status: "success",
      message: "Nilai formatif berhasil disimpan.",
    });
  }),
);

// ==========================================
// SUBMIT Summative Scores (Role-based)
// ==========================================
router.post(
  "/grading/summative/submit",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const {
      subject_id,
      class_id,
      month,
      semester,
      chapter_id,
      subchapter_id,
      teacher_id,
      items,
    } = req.body;

    if (!subject_id || !class_id || !month || !semester || !chapter_id) {
      return res.status(400).json({
        status: "error",
        message:
          "subject_id, class_id, month, semester, dan chapter_id wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Data sumatif siswa belum ada.",
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

    const classHomebaseId = await getClassHomebaseId(client, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }
    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
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

    const activePeriode = await ensureActivePeriode(
      client,
      classHomebaseId || homebase_id,
    );
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const normalizedItemsMap = new Map();
    for (const item of items) {
      const studentId = Number(item.student_id || 0);
      if (!studentId) continue;
      const itemSubchapterId = item.subchapter_id ?? subchapter_id ?? null;
      if (!itemSubchapterId) {
        return res.status(400).json({
          status: "error",
          message: "subchapter_id wajib diisi.",
        });
      }
      const subchapterValue = Number(itemSubchapterId);
      if (!subchapterValue) {
        return res.status(400).json({
          status: "error",
          message: "subchapter_id tidak valid.",
        });
      }
      const key = `${studentId}:${subchapterValue}`;
      const scoreWritten = normalizeScoreNullable(item.score_written);
      const scoreSkill = normalizeScoreNullable(item.score_skill);
      const finalScore = normalizeFinalScore(scoreWritten, scoreSkill);
      normalizedItemsMap.set(key, {
        student_id: studentId,
        subchapter_id: subchapterValue,
        score_written: scoreWritten,
        score_skill: scoreSkill,
        final_score: finalScore,
      });
    }

    const normalizedItems = Array.from(normalizedItemsMap.values());
    const studentIds = normalizedItems.map((item) => item.student_id);
    if (studentIds.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "student_id wajib diisi.",
      });
    }

    const typeKeys = Array.from(
      new Set(
        normalizedItems.flatMap((item) => {
          const nextTypes = [
            buildSummativeType(month, chapter_id, item.subchapter_id),
          ];
          if (Number(item.subchapter_id) === 1) {
            // Backward compatibility for old rows saved without -S suffix.
            nextTypes.push(buildSummativeLegacyType(month, chapter_id));
          }
          return nextTypes;
        }),
      ),
    );

    await client.query(
      `DELETE FROM l_score_summative
       WHERE subject_id = $1
         AND periode_id = $2
         AND month = $3
         AND semester = $4
         AND class_id = $5
         AND chapter_id = $6
         AND teacher_id = $7
         AND type = ANY($8::text[])
         AND student_id = ANY($9::int[])`,
      [
        subject_id,
        activePeriode.id,
        month,
        semesterValue,
        class_id,
        chapter_id,
        effectiveTeacherId,
        typeKeys,
        studentIds,
      ],
    );

    for (const item of normalizedItems) {
      if (item.score_written == null && item.score_skill == null) {
        continue;
      }
      const typeKey = buildSummativeType(month, chapter_id, item.subchapter_id);
      await client.query(
        `INSERT INTO l_score_summative (
           periode_id,
           semester,
           month,
           class_id,
           student_id,
           teacher_id,
           subject_id,
           chapter_id,
           type,
           score_written,
           score_skill,
           final_score
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          activePeriode.id,
          semesterValue,
          month,
          class_id,
          item.student_id,
          effectiveTeacherId,
          subject_id,
          chapter_id,
          typeKey,
          item.score_written,
          item.score_skill,
          item.final_score,
        ],
      );
    }

    return res.json({
      status: "success",
      message: "Nilai sumatif berhasil disimpan.",
    });
  }),
);

// ==========================================
// GET Final Exam Scores (Role-based)
// ==========================================
router.get(
  "/grading/final",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, semester, teacher_id } = req.query;

    if (!subject_id || !class_id || !semester) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan semester wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
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

    const classHomebaseId = await getClassHomebaseId(pool, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }
    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
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

    const activePeriode = await ensureActivePeriode(
      pool,
      classHomebaseId || homebase_id,
    );
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
         f.final_grade
       FROM u_class_enrollments e
       JOIN u_users u ON e.student_id = u.id
       JOIN u_students st ON e.student_id = st.user_id
       LEFT JOIN l_score_final f
         ON f.student_id = e.student_id
        AND f.subject_id = $1
        AND f.class_id = $2
        AND f.periode_id = $3
        AND f.semester = $4
        AND f.teacher_id = $5
       WHERE e.class_id = $2
         AND e.periode_id = $3
       ORDER BY u.full_name ASC`,
      [subject_id, class_id, activePeriode.id, semesterValue, effectiveTeacherId],
    );

    return res.json({
      status: "success",
      data: {
        periode_id: activePeriode.id,
        periode_name: activePeriode.name,
        semester: semesterValue,
        students: studentResult.rows,
      },
    });
  }),
);

// ==========================================
// SUBMIT Final Exam Scores (Role-based)
// ==========================================
router.post(
  "/grading/final/submit",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, semester, teacher_id, items } = req.body;

    if (!subject_id || !class_id || !semester) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan semester wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Data ujian akhir siswa belum ada.",
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

    const classHomebaseId = await getClassHomebaseId(client, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }
    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
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

    const activePeriode = await ensureActivePeriode(
      client,
      classHomebaseId || homebase_id,
    );
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const normalizedItemsMap = new Map();
    for (const item of items) {
      const studentId = Number(item.student_id || 0);
      if (!studentId) continue;
      normalizedItemsMap.set(studentId, {
        student_id: studentId,
        final_grade: normalizeScoreNullable(item.final_grade),
      });
    }

    const normalizedItems = Array.from(normalizedItemsMap.values());
    const studentIds = normalizedItems.map((item) => item.student_id);
    if (!studentIds.length) {
      return res.status(400).json({
        status: "error",
        message: "student_id wajib diisi.",
      });
    }

    await client.query(
      `DELETE FROM l_score_final
       WHERE subject_id = $1
         AND periode_id = $2
         AND semester = $3
         AND class_id = $4
         AND teacher_id = $5
         AND student_id = ANY($6::int[])`,
      [
        subject_id,
        activePeriode.id,
        semesterValue,
        class_id,
        effectiveTeacherId,
        studentIds,
      ],
    );

    for (const item of normalizedItems) {
      if (item.final_grade == null) continue;
      await client.query(
        `INSERT INTO l_score_final (
           periode_id,
           semester,
           class_id,
           student_id,
           teacher_id,
           subject_id,
           final_grade
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          activePeriode.id,
          semesterValue,
          class_id,
          item.student_id,
          effectiveTeacherId,
          subject_id,
          normalizeScore(item.final_grade),
        ],
      );
    }

    return res.json({
      status: "success",
      message: "Nilai ujian akhir berhasil disimpan.",
    });
  }),
);

// ==========================================
// DELETE Final Exam Scores (Role-based)
// ==========================================
router.delete(
  "/grading/final",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, semester, teacher_id } = req.body || {};

    if (!subject_id || !class_id || !semester) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan semester wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
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

    const classHomebaseId = await getClassHomebaseId(client, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }
    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
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

    const activePeriode = await ensureActivePeriode(
      client,
      classHomebaseId || homebase_id,
    );
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const deleteResult = await client.query(
      `DELETE FROM l_score_final
       WHERE subject_id = $1
         AND periode_id = $2
         AND semester = $3
         AND class_id = $4
         AND teacher_id = $5`,
      [subject_id, activePeriode.id, semesterValue, class_id, effectiveTeacherId],
    );

    return res.json({
      status: "success",
      message: "Nilai ujian akhir berhasil dihapus.",
      data: {
        deleted_count: deleteResult.rowCount || 0,
      },
    });
  }),
);

export default router;
