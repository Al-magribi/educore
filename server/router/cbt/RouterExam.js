import { Router } from "express";
import { isIP } from "node:net";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const BLOOM_LEVEL_LABELS = {
  1: "Remembering",
  2: "Understanding",
  3: "Applying",
  4: "Analyzing",
  5: "Evaluating",
  6: "Creating",
};

const shuffleArray = (items) => {
  if (!Array.isArray(items)) return [];
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const generateToken = (length = 6) => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < length; i += 1) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
};

const normalizeIdArray = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isInteger(id));
};

const toNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeIdList = (value) => {
  if (!Array.isArray(value)) return [];
  return value
    .map((id) => parseInt(id, 10))
    .filter((id) => Number.isInteger(id));
};

const normalizeAttendanceStatus = (value) => {
  if (value === "izin") return "izinkan";
  return value;
};

const extractIpValue = (value) => {
  if (!value) return null;

  let candidate = String(value).trim();
  if (!candidate) return null;

  candidate = candidate.split(",")[0]?.trim() || "";
  candidate = candidate.split(";")[0]?.trim() || "";
  if (!candidate || candidate.toLowerCase() === "unknown") return null;

  if (candidate.toLowerCase().startsWith("for=")) {
    candidate = candidate.slice(4).trim();
  }

  candidate = candidate.replace(/^"|"$/g, "");

  if (candidate.startsWith("[") && candidate.includes("]")) {
    const closingIndex = candidate.indexOf("]");
    candidate = candidate.slice(1, closingIndex);
  }

  if (candidate.startsWith("::ffff:")) {
    const mapped = candidate.slice(7);
    if (isIP(mapped)) return mapped;
  }

  if (/^\d{1,3}(?:\.\d{1,3}){3}:\d+$/.test(candidate)) {
    candidate = candidate.split(":")[0];
  }

  return isIP(candidate) ? candidate : null;
};

const resolveStudentIpAddress = (req, reportedIp) => {
  const candidates = [
    req.headers["cf-connecting-ip"],
    req.headers["x-real-ip"],
    req.headers["x-forwarded-for"],
    req.headers.forwarded,
    reportedIp,
    req.socket?.remoteAddress,
    req.ip,
  ];

  for (const candidate of candidates) {
    const validIp = extractIpValue(candidate);
    if (validIp) return validIp;
  }

  return req.ip || "-";
};

const getAllowAttendanceStatus = async (db) => {
  const constraintResult = await db.query(
    `
      SELECT pg_get_constraintdef(con.oid) AS def
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      WHERE con.conname = 'c_exam_attendance_status_check'
        AND nsp.nspname = 'cbt'
        AND rel.relname = 'c_exam_attendance'
      LIMIT 1
    `,
  );

  const def = String(constraintResult.rows[0]?.def || "").toLowerCase();
  if (def.includes("'izinkan'")) {
    return "izinkan";
  }
  if (def.includes("'izin'")) {
    return "izin";
  }
  return "izinkan";
};

const normalizeBloomLevel = (value) => {
  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 6) {
    return null;
  }

  return parsed;
};

const getBloomLevelLabel = (value) => {
  const level = normalizeBloomLevel(value);
  if (!level) return "Tanpa Level";
  return `C${level} ${BLOOM_LEVEL_LABELS[level]}`;
};

const hasAnswerForQuestion = ({ question, answerRow }) => {
  if (!answerRow) return false;

  const answerValue = answerRow.answer_json;
  const hasScore = answerRow.score_obtained !== null && answerRow.score_obtained !== undefined;

  if (question.q_type === 1 || question.q_type === 5) {
    return Number.isInteger(parseInt(answerValue, 10));
  }

  if (question.q_type === 2) {
    return normalizeIdList(answerValue).length > 0;
  }

  if (question.q_type === 3 || question.q_type === 4) {
    if (typeof answerValue === "string" && answerValue.trim() !== "") return true;
    return hasScore;
  }

  if (question.q_type === 6) {
    if (Array.isArray(answerValue) && answerValue.length > 0) return true;
    return hasScore;
  }

  return false;
};

const getQuestionAnswerStatus = ({ question, answerRow, questionOptions = [] }) => {
  const answered = hasAnswerForQuestion({ question, answerRow });
  if (!answered) return "unanswered";

  const answerValue = answerRow?.answer_json;

  if (question.q_type === 1 || question.q_type === 5) {
    const selectedId = parseInt(answerValue, 10);
    const correctOptions = questionOptions.filter((opt) => opt.is_correct);
    const isCorrect = correctOptions.some((opt) => opt.id === selectedId);
    return isCorrect ? "correct" : "incorrect";
  }

  if (question.q_type === 2) {
    const selectedIds = normalizeIdList(answerValue);
    const correctIds = questionOptions
      .filter((opt) => opt.is_correct)
      .map((opt) => opt.id);
    const correctSet = new Set(correctIds);
    const isCorrect =
      selectedIds.length > 0 &&
      selectedIds.every((id) => correctSet.has(id)) &&
      selectedIds.length === correctSet.size;
    return isCorrect ? "correct" : "incorrect";
  }

  if (question.q_type === 3 || question.q_type === 4 || question.q_type === 6) {
    if (answerRow?.score_obtained === null || answerRow?.score_obtained === undefined) {
      return "pending_review";
    }

    return toNumber(answerRow.score_obtained) >= toNumber(question.score_point)
      ? "correct"
      : "incorrect";
  }

  return "incorrect";
};

const computeStudentScore = ({ questions, optionsByQuestion, answersByQuestion }) => {
  let total = 0;

  questions.forEach((question) => {
    const answerRow = answersByQuestion.get(question.id);
    const answerValue = answerRow?.answer_json;
    const maxPoints = toNumber(question.score_point);

    if (question.q_type === 1) {
      const selectedId = parseInt(answerValue, 10);
      if (Number.isInteger(selectedId)) {
        const correctOptions = (optionsByQuestion[question.id] || []).filter(
          (opt) => opt.is_correct,
        );
        const isCorrect = correctOptions.some((opt) => opt.id === selectedId);
        if (isCorrect) total += maxPoints;
      }
      return;
    }

    if (question.q_type === 2) {
      const selectedIds = normalizeIdList(answerValue);
      const correctIds = (optionsByQuestion[question.id] || [])
        .filter((opt) => opt.is_correct)
        .map((opt) => opt.id);
      const correctSet = new Set(correctIds);
      const isCorrect =
        selectedIds.length > 0 &&
        selectedIds.every((id) => correctSet.has(id)) &&
        selectedIds.length === correctSet.size;
      if (isCorrect) total += maxPoints;
      return;
    }

    if (question.q_type === 5) {
      const selectedId = parseInt(answerValue, 10);
      if (Number.isInteger(selectedId)) {
        const correctOptions = (optionsByQuestion[question.id] || []).filter(
          (opt) => opt.is_correct,
        );
        const isCorrect = correctOptions.some((opt) => opt.id === selectedId);
        if (isCorrect) total += maxPoints;
      }
      return;
    }

    if (question.q_type === 3 || question.q_type === 4 || question.q_type === 6) {
      total += toNumber(answerRow?.score_obtained);
    }
  });

  return Math.min(total, 100);
};

const ensureTeacherScope = async ({ pool, user, teacherId }) => {
  if (user.role === "admin") {
    if (!teacherId) {
      return { ok: false, status: 400, message: "Admin wajib memilih guru" };
    }

    const checkTeacher = await pool.query(
      `
        SELECT 1
        FROM u_teachers 
        WHERE user_id = $1 AND homebase_id = $2
        LIMIT 1
      `,
      [teacherId, user.homebase_id],
    );

    if (checkTeacher.rowCount === 0) {
      return { ok: false, status: 403, message: "Guru tidak sesuai homebase" };
    }

    return { ok: true, teacherId };
  }

  return { ok: true, teacherId: user.id };
};

const validateBankOwnership = async ({ pool, bankId, teacherId, user }) => {
  const bankCheck = await pool.query(
    `
      SELECT b.id
      FROM cbt.c_bank b
      LEFT JOIN u_teachers t ON b.teacher_id = t.user_id
      WHERE b.id = $1 AND b.teacher_id = $2
        AND ($3::text = 'teacher' OR t.homebase_id = $4)
      LIMIT 1
    `,
    [bankId, teacherId, user.role, user.homebase_id],
  );

  if (bankCheck.rowCount === 0) {
    return { ok: false, status: 403, message: "Bank soal tidak valid" };
  }

  return { ok: true };
};

