import pool from "../../config/connection.js";
import { toJakartaDateString } from "../attendance/rfidDailyAttendance.js";
import { renderTelegramMessage } from "./messageBuilder.js";
import { isValidTelegramChatId } from "./recipientResolver.js";
import {
  getActivePeriodeId,
  isStudentHoliday,
  resolveTelegramRecipients,
} from "./recipientResolver.js";
import { randomDelayMs, sleep } from "./sendQueue.js";
import { ensureTelegramBotReady, sendTelegramMessage } from "./telegramBotManager.js";
import {
  claimTelegramRunDate,
  getDueTelegramConfigs,
  getJakartaNowContext,
  releaseTelegramRunDate,
} from "./telegramConfigStore.js";

/** Fixed inter-message delay (seconds). Not configurable in UI/DB. */
const SEND_DELAY_MIN_SECONDS = 1;
const SEND_DELAY_MAX_SECONDS = 3;

const finalizeBatch = async (executor, batchId, fields) => {
  await executor.query(
    `UPDATE attendance.telegram_notification_batch
     SET batch_status = $2,
         completed_at = COALESCE($3, NOW()),
         total_recipients = COALESCE($4, total_recipients),
         sent_count = COALESCE($5, sent_count),
         failed_count = COALESCE($6, failed_count),
         skipped_count = COALESCE($7, skipped_count),
         error_message = $8,
         updated_at = NOW()
     WHERE id = $1`,
    [
      batchId,
      fields.batch_status,
      fields.completed_at || new Date(),
      fields.total_recipients ?? null,
      fields.sent_count ?? null,
      fields.failed_count ?? null,
      fields.skipped_count ?? null,
      fields.error_message ?? null,
    ],
  );
};

const createBatch = async (executor, { homebaseId, periodeId, attendanceDate }) => {
  const result = await executor.query(
    `INSERT INTO attendance.telegram_notification_batch (
       homebase_id,
       periode_id,
       attendance_date,
       batch_status,
       scheduled_at,
       started_at
     )
     VALUES ($1, $2, $3, 'running', NOW(), NOW())
     ON CONFLICT (homebase_id, attendance_date) DO NOTHING
     RETURNING id`,
    [homebaseId, periodeId, attendanceDate],
  );

  return result.rows[0]?.id ? Number(result.rows[0].id) : null;
};

const insertQueuedLog = async (executor, { batchId, homebaseId, recipient, message }) => {
  const result = await executor.query(
    `INSERT INTO attendance.telegram_notification_log (
       batch_id,
       homebase_id,
       parent_user_id,
       parent_name,
       chat_id,
       message,
       students_payload,
       delivery_status
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, 'queued')
     ON CONFLICT (batch_id, parent_user_id)
     WHERE parent_user_id IS NOT NULL
     DO NOTHING
     RETURNING id`,
    [
      batchId,
      homebaseId,
      recipient.parent_user_id,
      recipient.parent_name,
      recipient.chat_id,
      message,
      JSON.stringify(recipient.students),
    ],
  );

  return result.rows[0]?.id ? Number(result.rows[0].id) : null;
};

const markLogSent = async (executor, logId, messageId) => {
  await executor.query(
    `UPDATE attendance.telegram_notification_log
     SET delivery_status = 'sent',
         telegram_message_id = $2,
         sent_at = NOW(),
         error_message = NULL
     WHERE id = $1`,
    [logId, messageId],
  );
};

const markLogFailed = async (executor, logId, errorMessage) => {
  await executor.query(
    `UPDATE attendance.telegram_notification_log
     SET delivery_status = 'failed',
         error_message = $2
     WHERE id = $1`,
    [logId, errorMessage],
  );
};

const markLogSkipped = async (executor, logId, errorMessage) => {
  await executor.query(
    `UPDATE attendance.telegram_notification_log
     SET delivery_status = 'skipped',
         error_message = $2
     WHERE id = $1`,
    [logId, errorMessage],
  );
};

