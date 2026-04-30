import { Router } from "express";
import bcrypt from "bcrypt"; // Pastikan install: npm install bcrypt
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// --- GET ALL TEACHERS ---
router.get(
  "/teacher",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const page = Number.parseInt(req.query.page, 10) || 1;
    const limit = Number.parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || "";
    const offset = (page - 1) * limit;
    const homebaseId = req.user.homebase_id;

    let whereClause = `u.role = 'teacher' AND u.is_active = true AND t.homebase_id = $1`;
    const params = [homebaseId];
    let paramIndex = 2;

    if (search) {
      whereClause += ` AND (u.full_name ILIKE $${paramIndex} OR t.nip ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    const query = `
      SELECT 
        u.id, u.username, u.full_name, u.img_url, u.is_active,
        t.nip, rc.card_uid AS rfid_no, t.phone, t.email, t.is_homeroom,
        
        -- Ambil Info Wali Kelas
        (SELECT json_build_object('id', c.id, 'name', c.name) 
         FROM a_class c WHERE c.homeroom_teacher_id = u.id LIMIT 1) as homeroom_class,
         
        -- Ambil Info Mengajar (PERBAIKAN DISINI)
        COALESCE((
          SELECT json_agg(json_build_object(
            'subject_id', ats.subject_id, 
            'subject_name', s.name, 
            'class_id', ats.class_id, 
            'class_name', COALESCE(ac.name, 'Umum') -- Default ke 'Umum' jika null
          ))
          FROM at_subject ats
          JOIN a_subject s ON ats.subject_id = s.id
          LEFT JOIN a_class ac ON ats.class_id = ac.id -- Gunakan LEFT JOIN
          WHERE ats.teacher_id = u.id
        ), '[]') as allocations

      FROM u_users u
      JOIN u_teachers t ON u.id = t.user_id
      LEFT JOIN LATERAL (
        SELECT card_uid
        FROM attendance.rfid_card
        WHERE user_id = u.id AND is_active = true
        ORDER BY is_primary DESC, id DESC
        LIMIT 1
      ) rc ON true
      WHERE ${whereClause} 
      ORDER BY u.full_name ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    const queryParams = [...params, limit, offset];
    const result = await pool.query(query, queryParams);

    const countQuery = `
        SELECT COUNT(*) 
        FROM u_users u 
        JOIN u_teachers t ON u.id = t.user_id 
        WHERE ${whereClause}
    `;
    const countResult = await pool.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    res.json({
      status: "success",
      data: result.rows,
      total,
      page,
      limit,
    });
  }),
);

// --- CREATE TEACHER ---
router.post(
  "/teacher",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const {
      username,
      password,
      full_name,
      nip,
      rfid_no,
      phone,
      email,
      homeroom_class_id, // ID Kelas jika jadi wali kelas (nullable)
      allocations, // Array: [{ subject_id, class_id }, ...]
    } = req.body;

    const homebaseId = req.user.homebase_id;

    // 1. Insert ke u_users
    const salt = await bcrypt.genSalt(10);
    const hashPassword = await bcrypt.hash(password || "123456", salt); // Default pass
    const userRes = await client.query(
      `INSERT INTO u_users (username, password, full_name, role) VALUES ($1, $2, $3, 'teacher') RETURNING id`,
      [username, hashPassword, full_name],
    );
    const userId = userRes.rows[0].id;

    // 2. Insert ke u_teachers
    const isHomeroom = !!homeroom_class_id;
    await client.query(
      `INSERT INTO u_teachers (user_id, nip, phone, email, is_homeroom, homebase_id) VALUES ($1, $2, $3, $4, $5, $6)`,
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

    // 3. Handle Wali Kelas (Update a_class)
    if (homeroom_class_id) {
      // Reset wali kelas lama di kelas tsb (jika ada)
      await client.query(
        `UPDATE u_teachers SET is_homeroom = false WHERE user_id = (SELECT homeroom_teacher_id FROM a_class WHERE id = $1)`,
        [homeroom_class_id],
      );
      // Set guru baru
      await client.query(
        `UPDATE a_class SET homeroom_teacher_id = $1 WHERE id = $2`,
        [userId, homeroom_class_id],
      );
    }

    // 4. Handle Alokasi Mengajar (Insert at_subject)
    if (allocations && Array.isArray(allocations) && allocations.length > 0) {
      for (const item of allocations) {
        await client.query(
          `INSERT INTO at_subject (teacher_id, subject_id, class_id) VALUES ($1, $2, $3)`,
          [userId, item.subject_id, item.class_id],
        );
      }
    }

    res.json({ status: "success", message: "Data guru berhasil dibuat" });
  }),
);

