import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// 1. GET List Bank Soal (Filtered by Role & Homebase)
router.get(
  "/get-banks",
  authorize("satuan", "teacher"),
  // UBAH DISINI: Argumen ke-3 adalah 'pool', bukan fungsi 'query'
  withQuery(async (req, res, pool) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const { id: userId, role, homebase_id } = req.user;

    const offset = (page - 1) * limit;

    // --- 1. Dynamic Query Builder ---
    const params = [`%${search}%`];
    const conditions = [`b.title ILIKE $1`];
    let paramIndex = 2;

    // Logika Filter
    if (role === "teacher") {
      // Guru: Hanya melihat bank soal miliknya
      conditions.push(`b.teacher_id = $${paramIndex}`);
      params.push(userId);
      paramIndex++;
    } else if (role === "admin" && homebase_id) {
      // Admin Satuan: Melihat bank soal milik guru di homebase yg sama
      // Join ke u_teachers (ut) diperlukan untuk cek homebase guru pembuat soal
      conditions.push(`ut.homebase_id = $${paramIndex}`);
      params.push(homebase_id);
      paramIndex++;
    }

    const whereClause = `WHERE ${conditions.join(" AND ")}`;

    // --- 2. Main Query ---
    const sql = `
      SELECT 
        b.id, 
        b.title, 
        b.type, 
        b.created_at,
        b.subject_id,  -- PENTING: Diperlukan untuk Default Value Dropdown Mapel
        b.teacher_id,  -- PENTING: Diperlukan untuk Default Value Dropdown Guru
        s.name as subject_name,
        s.code as subject_code,
        t.full_name as teacher_name
      FROM c_bank b
      LEFT JOIN a_subject s ON b.subject_id = s.id
      LEFT JOIN u_users t ON b.teacher_id = t.id
      LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id 
      ${whereClause}
      ORDER BY b.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    // --- 3. Count Query ---
    const countSql = `
      SELECT COUNT(*) as total 
      FROM c_bank b
      LEFT JOIN u_teachers ut ON b.teacher_id = ut.user_id
      ${whereClause}
    `;

    const queryParams = [...params, limit, offset];
    const countParams = [...params];

    // UBAH DISINI: Gunakan pool.query() dan ambil .rows
    const resultData = await pool.query(sql, queryParams);
    const data = resultData.rows;

    const resultCount = await pool.query(countSql, countParams);
    const countResult = resultCount.rows;

    const total = parseInt(countResult[0]?.total || 0);
    const hasMore = offset + data.length < total;

    res.json({
      data,
      page: parseInt(page),
      total,
      hasMore,
    });
  }),
);

// 2. GET Subjects (Untuk Dropdown di Form)
router.get(
  "/get-subjects",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    // Ubah argumen jadi pool
    const sql = `SELECT id, name, code FROM a_subject ORDER BY name ASC`;
    // Gunakan pool.query dan ambil .rows
    const result = await pool.query(sql);
    res.json(result.rows);
  }),
);

// 3. CREATE Bank Soal
router.post(
  "/create-bank",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { title, subject_id, type, teacher_id } = req.body;
    const { id: userId, role } = req.user;

    // LOGIKA PENENTUAN GURU
    let finalTeacherId = userId; // Default: Diri sendiri (untuk guru)

    if (role === "admin") {
      if (!teacher_id) {
        return res.status(400).json({ message: "Admin wajib memilih guru" });
      }
      finalTeacherId = teacher_id;
    }

    const sql = `
      INSERT INTO c_bank (teacher_id, subject_id, title, type)
      VALUES ($1, $2, $3, $4) RETURNING id
    `;
    const result = await client.query(sql, [
      finalTeacherId,
      subject_id,
      title,
      type,
    ]);

    res.json({ message: "Bank soal berhasil dibuat", id: result.rows[0].id });
  }),
);

// 4. UPDATE Bank Soal
router.put(
  "/update-bank/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const { title, subject_id, type, teacher_id } = req.body;
    const { role } = req.user;

    // Query dulu data lama untuk cek kepemilikan (jika perlu validasi ketat)
    // Untuk simplifikasi, kita update field yang dikirim saja

    let sql, params;

    if (role === "admin") {
      // Admin bisa ganti teacher_id
      sql = `
            UPDATE c_bank 
            SET title = $1, subject_id = $2, type = $3, teacher_id = $4
            WHERE id = $5
         `;
      params = [title, subject_id, type, teacher_id, id];
    } else {
      // Guru TIDAK BISA ganti teacher_id (tetap punya dia)
      sql = `
            UPDATE c_bank 
            SET title = $1, subject_id = $2, type = $3
            WHERE id = $4
         `;
      params = [title, subject_id, type, id];
    }

    await client.query(sql, params);
    res.json({ message: "Bank soal berhasil diperbarui" });
  }),
);

// 5. DELETE Bank Soal
router.delete(
  "/delete-bank/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    await client.query(`DELETE FROM c_bank WHERE id = $1`, [id]);
    res.json({ message: "Bank soal berhasil dihapus" });
  }),
);

router.get(
  "/get-teachers",
  authorize("satuan", "admin"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;

    // Ambil guru yang satu homebase dengan admin
    const sql = `
        SELECT u.id, u.full_name 
        FROM u_users u
        JOIN u_teachers t ON u.id = t.user_id
        WHERE t.homebase_id = $1 AND u.is_active = true
        ORDER BY u.full_name ASC
    `;
    const result = await pool.query(sql, [homebase_id]);
    res.json(result.rows);
  }),
);

// 6. GET Banks for Grouping (Filtered by Teacher)
router.get(
  "/get-banks-for-group",
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
        s.code as subject_code,
        t.full_name as teacher_name,
        COALESCE(COUNT(q.id), 0) as total_questions,
        COALESCE(SUM(q.score_point), 0) as total_points
      FROM c_bank b
      LEFT JOIN c_question q ON q.bank_id = b.id
      LEFT JOIN a_subject s ON b.subject_id = s.id
      LEFT JOIN u_users t ON b.teacher_id = t.id
      WHERE b.teacher_id = $1
      GROUP BY b.id, s.name, s.code, t.full_name
      ORDER BY b.created_at DESC
    `;

    const result = await pool.query(sql, [finalTeacherId]);
    res.json(result.rows);
  }),
);

