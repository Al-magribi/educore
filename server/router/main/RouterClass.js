import { Router } from "express";
import bcrypt from "bcrypt";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import { getActivePeriode } from "../../utils/helper.js";

const router = Router();

// ============================================================================
// 1. GET CLASS (Mendapatkan Data Kelas + Jumlah Siswa Aktif)
// ============================================================================
router.get(
  "/get-class",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const { page, limit, search } = req.query;
    const homebaseId = req.user.homebase_id;

    if (!page && !limit) {
      const data = await pool.query(
        `SELECT id, name FROM a_class 
         WHERE homebase_id = $1 ORDER BY name ASC`,
        [homebaseId],
      );
      return res.status(200).json(data.rows);
    }

    const offset = (page - 1) * limit;

    // Ambil periode aktif untuk menghitung jumlah siswa real-time
    let activePeriodeId;
    try {
      activePeriodeId = await getActivePeriode(pool, homebaseId);
    } catch (e) {
      return res.status(404).json({ message: e.message });
    }

    // Query Class + Count dari u_class_enrollments
    const queryText = `
        SELECT 
            c.id, 
            c.name, 
            c.grade_id,
            c.major_id,
            g.name AS grade_name, 
            m.name AS major_name,
            (
                SELECT COUNT(*) 
                FROM u_class_enrollments e
                JOIN u_users u ON e.student_id = u.id
                WHERE e.class_id = c.id 
                  AND e.periode_id = $5 
                  AND u.is_active = true
            ) AS students_count
        FROM a_class c
        LEFT JOIN a_grade g ON c.grade_id = g.id 
        LEFT JOIN a_major m ON c.major_id = m.id
        WHERE c.name ILIKE $1 AND c.homebase_id = $2
        ORDER BY g.name::int ASC, regexp_replace(c.name, '^\\d+\\s*', '', 'g') ASC
        LIMIT $3 OFFSET $4
    `;

    const countText = `
        SELECT COUNT(*) FROM a_class 
        WHERE name ILIKE $1 AND homebase_id = $2
    `;

    const [classes, count] = await Promise.all([
      pool.query(queryText, [
        `%${search}%`,
        homebaseId,
        limit,
        offset,
        activePeriodeId,
      ]),
      pool.query(countText, [`%${search}%`, homebaseId]),
    ]);

    res.json({
      classes: classes.rows,
      totalData: parseInt(count.rows[0].count),
      totalPages: Math.ceil(parseInt(count.rows[0].count) / limit),
    });
  }),
);

// ============================================================================
// 2. ADD CLASS (Tambah Kelas Baru)
// ============================================================================
router.post(
  "/add-class",
  authorize("admin"),
  withTransaction(async (req, res, client) => {
    const { name, gradeId, majorId } = req.body;
    const homebaseId = req.user.homebase_id;

    // Validasi sederhana
    if (!name || !gradeId) {
      return res
        .status(400)
        .json({ message: "Nama kelas dan Tingkat (Grade) wajib diisi." });
    }

    // Cek duplikasi nama kelas di homebase yang sama
    const check = await client.query(
      `SELECT id FROM a_class WHERE name ILIKE $1 AND homebase_id = $2`,
      [name, homebaseId],
    );

    if (check.rows.length > 0) {
      return res.status(400).json({ message: "Nama kelas sudah digunakan." });
    }

    // Insert Data
    await client.query(
      `INSERT INTO a_class (name, grade_id, major_id, homebase_id)
       VALUES ($1, $2, $3, $4)`,
      [name, gradeId, majorId || null, homebaseId],
    );

    res.status(201).json({ message: "Kelas berhasil ditambahkan." });
  }),
);