// --- UPDATE TEACHER ---
router.put(
  "/teacher/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params; // ini adalah user_id
    const {
      username,
      full_name,
      nip,
      rfid_no,
      phone,
      email,
      homeroom_class_id,
      allocations,
    } = req.body;

    // 1. Update u_users
    await client.query(
      `UPDATE u_users SET username = $1, full_name = $2 WHERE id = $3`,
      [username, full_name, id],
    );

    // 2. Update u_teachers & Reset is_homeroom sementara
    await client.query(
      `UPDATE u_teachers SET nip = $1, phone = $2, email = $3, is_homeroom = false WHERE user_id = $4`,
      [nip || null, phone || null, email || null, id],
    );

    if (rfid_no !== undefined) {
      const normalizedRfid = `${rfid_no || ""}`.trim();
      if (!normalizedRfid) {
        await client.query(
          `UPDATE attendance.rfid_card
           SET is_active = false
           WHERE user_id = $1`,
          [id],
        );
      } else {
        const existingCard = await client.query(
          `SELECT id, user_id FROM attendance.rfid_card WHERE card_uid = $1 LIMIT 1`,
          [normalizedRfid],
        );

        if (existingCard.rowCount > 0 && existingCard.rows[0].user_id !== Number(id)) {
          return res.status(400).json({ message: "No RFID sudah dipakai user lain." });
        }

        if (existingCard.rowCount > 0) {
          await client.query(
            `UPDATE attendance.rfid_card
             SET user_id = $1, is_active = true, is_primary = true
             WHERE id = $2`,
            [id, existingCard.rows[0].id],
          );
        } else {
          await client.query(
            `INSERT INTO attendance.rfid_card (user_id, card_uid, card_type, is_primary, is_active)
             VALUES ($1, $2, 'rfid', true, true)`,
            [id, normalizedRfid],
          );
        }
      }
    }

    // 3. Handle Wali Kelas
    // Hapus kepemilikan kelas sebelumnya dari guru ini
    await client.query(
      `UPDATE a_class SET homeroom_teacher_id = NULL WHERE homeroom_teacher_id = $1`,
      [id],
    );

    if (homeroom_class_id) {
      // Reset guru lain jika dia megang kelas target
      await client.query(
        `UPDATE u_teachers SET is_homeroom = false WHERE user_id = (SELECT homeroom_teacher_id FROM a_class WHERE id = $1)`,
        [homeroom_class_id],
      );
      // Set guru ini ke kelas target
      await client.query(
        `UPDATE a_class SET homeroom_teacher_id = $1 WHERE id = $2`,
        [id, homeroom_class_id],
      );
      // Update status is_homeroom
      await client.query(
        `UPDATE u_teachers SET is_homeroom = true WHERE user_id = $1`,
        [id],
      );
    }

    // 4. Handle Alokasi Mengajar
    // Hapus semua alokasi lama
    await client.query(`DELETE FROM at_subject WHERE teacher_id = $1`, [id]);

    // Insert baru
    if (allocations && Array.isArray(allocations)) {
      for (const item of allocations) {
        await client.query(
          `INSERT INTO at_subject (teacher_id, subject_id, class_id) VALUES ($1, $2, $3)`,
          [id, item.subject_id, item.class_id],
        );
      }
    }

    res.json({ status: "success", message: "Data guru berhasil diperbarui" });
  }),
);

// --- DELETE TEACHER ---
router.delete(
  "/teacher/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id } = req.params;

    // Set NULL di a_class dulu
    await client.query(
      `UPDATE a_class SET homeroom_teacher_id = NULL WHERE homeroom_teacher_id = $1`,
      [id],
    );

    // Delete allocations
    await client.query(`DELETE FROM at_subject WHERE teacher_id = $1`, [id]);

    // Delete u_users (Cascade ke u_teachers)
    await client.query(`DELETE FROM u_users WHERE id = $1`, [id]);

    await client.query(`DELETE FROM u_teachers WHERE user_id = $1`, [id]);

    res.json({ status: "success", message: "Guru berhasil dihapus" });
  }),
);


