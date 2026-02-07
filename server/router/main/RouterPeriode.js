import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// ==========================================
// 1. READ (GET) - Daftar Periode
// ==========================================
router.get(
  "/get-periode",
  authorize("satuan", "pusat"),
  withQuery(async (req, res, db) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    // Filter berdasarkan homebase user login (jika admin satuan)
    // Jika user pusat (tidak punya homebase_id), bisa melihat semua atau difilter via query param
    const userHomebaseId = req.query.homebase_id;

    let queryText = `
      SELECT p.*, h.name as homebase_name 
      FROM a_periode p
      LEFT JOIN a_homebase h ON p.homebase_id = h.id
      WHERE p.name ILIKE $1
    `;
    let countQuery = `
      SELECT COUNT(*) FROM a_periode p 
      WHERE p.name ILIKE $1
    `;

    const params = [`%${search}%`];

    if (userHomebaseId) {
      queryText += ` AND p.homebase_id = $2`;
      countQuery += ` AND p.homebase_id = $2`;
      params.push(userHomebaseId);
    }

    queryText += ` ORDER BY p.is_active DESC, p.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    // Eksekusi
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
// 2. CREATE (POST) - Tambah Periode
// ==========================================
router.post(
  "/add-periode",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { name, homebase_id } = req.body;

    // Gunakan homebase dari user login jika ada, jika tidak (pusat) ambil dari body
    const targetHomebaseId = homebase_id;

    if (!name || !targetHomebaseId) {
      throw new Error("Nama Periode dan Homebase wajib diisi");
    }

    await client.query(
      `INSERT INTO a_periode (name, homebase_id, is_active) VALUES ($1, $2, false)`,
      [name, targetHomebaseId],
    );

    res.status(201).json({
      success: true,
      message: "Periode berhasil ditambahkan",
    });
  }),
);

// ==========================================
// 3. UPDATE (PUT) - Edit Nama Periode
// ==========================================
router.put(
  "/update-periode/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const { name } = req.body;

    await client.query(`UPDATE a_periode SET name = $1 WHERE id = $2`, [
      name,
      id,
    ]);

    res.status(200).json({
      success: true,
      message: "Nama periode berhasil diperbarui",
    });
  }),
);

// ==========================================
// 4. SET ACTIVE (PUT) - Mengaktifkan Periode
// Logika: Set False semua periode di homebase yg sama, lalu Set True periode yg dipilih
// ==========================================
router.put(
  "/set-active-periode/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;

    // 1. Ambil homebase_id dari periode yang akan diaktifkan
    const checkPeriode = await client.query(
      `SELECT homebase_id FROM a_periode WHERE id = $1`,
      [id],
    );

    if (checkPeriode.rowCount === 0) {
      res.status(404);
      throw new Error("Periode tidak ditemukan");
    }

    const homebaseId = checkPeriode.rows[0].homebase_id;

    // 2. Nonaktifkan semua periode di homebase tersebut
    await client.query(
      `UPDATE a_periode SET is_active = false WHERE homebase_id = $1`,
      [homebaseId],
    );

    // 3. Aktifkan periode yang dipilih
    await client.query(`UPDATE a_periode SET is_active = true WHERE id = $1`, [
      id,
    ]);

    res.status(200).json({
      success: true,
      message: "Periode berhasil diaktifkan",
    });
  }),
);

// ==========================================
// 5. DELETE (DELETE) - Hapus Periode
// ==========================================
router.delete(
  "/delete-periode/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;

    // Cek apakah sedang aktif
    const check = await client.query(
      `SELECT is_active FROM a_periode WHERE id = $1`,
      [id],
    );
    if (check.rows.length > 0 && check.rows[0].is_active) {
      res.status(400);
      throw new Error("Tidak dapat menghapus periode yang sedang aktif");
    }

    const result = await client.query(`DELETE FROM a_periode WHERE id = $1`, [
      id,
    ]);

    if (result.rowCount === 0) {
      res.status(404);
      throw new Error("Data tidak ditemukan");
    }

    res.status(200).json({
      success: true,
      message: "Periode berhasil dihapus",
    });
  }),
);

export default router;
