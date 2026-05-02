import { Router } from "express";
import crypto from "crypto";
import { authorize } from "../../middleware/authorize.js";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { getPgBoss } from "../../config/pgBoss.js";
import pool from "../../config/connection.js";

const router = Router();
const AI_QUESTION_QUEUE = "cbt-ai-question-generator";
const AI_MODEL_PRICING_USD_PER_1K = {
  "gpt-4.1-mini": { input: 0.0004, output: 0.0016 },
  "gpt-4.1": { input: 0.002, output: 0.008 },
  "gpt-5.4": { input: 0.0, output: 0.0 },
};

const QUESTION_TYPE_META = {
  single: {
    q_type: 1,
    label: "PG Jawaban Tunggal",
    rules:
      "Buat minimal 4 opsi. Tepat 1 opsi benar. Semua opsi harus plausible.",
  },
  multi: {
    q_type: 2,
    label: "PG Multi Jawaban",
    rules:
      "Buat minimal 4 opsi. Minimal 2 opsi benar. Tandai is_correct sesuai kunci.",
  },
  essay: {
    q_type: 3,
    label: "Uraian",
    rules:
      "Jangan buat options. Wajib buat rubric. Total rubric harus sama dengan score_point.",
  },
  short: {
    q_type: 4,
    label: "Isian Singkat",
    rules:
      "Buat options sebagai daftar variasi jawaban benar. Semua is_correct harus true.",
  },
  true_false: {
    q_type: 5,
    label: "Benar/Salah",
    rules: "Buat tepat 2 opsi: Benar dan Salah. Tepat 1 opsi benar.",
  },
  match: {
    q_type: 6,
    label: "Menjodohkan",
    rules:
      "Setiap options item adalah 1 pasangan. Pakai label untuk premis kiri dan content untuk jawaban kanan. Semua is_correct true.",
  },
};

const COUNT_KEY_ORDER = [
  "single",
  "multi",
  "match",
  "true_false",
  "short",
  "essay",
];

const DEFAULT_TEXT_MODEL = "gpt-4.1";
const DEFAULT_TEMPERATURE = 0.4;
const AI_QUESTION_BATCH_SIZE = 5;
const AI_QUESTION_BATCH_MAX_ATTEMPTS = 2;
const AI_QUESTION_BATCH_MAX_REFILL_ATTEMPTS = 6;

const getCipherSecret = () =>
  process.env.AI_CONFIG_CIPHER_KEY ||
  process.env.STT_CONFIG_CIPHER_KEY ||
  process.env.JWT ||
  "lms-ai-config-local-secret";

const getAesKey = () =>
  crypto.createHash("sha256").update(getCipherSecret()).digest();

const decryptApiKey = (encryptedValue) => {
  if (!encryptedValue) return "";

  const [ivHex, authTagHex, dataHex] = String(encryptedValue).split(":");
  if (!ivHex || !authTagHex || !dataHex) {
    return String(encryptedValue);
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getAesKey(),
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, "hex"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, "hex")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

const toIntegerOrNull = (value) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const normalizeBloomLevel = (value) => {
  const parsed = toIntegerOrNull(value);
  if (!parsed || parsed < 1 || parsed > 6) return null;
  return parsed;
};

const normalizeIntegerArray = (values) => {
  if (!Array.isArray(values)) return [];
  return [
    ...new Set(values.map((item) => toIntegerOrNull(item)).filter(Boolean)),
  ];
};

const stripHtml = (value) =>
  String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeQuestionCounts = (input = {}) => {
  const normalized = {};
  for (const key of COUNT_KEY_ORDER) {
    normalized[key] = Math.max(0, toIntegerOrNull(input?.[key]) || 0);
  }
  return normalized;
};

const getTotalRequestedQuestions = (counts) =>
  COUNT_KEY_ORDER.reduce((sum, key) => sum + Number(counts?.[key] || 0), 0);

const expandRequestedQuestionPlan = (counts = {}) =>
  COUNT_KEY_ORDER.flatMap((key) =>
    Array.from({ length: Number(counts?.[key] || 0) }, () => key),
  );

const chunkArray = (items = [], size = 1) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const countQuestionTypeKeys = (typeKeys = []) =>
  typeKeys.reduce((acc, key) => {
    if (COUNT_KEY_ORDER.includes(key)) {
      acc[key] = (acc[key] || 0) + 1;
    }
    return acc;
  }, normalizeQuestionCounts());

const allocateScorePoints = (totalQuestions) => {
  const total = Math.max(0, toIntegerOrNull(totalQuestions) || 0);
  if (total < 1) return [];

  const baseCents = Math.floor(10000 / total);
  let remainder = 10000 - baseCents * total;
  return Array.from({ length: total }, () => {
    const cents = baseCents + (remainder > 0 ? 1 : 0);
    remainder -= remainder > 0 ? 1 : 0;
    return Number((cents / 100).toFixed(2));
  });
};

const resolveRequestedBloomLevel = ({
  value,
  requestedBloomLevels = [],
  fallbackIndex = 0,
}) => {
  const normalized = normalizeBloomLevel(value);
  if (!Array.isArray(requestedBloomLevels) || requestedBloomLevels.length < 1) {
    return normalized;
  }
  if (normalized && requestedBloomLevels.includes(normalized)) {
    return normalized;
  }
  return (
    requestedBloomLevels[fallbackIndex % requestedBloomLevels.length] ||
    requestedBloomLevels[0] ||
    null
  );
};

const normalizeScorePoint = (value, fallbackScorePoint) => {
  const forced = Number(fallbackScorePoint);
  if (Number.isFinite(forced) && forced > 0) return forced;

  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) return parsed;
  throw new Error("Respons AI mengandung bobot soal yang tidak valid.");
};

const normalizeRubricScores = (rubric = [], scorePoint = 0) => {
  const cleanRubric = rubric
    .map((item, index) => ({
      criteria_name: String(item?.criteria_name || "").trim(),
      criteria_description: String(item?.criteria_description || "").trim(),
      max_score: Math.max(0, toNumber(item?.max_score)),
      order_no: index + 1,
    }))
    .filter((item) => item.criteria_name);

  if (cleanRubric.length < 1) return [];

  const targetCents = Math.round(Number(scorePoint || 0) * 100);
  if (targetCents < 1) return cleanRubric;

  const currentTotal = cleanRubric.reduce(
    (sum, item) => sum + Number(item.max_score || 0),
    0,
  );

  if (currentTotal <= 0) {
    const baseCents = Math.floor(targetCents / cleanRubric.length);
    let remainder = targetCents - baseCents * cleanRubric.length;
    return cleanRubric.map((item) => {
      const cents = baseCents + (remainder > 0 ? 1 : 0);
      remainder -= remainder > 0 ? 1 : 0;
      return { ...item, max_score: Number((cents / 100).toFixed(2)) };
    });
  }

  let usedCents = 0;
  return cleanRubric.map((item, index) => {
    const isLast = index === cleanRubric.length - 1;
    const cents = isLast
      ? targetCents - usedCents
      : Math.max(
          0,
          Math.round(
            (Number(item.max_score || 0) / currentTotal) * targetCents,
          ),
        );
    usedCents += cents;
    return { ...item, max_score: Number((cents / 100).toFixed(2)) };
  });
};

const extractJsonText = (value) => {
  const raw = String(value || "").trim();
  if (!raw) return "{}";

  const fencedMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) {
    return fencedMatch[1].trim();
  }

  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return raw.slice(firstBrace, lastBrace + 1);
  }

  return raw;
};

const parseJsonResponse = (value) => {
  const extracted = extractJsonText(value);
  return JSON.parse(extracted);
};

const getFriendlyErrorMessage = (errorMessage) => {
  const message = String(errorMessage || "").trim();
  if (!message) return "Proses generate soal AI gagal.";
  return message;
};

const getBossJobData = (job) => {
  if (job?.data) return job.data;
  if (job?.data_json) return job.data_json;
  return {};
};

const getBossQuestionJobId = (job) => {
  const data = getBossJobData(job);
  return toIntegerOrNull(data?.jobId ?? data?.job_id);
};

const normalizeBossJobs = (jobs) =>
  (Array.isArray(jobs) ? jobs : [jobs]).filter(Boolean);

const getModelPricing = (modelName = DEFAULT_TEXT_MODEL) => {
  const direct = AI_MODEL_PRICING_USD_PER_1K[modelName];
  if (direct) {
    return { ...direct, is_estimated: false };
  }
  const fallback = AI_MODEL_PRICING_USD_PER_1K["gpt-4.1-mini"] || {
    input: 0,
    output: 0,
  };
  return { ...fallback, is_estimated: true };
};

const getRubricTemplateFallbackCode = (subjectName = "") => {
  const normalized = String(subjectName || "").toLowerCase();
  if (
    normalized.includes("matematika") ||
    normalized.includes("fisika") ||
    normalized.includes("kimia") ||
    normalized.includes("biologi") ||
    normalized.includes("ipa")
  ) {
    return "exact_essay";
  }
  if (!normalized) return "general_essay";
  return "non_exact_essay";
};

