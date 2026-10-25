import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  dissolveUndersizedGroups,
  hasStimulusContent,
} from "../../services/cbt/questionGroup.js";
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

const normalizeBloomLevel = (value) => {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const parsed = parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 6) {
    return null;
  }

  return parsed;
};

const normalizeRubricItems = (rubric = []) => {
  if (!Array.isArray(rubric)) return [];

  return rubric
    .map((item, index) => {
      const criteriaName = String(item?.criteria_name || "").trim();
      const criteriaDescription = String(
        item?.criteria_description || "",
      ).trim();
      const parsedScore = Number(item?.max_score);
      const maxScore = Number.isFinite(parsedScore) ? parsedScore : 0;
      const parsedTemplateId = parseInt(
        item?.template_id ?? item?.rubric_template_id,
        10,
      );

      return {
        criteria_name: criteriaName,
        criteria_description: criteriaDescription,
        max_score: Math.max(0, maxScore),
        order_no: index + 1,
        template_id: Number.isInteger(parsedTemplateId) ? parsedTemplateId : null,
      };
    })
    .filter((item) => item.criteria_name);
};

const normalizeRichTextField = (value) => {
  if (value === undefined || value === null) return "";
  return String(value);
};

const collectImportGroups = (questions) => {
  const groups = [];
  let current = null;
  const seenCodes = new Set();

  questions.forEach((question, index) => {
    const code = String(question.group_code || "").trim();
    const normalizedCode = code.toLowerCase();
    const title = String(question.group_title || "").trim();
    const stimulus = String(question.stimulus || "").trim();
    const label = `soal ke-${index + 1}`;

    if (!normalizedCode) {
      if (title || stimulus) {
        const error = new Error(
          `${label} mengisi bacaan tanpa group_code.`,
        );
        error.statusCode = 400;
        throw error;
      }
      current = null;
      question._group = null;
      question._groupOrder = null;
      return;
    }

    if (!current || current.normalizedCode !== normalizedCode) {
      if (seenCodes.has(normalizedCode)) {
        const error = new Error(
          `Kode grup "${code}" terputus. Soal dalam satu grup harus ditulis berurutan.`,
        );
        error.statusCode = 400;
        throw error;
      }
      seenCodes.add(normalizedCode);
      current = {
        code,
        normalizedCode,
        title: title || null,
        stimulus,
        count: 0,
      };
      groups.push(current);
    } else if (stimulus && current.stimulus && stimulus !== current.stimulus) {
      const error = new Error(
        `Teks bacaan grup "${current.code}" tidak sama pada ${label}.`,
      );
      error.statusCode = 400;
      throw error;
    } else {
      if (!current.stimulus && stimulus) current.stimulus = stimulus;
      if (!current.title && title) current.title = title;
    }

    current.count += 1;
    question._group = current;
    question._groupOrder = current.count;
  });

  groups.forEach((group) => {
    if (group.count < 2) {
      const error = new Error(
        `Grup "${group.code}" hanya berisi 1 soal. Satu grup minimal 2 soal.`,
      );
      error.statusCode = 400;
      throw error;
    }
    if (!group.stimulus) {
      const error = new Error(
        `Grup "${group.code}" wajib memiliki teks bacaan pada kolom stimulus.`,
      );
      error.statusCode = 400;
      throw error;
    }
    if (group.title && group.title.length > 255) {
      const error = new Error(
        `Judul grup "${group.code}" maksimal 255 karakter.`,
      );
      error.statusCode = 400;
      throw error;
    }
  });

  return groups;
};

