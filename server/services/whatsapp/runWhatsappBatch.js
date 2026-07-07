import pool from "../../config/connection.js";
import { toJakartaDateString } from "../attendance/rfidDailyAttendance.js";
import { renderWhatsappMessage } from "./messageBuilder.js";
import { isValidPhone } from "./phoneUtils.js";
import {
  getActivePeriodeId,
  isStudentHoliday,
  resolveWhatsappRecipients,
} from "./recipientResolver.js";
import { randomDelayMs, sleep } from "./sendQueue.js";
import { sendWhatsappMessage } from "./whatsappClientManager.js";
import {
  claimWhatsappRunDate,
  getDueWhatsappConfigs,
  getJakartaNowContext,
  getWhatsappSession,
  releaseWhatsappRunDate,
} from "./whatsappSessionStore.js";

const finalizeBatch = async (executor, batchId, fields) => {
  await executor.query(
    `UPDATE attendance.whatsapp_notification_batch
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
    `INSERT INTO attendance.whatsapp_notification_batch (
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
    `INSERT INTO attendance.whatsapp_notification_log (
       batch_id,
       homebase_id,
       parent_user_id,
       parent_name,
       phone,
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
      recipient.phone,
      message,
      JSON.stringify(recipient.students),
    ],
  );

  return result.rows[0]?.id ? Number(result.rows[0].id) : null;
};

const markLogSent = async (executor, logId, messageId) => {
  await executor.query(
    `UPDATE attendance.whatsapp_notification_log
     SET delivery_status = 'sent',
         whatsapp_message_id = $2,
         sent_at = NOW(),
         error_message = NULL
     WHERE id = $1`,
    [logId, messageId],
  );
};

const markLogFailed = async (executor, logId, errorMessage) => {
  await executor.query(
    `UPDATE attendance.whatsapp_notification_log
     SET delivery_status = 'failed',
         error_message = $2
     WHERE id = $1`,
    [logId, errorMessage],
  );
};

const markLogSkipped = async (executor, logId, errorMessage) => {
  await executor.query(
    `UPDATE attendance.whatsapp_notification_log
     SET delivery_status = 'skipped',
         error_message = $2
     WHERE id = $1`,
    [logId, errorMessage],
  );
};

const incrementBatchCounts = async (executor, batchId, delta) => {
  await executor.query(
    `UPDATE attendance.whatsapp_notification_batch
     SET sent_count = GREATEST(sent_count + $2, 0),
         failed_count = GREATEST(failed_count + $3, 0),
         skipped_count = GREATEST(skipped_count + $4, 0),
         updated_at = NOW()
     WHERE id = $1`,
    [batchId, delta.sent || 0, delta.failed || 0, delta.skipped || 0],
  );
};

const prepareWhatsappBatch = async (executor, config, attendanceDate) => {
  const homebaseId = Number(config.homebase_id);
  const claimed = await claimWhatsappRunDate(executor, homebaseId, attendanceDate);

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
      await releaseWhatsappRunDate(executor, homebaseId, attendanceDate);
      return {
        homebase_id: homebaseId,
        status: "skipped",
        reason: "holiday",
      };
    }
  }

  const session = await getWhatsappSession(executor, homebaseId);
  if (session?.session_status !== "ready") {
    await releaseWhatsappRunDate(executor, homebaseId, attendanceDate);
    return {
      homebase_id: homebaseId,
      status: "skipped",
      reason: "whatsapp_not_ready",
      session_status: session?.session_status || "missing",
    };
  }

  const periodeId = await getActivePeriodeId(executor, homebaseId);
  if (!periodeId) {
    await releaseWhatsappRunDate(executor, homebaseId, attendanceDate);
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
    await releaseWhatsappRunDate(executor, homebaseId, attendanceDate);
    return {
      homebase_id: homebaseId,
      status: "skipped",
      reason: "batch_exists",
    };
  }

  const recipients = await resolveWhatsappRecipients(executor, {
    homebaseId,
    attendanceDate,
  });

  await executor.query(
    `UPDATE attendance.whatsapp_notification_batch
     SET total_recipients = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [batchId, recipients.length],
  );

  const queuedItems = [];

  for (const recipient of recipients) {
    const message = renderWhatsappMessage({
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

const executeWhatsappBatchSend = async (prepared) => {
  const {
    homebase_id: homebaseId,
    batch_id: batchId,
    total_recipients: totalRecipients,
    queued_items: queuedItems,
    config,
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

    if (!isValidPhone(item.recipient.phone)) {
      await markLogSkipped(pool, item.logId, "Nomor telepon tidak valid.");
      skippedCount += 1;
      await incrementBatchCounts(pool, batchId, { skipped: 1 });
      continue;
    }

    try {
      const sendResult = await sendWhatsappMessage({
        homebaseId,
        phone: item.recipient.phone,
        message: item.message,
      });

      await markLogSent(pool, item.logId, sendResult.messageId);
      sentCount += 1;
      await incrementBatchCounts(pool, batchId, { sent: 1 });
    } catch (error) {
      const errorMessage = String(error?.message || "Gagal mengirim pesan WhatsApp.");
      await markLogFailed(pool, item.logId, errorMessage);
      failedCount += 1;
      await incrementBatchCounts(pool, batchId, { failed: 1 });
      console.error(
        `[whatsapp] gagal kirim homebase=${homebaseId} parent=${item.recipient.parent_user_id}`,
        error,
      );
    }

    if (index < queuedItems.length - 1) {
      await sleep(
        randomDelayMs(config.send_delay_min_seconds, config.send_delay_max_seconds),
      );
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

export const runWhatsappBatchForHomebase = async (
  executor,
  config,
  attendanceDate,
) => {
  const prepared = await prepareWhatsappBatch(executor, config, attendanceDate);

  if (prepared.status !== "prepared") {
    return prepared;
  }

  return executeWhatsappBatchSend(prepared);
};

export const runWhatsappNotificationJob = async (dbPool = pool, now = new Date()) => {
  const { attendanceDate, currentHHmm } = getJakartaNowContext(now);
  const client = await dbPool.connect();

  try {
    const configs = await getDueWhatsappConfigs(client, currentHHmm, attendanceDate);

    if (configs.length === 0) {
      return [];
    }

    const preparedBatches = [];

    for (const config of configs) {
      await client.query("BEGIN");

      try {
        const prepared = await prepareWhatsappBatch(client, config, attendanceDate);
        await client.query("COMMIT");

        if (prepared.status === "prepared") {
          preparedBatches.push(prepared);
        } else {
          preparedBatches.push(prepared);
        }
      } catch (error) {
        await client.query("ROLLBACK");
        await releaseWhatsappRunDate(client, Number(config.homebase_id), attendanceDate);
        console.error(`[whatsapp] prepare error homebase=${config.homebase_id}`, error);
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
        results.push(prepared);
        continue;
      }

      try {
        const result = await executeWhatsappBatchSend(prepared);
        results.push(result);
      } catch (error) {
        console.error(
          `[whatsapp] send error homebase=${prepared.homebase_id} batch=${prepared.batch_id}`,
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

export const runWhatsappNotificationJobForDate = async ({
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
       FROM attendance.whatsapp_notification_config c
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
      prepared = await prepareWhatsappBatch(client, config, attendanceDate);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      await releaseWhatsappRunDate(client, Number(homebaseId), attendanceDate);
      throw error;
    }

    if (prepared.status !== "prepared") {
      return prepared;
    }

    return executeWhatsappBatchSend(prepared);
  } finally {
    client.release();
  }
};

export const retryFailedWhatsappBatch = async ({
  batchId,
  homebaseId,
  dbPool = pool,
}) => {
  const client = await dbPool.connect();

  try {
    const batchResult = await client.query(
      `SELECT *
       FROM attendance.whatsapp_notification_batch
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
       FROM attendance.whatsapp_notification_config
       WHERE homebase_id = $1
       LIMIT 1`,
      [homebaseId],
    );

    const config = configResult.rows[0];
    if (!config) {
      return {
        status: "error",
        message: "Konfigurasi WhatsApp belum dibuat.",
      };
    }

    const session = await getWhatsappSession(client, homebaseId);
    if (session?.session_status !== "ready") {
      return {
        status: "error",
        message: "Sesi WhatsApp belum siap.",
        session_status: session?.session_status || "missing",
      };
    }

    const failedLogs = await client.query(
      `SELECT *
       FROM attendance.whatsapp_notification_log
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

      if (!isValidPhone(log.phone)) {
        await markLogSkipped(pool, log.id, "Nomor telepon tidak valid.");
        skippedCount += 1;
        await incrementBatchCounts(pool, batchId, { skipped: 1, failed: -1 });
        continue;
      }

      try {
        const sendResult = await sendWhatsappMessage({
          homebaseId,
          phone: log.phone,
          message: log.message,
        });

        await markLogSent(pool, log.id, sendResult.messageId);
        sentCount += 1;
        await incrementBatchCounts(pool, batchId, { sent: 1, failed: -1 });
      } catch (error) {
        const errorMessage = String(error?.message || "Gagal mengirim pesan WhatsApp.");
        await markLogFailed(pool, log.id, errorMessage);
        failedCount += 1;
        console.error(`[whatsapp] retry gagal log=${log.id}`, error);
      }

      if (index < failedLogs.rows.length - 1) {
        await sleep(
          randomDelayMs(config.send_delay_min_seconds, config.send_delay_max_seconds),
        );
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
