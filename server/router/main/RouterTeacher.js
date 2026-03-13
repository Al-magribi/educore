import { Router } from "express";
import bcrypt from "bcrypt";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();
const SALT_ROUNDS = 10;

// ==========================================
// 1. READ (GET) - Daftar Guru + Homebase
// ==========================================
router.get(
  "/get-teachers",
  authorize("pusat", "satuan"), // Center & Admin Satuan bisa lihat
  withQuery(async (req, res, db) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";
    const homebase_id = req.user.homebase_id;
    const isSatuanLevel = req.user.level === "satuan";

    const whereClauses = [`u.role = 'teacher'`];
    const whereParams = [];

    // Admin level satuan hanya boleh melihat data guru di homebase sendiri.
    if (isSatuanLevel) {
      whereParams.push(homebase_id);
      whereClauses.push(`t.homebase_id = $${whereParams.length}`);
    }

    whereParams.push(`%${search}%`);
    whereClauses.push(
      `(u.full_name ILIKE $${whereParams.length} OR t.nip ILIKE $${whereParams.length})`,
    );

    const whereSql = whereClauses.join(" AND ");

    // Join u_users (akun), u_teachers (profil), a_homebase (satuan)
    const queryText = `
      SELECT 
        u.id, u.username, u.full_name, u.is_active, u.created_at, u.img_url,
        t.nip, t.phone, t.email, t.homebase_id,
        h.name as homebase_name
      FROM u_users u
      JOIN u_teachers t ON u.id = t.user_id
      LEFT JOIN a_homebase h ON t.homebase_id = h.id
      WHERE ${whereSql}
      ORDER BY u.created_at DESC
      LIMIT $${whereParams.length + 1} OFFSET $${whereParams.length + 2}
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM u_users u 
      JOIN u_teachers t ON u.id = t.user_id
      WHERE ${whereSql}
    `;

    const dataResult = await db.query(queryText, [...whereParams, limit, offset]);
    const countResult = await db.query(countQuery, whereParams);

    const totalItems = parseInt(countResult.rows[0].count);
    const hasMore = offset + dataResult.rows.length < totalItems;

    res.status(200).json({
      success: true,
      data: dataResult.rows,
      page,
      limit,
      totalItems,
      hasMore,
    });
  }),
);

// ==========================================
// 2. CREATE (POST) - Tambah Guru
// ==========================================
router.post(
  "/add-teacher",
  authorize("pusat", "satuan"),
  withTransaction(async (req, res, client) => {
    const { username, password, full_name, nip, phone, email, homebase_id } =
      req.body;

    console.log(req.user);

    // Validasi dasar
    if (!username || !password || !full_name) {
      throw new Error("Username, Password, dan Nama Lengkap wajib diisi");
    }

    if (!homebase_id) {
      throw new Error("Guru wajib ditempatkan di Satuan Pendidikan (Homebase)");
    }

    // Cek Username
    const checkUser = await client.query(
      "SELECT id FROM u_users WHERE username = $1",
      [username],
    );
    if (checkUser.rows.length > 0) {
      throw new Error("Username sudah digunakan");
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // 1. Insert u_users
    const userResult = await client.query(
      `INSERT INTO u_users (username, password, full_name, role, is_active) 
       VALUES ($1, $2, $3, 'teacher', true) RETURNING id`,
      [username, hashedPassword, full_name],
    );
    const newUserId = userResult.rows[0].id;

    // 2. Insert u_teachers
    await client.query(
      `INSERT INTO u_teachers (user_id, nip, phone, email, homebase_id) 
       VALUES ($1, $2, $3, $4, $5)`,
      [newUserId, nip || null, phone, email, homebase_id],
    );

    res
      .status(201)
      .json({ success: true, message: "Guru berhasil ditambahkan" });
  }),
);

// ==========================================
// 3. UPDATE (PUT) - Edit Guru
// ==========================================
router.put(
  "/update-teacher/:id",
  authorize("pusat", "satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const { full_name, password, is_active, nip, phone, email, homebase_id } =
      req.body;

    if (!homebase_id) {
      throw new Error("Homebase tidak boleh kosong");
    }

    // 1. Update u_users
    let userQuery = `UPDATE u_users SET full_name = $1, is_active = $2`;
    let userParams = [full_name, is_active];

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      userQuery += `, password = $3 WHERE id = $4`;
      userParams.push(hashedPassword, id);
    } else {
      userQuery += ` WHERE id = $3`;
      userParams.push(id);
    }

    await client.query(userQuery, userParams);

    // 2. Update u_teachers
    await client.query(
      `UPDATE u_teachers SET nip = $1, phone = $2, email = $3, homebase_id = $4 
       WHERE user_id = $5`,
      [nip, phone, email, homebase_id, id],
    );

    res.status(200).json({ success: true, message: "Data guru diperbarui" });
  }),
);

