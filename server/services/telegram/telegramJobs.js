import { getPgBoss } from "../../config/pgBoss.js";

/** Antrian laporan harian orang tua yang sudah dihentikan; jadwal lama tersimpan di pgboss. */
const RETIRED_DAILY_NOTIFY_QUEUES = ["attendance.telegram_notify", "attendance.whatsapp_notify"];

const retireDailyParentReport = async () => {
  const boss = await getPgBoss();
  const existing = new Set((await boss.getQueues()).map((queue) => queue.name));

  for (const name of RETIRED_DAILY_NOTIFY_QUEUES) {
    if (!existing.has(name)) continue;
    await boss.unschedule(name);
    await boss.deleteQueue(name);
    console.log(`[pg-boss] queue "${name}" dihapus (laporan harian orang tua nonaktif)`);
  }
};

retireDailyParentReport().catch((error) => {
  console.error("[pg-boss] gagal menghapus jadwal laporan harian", error);
});
