import { Router } from "express";
import crypto from "crypto";
import { authorize } from "../../middleware/authorize.js";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { getPgBoss } from "../../config/pgBoss.js";
import pool from "../../config/connection.js";

const router = Router();
const AI_GRADING_QUEUE = "cbt-ai-grading";
const AI_MODEL_PRICING_USD_PER_1K = {
  "gpt-4.1-mini": { input: 0.0004, output: 0.0016 },
};

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
  if (!ivHex || !authTagHex || !dataHex) return String(encryptedValue);

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

const normalizeAnswerText = (value) =>
  String(value ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const extractMatchPairs = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        const leftId = parseInt(item?.leftId ?? item?.left_id ?? item?.left, 10);
        const rightId = parseInt(item?.rightId ?? item?.right_id ?? item?.right, 10);
        if (!Number.isInteger(leftId) || !Number.isInteger(rightId)) return null;
        return { leftId, rightId };
      })
      .filter(Boolean);
  }
  if (typeof value === "object") {
    const nested = value.pairs ?? value.matches ?? value.answer ?? value.answers;
    if (nested) return extractMatchPairs(nested);
  }
  return [];
};

const toNumber = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const toIntegerOrNull = (value) => {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
};

const getFriendlyAiErrorMessage = (errorMessage) => {
  const message = String(errorMessage || "").trim();
  if (!message) return "Proses koreksi AI gagal.";
  if (message.toLowerCase().includes("nan")) {
    return "Proses koreksi AI gagal karena payload antrian tidak valid. Silakan jalankan ulang koreksi AI.";
  }
  return message;
};

const getModelPricing = (modelName = "gpt-4.1-mini") =>
  AI_MODEL_PRICING_USD_PER_1K[modelName] || { input: 0, output: 0 };

const normalizeBossJobs = (jobs) => (Array.isArray(jobs) ? jobs : [jobs]).filter(Boolean);

const getBossJobData = (job) => {
  if (job?.data) return job.data;
  if (job?.data_json) return job.data_json;
  return {};
};

const getBossAiJobId = (job) => {
  const data = getBossJobData(job);
  return toIntegerOrNull(data?.jobId ?? data?.job_id);
};

const markAiGradingJobFailed = async ({ jobId, errorMessage }) => {
  const normalizedJobId = toIntegerOrNull(jobId);
  if (!normalizedJobId) return;
  await pool.query(
    `
      UPDATE cbt.c_ai_grading_job
      SET
        status = 'failed',
        error_message = $2,
        finished_at = COALESCE(finished_at, NOW()),
        updated_at = NOW()
      WHERE id = $1 AND status IN ('queued', 'running')
    `,
    [normalizedJobId, getFriendlyAiErrorMessage(errorMessage)],
  );
};

