import { PgBoss } from "pg-boss";

let bossInstance = null;
let bossInitPromise = null;

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
    bossInstance = boss;
    console.log("[pg-boss] started");
    return bossInstance;
  })();

  return bossInitPromise;
};