const getRequestedTypeBreakdown = (counts) =>
  COUNT_KEY_ORDER.filter((key) => Number(counts?.[key] || 0) > 0).map(
    (key) => ({
      key,
      q_type: QUESTION_TYPE_META[key].q_type,
      label: QUESTION_TYPE_META[key].label,
      count: Number(counts[key]),
      rules: QUESTION_TYPE_META[key].rules,
    }),
  );

const buildQuestionGenerationPrompt = ({
  bank,
  grade,
  chapters,
  materialSummary,
  bloomLevels,
  questionCounts,
  rubricTemplates,
}) => {
  const requestedTypes = getRequestedTypeBreakdown(questionCounts);
  const chapterTexts = chapters.map((chapter) => ({
    id: chapter.id,
    title: chapter.title,
    description: chapter.description || "",
  }));

  return {
    model: DEFAULT_TEXT_MODEL,
    temperature: DEFAULT_TEMPERATURE,
    messages: [
      {
        role: "system",
        content:
          "Anda adalah asisten penyusun soal ujian CBT. Kembalikan JSON valid saja tanpa markdown. Semua soal harus sesuai format database yang diberikan.",
      },
      {
        role: "user",
        content: JSON.stringify(
          {
            instruction: [
              "Susun soal ujian berdasarkan konteks bank soal guru.",
              "Gunakan bahasa Indonesia yang jelas dan sesuai tingkat peserta.",
              "Gunakan hanya bloom_level dari daftar context.bloom_levels. Jika ragu, pilih salah satu dari daftar itu.",
              "Jumlah soal tiap tipe harus persis sama dengan requested_question_breakdown.",
              "Setiap soal wajib punya score_point dan total semua score_point tidak boleh melebihi 100.",
              "Setiap soal wajib punya jawaban benar.",
              "Untuk essay, jangan buat options. Buat rubric dan total rubric harus sama dengan score_point.",
              "Untuk matching, tiap pasangan harus disimpan sebagai {label, content, is_correct:true}.",
              "Untuk short answer, options adalah daftar variasi jawaban benar.",
              "Jangan menambahkan field di luar schema output.",
            ],
            context: {
              bank_title: bank.title,
              bank_type: bank.type,
              subject_name: bank.subject_name,
              subject_code: bank.subject_code,
              grade_name: grade.name,
              chapters: chapterTexts,
              material_summary: materialSummary,
              bloom_levels: bloomLevels,
            },
            requested_question_breakdown: requestedTypes,
            rubric_templates: rubricTemplates.map((template) => ({
              code: template.code,
              name: template.name,
              category: template.category,
              description: template.description || "",
              items: template.items || [],
            })),
            rubric_template_fallback_code: getRubricTemplateFallbackCode(
              bank.subject_name,
            ),
            output_schema: {
              questions: [
                {
                  q_type: "number 1-6",
                  bloom_level: "number 1-6 or null",
                  content: "string html/text",
                  score_point: "number > 0",
                  options: [
                    {
                      label: "string or null",
                      content: "string",
                      is_correct: "boolean",
                    },
                  ],
                  rubric_template_code: "string or null",
                  rubric: [
                    {
                      criteria_name: "string",
                      criteria_description: "string",
                      max_score: "number >= 0",
                    },
                  ],
                },
              ],
              summary: {
                total_questions: "number",
                total_score: "number",
              },
            },
          },
          null,
          2,
        ),
      },
    ],
  };
};

const validateQuestionDraft = ({
  question,
  requestedBloomLevels,
  rubricTemplateMap,
  fallbackRubricTemplateId,
  fallbackIndex = 0,
  forcedScorePoint = null,
}) => {
  const qType = toIntegerOrNull(question?.q_type);
  if (![1, 2, 3, 4, 5, 6].includes(qType)) {
    throw new Error("Respons AI mengandung tipe soal yang tidak valid.");
  }

  const bloomLevel = resolveRequestedBloomLevel({
    value: question?.bloom_level,
    requestedBloomLevels,
    fallbackIndex,
  });

  const content = String(question?.content || "").trim();
  if (!content) {
    throw new Error("Respons AI mengandung soal tanpa konten.");
  }

  const scorePoint = normalizeScorePoint(
    question?.score_point,
    forcedScorePoint,
  );

  const options = Array.isArray(question?.options)
    ? question.options.map((option) => ({
        label:
          option?.label === undefined || option?.label === null
            ? null
            : String(option.label).trim(),
        content: String(option?.content || "").trim(),
        is_correct: Boolean(option?.is_correct),
      }))
    : [];

  let rubricTemplateId = null;
  let rubric = [];

  if (qType === 1) {
    if (options.length < 4) {
      throw new Error("Soal PG tunggal minimal harus memiliki 4 opsi.");
    }
    if (options.some((option) => !option.content)) {
      throw new Error("Soal PG tunggal memiliki opsi kosong.");
    }
    const totalCorrect = options.filter((option) => option.is_correct).length;
    if (totalCorrect !== 1) {
      throw new Error("Soal PG tunggal harus memiliki tepat 1 jawaban benar.");
    }
  }

  if (qType === 2) {
    if (options.length < 4) {
      throw new Error("Soal PG multi minimal harus memiliki 4 opsi.");
    }
    if (options.some((option) => !option.content)) {
      throw new Error("Soal PG multi memiliki opsi kosong.");
    }
    const totalCorrect = options.filter((option) => option.is_correct).length;
    if (totalCorrect < 2) {
      throw new Error("Soal PG multi harus memiliki minimal 2 jawaban benar.");
    }
  }

  if (qType === 3) {
    const templateCode = String(question?.rubric_template_code || "").trim();
    rubricTemplateId =
      rubricTemplateMap.get(templateCode)?.id ||
      fallbackRubricTemplateId ||
      null;
    rubric = normalizeRubricScores(
      Array.isArray(question?.rubric) ? question.rubric : [],
      scorePoint,
    );
    if (rubric.length < 1) {
      throw new Error("Soal uraian wajib memiliki rubric.");
    }

    const rubricTotal = rubric.reduce(
      (sum, item) => sum + Number(item.max_score || 0),
      0,
    );
    if (Math.abs(rubricTotal - scorePoint) > 0.001) {
      throw new Error("Total poin rubric uraian harus sama dengan bobot soal.");
    }
  }

  if (qType === 4) {
    if (options.length < 1) {
      throw new Error("Soal isian singkat wajib memiliki minimal 1 kunci.");
    }
    if (options.some((option) => !option.content)) {
      throw new Error("Soal isian singkat memiliki kunci kosong.");
    }
    if (options.some((option) => option.is_correct !== true)) {
      throw new Error("Semua kunci isian singkat harus bertanda benar.");
    }
  }

  if (qType === 5) {
    if (options.length !== 2) {
      throw new Error("Soal benar/salah harus memiliki tepat 2 opsi.");
    }
    const normalizedContents = options.map((option) =>
      String(option.content || "")
        .trim()
        .toLowerCase(),
    );
    if (
      !normalizedContents.includes("benar") ||
      !normalizedContents.includes("salah")
    ) {
      throw new Error("Soal benar/salah harus berisi opsi Benar dan Salah.");
    }
    const totalCorrect = options.filter((option) => option.is_correct).length;
    if (totalCorrect !== 1) {
      throw new Error("Soal benar/salah harus memiliki tepat 1 jawaban benar.");
    }
  }

  if (qType === 6) {
    if (options.length < 1) {
      throw new Error("Soal menjodohkan wajib memiliki minimal 1 pasangan.");
    }
    if (options.some((option) => !option.label || !option.content)) {
      throw new Error("Soal menjodohkan memiliki pasangan yang belum lengkap.");
    }
    if (options.some((option) => option.is_correct !== true)) {
      throw new Error("Semua pasangan menjodohkan harus bertanda benar.");
    }
  }

  return {
    q_type: qType,
    bloom_level: bloomLevel,
    content,
    score_point: Number(scorePoint.toFixed(2)),
    options_json: options,
    rubric_template_id: rubricTemplateId,
    rubric_json: rubric,
    source_payload: question || {},
  };
};

const validateGeneratedPackage = ({
  generated,
  questionCounts,
  bloomLevels,
  rubricTemplateMap,
  fallbackRubricTemplateId,
  scorePoints = [],
  startIndex = 0,
  allowPartial = false,
}) => {
  const questions = Array.isArray(generated?.questions)
    ? generated.questions
    : [];
  const expectedTotal = getTotalRequestedQuestions(questionCounts);

  if (!allowPartial && questions.length !== expectedTotal) {
    throw new Error(
      `Jumlah soal hasil AI (${questions.length}) tidak sama dengan permintaan (${expectedTotal}).`,
    );
  }
  if (allowPartial && questions.length < 1) {
    throw new Error("Respons AI tidak mengandung soal yang valid.");
  }
  if (allowPartial && questions.length > expectedTotal) {
    throw new Error(
      `Jumlah soal hasil AI (${questions.length}) melebihi permintaan batch (${expectedTotal}).`,
    );
  }

  const normalizedDrafts = questions.map((question, index) =>
    validateQuestionDraft({
      question,
      requestedBloomLevels: bloomLevels,
      rubricTemplateMap,
      fallbackRubricTemplateId,
      fallbackIndex: startIndex + index,
      forcedScorePoint: scorePoints[startIndex + index] ?? null,
    }),
  );

  const countsByType = normalizedDrafts.reduce((acc, draft) => {
    acc[draft.q_type] = (acc[draft.q_type] || 0) + 1;
    return acc;
  }, {});

  for (const key of COUNT_KEY_ORDER) {
    const expected = Number(questionCounts[key] || 0);
    const qType = QUESTION_TYPE_META[key].q_type;
    const actual = Number(countsByType[qType] || 0);
    const isInvalid = allowPartial ? actual > expected : expected !== actual;
    if (isInvalid) {
      throw new Error(
        `Jumlah soal tipe ${QUESTION_TYPE_META[key].label} tidak sesuai permintaan.`,
      );
    }
  }

  const totalScore = normalizedDrafts.reduce(
    (sum, draft) => sum + Number(draft.score_point || 0),
    0,
  );
  if (totalScore > 100.001) {
    throw new Error("Total bobot soal hasil AI melebihi 100 poin.");
  }

  return {
    drafts: normalizedDrafts.map((draft, index) => ({
      ...draft,
      sort_order: startIndex + index + 1,
    })),
    summary: {
      total_questions: normalizedDrafts.length,
      total_score: Number(totalScore.toFixed(2)),
      counts_by_type: countsByType,
    },
  };
};

