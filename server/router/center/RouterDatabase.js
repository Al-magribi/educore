import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js"; // Path sesuai snippet Anda
import { authorize } from "../../middleware/authorize.js";
import path from "path";
import fs from "fs";
import { spawn } from "cross-spawn";

const router = Router();
const SYSTEM_SCHEMAS = ["information_schema", "pg_catalog"];
const HIDDEN_SCHEMAS = ["pgboss"];
const HIDDEN_TABLES = [{ schema: "public", table: "configurations" }];

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
const PROTECTED_ADMIN_LEVELS = ["center", "pusat"];

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

const isHiddenTable = (schema, table) =>
  HIDDEN_TABLES.some(
    (item) => item.schema === schema && item.table === table,
  );

const replaceDirectory = (sourceDir, targetDir, rollbackDir) => {
  const hasTarget = fs.existsSync(targetDir);

  if (fs.existsSync(rollbackDir)) {
    fs.rmSync(rollbackDir, { recursive: true, force: true });
  }

  fs.mkdirSync(path.dirname(targetDir), { recursive: true });

  if (hasTarget) {
    fs.cpSync(targetDir, rollbackDir, { recursive: true, force: true });
  }

  try {
    if (fs.existsSync(targetDir)) {
      const targetEntries = fs.readdirSync(targetDir);
      for (const entry of targetEntries) {
        fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
      }
    } else {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });

    if (fs.existsSync(rollbackDir)) {
      fs.rmSync(rollbackDir, { recursive: true, force: true });
    }
  } catch (error) {
    if (fs.existsSync(rollbackDir)) {
      fs.mkdirSync(targetDir, { recursive: true });

      const targetEntries = fs.existsSync(targetDir)
        ? fs.readdirSync(targetDir)
        : [];
      for (const entry of targetEntries) {
        fs.rmSync(path.join(targetDir, entry), { recursive: true, force: true });
      }

      fs.cpSync(rollbackDir, targetDir, { recursive: true, force: true });
    }

    throw error;
  }
};

const ensureCleanDirectory = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }

  fs.mkdirSync(dirPath, { recursive: true });
};

const removeDirectoryIfExists = (dirPath) => {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
};

const assertFileHasContent = (filePath, label) => {
  if (!fs.existsSync(filePath)) {
    throw new Error(`${label} tidak ditemukan`);
  }

  const { size } = fs.statSync(filePath);
  if (size <= 0) {
    throw new Error(`${label} kosong (0 KB)`);
  }

  return size;
};

const getDirectorySize = (dirPath) => {
  if (!fs.existsSync(dirPath)) return 0;

  return fs
    .readdirSync(dirPath, { withFileTypes: true })
    .reduce((total, entry) => {
      const entryPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return total + getDirectorySize(entryPath);
      if (entry.isFile()) return total + fs.statSync(entryPath).size;
      return total;
    }, 0);
};

const formatBytes = (bytes) => {
  const mb = bytes / 1024 / 1024;
  return `${mb.toFixed(2)} MB`;
};

const sanitizeRestoreSql = (sqlContent) => {
  const inheritedConstraintDropPattern =
    /ALTER TABLE(?:\s+IF\s+EXISTS)?\s+ONLY\s+([^\s;]+)\s+DROP\s+CONSTRAINT(?:\s+IF\s+EXISTS)?\s+([^\s;]+);\s*/gim;
  const dropTablePattern = /DROP TABLE IF EXISTS\s+([^\s;]+)\s*;/gim;
  const dropSchemaPattern = /DROP SCHEMA IF EXISTS\s+([^\s;]+)\s*;/gim;

  let removedInheritedConstraintDrops = 0;
  let normalizedDropTableCascade = 0;
  let normalizedDropSchemaCascade = 0;

  let sanitizedSql = sqlContent.replace(inheritedConstraintDropPattern, () => {
    removedInheritedConstraintDrops += 1;
    return "";
  });

  sanitizedSql = sanitizedSql.replace(dropTablePattern, (_, identifier) => {
    normalizedDropTableCascade += 1;
    return `DROP TABLE IF EXISTS ${identifier} CASCADE;`;
  });

  sanitizedSql = sanitizedSql.replace(dropSchemaPattern, (_, identifier) => {
    normalizedDropSchemaCascade += 1;
    return `DROP SCHEMA IF EXISTS ${identifier} CASCADE;`;
  });

  return {
    sanitizedSql,
    removedInheritedConstraintDrops,
    normalizedDropTableCascade,
    normalizedDropSchemaCascade,
  };
};

