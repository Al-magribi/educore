// config/migration_db.js
import { Pool } from "pg";

// 1. Koneksi ke SUMBER DATA (Newtable / Port 3000)
export const poolSource = new Pool({
  user: process.env.OLD_DB_USER, // User DB lama
  host: process.env.OLD_DB_HOST, // Host DB lama
  database: process.env.OLD_DB_NAME, // Nama DB 'newtable'
  password: process.env.OLD_DB_PASSWORD,
  port: 5432, // Port database (bukan port aplikasi express)
});

// 2. Koneksi ke TUJUAN (LMS Table / Port 2310)
// Gunakan pool yang sudah Anda buat sebelumnya (default pool aplikasi ini)
import poolDest from "./connection.js";

export { poolDest };
