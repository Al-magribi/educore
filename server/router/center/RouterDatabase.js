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
const SYSTEM_SCHEMAS = ["information_schema", "pg_catalog"];
const HIDDEN_SCHEMAS = ["pgboss"];

// =======================================
// Helper Functions
// =======================================

/**
 * Mencari lokasi binary PostgreSQL (pg_dump / psql)
 * Berguna jika di server Linux path berbeda (misal di AAPanel/CPanel)
 */
const getCommandPath = (toolName) => {
  const executableName =
    process.platform === "win32" ? `${toolName}.exe` : toolName;

  if (process.platform === "win32") {
    const windowsRoots = [
      "C:\\Program Files\\PostgreSQL",
      "C:\\Program Files (x86)\\PostgreSQL",
    ];

    for (const root of windowsRoots) {
      if (!fs.existsSync(root)) continue;

      const versions = fs
        .readdirSync(root, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort((a, b) => b.localeCompare(a, undefined, { numeric: true }));

      for (const version of versions) {
        const candidate = path.join(root, version, "bin", executableName);
        if (fs.existsSync(candidate)) return candidate;
      }
    }
  }

  const possiblePaths = [
    `/www/server/pgsql/bin/${toolName}`,
    `/usr/bin/${toolName}`,
    `/usr/local/bin/${toolName}`,
  ];

  for (const p of possiblePaths) {
    if (fs.existsSync(p)) return p;
  }

  return executableName;
};

const quoteIdentifier = (value) => `"${String(value).replace(/"/g, '""')}"`;

const buildQualifiedName = (schema, table) =>
  `${quoteIdentifier(schema)}.${quoteIdentifier(table)}`;

const normalizeRequestedTable = (value) => {
  if (!value) return null;

  if (typeof value === "string") {
    const parts = value.split(".");
    if (parts.length === 2) {
      return { schema: parts[0], table: parts[1] };
    }

    return { schema: null, table: value };
  }

  if (typeof value === "object") {
    const schema = value.schema ?? value.table_schema ?? null;
    const table = value.tableName ?? value.table_name ?? value.name ?? null;

    if (!table) return null;
    return { schema, table };
  }

  return null;
};

const replaceDirectory = (sourceDir, targetDir, rollbackDir) => {
  const hasTarget = fs.existsSync(targetDir);

  if (fs.existsSync(rollbackDir)) {
    fs.rmSync(rollbackDir, { recursive: true, force: true });
  }

  if (hasTarget) {
    fs.renameSync(targetDir, rollbackDir);
  }

  try {
    fs.mkdirSync(path.dirname(targetDir), { recursive: true });
    fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });

    if (fs.existsSync(rollbackDir)) {
      fs.rmSync(rollbackDir, { recursive: true, force: true });
    }
  } catch (error) {
    if (fs.existsSync(targetDir)) {
      fs.rmSync(targetDir, { recursive: true, force: true });
    }

    if (fs.existsSync(rollbackDir)) {
      fs.renameSync(rollbackDir, targetDir);
    }

    throw error;
  }
};