// ==========================================
// 4. DELETE (DELETE) - Hapus Guru
// ==========================================
router.delete(
  "/delete-teacher/:id",
  authorize("pusat", "satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    // Cascade delete akan menghapus data di u_teachers otomatis
    await client.query(`DELETE FROM u_users WHERE id = $1`, [id]);
    await client.query(`DELETE FROM u_teachers WHERE user_id = $1`, [id]);
    res.status(200).json({ success: true, message: "Guru berhasil dihapus" });
  }),
);

// ==========================================
// 5. BULK IMPORT (POST) - Import Guru
// ==========================================
router.post(
  "/upload-teachers",
  authorize("pusat", "satuan"),
  withTransaction(async (req, res, client) => {
    const payload = Array.isArray(req.body) ? { teachers: req.body } : req.body;
    const teachers = Array.isArray(payload?.teachers) ? payload.teachers : [];
    const defaultHomebaseId = payload?.homebase_id || null;
    const isSatuanLevel = req.user.level === "satuan";

    if (teachers.length === 0) {
      throw new Error("Data guru untuk import tidak boleh kosong");
    }

    let imported = 0;
    let skippedInvalid = 0;
    let skippedDuplicate = 0;

    for (const row of teachers) {
      const nip = (row?.nip || "").toString().trim();
      const fullName = (row?.full_name || row?.name || "").toString().trim();
      const phone = (row?.phone || "").toString().trim();
      const email = (row?.email || "").toString().trim();
      const homebaseId = isSatuanLevel
        ? req.user.homebase_id
        : row?.homebase_id || defaultHomebaseId;

      if (!nip || !fullName || !homebaseId) {
        skippedInvalid++;
        continue;
      }

      const duplicateNip = await client.query(
        "SELECT user_id FROM u_teachers WHERE nip = $1 AND homebase_id = $2",
        [nip, homebaseId],
      );
      if (duplicateNip.rows.length > 0) {
        skippedDuplicate++;
        continue;
      }

      const duplicateUsername = await client.query(
        "SELECT id FROM u_users WHERE username = $1",
        [nip],
      );
      if (duplicateUsername.rows.length > 0) {
        skippedDuplicate++;
        continue;
      }

      const hashedPassword = await bcrypt.hash("123456", SALT_ROUNDS);
      const userResult = await client.query(
        `INSERT INTO u_users (username, password, full_name, role, is_active)
         VALUES ($1, $2, $3, 'teacher', true) RETURNING id`,
        [nip, hashedPassword, fullName],
      );

      await client.query(
        `INSERT INTO u_teachers (user_id, nip, phone, email, homebase_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [userResult.rows[0].id, nip, phone || null, email || null, homebaseId],
      );

      imported++;
    }

    res.status(201).json({
      success: true,
      message: `Berhasil mengimpor ${imported} dari ${teachers.length} data guru`,
      summary: {
        total: teachers.length,
        imported,
        skipped_invalid: skippedInvalid,
        skipped_duplicate: skippedDuplicate,
      },
    });
  }),
);

export default router;