const getAiTeacherBundle = async (db, teacherId) => {
  const configResult = await db.query(
    `
      SELECT id, provider, api_key_encrypted, is_active, default_model_text
      FROM ai_teacher_config
      WHERE teacher_id = $1
      LIMIT 1
    `,
    [teacherId],
  );
  const config = configResult.rows[0] || null;

  let feature = null;
  if (config?.id) {
    const featureResult = await db.query(
      `
        SELECT feature_code, is_enabled
        FROM ai_teacher_feature
        WHERE teacher_config_id = $1 AND feature_code = 'question_generator'
        LIMIT 1
      `,
      [config.id],
    );
    feature = featureResult.rows[0] || null;
  }

  return {
    config,
    feature,
    isReady:
      Boolean(config?.api_key_encrypted) &&
      Boolean(config?.is_active) &&
      (feature ? Boolean(feature.is_enabled) : true),
  };
};

const getOwnedBankContext = async (db, bankId, teacherId) => {
  const result = await db.query(
    `
      SELECT
        b.id,
        b.title,
        b.type,
        b.subject_id,
        b.teacher_id,
        s.name AS subject_name,
        s.code AS subject_code,
        t.homebase_id
      FROM cbt.c_bank b
      JOIN a_subject s ON b.subject_id = s.id
      JOIN u_teachers t ON b.teacher_id = t.user_id
      WHERE b.id = $1 AND b.teacher_id = $2
      LIMIT 1
    `,
    [bankId, teacherId],
  );
  return result.rows[0] || null;
};

const getTeacherAssignedGradesBySubject = async (db, teacherId, subjectId) => {
  const result = await db.query(
    `
      SELECT DISTINCT g.id, g.name
      FROM at_subject ats
      JOIN a_class c ON ats.class_id = c.id
      JOIN a_grade g ON c.grade_id = g.id
      WHERE ats.teacher_id = $1
        AND ats.subject_id = $2
      ORDER BY g.name ASC
    `,
    [teacherId, subjectId],
  );
  return result.rows;
};

const getChapterTeacherColumn = async (db) => {
  const result = await db.query(
    `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'l_chapter'
        AND column_name IN ('teacher_id', 'teacher')
      ORDER BY CASE
        WHEN column_name = 'teacher_id' THEN 1
        ELSE 2
      END
      LIMIT 1
    `,
  );
  return result.rows[0]?.column_name || null;
};

const getTeacherFilteredChapters = async ({
  db,
  teacherId,
  subjectId,
  gradeId = null,
}) => {
  if (gradeId) {
    const isAssigned = await isTeacherAssignedToGradeBySubject(
      db,
      teacherId,
      subjectId,
      gradeId,
    );
    if (!isAssigned) {
      return [];
    }
  }

  const chapterTeacherColumn = await getChapterTeacherColumn(db);
  const params = [subjectId];
  let query = `
    SELECT id, title, description, order_number
    FROM l_chapter
    WHERE subject_id = $1
  `;

  if (chapterTeacherColumn) {
    query += ` AND ${chapterTeacherColumn} = $2`;
    params.push(teacherId);
  }

  query += ` ORDER BY order_number ASC NULLS LAST, id ASC`;
  const result = await db.query(query, params);
  return result.rows;
};

const areTeacherChaptersValid = async ({
  db,
  teacherId,
  subjectId,
  chapterIds,
}) => {
  if (chapterIds.length < 1) {
    return true;
  }

  const chapterTeacherColumn = await getChapterTeacherColumn(db);
  const params = [subjectId, chapterIds];
  let query = `
    SELECT id
    FROM l_chapter
    WHERE subject_id = $1
      AND id = ANY($2::int[])
  `;

  if (chapterTeacherColumn) {
    query += ` AND ${chapterTeacherColumn} = $3`;
    params.push(teacherId);
  }

  const result = await db.query(query, params);
  return result.rowCount === chapterIds.length;
};

const isTeacherAssignedToGradeBySubject = async (
  db,
  teacherId,
  subjectId,
  gradeId,
) => {
  const result = await db.query(
    `
      SELECT 1
      FROM at_subject ats
      JOIN a_class c ON ats.class_id = c.id
      WHERE ats.teacher_id = $1
        AND ats.subject_id = $2
        AND c.grade_id = $3
      LIMIT 1
    `,
    [teacherId, subjectId, gradeId],
  );
  return result.rowCount > 0;
};

const sanitizeQuestionJobForResponse = (job) => {
  if (!job) return null;
  return {
    ...job,
    error_message: getFriendlyErrorMessage(job.error_message),
  };
};

const insertQuestionGeneratorUsageLog = async ({
  client,
  teacherId,
  teacherConfig,
  job,
  responseJson,
  payload,
  summary,
  status,
  errorMessage = null,
}) => {
  try {
    const model =
      payload?.model || teacherConfig?.default_model_text || DEFAULT_TEXT_MODEL;
    const usage = responseJson?.usage || {};
    const inputTokens = Number(usage?.prompt_tokens || 0);
    const outputTokens = Number(usage?.completion_tokens || 0);
    const totalTokens = Number(
      usage?.total_tokens || inputTokens + outputTokens,
    );
    const pricing = getModelPricing(model);
    const costInput = (inputTokens / 1000) * Number(pricing.input || 0);
    const costOutput = (outputTokens / 1000) * Number(pricing.output || 0);
    const totalCost = costInput + costOutput;
    const totalQuestions = Math.max(
      0,
      Math.round(Number(summary?.total_questions || 0)),
    );
    const totalScore = Number(summary?.total_score || 0);

    await client.query(
      `
        INSERT INTO ai_usage_log (
          teacher_id,
          teacher_config_id,
          feature_code,
          provider,
          model,
          request_type,
          mode,
          request_id,
          job_id,
          reference_table,
          reference_id,
          input_units,
          output_units,
          input_tokens,
          output_tokens,
          total_tokens,
          unit_price_input,
          unit_price_output,
          cost_input_usd,
          cost_output_usd,
          total_cost_usd,
          currency,
          is_estimated,
          response_text,
          usage_payload,
          status,
          error_message
        ) VALUES (
          $1, $2, 'question_generator', $3, $4, 'text', 'ai',
          $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, $17, $18, 'USD', $19, $20, $21::jsonb, $22, $23
        )
      `,
      [
        teacherId,
        teacherConfig?.id || null,
        teacherConfig?.provider || "openai",
        model,
        String(job?.id || ""),
        job?.id || null,
        "cbt.c_ai_question_job",
        job?.id || null,
        totalQuestions,
        totalQuestions,
        inputTokens,
        outputTokens,
        totalTokens,
        Number(pricing.input || 0),
        Number(pricing.output || 0),
        Number(costInput.toFixed(6)),
        Number(costOutput.toFixed(6)),
        Number(totalCost.toFixed(6)),
        Boolean(pricing.is_estimated),
        JSON.stringify({
          ai_summary: responseJson?.choices?.[0]?.message?.content || "",
          generated_summary: summary || {},
          generated_total_score: Number.isFinite(totalScore)
            ? Number(totalScore.toFixed(2))
            : 0,
        }),
        JSON.stringify({
          request_payload: payload || {},
          response_usage: usage || {},
          generated_summary: summary || {},
          pricing: {
            input_per_1k_usd: Number(pricing.input || 0),
            output_per_1k_usd: Number(pricing.output || 0),
            is_estimated: Boolean(pricing.is_estimated),
          },
          calculated_cost_usd: Number(totalCost.toFixed(6)),
        }),
        status,
        errorMessage,
      ],
    );
  } catch (error) {
    console.error(
      "[ai-usage-log] failed to insert question generator usage log",
      error?.message || error,
    );
  }
};

