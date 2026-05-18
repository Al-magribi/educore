import { Pool } from "pg";

const POOL_MAX = 50;
const WARNING_THRESHOLD = 45;
const CHECK_INTERVAL = 10000;

const pool = new Pool({
  user: process.env.P_USER,
  host: process.env.P_HOST,
  port: Number(process.env.P_PORT || 5432),
  database: process.env.P_DB,
  password: process.env.P_PASSWORD,
  max: POOL_MAX,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000,
});

// Monitor pool secara berkala, tapi jangan mematikan aplikasi saat ramai.
setInterval(() => {
  const totalConnections = pool.totalCount;
  const idleConnections = pool.idleCount;
  const waitingRequests = pool.waitingCount;

  console.log(
    `[MONITOR] Total: ${totalConnections}/${POOL_MAX} | Idle: ${idleConnections} | Menunggu: ${waitingRequests}`,
  );

  if (totalConnections >= WARNING_THRESHOLD || waitingRequests > 0) {
    console.warn(
      `[POOL WARNING] Pool mendekati batas. Total: ${totalConnections}/${POOL_MAX} | Idle: ${idleConnections} | Menunggu: ${waitingRequests}`,
    );
  }
}, CHECK_INTERVAL);

// Tes koneksi awal, hanya berjalan sekali saat start.
pool.connect(async (err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }

  try {
    const result = await client.query(
      "SELECT NOW() AT TIME ZONE 'Asia/Jakarta' as current_time",
    );
    console.log(`Terhubung ke database: ${result.rows[0].current_time}`);
  } catch (e) {
    console.error("Query error", e);
  } finally {
    release();
  }
});

// Tangkap error koneksi idle yang putus tiba-tiba.
pool.on("error", (err) => {
  console.error("Unexpected error on idle client", err);
});

export default pool;
