import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js"; // Path sesuai snippet Anda
import { authorize } from "../../middleware/authorize.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import { spawn } from "cross-spawn";
import archiver from "archiver";
import AdmZip from "adm-zip";

// Konfigurasi Multer untuk Upload (Restore)
const storage = multer.memoryStorage();
const upload = multer({ storage });

const router = Router();

// =======================================
// Helper Functions
// =======================================

/**
 * Mencari lokasi binary PostgreSQL (pg_dump / psql)
 * Berguna jika di server Linux path berbeda (misal di AAPanel/CPanel)
 */
const getCommandPath = (toolName) => {
  // Sesuaikan path ini dengan server production Anda jika perlu
  const possiblePaths = [
    `/www/server/pgsql/bin/${toolName}`, // Common AAPanel path
    `/usr/bin/${toolName}`,
    `/usr/local/bin/${toolName}`,
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  return toolName; // Default (jika sudah ada di Environment Variable PATH)
};

// =======================================
// 1. Get Tables (Daftar Tabel)
// =======================================
router.get(
  "/get-tables",
  authorize("admin"), // Hanya admin
  withQuery(async (req, res, pool) => {
    // Mengambil semua tabel public kecuali tabel master wilayah (db_*)
    // agar user tidak tidak sengaja menghapus data wilayah.
    const query = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE 'db_%' -- Exclude master wilayah (province, city, etc)
      ORDER BY table_name ASC;
    `;

    const result = await pool.query(query);
    const tables = result.rows.map((row) => row.table_name);

    res.status(200).json(tables);
  }),
);

// =======================================
// 2. Backup Database
// =======================================

router.get("/create-backup", authorize("admin"), async (req, res) => {
  // 1. Siapkan Folder Temp
  const targetDir = path.join(process.cwd(), "temp_backup");
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // 2. Naming File
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const sqlFileName = `lms_backup_${timestamp}.sql`;
  const sqlFilePath = path.join(targetDir, sqlFileName);
  const zipFileName = `backup_${timestamp}.zip`;
  const zipFilePath = path.join(targetDir, zipFileName);

  const PG_DUMP_CMD = getCommandPath("pg_dump");

  try {
    console.log(`[BACKUP] Starting backup using: ${PG_DUMP_CMD}`);

    // 3. Spawn pg_dump
    const pgEnv = { ...process.env, PGPASSWORD: process.env.P_PASSWORD }; // Pastikan .env ada P_PASSWORD

    await new Promise((resolve, reject) => {
      const dumpProcess = spawn(
        PG_DUMP_CMD,
        [
          "-h",
          process.env.P_HOST,
          "-p",
          process.env.P_PORT,
          "-U",
          process.env.P_USER,
          "--clean", // Tambahkan DROP TABLE sebelum CREATE
          "--if-exists",
          "--format=p", // Plain text SQL
          "--file",
          sqlFilePath,
          process.env.P_DB,
        ],
        { env: pgEnv },
      );

      dumpProcess.stderr.on("data", (data) =>
        console.log(`pg_dump log: ${data}`),
      );
      dumpProcess.on("error", (err) =>
        reject(new Error(`pg_dump failed: ${err.message}`)),
      );
      dumpProcess.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`pg_dump exited with code ${code}`));
      });
    });

    // 4. Proses Zipping (SQL + Assets)
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`[BACKUP] Zip created: ${archive.pointer()} bytes`);
      // Hapus file raw SQL setelah di-zip agar hemat storage
      if (fs.existsSync(sqlFilePath)) fs.unlinkSync(sqlFilePath);

      res.status(200).json({
        message: "Backup berhasil dibuat",
        filename: zipFileName,
        url: `/temp_backup/${zipFileName}`, // Pastikan folder ini di-serve static di main app
      });
    });

    archive.on("error", (err) => {
      throw err;
    });
    archive.pipe(output);

    // Masukkan SQL ke dalam Zip
    archive.file(sqlFilePath, { name: "database.sql" });

    // Masukkan folder Assets (misal: upload tugas siswa, foto profil)
    // Sesuaikan path assets LMS Anda. Asumsi: 'server/public' atau 'server/assets'
    const assetsPath = path.join(process.cwd(), "server/assets");
    if (fs.existsSync(assetsPath)) {
      archive.directory(assetsPath, "assets");
    }

    await archive.finalize();
  } catch (error) {
    console.error(`[BACKUP ERROR] ${error.message}`);
    // Cleanup jika error
    if (fs.existsSync(sqlFilePath)) fs.unlinkSync(sqlFilePath);
    res.status(500).json({ message: error.message });
  }
});

// List File Backup yang tersedia
router.get("/list-backups", authorize("admin"), async (req, res) => {
  try {
    const targetDir = path.join(process.cwd(), "temp_backup");
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      return res.status(200).json([]);
    }

    const files = fs.readdirSync(targetDir);
    const fileList = files
      .filter((f) => f.endsWith(".zip"))
      .map((file) => {
        const filePath = path.join(targetDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          size: (stats.size / 1024 / 1024).toFixed(2) + " MB",
          createdAt: stats.birthtime,
          url: `/temp_backup/${file}`,
        };
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.status(200).json(fileList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Hapus File Backup
router.delete(
  "/delete-backup/:filename",
  authorize("admin"),
  async (req, res) => {
    try {
      const { filename } = req.params;
      // Validasi dasar keamanan path traversal
      if (filename.includes("..") || filename.includes("/")) {
        return res.status(400).json({ message: "Invalid filename" });
      }

      const filePath = path.join(process.cwd(), "temp_backup", filename);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        res.status(200).json({ message: "File backup berhasil dihapus" });
      } else {
        res.status(404).json({ message: "File tidak ditemukan" });
      }
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  },
);

// =======================================
// 3. Restore Database
// =======================================

router.post(
  "/restore-data",
  authorize("admin"),
  upload.single("backupFile"), // Name field di frontend harus 'backupFile'
  async (req, res) => {
    const tempRestoreDir = path.join(process.cwd(), "temp_restore");

    try {
      if (!req.file || !req.file.buffer) {
        return res
          .status(400)
          .json({ message: "File backup (.zip) wajib diupload" });
      }

      // 1. Setup Folder Temp
      if (fs.existsSync(tempRestoreDir)) {
        fs.rmSync(tempRestoreDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempRestoreDir);

      // 2. Extract ZIP
      const zip = new AdmZip(req.file.buffer);
      zip.extractAllTo(tempRestoreDir, true);

      // 3. Restore Assets
      const extractedAssets = path.join(tempRestoreDir, "assets");
      const targetAssets = path.join(process.cwd(), "server/assets"); // Sesuaikan folder asli

      if (fs.existsSync(extractedAssets)) {
        // Bersihkan assets lama (opsional, hati-hati jika ingin merge jangan dihapus)
        if (fs.existsSync(targetAssets)) {
          // fs.rmSync(targetAssets, { recursive: true, force: true });
          // Disarankan overwrite daripada delete folder root assets untuk menjaga permission
        }
        // Copy recursive
        fs.cpSync(extractedAssets, targetAssets, {
          recursive: true,
          force: true,
        });
      }

      // 4. Restore Database (SQL)
      const sqlFile = path.join(tempRestoreDir, "database.sql");
      const PSQL_CMD = getCommandPath("psql");

      if (fs.existsSync(sqlFile)) {
        console.log(`[RESTORE] Executing SQL restore...`);

        const pgEnv = { ...process.env, PGPASSWORD: process.env.P_PASSWORD };

        const psql = spawn(
          PSQL_CMD,
          [
            "-h",
            process.env.P_HOST,
            "-p",
            process.env.P_PORT,
            "-U",
            process.env.P_USER,
            "-d",
            process.env.P_DB, // Database target
            "-f",
            sqlFile,
          ],
          { env: pgEnv },
        );

        psql.stderr.on("data", (data) => console.log(`psql stderr: ${data}`));

        psql.on("close", (code) => {
          // Cleanup
          fs.rmSync(tempRestoreDir, { recursive: true, force: true });

          if (code === 0) {
            res.json({ message: "Restore Database & Assets berhasil!" });
          } else {
            res
              .status(500)
              .json({ message: "Gagal restore SQL (Exit code error)" });
          }
        });

        psql.on("error", (err) => {
          fs.rmSync(tempRestoreDir, { recursive: true, force: true });
          res.status(500).json({ message: `Gagal spawn psql: ${err.message}` });
        });
      } else {
        fs.rmSync(tempRestoreDir, { recursive: true, force: true });
        res
          .status(400)
          .json({ message: "File database.sql tidak ditemukan dalam backup" });
      }
    } catch (error) {
      console.error(error);
      if (fs.existsSync(tempRestoreDir))
        fs.rmSync(tempRestoreDir, { recursive: true, force: true });
      res.status(500).json({ message: error.message });
    }
  },
);

// =======================================
// 4. (Opsional) Reset Data Tables
// =======================================
router.delete(
  "/reset-tables",
  authorize("admin"),
  withTransaction(async (req, res, client) => {
    const { tables } = req.body; // Array nama tabel dari frontend

    if (!tables || tables.length === 0) {
      return res.status(400).json({ message: "Pilih tabel yang akan direset" });
    }

    // Validasi agar tidak menghapus tabel sistem/master wilayah secara paksa lewat API ini
    const forbiddenTables = [
      "db_province",
      "db_city",
      "db_district",
      "db_village",
    ];
    const safeTables = tables.filter((t) => !forbiddenTables.includes(t));

    if (safeTables.length === 0)
      return res.status(400).json({ message: "Tabel tidak valid" });

    // Handle User: Jangan hapus Admin
    const cleanUsers = safeTables.includes("u_users");
    const tablesToTruncate = safeTables.filter((t) => t !== "u_users");

    try {
      if (tablesToTruncate.length > 0) {
        // Gunakan CASCADE karena lms_table.sql banyak relasi
        await client.query(
          `TRUNCATE TABLE ${tablesToTruncate.join(", ")} RESTART IDENTITY CASCADE`,
        );
      }

      if (cleanUsers) {
        // Hapus semua user kecuali yang punya role admin
        // Note: lms_table.sql memisahkan role di u_users
        await client.query(`DELETE FROM u_users WHERE role != 'admin'`);
      }

      res.status(200).json({ message: "Data berhasil direset" });
    } catch (error) {
      throw new Error(`Gagal reset tabel: ${error.message}`);
    }
  }),
);

export default router;