const isSafeBackupName = (value) =>
  typeof value === "string" &&
  /^backup_\d{4}-\d{2}-\d{2}T[\d-]+Z$/.test(value);

const getBackupDirectory = (backupName) => {
  if (!isSafeBackupName(backupName)) {
    throw new Error("Nama backup tidak valid");
  }

  const backupRoot = path.resolve(process.cwd(), "temp_backup");
  const backupDir = path.resolve(backupRoot, backupName);

  if (
    backupDir !== backupRoot &&
    backupDir.startsWith(`${backupRoot}${path.sep}`)
  ) {
    return backupDir;
  }

  throw new Error("Path backup tidak valid");
};

const validateBackupDirectory = (backupDir) => {
  if (!fs.existsSync(backupDir) || !fs.statSync(backupDir).isDirectory()) {
    throw new Error("Folder backup tidak ditemukan");
  }

  const sqlFile = path.join(backupDir, "database.sql");
  const manifestFile = path.join(backupDir, "backup_manifest.json");
  const assetsDir = path.join(backupDir, "assets");

  assertFileHasContent(sqlFile, "File database.sql");
  assertFileHasContent(manifestFile, "File backup_manifest.json");

  if (!fs.existsSync(assetsDir) || !fs.statSync(assetsDir).isDirectory()) {
    throw new Error("Folder assets tidak ditemukan dalam backup");
  }

  return { sqlFile, manifestFile, assetsDir };
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
    res.status(200).json(
      result.rows.filter((row) => !isHiddenTable(row.schema, row.tableName)),
    );
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
  const backupName = `backup_${timestamp}`;
  const backupDir = path.join(targetDir, backupName);
  const sqlFilePath = path.join(backupDir, "database.sql");

  const PG_DUMP_CMD = getCommandPath("pg_dump");
  const manifestFilePath = path.join(backupDir, "backup_manifest.json");

  try {
    ensureCleanDirectory(backupDir);
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

    const sqlSize = assertFileHasContent(sqlFilePath, "File database.sql");
    const assetsPath = path.join(process.cwd(), "server/assets");
    const stagedAssetsPath = path.join(backupDir, "assets");

    if (fs.existsSync(assetsPath)) {
      fs.cpSync(assetsPath, stagedAssetsPath, { recursive: true, force: true });
    } else {
      fs.mkdirSync(stagedAssetsPath, { recursive: true });
    }

    const manifest = {
      database: process.env.P_DB,
      createdAt: new Date().toISOString(),
      backupType: "folder_database_with_assets",
      sqlFile: "database.sql",
      assetDirectory: "assets",
      sqlSize,
    };
    fs.writeFileSync(manifestFilePath, JSON.stringify(manifest, null, 2));
    assertFileHasContent(manifestFilePath, "File backup_manifest.json");
    validateBackupDirectory(backupDir);

    res.status(200).json({
      message: "Backup berhasil dibuat",
      filename: backupName,
      url: `/temp_backup/${backupName}/backup_manifest.json`,
    });
  } catch (error) {
    console.error(`[BACKUP ERROR] ${error.message}`);
    removeDirectoryIfExists(backupDir);
    res.status(500).json({ message: error.message });
  }
});