const incrementBatchCounts = async (executor, batchId, delta) => {
  await executor.query(
    `UPDATE attendance.telegram_notification_batch
     SET sent_count = GREATEST(sent_count + $2, 0),
         failed_count = GREATEST(failed_count + $3, 0),
         skipped_count = GREATEST(skipped_count + $4, 0),
         updated_at = NOW()
     WHERE id = $1`,
    [batchId, delta.sent || 0, delta.failed || 0, delta.skipped || 0],
  );
};

const prepareTelegramBatch = async (executor, config, attendanceDate) => {
  const homebaseId = Number(config.homebase_id);
  const claimed = await claimTelegramRunDate(executor, homebaseId, attendanceDate);

  if (!claimed) {
    return {
      homebase_id: homebaseId,
      status: "skipped",
      reason: "already_ran_today",
    };
  }

  if (config.skip_on_holiday !== false) {
    const holiday = await isStudentHoliday(executor, homebaseId, attendanceDate);
    if (holiday) {
      return {
        homebase_id: homebaseId,
        status: "skipped",
        reason: "holiday",
      };
    }
  }

  const botState = await ensureTelegramBotReady(executor, homebaseId);
  if (!botState.ready) {
    await releaseTelegramRunDate(executor, homebaseId, attendanceDate);
    return {
      homebase_id: homebaseId,
      status: "skipped",
      reason: botState.reason || "telegram_not_ready",
      bot_status: botState.bot_status || "missing",
      error: botState.error || null,
    };
  }

  const periodeId = await getActivePeriodeId(executor, homebaseId);
  if (!periodeId) {
    await releaseTelegramRunDate(executor, homebaseId, attendanceDate);
    return {
      homebase_id: homebaseId,
      status: "skipped",
      reason: "active_periode_not_found",
    };
  }

  const batchId = await createBatch(executor, {
    homebaseId,
    periodeId,
    attendanceDate,
  });

  if (!batchId) {
    await releaseTelegramRunDate(executor, homebaseId, attendanceDate);
    return {
      homebase_id: homebaseId,
      status: "skipped",
      reason: "batch_exists",
    };
  }

  const recipients = await resolveTelegramRecipients(executor, {
    homebaseId,
    attendanceDate,
  });

  await executor.query(
    `UPDATE attendance.telegram_notification_batch
     SET total_recipients = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [batchId, recipients.length],
  );

  const queuedItems = [];

  for (const recipient of recipients) {
    const message = renderTelegramMessage({
      template: config.message_template,
      parentName: recipient.parent_name,
      attendanceDate,
      schoolName: config.school_name,
      students: recipient.students,
    });

    const logId = await insertQueuedLog(executor, {
      batchId,
      homebaseId,
      recipient,
      message,
    });

    if (logId) {
      queuedItems.push({
        logId,
        recipient,
        message,
      });
    }
  }

  return {
    homebase_id: homebaseId,
    batch_id: batchId,
    status: "prepared",
    total_recipients: recipients.length,
    queued_items: queuedItems,
    config,
  };
};

const executeTelegramBatchSend = async (prepared) => {
  const {
    homebase_id: homebaseId,
    batch_id: batchId,
    total_recipients: totalRecipients,
    queued_items: queuedItems,
  } = prepared;

  if (!batchId) {
    return prepared;
  }

  if (totalRecipients === 0) {
    await finalizeBatch(pool, batchId, {
      batch_status: "completed",
      total_recipients: 0,
      sent_count: 0,
      failed_count: 0,
      skipped_count: 0,
      error_message: null,
    });

    return {
      homebase_id: homebaseId,
      batch_id: batchId,
      status: "completed",
      total_recipients: 0,
      sent_count: 0,
      failed_count: 0,
      skipped_count: 0,
    };
  }

  let sentCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (let index = 0; index < queuedItems.length; index += 1) {
    const item = queuedItems[index];

    if (!isValidTelegramChatId(item.recipient.chat_id)) {
      await markLogSkipped(pool, item.logId, "Chat ID Telegram tidak valid.");
      skippedCount += 1;
      await incrementBatchCounts(pool, batchId, { skipped: 1 });
      continue;
    }

    try {
      const sendResult = await sendTelegramMessage({
        executor: pool,
        homebaseId,
        chatId: item.recipient.chat_id,
        message: item.message,
      });

      await markLogSent(pool, item.logId, sendResult.messageId);
      sentCount += 1;
      await incrementBatchCounts(pool, batchId, { sent: 1 });
    } catch (error) {
      const errorMessage = String(error?.message || "Gagal mengirim pesan Telegram.");
      await markLogFailed(pool, item.logId, errorMessage);
      failedCount += 1;
      await incrementBatchCounts(pool, batchId, { failed: 1 });
      console.error(
        `[telegram] gagal kirim homebase=${homebaseId} parent=${item.recipient.parent_user_id}`,
        error,
      );
    }

    if (index < queuedItems.length - 1) {
      await sleep(randomDelayMs(SEND_DELAY_MIN_SECONDS, SEND_DELAY_MAX_SECONDS));
    }
  }

  const batchStatus = failedCount > 0 && sentCount === 0 ? "failed" : "completed";

  await finalizeBatch(pool, batchId, {
    batch_status: batchStatus,
    total_recipients: totalRecipients,
    sent_count: sentCount,
    failed_count: failedCount,
    skipped_count: skippedCount,
    error_message:
      failedCount > 0 ? `${failedCount} pesan gagal dikirim.` : null,
  });

  return {
    homebase_id: homebaseId,
    batch_id: batchId,
    status: batchStatus,
    total_recipients: totalRecipients,
    sent_count: sentCount,
    failed_count: failedCount,
    skipped_count: skippedCount,
  };
};

export const runTelegramBatchForHomebase = async (
  executor,
  config,
  attendanceDate,
) => {
  const prepared = await prepareTelegramBatch(executor, config, attendanceDate);

  if (prepared.status !== "prepared") {
    return prepared;
  }

  return executeTelegramBatchSend(prepared);
};

export const runTelegramNotificationJob = async (dbPool = pool, now = new Date()) => {
  const { attendanceDate, currentHHmm } = getJakartaNowContext(now);
  const client = await dbPool.connect();

  try {
    const configs = await getDueTelegramConfigs(client, currentHHmm, attendanceDate);

    if (configs.length === 0) {
      return [];
    }

    console.log(
      `[telegram] ${configs.length} konfigurasi due pada ${currentHHmm} WIB (${attendanceDate})`,
    );

    const preparedBatches = [];

    for (const config of configs) {
      await client.query("BEGIN");

      try {
        const prepared = await prepareTelegramBatch(client, config, attendanceDate);
        await client.query("COMMIT");
        preparedBatches.push(prepared);
      } catch (error) {
        await client.query("ROLLBACK");
        await releaseTelegramRunDate(client, Number(config.homebase_id), attendanceDate);
        console.error(`[telegram] prepare error homebase=${config.homebase_id}`, error);
        preparedBatches.push({
          homebase_id: Number(config.homebase_id),
          status: "failed",
          reason: String(error?.message || "prepare_failed"),
        });
      }
    }

    const results = [];

    for (const prepared of preparedBatches) {
      if (prepared.status !== "prepared") {
        console.log(
          `[telegram] homebase=${prepared.homebase_id} dilewati: ${prepared.reason || prepared.status}`,
        );
        results.push(prepared);
        continue;
      }

      try {
        const result = await executeTelegramBatchSend(prepared);
        results.push(result);
      } catch (error) {
        console.error(
          `[telegram] send error homebase=${prepared.homebase_id} batch=${prepared.batch_id}`,
          error,
        );

        if (prepared.batch_id) {
          await finalizeBatch(pool, prepared.batch_id, {
            batch_status: "failed",
            total_recipients: prepared.total_recipients,
            sent_count: 0,
            failed_count: prepared.total_recipients,
            skipped_count: 0,
            error_message: String(error?.message || "send_failed"),
          });
        }

        results.push({
          homebase_id: prepared.homebase_id,
          batch_id: prepared.batch_id,
          status: "failed",
          reason: String(error?.message || "send_failed"),
        });
      }
    }

    return results;
  } finally {
    client.release();
  }
};

export const runTelegramNotificationJobForDate = async ({
  homebaseId,
  attendanceDate = toJakartaDateString(),
  dbPool = pool,
}) => {
  const client = await dbPool.connect();

  try {
    const configResult = await client.query(
      `SELECT
         c.*,
         h.name AS school_name
       FROM attendance.telegram_notification_config c
       JOIN public.a_homebase h ON h.id = c.homebase_id
       WHERE c.homebase_id = $1
       LIMIT 1`,
      [homebaseId],
    );

    const config = configResult.rows[0];
    if (!config) {
      return {
        homebase_id: Number(homebaseId),
        status: "skipped",
        reason: "config_not_found",
      };
    }

    await client.query("BEGIN");

    let prepared;
    try {
      prepared = await prepareTelegramBatch(client, config, attendanceDate);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      await releaseTelegramRunDate(client, Number(homebaseId), attendanceDate);
      throw error;
    }

    if (prepared.status !== "prepared") {
      return prepared;
    }

    return executeTelegramBatchSend(prepared);
  } finally {
    client.release();
  }
};

export const retryFailedTelegramBatch = async ({
  batchId,
  homebaseId,
  dbPool = pool,
}) => {
  const client = await dbPool.connect();

  try {
    const batchResult = await client.query(
      `SELECT *
       FROM attendance.telegram_notification_batch
       WHERE id = $1
         AND homebase_id = $2
       LIMIT 1`,
      [batchId, homebaseId],
    );

    const batch = batchResult.rows[0];
    if (!batch) {
      return {
        status: "error",
        message: "Batch tidak ditemukan.",
      };
    }

    const configResult = await client.query(
      `SELECT *
       FROM attendance.telegram_notification_config
       WHERE homebase_id = $1
       LIMIT 1`,
      [homebaseId],
    );

    const config = configResult.rows[0];
    if (!config) {
      return {
        status: "error",
        message: "Konfigurasi Telegram belum dibuat.",
      };
    }

    const botState = await ensureTelegramBotReady(client, homebaseId);
    if (!botState.ready) {
      return {
        status: "error",
        message: "Bot Telegram belum siap.",
        bot_status: botState.bot_status || "missing",
        error: botState.error || null,
      };
    }

    const failedLogs = await client.query(
      `SELECT *
       FROM attendance.telegram_notification_log
       WHERE batch_id = $1
         AND delivery_status = 'failed'
       ORDER BY id ASC`,
      [batchId],
    );

    if (failedLogs.rows.length === 0) {
      return {
        status: "skipped",
        message: "Tidak ada pesan gagal untuk di-retry.",
        retried_count: 0,
      };
    }

    let sentCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let index = 0; index < failedLogs.rows.length; index += 1) {
      const log = failedLogs.rows[index];

      if (!isValidTelegramChatId(log.chat_id)) {
        await markLogSkipped(pool, log.id, "Chat ID Telegram tidak valid.");
        skippedCount += 1;
        await incrementBatchCounts(pool, batchId, { skipped: 1, failed: -1 });
        continue;
      }

      try {
        const sendResult = await sendTelegramMessage({
          executor: pool,
          homebaseId,
          chatId: log.chat_id,
          message: log.message,
        });

        await markLogSent(pool, log.id, sendResult.messageId);
        sentCount += 1;
        await incrementBatchCounts(pool, batchId, { sent: 1, failed: -1 });
      } catch (error) {
        const errorMessage = String(error?.message || "Gagal mengirim pesan Telegram.");
        await markLogFailed(pool, log.id, errorMessage);
        failedCount += 1;
        console.error(`[telegram] retry gagal log=${log.id}`, error);
      }

      if (index < failedLogs.rows.length - 1) {
        await sleep(randomDelayMs(SEND_DELAY_MIN_SECONDS, SEND_DELAY_MAX_SECONDS));
      }
    }

    const batchStatus =
      failedCount > 0 && sentCount === 0 ? "failed" : "completed";

    await finalizeBatch(pool, batchId, {
      batch_status: batchStatus,
      error_message:
        failedCount > 0 ? `${failedCount} pesan masih gagal setelah retry.` : null,
    });

    return {
      status: "success",
      batch_id: Number(batchId),
      retried_count: failedLogs.rows.length,
      sent_count: sentCount,
      failed_count: failedCount,
      skipped_count: skippedCount,
    };
  } finally {
    client.release();
  }
};