const loadRubricTemplates = async (db) => {
  const templateResult = await db.query(
    `
      SELECT id, code, name, category, description
      FROM cbt.c_rubric_template
      WHERE is_active = true
      ORDER BY id ASC
    `,
  );
  const templates = templateResult.rows;
  const templateIds = templates.map((item) => item.id);
  const itemResult =
    templateIds.length > 0
      ? await db.query(
          `
            SELECT template_id, criteria_name, criteria_description, default_weight, order_no
            FROM cbt.c_rubric_template_item
            WHERE template_id = ANY($1::int[])
            ORDER BY template_id ASC, order_no ASC, id ASC
          `,
          [templateIds],
        )
      : { rows: [] };

  const itemsByTemplateId = itemResult.rows.reduce((acc, item) => {
    if (!acc[item.template_id]) acc[item.template_id] = [];
    acc[item.template_id].push(item);
    return acc;
  }, {});

  return templates.map((template) => ({
    ...template,
    items: itemsByTemplateId[template.id] || [],
  }));
};

const getOwnedQuestionJob = async (db, jobId, teacherId) => {
  const result = await db.query(
    `
      SELECT j.*, b.teacher_id
      FROM cbt.c_ai_question_job j
      JOIN cbt.c_bank b ON j.bank_id = b.id
      WHERE j.id = $1 AND j.requested_by = $2 AND b.teacher_id = $2
      LIMIT 1
    `,
    [jobId, teacherId],
  );
  return result.rows[0] || null;
};

const getOwnedDraftWithJob = async (db, draftId, teacherId) => {
  const result = await db.query(
    `
      SELECT
        d.*,
        j.requested_by,
        j.status AS job_status,
        j.request_payload,
        j.summary_json,
        b.teacher_id
      FROM cbt.c_ai_question_draft d
      JOIN cbt.c_ai_question_job j ON d.job_id = j.id
      JOIN cbt.c_bank b ON d.bank_id = b.id
      WHERE d.id = $1 AND j.requested_by = $2 AND b.teacher_id = $2
      LIMIT 1
    `,
    [draftId, teacherId],
  );
  return result.rows[0] || null;
};

const getDraftRowsByJob = async (db, jobId) => {
  const result = await db.query(
    `
      SELECT *
      FROM cbt.c_ai_question_draft
      WHERE job_id = $1
      ORDER BY sort_order ASC, id ASC
    `,
    [jobId],
  );
  return result.rows;
};

const buildDraftSummary = (draftRows) => {
  const summary = {
    total_drafts: draftRows.length,
    total_score: 0,
    draft_count: 0,
    reviewed_count: 0,
    approved_count: 0,
    discarded_count: 0,
    counts_by_type: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
      6: 0,
    },
  };

  for (const row of draftRows) {
    summary.total_score += Number(row.score_point || 0);
    summary.counts_by_type[row.q_type] =
      Number(summary.counts_by_type[row.q_type] || 0) + 1;

    if (row.draft_status === "draft") summary.draft_count += 1;
    if (row.draft_status === "reviewed") summary.reviewed_count += 1;
    if (row.draft_status === "approved") summary.approved_count += 1;
    if (row.draft_status === "discarded") summary.discarded_count += 1;
  }

  summary.total_score = Number(summary.total_score.toFixed(2));
  return summary;
};

const hydrateDraftRow = (row) => ({
  ...row,
  score_point: Number(row.score_point || 0),
  options_json: Array.isArray(row.options_json) ? row.options_json : [],
  rubric_json: Array.isArray(row.rubric_json) ? row.rubric_json : [],
  source_payload:
    row.source_payload && typeof row.source_payload === "object"
      ? row.source_payload
      : {},
});

const normalizeDraftMutationPayload = ({ payload, rubricTemplateMapById }) => {
  const qType = toIntegerOrNull(payload?.q_type);
  if (![1, 2, 3, 4, 5, 6].includes(qType)) {
    throw new Error("Tipe soal draft tidak valid.");
  }

  const bloomLevel = normalizeBloomLevel(payload?.bloom_level);
  const content = String(payload?.content || "").trim();
  if (!content) {
    throw new Error("Konten soal draft wajib diisi.");
  }

  const scorePoint = Number(payload?.score_point);
  if (!Number.isFinite(scorePoint) || scorePoint <= 0) {
    throw new Error("Bobot soal draft tidak valid.");
  }

  const options = Array.isArray(payload?.options)
    ? payload.options.map((option) => ({
        label:
          option?.label === undefined || option?.label === null
            ? null
            : String(option.label).trim(),
        content: String(option?.content || "").trim(),
        is_correct: Boolean(option?.is_correct),
      }))
    : [];

  let rubricTemplateId = null;
  let rubric = [];

  if (qType === 1) {
    if (options.length < 4) {
      throw new Error("PG tunggal minimal memiliki 4 opsi.");
    }
    if (options.some((option) => !option.content)) {
      throw new Error("PG tunggal memiliki opsi kosong.");
    }
    if (options.filter((option) => option.is_correct).length !== 1) {
      throw new Error("PG tunggal harus memiliki tepat 1 jawaban benar.");
    }
  }

  if (qType === 2) {
    if (options.length < 4) {
      throw new Error("PG multi minimal memiliki 4 opsi.");
    }
    if (options.some((option) => !option.content)) {
      throw new Error("PG multi memiliki opsi kosong.");
    }
    if (options.filter((option) => option.is_correct).length < 2) {
      throw new Error("PG multi harus memiliki minimal 2 jawaban benar.");
    }
  }

  if (qType === 3) {
    rubricTemplateId = toIntegerOrNull(payload?.rubric_template_id);
    if (!rubricTemplateId || !rubricTemplateMapById.has(rubricTemplateId)) {
      throw new Error("Template rubric uraian tidak valid.");
    }

    rubric = Array.isArray(payload?.rubric)
      ? payload.rubric.map((item, index) => ({
          criteria_name: String(item?.criteria_name || "").trim(),
          criteria_description: String(item?.criteria_description || "").trim(),
          max_score: Math.max(0, toNumber(item?.max_score)),
          order_no: index + 1,
        }))
      : [];
    rubric = rubric.filter((item) => item.criteria_name);

    if (rubric.length < 1) {
      throw new Error("Soal uraian wajib memiliki rubric.");
    }

    const rubricTotal = rubric.reduce(
      (sum, item) => sum + Number(item.max_score || 0),
      0,
    );
    if (Math.abs(rubricTotal - scorePoint) > 0.001) {
      throw new Error("Total rubric harus sama dengan bobot soal uraian.");
    }
  }

  if (qType === 4) {
    if (options.length < 1) {
      throw new Error("Isian singkat wajib memiliki minimal 1 jawaban benar.");
    }
    if (options.some((option) => !option.content)) {
      throw new Error("Isian singkat memiliki jawaban kosong.");
    }
    if (options.some((option) => option.is_correct !== true)) {
      throw new Error("Semua jawaban isian singkat harus bertanda benar.");
    }
  }

  if (qType === 5) {
    if (options.length !== 2) {
      throw new Error("Benar/Salah harus memiliki tepat 2 opsi.");
    }
    const contents = options.map((option) =>
      String(option.content || "")
        .trim()
        .toLowerCase(),
    );
    if (!contents.includes("benar") || !contents.includes("salah")) {
      throw new Error("Benar/Salah wajib berisi opsi Benar dan Salah.");
    }
    if (options.filter((option) => option.is_correct).length !== 1) {
      throw new Error("Benar/Salah harus memiliki tepat 1 jawaban benar.");
    }
  }

  if (qType === 6) {
    if (options.length < 1) {
      throw new Error("Menjodohkan wajib memiliki minimal 1 pasangan.");
    }
    if (options.some((option) => !option.label || !option.content)) {
      throw new Error("Menjodohkan memiliki pasangan yang belum lengkap.");
    }
    if (options.some((option) => option.is_correct !== true)) {
      throw new Error("Semua pasangan menjodohkan harus bertanda benar.");
    }
  }

  return {
    q_type: qType,
    bloom_level: bloomLevel,
    content,
    score_point: Number(scorePoint.toFixed(2)),
    options_json: options,
    rubric_template_id: rubricTemplateId,
    rubric_json: rubric,
  };
};