const syncFailedBossJobStatus = async ({ db, job }) => {
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
    [job.boss_job_id, AI_GRADING_QUEUE],
  );
  const bossJob = bossJobResult.rows[0];
  if (bossJob?.state !== "failed") return job;

  const output = bossJob.output || {};
  const errorMessage =
    output?.message ||
    output?.error ||
    "Proses koreksi AI gagal di background worker.";

  const updateResult = await db.query(
    `
      UPDATE cbt.c_ai_grading_job
      SET
        status = 'failed',
        error_message = $2,
        finished_at = COALESCE(finished_at, NOW()),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [job.id, getFriendlyAiErrorMessage(errorMessage).slice(0, 1000)],
  );
  return (
    updateResult.rows[0] || {
      ...job,
      status: "failed",
      error_message: getFriendlyAiErrorMessage(errorMessage),
    }
  );
};

const sanitizeAiGradingJobForResponse = (job) => {
  if (!job) return null;
  return {
    ...job,
    error_message: getFriendlyAiErrorMessage(job.error_message),
  };
};

const validateExamOwnership = async ({ db, user, examId }) => {
  const examCheck = await db.query(
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
    return { ok: false, status: 404, message: "Ujian tidak ditemukan" };
  }
  const examOwner = examCheck.rows[0];
  if (user.role === "teacher" && examOwner.teacher_id !== user.id) {
    return { ok: false, status: 403, message: "Akses tidak diizinkan" };
  }
  if (user.role === "admin" && examOwner.homebase_id !== user.homebase_id) {
    return { ok: false, status: 403, message: "Akses tidak diizinkan" };
  }
  return { ok: true };
};

const syncJobSummary = async (db, jobId) => {
  const summaryResult = await db.query(
    `
      SELECT
        COUNT(*)::int AS total_items,
        COUNT(*) FILTER (WHERE status IN ('completed','failed','skipped'))::int AS processed_items,
        COUNT(*) FILTER (WHERE status = 'completed')::int AS success_items,
        COUNT(*) FILTER (WHERE status = 'failed')::int AS failed_items,
        COUNT(*) FILTER (WHERE status = 'skipped')::int AS skipped_items
      FROM cbt.c_ai_grading_job_item
      WHERE job_id = $1
    `,
    [jobId],
  );
  const row = summaryResult.rows[0] || {};
  await db.query(
    `
      UPDATE cbt.c_ai_grading_job
      SET
        total_items = $2,
        processed_items = $3,
        success_items = $4,
        failed_items = $5,
        skipped_items = $6,
        updated_at = NOW()
      WHERE id = $1
    `,
    [
      jobId,
      Number(row.total_items || 0),
      Number(row.processed_items || 0),
      Number(row.success_items || 0),
      Number(row.failed_items || 0),
      Number(row.skipped_items || 0),
    ],
  );
};

const buildEssayPrompt = ({ questionContent, answerText, rubricRows, maxScore }) => ({
  model: "gpt-4.1-mini",
  temperature: 0.1,
  messages: [
    {
      role: "system",
      content:
        "Anda adalah asisten penilai. Nilai jawaban siswa secara objektif memakai rubric. Kembalikan JSON valid saja.",
    },
    {
      role: "user",
      content: JSON.stringify(
        {
          instruction:
            "Berikan skor per rubric (tidak boleh melebihi max_score), feedback singkat per rubric, confidence 0-100, dan total_score.",
          question: questionContent,
          answer: answerText,
          max_score: maxScore,
          rubric: rubricRows.map((row) => ({
            rubric_id: row.id,
            criteria_name: row.criteria_name,
            criteria_description: row.criteria_description,
            max_score: Number(row.max_score || 0),
          })),
          output_schema: {
            rubric_scores: [
              { rubric_id: "number", score: "number", feedback: "string" },
            ],
            total_score: "number",
            confidence: "number 0-100",
            summary_feedback: "string",
          },
        },
        null,
        2,
      ),
    },
  ],
});

const processItemWithAI = async ({ client, item, teacherApiKey }) => {
  if (!teacherApiKey) {
    return { ok: false, error: "API key OpenAI guru belum tersedia." };
  }

  const questionResult = await client.query(
    `
      SELECT id, q_type, content, score_point
      FROM cbt.c_question
      WHERE id = $1
      LIMIT 1
    `,
    [item.question_id],
  );
  if (questionResult.rowCount === 0) {
    return { ok: false, error: "Soal tidak ditemukan" };
  }
  const question = questionResult.rows[0];

  const answerResult = await client.query(
    `
      SELECT answer_json
      FROM cbt.c_student_answer
      WHERE exam_id = $1 AND student_id = $2 AND question_id = $3
      LIMIT 1
    `,
    [item.exam_id, item.student_id, item.question_id],
  );
  const answerJson = answerResult.rows[0]?.answer_json;

  if (Number(question.q_type) === 6) {
    const pairs = extractMatchPairs(answerJson);
    const totalPairs = pairs.length;
    const correctCount = pairs.filter((pair) => String(pair.leftId) === String(pair.rightId)).length;
    const maxScore = Number(question.score_point || item.max_score || 0);
    const score = totalPairs > 0 ? clamp((correctCount / totalPairs) * maxScore, 0, maxScore) : 0;
    return {
      ok: true,
      score: Number(score.toFixed(2)),
      confidence: totalPairs > 0 ? Number(((correctCount / totalPairs) * 100).toFixed(2)) : 0,
      summaryFeedback: `Auto match: ${correctCount}/${totalPairs} pasangan benar.`,
      rubricScores: [],
      rawResponse: { mode: "match-auto", correctCount, totalPairs },
      usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, estimated: true },
      model: "rule-based-match",
    };
  }

  if (Number(question.q_type) === 4) {
    const answerText = normalizeAnswerText(
      typeof answerJson === "string" ? answerJson : answerJson?.answer ?? answerJson?.value,
    );
    const optionsResult = await client.query(
      `
        SELECT content, label, is_correct
        FROM cbt.c_question_options
        WHERE question_id = $1
      `,
      [item.question_id],
    );
    const correctOptions = optionsResult.rows.filter((row) => row.is_correct);
    const isCorrect = correctOptions.some((row) => {
      const c1 = normalizeAnswerText(row.content);
      const c2 = normalizeAnswerText(row.label);
      return answerText && (answerText === c1 || answerText === c2);
    });
    const maxScore = Number(question.score_point || item.max_score || 0);
    const score = isCorrect ? maxScore : 0;
    return {
      ok: true,
      score,
      confidence: isCorrect ? 90 : 60,
      summaryFeedback: isCorrect
        ? "Jawaban singkat sesuai kunci."
        : "Jawaban singkat tidak sesuai kunci.",
      rubricScores: [],
      rawResponse: { mode: "short-auto", isCorrect },
      usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0, estimated: true },
      model: "rule-based-short",
    };
  }

  const rubricResult = await client.query(
    `
      SELECT id, criteria_name, criteria_description, max_score, order_no
      FROM cbt.c_question_rubric
      WHERE question_id = $1
      ORDER BY order_no ASC, id ASC
    `,
    [item.question_id],
  );
  const rubricRows = rubricResult.rows;
  if (rubricRows.length < 1) {
    return { ok: false, error: "Rubrik uraian belum tersedia." };
  }

  const answerText =
    typeof answerJson === "string"
      ? answerJson
      : JSON.stringify(answerJson || {});
  const payload = buildEssayPrompt({
    questionContent: question.content,
    answerText,
    rubricRows,
    maxScore: Number(question.score_point || item.max_score || 0),
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${teacherApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    return {
      ok: false,
      error: `OpenAI ${response.status}: ${errorBody.slice(0, 500)}`,
    };
  }

  const responseJson = await response.json();
  const content = responseJson?.choices?.[0]?.message?.content || "{}";
  let parsed = {};
  try {
    parsed = JSON.parse(content);
  } catch {
    return { ok: false, error: "Format respons AI bukan JSON valid." };
  }

  const rubricScores = Array.isArray(parsed.rubric_scores)
    ? parsed.rubric_scores
    : [];

  const rubricMap = new Map(rubricRows.map((row) => [Number(row.id), row]));
  const normalizedScores = rubricScores
    .map((entry) => {
      const rubricId = Number(entry?.rubric_id);
      const rubric = rubricMap.get(rubricId);
      if (!rubric) return null;
      const score = clamp(
        toNumber(entry?.score),
        0,
        Number(rubric.max_score || 0),
      );
      return {
        rubricId,
        score: Number(score.toFixed(2)),
        feedback: String(entry?.feedback || ""),
      };
    })
    .filter(Boolean);

  const totalByRubric = normalizedScores.reduce((sum, row) => sum + row.score, 0);
  const maxScore = Number(question.score_point || item.max_score || 0);
  const finalScore = clamp(toNumber(parsed.total_score || totalByRubric), 0, maxScore);
  const promptTokens = Number(responseJson?.usage?.prompt_tokens || 0);
  const completionTokens = Number(responseJson?.usage?.completion_tokens || 0);
  const totalTokens = Number(responseJson?.usage?.total_tokens || promptTokens + completionTokens);

  return {
    ok: true,
    score: Number(finalScore.toFixed(2)),
    confidence: clamp(toNumber(parsed.confidence), 0, 100),
    summaryFeedback: String(parsed.summary_feedback || ""),
    rubricScores: normalizedScores,
    rawResponse: responseJson,
    usage: {
      input_tokens: promptTokens,
      output_tokens: completionTokens,
      total_tokens: totalTokens,
      estimated: false,
    },
    model: payload.model || "gpt-4.1-mini",
  };
};

const insertAiUsageLog = async ({
  client,
  job,
  item,
  teacherConfig,
  aiResult,
  status,
  errorMessage = null,
}) => {
  try {
    const model = aiResult?.model || teacherConfig?.default_model_text || "gpt-4.1-mini";
    const usage = aiResult?.usage || {};
    const inputTokens = Number(usage.input_tokens || 0);
    const outputTokens = Number(usage.output_tokens || 0);
    const totalTokens = Number(usage.total_tokens || inputTokens + outputTokens);
    const pricing = getModelPricing(model);
    const costInput = (inputTokens / 1000) * Number(pricing.input || 0);
    const costOutput = (outputTokens / 1000) * Number(pricing.output || 0);
    const totalCost = costInput + costOutput;

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
          $1, $2, 'essay_grader', $3, $4, 'text', 'ai',
          $5, $6, $7, $8, $9, $10, $11, $12, $13,
          $14, $15, $16, 'USD', $17, $18, $19::jsonb, $20, $21
        )
      `,
      [
        job.requested_by,
        teacherConfig?.id || null,
        teacherConfig?.provider || "openai",
        model,
        String(item.id),
        job.id,
        "cbt.c_ai_grading_job_item",
        item.id,
        inputTokens,
        outputTokens,
        totalTokens,
        pricing.input,
        pricing.output,
        Number(costInput.toFixed(6)),
        Number(costOutput.toFixed(6)),
        Number(totalCost.toFixed(6)),
        Boolean(usage.estimated),
        aiResult?.summaryFeedback || null,
        JSON.stringify(aiResult?.rawResponse || {}),
        status,
        errorMessage,
      ],
    );
  } catch (error) {
    console.error("[ai-usage-log] failed to insert usage log", error?.message || error);
  }
};