const normalizeQuestionOptions = (options = []) => {
  if (!Array.isArray(options)) return [];

  return options.map((option) => ({
    label:
      option?.label === undefined || option?.label === null
        ? null
        : String(option.label),
    content: normalizeRichTextField(option?.content),
    is_correct: Boolean(option?.is_correct),
  }));
};

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
  "/rubric-templates",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const templateResult = await pool.query(
      `
        SELECT id, code, name, category, description
        FROM cbt.c_rubric_template
        WHERE is_active = true
        ORDER BY id ASC
      `,
    );

    const templates = templateResult.rows;
    const templateIds = templates.map((item) => item.id);
    let templateItems = [];

    if (templateIds.length > 0) {
      const itemResult = await pool.query(
        `
          SELECT id, template_id, criteria_name, criteria_description, default_weight, order_no
          FROM cbt.c_rubric_template_item
          WHERE template_id = ANY($1::int[])
          ORDER BY template_id ASC, order_no ASC, id ASC
        `,
        [templateIds],
      );
      templateItems = itemResult.rows;
    }

    const itemsByTemplate = templateItems.reduce((acc, item) => {
      if (!acc[item.template_id]) acc[item.template_id] = [];
      acc[item.template_id].push(item);
      return acc;
    }, {});

    res.json(
      templates.map((template) => ({
        ...template,
        items: itemsByTemplate[template.id] || [],
      })),
    );
  }),
);

