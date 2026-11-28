import { PgBoss } from "pg-boss";
import pool from "./connection.js";

let bossInstance = null;
let bossInitPromise = null;

/** Keep completed / unused jobs for 1 day only so pgboss.job does not pile up. */
const ONE_DAY_SECONDS = 60 * 60 * 24;

export const PG_BOSS_JOB_RETENTION = {
  retentionSeconds: ONE_DAY_SECONDS,
  deleteAfterSeconds: ONE_DAY_SECONDS,
};

const buildConnectionString = () => {
  if (process.env.PG_BOSS_CONNECTION_STRING) {
    return process.env.PG_BOSS_CONNECTION_STRING;
  }

  const user = encodeURIComponent(process.env.P_USER || "");
  const password = encodeURIComponent(process.env.P_PASSWORD || "");
  const host = process.env.P_HOST || "localhost";
  const database = process.env.P_DB || "postgres";
  const port = process.env.P_PORT || "5432";

  return `postgres://${user}:${password}@${host}:${port}/${database}`;
};

/**
 * Create queue if missing, then always apply 1-day retention (also for existing queues).
 */
export const ensurePgBossQueue = async (boss, name) => {
  try {
    await boss.createQueue(name, PG_BOSS_JOB_RETENTION);
  } catch (error) {
    const message = String(error?.message || "").toLowerCase();
    if (!message.includes("already exists")) {
      throw error;
    }
  }
  await boss.updateQueue(name, PG_BOSS_JOB_RETENTION);
};

const applyRetentionPolicy = async (boss) => {
  const queues = await boss.getQueues();
  for (const queue of queues) {
    await boss.updateQueue(queue.name, PG_BOSS_JOB_RETENTION);
  }

  // Existing jobs keep their own deletion_seconds from insert time; align them
  // so maintenance can purge anything older than 1 day.
  const jobResult = await pool.query(
    `
      UPDATE pgboss.job
      SET deletion_seconds = $1
      WHERE deletion_seconds IS DISTINCT FROM $1
        AND deletion_seconds > 0
    `,
    [ONE_DAY_SECONDS],
  );

  const keepUntilResult = await pool.query(
    `
      UPDATE pgboss.job
      SET keep_until = start_after + ($1 * interval '1 second')
      WHERE state IN ('created', 'retry')
        AND keep_until > start_after + ($1 * interval '1 second')
    `,
    [ONE_DAY_SECONDS],
  );

  console.log(
    `[pg-boss] retention set to 1 day (queues=${queues.length}, jobs_aligned=${jobResult.rowCount}, keep_until_aligned=${keepUntilResult.rowCount})`,
  );
};

export const getPgBoss = async () => {
  if (bossInstance) return bossInstance;
  if (bossInitPromise) return bossInitPromise;

  bossInitPromise = (async () => {
    const boss = new PgBoss({
      connectionString: buildConnectionString(),
      schema: "pgboss",
    });
    await boss.start();
    boss.on("error", (error) => {
      console.error("[pg-boss] error", error);
    });
    try {
      await applyRetentionPolicy(boss);
    } catch (error) {
      console.warn(
        "[pg-boss] retention policy apply failed:",
        error?.message || error,
      );
    }
    bossInstance = boss;
    console.log("[pg-boss] started");
    return bossInstance;
  })();

  return bossInitPromise;
};