const resolveClassIds = async ({
  pool,
  classIds,
  gradeId,
  homebaseId,
}) => {
  if (!gradeId) {
    return { ok: false, status: 400, message: "Grade wajib dipilih" };
  }

  const gradeCheck = await pool.query(
    `SELECT 1 FROM a_grade WHERE id = $1 AND homebase_id = $2 LIMIT 1`,
    [gradeId, homebaseId],
  );

  if (gradeCheck.rowCount === 0) {
    return { ok: false, status: 403, message: "Grade tidak sesuai homebase" };
  }

  let finalClassIds = classIds;

  if (finalClassIds.length === 0) {
    const classResult = await pool.query(
      `
        SELECT id
        FROM a_class
        WHERE homebase_id = $1 AND grade_id = $2
        ORDER BY name ASC
      `,
      [homebaseId, gradeId],
    );
    finalClassIds = classResult.rows.map((row) => row.id);
  }

  if (finalClassIds.length === 0) {
    return { ok: false, status: 400, message: "Kelas untuk grade ini belum ada" };
  }

  const classCheck = await pool.query(
    `
      SELECT id
      FROM a_class
      WHERE id = ANY($1::int[]) AND grade_id = $2 AND homebase_id = $3
    `,
    [finalClassIds, gradeId, homebaseId],
  );

  if (classCheck.rowCount !== finalClassIds.length) {
    return { ok: false, status: 400, message: "Kelas harus sesuai dengan grade" };
  }

  return { ok: true, classIds: finalClassIds };
};

// 1. GET List Jadwal Ujian
router.get(
  "/get-exams",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const { id: userId, role, homebase_id } = req.user;
    const normalizedSearch = String(search || "").trim();

    const offset = (page - 1) * limit;
    const params = [];
    const conditions = [];
    let paramIndex = 1;

    if (normalizedSearch) {
      params.push(`%${normalizedSearch}%`);
      conditions.push(`(
        e.name ILIKE $${paramIndex}
        OR b.title ILIKE $${paramIndex}
        OR s.name ILIKE $${paramIndex}
        OR t.full_name ILIKE $${paramIndex}
      )`);
      paramIndex++;
    }

    if (role === "teacher") {
      conditions.push(`b.teacher_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    } else if (role === "admin" && homebase_id) {
      conditions.push(`ut.homebase_id = $${paramIndex}`);
      params.push(homebase_id);
      paramIndex++;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const sql = `
      SELECT 
        e.id,
        e.name,
        e.duration_minutes,
        e.token,
        e.is_active,
        e.is_shuffle,
        e.grade_id,
        g.name as grade_name,
        e.created_at,
        b.id as bank_id,
        b.title as bank_title,
        b.type as bank_type,
        b.teacher_id as teacher_id,
        s.name as subject_name,
        s.code as subject_code,
        t.full_name as teacher_name,
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object('id', c.id, 'name', c.name)
          ) FILTER (WHERE c.id IS NOT NULL),
          '[]'
        ) as classes,
        COUNT(c.id) FILTER (WHERE c.id IS NOT NULL) as class_count
      FROM cbt.c_exam e
      JOIN cbt.c_bank b ON e.bank_id = b.id
      LEFT JOIN a_subject s ON b.subject_id = s.id
      LEFT JOIN u_users t ON b.teacher_id = t.id
      LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
      LEFT JOIN a_grade g ON e.grade_id = g.id
      LEFT JOIN cbt.c_exam_class ec ON ec.exam_id = e.id
      LEFT JOIN a_class c ON ec.class_id = c.id
      ${whereClause}
      GROUP BY e.id, b.id, s.name, s.code, t.full_name, g.name
      ORDER BY e.id DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const countSql = `
      SELECT COUNT(*) as total
      FROM cbt.c_exam e
      JOIN cbt.c_bank b ON e.bank_id = b.id
      LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
      LEFT JOIN a_subject s ON b.subject_id = s.id
      LEFT JOIN u_users t ON b.teacher_id = t.id
      ${whereClause}
    `;

    const queryParams = [...params, limit, offset];
    const countParams = [...params];

    const resultData = await pool.query(sql, queryParams);
    const data = resultData.rows;

    const resultCount = await pool.query(countSql, countParams);
    const total = parseInt(resultCount.rows[0]?.total || 0, 10);
    const hasMore = offset + data.length < total;

    res.json({
      data,
      page: parseInt(page, 10),
      total,
      hasMore,
    });
  }),
);

// 2. GET Banks for Jadwal Ujian (Filtered by Teacher)
router.get(
  "/get-banks-for-exam",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { teacher_id } = req.query;

    let finalTeacherId = userId;

    if (role === "admin") {
      if (!teacher_id) {
        return res
          .status(400)
          .json({ message: "Admin wajib memilih guru" });
      }
      finalTeacherId = parseInt(teacher_id, 10);

      const checkTeacher = await pool.query(
        `
          SELECT 1
          FROM u_teachers 
          WHERE user_id = $1 AND homebase_id = $2
          LIMIT 1
        `,
        [finalTeacherId, homebase_id],
      );

      if (checkTeacher.rowCount === 0) {
        return res
          .status(403)
          .json({ message: "Guru tidak sesuai homebase" });
      }
    }

    const sql = `
      SELECT 
        b.id,
        b.title,
        b.type,
        b.subject_id,
        b.created_at,
        s.name as subject_name,
        s.code as subject_code
      FROM cbt.c_bank b
      LEFT JOIN a_subject s ON b.subject_id = s.id
      WHERE b.teacher_id = $1
      ORDER BY b.created_at DESC
    `;

    const result = await pool.query(sql, [finalTeacherId]);
    res.json(result.rows);
  }),
);

// 2.5 GET Exams for Student by Class
router.get(
  "/student-exams",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const userId = req.user.id;

    const studentResult = await pool.query(
      `SELECT current_class_id FROM u_students WHERE user_id = $1 LIMIT 1`,
      [userId],
    );

    const currentClassId = studentResult.rows[0]?.current_class_id || null;

    const enrollmentResult = await pool.query(
      `SELECT class_id
       FROM u_class_enrollments
       WHERE student_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [userId],
    );

    const enrollmentClassId = enrollmentResult.rows[0]?.class_id || null;
    const classId = currentClassId || enrollmentClassId;

    if (!classId) {
      return res.json({ data: [] });
    }

    const result = await pool.query(
      `
        SELECT
          e.id,
          e.name,
          e.duration_minutes,
          e.is_active,
          e.created_at,
          b.title as bank_title,
          b.type as bank_type,
          s.name as subject_name,
          s.code as subject_code,
          t.full_name as teacher_name,
          g.name as grade_name,
          c.name as class_name
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN a_subject s ON b.subject_id = s.id
        LEFT JOIN u_users t ON b.teacher_id = t.id
        LEFT JOIN a_grade g ON e.grade_id = g.id
        JOIN cbt.c_exam_class ec ON ec.exam_id = e.id
        JOIN a_class c ON ec.class_id = c.id
        WHERE ec.class_id = $1 AND e.is_active = true
        ORDER BY e.created_at DESC
      `,
      [classId],
    );

    res.json({ data: result.rows });
  }),
);

// 2.6 POST Student enter exam (log attendance)
router.post(
  "/student-exams/enter",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const userId = req.user.id;
    const { exam_id, token, student_ip } = req.body;

    if (!exam_id || !token) {
      return res.status(400).json({ message: "Token ujian wajib diisi" });
    }

    const studentResult = await pool.query(
      `SELECT current_class_id FROM u_students WHERE user_id = $1 LIMIT 1`,
      [userId],
    );

    const currentClassId = studentResult.rows[0]?.current_class_id || null;

    const enrollmentResult = await pool.query(
      `SELECT class_id
       FROM u_class_enrollments
       WHERE student_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [userId],
    );

    const enrollmentClassId = enrollmentResult.rows[0]?.class_id || null;
    const classId = currentClassId || enrollmentClassId;

    if (!classId) {
      return res.status(400).json({ message: "Kelas siswa tidak ditemukan" });
    }

    const examCheck = await pool.query(
      `
        SELECT e.id, e.duration_minutes
        FROM cbt.c_exam e
        JOIN cbt.c_exam_class ec ON ec.exam_id = e.id
        WHERE e.id = $1
          AND ec.class_id = $2
          AND e.is_active = true
          AND UPPER(e.token) = UPPER($3)
        LIMIT 1
      `,
      [parseInt(exam_id, 10), classId, String(token).trim()],
    );

    if (examCheck.rowCount === 0) {
      return res.status(403).json({ message: "Token ujian tidak valid" });
    }
    const existingAttendance = await pool.query(
      `
        SELECT status
        FROM cbt.c_exam_attendance
        WHERE exam_id = $1 AND student_id = $2
        LIMIT 1
      `,
      [parseInt(exam_id, 10), userId],
    );

    if (existingAttendance.rowCount > 0) {
      const currentStatus = normalizeAttendanceStatus(
        existingAttendance.rows[0].status,
      );
      if (currentStatus === "pelanggaran") {
        return res.status(403).json({
          status: "pelanggaran",
          message:
            "Status ujian Anda pelanggaran. Hubungi pengawas untuk izin ulang.",
        });
      }
      if (currentStatus === "selesai") {
        return res.status(403).json({
          status: "selesai",
          message: "Ujian sudah selesai dikerjakan.",
        });
      }
      if (currentStatus === "mengerjakan") {
        return res.status(403).json({
          status: "mengerjakan",
          message: "Anda masih dalam sesi ujian. Lanjutkan ujian yang berjalan.",
        });
      }
    }

    const ipAddress = resolveStudentIpAddress(req, student_ip);
    const browser = req.headers["user-agent"] || "-";

    const logResult = await pool.query(
      `
        INSERT INTO cbt.c_exam_attendance AS attendance
          (
            exam_id,
            student_id,
            class_id,
            status,
            ip_address,
            browser,
            start_at,
            updated_at
          )
        VALUES
          ($1, $2, $3, 'mengerjakan', $4, $5, NOW(), NOW())
        ON CONFLICT (exam_id, student_id)
        DO UPDATE SET
          status = 'mengerjakan',
          ip_address = EXCLUDED.ip_address,
          browser = EXCLUDED.browser,
          start_at = COALESCE(attendance.start_at, EXCLUDED.start_at),
          updated_at = NOW()
        RETURNING id
      `,
      [parseInt(exam_id, 10), userId, classId, ipAddress, browser],
    );

    res.json({
      message: "Berhasil masuk ujian",
      log_id: logResult.rows[0]?.id,
    });
  }),
);