// List Folder Backup yang tersedia
router.get("/list-backups", authorize("admin"), async (req, res) => {
  try {
    const targetDir = path.join(process.cwd(), "temp_backup");
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      return res.status(200).json([]);
    }

    const fileList = fs
      .readdirSync(targetDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && isSafeBackupName(entry.name))
      .map((entry) => {
        const backupDir = path.join(targetDir, entry.name);
        const stats = fs.statSync(backupDir);
        const manifestPath = path.join(backupDir, "backup_manifest.json");
        let manifest = {};

        if (fs.existsSync(manifestPath)) {
          try {
            manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
          } catch (error) {
            manifest = {};
          }
        }

        return {
          name: entry.name,
          type: "folder",
          size: formatBytes(getDirectorySize(backupDir)),
          createdAt: manifest.createdAt || stats.birthtime,
          sqlSize: manifest.sqlSize ? formatBytes(manifest.sqlSize) : "-",
          url: `/temp_backup/${entry.name}/backup_manifest.json`,
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
      const filePath = getBackupDirectory(filename);

      if (fs.existsSync(filePath)) {
        fs.rmSync(filePath, { recursive: true, force: true });
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
  async (req, res) => {
    const restoreId = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const tempRestoreDir = path.join(process.cwd(), "temp_restore", restoreId);

    try {
      const { backupName } = req.body || {};

      if (!backupName) {
        return res
          .status(400)
          .json({ message: "Pilih folder backup yang akan direstore" });
      }

      ensureCleanDirectory(tempRestoreDir);

      const backupDir = getBackupDirectory(backupName);
      const { sqlFile, assetsDir } = validateBackupDirectory(backupDir);
      const targetAssets = path.join(process.cwd(), "server/assets");
      const rollbackAssets = path.join(
        tempRestoreDir,
        "__assets_before_restore",
      );
      const restoreSqlFile = path.join(tempRestoreDir, "database.restore.sql");
      const PSQL_CMD = getCommandPath("psql");

      console.log(`[RESTORE] Executing SQL restore from ${backupName}...`);

      const rawSql = fs.readFileSync(sqlFile, "utf8");
      const {
        sanitizedSql,
        removedInheritedConstraintDrops,
        normalizedDropTableCascade,
        normalizedDropSchemaCascade,
      } =
        sanitizeRestoreSql(rawSql);

      fs.writeFileSync(restoreSqlFile, sanitizedSql);

      if (removedInheritedConstraintDrops > 0) {
        console.log(
          `[RESTORE] Removed ${removedInheritedConstraintDrops} inherited DROP CONSTRAINT statement(s) before restore.`,
        );
      }

      if (normalizedDropTableCascade > 0) {
        console.log(
          `[RESTORE] Added CASCADE to ${normalizedDropTableCascade} DROP TABLE statement(s).`,
        );
      }

      if (normalizedDropSchemaCascade > 0) {
        console.log(
          `[RESTORE] Added CASCADE to ${normalizedDropSchemaCascade} DROP SCHEMA statement(s).`,
        );
      }

      const pgEnv = { ...process.env, PGPASSWORD: process.env.P_PASSWORD };

      await new Promise((resolve, reject) => {
        let stderrBuffer = "";
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
            restoreSqlFile,
          ],
          { env: pgEnv },
        );

        psql.stderr.on("data", (data) => {
          const text = data.toString();
          stderrBuffer += text;
          console.log(`psql stderr: ${text}`);
        });

        psql.on("close", (code) => {
          if (code !== 0) {
            const stderrMessage = stderrBuffer.trim();
            reject(
              new Error(
                stderrMessage
                  ? `Gagal restore SQL: ${stderrMessage}`
                  : "Gagal restore SQL (Exit code error)",
              ),
            );
            return;
          }

          resolve();
        });

        psql.on("error", (err) => {
          reject(new Error(`Gagal spawn psql: ${err.message}`));
        });
      });

      try {
        replaceDirectory(assetsDir, targetAssets, rollbackAssets);
        removeDirectoryIfExists(tempRestoreDir);
        res.json({
          message: "Restore database semua schema dan assets berhasil!",
        });
      } catch (assetError) {
        removeDirectoryIfExists(tempRestoreDir);
        res.status(500).json({
          message: `Database pulih, tetapi restore assets gagal: ${assetError.message}`,
        });
      }
    } catch (error) {
      console.error(error);
      removeDirectoryIfExists(tempRestoreDir);
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
      })).filter((item) => !isHiddenTable(item.schema, item.table));
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

      const includesUsersTable = resolvedTables.some(
        (item) => item.schema === "public" && item.table === "u_users",
      );
      const includesAdminTable = resolvedTables.some(
        (item) => item.schema === "public" && item.table === "u_admin",
      );

      const protectedAdminIds = new Set();
      const protectedAdminRelations = [];
      if (includesUsersTable || includesAdminTable) {
        const protectedAdmins = await client.query(
          `
            SELECT
              u.id,
              a.user_id AS admin_user_id,
              a.phone,
              a.email,
              a.level,
              a.homebase_id
            FROM public.u_users u
            LEFT JOIN public.u_admin a ON a.user_id = u.id
            WHERE u.username = 'center'
               OR u.role = 'center'
               OR (
                 u.role = 'admin'
                 AND LOWER(BTRIM(COALESCE(a.level, ''))) = ANY($1::text[])
               )
          `,
          [PROTECTED_ADMIN_LEVELS],
        );

        for (const row of protectedAdmins.rows) {
          protectedAdminIds.add(row.id);
          if (row.admin_user_id) {
            protectedAdminRelations.push({
              userId: row.admin_user_id,
              phone: row.phone,
              email: row.email,
              level: row.level,
              homebaseId: row.homebase_id,
            });
          }
        }
      }

      const truncateTargets = resolvedTables.filter((item) => {
        if (item.schema !== "public") return true;
        if (item.table === "u_users") return false;
        if (item.table === "u_admin") return false;
        return true;
      });

      if (truncateTargets.length > 0) {
        const truncateSql = Array.from(
          new Map(
            truncateTargets.map((item) => [
              `${item.schema}.${item.table}`,
              buildQualifiedName(item.schema, item.table),
            ]),
          ).values(),
        );

        await client.query(
          `TRUNCATE TABLE ${truncateSql.join(", ")} RESTART IDENTITY CASCADE`,
        );
      }

      if (includesAdminTable) {
        if (protectedAdminIds.size > 0) {
          await client.query(
            `DELETE FROM public.u_admin WHERE user_id <> ALL($1::int[])`,
            [Array.from(protectedAdminIds)],
          );

          for (const relation of protectedAdminRelations) {
            await client.query(
              `
                INSERT INTO public.u_admin (user_id, phone, email, level, homebase_id)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (user_id) DO UPDATE
                SET phone = EXCLUDED.phone,
                    email = EXCLUDED.email,
                    level = EXCLUDED.level,
                    homebase_id = EXCLUDED.homebase_id
              `,
              [
                relation.userId,
                relation.phone,
                relation.email,
                relation.level,
                relation.homebaseId,
              ],
            );
          }
        } else {
          await client.query(`TRUNCATE TABLE public.u_admin RESTART IDENTITY`);
        }
      }

      if (includesUsersTable) {
        if (protectedAdminIds.size > 0) {
          await client.query(
            `DELETE FROM public.u_users WHERE id <> ALL($1::int[])`,
            [Array.from(protectedAdminIds)],
          );
        } else {
          await client.query(`TRUNCATE TABLE public.u_users RESTART IDENTITY`);
        }
      }

      res.status(200).json({ message: "Data berhasil direset" });
    } catch (error) {
      throw new Error(`Gagal reset tabel: ${error.message}`);
    }
  }),
);

export default router;
