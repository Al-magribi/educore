import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// ==========================================
// 1. GET LIST GRADE (Read)
// ==========================================
router.get(
  "/get-grade",
  authorize("satuan", "teacher"), // Izinkan satuan dan guru melihat grade
  withQuery(async (req, res, pool) => {
    const { page = 1, limit = 10, search = "" } = req.query;
    const offset = (page - 1) * limit;
    const { homebase_id } = req.user; // Ambil homebase dari user yang login

    // Query Dasar: Filter by homebase_id agar data terisolasi per sekolah
    let queryBase = `FROM a_grade WHERE homebase_id = $1`;
    const queryParams = [homebase_id];

    // Filter Search (jika ada)
    if (search) {
      queryBase += ` AND name ILIKE $2`;
      queryParams.push(`%${search}%`);
    }

    // 1. Hitung Total Data (untuk pagination)
    const countQuery = `SELECT COUNT(*) as total ${queryBase}`;
    const totalResult = await pool.query(countQuery, queryParams);
    const totalData = parseInt(totalResult.rows[0].total);

    // 2. Ambil Data
    // Offset & Limit dimasukkan dinamis tergantung jumlah parameter search
    const limitOffsetIndex = queryParams.length + 1;
    const dataQuery = `
        SELECT id, name 
        ${queryBase} 
        ORDER BY name ASC 
        LIMIT $${limitOffsetIndex} OFFSET $${limitOffsetIndex + 1}
    `;

    // Tambahkan limit & offset ke array params
    queryParams.push(limit, offset);

    const result = await pool.query(dataQuery, queryParams);

    res.json({
      status: "success",
      data: result.rows,
      meta: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalData,
        totalPages: Math.ceil(totalData / limit),
      },
    });
  }),
);

// ==========================================
// 2. CREATE GRADE (Create)
// ==========================================
router.post(
  "/add-grade",
  authorize("satuan"), // Hanya satuan yang boleh tambah
  withTransaction(async (req, res, client) => {
    const { name } = req.body;
    const { homebase_id } = req.user;

    if (!name) {
      return res.status(400).json({ message: "Nama Tingkat harus diisi" });
    }

    const query = `
      INSERT INTO a_grade (homebase_id, name) 
      VALUES ($1, $2) 
      RETURNING id, name
    `;

    const result = await client.query(query, [homebase_id, name]);

    res.status(201).json({
      status: "success",
      message: "Data berhasil ditambahkan",
      data: result.rows[0],
    });
  }),
);

// ==========================================
// 3. UPDATE GRADE (Update)
// ==========================================
router.put(
  "/edit-grade/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const { name } = req.body;
    const { homebase_id } = req.user;

    // Pastikan data yang diedit milik homebase user
    const checkQuery = `SELECT id FROM a_grade WHERE id = $1 AND homebase_id = $2`;
    const check = await client.query(checkQuery, [id, homebase_id]);

    if (check.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Data tidak ditemukan atau akses ditolak" });
    }

    const updateQuery = `
      UPDATE a_grade 
      SET name = $1 
      WHERE id = $2 
      RETURNING id, name
    `;

    await client.query(updateQuery, [name, id]);

    res.json({
      status: "success",
      message: "Data berhasil diperbarui",
    });
  }),
);

// ==========================================
// 4. DELETE GRADE (Delete)
// ==========================================
router.delete(
  "/delete-grade/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const { homebase_id } = req.user;

    // Cek kepemilikan
    const checkQuery = `SELECT id FROM a_grade WHERE id = $1 AND homebase_id = $2`;
    const check = await client.query(checkQuery, [id, homebase_id]);

    if (check.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Data tidak ditemukan atau akses ditolak" });
    }

    // Cek Relasi sebelum hapus (Opsional, tapi disarankan)
    // Misalnya cek apakah grade dipakai di tabel a_class
    const relationCheck = await client.query(
      `SELECT id FROM a_class WHERE grade_id = $1 LIMIT 1`,
      [id],
    );
    if (relationCheck.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Gagal hapus. Data sedang digunakan di Kelas." });
    }

    const deleteQuery = `DELETE FROM a_grade WHERE id = $1`;
    await client.query(deleteQuery, [id]);

    res.json({
      status: "success",
      message: "Data berhasil dihapus",
    });
  }),
);

export default router;
