import { Router } from "express";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// ==========================================
// 1. READ (GET) - Menggunakan withQuery
// ==========================================
router.get(
  "/get-homebase",
  authorize("pusat"), // Opsional: Hapus jika publik
  withQuery(async (req, res, db) => {
    // Parameter Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = req.query.search || "";

    // Query Data
    const queryText = `
      SELECT * FROM a_homebase 
      WHERE name ILIKE $1 
      ORDER BY created_at DESC 
      LIMIT $2 OFFSET $3
    `;

    // Query Hitung Total (untuk Infinite Scroll)
    const countQuery = `SELECT COUNT(*) FROM a_homebase WHERE name ILIKE $1`;

    // Eksekusi (db disini adalah pool, sesuai wrapper.js)
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

// ==========================================
// 2. CREATE (POST) - Menggunakan withTransaction
// ==========================================
router.post(
  "/add-homebase",
  authorize("pusat"),
  withTransaction(async (req, res, client) => {
    // 1. Ambil 'level' dari body
    const { name, description, level } = req.body;

    if (!name) {
      throw new Error("Nama Homebase wajib diisi");
    }
    // 2. Validasi Level
    if (!level) {
      throw new Error("Jenjang satuan wajib dipilih");
    }

    // 3. Update Query SQL
    await client.query(
      `INSERT INTO a_homebase (name, description, level) VALUES ($1, $2, $3)`,
      [name, description, level],
    );

    res.status(201).json({
      success: true,
      message: "Homebase berhasil ditambahkan",
    });
  }),
);

// ==========================================
// 3. UPDATE (PUT) - Update Query Update
// ==========================================
router.put(
  "/update-homebase/:id",
  authorize("pusat"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    // 1. Ambil 'level' dari body
    const { name, description, level } = req.body;

    const check = await client.query(
      `SELECT id FROM a_homebase WHERE id = $1`,
      [id],
    );
    if (check.rows.length === 0) {
      res.status(404);
      throw new Error("Data tidak ditemukan");
    }

    // 2. Update Query SQL
    await client.query(
      `UPDATE a_homebase SET name = $1, description = $2, level = $3 WHERE id = $4`,
      [name, description, level, id], // Perhatikan urutan parameter
    );

    res.status(200).json({
      success: true,
      message: "Homebase berhasil diperbarui",
    });
  }),
);

// ==========================================
// 4. DELETE (DELETE) - Menggunakan withTransaction
// ==========================================
router.delete(
  "/delete-homebase/:id",
  authorize("pusat"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;

    const result = await client.query(`DELETE FROM a_homebase WHERE id = $1`, [
      id,
    ]);

    if (result.rowCount === 0) {
      res.status(404);
      throw new Error("Data tidak ditemukan atau sudah dihapus");
    }

    res.status(200).json({
      success: true,
      message: "Homebase berhasil dihapus",
    });
  }),
);

// ==========================================
// 5. GET DETAIL DASHBOARD (Statistik Homebase)
// ==========================================
router.get(
  "/detail-homebase/:id",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    const { id } = req.params; // Homebase ID
    const { periode_id } = req.query; // Filter Periode

    // 1. Ambil List Periode untuk Filter Dropdown
    const periodQuery = `
      SELECT id, name, is_active 
      FROM a_periode 
      WHERE homebase_id = $1 
      ORDER BY name DESC
    `;

    // Jika periode_id tidak dikirim, kita cari periode aktif default dari DB
    let activePeriodeId = periode_id;
    const periodsResult = await db.query(periodQuery, [id]);

    if (!activePeriodeId && periodsResult.rows.length > 0) {
      const activeP = periodsResult.rows.find((p) => p.is_active);
      activePeriodeId = activeP ? activeP.id : periodsResult.rows[0].id;
    }

    // 2. Query Statistik (Jalankan Paralel)
    // Filter siswa berdasarkan current_periode_id (sesuai schema u_students)

    // A. Total & Komposisi Guru (Guru terikat homebase, biasanya tidak per periode secara ketat di schema ini, tapi kita ambil global homebase)
    const teacherQuery = `
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN u.gender = 'L' THEN 1 ELSE 0 END) as laki,
        SUM(CASE WHEN u.gender = 'P' THEN 1 ELSE 0 END) as perempuan
      FROM u_teachers t
      JOIN u_users u ON t.user_id = u.id
      WHERE t.homebase_id = $1
    `;

    // B. Total Siswa (Filter by Periode)
    const studentQuery = `
      SELECT COUNT(*) as total
      FROM u_students 
      WHERE homebase_id = $1 AND current_periode_id = $2
    `;

    // C. Total Kelas
    const classCountQuery = `
      SELECT COUNT(*) as total FROM a_class WHERE homebase_id = $1
    `;

    // D. Total Pelajaran
    const subjectCountQuery = `
      SELECT COUNT(*) as total FROM a_subject WHERE homebase_id = $1
    `;

    // E. Data Komposisi Siswa Per Kelas (Detail Dashboard)
    const classCompositionQuery = `
      SELECT 
        c.name as class_name,
        COUNT(s.user_id) as total_students,
        SUM(CASE WHEN u.gender = 'L' THEN 1 ELSE 0 END) as laki,
        SUM(CASE WHEN u.gender = 'P' THEN 1 ELSE 0 END) as perempuan
      FROM a_class c
      LEFT JOIN u_students s ON c.id = s.current_class_id AND s.current_periode_id = $2
      LEFT JOIN u_users u ON s.user_id = u.id
      WHERE c.homebase_id = $1
      GROUP BY c.id, c.name
      ORDER BY c.name ASC
    `;

    // Eksekusi Query
    const [teachers, students, classes, subjects, classComp] =
      await Promise.all([
        db.query(teacherQuery, [id]),
        db.query(studentQuery, [id, activePeriodeId]),
        db.query(classCountQuery, [id]),
        db.query(subjectCountQuery, [id]),
        db.query(classCompositionQuery, [id, activePeriodeId]),
      ]);

    res.status(200).json({
      success: true,
      data: {
        periods: periodsResult.rows,
        selected_periode_id: activePeriodeId,
        stats: {
          teachers: teachers.rows[0],
          students: students.rows[0],
          classes: classes.rows[0],
          subjects: subjects.rows[0],
        },
        class_composition: classComp.rows,
      },
    });
  }),
);

export default router;