// ============================================================================
// 3. UPDATE CLASS (Edit Data Kelas)
// ============================================================================
router.put(
  "/update-class",
  authorize("admin"),
  withTransaction(async (req, res, client) => {
    const { id, name, gradeId, majorId } = req.body;
    const homebaseId = req.user.homebase_id;

    // Pastikan kelas milik homebase user
    const check = await client.query(
      `SELECT id FROM a_class WHERE id = $1 AND homebase_id = $2`,
      [id, homebaseId],
    );

    if (check.rows.length === 0) {
      return res
        .status(404)
        .json({ message: "Kelas tidak ditemukan atau akses ditolak." });
    }

    // Cek duplikasi nama (kecuali milik diri sendiri)
    const checkName = await client.query(
      `SELECT id FROM a_class WHERE name ILIKE $1 AND homebase_id = $2 AND id != $3`,
      [name, homebaseId, id],
    );

    if (checkName.rows.length > 0) {
      return res
        .status(400)
        .json({ message: "Nama kelas sudah digunakan oleh kelas lain." });
    }

    // Update Data
    await client.query(
      `UPDATE a_class 
       SET name = $1, grade_id = $2, major_id = $3
       WHERE id = $4`,
      [name, gradeId, majorId || null, id],
    );

    res.status(200).json({ message: "Data kelas berhasil diperbarui." });
  }),
);

// ============================================================================
// 4. ADD STUDENT TO CLASS (ASSIGN) - Updated
// ============================================================================
router.post(
  "/add-student",
  authorize("admin"),
  withTransaction(async (req, res, client) => {
    const { nis, classid } = req.body;
    const homebaseId = req.user.homebase_id;

    // 1. Ambil Periode Aktif
    const periodeId = await getActivePeriode(client, homebaseId);

    // 2. Cari Siswa
    const studentRes = await client.query(
      `SELECT u.id as user_id, u.full_name 
       FROM u_users u
       JOIN u_students s ON u.id = s.user_id
       WHERE s.nis = $1 AND s.homebase_id = $2`,
      [nis, homebaseId],
    );

    if (studentRes.rows.length === 0) {
      return res.status(404).json({ message: "NIS tidak ditemukan" });
    }
    const student = studentRes.rows[0];

    // 3. Cek apakah sudah terdaftar di kelas lain pada periode ini?
    const checkEnroll = await client.query(
      `SELECT c.name 
       FROM u_class_enrollments e
       JOIN a_class c ON e.class_id = c.id
       WHERE e.student_id = $1 AND e.periode_id = $2`,
      [student.user_id, periodeId],
    );

    if (checkEnroll.rows.length > 0) {
      return res.status(400).json({
        message: `Siswa ${student.full_name} sudah terdaftar di kelas ${checkEnroll.rows[0].name} pada periode ini.`,
      });
    }

    // 4. Insert Enrollment (Source of Truth)
    await client.query(
      `INSERT INTO u_class_enrollments (student_id, class_id, periode_id, homebase_id)
       VALUES ($1, $2, $3, $4)`,
      [student.user_id, classid, periodeId, homebaseId],
    );

    // 5. Update Cache di u_students (Untuk kemudahan query profil)
    await client.query(
      `UPDATE u_students 
       SET current_class_id = $1, current_periode_id = $2
       WHERE user_id = $3`,
      [classid, periodeId, student.user_id],
    );

    res.status(200).json({ message: "Siswa berhasil dimasukkan ke kelas" });
  }),
);

