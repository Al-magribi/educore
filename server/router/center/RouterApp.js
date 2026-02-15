import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();

const normalizeConfigValue = (key, value) => {
  if (value === null || value === undefined) return "";

  if (key === "domain") {
    return String(value)
      .trim()
      .replace(/^https?:\/\//i, "")
      .replace(/\/+$/, "");
  }

  return typeof value === "string" ? value : String(value);
};

// --- KONFIGURASI UPLOAD (MULTER) ---
// Tentukan lokasi penyimpanan (misal: client/public/assets/web)
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Sesuaikan path ini dengan folder public project frontend Anda
    const dir = "server/assets/web";

    // Buat folder jika belum ada
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    // Penamaan file unik: timestamp-random.ext
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Hanya file gambar yang diperbolehkan!"));
    }
  },
});

// --- ENDPOINTS ---

router.get(
  "/public-config",
  withQuery(async (req, res, db) => {
    // Query Filter: Hanya ambil kategori 'app' dan 'metadata'
    // Security: Mencegah kebocoran data sensitif (misal: SMTP pass) ke publik
    const result = await db.query(
      "SELECT key, value, type FROM configurations WHERE category IN ('app', 'metadata')",
    );

    // Transform array ke object agar mudah diakses frontend (O(1))
    // Contoh output: { app_name: "EduCore", meta_title: "..." }
    const configMap = result.rows.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});

    res.json(configMap);
  }),
);

// POST: Upload Image
// Endpoint: /api/center/upload-config
router.post(
  "/upload-config",
  authorize("admin"),
  upload.single("file"),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ message: "Tidak ada file yang diupload" });
    }

    // Kembalikan URL relatif agar bisa diakses frontend
    // Contoh return: /assets/web/file-123.png
    const fileUrl = `/assets/web/${req.file.filename}`;

    res.json({
      code: 200,
      message: "Upload berhasil",
      url: fileUrl,
    });
  },
);

// GET: Ambil Config (Tetap sama seperti sebelumnya)
router.get(
  "/config",
  authorize(),
  withQuery(async (req, res, db) => {
    const result = await db.query(
      "SELECT * FROM configurations ORDER BY category, key ASC",
    );
    res.json({ code: 200, message: "OK", data: result.rows });
  }),
);

// PUT: Update Config (Tetap sama seperti sebelumnya)
router.put(
  "/config",
  authorize("admin"),
  withTransaction(async (req, res, client) => {
    const { configs } = req.body || {};

    if (!Array.isArray(configs) || configs.length === 0) {
      return res
        .status(400)
        .json({ code: 400, message: "Payload configs tidak valid" });
    }

    const sanitizedConfigs = configs
      .filter((item) => item && item.key)
      .map((item) => ({
        key: item.key,
        value: normalizeConfigValue(item.key, item.value),
      }));

    const updatePromises = sanitizedConfigs.map((item) =>
      client.query(
        "UPDATE configurations SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2",
        [item.value, item.key],
      ),
    );

    await Promise.all(updatePromises);

    res.json({ code: 200, message: "Updated" });
  }),
);

export default router;