const syncQuestionJobCounters = async (db, jobId) => {
  const draftRows = await getDraftRowsByJob(db, jobId);
  const summary = buildDraftSummary(draftRows);

  await db.query(
    `
      UPDATE cbt.c_ai_question_job
      SET
        total_generated = $2,
        total_approved = $3,
        total_discarded = $4,
        summary_json = COALESCE(summary_json, '{}'::jsonb) || $5::jsonb,
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      jobId,
      summary.total_drafts,
      summary.approved_count,
      summary.discarded_count,
      JSON.stringify({
        draft_summary: summary,
      }),
    ],
  );

  return summary;
};

const toQuestionScorePointInteger = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 1;
  return Math.max(1, Math.round(parsed));
};

const insertApprovedQuestionFromDraft = async ({ client, draftRow }) => {
  const scorePointInteger = toQuestionScorePointInteger(draftRow.score_point);
  const insertQuestionResult = await client.query(
    `
      INSERT INTO cbt.c_question (
        bank_id,
        q_type,
        bloom_level,
        content,
        score_point
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id
    `,
    [
      draftRow.bank_id,
      draftRow.q_type,
      draftRow.bloom_level,
      draftRow.content,
      scorePointInteger,
    ],
  );
  const questionId = insertQuestionResult.rows[0].id;

  for (const option of draftRow.options_json || []) {
    await client.query(
      `
        INSERT INTO cbt.c_question_options (question_id, label, content, is_correct)
        VALUES ($1, $2, $3, $4)
      `,
      [
        questionId,
        option?.label || null,
        option?.content || "",
        Boolean(option?.is_correct),
      ],
    );
  }

  if (Number(draftRow.q_type) === 3) {
    for (const item of draftRow.rubric_json || []) {
      await client.query(
        `
          INSERT INTO cbt.c_question_rubric (
            question_id,
            template_id,
            criteria_name,
            criteria_description,
            max_score,
            order_no
          )
          VALUES ($1, $2, $3, $4, $5, $6)
        `,
        [
          questionId,
          draftRow.rubric_template_id,
          item?.criteria_name || "",
          item?.criteria_description || "",
          Math.max(0, toNumber(item?.max_score)),
          toIntegerOrNull(item?.order_no) || 1,
        ],
      );
    }
  }

  return questionId;
};

const markQuestionJobFailed = async ({ jobId, errorMessage }) => {
  const normalizedJobId = toIntegerOrNull(jobId);
  if (!normalizedJobId) return;

  await pool.query(
    `
      UPDATE cbt.c_ai_question_job
      SET
        status = 'failed',
        error_message = $2,
        finished_at = COALESCE(finished_at, NOW()),
        updated_at = NOW()
      WHERE id = $1 AND status IN ('queued', 'running')
    `,
    [normalizedJobId, getFriendlyErrorMessage(errorMessage).slice(0, 1000)],
  );
};

const syncFailedBossQuestionJobStatus = async ({ db, job }) => {
  if (!job?.boss_job_id || !["queued", "running"].includes(job.status)) {
    return job;
  }

  const bossJobResult = await db.query(
    `
      SELECT state, output
      FROM pgboss.job
      WHERE id = $1 AND name = $2
      LIMIT 1
    `,
    [job.boss_job_id, AI_QUESTION_QUEUE],
  );
  const bossJob = bossJobResult.rows[0];
  if (bossJob?.state !== "failed") return job;

  const output = bossJob.output || {};
  const errorMessage =
    output?.message || output?.error || "Proses generate soal AI gagal.";

  const updateResult = await db.query(
    `
      UPDATE cbt.c_ai_question_job
      SET
        status = 'failed',
        error_message = $2,
        finished_at = COALESCE(finished_at, NOW()),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [job.id, getFriendlyErrorMessage(errorMessage).slice(0, 1000)],
  );

  return (
    updateResult.rows[0] || {
      ...job,
      status: "failed",
      error_message: getFriendlyErrorMessage(errorMessage),
    }
  );
};

const callOpenAiQuestionGenerator = async ({ apiKey, payload }) => {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI ${response.status}: ${errorBody.slice(0, 500)}`);
  }

  return response.json();
};

const processQuestionGenerationJob = async ({ pool, jobId }) => {
  const normalizedJobId = toIntegerOrNull(jobId);
  if (!normalizedJobId) {
    throw new Error("Payload job generate soal AI tidak valid.");
  }

  await pool.query(
    `
      UPDATE cbt.c_ai_question_job
      SET status = 'running', started_at = NOW(), updated_at = NOW()
      WHERE id = $1
    `,
    [normalizedJobId],
  );

  const jobResult = await pool.query(
    `
      SELECT *
      FROM cbt.c_ai_question_job
      WHERE id = $1
      LIMIT 1
    `,
    [normalizedJobId],
  );
  if (jobResult.rowCount === 0) {
    throw new Error("Job generate soal AI tidak ditemukan.");
  }

  const job = jobResult.rows[0];
  const requestPayload = job.request_payload || {};
  const questionCounts = normalizeQuestionCounts(
    requestPayload.question_counts,
  );
  const bloomLevels = normalizeIntegerArray(requestPayload.bloom_levels);
  const chapterIds = normalizeIntegerArray(requestPayload.chapter_ids);
  const materialSummary = String(requestPayload.material_summary || "").trim();

  const teacherBundle = await getAiTeacherBundle(pool, job.requested_by);
  if (!teacherBundle.config?.api_key_encrypted) {
    throw new Error("API key OpenAI guru belum tersedia.");
  }
  if (!teacherBundle.config?.is_active) {
    throw new Error("Konfigurasi AI guru tidak aktif.");
  }
  if (teacherBundle.feature && !teacherBundle.feature.is_enabled) {
    throw new Error("Fitur AI generator soal sedang tidak aktif.");
  }

  const bank = await getOwnedBankContext(pool, job.bank_id, job.requested_by);
  if (!bank) {
    throw new Error("Bank soal tidak ditemukan atau bukan milik guru.");
  }

  const gradeResult = await pool.query(
    `
      SELECT id, name
      FROM a_grade
      WHERE id = $1
      LIMIT 1
    `,
    [job.grade_id],
  );
  const grade = gradeResult.rows[0];
  if (!grade) {
    throw new Error("Tingkat yang dipilih tidak valid.");
  }
  if (
    !(await isTeacherAssignedToGradeBySubject(
      pool,
      job.requested_by,
      bank.subject_id,
      job.grade_id,
    ))
  ) {
    throw new Error("Tingkat yang dipilih tidak termasuk kelas ajar guru.");
  }

  let chapters = [];
  if (chapterIds.length > 0) {
    const chaptersValid = await areTeacherChaptersValid({
      db: pool,
      teacherId: job.requested_by,
      subjectId: bank.subject_id,
      chapterIds,
    });
    if (!chaptersValid) {
      throw new Error(
        "Ada materi/chapter yang tidak sesuai mapel atau bukan milik guru.",
      );
    }
    chapters = await getTeacherFilteredChapters({
      db: pool,
      teacherId: job.requested_by,
      subjectId: bank.subject_id,
      gradeId: job.grade_id,
    });
    chapters = chapters.filter((chapter) => chapterIds.includes(chapter.id));
  }

  const rubricTemplateResult = await pool.query(
    `
      SELECT id, code, name, category, description
      FROM cbt.c_rubric_template
      WHERE is_active = true
      ORDER BY id ASC
    `,
  );
  const rubricTemplates = rubricTemplateResult.rows;
  const templateIds = rubricTemplates.map((item) => item.id);
  const templateItemsResult =
    templateIds.length > 0
      ? await pool.query(
          `
            SELECT template_id, criteria_name, criteria_description, default_weight, order_no
            FROM cbt.c_rubric_template_item
            WHERE template_id = ANY($1::int[])
            ORDER BY template_id ASC, order_no ASC, id ASC
          `,
          [templateIds],
        )
      : { rows: [] };

  const templateItemsById = templateItemsResult.rows.reduce((acc, item) => {
    if (!acc[item.template_id]) acc[item.template_id] = [];
    acc[item.template_id].push(item);
    return acc;
  }, {});

  const hydratedTemplates = rubricTemplates.map((template) => ({
    ...template,
    items: templateItemsById[template.id] || [],
  }));
  const rubricTemplateMap = new Map(
    hydratedTemplates.map((template) => [template.code, template]),
  );
  const fallbackRubricTemplateId =
    rubricTemplateMap.get(getRubricTemplateFallbackCode(bank.subject_name))
      ?.id ||
    rubricTemplateMap.get("general_essay")?.id ||
    null;

  const teacherApiKey = decryptApiKey(teacherBundle.config.api_key_encrypted);
  const questionPlan = expandRequestedQuestionPlan(questionCounts);
  const scorePlan = allocateScorePoints(questionPlan.length);
  const batches = chunkArray(questionPlan, AI_QUESTION_BATCH_SIZE);
  const model = teacherBundle.config.default_model_text || DEFAULT_TEXT_MODEL;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM cbt.c_ai_question_draft WHERE job_id = $1`,
      [normalizedJobId],
    );
    await client.query(
      `
        UPDATE cbt.c_ai_question_job
        SET
          provider = $2,
          model = $3,
          temperature = $4,
          total_generated = 0,
          summary_json = $5::jsonb,
          error_message = NULL,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        normalizedJobId,
        teacherBundle.config.provider || "openai",
        model,
        DEFAULT_TEMPERATURE,
        JSON.stringify({
          progress: {
            total_requested: questionPlan.length,
            total_saved: 0,
            current_batch: 0,
            total_batches: batches.length,
            batch_size: AI_QUESTION_BATCH_SIZE,
          },
        }),
      ],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const usageSummary = [];
  const summaryFromAi = [];
  let savedCount = 0;

  for (const [batchIndex, batchPlan] of batches.entries()) {
    const batchCounts = countQuestionTypeKeys(batchPlan);
    const batchStartIndex = savedCount;
    const remainingCounts = { ...batchCounts };
    const collectedDrafts = [];
    const batchUsageSummary = [];
    const batchSummaryFromAi = [];
    let payload = null;
    let batchError = null;

    for (
      let refillAttempt = 1;
      refillAttempt <= AI_QUESTION_BATCH_MAX_REFILL_ATTEMPTS;
      refillAttempt += 1
    ) {
      const remainingTotal = getTotalRequestedQuestions(remainingCounts);
      if (remainingTotal < 1) break;

      let iterationValidated = null;
      let iterationParsed = null;
      let iterationResponseJson = null;
      let iterationError = null;

      for (
        let attempt = 1;
        attempt <= AI_QUESTION_BATCH_MAX_ATTEMPTS;
        attempt += 1
      ) {
        try {
          payload = buildQuestionGenerationPrompt({
            bank,
            grade,
            chapters,
            materialSummary,
            bloomLevels,
            questionCounts: remainingCounts,
            rubricTemplates: hydratedTemplates,
          });
          payload.model = model;
          payload.messages = payload.messages.map((message) =>
            message.role === "user"
              ? {
                  ...message,
                  content: JSON.stringify(
                    {
                      ...JSON.parse(message.content),
                      batch: {
                        current_batch: batchIndex + 1,
                        total_batches: batches.length,
                        global_start_number:
                          batchStartIndex + collectedDrafts.length + 1,
                        remaining_question_count: remainingTotal,
                        remaining_breakdown: remainingCounts,
                        instruction:
                          "Ini generate tambahan untuk memenuhi sisa soal batch. Kembalikan sebanyak mungkin soal valid sesuai remaining_breakdown.",
                        retry_attempt: attempt,
                        refill_attempt: refillAttempt,
                      },
                    },
                    null,
                    2,
                  ),
                }
              : message,
          );

          iterationResponseJson = await callOpenAiQuestionGenerator({
            apiKey: teacherApiKey,
            payload,
          });
          const content =
            iterationResponseJson?.choices?.[0]?.message?.content || "{}";
          iterationParsed = parseJsonResponse(content);
          iterationValidated = validateGeneratedPackage({
            generated: iterationParsed,
            questionCounts: remainingCounts,
            bloomLevels,
            rubricTemplateMap,
            fallbackRubricTemplateId,
            scorePoints: scorePlan,
            startIndex: batchStartIndex + collectedDrafts.length,
            allowPartial: true,
          });
          iterationError = null;
          break;
        } catch (error) {
          iterationError = error;
        }
      }

      if (!iterationValidated) {
        batchError =
          iterationError ||
          new Error("Batch generate soal AI gagal divalidasi.");
        break;
      }

      if (iterationValidated.drafts.length < 1) {
        batchError = new Error(
          "AI tidak mengembalikan soal valid untuk melanjutkan batch.",
        );
        break;
      }

      collectedDrafts.push(...iterationValidated.drafts);
      batchUsageSummary.push(iterationResponseJson?.usage || {});
      batchSummaryFromAi.push(iterationParsed?.summary || {});

      for (const key of COUNT_KEY_ORDER) {
        const qType = QUESTION_TYPE_META[key].q_type;
        const generatedCount = Number(
          iterationValidated.summary?.counts_by_type?.[qType] || 0,
        );
        remainingCounts[key] = Math.max(
          0,
          Number(remainingCounts[key] || 0) - generatedCount,
        );
      }
    }

    if (getTotalRequestedQuestions(remainingCounts) > 0) {
      throw (
        batchError ||
        new Error(
          `Batch ${batchIndex + 1} belum terpenuhi. Sisa ${getTotalRequestedQuestions(
            remainingCounts,
          )} soal.`,
        )
      );
    }

    const batchClient = await pool.connect();
    try {
      await batchClient.query("BEGIN");
      for (const draft of collectedDrafts) {
        await batchClient.query(
          `
            INSERT INTO cbt.c_ai_question_draft (
              job_id,
              bank_id,
              q_type,
              bloom_level,
              content,
              score_point,
              options_json,
              rubric_template_id,
              rubric_json,
              sort_order,
              source_payload,
              draft_status,
              is_edited
            )
            VALUES (
              $1, $2, $3, $4, $5, $6,
              $7::jsonb, $8, $9::jsonb, $10, $11::jsonb, 'draft', false
            )
          `,
          [
            normalizedJobId,
            job.bank_id,
            draft.q_type,
            draft.bloom_level,
            draft.content,
            draft.score_point,
            JSON.stringify(draft.options_json || []),
            draft.rubric_template_id,
            JSON.stringify(draft.rubric_json || []),
            draft.sort_order,
            JSON.stringify(draft.source_payload || {}),
          ],
        );
      }

      savedCount += collectedDrafts.length;
      usageSummary.push(...batchUsageSummary);
      summaryFromAi.push(...batchSummaryFromAi);

      await batchClient.query(
        `
          UPDATE cbt.c_ai_question_job
          SET
            total_generated = $2,
            summary_json = COALESCE(summary_json, '{}'::jsonb) || $3::jsonb,
            updated_at = NOW()
          WHERE id = $1
        `,
        [
          normalizedJobId,
          savedCount,
          JSON.stringify({
            progress: {
              total_requested: questionPlan.length,
              total_saved: savedCount,
              current_batch: batchIndex + 1,
              total_batches: batches.length,
              batch_size: AI_QUESTION_BATCH_SIZE,
            },
            partial_summary: {
              total_questions: savedCount,
              total_score: Number(
                scorePlan
                  .slice(0, savedCount)
                  .reduce((sum, score) => sum + score, 0)
                  .toFixed(2),
              ),
            },
          }),
        ],
      );

      await insertQuestionGeneratorUsageLog({
        client: batchClient,
        teacherId: job.requested_by,
        teacherConfig: teacherBundle.config,
        job,
        responseJson: {
          usage: batchUsageSummary.at(-1) || {},
          choices: [],
        },
        payload,
        summary: {
          total_questions: collectedDrafts.length,
          total_score: Number(
            collectedDrafts
              .reduce((sum, draft) => sum + Number(draft.score_point || 0), 0)
              .toFixed(2),
          ),
        },
        status: "success",
        errorMessage: null,
      });

      await batchClient.query("COMMIT");
    } catch (error) {
      await batchClient.query("ROLLBACK");
      throw error;
    } finally {
      batchClient.release();
    }
  }

  const finalDrafts = await getDraftRowsByJob(pool, normalizedJobId);
  const finalSummary = buildDraftSummary(finalDrafts);
  await pool.query(
    `
      UPDATE cbt.c_ai_question_job
      SET
        status = 'completed',
        total_generated = $2,
        summary_json = COALESCE(summary_json, '{}'::jsonb) || $3::jsonb,
        error_message = NULL,
        finished_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      normalizedJobId,
      finalSummary.total_drafts,
      JSON.stringify({
        total_questions: finalSummary.total_drafts,
        total_score: finalSummary.total_score,
        draft_summary: finalSummary,
        openai_usage_batches: usageSummary,
        summary_from_ai_batches: summaryFromAi,
        progress: {
          total_requested: questionPlan.length,
          total_saved: finalSummary.total_drafts,
          current_batch: batches.length,
          total_batches: batches.length,
          batch_size: AI_QUESTION_BATCH_SIZE,
        },
      }),
    ],
  );
};