// 2.7 GET Questions for Student Exam
router.get(
  "/student-exams/:exam_id/questions",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const userId = req.user.id;
    const examId = parseInt(req.params.exam_id, 10);

    if (!Number.isInteger(examId)) {
      return res.status(400).json({ message: "Exam ID tidak valid" });
    }

    const studentResult = await pool.query(
      `SELECT current_class_id FROM u_students WHERE user_id = $1 LIMIT 1`,
      [userId],
    );

    const currentClassId = studentResult.rows[0]?.current_class_id || null;

    const enrollmentResult = await pool.query(
      `SELECT class_id
       FROM u_class_enrollments
       WHERE student_id = $1
       ORDER BY id DESC
       LIMIT 1`,
      [userId],
    );

    const enrollmentClassId = enrollmentResult.rows[0]?.class_id || null;
    const classId = currentClassId || enrollmentClassId;

    if (!classId) {
      return res.status(400).json({ message: "Kelas siswa tidak ditemukan" });
    }

    const examResult = await pool.query(
      `
        SELECT
          e.id,
          e.name,
          e.duration_minutes,
          e.is_shuffle,
          b.id as bank_id,
          b.title as bank_title,
          s.name as subject_name,
          s.code as subject_code
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN a_subject s ON b.subject_id = s.id
        JOIN cbt.c_exam_class ec ON ec.exam_id = e.id
        WHERE e.id = $1 AND e.is_active = true AND ec.class_id = $2
        LIMIT 1
      `,
      [examId, classId],
    );

    if (examResult.rowCount === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }

    const exam = examResult.rows[0];
    const sessionResult = await pool.query(
      `
        SELECT
          start_at,
          $3::int as duration_minutes,
          (start_at + ($3::int * INTERVAL '1 minute')) as end_at,
          GREATEST(
            0,
            FLOOR(
              EXTRACT(
                EPOCH FROM (
                  (start_at + ($3::int * INTERVAL '1 minute')) - NOW()
                )
              )
            )::int
          ) as remaining_seconds,
          status
        FROM cbt.c_exam_attendance
        WHERE exam_id = $1 AND student_id = $2
        LIMIT 1
      `,
      [examId, userId, exam.duration_minutes],
    );
    const session = sessionResult.rows[0] || null;
    if (!session) {
      return res.status(403).json({
        status: "belum_masuk",
        message: "Anda belum masuk ujian. Silakan masukkan token terlebih dahulu.",
      });
    }
    const normalizedSessionStatus = normalizeAttendanceStatus(session.status);
    if (normalizedSessionStatus !== "mengerjakan") {
      return res.status(403).json({
        status: normalizedSessionStatus,
        message:
          normalizedSessionStatus === "selesai"
            ? "Ujian sudah selesai dikerjakan."
            : "Status ujian tidak mengizinkan akses soal.",
      });
    }
    exam.session = session;
    const questionResult = await pool.query(
      `
        SELECT id, q_type, bloom_level, content, score_point, media_url, audio_url
        FROM cbt.c_question
        WHERE bank_id = $1
        ORDER BY id ASC
      `,
      [exam.bank_id],
    );

    let questions = questionResult.rows;
    if (questions.length > 0) {
      const questionIds = questions.map((q) => q.id);
      const optionsResult = await pool.query(
        `
          SELECT id, question_id, label, content, media_url, is_correct
          FROM cbt.c_question_options
          WHERE question_id = ANY($1::int[])
          ORDER BY id ASC
        `,
        [questionIds],
      );
      const options = optionsResult.rows;
      questions.forEach((question) => {
        question.options = options.filter(
          (opt) => opt.question_id === question.id,
        );
        if (question.q_type === 6 && question.options.length > 0) {
          question.right_options = shuffleArray(question.options);
        }
      });
    }

    if (exam.is_shuffle) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    return res.json({ exam, questions });
  }),
);

// 2.7.1 GET Student Answers for Exam
router.get(
  "/student-exams/:exam_id/answers",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const userId = req.user.id;
    const examId = parseInt(req.params.exam_id, 10);

    if (!Number.isInteger(examId)) {
      return res.status(400).json({ message: "Exam ID tidak valid" });
    }

    const attendanceResult = await pool.query(
      `
        SELECT status
        FROM cbt.c_exam_attendance
        WHERE exam_id = $1 AND student_id = $2
        LIMIT 1
      `,
      [examId, userId],
    );

    if (attendanceResult.rowCount === 0) {
      return res.status(403).json({
        status: "belum_masuk",
        message: "Anda belum masuk ujian. Silakan masukkan token.",
      });
    }

    const answerResult = await pool.query(
      `
        SELECT question_id, answer_json, is_doubt
        FROM cbt.c_student_answer
        WHERE exam_id = $1 AND student_id = $2
        ORDER BY question_id ASC
      `,
      [examId, userId],
    );

    return res.json({ data: answerResult.rows });
  }),
);

// 2.7.2 POST Student Answer (Autosave)
router.post(
  "/student-exams/:exam_id/answers",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const userId = req.user.id;
    const examId = parseInt(req.params.exam_id, 10);
    const { question_id, answer, is_doubt } = req.body || {};

    if (!Number.isInteger(examId)) {
      return res.status(400).json({ message: "Exam ID tidak valid" });
    }

    const questionId = parseInt(question_id, 10);
    if (!Number.isInteger(questionId)) {
      return res.status(400).json({ message: "Question ID tidak valid" });
    }

    const hasAnswer = Object.prototype.hasOwnProperty.call(req.body, "answer");
    const hasDoubt = Object.prototype.hasOwnProperty.call(req.body, "is_doubt");
    if (!hasAnswer && !hasDoubt) {
      return res.status(400).json({ message: "Data jawaban belum diisi" });
    }

    const attendanceResult = await pool.query(
      `
        SELECT status
        FROM cbt.c_exam_attendance
        WHERE exam_id = $1 AND student_id = $2
        LIMIT 1
      `,
      [examId, userId],
    );

    if (attendanceResult.rowCount === 0) {
      return res.status(403).json({
        status: "belum_masuk",
        message: "Anda belum masuk ujian. Silakan masukkan token.",
      });
    }

    const currentStatus = normalizeAttendanceStatus(
      attendanceResult.rows[0].status,
    );
    if (currentStatus !== "mengerjakan") {
      return res.status(403).json({
        status: currentStatus,
        message: "Status ujian tidak mengizinkan penyimpanan jawaban.",
      });
    }

    const questionCheck = await pool.query(
      `
        SELECT 1
        FROM cbt.c_question q
        JOIN cbt.c_exam e ON e.bank_id = q.bank_id
        WHERE q.id = $1 AND e.id = $2
        LIMIT 1
      `,
      [questionId, examId],
    );

    if (questionCheck.rowCount === 0) {
      return res.status(404).json({ message: "Soal tidak ditemukan" });
    }

    const insertFields = ["exam_id", "student_id", "question_id"];
    const insertValues = [examId, userId, questionId];
    const insertPlaceholders = ["$1", "$2", "$3"];
    const updateSet = [];

    if (hasAnswer) {
      insertFields.push("answer_json");
      insertValues.push(JSON.stringify(answer));
      insertPlaceholders.push(`$${insertValues.length}::jsonb`);
      updateSet.push("answer_json = EXCLUDED.answer_json");
    }

    if (hasDoubt) {
      insertFields.push("is_doubt");
      insertValues.push(Boolean(is_doubt));
      insertPlaceholders.push(`$${insertValues.length}`);
      updateSet.push("is_doubt = EXCLUDED.is_doubt");
    }

    updateSet.push("updated_at = NOW()");

    await pool.query(
      `
        INSERT INTO cbt.c_student_answer (${insertFields.join(", ")})
        VALUES (${insertPlaceholders.join(", ")})
        ON CONFLICT (exam_id, student_id, question_id)
        DO UPDATE SET ${updateSet.join(", ")}
      `,
      insertValues,
    );

    return res.json({ message: "Jawaban disimpan" });
  }),
);

