import { Pool } from "pg";

const pool = new Pool({
  user: process.env.P_USER,
  host: process.env.P_HOST,
  database: process.env.P_DB,
  password: process.env.P_PASSWORD,
  max: 100, // Maksimal 100 koneksi
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 2000,
});

// --- 1. Monitoring Pool & Auto Restart Logic ---
const CHECK_INTERVAL = 10000; // Cek setiap 2 detik

setInterval(() => {
  // Mengambil metrik dari pool
  const totalConnections = pool.totalCount; // Total koneksi yang ada (sedang dipakai + idle)
  const idleConnections = pool.idleCount; // Koneksi yang menganggur (siap pakai)
  const waitingRequests = pool.waitingCount; // Request yang antre menunggu koneksi kosong

  // Log status saat ini
  console.log(
    `[MONITOR] Total: ${totalConnections} | Idle: ${idleConnections} | Menunggu: ${waitingRequests}`,
  );

  // Logika Restart jika koneksi mencapai 90
  if (totalConnections >= 90) {
    console.warn(
      "⚠️ BAHAYA: Koneksi mencapai 90! Merestart aplikasi untuk mereset koneksi...",
    );

    // Mengakhiri pool dengan graceful sebelum exit (opsional, tapi disarankan agar tidak corrupt)
    pool
      .end()
      .then(() => {
        console.log("Pool ditutup. Mematikan proses...");
        process.exit(1); // Code 1 memberitahu Nodemon bahwa aplikasi crash/berhenti, Nodemon akan restart.
      })
      .catch(() => {
        process.exit(1); // Force exit jika gagal close
      });
  }
}, CHECK_INTERVAL);

// --- 2. Tes Koneksi Awal (Hanya jalan sekali saat start) ---
pool.connect(async (err, client, release) => {
  if (err) {
    return console.error("Error acquiring client", err.stack);
  }

  try {
    const result = await client.query(
      "SELECT NOW() AT TIME ZONE 'Asia/Jakarta' as current_time",
    );
    console.log(`✅ Terhubung ke database: ${result.rows[0].current_time}`);
  } catch (e) {
    console.error("Query error", e);
  } finally {
    release(); // Sangat penting: lepaskan koneksi kembali ke pool
  }
});

// --- 3. Error Listener Global pada Pool ---
// Penting untuk menangkap error koneksi idle yang putus tiba-tiba
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

export default pool;
