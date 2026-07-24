import pool from "../../config/connection.js";
import { ensurePgBossQueue, getPgBoss } from "../../config/pgBoss.js";
import { runAutoAbsentJob } from "./attendanceAutoAbsent.js";
import { runAutoPendingJob } from "./attendanceAutoPending.js";

const ATTENDANCE_AUTO_ABSENT_QUEUE = "attendance.auto_absent";
const ATTENDANCE_AUTO_PENDING_QUEUE = "attendance.auto_pending";
const AUTO_ABSENT_CRON = "15 * * * *";
const AUTO_PENDING_CRON = "5 0 * * *";

let workerRegistered = false;
let scheduleRegistered = false;

const registerSchedules = async (boss) => {
  if (scheduleRegistered) return;

  await boss.schedule(
    ATTENDANCE_AUTO_ABSENT_QUEUE,
    AUTO_ABSENT_CRON,
    {},
    { tz: "Asia/Jakarta" },
  );
  await boss.schedule(
    ATTENDANCE_AUTO_PENDING_QUEUE,
    AUTO_PENDING_CRON,
    {},
    { tz: "Asia/Jakarta" },
  );
  scheduleRegistered = true;
  console.log(
    `[pg-boss] scheduled "${ATTENDANCE_AUTO_ABSENT_QUEUE}" (${AUTO_ABSENT_CRON} Asia/Jakarta)`,
  );
  console.log(
    `[pg-boss] scheduled "${ATTENDANCE_AUTO_PENDING_QUEUE}" (${AUTO_PENDING_CRON} Asia/Jakarta)`,
  );
};

const registerWorker = async () => {
  if (workerRegistered) return;

  const boss = await getPgBoss();
  await ensurePgBossQueue(boss, ATTENDANCE_AUTO_ABSENT_QUEUE);
  await ensurePgBossQueue(boss, ATTENDANCE_AUTO_PENDING_QUEUE);
  await registerSchedules(boss);

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
    const totalStudentCheckouts = results.reduce(
      (sum, item) => sum + Number(item.students_checkout_filled || 0),
      0,
    );
    const totalTeacherCheckouts = results.reduce(
      (sum, item) => sum + Number(item.teachers_checkout_filled || 0),
      0,
    );
    const totalSessions = results.reduce(
      (sum, item) => sum + Number(item.sessions_marked_missed || 0),
      0,
    );
    const totalPurged = results.reduce(
      (sum, item) =>
        sum +
        Number(item.students_purged_no_rfid || 0) +
        Number(item.teachers_purged_no_rfid || 0),
      0,
    );
    console.log(
      `[attendance] Auto-absent selesai: siswa_absent=${totalStudents}, guru_absent=${totalTeachers}, siswa_checkout=${totalStudentCheckouts}, guru_checkout=${totalTeacherCheckouts}, sesi_missed=${totalSessions}, purge_no_rfid=${totalPurged}`,
    );
    return results;
  });

  await boss.work(ATTENDANCE_AUTO_PENDING_QUEUE, async () => {
    const results = await runAutoPendingJob(pool);
    const totalStudents = results.reduce(
      (sum, item) => sum + Number(item.students_pending || 0),
      0,
    );
    const totalTeachers = results.reduce(
      (sum, item) => sum + Number(item.teachers_pending || 0),
      0,
    );
    console.log(
      `[attendance] Auto-pending selesai: siswa_pending=${totalStudents}, guru_pending=${totalTeachers}`,
    );
    return results;
  });

  workerRegistered = true;
  console.log(
    `[pg-boss] worker registered for queue "${ATTENDANCE_AUTO_ABSENT_QUEUE}"`,
  );
  console.log(
    `[pg-boss] worker registered for queue "${ATTENDANCE_AUTO_PENDING_QUEUE}"`,
  );
};

registerWorker().catch((error) => {
  console.error("[pg-boss] failed to register attendance workers", error);
});
