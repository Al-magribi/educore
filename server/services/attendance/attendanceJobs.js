import pool from "../../config/connection.js";
import { getPgBoss } from "../../config/pgBoss.js";
import { runAutoAbsentJob } from "./attendanceAutoAbsent.js";

const ATTENDANCE_AUTO_ABSENT_QUEUE = "attendance.auto_absent";
const AUTO_ABSENT_CRON = "15 * * * *";

let workerRegistered = false;
let scheduleRegistered = false;

const ensureQueue = async (boss) => {
  try {
    await boss.createQueue(ATTENDANCE_AUTO_ABSENT_QUEUE);
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
    ATTENDANCE_AUTO_ABSENT_QUEUE,
    AUTO_ABSENT_CRON,
    {},
    { tz: "Asia/Jakarta" },
  );
  scheduleRegistered = true;
  console.log(
    `[pg-boss] scheduled "${ATTENDANCE_AUTO_ABSENT_QUEUE}" (${AUTO_ABSENT_CRON} Asia/Jakarta)`,
  );
};

const registerWorker = async () => {
  if (workerRegistered) return;

  const boss = await getPgBoss();
  await ensureQueue(boss);
  await registerSchedule(boss);

  await boss.work(ATTENDANCE_AUTO_ABSENT_QUEUE, async () => {
    const results = await runAutoAbsentJob(pool);
    const totalStudents = results.reduce(
      (sum, item) => sum + Number(item.students_marked || 0),
      0,
    );
    const totalTeachers = results.reduce(
      (sum, item) => sum + Number(item.teachers_marked || 0),
      0,
    );
    const totalSessions = results.reduce(
      (sum, item) => sum + Number(item.sessions_marked_missed || 0),
      0,
    );
    console.log(
      `[attendance] Auto-absent selesai: siswa=${totalStudents}, guru=${totalTeachers}, sesi_missed=${totalSessions}`,
    );
    return results;
  });

  workerRegistered = true;
  console.log(
    `[pg-boss] worker registered for queue "${ATTENDANCE_AUTO_ABSENT_QUEUE}"`,
  );
};

registerWorker().catch((error) => {
  console.error("[pg-boss] failed to register attendance auto-absent worker", error);
});