// 2.8 POST Student finish exam
router.post(
  "/student-exams/:exam_id/violation",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const userId = req.user.id;
    const examId = parseInt(req.params.exam_id, 10);

    if (!Number.isInteger(examId)) {
      return res.status(400).json({ message: "Exam ID tidak valid" });
    }

    const attendanceResult = await pool.query(
      `
        SELECT status
        FROM cbt.c_exam_attendance
        WHERE exam_id = $1 AND student_id = $2
        LIMIT 1
      `,
      [examId, userId],
    );

    if (attendanceResult.rowCount === 0) {
      return res.status(403).json({
        status: "belum_masuk",
        message: "Anda belum masuk ujian. Silakan masukkan token.",
      });
    }

    const currentStatus = normalizeAttendanceStatus(
      attendanceResult.rows[0].status,
    );

    if (currentStatus === "pelanggaran") {
      return res.json({ message: "Status pelanggaran sudah tercatat." });
    }

    if (currentStatus === "selesai") {
      return res.status(403).json({
        status: "selesai",
        message: "Ujian sudah selesai dikerjakan.",
      });
    }

    if (currentStatus !== "mengerjakan") {
      return res.status(403).json({
        status: currentStatus,
        message: "Status ujian tidak mengizinkan perubahan ke pelanggaran.",
      });
    }

    await pool.query(
      `
        UPDATE cbt.c_exam_attendance
        SET status = 'pelanggaran',
            updated_at = NOW()
        WHERE exam_id = $1 AND student_id = $2
      `,
      [examId, userId],
    );

    return res.json({ message: "Pelanggaran ujian tercatat." });
  }),
);

// 2.8 POST Student finish exam
router.post(
  "/student-exams/:exam_id/finish",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const userId = req.user.id;
    const examId = parseInt(req.params.exam_id, 10);

    if (!Number.isInteger(examId)) {
      return res.status(400).json({ message: "Exam ID tidak valid" });
    }

    const attendanceResult = await pool.query(
      `
        SELECT status
        FROM cbt.c_exam_attendance
        WHERE exam_id = $1 AND student_id = $2
        LIMIT 1
      `,
      [examId, userId],
    );

    if (attendanceResult.rowCount === 0) {
      return res.status(403).json({
        status: "belum_masuk",
        message: "Anda belum masuk ujian. Silakan masukkan token.",
      });
    }

    const currentStatus = normalizeAttendanceStatus(
      attendanceResult.rows[0].status,
    );
    if (currentStatus === "selesai") {
      return res.json({ message: "Ujian sudah selesai." });
    }
    if (currentStatus === "pelanggaran") {
      return res.status(403).json({
        status: "pelanggaran",
        message: "Status ujian Anda pelanggaran.",
      });
    }

    await pool.query(
      `
        UPDATE cbt.c_exam_attendance
        SET status = 'selesai',
            updated_at = NOW()
        WHERE exam_id = $1 AND student_id = $2
      `,
      [examId, userId],
    );

    return res.json({ message: "Ujian selesai." });
  }),
);

// 2.9 GET Exam Attendance (Teacher/Admin)
router.get(
  "/exam-attendance/:exam_id",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const examId = parseInt(req.params.exam_id, 10);
    const user = req.user;

    if (!Number.isInteger(examId)) {
      return res.status(400).json({ message: "Exam ID tidak valid" });
    }

    const examCheck = await pool.query(
      `
        SELECT e.id, e.duration_minutes, b.teacher_id, ut.homebase_id
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
        WHERE e.id = $1
        LIMIT 1
      `,
      [examId],
    );

    if (examCheck.rowCount === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }

    const examOwner = examCheck.rows[0];
    if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }
    if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    const attendanceResult = await pool.query(
      `
        WITH student_class AS (
          SELECT
            s.user_id,
            s.nis,
            u.full_name,
            COALESCE(s.current_class_id, latest_enrollment.class_id) AS class_id
          FROM u_students s
          JOIN u_users u ON u.id = s.user_id
          LEFT JOIN LATERAL (
            SELECT class_id
            FROM u_class_enrollments
            WHERE student_id = s.user_id
            ORDER BY id DESC
            LIMIT 1
          ) AS latest_enrollment ON true
        )
        SELECT
          sc.user_id as id,
          sc.nis,
          sc.full_name as name,
          c.name as class_name,
          COALESCE(a.ip_address, '-') as ip,
          COALESCE(
            CASE
              WHEN a.browser IS NULL THEN '-'
              WHEN a.browser ILIKE '%Edg/%' THEN
                'Edge ' || COALESCE((regexp_match(a.browser, 'Edg/([0-9\\.]+)'))[1], '')
              WHEN a.browser ILIKE '%OPR/%' THEN
                'Opera ' || COALESCE((regexp_match(a.browser, 'OPR/([0-9\\.]+)'))[1], '')
              WHEN a.browser ILIKE '%Chrome/%' THEN
                'Chrome ' || COALESCE((regexp_match(a.browser, 'Chrome/([0-9\\.]+)'))[1], '')
              WHEN a.browser ILIKE '%Firefox/%' THEN
                'Firefox ' || COALESCE((regexp_match(a.browser, 'Firefox/([0-9\\.]+)'))[1], '')
              WHEN a.browser ILIKE '%Safari/%' THEN
                'Safari ' || COALESCE((regexp_match(a.browser, 'Version/([0-9\\.]+)'))[1], '')
              ELSE a.browser
            END,
            '-'
          ) as browser,
          COALESCE(
            to_char(a.start_at AT TIME ZONE 'Asia/Jakarta', 'DD Mon YYYY, HH24:MI'),
            '-'
          ) as start_at,
          COALESCE(a.status, 'belum_masuk') as status
        FROM cbt.c_exam_class ec
        JOIN a_class c ON c.id = ec.class_id
        JOIN student_class sc ON sc.class_id = c.id
        LEFT JOIN cbt.c_exam_attendance a
          ON a.exam_id = ec.exam_id AND a.student_id = sc.user_id
        WHERE ec.exam_id = $1
        ORDER BY c.name ASC, sc.full_name ASC
      `,
      [examId],
    );

    return res.json({
      data: attendanceResult.rows.map((row) => ({
        ...row,
        status: normalizeAttendanceStatus(row.status),
      })),
      duration_minutes: examOwner.duration_minutes,
    });
  }),
);

// 2.9.0 PUT Allow Student Exam (Teacher/Admin)
router.put(
  "/exam-attendance/:exam_id/student/:student_id/allow",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const examId = parseInt(req.params.exam_id, 10);
    const studentId = parseInt(req.params.student_id, 10);
    const { question_id } = req.body || {};
    const user = req.user;

    if (!Number.isInteger(examId) || !Number.isInteger(studentId)) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const examCheck = await client.query(
      `
        SELECT e.id, b.teacher_id, ut.homebase_id
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
        WHERE e.id = $1
        LIMIT 1
      `,
      [examId],
    );

    if (examCheck.rowCount === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }

    const examOwner = examCheck.rows[0];
    if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }
    if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    const allowStatus = await getAllowAttendanceStatus(client);
    const attendanceResult = await client.query(
      `
        UPDATE cbt.c_exam_attendance
        SET status = $3, updated_at = NOW()
        WHERE exam_id = $1 AND student_id = $2
        RETURNING id
      `,
      [examId, studentId, allowStatus],
    );

    if (attendanceResult.rowCount === 0) {
      return res.status(404).json({ message: "Log ujian tidak ditemukan" });
    }

    const questionId = parseInt(question_id, 10);
    if (Number.isInteger(questionId)) {
      await client.query(
        `
          DELETE FROM cbt.c_student_answer
          WHERE exam_id = $1 AND student_id = $2 AND question_id = $3
        `,
        [examId, studentId, questionId],
      );
    }

    return res.json({ message: "Siswa diizinkan mengikuti ujian" });
  }),
);

// 2.9.0.1 DELETE Repeat Student Exam (Teacher/Admin)
router.delete(
  "/exam-attendance/:exam_id/student/:student_id/repeat",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const examId = parseInt(req.params.exam_id, 10);
    const studentId = parseInt(req.params.student_id, 10);
    const user = req.user;

    if (!Number.isInteger(examId) || !Number.isInteger(studentId)) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const examCheck = await client.query(
      `
        SELECT e.id, b.teacher_id, ut.homebase_id
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
        WHERE e.id = $1
        LIMIT 1
      `,
      [examId],
    );

    if (examCheck.rowCount === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }

    const examOwner = examCheck.rows[0];
    if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }
    if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    await client.query(
      `
        DELETE FROM cbt.c_student_answer
        WHERE exam_id = $1 AND student_id = $2
      `,
      [examId, studentId],
    );

    const deleteAttendance = await client.query(
      `
        DELETE FROM cbt.c_exam_attendance
        WHERE exam_id = $1 AND student_id = $2
      `,
      [examId, studentId],
    );

    if (deleteAttendance.rowCount === 0) {
      return res.status(404).json({ message: "Log ujian tidak ditemukan" });
    }

    return res.json({ message: "Ujian diulang untuk siswa" });
  }),
);

// 2.9.0.2 PUT Finish Student Exam (Teacher/Admin)
router.put(
  "/exam-attendance/:exam_id/student/:student_id/finish",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const examId = parseInt(req.params.exam_id, 10);
    const studentId = parseInt(req.params.student_id, 10);
    const user = req.user;

    if (!Number.isInteger(examId) || !Number.isInteger(studentId)) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const examCheck = await pool.query(
      `
        SELECT e.id, b.teacher_id, ut.homebase_id
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
        WHERE e.id = $1
        LIMIT 1
      `,
      [examId],
    );

    if (examCheck.rowCount === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }

    const examOwner = examCheck.rows[0];
    if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }
    if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    const updateResult = await pool.query(
      `
        UPDATE cbt.c_exam_attendance
        SET status = 'selesai', updated_at = NOW()
        WHERE exam_id = $1 AND student_id = $2
      `,
      [examId, studentId],
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ message: "Log ujian tidak ditemukan" });
    }

    return res.json({ message: "Ujian diselesaikan" });
  }),
);