const upsertReviewResult = async ({ client, item, aiResult, userId }) => {
  const reviewResult = await client.query(
    `
      INSERT INTO cbt.c_answer_review (
        exam_id, student_id, question_id, review_status,
        grading_source, total_score, reviewer_id, reviewed_at, notes
      )
      VALUES ($1, $2, $3, 'reviewed', 'ai', $4, $5, NOW(), $6)
      ON CONFLICT (exam_id, student_id, question_id)
      DO UPDATE SET
        review_status = CASE
          WHEN cbt.c_answer_review.review_status = 'finalized'
            THEN cbt.c_answer_review.review_status
          ELSE 'reviewed'
        END,
        grading_source = CASE
          WHEN cbt.c_answer_review.grading_source = 'manual' THEN 'hybrid'
          ELSE 'ai'
        END,
        total_score = CASE
          WHEN cbt.c_answer_review.review_status = 'finalized'
            THEN cbt.c_answer_review.total_score
          ELSE EXCLUDED.total_score
        END,
        reviewer_id = EXCLUDED.reviewer_id,
        reviewed_at = NOW(),
        notes = EXCLUDED.notes,
        updated_at = NOW()
      RETURNING id, review_status, total_score
    `,
    [
      item.exam_id,
      item.student_id,
      item.question_id,
      aiResult.score,
      userId,
      aiResult.summaryFeedback || null,
    ],
  );
  const review = reviewResult.rows[0];

  if (Array.isArray(aiResult.rubricScores) && aiResult.rubricScores.length > 0) {
    for (const row of aiResult.rubricScores) {
      await client.query(
        `
          INSERT INTO cbt.c_answer_review_detail (
            review_id, question_rubric_id, score, feedback, source
          )
          VALUES ($1, $2, $3, $4, 'ai')
          ON CONFLICT (review_id, question_rubric_id)
          DO UPDATE SET
            score = EXCLUDED.score,
            feedback = EXCLUDED.feedback,
            source = 'ai',
            updated_at = NOW()
        `,
        [review.id, row.rubricId, row.score, row.feedback || ""],
      );
    }
  }

  if (review.review_status !== "finalized") {
    await client.query(
      `
        INSERT INTO cbt.c_student_answer (exam_id, student_id, question_id, score_obtained)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (exam_id, student_id, question_id)
        DO UPDATE SET score_obtained = EXCLUDED.score_obtained, updated_at = NOW()
      `,
      [item.exam_id, item.student_id, item.question_id, review.total_score],
    );
  }

  return review.id;
};