// 7. GROUP Banks and Create New Bank
router.post(
  "/group-bank",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { title, teacher_id, bank_ids = [], questions = [] } = req.body;
    const { id: userId, role, homebase_id } = req.user;

    if (!title) {
      return res.status(400).json({ message: "Nama bank soal wajib diisi" });
    }

    if (!Array.isArray(bank_ids) || bank_ids.length < 2) {
      return res
        .status(400)
        .json({ message: "Minimal pilih 2 bank soal" });
    }

    let finalTeacherId = userId;

    if (role === "admin") {
      if (!teacher_id) {
        return res
          .status(400)
          .json({ message: "Admin wajib memilih guru" });
      }
      finalTeacherId = parseInt(teacher_id, 10);

      const checkTeacher = await client.query(
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

    const bankIds = bank_ids.map((id) => parseInt(id, 10)).filter(Boolean);

    if (bankIds.length < 2) {
      return res
        .status(400)
        .json({ message: "Minimal pilih 2 bank soal" });
    }

    const bankCheck = await client.query(
      `SELECT id, subject_id FROM c_bank WHERE id = ANY($1::int[]) AND teacher_id = $2`,
      [bankIds, finalTeacherId],
    );

    if (bankCheck.rowCount !== bankIds.length) {
      return res
        .status(400)
        .json({ message: "Bank soal tidak valid atau bukan milik guru" });
    }

    const subjectIds = [
      ...new Set(bankCheck.rows.map((row) => row.subject_id).filter(Boolean)),
    ];
    const finalSubjectId = subjectIds.length === 1 ? subjectIds[0] : null;

    if (!Array.isArray(questions) || questions.length < 1) {
      return res
        .status(400)
        .json({ message: "Pilih minimal 1 soal untuk digabungkan" });
    }

    const normalizedQuestions = questions
      .map((q) => ({
        question_id: parseInt(q.question_id, 10),
        score_point: parseInt(q.score_point, 10),
      }))
      .filter((q) => q.question_id && q.score_point);

    if (normalizedQuestions.length !== questions.length) {
      return res
        .status(400)
        .json({ message: "Poin soal wajib diisi" });
    }

    const totalPoints = normalizedQuestions.reduce(
      (acc, q) => acc + q.score_point,
      0,
    );

    if (totalPoints !== 100) {
      return res.status(400).json({
        message: "Total poin gabungan harus 100",
      });
    }

    const questionIds = normalizedQuestions.map((q) => q.question_id);

    const questionResult = await client.query(
      `
        SELECT id, bank_id, q_type, content, media_url, audio_url
        FROM c_question
        WHERE id = ANY($1::int[])
      `,
      [questionIds],
    );

    if (questionResult.rowCount !== questionIds.length) {
      return res
        .status(400)
        .json({ message: "Soal tidak valid atau tidak ditemukan" });
    }

    const questionById = new Map(
      questionResult.rows.map((row) => [row.id, row]),
    );

    const bankSet = new Set(bankIds);
    const bankCoverage = new Set();

    for (const q of questionResult.rows) {
      if (!bankSet.has(q.bank_id)) {
        return res
          .status(400)
          .json({ message: "Soal tidak berasal dari bank terpilih" });
      }
      bankCoverage.add(q.bank_id);
    }

    if (bankCoverage.size !== bankIds.length) {
      return res.status(400).json({
        message: "Setiap bank soal harus memiliki minimal 1 soal terpilih",
      });
    }

    const optionsResult = await client.query(
      `
        SELECT question_id, label, content, media_url, is_correct
        FROM c_question_options
        WHERE question_id = ANY($1::int[])
      `,
      [questionIds],
    );

    const optionsByQuestionId = optionsResult.rows.reduce((acc, opt) => {
      if (!acc[opt.question_id]) acc[opt.question_id] = [];
      acc[opt.question_id].push(opt);
      return acc;
    }, {});

    const insertBankResult = await client.query(
      `
        INSERT INTO c_bank (teacher_id, subject_id, title, type)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [finalTeacherId, finalSubjectId, title, "GB"],
    );

    const newBankId = insertBankResult.rows[0].id;

    const pointByQuestion = new Map(
      normalizedQuestions.map((q) => [q.question_id, q.score_point]),
    );

    for (const q of questionResult.rows) {
      const forcedPoint = pointByQuestion.get(q.id) || 1;
      const insertQuestion = await client.query(
        `
          INSERT INTO c_question (bank_id, q_type, content, media_url, audio_url, score_point)
          VALUES ($1, $2, $3, $4, $5, $6)
          RETURNING id
        `,
        [
          newBankId,
          q.q_type,
          q.content,
          q.media_url,
          q.audio_url,
          forcedPoint,
        ],
      );

      const newQuestionId = insertQuestion.rows[0].id;
      const options = optionsByQuestionId[q.id] || [];

      for (const opt of options) {
        await client.query(
          `
            INSERT INTO c_question_options (question_id, label, content, media_url, is_correct)
            VALUES ($1, $2, $3, $4, $5)
          `,
          [newQuestionId, opt.label, opt.content, opt.media_url, opt.is_correct],
        );
      }
    }

    res.json({
      message: "Bank soal gabungan berhasil dibuat",
      id: newBankId,
      total_questions: questionResult.rows.length,
      total_points: totalPoints,
    });
  }),
);

// 8. GET Questions for Grouping
router.get(
  "/get-questions-for-group",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { bank_ids = "" } = req.query;

    const bankIds = bank_ids
      .split(",")
      .map((id) => parseInt(id, 10))
      .filter(Boolean);

    if (bankIds.length === 0) {
      return res.json([]);
    }

    let teacherId = userId;

    if (role === "admin") {
      const bankCheck = await pool.query(
        `
          SELECT b.id
          FROM c_bank b
          JOIN u_teachers t ON b.teacher_id = t.user_id
          WHERE b.id = ANY($1::int[]) AND t.homebase_id = $2
        `,
        [bankIds, homebase_id],
      );

      if (bankCheck.rowCount !== bankIds.length) {
        return res
          .status(403)
          .json({ message: "Bank soal tidak sesuai homebase" });
      }
    }

    if (role === "teacher") {
      const bankCheck = await pool.query(
        `SELECT id FROM c_bank WHERE id = ANY($1::int[]) AND teacher_id = $2`,
        [bankIds, teacherId],
      );

      if (bankCheck.rowCount !== bankIds.length) {
        return res
          .status(403)
          .json({ message: "Bank soal bukan milik guru" });
      }
    }

    const sql = `
      SELECT 
        q.id,
        q.bank_id,
        q.q_type,
        q.content,
        q.score_point,
        b.title as bank_title
      FROM c_question q
      JOIN c_bank b ON q.bank_id = b.id
      WHERE q.bank_id = ANY($1::int[])
      ORDER BY b.title ASC, q.id ASC
    `;

    const result = await pool.query(sql, [bankIds]);
    res.json(result.rows);
  }),
);

export default router;
