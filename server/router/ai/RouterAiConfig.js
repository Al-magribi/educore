import { Router } from "express";
import crypto from "crypto";
import multer from "multer";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

const FEATURE_CODES = [
  "question_generator",
  "essay_grader",
  "speech_to_text",
];

const DEFAULT_CONFIG = {
  provider: "openai",
  has_api_key: false,
  api_key_hint: null,
  default_model_text: "gpt-4.1-mini",
  default_model_audio: "gpt-4o-mini-transcribe",
  default_language: "id",
  default_mode: "live",
  max_audio_duration_seconds: 300,
  max_audio_file_size_mb: 20,
  is_active: true,
  last_test_at: null,
  last_test_status: null,
  last_test_message: null,
  features: {
    question_generator: true,
    essay_grader: true,
    speech_to_text: true,
  },
};

const getCipherSecret = () =>
  process.env.AI_CONFIG_CIPHER_KEY ||
  process.env.STT_CONFIG_CIPHER_KEY ||
  process.env.JWT ||
  "lms-ai-config-local-secret";

const getAesKey = () =>
  crypto.createHash("sha256").update(getCipherSecret()).digest();

const encryptApiKey = (plainText) => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getAesKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(String(plainText), "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
};

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

const buildApiKeyHint = (apiKey) => {
  const normalized = String(apiKey || "").trim();
  if (!normalized) return null;
  if (normalized.length <= 8) return normalized;
  return `${normalized.slice(0, 4)}...${normalized.slice(-4)}`;
};

const normalizeFeatureMap = (features = {}) =>
  FEATURE_CODES.reduce((accumulator, featureCode) => {
    accumulator[featureCode] =
      features[featureCode] === undefined ? true : Boolean(features[featureCode]);
    return accumulator;
  }, {});

const toConfigResponse = (configRow, featureRows) => {
  const featureMap = normalizeFeatureMap(
    Object.fromEntries(
      featureRows.map((item) => [item.feature_code, Boolean(item.is_enabled)]),
    ),
  );

  if (!configRow) {
    return {
      ...DEFAULT_CONFIG,
      features: featureMap,
    };
  }

  return {
    id: configRow.id,
    provider: configRow.provider,
    has_api_key: Boolean(configRow.api_key_encrypted),
    api_key_hint: configRow.api_key_hint,
    default_model_text: configRow.default_model_text,
    default_model_audio: configRow.default_model_audio,
    default_language: configRow.default_language,
    default_mode: configRow.default_mode,
    max_audio_duration_seconds: configRow.max_audio_duration_seconds,
    max_audio_file_size_mb: configRow.max_audio_file_size_mb,
    is_active: configRow.is_active,
    last_test_at: configRow.last_test_at,
    last_test_status: configRow.last_test_status,
    last_test_message: configRow.last_test_message,
    features: featureMap,
  };
};

const getTeacherConfigBundle = async (db, teacherId) => {
  const configResult = await db.query(
    `SELECT *
     FROM ai_teacher_config
     WHERE teacher_id = $1
     LIMIT 1`,
    [teacherId],
  );

  const configRow = configResult.rows[0] || null;
  const featureRows = configRow
    ? (
        await db.query(
          `SELECT feature_code, is_enabled
           FROM ai_teacher_feature
           WHERE teacher_config_id = $1`,
          [configRow.id],
        )
      ).rows
    : [];

  return {
    configRow,
    featureRows,
    config: toConfigResponse(configRow, featureRows),
  };
};

router.get(
  "/config",
  authorize("teacher"),
  withQuery(async (req, res, db) => {
    const teacherId = req.user.id;

    const configResult = await db.query(
      `SELECT *
       FROM ai_teacher_config
       WHERE teacher_id = $1
       LIMIT 1`,
      [teacherId],
    );

    const configRow = configResult.rows[0] || null;

    const featureResult = configRow
      ? await db.query(
          `SELECT feature_code, is_enabled
           FROM ai_teacher_feature
           WHERE teacher_config_id = $1`,
          [configRow.id],
        )
      : { rows: [] };

    res.json({
      code: 200,
      message: "OK",
      data: toConfigResponse(configRow, featureResult.rows),
    });
  }),
);

