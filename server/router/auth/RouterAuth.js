import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { withTransaction, withQuery } from "../../utils/wrapper.js"; // Sesuaikan path wrapper
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// ============================================================================
// 1. SIGNUP PARENT (Orang Tua mendaftar berdasarkan NIS Siswa)
// Menggunakan withTransaction karena ada multiple insert (u_users & u_parents)
// ============================================================================
router.post(
  "/signup",
  withTransaction(async (req, res, client) => {
    const { nis, name, email, password, phone } = req.body;

    // 1. Cari Siswa berdasarkan NIS
    const checkStudent = await client.query(
      `SELECT user_id, full_name FROM u_students WHERE nis = $1`,
      [nis],
    );

    if (checkStudent.rowCount === 0) {
      return res.status(404).json({ message: "NIS Siswa tidak ditemukan." });
    }

    const studentId = checkStudent.rows[0].user_id;

    // 2. Cek apakah email sudah terdaftar
    const checkExisting = await client.query(
      `SELECT id FROM u_users WHERE username = $1`,
      [email],
    );

    if (checkExisting.rowCount > 0) {
      return res.status(400).json({ message: "Email sudah terdaftar." });
    }

    // 3. Buat Akun di u_users
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await client.query(
      `INSERT INTO u_users (username, password, full_name, role, is_active) 
     VALUES ($1, $2, $3, 'parent', true) RETURNING id`,
      [email, hashedPassword, name],
    );

    const newUserId = newUser.rows[0].id;

    // 4. Buat Profil di u_parents
    await client.query(
      `INSERT INTO u_parents (user_id, student_id, email, phone) 
     VALUES ($1, $2, $3, $4)`,
      [newUserId, studentId, email, phone || null],
    );

    // Commit ditangani otomatis oleh wrapper jika tidak ada error
    return res
      .status(201)
      .json({ message: "Pendaftaran berhasil. Silakan login." });
  }),
);

// ============================================================================
// 2. SIGNIN (Login Multi-Role)
// ============================================================================
router.post(
  "/signin",
  withTransaction(async (req, res, client) => {
    const { username, password } = req.body;

    // 1. Validasi Input
    if (!username || !password) {
      return res
        .status(400)
        .json({ message: "Username dan password wajib diisi." });
    }

    // 2. Ambil Data User Utama
    const userQuery = `
      SELECT id, username, password, role, full_name, img_url, is_active, last_login, gender 
      FROM u_users 
      WHERE username = $1
    `;
    const userResult = await client.query(userQuery, [username]);

    if (userResult.rowCount === 0) {
      return res.status(401).json({ message: "Username tidak ditemukan." });
    }

    const user = userResult.rows[0];

    // 3. Cek Status Aktif & Password
    if (!user.is_active) {
      return res
        .status(403)
        .json({ message: "Akun dinonaktifkan. Hubungi admin." });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: "Password salah." });
    }

    // 4. Ambil Data Spesifik Berdasarkan Role
    let roleData = {};

    // --- SISWA ---
    if (user.role === "student") {
      const studentRes = await client.query(
        `
        SELECT 
          s.nis, s.nisn,
          hb.name AS homebase_name,
          c.id AS class_id, 
          c.name AS class_name,
          g.name AS grade_name,
          m.name AS major_name,
          p.name AS periode_name,
          p.is_active AS periode_active
        FROM u_students s
        LEFT JOIN a_homebase hb ON s.homebase_id = hb.id
        LEFT JOIN a_class c ON s.current_class_id = c.id
        LEFT JOIN a_grade g ON c.grade_id = g.id
        LEFT JOIN a_major m ON c.major_id = m.id
        LEFT JOIN a_periode p ON s.current_periode_id = p.id
        WHERE s.user_id = $1
      `,
        [user.id],
      );
      if (studentRes.rowCount > 0) roleData = studentRes.rows[0];

      // --- GURU ---
    } else if (user.role === "teacher") {
      const teacherRes = await client.query(
        `
        SELECT 
          t.nip, t.phone, t.email, t.is_homeroom,
          hb.name AS homebase_name,
          (
            SELECT COALESCE(json_agg(
              json_build_object(
                'subject_id', sub.id,
                'subject_name', sub.name,
                'class_name', cls.name,
                'cover', sub.cover_image
              )
            ), '[]')
            FROM at_subject ats
            JOIN a_subject sub ON ats.subject_id = sub.id
            JOIN a_class cls ON ats.class_id = cls.id
            WHERE ats.teacher_id = t.user_id
          ) as subjects
        FROM u_teachers t
        LEFT JOIN a_homebase hb ON t.homebase_id = hb.id
        WHERE t.user_id = $1
      `,
        [user.id],
      );
      if (teacherRes.rowCount > 0) roleData = teacherRes.rows[0];

      // --- ORANG TUA ---
    } else if (user.role === "parent") {
      const parentRes = await client.query(
        `
        SELECT 
          p.phone, p.email,
          su.full_name AS student_name,
          s.user_id AS student_id,
          s.nis AS student_nis,
          c.name AS class_name,
          h.name AS homebase_name
        FROM u_parents p
        LEFT JOIN u_students s ON p.student_id = s.user_id
        LEFT JOIN u_users su ON s.user_id = su.id
        LEFT JOIN a_class c ON s.current_class_id = c.id
        LEFT JOIN a_homebase h ON s.homebase_id = h.id
        WHERE p.user_id = $1
      `,
        [user.id],
      );
      if (parentRes.rowCount > 0) roleData = parentRes.rows[0];

      // --- ADMIN / CENTER (PENTING: Ambil Level) ---
    } else if (user.role === "admin") {
      const adminRes = await client.query(
        `
        SELECT 
            a.phone, 
            a.email, 
            a.homebase_id,
            a.level AS level, -- Level admin (misal: 'superadmin')
            hb.name AS homebase_name,
            hb.level AS unit_level -- Level satuan (SD/SMP/SMA) dari a_homebase
        FROM u_admin a
        LEFT JOIN a_homebase hb ON a.homebase_id = hb.id
        WHERE a.user_id = $1
      `,
        [user.id],
      );
      // Jika data admin ditemukan, masukkan ke roleData.
      // Frontend akan membaca 'level' dari sini (user.level)
      if (adminRes.rowCount > 0) roleData = adminRes.rows[0];
    }

    // 5. Generate Token
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT, {
      expiresIn: "7d",
    });

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      secure: process.env.NODE_ENV === "production",
    });

    // 6. Logging & Update Last Login
    await client.query(
      `INSERT INTO sys_logs (user_id, action, ip_address, browser) VALUES ($1, 'login', $2, $3)`,
      [user.id, req.ip, req.headers["user-agent"]],
    );

    await client.query(`UPDATE u_users SET last_login = NOW() WHERE id = $1`, [
      user.id,
    ]);

    delete user.password;

    // 7. Kirim Response
    return res.status(200).json({
      message: "Login berhasil",
      user: {
        ...user, // id, role, username...
        ...roleData, // level (jika admin), nis (jika siswa), dll
      },
    });
  }),
);