// ============================================================================
// 5. DELETE CLASS (Hapus Kelas)
// ============================================================================
router.delete(
  "/delete-class/:id",
  authorize("admin"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;
    const homebaseId = req.user.homebase_id;

    // 1. Cek keberadaan kelas
    const checkClass = await client.query(
      `SELECT id, name FROM a_class WHERE id = $1 AND homebase_id = $2`,
      [id, homebaseId],
    );

    if (checkClass.rows.length === 0) {
      return res.status(404).json({ message: "Kelas tidak ditemukan." });
    }

    // 2. Cek apakah ada siswa yang terdaftar di kelas ini (via enrollment)
    // Kita tidak boleh menghapus kelas jika masih ada siswa di dalamnya untuk menjaga integritas data
    const checkStudents = await client.query(
      `SELECT id FROM u_class_enrollments WHERE class_id = $1 LIMIT 1`,
      [id],
    );

    if (checkStudents.rows.length > 0) {
      return res.status(400).json({
        message: `Gagal menghapus. Masih ada siswa yang terdaftar di kelas ${checkClass.rows[0].name}. Silakan keluarkan siswa terlebih dahulu.`,
      });
    }

    // 3. Hapus Kelas
    await client.query(`DELETE FROM a_class WHERE id = $1`, [id]);

    res.status(200).json({ message: "Kelas berhasil dihapus." });
  }),
);

// ============================================================================
// 6. GET STUDENTS IN CLASS (Updated using u_class_enrollments)
// ============================================================================
router.get(
  "/get-students",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const { page, limit, search, classid } = req.query;
    const homebaseId = req.user.homebase_id;
    const offset = (page - 1) * limit;

    // Ambil periode aktif untuk filter enrollment
    let activePeriodeId;
    try {
      activePeriodeId = await getActivePeriode(pool, homebaseId);
    } catch (e) {
      return res.status(404).json({ message: e.message });
    }

    // Base Query: JOIN u_class_enrollments -> u_users & u_students
    const baseJoin = `
        FROM u_class_enrollments e
        JOIN u_users u ON e.student_id = u.id
        JOIN u_students s ON e.student_id = s.user_id
        LEFT JOIN a_class c ON e.class_id = c.id
        LEFT JOIN a_grade g ON c.grade_id = g.id
        LEFT JOIN a_major m ON c.major_id = m.id
        WHERE e.class_id = $1
          AND e.periode_id = $2
          AND e.homebase_id = $3
          AND u.full_name ILIKE $4
    `;

    const countQuery = `SELECT COUNT(*) ${baseJoin}`;

    const dataQuery = `
        SELECT 
            u.id as user_id, 
            s.nis, 
            u.full_name AS student_name,
            u.is_active,
            e.class_id,
            c.name AS class_name,
            g.name AS grade_name,
            m.name AS major_name
        ${baseJoin}
        ORDER BY u.full_name ASC
        LIMIT $5 OFFSET $6
    `;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countQuery, [
        classid,
        activePeriodeId,
        homebaseId,
        `%${search}%`,
      ]),
      pool.query(dataQuery, [
        classid,
        activePeriodeId,
        homebaseId,
        `%${search}%`,
        limit,
        offset,
      ]),
    ]);

    const totalData = parseInt(countResult.rows[0].count, 10);

    res.status(200).json({
      totalData,
      totalPages: Math.ceil(totalData / parseInt(limit)),
      students: dataResult.rows,
    });
  }),
);

// ============================================================================
// 7. DELETE STUDENT FROM CLASS (Updated)
// ============================================================================
router.delete(
  "/delete-student",
  authorize("admin"),
  withTransaction(async (req, res, client) => {
    const { id } = req.query; // student_id
    const homebaseId = req.user.homebase_id;

    // Ambil periode aktif (Kita hanya menghapus enrollment di periode ini)
    const periodeId = await getActivePeriode(client, homebaseId);

    // Hapus dari Enrollment
    const result = await client.query(
      `DELETE FROM u_class_enrollments 
       WHERE student_id = $1 AND periode_id = $2 AND homebase_id = $3`,
      [id, periodeId, homebaseId],
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message:
          "Siswa tidak terdaftar di kelas manapun pada periode aktif ini.",
      });
    }

    // Reset status cache di u_students jika yang dihapus adalah kelas saat ini
    await client.query(
      `UPDATE u_students 
       SET current_class_id = NULL, current_periode_id = NULL
       WHERE user_id = $1 AND current_periode_id = $2`,
      [id, periodeId],
    );

    res.status(200).json({ message: "Siswa berhasil dikeluarkan dari kelas." });
  }),
);

