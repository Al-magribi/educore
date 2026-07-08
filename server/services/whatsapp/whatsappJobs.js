import pool from "../../config/connection.js";
import { getPgBoss } from "../../config/pgBoss.js";
import { runWhatsappNotificationJob } from "./runWhatsappBatch.js";

const WHATSAPP_NOTIFY_QUEUE = "attendance.whatsapp_notify";
const WHATSAPP_NOTIFY_CRON = "* * * * *";

let workerRegistered = false;
let scheduleRegistered = false;

const ensureQueue = async (boss) => {
  try {
    await boss.createQueue(WHATSAPP_NOTIFY_QUEUE);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (!message.includes("already exists")) {
      throw error;
    }
  }
};

const registerSchedule = async (boss) => {
  if (scheduleRegistered) return;

  await boss.schedule(
    WHATSAPP_NOTIFY_QUEUE,
    WHATSAPP_NOTIFY_CRON,
    {},
    { tz: "Asia/Jakarta" },
  );
  scheduleRegistered = true;
  console.log(
    `[pg-boss] scheduled "${WHATSAPP_NOTIFY_QUEUE}" (${WHATSAPP_NOTIFY_CRON} Asia/Jakarta)`,
  );
};

const registerWorker = async () => {
  if (workerRegistered) return;

  const boss = await getPgBoss();
  await ensureQueue(boss);
  await registerSchedule(boss);

  await boss.work(WHATSAPP_NOTIFY_QUEUE, async () => {
    const results = await runWhatsappNotificationJob(pool);
    const activeResults = results.filter((item) => item?.status !== "skipped");
    const skippedResults = results.filter((item) => item?.status === "skipped");

    if (skippedResults.length > 0) {
      console.log(
        `[whatsapp] ${skippedResults.length} batch dilewati:`,
        skippedResults.map((item) => ({
          homebase_id: item.homebase_id,
          reason: item.reason || item.status,
        })),
      );
    }

    if (activeResults.length === 0) {
      return results;
    }

    const sentTotal = activeResults.reduce(
      (sum, item) => sum + Number(item.sent_count || 0),
      0,
    );
    const failedTotal = activeResults.reduce(
      (sum, item) => sum + Number(item.failed_count || 0),
      0,
    );

    console.log(
      `[whatsapp] Batch selesai: homebase=${activeResults.length}, sent=${sentTotal}, failed=${failedTotal}`,
    );

    return results;
  });

  workerRegistered = true;
  console.log(
    `[pg-boss] worker registered for queue "${WHATSAPP_NOTIFY_QUEUE}"`,
  );
};

registerWorker().catch((error) => {
  console.error("[pg-boss] failed to register whatsapp notification worker", error);
});