router.put(
  "/config",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const teacherId = req.user.id;
    const {
      provider = "openai",
      api_key,
      default_model_text = DEFAULT_CONFIG.default_model_text,
      default_model_audio = DEFAULT_CONFIG.default_model_audio,
      default_language = DEFAULT_CONFIG.default_language,
      default_mode = DEFAULT_CONFIG.default_mode,
      max_audio_duration_seconds = DEFAULT_CONFIG.max_audio_duration_seconds,
      max_audio_file_size_mb = DEFAULT_CONFIG.max_audio_file_size_mb,
      is_active = true,
      features = DEFAULT_CONFIG.features,
    } = req.body || {};

    const normalizedProvider = String(provider || "openai").trim().toLowerCase();
    if (normalizedProvider !== "openai") {
      return res.status(400).json({
        code: 400,
        message: "Provider saat ini hanya mendukung OpenAI",
      });
    }

    const normalizedMode = ["live", "ai"].includes(default_mode)
      ? default_mode
      : DEFAULT_CONFIG.default_mode;
    const normalizedLanguage = String(default_language || "id").trim() || "id";
    const normalizedTextModel =
      String(default_model_text || DEFAULT_CONFIG.default_model_text).trim() ||
      DEFAULT_CONFIG.default_model_text;
    const normalizedAudioModel =
      String(default_model_audio || DEFAULT_CONFIG.default_model_audio).trim() ||
      DEFAULT_CONFIG.default_model_audio;
    const normalizedDuration = Math.max(
      30,
      Number(max_audio_duration_seconds) || DEFAULT_CONFIG.max_audio_duration_seconds,
    );
    const normalizedFileSize = Math.max(
      1,
      Number(max_audio_file_size_mb) || DEFAULT_CONFIG.max_audio_file_size_mb,
    );
    const normalizedFeatures = normalizeFeatureMap(features);
    const normalizedApiKey = String(api_key || "").trim();

    const existingResult = await client.query(
      `SELECT *
       FROM ai_teacher_config
       WHERE teacher_id = $1
       LIMIT 1`,
      [teacherId],
    );

    let configRow = existingResult.rows[0] || null;

    if (!configRow) {
      const insertResult = await client.query(
        `INSERT INTO ai_teacher_config (
          teacher_id,
          provider,
          api_key_encrypted,
          api_key_hint,
          default_model_text,
          default_model_audio,
          default_language,
          default_mode,
          max_audio_duration_seconds,
          max_audio_file_size_mb,
          is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          teacherId,
          normalizedProvider,
          normalizedApiKey ? encryptApiKey(normalizedApiKey) : "",
          buildApiKeyHint(normalizedApiKey),
          normalizedTextModel,
          normalizedAudioModel,
          normalizedLanguage,
          normalizedMode,
          normalizedDuration,
          normalizedFileSize,
          Boolean(is_active),
        ],
      );
      configRow = insertResult.rows[0];
    } else {
      const nextEncryptedApiKey = normalizedApiKey
        ? encryptApiKey(normalizedApiKey)
        : configRow.api_key_encrypted;
      const nextApiKeyHint = normalizedApiKey
        ? buildApiKeyHint(normalizedApiKey)
        : configRow.api_key_hint;

      const updateResult = await client.query(
        `UPDATE ai_teacher_config
         SET provider = $1,
             api_key_encrypted = $2,
             api_key_hint = $3,
             default_model_text = $4,
             default_model_audio = $5,
             default_language = $6,
             default_mode = $7,
             max_audio_duration_seconds = $8,
             max_audio_file_size_mb = $9,
             is_active = $10,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $11
         RETURNING *`,
        [
          normalizedProvider,
          nextEncryptedApiKey,
          nextApiKeyHint,
          normalizedTextModel,
          normalizedAudioModel,
          normalizedLanguage,
          normalizedMode,
          normalizedDuration,
          normalizedFileSize,
          Boolean(is_active),
          configRow.id,
        ],
      );
      configRow = updateResult.rows[0];
    }

    await client.query(`DELETE FROM ai_teacher_feature WHERE teacher_config_id = $1`, [
      configRow.id,
    ]);

    for (const featureCode of FEATURE_CODES) {
      await client.query(
        `INSERT INTO ai_teacher_feature (
          teacher_config_id,
          feature_code,
          is_enabled,
          updated_at
        ) VALUES ($1, $2, $3, CURRENT_TIMESTAMP)`,
        [configRow.id, featureCode, normalizedFeatures[featureCode]],
      );
    }

    const featureResult = await client.query(
      `SELECT feature_code, is_enabled
       FROM ai_teacher_feature
       WHERE teacher_config_id = $1`,
      [configRow.id],
    );

    res.json({
      code: 200,
      message: "Konfigurasi AI berhasil disimpan",
      data: toConfigResponse(configRow, featureResult.rows),
    });
  }),
);

router.post(
  "/test-connection",
  authorize("teacher"),
  withTransaction(async (req, res, client) => {
    const teacherId = req.user.id;
    const { api_key } = req.body || {};

    const configResult = await client.query(
      `SELECT *
       FROM ai_teacher_config
       WHERE teacher_id = $1
       LIMIT 1`,
      [teacherId],
    );

    const configRow = configResult.rows[0] || null;
    const requestApiKey = String(api_key || "").trim();
    const storedApiKey = configRow?.api_key_encrypted
      ? decryptApiKey(configRow.api_key_encrypted)
      : "";
    const resolvedApiKey = requestApiKey || storedApiKey;

    if (!resolvedApiKey) {
      return res.status(400).json({
        code: 400,
        message: "API key belum tersedia. Simpan atau isi API key terlebih dahulu.",
      });
    }

    let nextStatus = "failed";
    let nextMessage = "Koneksi ke OpenAI gagal";

    try {
      const response = await fetch("https://api.openai.com/v1/models", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${resolvedApiKey}`,
        },
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null);
        nextMessage =
          errorPayload?.error?.message ||
          `OpenAI merespons dengan status ${response.status}`;
      } else {
        nextStatus = "success";
        nextMessage = "Koneksi OpenAI valid dan siap digunakan";
      }
    } catch (error) {
      nextMessage = error.message || nextMessage;
    }

    if (configRow) {
      await client.query(
        `UPDATE ai_teacher_config
         SET last_test_at = CURRENT_TIMESTAMP,
             last_test_status = $1,
             last_test_message = $2,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $3`,
        [nextStatus, nextMessage, configRow.id],
      );
    }

    if (nextStatus === "failed") {
      return res.status(400).json({
        code: 400,
        message: nextMessage,
        data: {
          status: nextStatus,
          message: nextMessage,
        },
      });
    }

    res.json({
      code: 200,
      message: nextMessage,
      data: {
        status: nextStatus,
        message: nextMessage,
      },
    });
  }),
);

