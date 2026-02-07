import { Router } from "express";
import bcrypt from "bcrypt";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();
const SALT_ROUNDS = 10;

// 1. GET ADMINS (Include homebase info)
router.get(
  "/get-admins",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    // Join ke a_homebase untuk menampilkan nama homebase (jika ada)
    const queryText = `
      SELECT 
        u.id, u.username, u.full_name, u.role, u.is_active, u.created_at,
        a.phone, a.email, a.level, a.homebase_id,
        h.name as homebase_name
      FROM u_users u
      JOIN u_admin a ON u.id = a.user_id
      LEFT JOIN a_homebase h ON a.homebase_id = h.id
      WHERE u.role = 'admin' 
      AND (u.full_name ILIKE $1 OR u.username ILIKE $1)
      ORDER BY u.created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    const countQuery = `
      SELECT COUNT(*) 
      FROM u_users u 
      JOIN u_admin a ON u.id = a.user_id
      WHERE u.role = 'admin' AND (u.full_name ILIKE $1 OR u.username ILIKE $1)
    `;

    const dataResult = await db.query(queryText, [
      `%${search}%`,
      limit,
      offset,
    ]);
    const countResult = await db.query(countQuery, [`%${search}%`]);

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

// 2. CREATE ADMIN
router.post(
  "/add-admin",
  authorize("pusat"),
  withTransaction(async (req, res, client) => {
    // Tambahkan homebase_id di body
    const { username, password, full_name, level, phone, email, homebase_id } =
      req.body;

    if (!username || !password || !full_name) {
      throw new Error("Username, Password, dan Nama Lengkap wajib diisi");
    }

    // Validasi: Jika level satuan, homebase_id wajib ada
    if (level === "satuan" && !homebase_id) {
      throw new Error("Untuk level Satuan, Homebase wajib dipilih");
    }

    const checkUser = await client.query(
      "SELECT id FROM u_users WHERE username = $1",
      [username],
    );
    if (checkUser.rows.length > 0) {
      throw new Error("Username sudah digunakan");
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    const userResult = await client.query(
      `INSERT INTO u_users (username, password, full_name, role, is_active) 
       VALUES ($1, $2, $3, 'admin', true) RETURNING id`,
      [username, hashedPassword, full_name],
    );
    const newUserId = userResult.rows[0].id;

    // Simpan homebase_id (bisa null jika level pusat/tahfiz)
    await client.query(
      `INSERT INTO u_admin (user_id, phone, email, level, homebase_id) VALUES ($1, $2, $3, $4, $5)`,
      [newUserId, phone, email, level || "admin", homebase_id || null],
    );

    res
      .status(201)
      .json({ success: true, message: "Admin berhasil ditambahkan" });
  }),
);

// 3. UPDATE ADMIN
router.put(
  "/update-admin/:id",
  authorize("pusat"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    // Tambahkan homebase_id di body
    const { full_name, level, phone, email, password, is_active, homebase_id } =
      req.body;

    if (level === "satuan" && !homebase_id) {
      throw new Error("Untuk level Satuan, Homebase wajib dipilih");
    }

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

    // Update level dan homebase_id
    await client.query(
      `UPDATE u_admin SET phone = $1, email = $2, level = $3, homebase_id = $4 WHERE user_id = $5`,
      [phone, email, level, homebase_id || null, id],
    );

    res.status(200).json({ success: true, message: "Data admin diperbarui" });
  }),
);

// 4. DELETE (Sama seperti sebelumnya)
router.delete(
  "/delete-admin/:id",
  authorize("pusat"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    await client.query(`DELETE FROM u_users WHERE id = $1`, [id]);
    res.status(200).json({ success: true, message: "Admin berhasil dihapus" });
  }),
);

export default router;