const processAiGradingJob = async ({ pool, jobId }) => {
  const normalizedJobId = toIntegerOrNull(jobId);
  if (!normalizedJobId) {
    throw new Error("Payload job koreksi AI tidak valid.");
  }

  await pool.query(
    `UPDATE cbt.c_ai_grading_job SET status='running', started_at=NOW(), updated_at=NOW() WHERE id=$1`,
    [normalizedJobId],
  );

  const jobResult = await pool.query(
    `SELECT id, requested_by, exam_id, status FROM cbt.c_ai_grading_job WHERE id=$1 LIMIT 1`,
    [normalizedJobId],
  );
  if (jobResult.rowCount === 0) return;
  const job = jobResult.rows[0];

  const configResult = await pool.query(
    `
      SELECT id, api_key_encrypted, is_active, default_model_text, provider
      FROM ai_teacher_config
      WHERE teacher_id = $1
      LIMIT 1
    `,
    [job.requested_by],
  );
  const teacherConfig = configResult.rows[0];
  const teacherApiKey = teacherConfig?.api_key_encrypted
    ? decryptApiKey(teacherConfig.api_key_encrypted)
    : "";

  const itemsResult = await pool.query(
    `
      SELECT id, job_id, exam_id, student_id, question_id, question_type, max_score
      FROM cbt.c_ai_grading_job_item
      WHERE job_id = $1 AND status IN ('queued', 'failed')
      ORDER BY id ASC
    `,
    [normalizedJobId],
  );

  for (const item of itemsResult.rows) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `
          UPDATE cbt.c_ai_grading_job_item
          SET status='running', started_at=NOW(), attempt_count=attempt_count+1, updated_at=NOW()
          WHERE id=$1
        `,
        [item.id],
      );

      const aiResult = await processItemWithAI({
        client,
        item,
        teacherApiKey,
      });

      if (!aiResult.ok) {
        await insertAiUsageLog({
          client,
          job,
          item,
          teacherConfig,
          aiResult: { model: teacherConfig?.default_model_text || "gpt-4.1-mini" },
          status: "failed",
          errorMessage: aiResult.error || "Gagal memproses item AI",
        });
        await client.query(
          `
            UPDATE cbt.c_ai_grading_job_item
            SET status='failed', finished_at=NOW(), error_message=$2, updated_at=NOW()
            WHERE id=$1
          `,
          [item.id, aiResult.error || "Gagal memproses item AI"],
        );
      } else {
        const answerReviewId = await upsertReviewResult({
          client,
          item,
          aiResult,
          userId: job.requested_by,
        });

        await insertAiUsageLog({
          client,
          job,
          item,
          teacherConfig,
          aiResult,
          status: "success",
          errorMessage: null,
        });

        await client.query(
          `
            UPDATE cbt.c_ai_grading_job_item
            SET
              status='completed',
              finished_at=NOW(),
              score_awarded=$2,
              confidence_score=$3,
              feedback_summary=$4,
              answer_review_id=$5,
              response_payload=$6::jsonb,
              error_message=NULL,
              updated_at=NOW()
            WHERE id=$1
          `,
          [
            item.id,
            aiResult.score,
            aiResult.confidence,
            aiResult.summaryFeedback || "",
            answerReviewId,
            JSON.stringify(aiResult.rawResponse || {}),
          ],
        );
      }

      await syncJobSummary(client, normalizedJobId);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      await pool.query(
        `
          UPDATE cbt.c_ai_grading_job_item
          SET status='failed', finished_at=NOW(), error_message=$2, updated_at=NOW()
          WHERE id=$1
        `,
        [item.id, error.message || "Internal error saat memproses item"],
      );
      await syncJobSummary(pool, normalizedJobId);
    } finally {
      client.release();
    }
  }

  await pool.query(
    `
      UPDATE cbt.c_ai_grading_job
      SET
        status = CASE
          WHEN failed_items > 0 AND success_items = 0 THEN 'failed'
          ELSE 'completed'
        END,
        finished_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `,
    [normalizedJobId],
  );
};

