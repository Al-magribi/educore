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
      `SELECT user_id, full_name, homebase_id FROM u_students WHERE nis = $1`,
      [nis],
    );

    if (checkStudent.rowCount === 0) {
      return res.status(404).json({ message: "NIS Siswa tidak ditemukan." });
    }

    const studentId = checkStudent.rows[0].user_id;
    const studentHomebaseId = checkStudent.rows[0].homebase_id;

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

    await client.query(`
      CREATE TABLE IF NOT EXISTS public.u_parent_students (
        id SERIAL PRIMARY KEY,
        parent_user_id INT NOT NULL REFERENCES public.u_users(id) ON DELETE CASCADE,
        homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
        student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
        relationship VARCHAR(50),
        is_primary BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_parent_student_owner'
            AND conrelid = 'public.u_parent_students'::regclass
        ) THEN
          ALTER TABLE public.u_parent_students
          DROP CONSTRAINT uq_parent_student_owner;
        END IF;
      END $$;
    `);

    await client.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'uq_parent_student'
            AND conrelid = 'public.u_parent_students'::regclass
        ) THEN
          ALTER TABLE public.u_parent_students
          DROP CONSTRAINT uq_parent_student;
        END IF;
      END $$;
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uq_u_parent_students_parent_student
      ON public.u_parent_students(parent_user_id, student_id)
    `);

    await client.query(`
      ALTER TABLE public.u_parent_students
      ADD COLUMN IF NOT EXISTS homebase_id INT REFERENCES public.a_homebase(id) ON DELETE CASCADE
    `);

    await client.query(`
      ALTER TABLE public.u_parent_students
      ADD COLUMN IF NOT EXISTS relationship VARCHAR(50)
    `);

    await client.query(`
      ALTER TABLE public.u_parent_students
      ADD COLUMN IF NOT EXISTS is_primary BOOLEAN NOT NULL DEFAULT false
    `);

    await client.query(`
      ALTER TABLE public.u_parent_students
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    await client.query(`
      ALTER TABLE public.u_parent_students
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

    // 4. Buat Profil di u_parents
    await client.query(
      `INSERT INTO u_parents (user_id, student_id, email, phone) 
     VALUES ($1, $2, $3, $4)`,
      [newUserId, studentId, email, phone || null],
    );

    await client.query(
      `
        UPDATE public.u_parent_students
        SET
          homebase_id = $2,
          relationship = COALESCE(relationship, 'wali'),
          is_primary = is_primary OR true,
          updated_at = CURRENT_TIMESTAMP
        WHERE parent_user_id = $1
          AND student_id = $3
      `,
      [newUserId, studentHomebaseId, studentId],
    );

    await client.query(
      `
        INSERT INTO public.u_parent_students (
          parent_user_id,
          homebase_id,
          student_id,
          relationship,
          is_primary
        )
        SELECT $1, $2, $3, 'wali', true
        WHERE NOT EXISTS (
          SELECT 1
          FROM public.u_parent_students
          WHERE parent_user_id = $1
            AND student_id = $3
        )
      `,
      [newUserId, studentHomebaseId, studentId],
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
    const username = String(req.body?.username || "").trim();
    const password = String(req.body?.password || "").trim();

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
          EXISTS (
            SELECT 1
            FROM lms.l_duty_assignment d
            WHERE d.duty_teacher_id = t.user_id
              AND d.homebase_id = t.homebase_id
              AND d.date = CURRENT_DATE
              AND d.status <> 'cancelled'
          ) AS has_duty_today,
          (
            SELECT COUNT(*)
            FROM lms.l_duty_assignment d
            WHERE d.duty_teacher_id = t.user_id
              AND d.homebase_id = t.homebase_id
              AND d.date = CURRENT_DATE
              AND d.status <> 'cancelled'
          )::int AS duty_today_count,
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
        WITH linked_children AS (
          SELECT
            ups.parent_user_id,
            ups.student_id,
            ups.is_primary
          FROM public.u_parent_students ups
          WHERE ups.parent_user_id = $1

          UNION

          SELECT
            p.user_id AS parent_user_id,
            p.student_id,
            true AS is_primary
          FROM public.u_parents p
          WHERE p.user_id = $1
            AND p.student_id IS NOT NULL
        )
        SELECT
          p.phone,
          p.email,
          primary_child.student_name,
          primary_child.student_id,
          primary_child.student_nis,
          primary_child.class_name,
          primary_child.homebase_name,
          COALESCE(
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'student_id', child.student_id,
                'student_name', child.student_name,
                'student_nis', child.student_nis,
                'class_name', child.class_name,
                'homebase_name', child.homebase_name,
                'is_primary', child.is_primary
              )
            ) FILTER (WHERE child.student_id IS NOT NULL),
            '[]'::json
          ) AS children
        FROM u_users parent_user
        LEFT JOIN u_parents p ON p.user_id = parent_user.id
        LEFT JOIN LATERAL (
          SELECT
            s.user_id AS student_id,
            su.full_name AS student_name,
            s.nis AS student_nis,
            c.name AS class_name,
            h.name AS homebase_name,
            lc.is_primary
          FROM linked_children lc
          LEFT JOIN u_students s ON lc.student_id = s.user_id
          LEFT JOIN u_users su ON s.user_id = su.id
          LEFT JOIN a_class c ON s.current_class_id = c.id
          LEFT JOIN a_homebase h ON s.homebase_id = h.id
        ) AS child ON true
        LEFT JOIN LATERAL (
          SELECT
            child2.student_name,
            child2.student_id,
            child2.student_nis,
            child2.class_name,
            child2.homebase_name
          FROM (
            SELECT
              s.user_id AS student_id,
              su.full_name AS student_name,
              s.nis AS student_nis,
              c.name AS class_name,
              h.name AS homebase_name,
              lc.is_primary
            FROM linked_children lc
            LEFT JOIN u_students s ON lc.student_id = s.user_id
            LEFT JOIN u_users su ON s.user_id = su.id
            LEFT JOIN a_class c ON s.current_class_id = c.id
            LEFT JOIN a_homebase h ON s.homebase_id = h.id
            ORDER BY lc.is_primary DESC, s.user_id ASC
            LIMIT 1
          ) AS child2
        ) AS primary_child ON true
        WHERE parent_user.id = $1
        GROUP BY
          p.phone,
          p.email,
          primary_child.student_name,
          primary_child.student_id,
          primary_child.student_nis,
          primary_child.class_name,
          primary_child.homebase_name
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
          EXISTS (
            SELECT 1
            FROM lms.l_duty_assignment d
            WHERE d.duty_teacher_id = u.id
              AND d.homebase_id = t.homebase_id
              AND d.date = CURRENT_DATE
              AND d.status <> 'cancelled'
          ) AS has_duty_today,
          (
            SELECT COUNT(*)
            FROM lms.l_duty_assignment d
            WHERE d.duty_teacher_id = u.id
              AND d.homebase_id = t.homebase_id
              AND d.date = CURRENT_DATE
              AND d.status <> 'cancelled'
          )::int AS duty_today_count,
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
        WITH linked_children AS (
          SELECT
            ups.parent_user_id,
            ups.student_id,
            ups.is_primary
          FROM public.u_parent_students ups
          WHERE ups.parent_user_id = $1

          UNION

          SELECT
            p.user_id AS parent_user_id,
            p.student_id,
            true AS is_primary
          FROM public.u_parents p
          WHERE p.user_id = $1
            AND p.student_id IS NOT NULL
        ),
        parent_children AS (
          SELECT
            s.user_id AS student_id,
            su.full_name AS student_name,
            s.nis AS student_nis,
            c.name AS class_name,
            h.name AS homebase_name,
            lc.is_primary
          FROM linked_children lc
          LEFT JOIN u_students s ON lc.student_id = s.user_id
          LEFT JOIN u_users su ON s.user_id = su.id
          LEFT JOIN a_class c ON s.current_class_id = c.id
          LEFT JOIN a_homebase h ON s.homebase_id = h.id
        ),
        primary_child AS (
          SELECT *
          FROM parent_children
          ORDER BY is_primary DESC, student_id ASC
          LIMIT 1
        )
        SELECT
          u.id, u.username, u.full_name, u.role, u.img_url, u.gender,
          p.phone, p.email,
          pc.student_name,
          pc.student_id,
          pc.student_nis,
          pc.class_name,
          pc.homebase_name,
          COALESCE(
            JSON_AGG(
              DISTINCT JSONB_BUILD_OBJECT(
                'student_id', child.student_id,
                'student_name', child.student_name,
                'student_nis', child.student_nis,
                'class_name', child.class_name,
                'homebase_name', child.homebase_name,
                'is_primary', child.is_primary
              )
            ) FILTER (WHERE child.student_id IS NOT NULL),
            '[]'::json
          ) AS children
        FROM u_users u
        LEFT JOIN u_parents p ON u.id = p.user_id
        LEFT JOIN primary_child pc ON true
        LEFT JOIN parent_children child ON true
        WHERE u.id = $1
        GROUP BY
          u.id, u.username, u.full_name, u.role, u.img_url, u.gender,
          p.phone, p.email,
          pc.student_name,
          pc.student_id,
          pc.student_nis,
          pc.class_name,
          pc.homebase_name
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