// 2.9.1 GET Exam Scores (Teacher/Admin)
router.get(
  "/exam-attendance/:exam_id/scores",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const examId = parseInt(req.params.exam_id, 10);
    const user = req.user;

    if (!Number.isInteger(examId)) {
      return res.status(400).json({ message: "Exam ID tidak valid" });
    }

    const examCheck = await pool.query(
      `
        SELECT e.id, b.teacher_id, ut.homebase_id
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
        WHERE e.id = $1
        LIMIT 1
      `,
      [examId],
    );

    if (examCheck.rowCount === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }

    const examOwner = examCheck.rows[0];
    if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }
    if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    const rosterResult = await pool.query(
      `
        WITH student_class AS (
          SELECT
            s.user_id,
            s.nis,
            u.full_name,
            COALESCE(s.current_class_id, latest_enrollment.class_id) AS class_id
          FROM u_students s
          JOIN u_users u ON u.id = s.user_id
          LEFT JOIN LATERAL (
            SELECT class_id
            FROM u_class_enrollments
            WHERE student_id = s.user_id
            ORDER BY id DESC
            LIMIT 1
          ) AS latest_enrollment ON true
        )
        SELECT
          sc.user_id as id,
          sc.nis,
          sc.full_name as name,
          c.name as class_name
        FROM cbt.c_exam_class ec
        JOIN a_class c ON c.id = ec.class_id
        JOIN student_class sc ON sc.class_id = c.id
        WHERE ec.exam_id = $1
        ORDER BY c.name ASC, sc.full_name ASC
      `,
      [examId],
    );

    const students = rosterResult.rows;
    if (students.length === 0) {
      return res.json({ data: [] });
    }

    const questionResult = await pool.query(
      `
        SELECT q.id, q.q_type, q.bloom_level, q.score_point
        FROM cbt.c_question q
        JOIN cbt.c_exam e ON e.bank_id = q.bank_id
        WHERE e.id = $1
        ORDER BY q.id ASC
      `,
      [examId],
    );

    const questions = questionResult.rows;
    const questionIds = questions.map((q) => q.id);

    let options = [];
    if (questionIds.length > 0) {
      const optionResult = await pool.query(
        `
          SELECT id, question_id, is_correct
          FROM cbt.c_question_options
          WHERE question_id = ANY($1::int[])
          ORDER BY id ASC
        `,
        [questionIds],
      );
      options = optionResult.rows;
    }

    const optionsByQuestion = options.reduce((acc, item) => {
      if (!acc[item.question_id]) acc[item.question_id] = [];
      acc[item.question_id].push(item);
      return acc;
    }, {});

    const studentIds = students.map((item) => item.id);
    const answerResult = await pool.query(
      `
        SELECT student_id, question_id, answer_json, score_obtained
        FROM cbt.c_student_answer
        WHERE exam_id = $1 AND student_id = ANY($2::int[])
      `,
      [examId, studentIds],
    );

    const answersByStudent = new Map();
    answerResult.rows.forEach((row) => {
      if (!answersByStudent.has(row.student_id)) {
        answersByStudent.set(row.student_id, new Map());
      }
      answersByStudent.get(row.student_id).set(row.question_id, row);
    });

    const scores = students.map((student) => {
      const answersByQuestion =
        answersByStudent.get(student.id) || new Map();
      const score = computeStudentScore({
        questions,
        optionsByQuestion,
        answersByQuestion,
      });
      return {
        id: student.id,
        nis: student.nis,
        name: student.name,
        class_name: student.class_name,
        score,
      };
    });

    return res.json({ data: scores });
  }),
);