// ============================================================================
// 3. LOAD USER (Read-Only)
// ============================================================================
router.get(
  "/load-user",
  // Pastikan middleware authorize mengizinkan semua role ini
  authorize("admin", "student", "teacher", "parent", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const { id, role } = req.user;

    let query = "";

    // --- SISWA ---
    if (role === "student") {
      query = `
        SELECT 
          u.id, u.username, u.full_name, u.role, u.img_url, u.gender,
          s.nis, s.nisn,
          hb.name AS homebase_name,
          c.id AS class_id, 
          c.name AS class_name,
          g.name AS grade_name,
          m.name AS major_name,
          p.name AS periode_name, 
          p.is_active AS periode_active
        FROM u_users u
        JOIN u_students s ON u.id = s.user_id
        LEFT JOIN a_homebase hb ON s.homebase_id = hb.id
        LEFT JOIN a_class c ON s.current_class_id = c.id
        LEFT JOIN a_grade g ON c.grade_id = g.id
        LEFT JOIN a_major m ON c.major_id = m.id
        LEFT JOIN a_periode p ON s.current_periode_id = p.id
        WHERE u.id = $1
      `;

      // --- GURU ---
    } else if (role === "teacher") {
      query = `
        SELECT 
          u.id, u.username, u.full_name, u.role, u.img_url, u.gender,
          t.nip, t.phone, t.email, t.is_homeroom,
          hb.name AS homebase_name,
          (
            SELECT COALESCE(json_agg(
              json_build_object(
                'subject_id', sub.id,
                'subject_name', sub.name,
                'class_name', cls.name,
                'cover', sub.cover_image
              )
            ), '[]')
            FROM at_subject ats
            JOIN a_subject sub ON ats.subject_id = sub.id
            JOIN a_class cls ON ats.class_id = cls.id
            WHERE ats.teacher_id = u.id
          ) as subjects
        FROM u_users u
        JOIN u_teachers t ON u.id = t.user_id
        LEFT JOIN a_homebase hb ON t.homebase_id = hb.id
        WHERE u.id = $1
      `;

      // --- ORANG TUA ---
    } else if (role === "parent") {
      query = `
        SELECT 
          u.id, u.username, u.full_name, u.role, u.img_url, u.gender,
          p.phone, p.email,
          su.full_name AS student_name,
          s.user_id AS student_id,
          s.nis AS student_nis,
          c.name AS class_name,
          h.name AS homebase_name
        FROM u_users u
        JOIN u_parents p ON u.id = p.user_id
        LEFT JOIN u_students s ON p.student_id = s.user_id
        LEFT JOIN u_users su ON s.user_id = su.id
        LEFT JOIN a_class c ON s.current_class_id = c.id
        LEFT JOIN a_homebase h ON s.homebase_id = h.id
        WHERE u.id = $1
      `;

      // --- ADMIN / CENTER / TAHFIZ ---
      // Logika: Role admin digabung, nanti dibedakan dari field 'level'
    } else if (role === "admin") {
      query = `
        SELECT 
          u.id, u.username, u.full_name, u.role, u.img_url, u.gender, u.is_active,
          a.phone, a.email, 
          a.level AS level,
          hb.name AS homebase_name,
          hb.id AS homebase_id,
          hb.level AS unit_level -- Tambahkan ini agar FE tahu ini SD/SMP/SMA
        FROM u_users u
        LEFT JOIN u_admin a ON u.id = a.user_id
        LEFT JOIN a_homebase hb ON a.homebase_id = hb.id
        WHERE u.id = $1
      `;
    }

    if (!query) {
      return res
        .status(403)
        .json({ message: "Role tidak dikenali atau akses ditolak." });
    }

    const resData = await pool.query(query, [id]);
    const userData = resData.rows[0];

    if (!userData) {
      return res.status(404).json({ message: "Data user tidak ditemukan" });
    }

    return res.status(200).json(userData);
  }),
);

