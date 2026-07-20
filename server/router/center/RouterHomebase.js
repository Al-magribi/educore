import { Router } from "express";
import bcrypt from "bcrypt";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();
const SALT_ROUNDS = 10;

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

    const check = await client.query(
      `SELECT id FROM a_homebase WHERE id = $1`,
      [id],
    );
    if (check.rows.length === 0) {
      res.status(404);
      throw new Error("Data tidak ditemukan atau sudah dihapus");
    }

    // Finance: hapus dulu data yang FK-nya NO ACTION (invoice/payment)
    // payment_allocation ikut cascade dari payment
    await client.query(`DELETE FROM finance.payment WHERE homebase_id = $1`, [
      id,
    ]);
    // invoice_item ikut cascade dari invoice; hapus invoice sebelum fee_component cascade
    await client.query(`DELETE FROM finance.invoice WHERE homebase_id = $1`, [
      id,
    ]);

    // LMS: hapus anak dulu, lalu tabel ber-homebase_id (NO ACTION)
    await client.query(
      `DELETE FROM lms.l_schedule_entry_slot
       WHERE schedule_entry_id IN (
         SELECT id FROM lms.l_schedule_entry WHERE homebase_id = $1
       )`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_teacher_session_log
       WHERE duty_assignment_id IN (
         SELECT id FROM lms.l_duty_assignment WHERE homebase_id = $1
       )
       OR schedule_entry_id IN (
         SELECT id FROM lms.l_schedule_entry WHERE homebase_id = $1
       )`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_schedule_activity_target
       WHERE teaching_load_id IN (
         SELECT id FROM lms.l_teaching_load WHERE homebase_id = $1
       )`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_schedule_day_template
       WHERE config_id IN (
         SELECT id FROM lms.l_schedule_config WHERE homebase_id = $1
       )`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_point_entry WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_schedule_activity WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_schedule_entry WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_duty_assignment WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_daily_absence_report WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_schedule_config WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_teaching_load WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_teaching_load_grade_rule WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_point_rule WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `DELETE FROM lms.l_point_config WHERE homebase_id = $1`,
      [id],
    );
    await client.query(`DELETE FROM lms.l_task WHERE homebase_id = $1`, [id]);
    await client.query(
      `DELETE FROM lms.l_teacher_journal WHERE homebase_id = $1`,
      [id],
    );

    // Public: homebase_id nullable → lepaskan referensi soft
    await client.query(
      `UPDATE u_admin SET homebase_id = NULL WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `UPDATE u_class_enrollments SET homebase_id = NULL WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `UPDATE a_class SET homebase_id = NULL WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `UPDATE a_grade SET homebase_id = NULL WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `UPDATE a_major SET homebase_id = NULL WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `UPDATE a_periode SET homebase_id = NULL WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `UPDATE a_subject SET homebase_id = NULL WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `UPDATE a_subject_branch SET homebase_id = NULL WHERE homebase_id = $1`,
      [id],
    );
    await client.query(
      `UPDATE a_subject_category SET homebase_id = NULL WHERE homebase_id = $1`,
      [id],
    );

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
    const [homebaseInfo, teachers, students, classes, subjects, classComp] =
      await Promise.all([
        db.query(`SELECT id, name, description, level FROM a_homebase WHERE id = $1`, [
          id,
        ]),
        db.query(teacherQuery, [id]),
        db.query(studentQuery, [id, activePeriodeId]),
        db.query(classCountQuery, [id]),
        db.query(subjectCountQuery, [id]),
        db.query(classCompositionQuery, [id, activePeriodeId]),
      ]);

    if (homebaseInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Homebase tidak ditemukan",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        homebase: homebaseInfo.rows[0],
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

// ==========================================
// 6. GET TEACHERS BY HOMEBASE
// ==========================================
router.get(
  "/homebase-teachers/:id",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    const { id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;

    const whereClause = `
      u.role = 'teacher'
      AND t.homebase_id = $1
      AND (
        u.full_name ILIKE $2
        OR COALESCE(t.nip, '') ILIKE $2
        OR COALESCE(t.phone, '') ILIKE $2
        OR COALESCE(t.email, '') ILIKE $2
        OR COALESCE(u.username, '') ILIKE $2
        OR COALESCE(rc.card_uid, '') ILIKE $2
      )
    `;

    const fromClause = `
      FROM u_users u
      JOIN u_teachers t ON u.id = t.user_id
      LEFT JOIN LATERAL (
        SELECT card_uid
        FROM attendance.rfid_card
        WHERE user_id = u.id AND is_active = true
        ORDER BY is_primary DESC, id DESC
        LIMIT 1
      ) rc ON true
    `;

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `
        SELECT
          u.id,
          u.username,
          u.full_name,
          u.gender,
          u.is_active,
          u.img_url,
          t.nip,
          rc.card_uid AS rfid_no,
          t.phone,
          t.email,
          t.is_homeroom,
          t.homebase_id,
          (
            SELECT json_build_object('id', c.id, 'name', c.name)
            FROM a_class c
            WHERE c.homeroom_teacher_id = u.id
            LIMIT 1
          ) AS homeroom_class,
          COALESCE((
            SELECT json_agg(json_build_object(
              'subject_id', ats.subject_id,
              'subject_name', s.name,
              'class_id', ats.class_id,
              'class_name', COALESCE(ac.name, 'Umum')
            ))
            FROM at_subject ats
            JOIN a_subject s ON ats.subject_id = s.id
            LEFT JOIN a_class ac ON ats.class_id = ac.id
            WHERE ats.teacher_id = u.id
          ), '[]') AS allocations
        ${fromClause}
        WHERE ${whereClause}
        ORDER BY u.full_name ASC
        LIMIT $3 OFFSET $4
        `,
        [id, `%${search}%`, limit, offset],
      ),
      db.query(
        `
        SELECT COUNT(*)
        ${fromClause}
        WHERE ${whereClause}
        `,
        [id, `%${search}%`],
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.status(200).json({
      success: true,
      data: dataResult.rows,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  }),
);

// ==========================================
// 6b. CREATE TEACHER FOR HOMEBASE
// ==========================================
router.post(
  "/homebase-teachers/:id",
  authorize("pusat"),
  withTransaction(async (req, res, client) => {
    const homebaseId = Number(req.params.id);
    const {
      username,
      password,
      full_name,
      nip,
      rfid_no,
      phone,
      email,
      homeroom_class_id,
      allocations,
    } = req.body;

    if (!username || !full_name) {
      return res.status(400).json({ message: "Username dan nama lengkap wajib diisi" });
    }

    const homebaseCheck = await client.query(
      `SELECT id FROM a_homebase WHERE id = $1`,
      [homebaseId],
    );
    if (homebaseCheck.rowCount === 0) {
      return res.status(404).json({ message: "Homebase tidak ditemukan" });
    }

    const usernameTaken = await client.query(
      `SELECT id FROM u_users WHERE username = $1 LIMIT 1`,
      [username],
    );
    if (usernameTaken.rowCount > 0) {
      return res.status(400).json({ message: "Username sudah digunakan" });
    }

    const salt = await bcrypt.genSalt(SALT_ROUNDS);
    const hashPassword = await bcrypt.hash(password || "123456", salt);
    const userRes = await client.query(
      `INSERT INTO u_users (username, password, full_name, role)
       VALUES ($1, $2, $3, 'teacher') RETURNING id`,
      [username, hashPassword, full_name],
    );
    const userId = userRes.rows[0].id;
    const isHomeroom = Boolean(homeroom_class_id);

    await client.query(
      `INSERT INTO u_teachers (user_id, nip, phone, email, is_homeroom, homebase_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, nip || null, phone || null, email || null, isHomeroom, homebaseId],
    );

    if (rfid_no && `${rfid_no}`.trim() !== "") {
      const normalizedRfid = `${rfid_no}`.trim();
      const existingCard = await client.query(
        `SELECT user_id FROM attendance.rfid_card WHERE card_uid = $1 LIMIT 1`,
        [normalizedRfid],
      );
      if (existingCard.rowCount > 0) {
        return res.status(400).json({ message: "No RFID sudah dipakai user lain." });
      }
      await client.query(
        `INSERT INTO attendance.rfid_card (user_id, card_uid, card_type, is_primary, is_active)
         VALUES ($1, $2, 'rfid', true, true)`,
        [userId, normalizedRfid],
      );
    }

    if (homeroom_class_id) {
      const classCheck = await client.query(
        `SELECT id FROM a_class WHERE id = $1 AND homebase_id = $2`,
        [homeroom_class_id, homebaseId],
      );
      if (classCheck.rowCount === 0) {
        return res.status(400).json({ message: "Kelas wali tidak valid untuk homebase ini" });
      }

      await client.query(
        `UPDATE u_teachers SET is_homeroom = false
         WHERE user_id = (SELECT homeroom_teacher_id FROM a_class WHERE id = $1)`,
        [homeroom_class_id],
      );
      await client.query(
        `UPDATE a_class SET homeroom_teacher_id = $1 WHERE id = $2`,
        [userId, homeroom_class_id],
      );
    }

    if (allocations && Array.isArray(allocations) && allocations.length > 0) {
      for (const item of allocations) {
        if (!item?.subject_id || !item?.class_id) continue;
        await client.query(
          `INSERT INTO at_subject (teacher_id, subject_id, class_id) VALUES ($1, $2, $3)`,
          [userId, item.subject_id, item.class_id],
        );
      }
    }

    res.status(201).json({ success: true, message: "Data guru berhasil dibuat" });
  }),
);

// ==========================================
// 6c. UPDATE TEACHER FOR HOMEBASE
// ==========================================
router.put(
  "/homebase-teachers/:homebaseId/:teacherId",
  authorize("pusat"),
  withTransaction(async (req, res, client) => {
    const homebaseId = Number(req.params.homebaseId);
    const teacherId = Number(req.params.teacherId);
    const {
      username,
      full_name,
      password,
      nip,
      rfid_no,
      phone,
      email,
      is_active,
      homeroom_class_id,
      allocations,
    } = req.body;

    const teacherCheck = await client.query(
      `SELECT t.user_id
       FROM u_teachers t
       JOIN u_users u ON u.id = t.user_id
       WHERE t.user_id = $1 AND t.homebase_id = $2 AND u.role = 'teacher'`,
      [teacherId, homebaseId],
    );
    if (teacherCheck.rowCount === 0) {
      return res.status(404).json({ message: "Guru tidak ditemukan pada homebase ini" });
    }

    if (username) {
      const usernameTaken = await client.query(
        `SELECT id FROM u_users WHERE username = $1 AND id <> $2 LIMIT 1`,
        [username, teacherId],
      );
      if (usernameTaken.rowCount > 0) {
        return res.status(400).json({ message: "Username sudah digunakan" });
      }
    }

    let userQuery = `UPDATE u_users SET full_name = $1`;
    const userParams = [full_name];
    let paramIdx = 2;

    if (username) {
      userQuery += `, username = $${paramIdx}`;
      userParams.push(username);
      paramIdx += 1;
    }

    if (typeof is_active === "boolean") {
      userQuery += `, is_active = $${paramIdx}`;
      userParams.push(is_active);
      paramIdx += 1;
    }

    if (password && `${password}`.trim() !== "") {
      const hashPassword = await bcrypt.hash(password, SALT_ROUNDS);
      userQuery += `, password = $${paramIdx}`;
      userParams.push(hashPassword);
      paramIdx += 1;
    }

    userQuery += ` WHERE id = $${paramIdx}`;
    userParams.push(teacherId);
    await client.query(userQuery, userParams);

    await client.query(
      `UPDATE u_teachers
       SET nip = $1, phone = $2, email = $3, is_homeroom = false
       WHERE user_id = $4`,
      [nip || null, phone || null, email || null, teacherId],
    );

    if (rfid_no !== undefined) {
      const normalizedRfid = `${rfid_no || ""}`.trim();
      if (!normalizedRfid) {
        await client.query(
          `UPDATE attendance.rfid_card SET is_active = false WHERE user_id = $1`,
          [teacherId],
        );
      } else {
        const existingCard = await client.query(
          `SELECT id, user_id FROM attendance.rfid_card WHERE card_uid = $1 LIMIT 1`,
          [normalizedRfid],
        );

        if (
          existingCard.rowCount > 0 &&
          Number(existingCard.rows[0].user_id) !== Number(teacherId)
        ) {
          return res.status(400).json({ message: "No RFID sudah dipakai user lain." });
        }

        if (existingCard.rowCount > 0) {
          await client.query(
            `UPDATE attendance.rfid_card
             SET user_id = $1, is_active = true, is_primary = true
             WHERE id = $2`,
            [teacherId, existingCard.rows[0].id],
          );
        } else {
          await client.query(
            `INSERT INTO attendance.rfid_card (user_id, card_uid, card_type, is_primary, is_active)
             VALUES ($1, $2, 'rfid', true, true)`,
            [teacherId, normalizedRfid],
          );
        }
      }
    }

    await client.query(
      `UPDATE a_class SET homeroom_teacher_id = NULL WHERE homeroom_teacher_id = $1`,
      [teacherId],
    );

    if (homeroom_class_id) {
      const classCheck = await client.query(
        `SELECT id FROM a_class WHERE id = $1 AND homebase_id = $2`,
        [homeroom_class_id, homebaseId],
      );
      if (classCheck.rowCount === 0) {
        return res.status(400).json({ message: "Kelas wali tidak valid untuk homebase ini" });
      }

      await client.query(
        `UPDATE u_teachers SET is_homeroom = false
         WHERE user_id = (SELECT homeroom_teacher_id FROM a_class WHERE id = $1)`,
        [homeroom_class_id],
      );
      await client.query(
        `UPDATE a_class SET homeroom_teacher_id = $1 WHERE id = $2`,
        [teacherId, homeroom_class_id],
      );
      await client.query(
        `UPDATE u_teachers SET is_homeroom = true WHERE user_id = $1`,
        [teacherId],
      );
    }

    await client.query(`DELETE FROM at_subject WHERE teacher_id = $1`, [teacherId]);

    if (allocations && Array.isArray(allocations)) {
      for (const item of allocations) {
        if (!item?.subject_id || !item?.class_id) continue;
        await client.query(
          `INSERT INTO at_subject (teacher_id, subject_id, class_id) VALUES ($1, $2, $3)`,
          [teacherId, item.subject_id, item.class_id],
        );
      }
    }

    res.status(200).json({ success: true, message: "Data guru berhasil diperbarui" });
  }),
);

// ==========================================
// 6d. DELETE TEACHER FOR HOMEBASE
// ==========================================
router.delete(
  "/homebase-teachers/:homebaseId/:teacherId",
  authorize("pusat"),
  withTransaction(async (req, res, client) => {
    const homebaseId = Number(req.params.homebaseId);
    const teacherId = Number(req.params.teacherId);

    const teacherCheck = await client.query(
      `SELECT t.user_id
       FROM u_teachers t
       JOIN u_users u ON u.id = t.user_id
       WHERE t.user_id = $1 AND t.homebase_id = $2 AND u.role = 'teacher'`,
      [teacherId, homebaseId],
    );
    if (teacherCheck.rowCount === 0) {
      return res.status(404).json({ message: "Guru tidak ditemukan pada homebase ini" });
    }

    await client.query(
      `UPDATE a_class SET homeroom_teacher_id = NULL WHERE homeroom_teacher_id = $1`,
      [teacherId],
    );
    await client.query(`DELETE FROM at_subject WHERE teacher_id = $1`, [teacherId]);
    await client.query(`DELETE FROM u_users WHERE id = $1`, [teacherId]);
    await client.query(`DELETE FROM u_teachers WHERE user_id = $1`, [teacherId]);

    res.status(200).json({ success: true, message: "Guru berhasil dihapus" });
  }),
);

// ==========================================
// 6e. OPTIONS: CLASSES & SUBJECTS FOR HOMEBASE
// ==========================================
router.get(
  "/homebase-options/:id",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    const { id } = req.params;

    const [classes, subjects] = await Promise.all([
      db.query(
        `SELECT id, name, is_active
         FROM a_class
         WHERE homebase_id = $1
         ORDER BY name ASC`,
        [id],
      ),
      db.query(
        `SELECT id, name
         FROM a_subject
         WHERE homebase_id = $1
         ORDER BY name ASC`,
        [id],
      ),
    ]);

    res.status(200).json({
      success: true,
      classes: classes.rows,
      subjects: subjects.rows,
    });
  }),
);

// ==========================================
// 7. GET CLASSES BY HOMEBASE
// ==========================================
router.get(
  "/homebase-classes/:id",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    const { id } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;
    let { periode_id } = req.query;

    const periodsResult = await db.query(
      `
      SELECT id, name, is_active
      FROM a_periode
      WHERE homebase_id = $1
      ORDER BY name DESC
      `,
      [id],
    );

    if (!periode_id && periodsResult.rows.length > 0) {
      const activeP = periodsResult.rows.find((p) => p.is_active);
      periode_id = activeP ? activeP.id : periodsResult.rows[0].id;
    }

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `
        SELECT
          c.id,
          c.name,
          c.is_active,
          g.name AS grade_name,
          m.name AS major_name,
          u.full_name AS homeroom_teacher,
          (
            SELECT COUNT(*)
            FROM u_class_enrollments e
            JOIN u_users su ON e.student_id = su.id
            WHERE e.class_id = c.id
              AND e.periode_id = $4
              AND su.is_active = true
          ) AS students_count
        FROM a_class c
        LEFT JOIN a_grade g ON c.grade_id = g.id
        LEFT JOIN a_major m ON c.major_id = m.id
        LEFT JOIN u_users u ON c.homeroom_teacher_id = u.id
        WHERE c.homebase_id = $1
          AND c.name ILIKE $2
        ORDER BY
          c.is_active DESC,
          COALESCE(NULLIF(SUBSTRING(c.name FROM '^\\d+'), '')::int, 2147483647),
          LOWER(c.name)
        LIMIT $3 OFFSET $5
        `,
        [id, `%${search}%`, limit, periode_id || null, offset],
      ),
      db.query(
        `
        SELECT COUNT(*)
        FROM a_class c
        WHERE c.homebase_id = $1
          AND c.name ILIKE $2
        `,
        [id, `%${search}%`],
      ),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.status(200).json({
      success: true,
      data: dataResult.rows,
      periods: periodsResult.rows,
      selected_periode_id: periode_id || null,
      total,
      page,
      limit,
      hasMore: page * limit < total,
    });
  }),
);

// ==========================================
// 8. GET STUDENTS BY CLASS (CENTER FILTER)
// ==========================================
router.get(
  "/homebase-class-students",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    const {
      homebase_id,
      class_id,
      periode_id,
      name = "",
      nis = "",
      nisn = "",
      page = 1,
      limit = 10,
    } = req.query;

    if (!homebase_id || !class_id) {
      return res.status(400).json({
        success: false,
        message: "homebase_id dan class_id wajib diisi",
      });
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;

    const periodsResult = await db.query(
      `
      SELECT id, name, is_active
      FROM a_periode
      WHERE homebase_id = $1
      ORDER BY name DESC
      `,
      [homebase_id],
    );

    let selectedPeriodeId = periode_id;
    if (!selectedPeriodeId && periodsResult.rows.length > 0) {
      const activeP = periodsResult.rows.find((p) => p.is_active);
      selectedPeriodeId = activeP ? activeP.id : periodsResult.rows[0].id;
    }

    const classInfo = await db.query(
      `
      SELECT c.id, c.name, g.name AS grade_name, m.name AS major_name
      FROM a_class c
      LEFT JOIN a_grade g ON c.grade_id = g.id
      LEFT JOIN a_major m ON c.major_id = m.id
      WHERE c.id = $1 AND c.homebase_id = $2
      `,
      [class_id, homebase_id],
    );

    if (classInfo.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Kelas tidak ditemukan",
      });
    }

    const baseWhere = `
      FROM u_class_enrollments e
      JOIN u_users u ON e.student_id = u.id
      JOIN u_students s ON e.student_id = s.user_id
      WHERE e.class_id = $1
        AND e.homebase_id = $2
        AND e.periode_id = $3
        AND u.full_name ILIKE $4
        AND COALESCE(s.nis, '') ILIKE $5
        AND COALESCE(s.nisn, '') ILIKE $6
    `;

    const params = [
      class_id,
      homebase_id,
      selectedPeriodeId || null,
      `%${name}%`,
      `%${nis}%`,
      `%${nisn}%`,
    ];

    const [dataResult, countResult] = await Promise.all([
      db.query(
        `
        SELECT
          u.id AS user_id,
          u.full_name AS student_name,
          u.gender,
          u.is_active,
          s.nis,
          s.nisn
        ${baseWhere}
        ORDER BY u.full_name ASC
        LIMIT $7 OFFSET $8
        `,
        [...params, limitNum, offset],
      ),
      db.query(`SELECT COUNT(*) ${baseWhere}`, params),
    ]);

    const total = parseInt(countResult.rows[0].count, 10);

    res.status(200).json({
      success: true,
      class_info: classInfo.rows[0],
      periods: periodsResult.rows,
      selected_periode_id: selectedPeriodeId || null,
      data: dataResult.rows,
      total,
      page: pageNum,
      limit: limitNum,
      hasMore: pageNum * limitNum < total,
    });
  }),
);

export default router;