let workerRegistered = false;
let queueReady = false;

const ensureQuestionQueue = async () => {
  if (queueReady) return;
  const boss = await getPgBoss();
  try {
    await boss.createQueue(AI_QUESTION_QUEUE);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (!message.includes("already exists")) {
      throw error;
    }
  }
  queueReady = true;
};

const registerQuestionWorker = async () => {
  if (workerRegistered) return;
  const boss = await getPgBoss();
  await ensureQuestionQueue();
  await boss.work(AI_QUESTION_QUEUE, async (pgBossJobs) => {
    for (const pgBossJob of normalizeBossJobs(pgBossJobs)) {
      const jobId = getBossQuestionJobId(pgBossJob);
      if (!Number.isInteger(jobId)) {
        throw new Error("Payload job generate soal AI tidak valid.");
      }

      try {
        await processQuestionGenerationJob({ pool, jobId });
      } catch (error) {
        await markQuestionJobFailed({
          jobId,
          errorMessage: error?.message || "Proses generate soal AI gagal.",
        });
        throw error;
      }
    }
  });
  workerRegistered = true;
  console.log(`[pg-boss] worker registered for queue "${AI_QUESTION_QUEUE}"`);
};

registerQuestionWorker().catch((error) => {
  console.error("[pg-boss] failed to register AI question worker", error);
});

router.get(
  "/banks/:bank_id/ai-generate/meta",
  authorize("teacher"),
  withQuery(async (req, res, db) => {
    const bankId = toIntegerOrNull(req.params.bank_id);
    const teacherId = req.user.id;
    const gradeId = toIntegerOrNull(req.query.grade_id);

    if (!bankId) {
      return res.status(400).json({ message: "Parameter bank tidak valid" });
    }

    const bank = await getOwnedBankContext(db, bankId, teacherId);
    if (!bank) {
      return res
        .status(404)
        .json({ message: "Bank soal tidak ditemukan atau bukan milik guru" });
    }

    const [grades, chapters, teacherBundle, latestJobResult] =
      await Promise.all([
        getTeacherAssignedGradesBySubject(db, teacherId, bank.subject_id),
        gradeId
          ? getTeacherFilteredChapters({
              db,
              teacherId,
              subjectId: bank.subject_id,
              gradeId,
            })
          : Promise.resolve([]),
        getAiTeacherBundle(db, teacherId),
        db.query(
          `
            SELECT *
            FROM cbt.c_ai_question_job
            WHERE bank_id = $1 AND requested_by = $2
            ORDER BY id DESC
            LIMIT 1
          `,
          [bankId, teacherId],
        ),
      ]);

    const latestJob = latestJobResult.rows[0]
      ? await syncFailedBossQuestionJobStatus({
          db,
          job: latestJobResult.rows[0],
        })
      : null;

    return res.json({
      message: "OK",
      data: {
        bank,
        grades,
        chapters,
        ai_config: {
          has_config: Boolean(teacherBundle.config),
          has_api_key: Boolean(teacherBundle.config?.api_key_encrypted),
          is_active: Boolean(teacherBundle.config?.is_active),
          question_generator_enabled: teacherBundle.feature
            ? Boolean(teacherBundle.feature.is_enabled)
            : Boolean(teacherBundle.config),
          default_model_text:
            teacherBundle.config?.default_model_text || DEFAULT_TEXT_MODEL,
          is_ready: teacherBundle.isReady,
        },
        latest_job: latestJob,
      },
    });
  }),
);