// 2.9.2 GET Student Answer Matrix Report (Teacher/Admin)
router.get(
  "/exam-attendance/:exam_id/student-answer-report",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const examId = parseInt(req.params.exam_id, 10);
    const user = req.user;

    if (!Number.isInteger(examId)) {
      return res.status(400).json({ message: "Exam ID tidak valid" });
    }

    const examCheck = await pool.query(
      `
        SELECT
          e.id,
          e.name,
          e.duration_minutes,
          b.id as bank_id,
          b.title as bank_title,
          b.type as bank_type,
          b.teacher_id,
          s.name as subject_name,
          s.code as subject_code,
          t.full_name as teacher_name,
          g.name as grade_name,
          ut.homebase_id
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN a_subject s ON b.subject_id = s.id
        LEFT JOIN u_users t ON b.teacher_id = t.id
        LEFT JOIN a_grade g ON e.grade_id = g.id
        LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
        WHERE e.id = $1
        LIMIT 1
      `,
      [examId],
    );

    if (examCheck.rowCount === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }

    const examOwner = examCheck.rows[0];
    if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }
    if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    const rosterResult = await pool.query(
      `
        WITH student_class AS (
          SELECT
            s.user_id,
            s.nis,
            u.full_name,
            COALESCE(s.current_class_id, latest_enrollment.class_id) AS class_id
          FROM u_students s
          JOIN u_users u ON u.id = s.user_id
          LEFT JOIN LATERAL (
            SELECT class_id
            FROM u_class_enrollments
            WHERE student_id = s.user_id
            ORDER BY id DESC
            LIMIT 1
          ) AS latest_enrollment ON true
        )
        SELECT DISTINCT
          sc.user_id as id,
          sc.nis,
          sc.full_name as name,
          sc.class_id,
          c.name as class_name,
          COALESCE(a.status, 'belum_masuk') as status
        FROM cbt.c_exam_class ec
        JOIN a_class c ON c.id = ec.class_id
        JOIN student_class sc ON sc.class_id = c.id
        LEFT JOIN cbt.c_exam_attendance a
          ON a.exam_id = ec.exam_id AND a.student_id = sc.user_id
        WHERE ec.exam_id = $1
        ORDER BY c.name ASC, sc.full_name ASC
      `,
      [examId],
    );

    const students = rosterResult.rows.map((row) => ({
      ...row,
      status: normalizeAttendanceStatus(row.status),
    }));

    const questionResult = await pool.query(
      `
        SELECT q.id, q.q_type, q.bloom_level, q.content, q.score_point
        FROM cbt.c_question q
        JOIN cbt.c_exam e ON e.bank_id = q.bank_id
        WHERE e.id = $1
        ORDER BY q.id ASC
      `,
      [examId],
    );

    const questions = questionResult.rows;
    const questionIds = questions.map((q) => q.id);

    let options = [];
    if (questionIds.length > 0) {
      const optionResult = await pool.query(
        `
          SELECT id, question_id, label, content, is_correct
          FROM cbt.c_question_options
          WHERE question_id = ANY($1::int[])
          ORDER BY id ASC
        `,
        [questionIds],
      );
      options = optionResult.rows;
    }

    const optionsByQuestion = options.reduce((acc, item) => {
      if (!acc[item.question_id]) acc[item.question_id] = [];
      acc[item.question_id].push(item);
      return acc;
    }, {});

    const studentIds = students.map((item) => item.id);
    let answers = [];
    if (studentIds.length > 0) {
      const answerResult = await pool.query(
        `
          SELECT student_id, question_id, answer_json, score_obtained
          FROM cbt.c_student_answer
          WHERE exam_id = $1 AND student_id = ANY($2::int[])
        `,
        [examId, studentIds],
      );
      answers = answerResult.rows;
    }

    const answersByStudent = new Map();
    answers.forEach((row) => {
      if (!answersByStudent.has(row.student_id)) {
        answersByStudent.set(row.student_id, new Map());
      }
      answersByStudent.get(row.student_id).set(row.question_id, row);
    });

    const stripHtml = (value) =>
      String(value || "")
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();

    const questionTypeLabels = {
      1: "PG Jawaban Tunggal",
      2: "PG Multi Jawaban",
      3: "Uraian",
      4: "Isian Singkat",
      5: "Benar / Salah",
      6: "Menjodohkan",
    };

    const createOptionView = (option, index, qType) => {
      const content = stripHtml(option.content);
      const rawLabel = stripHtml(option.label);
      const marker = rawLabel || String.fromCharCode(65 + index);

      if (qType === 5) {
        return {
          ...option,
          marker: content || marker,
          text: content || marker,
          full: content || marker,
        };
      }

      if (qType === 6) {
        return {
          ...option,
          marker: String(index + 1),
          text: content || "-",
          label_text: rawLabel || `Premis ${index + 1}`,
          full: `${rawLabel || `Premis ${index + 1}`} -> ${content || "-"}`,
        };
      }

      return {
        ...option,
        marker,
        text: content || "-",
        full: `${marker}. ${content || "-"}`,
      };
    };

    const getQuestionOptions = (question) =>
      (optionsByQuestion[question.id] || []).map((option, index) =>
        createOptionView(option, index, question.q_type),
      );

    const formatQuestionKey = (question, questionOptions) => {
      if (question.q_type === 3) {
        return {
          display: "Manual",
          detail: "Penilaian manual",
        };
      }

      if (question.q_type === 6) {
        const pairs = questionOptions.map((option) => option.full);
        return {
          display: pairs.join("; ") || "-",
          detail: pairs.join("; ") || "-",
        };
      }

      const correctOptions = questionOptions.filter((option) => option.is_correct);
      if (question.q_type === 4) {
        const answers = correctOptions.map((option) => option.text || "-");
        return {
          display: answers.join(" / ") || "-",
          detail: answers.join(" / ") || "-",
        };
      }

      const compact = correctOptions.map((option) => option.marker);
      const detail = correctOptions.map((option) => option.full || option.marker);
      return {
        display: compact.join(", ") || "-",
        detail: detail.join("; ") || "-",
      };
    };

    const parsePairId = (pair, key) => {
      const value =
        pair?.[`${key}Id`] ??
        pair?.[`${key}_id`] ??
        pair?.[key];
      const parsed = parseInt(value, 10);
      return Number.isInteger(parsed) ? parsed : null;
    };

    const formatStudentAnswer = ({ question, answerRow, questionOptions }) => {
      const status = getQuestionAnswerStatus({
        question,
        answerRow,
        questionOptions,
      });
      const answerValue = answerRow?.answer_json;
      const maxPoints = toNumber(question.score_point);
      const isManualType = [3, 4, 6].includes(question.q_type);
      const score = isManualType
        ? toNumber(answerRow?.score_obtained)
        : status === "correct"
          ? maxPoints
          : 0;
      const emptyAnswer = {
        display: "-",
        detail: "Belum dijawab",
        status,
        score,
      };

      if (status === "unanswered") return emptyAnswer;

      if (question.q_type === 1 || question.q_type === 5) {
        const selectedId = parseInt(answerValue, 10);
        const selectedOption = questionOptions.find(
          (option) => option.id === selectedId,
        );
        return {
          display: selectedOption?.marker || "-",
          detail: selectedOption?.full || selectedOption?.marker || "-",
          status,
          score,
        };
      }

      if (question.q_type === 2) {
        const selectedIds = normalizeIdList(answerValue);
        const selectedOptions = questionOptions.filter((option) =>
          selectedIds.includes(option.id),
        );
        return {
          display: selectedOptions.map((option) => option.marker).join(", ") || "-",
          detail:
            selectedOptions
              .map((option) => option.full || option.marker)
              .join("; ") || "-",
          status,
          score,
        };
      }

      if (question.q_type === 3 || question.q_type === 4) {
        const textAnswer =
          typeof answerValue === "string" ? stripHtml(answerValue) : "";
        return {
          display: textAnswer || "-",
          detail: textAnswer || "-",
          status,
          score,
        };
      }

      if (question.q_type === 6) {
        const pairs = Array.isArray(answerValue) ? answerValue : [];
        const leftById = new Map(
          questionOptions.map((option) => [option.id, option.label_text]),
        );
        const rightById = new Map(
          questionOptions.map((option) => [option.id, option.text]),
        );
        const formattedPairs = pairs.map((pair) => {
          const leftId = parsePairId(pair, "left");
          const rightId = parsePairId(pair, "right");
          return `${leftById.get(leftId) || "-"} -> ${rightById.get(rightId) || "-"}`;
        });

        return {
          display: formattedPairs.join("; ") || "-",
          detail: formattedPairs.join("; ") || "-",
          status,
          score,
        };
      }

      return emptyAnswer;
    };

    const questionReports = questions.map((question, index) => {
      const questionOptions = getQuestionOptions(question);
      const key = formatQuestionKey(question, questionOptions);

      return {
        id: question.id,
        no: index + 1,
        q_type: question.q_type,
        type_label: questionTypeLabels[question.q_type] || "Unknown",
        bloom_level: question.bloom_level,
        bloom_label: getBloomLevelLabel(question.bloom_level),
        question: stripHtml(question.content),
        max_points: question.score_point || 0,
        key,
        options: questionOptions.map((option) => ({
          id: option.id,
          marker: option.marker,
          label: option.label_text || option.marker,
          content: option.text,
          full: option.full,
          is_correct: option.is_correct,
        })),
      };
    });

    const questionById = new Map(questions.map((question) => [question.id, question]));

    const reportStudents = students.map((student) => {
      const answersByQuestion = answersByStudent.get(student.id) || new Map();
      const cells = questionReports.map((questionReport) => {
        const question = questionById.get(questionReport.id);
        const cell = formatStudentAnswer({
          question,
          answerRow: answersByQuestion.get(questionReport.id),
          questionOptions: getQuestionOptions(question),
        });

        return {
          question_id: questionReport.id,
          question_no: questionReport.no,
          type_label: questionReport.type_label,
          answer: cell.display,
          detail: cell.detail,
          status: cell.status,
          score: cell.score,
        };
      });

      const answersByQuestionObject = cells.reduce((acc, cell) => {
        acc[cell.question_id] = cell;
        return acc;
      }, {});

      const score = computeStudentScore({
        questions,
        optionsByQuestion,
        answersByQuestion,
      });

      return {
        id: student.id,
        nis: student.nis,
        name: student.name,
        class_id: student.class_id,
        class_name: student.class_name,
        status: student.status,
        score,
        correct_count: cells.filter((cell) => cell.status === "correct").length,
        incorrect_count: cells.filter((cell) => cell.status === "incorrect").length,
        unanswered_count: cells.filter((cell) => cell.status === "unanswered").length,
        pending_review_count: cells.filter((cell) => cell.status === "pending_review").length,
        answers: cells,
        answers_by_question: answersByQuestionObject,
      };
    });

    const classes = [
      ...students
        .reduce((acc, student) => {
          if (!student.class_id) return acc;
          if (!acc.has(student.class_id)) {
            acc.set(student.class_id, {
              id: student.class_id,
              name: student.class_name,
              total_students: 0,
            });
          }
          acc.get(student.class_id).total_students += 1;
          return acc;
        }, new Map())
        .values(),
    ];

    const averageScore =
      reportStudents.length > 0
        ? Number(
            (
              reportStudents.reduce((sum, student) => sum + Number(student.score || 0), 0) /
              reportStudents.length
            ).toFixed(2),
          )
        : 0;

    return res.json({
      data: {
        exam: {
          id: examOwner.id,
          name: examOwner.name,
          duration_minutes: examOwner.duration_minutes,
          bank_id: examOwner.bank_id,
          bank_title: examOwner.bank_title,
          bank_type: examOwner.bank_type,
          subject_name: examOwner.subject_name,
          subject_code: examOwner.subject_code,
          teacher_name: examOwner.teacher_name,
          grade_name: examOwner.grade_name,
        },
        questions: questionReports,
        students: reportStudents,
        classes,
        summary: {
          total_students: reportStudents.length,
          total_questions: questionReports.length,
          average_score: averageScore,
          pending_review_count: reportStudents.reduce(
            (sum, student) => sum + Number(student.pending_review_count || 0),
            0,
          ),
        },
      },
    });
  }),
);