// ============================================================================
// 8. UPLOAD STUDENTS (BULK) - Compatible with New Schema
// ============================================================================
router.post(
  "/upload-students",
  authorize("admin"),
  withTransaction(async (req, res, client) => {
    const { students, periodeId: inputPeriodeId } = req.body;
    const homebaseId = req.user.homebase_id;

    // Default Password
    const defaultPassword = "12345678"; // Sesuaikan kebijakan
    const hash = await bcrypt.hash(defaultPassword, 10);

    // Ambil Periode Aktif
    let periodeId = inputPeriodeId;
    if (!periodeId) {
      periodeId = await getActivePeriode(client, homebaseId);
    }

    const uploaded = [];
    const alreadyRegistered = [];
    const invalidData = [];

    // Validasi awal input agar tidak error di loop
    if (!Array.isArray(students) || students.length === 0) {
      return res
        .status(400)
        .json({ message: "Data upload kosong atau format salah." });
    }

    for (const item of students) {
      const { nis, name, gender, classId } = item;

      // 1. Validasi Data Dasar
      if (!nis || !name || !classId) {
        invalidData.push({ nis, name, reason: "Data tidak lengkap" });
        continue;
      }

      // 2. Cek apakah USER/STUDENT sudah ada (berdasarkan NIS & Homebase)
      // Kita join u_users dan u_students untuk memastikan konsistensi
      const existingStudent = await client.query(
        `SELECT u.id as user_id, s.nis 
             FROM u_users u
             JOIN u_students s ON u.id = s.user_id
             WHERE s.nis = $1 AND s.homebase_id = $2`,
        [nis, homebaseId],
      );

      let userId;

      if (existingStudent.rows.length > 0) {
        // -- SISWA LAMA --
        userId = existingStudent.rows[0].user_id;

        // Opsional: Update nama jika diperlukan, tapi biasanya data master tidak diupdate via upload kelas
        // Tapi kita pastikan data di u_students lengkap
      } else {
        // -- SISWA BARU --
        // A. Create User (Login)
        const newUser = await client.query(
          `INSERT INTO u_users (username, password, full_name, role, gender, is_active)
                 VALUES ($1, $2, $3, 'student', $4, true)
                 RETURNING id`,
          [nis, hash, name, gender || null], // Username pakai NIS
        );
        userId = newUser.rows[0].id;

        // B. Create Student Profile
        await client.query(
          `INSERT INTO u_students (user_id, nis, homebase_id, current_class_id, current_periode_id)
                 VALUES ($1, $2, $3, $4, $5)`,
          [userId, nis, homebaseId, classId, periodeId],
        );
      }

      // 3. Cek Enrollment (Apakah sudah masuk kelas di periode ini?)
      const checkEnroll = await client.query(
        `SELECT id FROM u_class_enrollments 
             WHERE student_id = $1 AND periode_id = $2 AND homebase_id = $3`,
        [userId, periodeId, homebaseId],
      );

      if (checkEnroll.rows.length > 0) {
        alreadyRegistered.push({
          nis,
          name,
          reason: "Sudah terdaftar di kelas lain/sama",
        });
        continue;
      }

      // 4. Enroll Siswa ke Kelas
      await client.query(
        `INSERT INTO u_class_enrollments (student_id, class_id, periode_id, homebase_id)
             VALUES ($1, $2, $3, $4)`,
        [userId, classId, periodeId, homebaseId],
      );

      // 5. Update Cache Status Siswa
      await client.query(
        `UPDATE u_students 
             SET current_class_id = $1, current_periode_id = $2
             WHERE user_id = $3`,
        [classId, periodeId, userId],
      );

      uploaded.push({ nis, name });
    }

    // Response Multi-status
    res.status(200).json({
      message: "Proses upload selesai.",
      uploaded,
      alreadyRegistered,
      invalidData,
    });
  }),
);

export default router;