// 1. GET Questions by Bank ID
router.get(
  "/get-questions/:bank_id",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { bank_id } = req.params;

    // Ambil Soal
    const sqlQuestion = `
      SELECT
        q.id,
        q.q_type,
        q.bloom_level,
        COALESCE(q.content, '') AS content,
        q.score_point,
        q.group_id,
        q.group_order,
        qg.title AS group_title,
        COALESCE(qg.stimulus, '') AS group_stimulus
      FROM cbt.c_question q
      LEFT JOIN cbt.c_question_group qg ON qg.id = q.group_id
      WHERE q.bank_id = $1
      ORDER BY COALESCE(qg.order_no, q.id), COALESCE(q.group_order, 0), q.id
    `;
    const qRes = await pool.query(sqlQuestion, [bank_id]);
    const questions = qRes.rows;

    // Ambil Opsi Jawaban untuk semua soal tersebut
    if (questions.length > 0) {
      const qIds = questions.map((q) => q.id);
      const sqlOptions = `
        SELECT id, question_id, COALESCE(label, '') AS label, COALESCE(content, '') AS content, is_correct 
        FROM cbt.c_question_options
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

    if (questions.length > 0) {
      const qIds = questions.map((q) => q.id);
      const rubricResult = await pool.query(
        `
          SELECT id, question_id, template_id, COALESCE(criteria_name, '') AS criteria_name, COALESCE(criteria_description, '') AS criteria_description, max_score, order_no
          FROM cbt.c_question_rubric
          WHERE question_id = ANY($1::int[])
          ORDER BY question_id ASC, order_no ASC, id ASC
        `,
        [qIds],
      );
      const rubricRows = rubricResult.rows;

      questions.forEach((q) => {
        const rubric = rubricRows.filter((item) => item.question_id === q.id);
        q.rubric = rubric;
        q.rubric_template_id = rubric[0]?.template_id || null;
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
    const {
      bank_id,
      q_type,
      content,
      score_point,
      bloom_level,
      options,
      rubric_template_id,
      rubric,
    } =
      req.body;
    const normalizedBloomLevel = normalizeBloomLevel(bloom_level);
    const normalizedContent = normalizeRichTextField(content);
    const normalizedOptions = normalizeQuestionOptions(options);
    const normalizedRubric = q_type === 3 ? normalizeRubricItems(rubric) : [];

    // Insert Soal
    const sqlQ = `
      INSERT INTO cbt.c_question (bank_id, q_type, bloom_level, content, score_point)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `;
    const resQ = await client.query(sqlQ, [
      bank_id,
      q_type,
      normalizedBloomLevel,
      normalizedContent,
      score_point || 1,
    ]);
    const questionId = resQ.rows[0].id;

    // Insert Opsi (Jika ada)
    // Essay Uraian mungkin tidak punya opsi, tapi Essay Singkat punya (kunci jawaban)
    if (normalizedOptions.length > 0) {
      const sqlOpt = `
        INSERT INTO cbt.c_question_options (question_id, label, content, is_correct)
        VALUES ($1, $2, $3, $4)
      `;
      for (const opt of normalizedOptions) {
        await client.query(sqlOpt, [
          questionId,
          opt.label,
          opt.content,
          opt.is_correct,
        ]);
      }
    }

    if (q_type === 3 && normalizedRubric.length > 0) {
      const rubricTemplateId = parseInt(rubric_template_id, 10);
      const questionScorePoint = Number(score_point || 1);
      const rubricTotal = normalizedRubric.reduce(
        (sum, item) => sum + Number(item.max_score || 0),
        0,
      );

      if (Math.abs(rubricTotal - questionScorePoint) > 0.001) {
        return res.status(400).json({
          message: "Total poin rubric harus sama dengan bobot skor soal",
        });
      }

      const sqlRubric = `
        INSERT INTO cbt.c_question_rubric (
          question_id,
          template_id,
          criteria_name,
          criteria_description,
          max_score,
          order_no
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      for (const item of normalizedRubric) {
        await client.query(sqlRubric, [
          questionId,
          Number.isInteger(rubricTemplateId)
            ? rubricTemplateId
            : item.template_id,
          item.criteria_name,
          item.criteria_description,
          item.max_score,
          item.order_no,
        ]);
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
    const {
      q_type,
      content,
      score_point,
      bloom_level,
      options,
      rubric_template_id,
      rubric,
    } = req.body;
    const normalizedBloomLevel = normalizeBloomLevel(bloom_level);
    const normalizedContent = normalizeRichTextField(content);
    const normalizedOptions = normalizeQuestionOptions(options);
    const normalizedRubric = q_type === 3 ? normalizeRubricItems(rubric) : [];

    // Update Header Soal
    await client.query(
      `UPDATE cbt.c_question SET content=$1, score_point=$2, q_type=$3, bloom_level=$4 WHERE id=$5`,
      [normalizedContent, score_point, q_type, normalizedBloomLevel, id],
    );

    // Update Opsi: Strategi paling aman & mudah adalah Delete All -> Insert New
    // (Kecuali jika butuh tracking history ID opsi, tapi untuk CBT biasanya replace fine)
    await client.query(`DELETE FROM cbt.c_question_options WHERE question_id=$1`, [
      id,
    ]);

    if (normalizedOptions.length > 0) {
      const sqlOpt = `
        INSERT INTO cbt.c_question_options (question_id, label, content, is_correct)
        VALUES ($1, $2, $3, $4)
      `;
      for (const opt of normalizedOptions) {
        await client.query(sqlOpt, [id, opt.label, opt.content, opt.is_correct]);
      }
    }

    await client.query(`DELETE FROM cbt.c_question_rubric WHERE question_id=$1`, [id]);

    if (q_type === 3 && normalizedRubric.length > 0) {
      const rubricTemplateId = parseInt(rubric_template_id, 10);
      const questionScorePoint = Number(score_point || 1);
      const rubricTotal = normalizedRubric.reduce(
        (sum, item) => sum + Number(item.max_score || 0),
        0,
      );

      if (Math.abs(rubricTotal - questionScorePoint) > 0.001) {
        return res.status(400).json({
          message: "Total poin rubric harus sama dengan bobot skor soal",
        });
      }

      const sqlRubric = `
        INSERT INTO cbt.c_question_rubric (
          question_id,
          template_id,
          criteria_name,
          criteria_description,
          max_score,
          order_no
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      for (const item of normalizedRubric) {
        await client.query(sqlRubric, [
          id,
          Number.isInteger(rubricTemplateId)
            ? rubricTemplateId
            : item.template_id,
          item.criteria_name,
          item.criteria_description,
          item.max_score,
          item.order_no,
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
    const previous = await client.query(
      `SELECT group_id FROM cbt.c_question WHERE id = $1`,
      [id],
    );
    // Opsi otomatis terhapus karena constraint ON DELETE CASCADE di database
    await client.query(`DELETE FROM cbt.c_question WHERE id = $1`, [id]);
    await dissolveUndersizedGroups(client, [previous.rows[0]?.group_id]);
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

    const bankIds = [
      ...new Set(
        questions
          .map((question) => parseInt(question.bank_soal_id, 10))
          .filter((id) => Number.isInteger(id)),
      ),
    ];
    if (bankIds.length !== 1) {
      return res.status(400).json({ message: "Bank soal tidak valid" });
    }

    let importGroups;
    try {
      importGroups = collectImportGroups(questions);
    } catch (error) {
      if (error.statusCode === 400) {
        return res.status(400).json({ message: error.message });
      }
      throw error;
    }

    const groupIdByRef = new Map();
    const bankId = bankIds[0];
    let nextGroupOrder = 1;
    if (Number.isInteger(bankId)) {
      const orderResult = await client.query(
        `SELECT COALESCE(MAX(order_no), 0) AS max_order
         FROM cbt.c_question_group
         WHERE bank_id = $1`,
        [bankId],
      );
      nextGroupOrder = Number(orderResult.rows[0]?.max_order || 0) + 1;
    }

    for (const group of importGroups) {
      const insertedGroup = await client.query(
        `INSERT INTO cbt.c_question_group (bank_id, title, stimulus, order_no)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [
          bankId,
          group.title,
          normalizeRichTextField(group.stimulus),
          nextGroupOrder,
        ],
      );
      nextGroupOrder += 1;
      groupIdByRef.set(group, insertedGroup.rows[0].id);
    }

    for (const q of questions) {
      const normalizedBloomLevel = normalizeBloomLevel(q.bloom_level);
      const normalizedContent = normalizeRichTextField(q.content);
      const normalizedOptions = normalizeQuestionOptions(q.options);
      const groupId = q._group ? groupIdByRef.get(q._group) : null;
      const resQ = await client.query(
        `INSERT INTO cbt.c_question
          (bank_id, q_type, bloom_level, content, score_point, group_id, group_order)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [
          q.bank_soal_id,
          q.q_type,
          normalizedBloomLevel,
          normalizedContent,
          q.score_point,
          groupId,
          q._groupOrder || null,
        ],
      );

      const questionId = resQ.rows[0].id;

      if (normalizedOptions.length > 0) {
        const optQuery = `INSERT INTO cbt.c_question_options (question_id, label, content, is_correct) VALUES ($1, $2, $3, $4)`;
        for (const opt of normalizedOptions) {
          await client.query(optQuery, [
            questionId,
            opt.label,
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

    const previous = await client.query(
      `
        SELECT DISTINCT group_id
        FROM cbt.c_question
        WHERE id = ANY($1::int[]) AND group_id IS NOT NULL
      `,
      [ids],
    );
    await client.query(`DELETE FROM cbt.c_question WHERE id = ANY($1::int[])`, [
      ids,
    ]);
    await dissolveUndersizedGroups(
      client,
      previous.rows.map((row) => row.group_id),
    );

    res.json({ message: `${ids.length} soal berhasil dihapus` });
  }),
);

const normalizeGroupQuestionIds = (value) => {
  if (!Array.isArray(value)) return [];
  const ids = [];
  const seen = new Set();
  value.forEach((item) => {
    const id = parseInt(item, 10);
    if (!Number.isInteger(id) || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  });
  return ids;
};

const loadGroupQuestions = async (client, bankId, questionIds) => {
  const result = await client.query(
    `
      SELECT id, group_id
      FROM cbt.c_question
      WHERE bank_id = $1 AND id = ANY($2::int[])
    `,
    [bankId, questionIds],
  );
  const byId = new Map(result.rows.map((row) => [row.id, row]));
  return questionIds.map((id) => byId.get(id)).filter(Boolean);
};

router.post(
  "/question-groups",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const bankId = parseInt(req.body?.bank_id, 10);
    const title = String(req.body?.title || "").trim().slice(0, 200);
    const stimulus = normalizeRichTextField(req.body?.stimulus);
    const questionIds = normalizeGroupQuestionIds(req.body?.question_ids);

    if (!Number.isInteger(bankId)) {
      return res.status(400).json({ message: "Bank soal tidak valid" });
    }
    if (questionIds.length < 2) {
      return res.status(400).json({ message: "Grup soal minimal berisi 2 soal" });
    }
    if (!hasStimulusContent(stimulus)) {
      return res.status(400).json({ message: "Stimulus grup wajib diisi" });
    }

    const questions = await loadGroupQuestions(client, bankId, questionIds);
    if (questions.length !== questionIds.length) {
      return res.status(400).json({
        message: "Semua soal harus berasal dari bank yang sama",
      });
    }
    if (questions.some((question) => question.group_id)) {
      return res.status(400).json({
        message: "Ada soal yang sudah masuk grup lain. Lepas dulu dari grup itu.",
      });
    }

    const inserted = await client.query(
      `
        INSERT INTO cbt.c_question_group (bank_id, title, stimulus, order_no)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [bankId, title || "Grup soal", stimulus, Math.min(...questionIds)],
    );
    const groupId = inserted.rows[0].id;

    for (let index = 0; index < questionIds.length; index += 1) {
      await client.query(
        `
          UPDATE cbt.c_question
          SET group_id = $1, group_order = $2
          WHERE id = $3
        `,
        [groupId, index + 1, questionIds[index]],
      );
    }

    res.json({ message: "Grup soal berhasil dibuat", id: groupId });
  }),
);

router.put(
  "/question-groups/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const groupId = parseInt(req.params.id, 10);
    const title = String(req.body?.title || "").trim().slice(0, 200);
    const stimulus = normalizeRichTextField(req.body?.stimulus);
    const questionIds = normalizeGroupQuestionIds(req.body?.question_ids);

    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ message: "Grup soal tidak valid" });
    }
    if (questionIds.length < 2) {
      return res.status(400).json({ message: "Grup soal minimal berisi 2 soal" });
    }
    if (!hasStimulusContent(stimulus)) {
      return res.status(400).json({ message: "Stimulus grup wajib diisi" });
    }

    const groupResult = await client.query(
      `SELECT id, bank_id FROM cbt.c_question_group WHERE id = $1`,
      [groupId],
    );
    if (groupResult.rowCount === 0) {
      return res.status(404).json({ message: "Grup soal tidak ditemukan" });
    }

    const bankId = groupResult.rows[0].bank_id;
    const questions = await loadGroupQuestions(client, bankId, questionIds);
    if (questions.length !== questionIds.length) {
      return res.status(400).json({
        message: "Semua soal harus berasal dari bank yang sama",
      });
    }
    if (
      questions.some(
        (question) => question.group_id && question.group_id !== groupId,
      )
    ) {
      return res.status(400).json({
        message: "Ada soal yang sudah masuk grup lain",
      });
    }

    await client.query(
      `
        UPDATE cbt.c_question_group
        SET title = $1, stimulus = $2, updated_at = NOW()
        WHERE id = $3
      `,
      [title || "Grup soal", stimulus, groupId],
    );
    await client.query(
      `
        UPDATE cbt.c_question
        SET group_id = NULL, group_order = NULL
        WHERE group_id = $1 AND NOT (id = ANY($2::int[]))
      `,
      [groupId, questionIds],
    );

    for (let index = 0; index < questionIds.length; index += 1) {
      await client.query(
        `
          UPDATE cbt.c_question
          SET group_id = $1, group_order = $2
          WHERE id = $3
        `,
        [groupId, index + 1, questionIds[index]],
      );
    }

    res.json({ message: "Grup soal berhasil diperbarui" });
  }),
);

router.delete(
  "/question-groups/:id",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const groupId = parseInt(req.params.id, 10);
    if (!Number.isInteger(groupId)) {
      return res.status(400).json({ message: "Grup soal tidak valid" });
    }

    await client.query(
      `
        UPDATE cbt.c_question
        SET group_id = NULL, group_order = NULL
        WHERE group_id = $1
      `,
      [groupId],
    );
    const deleted = await client.query(
      `DELETE FROM cbt.c_question_group WHERE id = $1`,
      [groupId],
    );
    if (deleted.rowCount === 0) {
      return res.status(404).json({ message: "Grup soal tidak ditemukan" });
    }

    res.json({ message: "Grup soal dilepas. Soal di dalamnya tetap tersimpan." });
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