// 2.10 GET Student Answers for Exam (Teacher/Admin)
router.get(
  "/exam-attendance/:exam_id/student/:student_id/answers",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const examId = parseInt(req.params.exam_id, 10);
    const studentId = parseInt(req.params.student_id, 10);
    const user = req.user;

    if (!Number.isInteger(examId) || !Number.isInteger(studentId)) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const examCheck = await pool.query(
      `
        SELECT e.id, b.teacher_id, ut.homebase_id
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
        WHERE e.id = $1
        LIMIT 1
      `,
      [examId],
    );

    if (examCheck.rowCount === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }

    const examOwner = examCheck.rows[0];
    if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }
    if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    const questionResult = await pool.query(
      `
        SELECT q.id, q.q_type, q.bloom_level, q.content, q.score_point
        FROM cbt.c_question q
        JOIN cbt.c_exam e ON e.bank_id = q.bank_id
        WHERE e.id = $1
        ORDER BY q.id ASC
      `,
      [examId],
    );

    const questions = questionResult.rows;
    const questionIds = questions.map((q) => q.id);
    let options = [];

    if (questionIds.length > 0) {
      const optionResult = await pool.query(
        `
          SELECT id, question_id, label, content, is_correct
          FROM cbt.c_question_options
          WHERE question_id = ANY($1::int[])
          ORDER BY id ASC
        `,
        [questionIds],
      );
      options = optionResult.rows;
    }

    const answerResult = await pool.query(
      `
        SELECT question_id, answer_json, score_obtained
        FROM cbt.c_student_answer
        WHERE exam_id = $1 AND student_id = $2
      `,
      [examId, studentId],
    );

    const answerMap = new Map(
      answerResult.rows.map((row) => [row.question_id, row]),
    );

    const stripHtml = (value) =>
      String(value || "").replace(/<[^>]*>/g, "").trim();

    const optionByQuestion = options.reduce((acc, item) => {
      if (!acc[item.question_id]) acc[item.question_id] = [];
      acc[item.question_id].push(item);
      return acc;
    }, {});

    const items = questions.map((question, index) => {
      const questionOptions = optionByQuestion[question.id] || [];
      const optionText = (opt) => {
        const label = opt.label ? `${opt.label}. ` : "";
        return `${label}${stripHtml(opt.content)}`.trim();
      };

      const answerRow = answerMap.get(question.id);
      const answerValue = answerRow?.answer_json;
      const base = {
        id: question.id,
        no: index + 1,
        q_type: question.q_type,
        bloom_level: question.bloom_level,
        bloom_label: getBloomLevelLabel(question.bloom_level),
        question: stripHtml(question.content),
        maxPoints: question.score_point || 0,
      };

      if (question.q_type === 1) {
        const selectedId = Number(answerValue);
        const selectedOption = questionOptions.find(
          (opt) => opt.id === selectedId,
        );
        const correctOptions = questionOptions.filter((opt) => opt.is_correct);
        return {
          ...base,
          type: "single",
          options: questionOptions.map(optionText),
          selected: selectedOption ? optionText(selectedOption) : "-",
          correctAnswers: correctOptions.map(optionText),
          correct:
            selectedOption && correctOptions.length > 0
              ? correctOptions.some((opt) => opt.id === selectedOption.id)
              : null,
        };
      }

      if (question.q_type === 2) {
        const selectedIds = Array.isArray(answerValue)
          ? answerValue
              .map((value) => parseInt(value, 10))
              .filter((value) => Number.isInteger(value))
          : [];
        const selectedTexts = questionOptions
          .filter((opt) => selectedIds.includes(opt.id))
          .map(optionText);
        const correctIds = new Set(
          questionOptions.filter((opt) => opt.is_correct).map((opt) => opt.id),
        );
        const isCorrect =
          selectedIds.length > 0 &&
          selectedIds.every((id) => correctIds.has(id)) &&
          selectedIds.length === correctIds.size;
        return {
          ...base,
          type: "multi",
          options: questionOptions.map(optionText),
          selected: selectedTexts,
          correctAnswers: questionOptions
            .filter((opt) => opt.is_correct)
            .map(optionText),
          correct: selectedIds.length > 0 ? isCorrect : null,
        };
      }

      if (question.q_type === 3) {
        return {
          ...base,
          type: "essay",
          answer: typeof answerValue === "string" ? answerValue : "-",
          points: answerRow?.score_obtained ?? 0,
        };
      }

      if (question.q_type === 4) {
        return {
          ...base,
          type: "short",
          answer: typeof answerValue === "string" ? answerValue : "-",
          points: answerRow?.score_obtained ?? 0,
        };
      }

      if (question.q_type === 5) {
        const selectedId = Number(answerValue);
        const selectedOption = questionOptions.find(
          (opt) => opt.id === selectedId,
        );
        const correctOptions = questionOptions.filter((opt) => opt.is_correct);

        return {
          ...base,
          type: "true_false",
          options: questionOptions.map((opt) => stripHtml(opt.content) || "-"),
          selected: selectedOption ? stripHtml(selectedOption.content) : "-",
          correctAnswers: correctOptions.map(
            (opt) => stripHtml(opt.content) || "-",
          ),
          correct:
            selectedOption && correctOptions.length > 0
              ? correctOptions.some((opt) => opt.id === selectedOption.id)
              : null,
        };
      }

      if (question.q_type === 6) {
        const pairs = Array.isArray(answerValue) ? answerValue : [];
        const leftById = new Map(
          questionOptions.map((opt) => [opt.id, stripHtml(opt.label) || "-"]),
        );
        const rightById = new Map(
          questionOptions.map((opt) => [opt.id, stripHtml(opt.content) || "-"]),
        );
        return {
          ...base,
          type: "match",
          points: answerRow?.score_obtained ?? 0,
          matches: pairs.map((pair) => ({
            left: leftById.get(parseInt(pair.leftId, 10)) || "-",
            right: rightById.get(parseInt(pair.rightId, 10)) || "-",
            correct:
              pair?.rightId !== undefined &&
              pair?.rightId !== null &&
              String(pair.leftId) === String(pair.rightId),
          })),
          correctMatches: questionOptions.map((opt) => ({
            left: stripHtml(opt.label) || "-",
            right: stripHtml(opt.content) || "-",
          })),
        };
      }

      return { ...base, type: "unknown", options: [], selected: "-" };
    });

    return res.json({ data: items });
  }),
);

// 2.10.05 GET Exam Analysis by Question and Bloom Level
router.get(
  "/exam-analysis/:exam_id/bloom-level",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const examId = parseInt(req.params.exam_id, 10);
    const user = req.user;

    if (!Number.isInteger(examId)) {
      return res.status(400).json({ message: "Exam ID tidak valid" });
    }

    const examCheck = await pool.query(
      `
        SELECT e.id, e.name, b.teacher_id, ut.homebase_id
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
        WHERE e.id = $1
        LIMIT 1
      `,
      [examId],
    );

    if (examCheck.rowCount === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }

    const examOwner = examCheck.rows[0];
    if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }
    if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    const rosterResult = await pool.query(
      `
        WITH student_class AS (
          SELECT
            s.user_id,
            s.nis,
            u.full_name,
            COALESCE(s.current_class_id, latest_enrollment.class_id) AS class_id
          FROM u_students s
          JOIN u_users u ON u.id = s.user_id
          LEFT JOIN LATERAL (
            SELECT class_id
            FROM u_class_enrollments
            WHERE student_id = s.user_id
            ORDER BY id DESC
            LIMIT 1
          ) AS latest_enrollment ON true
        )
        SELECT DISTINCT
          sc.user_id as id,
          sc.nis,
          sc.full_name as name,
          sc.class_id,
          c.name as class_name
        FROM cbt.c_exam_class ec
        JOIN a_class c ON c.id = ec.class_id
        JOIN student_class sc ON sc.class_id = c.id
        WHERE ec.exam_id = $1
        ORDER BY c.name ASC, sc.full_name ASC
      `,
      [examId],
    );

    const students = rosterResult.rows;
    const totalStudents = students.length;
    const classes = [
      ...students
        .reduce((acc, student) => {
          if (!student.class_id) return acc;
          if (!acc.has(student.class_id)) {
            acc.set(student.class_id, {
              id: student.class_id,
              name: student.class_name,
              total_students: 0,
            });
          }
          acc.get(student.class_id).total_students += 1;
          return acc;
        }, new Map())
        .values(),
    ];

    const questionResult = await pool.query(
      `
        SELECT q.id, q.q_type, q.bloom_level, q.content, q.score_point
        FROM cbt.c_question q
        JOIN cbt.c_exam e ON e.bank_id = q.bank_id
        WHERE e.id = $1
        ORDER BY q.id ASC
      `,
      [examId],
    );

    const questions = questionResult.rows;
    if (questions.length === 0) {
      return res.json({
        exam: { id: examOwner.id, name: examOwner.name },
        total_students: totalStudents,
        classes,
        students,
        student_question_results: [],
        per_question: [],
        by_bloom_level: [],
      });
    }

    const questionIds = questions.map((q) => q.id);
    const optionResult = await pool.query(
      `
        SELECT id, question_id, is_correct
        FROM cbt.c_question_options
        WHERE question_id = ANY($1::int[])
        ORDER BY id ASC
      `,
      [questionIds],
    );

    const optionsByQuestion = optionResult.rows.reduce((acc, item) => {
      if (!acc[item.question_id]) acc[item.question_id] = [];
      acc[item.question_id].push(item);
      return acc;
    }, {});

    const studentIds = students.map((student) => student.id);
    let answers = [];
    if (studentIds.length > 0) {
      const answerResult = await pool.query(
        `
          SELECT student_id, question_id, answer_json, score_obtained
          FROM cbt.c_student_answer
          WHERE exam_id = $1 AND student_id = ANY($2::int[])
        `,
        [examId, studentIds],
      );
      answers = answerResult.rows;
    }

    const answersByQuestion = answers.reduce((acc, row) => {
      if (!acc[row.question_id]) acc[row.question_id] = new Map();
      acc[row.question_id].set(row.student_id, row);
      return acc;
    }, {});

    const stripHtml = (value) =>
      String(value || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

    const studentQuestionResults = [];
    const perQuestion = questions.map((question, index) => {
      const answerMap = answersByQuestion[question.id] || new Map();
      const stats = {
        correct_count: 0,
        incorrect_count: 0,
        unanswered_count: 0,
        pending_review_count: 0,
      };

      students.forEach((student) => {
        const status = getQuestionAnswerStatus({
          question,
          answerRow: answerMap.get(student.id),
          questionOptions: optionsByQuestion[question.id] || [],
        });

        studentQuestionResults.push({
          student_id: student.id,
          student_name: student.name,
          student_nis: student.nis,
          class_id: student.class_id,
          class_name: student.class_name,
          question_id: question.id,
          bloom_level: question.bloom_level,
          bloom_label: getBloomLevelLabel(question.bloom_level),
          status,
        });

        if (status === "correct") stats.correct_count += 1;
        else if (status === "incorrect") stats.incorrect_count += 1;
        else if (status === "pending_review") stats.pending_review_count += 1;
        else stats.unanswered_count += 1;
      });

      return {
        id: question.id,
        no: index + 1,
        q_type: question.q_type,
        bloom_level: question.bloom_level,
        bloom_label: getBloomLevelLabel(question.bloom_level),
        question: stripHtml(question.content),
        score_point: question.score_point || 0,
        total_students: totalStudents,
        ...stats,
        correct_percentage:
          totalStudents > 0
            ? Number(((stats.correct_count / totalStudents) * 100).toFixed(2))
            : 0,
      };
    });

    const bloomSummaryMap = new Map();
    perQuestion.forEach((item) => {
      const key = item.bloom_level ?? "none";
      if (!bloomSummaryMap.has(key)) {
        bloomSummaryMap.set(key, {
          bloom_level: item.bloom_level,
          bloom_label: getBloomLevelLabel(item.bloom_level),
          total_questions: 0,
          total_students: totalStudents,
          correct_count: 0,
          incorrect_count: 0,
          unanswered_count: 0,
          pending_review_count: 0,
        });
      }

      const current = bloomSummaryMap.get(key);
      current.total_questions += 1;
      current.correct_count += item.correct_count;
      current.incorrect_count += item.incorrect_count;
      current.unanswered_count += item.unanswered_count;
      current.pending_review_count += item.pending_review_count;
    });

    const byBloomLevel = [...bloomSummaryMap.values()].map((item) => {
      const totalAttempts = item.total_questions * item.total_students;
      return {
        ...item,
        correct_percentage:
          totalAttempts > 0
            ? Number(((item.correct_count / totalAttempts) * 100).toFixed(2))
            : 0,
      };
    });

    return res.json({
      exam: { id: examOwner.id, name: examOwner.name },
      total_students: totalStudents,
      classes,
      students,
      student_question_results: studentQuestionResults,
      per_question: perQuestion,
      by_bloom_level: byBloomLevel,
    });
  }),
);

