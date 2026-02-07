import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import multer from "multer";
import path from "path";

const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./server/assets/cbt/images");
  },

  filename: function (req, file, cb) {
    cb(
      null,
      path.parse(file.originalname).name +
        "-" +
        Date.now() +
        path.extname(file.originalname),
    );
  },
});

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "./server/assets/cbt/audios");
  },

  filename: (req, file, cb) => {
    cb(
      null,
      path.parse(file.originalname).name +
        "-" +
        Date.now() +
        path.extname(file.originalname),
    );
  },
});

const uploadImage = multer({ storage: imageStorage });
const uploadAudio = multer({ storage: audioStorage });

const router = Router();

/**
 * TIPE SOAL MAPPING (Frontend & Backend Agreement):
 * 1: PG Tunggal (Single Choice)
 * 2: PG Multi (Multiple Choice)
 * 3: Essay Uraian (Long Answer)
 * 4: Essay Singkat (Short Answer)
 * 5: Benar / Salah (True/False)
 * 6: Mencocokkan (Matching)
 */

// 1. GET Questions by Bank ID
router.get(
  "/get-questions/:bank_id",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { bank_id } = req.params;

    // Ambil Soal
    const sqlQuestion = `
      SELECT id, q_type, content, score_point 
      FROM c_question 
      WHERE bank_id = $1 
      ORDER BY id ASC
    `;
    const qRes = await pool.query(sqlQuestion, [bank_id]);
    const questions = qRes.rows;

    // Ambil Opsi Jawaban untuk semua soal tersebut
    if (questions.length > 0) {
      const qIds = questions.map((q) => q.id);
      const sqlOptions = `
        SELECT id, question_id, label, content, is_correct 
        FROM c_question_options 
        WHERE question_id = ANY($1::int[]) 
        ORDER BY id ASC
      `;
      const oRes = await pool.query(sqlOptions, [qIds]);
      const options = oRes.rows;

      // Gabungkan soal dengan opsinya
      questions.forEach((q) => {
        q.options = options.filter((opt) => opt.question_id === q.id);
      });
    }

    res.json(questions);
  }),
);

// 2. CREATE Question
router.post(
  "/create-question",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { bank_id, q_type, content, score_point, options } = req.body;

    // Insert Soal
    const sqlQ = `
      INSERT INTO c_question (bank_id, q_type, content, score_point)
      VALUES ($1, $2, $3, $4) RETURNING id
    `;
    const resQ = await client.query(sqlQ, [
      bank_id,
      q_type,
      content,
      score_point || 1,
    ]);
    const questionId = resQ.rows[0].id;

    // Insert Opsi (Jika ada)
    // Essay Uraian mungkin tidak punya opsi, tapi Essay Singkat punya (kunci jawaban)
    if (options && options.length > 0) {
      const sqlOpt = `
        INSERT INTO c_question_options (question_id, label, content, is_correct)
        VALUES ($1, $2, $3, $4)
      `;
      for (const opt of options) {
        // Sanitasi dasar
        const label = opt.label || null;
        const content = opt.content || "";
        const isCorrect = opt.is_correct || false;
        await client.query(sqlOpt, [questionId, label, content, isCorrect]);
      }
    }

    res.json({ message: "Soal berhasil dibuat", id: questionId });
  }),
);

// 3. UPDATE Question
router.put(
  "/update-question/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const { q_type, content, score_point, options } = req.body;

    // Update Header Soal
    await client.query(
      `UPDATE c_question SET content=$1, score_point=$2, q_type=$3 WHERE id=$4`,
      [content, score_point, q_type, id],
    );

    // Update Opsi: Strategi paling aman & mudah adalah Delete All -> Insert New
    // (Kecuali jika butuh tracking history ID opsi, tapi untuk CBT biasanya replace fine)
    await client.query(`DELETE FROM c_question_options WHERE question_id=$1`, [
      id,
    ]);

    if (options && options.length > 0) {
      const sqlOpt = `
        INSERT INTO c_question_options (question_id, label, content, is_correct)
        VALUES ($1, $2, $3, $4)
      `;
      for (const opt of options) {
        await client.query(sqlOpt, [
          id,
          opt.label || null,
          opt.content || "",
          opt.is_correct || false,
        ]);
      }
    }

    res.json({ message: "Soal berhasil diperbarui" });
  }),
);

// 4. DELETE Question
router.delete(
  "/delete-question/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    // Opsi otomatis terhapus karena constraint ON DELETE CASCADE di database
    await client.query(`DELETE FROM c_question WHERE id = $1`, [id]);
    res.json({ message: "Soal berhasil dihapus" });
  }),
);

// 5. Upload Bulk question
router.post(
  "/bulk-create",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: "Data tidak valid" });
    }

    for (const q of questions) {
      // 1. Insert Soal Utama
      const resQ = await client.query(
        `INSERT INTO c_question (bank_id, q_type, content, score_point) 
         VALUES ($1, $2, $3, $4) RETURNING id`,
        [q.bank_soal_id, q.q_type, q.content, q.score_point], // score_weight dari frontend
      );

      const questionId = resQ.rows[0].id;

      // 2. Insert Opsi/Jawaban
      if (q.options && q.options.length > 0) {
        const optQuery = `INSERT INTO c_question_options (question_id, label, content, is_correct) VALUES ($1, $2, $3, $4)`;
        for (const opt of q.options) {
          await client.query(optQuery, [
            questionId,
            opt.label || "", // Sekarang bisa menampung teks panjang hasil split '|'
            opt.content,
            opt.is_correct,
          ]);
        }
      }
    }

    res.json({
      success: true,
      message: `${questions.length} soal berhasil diimport`,
    });
  }),
);

// 6. Delete Bulk question
router.post(
  "/bulk-delete",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: "Pilih soal yang akan dihapus" });
    }

    await client.query(`DELETE FROM c_question WHERE id = ANY($1::int[])`, [
      ids,
    ]);

    res.json({ message: `${ids.length} soal berhasil dihapus` });
  }),
);

// Upload image editor
router.post("/upload/image", uploadImage.single("file"), (req, res) => {
  try {
    const imageLink = "/assets/cbt/images/" + req.file.filename;

    res.status(200).json({ url: imageLink });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

router.post("/upload/audio", uploadAudio.single("file"), (req, res) => {
  try {
    const audioLink = "/assets/cbt/audios/" + req.file.filename;

    res.status(200).json({ url: audioLink });
  } catch (error) {
    console.log(error);
    res.status(500).json({ error: error });
  }
});

export default router;
