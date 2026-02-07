import { Router } from "express";
import bcrypt from "bcrypt";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import { getActivePeriode } from "../../utils/helper.js";

const router = Router();

// ============================================================================
// 1. GET STUDENTS (Sama seperti sebelumnya, tidak diubah logic query-nya)
// ============================================================================
router.get(
  "/students",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { page, limit, search } = req.query;
    const homebaseId = req.user.homebase_id;
    const activePeriodeId = await getActivePeriode(pool, homebaseId);

    const pageNum = parseInt(page) || 1;
    const limitNum = parseInt(limit) || 10;
    const offset = (pageNum - 1) * limitNum;
    const searchTerm = search || "";

    const queryText = `
      SELECT 
        u.id, u.username, u.full_name, u.is_active, u.gender,
        s.nis, s.nisn,
        c.name AS current_class,
        g.name AS current_grade,
        
        -- Kita kirim juga ID untuk keperluan edit di frontend
        c.id AS current_class_id,
        g.id AS current_grade_id,

        COALESCE((
          SELECT json_agg(json_build_object(
            'periode', p.name,
            'class', ch_c.name,
            'grade', ch_g.name,
            'status', CASE WHEN p.is_active THEN 'Aktif' ELSE 'Selesai' END
          ) ORDER BY p.name DESC)
          FROM u_class_enrollments ce_hist
          JOIN a_class ch_c ON ce_hist.class_id = ch_c.id
          JOIN a_periode p ON ce_hist.periode_id = p.id
          LEFT JOIN a_grade ch_g ON ch_c.grade_id = ch_g.id
          WHERE ce_hist.student_id = u.id
        ), '[]') AS class_history

      FROM u_users u
      JOIN u_students s ON u.id = s.user_id
      -- Left Join agar siswa yang belum masuk kelas tetap muncul (opsional, tergantung kebutuhan)
      -- Disini pakai JOIN karena filter periode aktif
      JOIN u_class_enrollments ce ON s.user_id = ce.student_id
      JOIN a_class c ON ce.class_id = c.id
      LEFT JOIN a_grade g ON c.grade_id = g.id

      WHERE u.role = 'student' 
        AND s.homebase_id = $1
        AND ce.periode_id = $5 
        AND (u.full_name ILIKE $2 OR s.nis ILIKE $2)
      
      ORDER BY u.full_name ASC
      LIMIT $3 OFFSET $4
    `;

    const countText = `
      SELECT COUNT(*) 
      FROM u_users u
      JOIN u_students s ON u.id = s.user_id
      JOIN u_class_enrollments ce ON s.user_id = ce.student_id
      WHERE u.role = 'student' 
        AND s.homebase_id = $1
        AND ce.periode_id = $3
        AND (u.full_name ILIKE $2 OR s.nis ILIKE $2)
    `;

    const [dataResult, countResult] = await Promise.all([
      pool.query(queryText, [
        homebaseId,
        `%${searchTerm}%`,
        limitNum,
        offset,
        activePeriodeId,
      ]),
      pool.query(countText, [homebaseId, `%${searchTerm}%`, activePeriodeId]),
    ]);

    res.json({
      data: dataResult.rows,
      totalData: parseInt(countResult.rows[0].count),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limitNum),
      activePeriodeId: activePeriodeId,
    });
  }),
);

// ============================================================================
// 2. CREATE STUDENT (Updated: Remove Birth, Add Class Enrollment)
// ============================================================================
router.post(
  "/create-student",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const {
      username,
      password,
      full_name,
      nis,
      nisn,
      gender,
      class_id, // Input baru dari frontend
    } = req.body;
    const homebaseId = req.user.homebase_id;

    // 1. Ambil Periode Aktif
    const activePeriodeId = await getActivePeriode(client, homebaseId);

    // 2. Cek Username
    const checkUser = await client.query(
      `SELECT id FROM u_users WHERE username = $1`,
      [username],
    );
    if (checkUser.rows.length > 0) {
      return res.status(400).json({ message: "Username sudah digunakan." });
    }

    // 3. Hash Password & Insert User
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password, salt);
    const userRes = await client.query(
      `INSERT INTO u_users (username, password, full_name, role, gender, is_active)
       VALUES ($1, $2, $3, 'student', $4, true)
       RETURNING id`,
      [username, hashPassword, full_name, gender],
    );
    const newUserId = userRes.rows[0].id;

    // 4. Insert Student (Tanpa data lahir)
    await client.query(
      `INSERT INTO u_students (user_id, nis, nisn, homebase_id, current_class_id, current_periode_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [newUserId, nis, nisn, homebaseId, class_id, activePeriodeId],
    );

    // 5. Insert Class Enrollment (PENTING: Agar muncul di periode aktif)
    if (class_id) {
      await client.query(
        `INSERT INTO u_class_enrollments (student_id, class_id, periode_id, homebase_id)
           VALUES ($1, $2, $3, $4)`,
        [newUserId, class_id, activePeriodeId, homebaseId],
      );
    }

    res.status(201).json({ message: "Siswa berhasil ditambahkan ke kelas" });
  }),
);

// ============================================================================
// 3. UPDATE STUDENT (Updated: Remove Birth, Update Class Enrollment)
// ============================================================================
router.put(
  "/update-student/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params; // user_id
    const { full_name, nis, nisn, gender, is_active, class_id } = req.body;
    const homebaseId = req.user.homebase_id;

    // 1. Ambil Periode Aktif untuk update enrollment
    const activePeriodeId = await getActivePeriode(client, homebaseId);

    // 2. Update u_users
    await client.query(
      `UPDATE u_users 
       SET full_name = $1, gender = $2, is_active = $3
       WHERE id = $4`,
      [full_name, gender, is_active, id],
    );

    // 3. Update u_students (Tanpa data lahir)
    await client.query(
      `UPDATE u_students 
       SET nis = $1, nisn = $2, current_class_id = $3, current_periode_id = $4
       WHERE user_id = $5`,
      [nis, nisn, class_id, activePeriodeId, id],
    );

    // 4. Update / Upsert Class Enrollment
    // Logika: Cek apakah siswa sudah punya kelas di periode ini?
    // Jika ya -> Update kelasnya
    // Jika tidak -> Insert baru
    if (class_id) {
      const checkEnroll = await client.query(
        `SELECT id FROM u_class_enrollments 
             WHERE student_id = $1 AND periode_id = $2`,
        [id, activePeriodeId],
      );

      if (checkEnroll.rows.length > 0) {
        // Update
        await client.query(
          `UPDATE u_class_enrollments 
                 SET class_id = $1 
                 WHERE student_id = $2 AND periode_id = $3`,
          [class_id, id, activePeriodeId],
        );
      } else {
        // Insert
        await client.query(
          `INSERT INTO u_class_enrollments (student_id, class_id, periode_id, homebase_id)
                 VALUES ($1, $2, $3, $4)`,
          [id, class_id, activePeriodeId, homebaseId],
        );
      }
    }

    res.json({ message: "Data siswa dan kelas berhasil diperbarui" });
  }),
);

// ============================================================================
// 4. DELETE STUDENT (Sama)
// ============================================================================
router.delete(
  "/delete-student/:id",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { id } = req.params;
    await pool.query(`DELETE FROM u_users WHERE id = $1`, [id]);
    res.json({
      message: "Siswa dan seluruh riwayat kelasnya berhasil dihapus.",
    });
  }),
);

export default router;