// 2.10.1 PUT Score for Student Answer (Teacher/Admin)
router.put(
  "/exam-attendance/:exam_id/student/:student_id/answers/:question_id/score",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const examId = parseInt(req.params.exam_id, 10);
    const studentId = parseInt(req.params.student_id, 10);
    const questionId = parseInt(req.params.question_id, 10);
    const { score } = req.body || {};
    const user = req.user;

    if (
      !Number.isInteger(examId) ||
      !Number.isInteger(studentId) ||
      !Number.isInteger(questionId)
    ) {
      return res.status(400).json({ message: "Parameter tidak valid" });
    }

    const numericScore = Number(score);
    if (Number.isNaN(numericScore)) {
      return res.status(400).json({ message: "Nilai tidak valid" });
    }

    const examCheck = await pool.query(
      `
        SELECT e.id, b.teacher_id, ut.homebase_id
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
        WHERE e.id = $1
        LIMIT 1
      `,
      [examId],
    );

    if (examCheck.rowCount === 0) {
      return res.status(404).json({ message: "Ujian tidak ditemukan" });
    }

    const examOwner = examCheck.rows[0];
    if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }
    if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    const questionCheck = await pool.query(
      `
        SELECT 1
        FROM cbt.c_question q
        JOIN cbt.c_exam e ON e.bank_id = q.bank_id
        WHERE q.id = $1 AND e.id = $2
        LIMIT 1
      `,
      [questionId, examId],
    );

    if (questionCheck.rowCount === 0) {
      return res.status(404).json({ message: "Soal tidak ditemukan" });
    }

    await pool.query(
      `
        INSERT INTO cbt.c_student_answer (exam_id, student_id, question_id, score_obtained)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (exam_id, student_id, question_id)
        DO UPDATE SET score_obtained = EXCLUDED.score_obtained, updated_at = NOW()
      `,
      [examId, studentId, questionId, numericScore],
    );

    return res.json({ message: "Nilai tersimpan" });
  }),
);

// 3. CREATE Jadwal Ujian
router.post(
  "/create-exam",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const {
      bank_id,
      name,
      duration_minutes,
      token,
      is_active = true,
      is_shuffle = false,
      grade_id,
      class_ids = [],
      teacher_id,
    } = req.body;

    const user = req.user;

    if (!bank_id || !name || !duration_minutes) {
      return res.status(400).json({ message: "Form belum lengkap" });
    }

    const teacherScope = await ensureTeacherScope({
      pool: client,
      user,
      teacherId: teacher_id ? parseInt(teacher_id, 10) : null,
    });

    if (!teacherScope.ok) {
      return res
        .status(teacherScope.status)
        .json({ message: teacherScope.message });
    }

    const bankCheck = await validateBankOwnership({
      pool: client,
      bankId: parseInt(bank_id, 10),
      teacherId: teacherScope.teacherId,
      user,
    });

    if (!bankCheck.ok) {
      return res.status(bankCheck.status).json({ message: bankCheck.message });
    }

    const classIdsNormalized = normalizeIdArray(class_ids);
    const classResult = await resolveClassIds({
      pool: client,
      classIds: classIdsNormalized,
      gradeId: grade_id ? parseInt(grade_id, 10) : null,
      homebaseId: user.homebase_id,
    });

    if (!classResult.ok) {
      return res
        .status(classResult.status)
        .json({ message: classResult.message });
    }

    const finalToken =
      typeof token === "string" && token.trim().length > 0
        ? token.trim()
        : generateToken();

    const insertExam = await client.query(
      `
        INSERT INTO cbt.c_exam
          (bank_id, name, duration_minutes, token, is_active, is_shuffle, grade_id)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id
      `,
      [
        parseInt(bank_id, 10),
        name,
        parseInt(duration_minutes, 10),
        finalToken,
        is_active,
        is_shuffle,
        parseInt(grade_id, 10),
      ],
    );

    const examId = insertExam.rows[0].id;

    await client.query(
      `
        INSERT INTO cbt.c_exam_class (exam_id, class_id)
        SELECT $1, unnest($2::int[])
      `,
      [examId, classResult.classIds],
    );

    res.json({ message: "Jadwal ujian berhasil dibuat", id: examId });
  }),
);

// 4. UPDATE Jadwal Ujian
router.put(
  "/update-exam/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const {
      bank_id,
      name,
      duration_minutes,
      token,
      is_active = true,
      is_shuffle = false,
      grade_id,
      class_ids = [],
      teacher_id,
    } = req.body;

    const user = req.user;

    const examCheck = await client.query(
      `
        SELECT e.id, b.teacher_id, ut.homebase_id
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
        WHERE e.id = $1
      `,
      [id],
    );

    if (examCheck.rowCount === 0) {
      return res.status(404).json({ message: "Jadwal ujian tidak ditemukan" });
    }

    const examOwner = examCheck.rows[0];

    if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    const teacherScope = await ensureTeacherScope({
      pool: client,
      user,
      teacherId: teacher_id ? parseInt(teacher_id, 10) : null,
    });

    if (!teacherScope.ok) {
      return res
        .status(teacherScope.status)
        .json({ message: teacherScope.message });
    }

    if (!bank_id || !name || !duration_minutes) {
      return res.status(400).json({ message: "Form belum lengkap" });
    }

    const bankCheck = await validateBankOwnership({
      pool: client,
      bankId: parseInt(bank_id, 10),
      teacherId: teacherScope.teacherId,
      user,
    });

    if (!bankCheck.ok) {
      return res.status(bankCheck.status).json({ message: bankCheck.message });
    }

    const classIdsNormalized = normalizeIdArray(class_ids);
    const classResult = await resolveClassIds({
      pool: client,
      classIds: classIdsNormalized,
      gradeId: grade_id ? parseInt(grade_id, 10) : null,
      homebaseId: user.homebase_id,
    });

    if (!classResult.ok) {
      return res
        .status(classResult.status)
        .json({ message: classResult.message });
    }

    await client.query(
      `
        UPDATE cbt.c_exam
        SET bank_id = $1,
            name = $2,
            duration_minutes = $3,
            token = COALESCE($4, token),
            is_active = $5,
            is_shuffle = $6,
            grade_id = $7
        WHERE id = $8
      `,
      [
        parseInt(bank_id, 10),
        name,
        parseInt(duration_minutes, 10),
        token || null,
        is_active,
        is_shuffle,
        parseInt(grade_id, 10),
        id,
      ],
    );

    await client.query(`DELETE FROM cbt.c_exam_class WHERE exam_id = $1`, [id]);
    await client.query(
      `
        INSERT INTO cbt.c_exam_class (exam_id, class_id)
        SELECT $1, unnest($2::int[])
      `,
      [id, classResult.classIds],
    );

    res.json({ message: "Jadwal ujian berhasil diperbarui" });
  }),
);

// 5. DELETE Jadwal Ujian
router.delete(
  "/delete-exam/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const user = req.user;

    const examCheck = await client.query(
      `
        SELECT e.id, b.teacher_id, ut.homebase_id
        FROM cbt.c_exam e
        JOIN cbt.c_bank b ON e.bank_id = b.id
        LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
        WHERE e.id = $1
      `,
      [id],
    );

    if (examCheck.rowCount === 0) {
      return res.status(404).json({ message: "Jadwal ujian tidak ditemukan" });
    }

    const examOwner = examCheck.rows[0];

    if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
      return res.status(403).json({ message: "Akses tidak diizinkan" });
    }

    await client.query(`DELETE FROM cbt.c_exam WHERE id = $1`, [id]);
    res.json({ message: "Jadwal ujian berhasil dihapus" });
  }),
);

export default router;