router.post(
  "/banks/:bank_id/ai-generate/start",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const bankId = toIntegerOrNull(req.params.bank_id);
    const teacherId = req.user.id;
    const {
      grade_id,
      chapter_ids = [],
      material_summary = "",
      bloom_levels = [],
      question_counts = {},
    } = req.body || {};

    if (!bankId) {
      return res.status(400).json({ message: "Parameter bank tidak valid" });
    }

    const bank = await getOwnedBankContext(client, bankId, teacherId);
    if (!bank) {
      return res
        .status(404)
        .json({ message: "Bank soal tidak ditemukan atau bukan milik guru" });
    }

    const gradeId = toIntegerOrNull(grade_id);
    if (!gradeId) {
      return res.status(400).json({ message: "Tingkat wajib dipilih" });
    }

    const gradeResult = await client.query(
      `
        SELECT id, name
        FROM a_grade
        WHERE id = $1
        LIMIT 1
      `,
      [gradeId],
    );
    if (gradeResult.rowCount === 0) {
      return res.status(400).json({ message: "Tingkat tidak valid" });
    }
    if (
      !(await isTeacherAssignedToGradeBySubject(
        client,
        teacherId,
        bank.subject_id,
        gradeId,
      ))
    ) {
      return res.status(400).json({
        message: "Tingkat harus sesuai dengan kelas yang ditugaskan ke guru",
      });
    }

    const normalizedChapters = normalizeIntegerArray(chapter_ids);
    if (normalizedChapters.length > 0) {
      const chaptersValid = await areTeacherChaptersValid({
        db: client,
        teacherId,
        subjectId: bank.subject_id,
        chapterIds: normalizedChapters,
      });
      if (!chaptersValid) {
        return res.status(400).json({
          message:
            "Materi yang dipilih harus sesuai mapel dan dibuat oleh guru login",
        });
      }
    }

    const materialSummary = String(material_summary || "").trim();
    if (normalizedChapters.length < 1 && !materialSummary) {
      return res.status(400).json({
        message: "Pilih minimal 1 materi atau isi ringkasan materi tambahan",
      });
    }

    const normalizedBloomLevels = normalizeIntegerArray(bloom_levels)
      .map(normalizeBloomLevel)
      .filter(Boolean);
    if (normalizedBloomLevels.length < 1) {
      return res.status(400).json({ message: "Pilih minimal 1 level Bloom" });
    }

    const counts = normalizeQuestionCounts(question_counts);
    const totalRequested = getTotalRequestedQuestions(counts);
    if (totalRequested < 1) {
      return res.status(400).json({ message: "Minimal buat 1 soal" });
    }
    if (totalRequested > 50) {
      return res.status(400).json({
        message: "Jumlah soal terlalu besar. Maksimal 50 soal per generate.",
      });
    }

    const teacherBundle = await getAiTeacherBundle(client, teacherId);
    if (!teacherBundle.config?.api_key_encrypted) {
      return res
        .status(400)
        .json({ message: "API key OpenAI guru belum tersedia" });
    }
    if (!teacherBundle.config?.is_active) {
      return res
        .status(400)
        .json({ message: "Konfigurasi AI guru tidak aktif" });
    }
    if (teacherBundle.feature && !teacherBundle.feature.is_enabled) {
      return res.status(400).json({
        message: "Fitur generate soal AI sedang tidak aktif",
      });
    }

    const existingJobResult = await client.query(
      `
        SELECT id, status, boss_job_id
        FROM cbt.c_ai_question_job
        WHERE bank_id = $1 AND requested_by = $2 AND status IN ('queued', 'running')
        ORDER BY id DESC
        LIMIT 1
      `,
      [bankId, teacherId],
    );
    if (existingJobResult.rowCount > 0) {
      const syncedJob = await syncFailedBossQuestionJobStatus({
        db: client,
        job: existingJobResult.rows[0],
      });
      if (["queued", "running"].includes(syncedJob.status)) {
        return res.status(409).json({
          message:
            "Masih ada proses generate soal AI yang berjalan untuk bank ini",
          data: syncedJob,
        });
      }
    }

    const requestPayload = {
      grade_id: gradeId,
      chapter_ids: normalizedChapters,
      material_summary: materialSummary,
      bloom_levels: normalizedBloomLevels,
      question_counts: counts,
    };

    const insertJobResult = await client.query(
      `
        INSERT INTO cbt.c_ai_question_job (
          bank_id,
          requested_by,
          ai_teacher_config_id,
          boss_queue_name,
          provider,
          model,
          temperature,
          grade_id,
          subject_id,
          total_requested,
          request_payload,
          requested_at
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, $9, $10, $11::jsonb, NOW()
        )
        RETURNING *
      `,
      [
        bankId,
        teacherId,
        teacherBundle.config.id,
        AI_QUESTION_QUEUE,
        teacherBundle.config.provider || "openai",
        teacherBundle.config.default_model_text || DEFAULT_TEXT_MODEL,
        DEFAULT_TEMPERATURE,
        gradeId,
        bank.subject_id,
        totalRequested,
        JSON.stringify(requestPayload),
      ],
    );
    const newJob = insertJobResult.rows[0];

    const boss = await getPgBoss();
    await ensureQuestionQueue();
    const bossJobId = await boss.send(AI_QUESTION_QUEUE, {
      jobId: newJob.id,
      bankId,
      requestedBy: teacherId,
    });

    await client.query(
      `
        UPDATE cbt.c_ai_question_job
        SET boss_job_id = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [newJob.id, bossJobId || null],
    );

    return res.json({
      message: "Proses generate soal AI dimulai",
      data: {
        ...newJob,
        boss_job_id: bossJobId || null,
      },
    });
  }),
);

router.get(
  "/banks/:bank_id/ai-generate/latest",
  authorize("teacher"),
  withQuery(async (req, res, db) => {
    const bankId = toIntegerOrNull(req.params.bank_id);
    const teacherId = req.user.id;

    if (!bankId) {
      return res.status(400).json({ message: "Parameter bank tidak valid" });
    }

    const bank = await getOwnedBankContext(db, bankId, teacherId);
    if (!bank) {
      return res
        .status(404)
        .json({ message: "Bank soal tidak ditemukan atau bukan milik guru" });
    }

    const jobResult = await db.query(
      `
        SELECT *
        FROM cbt.c_ai_question_job
        WHERE bank_id = $1 AND requested_by = $2
        ORDER BY id DESC
        LIMIT 1
      `,
      [bankId, teacherId],
    );

    const job = jobResult.rows[0]
      ? await syncFailedBossQuestionJobStatus({
          db,
          job: jobResult.rows[0],
        })
      : null;

    return res.json({
      message: "OK",
      data: sanitizeQuestionJobForResponse(job),
    });
  }),
);

router.get(
  "/banks/:bank_id/ai-generate/jobs/:job_id",
  authorize("teacher"),
  withQuery(async (req, res, db) => {
    const bankId = toIntegerOrNull(req.params.bank_id);
    const jobId = toIntegerOrNull(req.params.job_id);
    const teacherId = req.user.id;

    if (!bankId || !jobId) {
      return res.status(400).json({ message: "Parameter job tidak valid" });
    }

    const bank = await getOwnedBankContext(db, bankId, teacherId);
    if (!bank) {
      return res
        .status(404)
        .json({ message: "Bank soal tidak ditemukan atau bukan milik guru" });
    }

    const job = await getOwnedQuestionJob(db, jobId, teacherId);
    if (!job || Number(job.bank_id) !== bankId) {
      return res.status(404).json({ message: "Job draft AI tidak ditemukan" });
    }

    const syncedJob = await syncFailedBossQuestionJobStatus({ db, job });
    const draftRows = (await getDraftRowsByJob(db, jobId)).map(hydrateDraftRow);
    const summary = buildDraftSummary(draftRows);

    return res.json({
      message: "OK",
      data: {
        job: sanitizeQuestionJobForResponse(syncedJob),
        drafts: draftRows,
        summary,
      },
    });
  }),
);

router.put(
  "/ai-question-drafts/:draft_id",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const draftId = toIntegerOrNull(req.params.draft_id);
    const teacherId = req.user.id;

    if (!draftId) {
      return res.status(400).json({ message: "Parameter draft tidak valid" });
    }

    const draftRow = await getOwnedDraftWithJob(client, draftId, teacherId);
    if (!draftRow) {
      return res.status(404).json({ message: "Draft soal AI tidak ditemukan" });
    }
    if (draftRow.draft_status === "approved") {
      return res.status(400).json({
        message: "Draft yang sudah di-approve tidak dapat diedit lagi",
      });
    }
    if (draftRow.draft_status === "discarded") {
      return res.status(400).json({
        message: "Draft yang sudah dibuang tidak dapat diedit lagi",
      });
    }

    const templates = await loadRubricTemplates(client);
    const rubricTemplateMapById = new Map(
      templates.map((template) => [template.id, template]),
    );

    let normalized;
    try {
      normalized = normalizeDraftMutationPayload({
        payload: req.body || {},
        rubricTemplateMapById,
      });
    } catch (error) {
      return res.status(400).json({ message: error.message });
    }

    await client.query(
      `
        UPDATE cbt.c_ai_question_draft
        SET
          q_type = $2,
          bloom_level = $3,
          content = $4,
          score_point = $5,
          options_json = $6::jsonb,
          rubric_template_id = $7,
          rubric_json = $8::jsonb,
          draft_status = 'reviewed',
          is_edited = true,
          updated_at = NOW()
        WHERE id = $1
      `,
      [
        draftId,
        normalized.q_type,
        normalized.bloom_level,
        normalized.content,
        normalized.score_point,
        JSON.stringify(normalized.options_json || []),
        normalized.rubric_template_id,
        JSON.stringify(normalized.rubric_json || []),
      ],
    );

    await syncQuestionJobCounters(client, draftRow.job_id);

    const updated = await client.query(
      `
        SELECT *
        FROM cbt.c_ai_question_draft
        WHERE id = $1
        LIMIT 1
      `,
      [draftId],
    );

    return res.json({
      message: "Draft soal AI berhasil diperbarui",
      data: hydrateDraftRow(updated.rows[0]),
    });
  }),
);

router.post(
  "/ai-question-drafts/:draft_id/approve",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const draftId = toIntegerOrNull(req.params.draft_id);
    const teacherId = req.user.id;

    if (!draftId) {
      return res.status(400).json({ message: "Parameter draft tidak valid" });
    }

    const ownedDraft = await getOwnedDraftWithJob(client, draftId, teacherId);
    if (!ownedDraft) {
      return res.status(404).json({ message: "Draft soal AI tidak ditemukan" });
    }
    if (ownedDraft.draft_status === "approved") {
      return res.status(400).json({ message: "Draft ini sudah di-approve" });
    }
    if (ownedDraft.draft_status === "discarded") {
      return res.status(400).json({ message: "Draft ini sudah dibuang" });
    }

    const hydratedDraft = hydrateDraftRow(ownedDraft);
    const questionId = await insertApprovedQuestionFromDraft({
      client,
      draftRow: hydratedDraft,
    });

    await client.query(
      `
        UPDATE cbt.c_ai_question_draft
        SET
          draft_status = 'approved',
          approved_question_id = $2,
          approved_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `,
      [draftId, questionId],
    );

    const summary = await syncQuestionJobCounters(client, ownedDraft.job_id);
    await client.query(
      `
        UPDATE cbt.c_ai_question_job
        SET
          status = CASE
            WHEN $2 >= total_generated AND total_generated > 0 THEN 'approved'
            ELSE status
          END,
          approved_at = CASE
            WHEN $2 >= total_generated AND total_generated > 0 THEN NOW()
            ELSE approved_at
          END,
          updated_at = NOW()
        WHERE id = $1
      `,
      [ownedDraft.job_id, summary.approved_count],
    );

    return res.json({
      message: "Draft soal AI berhasil di-approve",
      data: {
        draft_id: draftId,
        approved_question_id: questionId,
      },
    });
  }),
);

router.post(
  "/ai-question-jobs/:job_id/approve",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const jobId = toIntegerOrNull(req.params.job_id);
    const teacherId = req.user.id;
    const requestedDraftIds = normalizeIntegerArray(req.body?.draft_ids || []);

    if (!jobId) {
      return res.status(400).json({ message: "Parameter job tidak valid" });
    }

    const job = await getOwnedQuestionJob(client, jobId, teacherId);
    if (!job) {
      return res.status(404).json({ message: "Job draft AI tidak ditemukan" });
    }

    const allDraftRows = (await getDraftRowsByJob(client, jobId)).map(
      hydrateDraftRow,
    );
    const draftsToApprove = allDraftRows.filter((row) => {
      if (row.draft_status === "approved" || row.draft_status === "discarded") {
        return false;
      }
      if (requestedDraftIds.length > 0) {
        return requestedDraftIds.includes(Number(row.id));
      }
      return true;
    });

    if (draftsToApprove.length < 1) {
      return res.status(400).json({
        message: "Tidak ada draft yang bisa di-approve pada job ini",
      });
    }

    const approvedMappings = [];
    for (const draft of draftsToApprove) {
      const questionId = await insertApprovedQuestionFromDraft({
        client,
        draftRow: draft,
      });

      await client.query(
        `
          UPDATE cbt.c_ai_question_draft
          SET
            draft_status = 'approved',
            approved_question_id = $2,
            approved_at = NOW(),
            updated_at = NOW()
          WHERE id = $1
        `,
        [draft.id, questionId],
      );

      approvedMappings.push({
        draft_id: draft.id,
        approved_question_id: questionId,
      });
    }

    const summary = await syncQuestionJobCounters(client, jobId);
    await client.query(
      `
        UPDATE cbt.c_ai_question_job
        SET
          status = CASE
            WHEN $2 >= total_generated AND total_generated > 0 THEN 'approved'
            ELSE status
          END,
          approved_at = CASE
            WHEN $2 >= total_generated AND total_generated > 0 THEN NOW()
            ELSE approved_at
          END,
          updated_at = NOW()
        WHERE id = $1
      `,
      [jobId, summary.approved_count],
    );

    return res.json({
      message: "Draft soal AI berhasil di-approve",
      data: {
        approved_items: approvedMappings,
        summary,
      },
    });
  }),
);

router.post(
  "/ai-question-drafts/:draft_id/discard",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const draftId = toIntegerOrNull(req.params.draft_id);
    const teacherId = req.user.id;

    if (!draftId) {
      return res.status(400).json({ message: "Parameter draft tidak valid" });
    }

    const draftRow = await getOwnedDraftWithJob(client, draftId, teacherId);
    if (!draftRow) {
      return res.status(404).json({ message: "Draft soal AI tidak ditemukan" });
    }
    if (draftRow.draft_status === "approved") {
      return res.status(400).json({
        message: "Draft yang sudah di-approve tidak dapat dibuang",
      });
    }
    if (draftRow.draft_status === "discarded") {
      return res.status(400).json({ message: "Draft ini sudah dibuang" });
    }

    await client.query(
      `
        UPDATE cbt.c_ai_question_draft
        SET
          draft_status = 'discarded',
          discarded_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `,
      [draftId],
    );

    const summary = await syncQuestionJobCounters(client, draftRow.job_id);
    await client.query(
      `
        UPDATE cbt.c_ai_question_job
        SET
          status = CASE
            WHEN $2 >= total_generated AND total_generated > 0 THEN 'discarded'
            ELSE status
          END,
          discarded_at = CASE
            WHEN $2 >= total_generated AND total_generated > 0 THEN NOW()
            ELSE discarded_at
          END,
          updated_at = NOW()
        WHERE id = $1
      `,
      [draftRow.job_id, summary.discarded_count],
    );

    return res.json({
      message: "Draft soal AI berhasil dibuang",
      data: {
        draft_id: draftId,
      },
    });
  }),
);

router.post(
  "/ai-question-jobs/:job_id/discard",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const jobId = toIntegerOrNull(req.params.job_id);
    const teacherId = req.user.id;

    if (!jobId) {
      return res.status(400).json({ message: "Parameter job tidak valid" });
    }

    const job = await getOwnedQuestionJob(client, jobId, teacherId);
    if (!job) {
      return res.status(404).json({ message: "Job draft AI tidak ditemukan" });
    }

    const draftRows = await getDraftRowsByJob(client, jobId);
    if (draftRows.some((row) => row.draft_status === "approved")) {
      return res.status(400).json({
        message:
          "Job ini sudah memiliki draft yang di-approve. Buang per draft untuk item yang belum dipakai.",
      });
    }

    await client.query(
      `
        UPDATE cbt.c_ai_question_draft
        SET
          draft_status = 'discarded',
          discarded_at = NOW(),
          updated_at = NOW()
        WHERE job_id = $1 AND draft_status <> 'discarded'
      `,
      [jobId],
    );

    const summary = await syncQuestionJobCounters(client, jobId);
    await client.query(
      `
        UPDATE cbt.c_ai_question_job
        SET
          status = 'discarded',
          discarded_at = NOW(),
          updated_at = NOW()
        WHERE id = $1
      `,
      [jobId],
    );

    return res.json({
      message: "Semua draft pada job AI berhasil dibuang",
      data: {
        job_id: jobId,
        summary,
      },
    });
  }),
);

export default router;