let workerRegistered = false;
let queueReady = false;

const ensureAiQueue = async () => {
  if (queueReady) return;
  const boss = await getPgBoss();
  try {
    await boss.createQueue(AI_GRADING_QUEUE);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (!message.includes("already exists")) {
      throw error;
    }
  }
  queueReady = true;
};

const registerWorker = async () => {
  if (workerRegistered) return;
  const boss = await getPgBoss();
  await ensureAiQueue();
  await boss.work(AI_GRADING_QUEUE, async (pgBossJobs) => {
    for (const pgBossJob of normalizeBossJobs(pgBossJobs)) {
      const jobId = getBossAiJobId(pgBossJob);
      if (!Number.isInteger(jobId)) {
        throw new Error("Payload job koreksi AI tidak valid.");
      }

      try {
        await processAiGradingJob({ pool, jobId });
      } catch (error) {
        await markAiGradingJobFailed({
          jobId,
          errorMessage: error?.message || "Proses koreksi AI gagal.",
        });
        throw error;
      }
    }
  });
  workerRegistered = true;
  console.log(`[pg-boss] worker registered for queue "${AI_GRADING_QUEUE}"`);
};

registerWorker().catch((error) => {
  console.error("[pg-boss] failed to register AI grading worker", error);
});

router.post(
  "/exam-attendance/:exam_id/ai-grading/start",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const examId = parseInt(req.params.exam_id, 10);
    const user = req.user;
    if (!Number.isInteger(examId)) {
      return res.status(400).json({ message: "Parameter exam tidak valid" });
    }

    const access = await validateExamOwnership({ db: client, user, examId });
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const existingJob = await client.query(
      `
        SELECT id, status, boss_job_id
        FROM cbt.c_ai_grading_job
        WHERE exam_id = $1 AND status IN ('queued', 'running')
        ORDER BY id DESC
        LIMIT 1
      `,
      [examId],
    );
    if (existingJob.rowCount > 0) {
      const syncedJob = await syncFailedBossJobStatus({
        db: client,
        job: existingJob.rows[0],
      });
      if (["queued", "running"].includes(syncedJob.status)) {
        return res.status(409).json({
          message: "Masih ada proses koreksi AI yang berjalan untuk ujian ini",
          data: sanitizeAiGradingJobForResponse(syncedJob),
        });
      }
    }

    const configResult = await client.query(
      `
        SELECT id, is_active, api_key_encrypted
        FROM ai_teacher_config
        WHERE teacher_id = $1
        LIMIT 1
      `,
      [user.id],
    );
    const aiConfig = configResult.rows[0];
    if (!aiConfig || !aiConfig.api_key_encrypted) {
      return res.status(400).json({ message: "API key OpenAI guru belum tersedia" });
    }
    if (!aiConfig.is_active) {
      return res.status(400).json({ message: "Konfigurasi AI guru tidak aktif" });
    }

    const targetRows = await client.query(
      `
        SELECT
          sa.exam_id,
          sa.student_id,
          sa.question_id,
          q.q_type AS question_type,
          q.score_point AS max_score
        FROM cbt.c_student_answer sa
        JOIN cbt.c_question q ON q.id = sa.question_id
        WHERE sa.exam_id = $1
          AND q.q_type IN (3, 4, 6)
      `,
      [examId],
    );
    const items = targetRows.rows;
    if (items.length < 1) {
      return res.status(400).json({ message: "Tidak ada jawaban yang bisa dikoreksi AI" });
    }

    const totalStudentsSet = new Set(items.map((row) => Number(row.student_id)));
    const insertJob = await client.query(
      `
        INSERT INTO cbt.c_ai_grading_job (
          exam_id, requested_by, ai_teacher_config_id, status, boss_queue_name,
          total_students, total_items, requested_at
        )
        VALUES ($1, $2, $3, 'queued', $4, $5, $6, NOW())
        RETURNING id, exam_id, status, total_items, total_students, requested_at
      `,
      [examId, user.id, aiConfig.id, AI_GRADING_QUEUE, totalStudentsSet.size, items.length],
    );
    const newJob = insertJob.rows[0];

    for (const row of items) {
      await client.query(
        `
          INSERT INTO cbt.c_ai_grading_job_item (
            job_id, exam_id, student_id, question_id, question_type, max_score, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, 'queued')
          ON CONFLICT (job_id, student_id, question_id) DO NOTHING
        `,
        [
          newJob.id,
          row.exam_id,
          row.student_id,
          row.question_id,
          row.question_type,
          toNumber(row.max_score),
        ],
      );
    }

    const boss = await getPgBoss();
    await ensureAiQueue();
    const bossJobId = await boss.send(AI_GRADING_QUEUE, {
      jobId: newJob.id,
      examId,
      requestedBy: user.id,
    });

    await client.query(
      `
        UPDATE cbt.c_ai_grading_job
        SET boss_job_id = $2, updated_at = NOW()
        WHERE id = $1
      `,
      [newJob.id, bossJobId || null],
    );

    return res.json({
      message: "Proses koreksi AI dimulai",
      data: {
        ...newJob,
        boss_job_id: bossJobId || null,
      },
    });
  }),
);

router.get(
  "/exam-attendance/:exam_id/ai-grading/latest",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const examId = parseInt(req.params.exam_id, 10);
    const user = req.user;
    if (!Number.isInteger(examId)) {
      return res.status(400).json({ message: "Parameter exam tidak valid" });
    }

    const access = await validateExamOwnership({ db: pool, user, examId });
    if (!access.ok) {
      return res.status(access.status).json({ message: access.message });
    }

    const result = await pool.query(
      `
        SELECT *
        FROM cbt.c_ai_grading_job
        WHERE exam_id = $1
        ORDER BY id DESC
        LIMIT 1
      `,
      [examId],
    );
    const job = result.rows[0]
      ? await syncFailedBossJobStatus({ db: pool, job: result.rows[0] })
      : null;
    return res.json({
      message: "OK",
      data: sanitizeAiGradingJobForResponse(job),
    });
  }),
);

export default router;