// =======================================
// 1. Get Tables (Daftar Tabel)
// =======================================
router.get(
  "/get-tables",
  authorize("admin"), // Hanya admin
  withQuery(async (req, res, pool) => {
    const query = `
      SELECT
        t.table_schema AS schema,
        t.table_name AS "tableName",
        (t.table_schema || '.' || t.table_name) AS "fullName"
      FROM information_schema.tables t
      WHERE t.table_type = 'BASE TABLE'
        AND t.table_schema <> ALL($1::text[])
        AND t.table_schema <> ALL($2::text[])
      ORDER BY t.table_schema ASC, t.table_name ASC;
    `;

    const result = await pool.query(query, [SYSTEM_SCHEMAS, HIDDEN_SCHEMAS]);
    res.status(200).json(result.rows);
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
  const manifestFilePath = path.join(targetDir, `manifest_${timestamp}.json`);

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
          "--no-owner",
          "--no-privileges",
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

    const manifest = {
      database: process.env.P_DB,
      createdAt: new Date().toISOString(),
      backupType: "full_database_with_assets",
      sqlFile: "database.sql",
      assetDirectory: "assets",
    };
    fs.writeFileSync(manifestFilePath, JSON.stringify(manifest, null, 2));

    // 4. Proses Zipping (SQL + Assets)
    const output = fs.createWriteStream(zipFilePath);
    const archive = archiver("zip", { zlib: { level: 9 } });

    output.on("close", () => {
      console.log(`[BACKUP] Zip created: ${archive.pointer()} bytes`);
      // Hapus file raw SQL setelah di-zip agar hemat storage
      if (fs.existsSync(sqlFilePath)) fs.unlinkSync(sqlFilePath);
      if (fs.existsSync(manifestFilePath)) fs.unlinkSync(manifestFilePath);

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
    archive.file(manifestFilePath, { name: "backup_manifest.json" });

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
    if (fs.existsSync(manifestFilePath)) fs.unlinkSync(manifestFilePath);
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

      const extractedAssets = path.join(tempRestoreDir, "assets");
      const targetAssets = path.join(process.cwd(), "server/assets");
      const rollbackAssets = path.join(tempRestoreDir, "__assets_before_restore");
      const sqlCandidates = fs
        .readdirSync(tempRestoreDir)
        .filter((file) => file.toLowerCase().endsWith(".sql"))
        .map((file) => path.join(tempRestoreDir, file));
      const sqlFile = sqlCandidates[0] || path.join(tempRestoreDir, "database.sql");
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
            "-v",
            "ON_ERROR_STOP=1",
            "-1",
            "-f",
            sqlFile,
          ],
          { env: pgEnv },
        );

        psql.stderr.on("data", (data) => console.log(`psql stderr: ${data}`));

        psql.on("close", (code) => {
          if (code !== 0) {
            fs.rmSync(tempRestoreDir, { recursive: true, force: true });
            return res
              .status(500)
              .json({ message: "Gagal restore SQL (Exit code error)" });
          }

          try {
            if (fs.existsSync(extractedAssets)) {
              replaceDirectory(extractedAssets, targetAssets, rollbackAssets);
            }

            fs.rmSync(tempRestoreDir, { recursive: true, force: true });
            res.json({
              message: "Restore database semua schema dan assets berhasil!",
            });
          } catch (assetError) {
            fs.rmSync(tempRestoreDir, { recursive: true, force: true });
            res.status(500).json({
              message: `Database pulih, tetapi restore assets gagal: ${assetError.message}`,
            });
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

    const normalizedTables = tables
      .map(normalizeRequestedTable)
      .filter(Boolean);

    if (normalizedTables.length === 0) {
      return res.status(400).json({ message: "Format tabel tidak valid" });
    }

    try {
      const result = await client.query(
        `
          SELECT table_schema, table_name
          FROM information_schema.tables
          WHERE table_type = 'BASE TABLE'
            AND table_schema <> ALL($1::text[])
            AND table_schema <> ALL($2::text[])
        `,
        [SYSTEM_SCHEMAS, HIDDEN_SCHEMAS],
      );

      const allTables = result.rows.map((row) => ({
        schema: row.table_schema,
        table: row.table_name,
      }));
      const exactMap = new Map(
        allTables.map((item) => [`${item.schema}.${item.table}`, item]),
      );
      const nameBuckets = allTables.reduce((acc, item) => {
        acc[item.table] = acc[item.table] || [];
        acc[item.table].push(item);
        return acc;
      }, {});

      const resolvedTables = normalizedTables.map((item) => {
        if (item.schema) {
          return exactMap.get(`${item.schema}.${item.table}`) || null;
        }

        const matches = nameBuckets[item.table] || [];
        if (matches.length === 1) return matches[0];
        return null;
      });

      if (resolvedTables.some((item) => !item)) {
        return res.status(400).json({
          message:
            "Beberapa tabel tidak ditemukan atau ambigu. Gunakan nama schema.table.",
        });
      }

      const uniqueTables = Array.from(
        new Map(
          resolvedTables.map((item) => [
            `${item.schema}.${item.table}`,
            buildQualifiedName(item.schema, item.table),
          ]),
        ).values(),
      );

      await client.query(
        `TRUNCATE TABLE ${uniqueTables.join(", ")} RESTART IDENTITY CASCADE`,
      );

      res.status(200).json({ message: "Data berhasil direset" });
    } catch (error) {
      throw new Error(`Gagal reset tabel: ${error.message}`);
    }
  }),
);

export default router;
