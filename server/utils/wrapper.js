import pool from "../config/connection.js";

const logError = (error, context) => {
  console.error(`[ERROR] ${context}: ${error}`);
};

/**
 * Wrapper untuk menangani Transaksi Database (POST, PUT, DELETE)
 * -------------------------------------------------------------
 * Cara kerja:
 * 1. Membuka koneksi (client) dari pool.
 * 2. Memulai transaksi (BEGIN).
 * 3. Menjalankan handler/controller Anda.
 * 4. Jika sukses: COMMIT.
 * 5. Jika error: ROLLBACK.
 * 6. Selalu: RELEASE koneksi.
 */

export const withTransaction = (handler) => {
  return async (req, res, next) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");

      // Jalankan logika controller.
      // PENTING: Controller harus menggunakan 'client' yang dikirim di argumen ke-3
      // agar query menjadi satu kesatuan transaksi.
      await handler(req, res, client);

      // Commit perubahan jika tidak ada error
      await client.query("COMMIT");
    } catch (error) {
      // Jika ada error, batalkan semua perubahan
      await client.query("ROLLBACK");

      logError(error, `Transaction Error on ${req.originalUrl}`);

      // Pastikan response belum terkirim sebelum mengirim status 500
      if (!res.headersSent) {
        res.status(500).json({
          status: "error",
          message: "Transaction failed",
          error: process.env.MODE === "development" ? error.message : undefined,
        });
      }
    } finally {
      // Kembalikan koneksi ke pool agar tidak bocor
      client.release();
    }
  };
};

/**
 * Wrapper untuk Query Sederhana (GET)
 * -------------------------------------------------------------
 * Menggunakan pool langsung. Cocok untuk operasi baca (Read)
 * yang tidak memerlukan atomicity (transaksi).
 */
export const withQuery = (handler) => {
  return async (req, res, next) => {
    try {
      // Kita kirimkan 'pool' sebagai argumen ke-3
      await handler(req, res, pool);
    } catch (error) {
      logError(error, `Query Error on ${req.originalUrl}`);

      if (!res.headersSent) {
        res.status(500).json({
          status: "error",
          message: "Internal Server Error",
          error: process.env.MODE === "development" ? error.message : undefined,
        });
      }
    }
  };
};