router.post(
  "/transcribe",
  authorize("teacher"),
  upload.single("file"),
  withTransaction(async (req, res, client) => {
    const teacherId = req.user.id;
    const { configRow, config } = await getTeacherConfigBundle(client, teacherId);
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        code: 400,
        message: "File audio wajib diunggah.",
      });
    }

    if (!configRow || !config.has_api_key) {
      return res.status(403).json({
        code: 403,
        message: "API key OpenAI guru belum tersedia.",
      });
    }

    if (!config.is_active) {
      return res.status(403).json({
        code: 403,
        message: "Konfigurasi AI guru sedang dinonaktifkan.",
      });
    }

    if (!config.features?.speech_to_text) {
      return res.status(403).json({
        code: 403,
        message: "Fitur speech to text tidak aktif untuk akun guru ini.",
      });
    }

    const maxFileSizeBytes = Number(config.max_audio_file_size_mb || 20) * 1024 * 1024;
    if (file.size > maxFileSizeBytes) {
      return res.status(400).json({
        code: 400,
        message: `Ukuran file melebihi batas ${config.max_audio_file_size_mb} MB.`,
      });
    }

    const resolvedApiKey = decryptApiKey(configRow.api_key_encrypted);
    const formData = new FormData();
    formData.append(
      "file",
      new Blob([file.buffer], { type: file.mimetype || "audio/webm" }),
      file.originalname || "audio.webm",
    );
    formData.append(
      "model",
      config.default_model_audio || DEFAULT_CONFIG.default_model_audio,
    );
    formData.append(
      "language",
      String(config.default_language || DEFAULT_CONFIG.default_language),
    );

    let transcriptText = "";
    let usageStatus = "failed";
    let errorMessage = null;

    try {
      const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resolvedApiKey}`,
        },
        body: formData,
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        errorMessage =
          payload?.error?.message ||
          `OpenAI merespons dengan status ${response.status}`;
      } else {
        transcriptText = payload?.text || "";
        usageStatus = "success";
      }
    } catch (error) {
      errorMessage = error.message || "Gagal memproses transkripsi audio.";
    }

    await client.query(
      `INSERT INTO ai_usage_log (
        teacher_id,
        teacher_config_id,
        feature_code,
        provider,
        model,
        request_type,
        mode,
        input_units,
        transcript_text,
        estimated_cost_usd,
        status,
        error_message
      ) VALUES ($1, $2, 'speech_to_text', $3, $4, 'audio', 'ai', $5, $6, $7, $8, $9)`,
      [
        teacherId,
        configRow.id,
        config.provider,
        config.default_model_audio || DEFAULT_CONFIG.default_model_audio,
        file.size,
        transcriptText || null,
        null,
        usageStatus,
        errorMessage,
      ],
    );

    if (usageStatus !== "success") {
      return res.status(400).json({
        code: 400,
        message: errorMessage || "Gagal mentranskrip audio.",
      });
    }

    res.json({
      code: 200,
      message: "Audio berhasil ditranskrip",
      data: {
        text: transcriptText,
        model: config.default_model_audio || DEFAULT_CONFIG.default_model_audio,
      },
    });
  }),
);

router.get(
  "/usage-report",
  authorize("teacher"),
  withQuery(async (req, res, db) => {
    const teacherId = req.user.id;
    const limit = Math.max(1, Math.min(200, Number(req.query.limit) || 50));

    const rowsResult = await db.query(
      `
        SELECT
          log.job_id,
          job.exam_id,
          exam.name AS exam_name,
          job.status,
          job.error_message,
          job.requested_at,
          job.started_at,
          job.finished_at,
          job.total_students,
          job.total_items,
          job.processed_items,
          job.success_items,
          job.failed_items,
          job.skipped_items,
          COUNT(log.id)::int AS total_requests,
          COALESCE(SUM(log.total_tokens), 0)::bigint AS total_tokens,
          COALESCE(SUM(log.total_cost_usd), 0)::numeric(18,6) AS total_cost_usd,
          COALESCE(
            STRING_AGG(DISTINCT log.model, ', ' ORDER BY log.model)
              FILTER (WHERE log.model IS NOT NULL AND log.model <> ''),
            ''
          ) AS models
        FROM ai_usage_log log
        JOIN cbt.c_ai_grading_job job ON job.id = log.job_id
        LEFT JOIN cbt.c_exam exam ON exam.id = job.exam_id
        WHERE log.teacher_id = $1
          AND log.job_id IS NOT NULL
        GROUP BY
          log.job_id,
          job.exam_id,
          exam.name,
          job.status,
          job.error_message,
          job.requested_at,
          job.started_at,
          job.finished_at,
          job.total_students,
          job.total_items,
          job.processed_items,
          job.success_items,
          job.failed_items,
          job.skipped_items
        ORDER BY job.requested_at DESC, log.job_id DESC
        LIMIT $2
      `,
      [teacherId, limit],
    );

    const summaryResult = await db.query(
      `
        SELECT
          COUNT(*)::int AS total_jobs,
          COUNT(*) FILTER (WHERE job.status = 'completed')::int AS completed_jobs,
          COUNT(*) FILTER (WHERE job.status = 'failed')::int AS failed_jobs,
          COUNT(*) FILTER (WHERE job.status IN ('queued', 'running'))::int AS active_jobs,
          COALESCE(SUM(job.total_items), 0)::bigint AS total_items,
          COALESCE(SUM(job.processed_items), 0)::bigint AS processed_items,
          COALESCE(SUM(job.success_items), 0)::bigint AS success_items,
          COALESCE(SUM(job.failed_items), 0)::bigint AS failed_items,
          COALESCE(SUM(usage.total_tokens), 0)::bigint AS total_tokens,
          COALESCE(SUM(usage.total_cost_usd), 0)::numeric(18,6) AS total_cost_usd
        FROM (
          SELECT
            job_id,
            COALESCE(SUM(total_tokens), 0)::bigint AS total_tokens,
            COALESCE(SUM(total_cost_usd), 0)::numeric(18,6) AS total_cost_usd
          FROM ai_usage_log
          WHERE teacher_id = $1 AND job_id IS NOT NULL
          GROUP BY job_id
        ) usage
        JOIN cbt.c_ai_grading_job job ON job.id = usage.job_id
        WHERE job.requested_by = $1
      `,
      [teacherId],
    );

    res.json({
      code: 200,
      message: "OK",
      data: {
        summary: summaryResult.rows[0] || {
          total_jobs: 0,
          completed_jobs: 0,
          failed_jobs: 0,
          active_jobs: 0,
          total_items: 0,
          processed_items: 0,
          success_items: 0,
          failed_items: 0,
          total_tokens: 0,
          total_cost_usd: 0,
        },
        rows: rowsResult.rows || [],
      },
    });
  }),
);

export default router;
