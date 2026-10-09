import pool from "../../config/connection.js";
import { ensurePgBossQueue, getPgBoss } from "../../config/pgBoss.js";
import { runTelegramNotificationJob } from "./runTelegramBatch.js";

const TELEGRAM_NOTIFY_QUEUE = "attendance.telegram_notify";
const TELEGRAM_NOTIFY_CRON = "* * * * *";

let workerRegistered = false;
let scheduleRegistered = false;

const registerSchedule = async (boss) => {
  if (scheduleRegistered) return;

  await boss.schedule(
    TELEGRAM_NOTIFY_QUEUE,
    TELEGRAM_NOTIFY_CRON,
    {},
    { tz: "Asia/Jakarta" },
  );
  scheduleRegistered = true;
  console.log(
    `[pg-boss] scheduled "${TELEGRAM_NOTIFY_QUEUE}" (${TELEGRAM_NOTIFY_CRON} Asia/Jakarta)`,
  );
};

const registerWorker = async () => {
  if (workerRegistered) return;

  const boss = await getPgBoss();
  await ensurePgBossQueue(boss, TELEGRAM_NOTIFY_QUEUE);
  await registerSchedule(boss);

  await boss.work(TELEGRAM_NOTIFY_QUEUE, async () => {
    const results = await runTelegramNotificationJob(pool);
    const activeResults = results.filter((item) => item?.status !== "skipped");
    const skippedResults = results.filter((item) => item?.status === "skipped");

    if (skippedResults.length > 0) {
      console.log(
        `[telegram] ${skippedResults.length} batch dilewati:`,
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
      `[telegram] Batch selesai: homebase=${activeResults.length}, sent=${sentTotal}, failed=${failedTotal}`,
    );

    return results;
  });

  workerRegistered = true;
  console.log(
    `[pg-boss] worker registered for queue "${TELEGRAM_NOTIFY_QUEUE}"`,
  );
};

registerWorker().catch((error) => {
  console.error("[pg-boss] failed to register telegram notification worker", error);
});