// --- UPLOAD TEACHERS (BULK) ---
router.post(
  "/teacher/upload",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const teachers = req.body;
    const homebaseId = req.user.homebase_id;
    let importedCount = 0;
    let skippedInvalid = 0;
    let skippedDuplicate = 0;

    if (!Array.isArray(teachers) || teachers.length === 0) {
      return res.status(400).json({ message: "Data tidak valid." });
    }

    for (const teacher of teachers) {
      const username = (teacher?.username || teacher?.nip || "").toString().trim();
      const password = (teacher?.password || "123456").toString().trim();
      const fullName = (teacher?.full_name || teacher?.name || "").toString().trim();
      const nip = (teacher?.nip || "").toString().trim();
      const rfidNo = (teacher?.rfid_no || teacher?.rfid || "").toString().trim();
      const phone = (teacher?.phone || "").toString().trim();
      const email = (teacher?.email || "").toString().trim();
      const homeroomClassId = teacher?.homeroom_class_id || null;
      const allocations = Array.isArray(teacher?.allocations)
        ? teacher.allocations
        : [];

      if (!username || !fullName) {
        skippedInvalid++;
        continue;
      }

      if (nip) {
        const existing = await client.query(
          "SELECT user_id FROM u_teachers WHERE nip = $1 AND homebase_id = $2",
          [nip, homebaseId],
        );
        if (existing.rows.length > 0) {
          skippedDuplicate++;
          continue;
        }
      }

      const existingUsername = await client.query(
        "SELECT id FROM u_users WHERE username = $1",
        [username],
      );
      if (existingUsername.rows.length > 0) {
        skippedDuplicate++;
        continue;
      }

      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password || "123456", salt);
      const userRes = await client.query(
        `INSERT INTO u_users (username, password, full_name, role) VALUES ($1, $2, $3, 'teacher') RETURNING id`,
        [username, hashPassword, fullName],
      );
      const userId = userRes.rows[0].id;

      await client.query(
        `INSERT INTO u_teachers (user_id, nip, phone, email, is_homeroom, homebase_id) VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          userId,
          nip || null,
          phone || null,
          email || null,
          Boolean(homeroomClassId),
          homebaseId,
        ],
      );

      if (rfidNo) {
        const existingCard = await client.query(
          `SELECT user_id FROM attendance.rfid_card WHERE card_uid = $1 LIMIT 1`,
          [rfidNo],
        );
        if (existingCard.rowCount > 0) {
          skippedDuplicate++;
          continue;
        }
        await client.query(
          `INSERT INTO attendance.rfid_card (user_id, card_uid, card_type, is_primary, is_active)
           VALUES ($1, $2, 'rfid', true, true)`,
          [userId, rfidNo],
        );
      }

      if (homeroomClassId) {
        await client.query(
          `UPDATE u_teachers SET is_homeroom = false WHERE user_id = (SELECT homeroom_teacher_id FROM a_class WHERE id = $1)`,
          [homeroomClassId],
        );
        await client.query(
          `UPDATE a_class SET homeroom_teacher_id = $1 WHERE id = $2`,
          [userId, homeroomClassId],
        );
      }

      for (const item of allocations) {
        if (!item?.subject_id || !item?.class_id) {
          continue;
        }

        await client.query(
          `INSERT INTO at_subject (teacher_id, subject_id, class_id) VALUES ($1, $2, $3)`,
          [userId, item.subject_id, item.class_id],
        );
      }

      importedCount++;
    }

    res.status(201).json({
      status: "success",
      message: `Berhasil mengimpor ${importedCount} dari ${teachers.length} data guru.`,
      summary: {
        total: teachers.length,
        imported: importedCount,
        skipped_invalid: skippedInvalid,
        skipped_duplicate: skippedDuplicate,
      },
    });
  }),
);

// GET CLASSES
router.get(
  "/classes",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    const data = await pool.query(
      `SELECT * FROM a_class WHERE homebase_id = $1`,
      [homebaseId],
    );

    res.status(200).json(data.rows);
  }),
);

// GET SUBJECTS
router.get(
  "/subjects",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    const data = await pool.query(
      `SELECT * FROM a_subject WHERE homebase_id = $1`,
      [homebaseId],
    );

    res.status(200).json(data.rows);
  }),
);

export default router;