// ============================================================================
// 4. LOGOUT
// Menggunakan withTransaction untuk mencatat Log Logout
// ============================================================================
router.post(
  "/logout",
  withTransaction(async (req, res, client) => {
    const token = req.cookies.token;
    if (token) {
      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || process.env.JWT,
        );

        // Catat log
        await client.query(
          `INSERT INTO sys_logs (user_id, action, ip_address, browser) VALUES ($1, 'logout', $2, $3)`,
          [decoded.id, req.ip, req.headers["user-agent"]],
        );
      } catch (err) {
        // Token invalid/expired, abaikan error log, tetap clear cookie
      }
    }

    res.clearCookie("token", { httpOnly: true });
    return res.status(200).json({ message: "Berhasil keluar." });
  }),
);

// ============================================================================
// 5. UPDATE PROFILE
// Menggunakan withTransaction karena update multiple table
// ============================================================================
router.put(
  "/update-profile",
  authorize(),
  withTransaction(async (req, res, client) => {
    const { id, role } = req.user;
    const { full_name, email, phone, newPassword, oldPassword } = req.body;

    // 1. Ambil Data User Saat Ini (Gunakan client, bukan pool)
    const currentUserRes = await client.query(
      "SELECT * FROM u_users WHERE id = $1",
      [id],
    );
    if (currentUserRes.rowCount === 0) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }
    const currentUser = currentUserRes.rows[0];

    // 2. Cek & Update Password
    if (oldPassword && newPassword) {
      const match = await bcrypt.compare(oldPassword, currentUser.password);
      if (!match) {
        return res.status(401).json({ message: "Password lama salah." });
      }
      const hashed = await bcrypt.hash(newPassword, 10);
      await client.query("UPDATE u_users SET password = $1 WHERE id = $2", [
        hashed,
        id,
      ]);
    }

    // 3. Update Full Name (di u_users)
    if (full_name) {
      await client.query("UPDATE u_users SET full_name = $1 WHERE id = $2", [
        full_name,
        id,
      ]);
    }

    // 4. Update Detail Kontak (Email/Phone) di tabel spesifik role
    let detailTable = "";
    if (role === "teacher") detailTable = "u_teachers";
    else if (role === "admin") detailTable = "u_admin";
    else if (role === "parent") detailTable = "u_parents";

    if (detailTable) {
      const updates = [];
      const values = [];
      let idx = 1;

      if (email) {
        updates.push(`email = $${idx++}`);
        values.push(email);
      }
      if (phone) {
        updates.push(`phone = $${idx++}`);
        values.push(phone);
      }

      if (updates.length > 0) {
        values.push(id); // Where user_id = $last
        await client.query(
          `UPDATE ${detailTable} SET ${updates.join(
            ", ",
          )} WHERE user_id = $${idx}`,
          values,
        );
      }
    }

    return res.status(200).json({ message: "Profil berhasil diperbarui." });
  }),
);

export default router;
