import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// ==========================================
// 1. READ (GET) - Get Majors
// ==========================================
router.get(
  "/get-major",
  authorize("satuan"),
  withQuery(async (req, res, db) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    // Filter by homebase
    const userHomebaseId = req.user.homebase_id;

    let queryText = `
      SELECT m.*, h.name as homebase_name 
      FROM a_major m
      LEFT JOIN a_homebase h ON m.homebase_id = h.id
      WHERE m.name ILIKE $1
    `;

    let countQuery = `
      SELECT COUNT(*) FROM a_major m 
      WHERE m.name ILIKE $1
    `;

    const params = [`%${search}%`];

    if (userHomebaseId) {
      queryText += ` AND m.homebase_id = $2`;
      countQuery += ` AND m.homebase_id = $2`;
      params.push(userHomebaseId);
    }

    queryText += ` ORDER BY m.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const dataResult = await db.query(queryText, [...params, limit, offset]);
    const countResult = await db.query(countQuery, params);

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
// 2. CREATE (POST) - Add Major
// ==========================================
router.post(
  "/add-major",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { name, homebase_id } = req.body;

    // Gunakan homebase login user, atau dari body jika user pusat
    const targetHomebaseId = req.user.homebase_id || homebase_id;

    if (!name || !targetHomebaseId) {
      throw new Error("Nama Jurusan dan Satuan Pendidikan wajib diisi");
    }

    await client.query(
      `INSERT INTO a_major (name, homebase_id) VALUES ($1, $2)`,
      [name, targetHomebaseId],
    );

    res.status(201).json({
      success: true,
      message: "Jurusan berhasil ditambahkan",
    });
  }),
);

// ==========================================
// 3. UPDATE (PUT) - Update Major
// ==========================================
router.put(
  "/update-major/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) throw new Error("Nama Jurusan tidak boleh kosong");

    // Opsional: Cek otorisasi kepemilikan data (homebase) jika perlu

    await client.query(`UPDATE a_major SET name = $1 WHERE id = $2`, [
      name,
      id,
    ]);

    res.status(200).json({
      success: true,
      message: "Jurusan berhasil diperbarui",
    });
  }),
);

// ==========================================
// 4. DELETE (DELETE) - Delete Major
// ==========================================
router.delete(
  "/delete-major/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;

    // Cek ketergantungan data (misal: dipakai di a_class)
    const checkUsage = await client.query(
      `SELECT id FROM a_class WHERE major_id = $1 LIMIT 1`,
      [id],
    );

    if (checkUsage.rowCount > 0) {
      res.status(400);
      throw new Error(
        "Jurusan ini sedang digunakan oleh Kelas aktif. Hapus kelas terlebih dahulu.",
      );
    }

    const result = await client.query(`DELETE FROM a_major WHERE id = $1`, [
      id,
    ]);

    if (result.rowCount === 0) {
      res.status(404);
      throw new Error("Data tidak ditemukan");
    }

    res.status(200).json({
      success: true,
      message: "Jurusan berhasil dihapus",
    });
  }),
);

export default router;
