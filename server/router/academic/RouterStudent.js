import { Router } from "express";
import bcrypt from "bcrypt";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import { getActivePeriode, syncUserRfid } from "../../utils/helper.js";

const router = Router();

const normalizeText = (value) => `${value ?? ""}`.trim();

const normalizeKey = (value) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, " ");

const normalizeIdValue = (value) => {
  if (value === undefined || value === null || value === "") return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return normalizeText(value);
};

const normalizeRfid = (value) => {
  const text = normalizeText(value);
  return text ? text.toUpperCase() : "";
};

const valuesEqual = (left, right) => normalizeKey(left) === normalizeKey(right);

const rfidEqual = (left, right) => normalizeRfid(left) === normalizeRfid(right);

const buildClassLookup = (rows = []) => {
  const byGradeAndName = new Map();
  const byName = new Map();

  rows.forEach((row) => {
    const classNameKey = normalizeKey(row.class_name);
    const gradeKey = normalizeKey(row.grade_name);
    if (!classNameKey) return;

    byGradeAndName.set(`${gradeKey}||${classNameKey}`, row);
    if (!byName.has(classNameKey)) byName.set(classNameKey, []);
    byName.get(classNameKey).push(row);
  });

  return { byGradeAndName, byName };
};

const resolveClass = (lookup, tingkat, kelas) => {
  const classNameKey = normalizeKey(kelas);
  const gradeKey = normalizeKey(tingkat);
  if (!classNameKey) return null;

  if (gradeKey) {
    const exact = lookup.byGradeAndName.get(`${gradeKey}||${classNameKey}`);
    if (exact) return exact;
  }

  const matches = lookup.byName.get(classNameKey) || [];
  if (matches.length === 1) return matches[0];
  return null;
};

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
        s.nis, s.nisn, rc.card_uid AS rfid_no,
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
      LEFT JOIN LATERAL (
        SELECT card_uid
        FROM attendance.rfid_card
        WHERE user_id = u.id AND is_active = true
        ORDER BY is_primary DESC, id DESC
        LIMIT 1
      ) rc ON true
      -- Left Join agar siswa yang belum masuk kelas tetap muncul (opsional, tergantung kebutuhan)
      -- Disini pakai JOIN karena filter periode aktif
      JOIN u_class_enrollments ce ON s.user_id = ce.student_id
      JOIN a_class c ON ce.class_id = c.id
      LEFT JOIN a_grade g ON c.grade_id = g.id

      WHERE u.role = 'student' 
        AND s.homebase_id = $1
        AND ce.periode_id = $5 
        AND (
          u.full_name ILIKE $2
          OR s.nis ILIKE $2
          OR COALESCE(s.nisn, '') ILIKE $2
          OR COALESCE(rc.card_uid, '') ILIKE $2
        )
      
      ORDER BY g.name ASC NULLS LAST, c.name ASC, u.full_name ASC
      LIMIT $3 OFFSET $4
    `;

    const countText = `
      SELECT COUNT(*) 
      FROM u_users u
      JOIN u_students s ON u.id = s.user_id
      JOIN u_class_enrollments ce ON s.user_id = ce.student_id
      LEFT JOIN LATERAL (
        SELECT card_uid
        FROM attendance.rfid_card
        WHERE user_id = u.id AND is_active = true
        ORDER BY is_primary DESC, id DESC
        LIMIT 1
      ) rc ON true
      WHERE u.role = 'student' 
        AND s.homebase_id = $1
        AND ce.periode_id = $3
        AND (
          u.full_name ILIKE $2
          OR s.nis ILIKE $2
          OR COALESCE(s.nisn, '') ILIKE $2
          OR COALESCE(rc.card_uid, '') ILIKE $2
        )
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
// 1b. EXPORT STUDENTS (Periode Aktif)
// ============================================================================
router.get(
  "/students/export",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    const activePeriodeId = await getActivePeriode(pool, homebaseId);

    const [studentsResult, classesResult] = await Promise.all([
      pool.query(
        `SELECT
           s.nis,
           s.nisn,
           u.full_name,
           g.name AS tingkat,
           c.name AS kelas,
           rc.card_uid AS rfid_no
         FROM u_users u
         JOIN u_students s ON u.id = s.user_id
         LEFT JOIN LATERAL (
           SELECT card_uid
           FROM attendance.rfid_card
           WHERE user_id = u.id AND is_active = true
           ORDER BY is_primary DESC, id DESC
           LIMIT 1
         ) rc ON true
         JOIN u_class_enrollments ce ON s.user_id = ce.student_id
         JOIN a_class c ON ce.class_id = c.id
         LEFT JOIN a_grade g ON c.grade_id = g.id
         WHERE u.role = 'student'
           AND s.homebase_id = $1
           AND ce.periode_id = $2
         ORDER BY g.name ASC NULLS LAST, c.name ASC, u.full_name ASC`,
        [homebaseId, activePeriodeId],
      ),
      pool.query(
        `SELECT
           g.name AS tingkat,
           c.name AS kelas
         FROM a_class c
         LEFT JOIN a_grade g ON c.grade_id = g.id
         WHERE c.homebase_id = $1
         ORDER BY g.name ASC NULLS LAST, c.name ASC`,
        [homebaseId],
      ),
    ]);

    res.json({
      data: studentsResult.rows,
      classes: classesResult.rows,
      activePeriodeId,
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
      rfid_no,
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

    if (rfid_no && `${rfid_no}`.trim() !== "") {
      const rfidResult = await syncUserRfid(client, newUserId, rfid_no);
      if (!rfidResult.ok) {
        return res.status(400).json({ message: rfidResult.message });
      }
    }

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
    const { full_name, nis, nisn, rfid_no, gender, is_active, class_id, password } =
      req.body;
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

    if (password && `${password}`.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashPassword = await bcrypt.hash(password, salt);
      await client.query(`UPDATE u_users SET password = $1 WHERE id = $2`, [
        hashPassword,
        id,
      ]);
    }

    // 3. Update u_students (Tanpa data lahir)
    await client.query(
      `UPDATE u_students 
       SET nis = $1, nisn = $2, current_class_id = $3, current_periode_id = $4
       WHERE user_id = $5`,
      [nis, nisn, class_id, activePeriodeId, id],
    );

    if (rfid_no !== undefined) {
      const rfidResult = await syncUserRfid(client, id, rfid_no);
      if (!rfidResult.ok) {
        return res.status(400).json({ message: rfidResult.message });
      }
    }

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
// 3b. IMPORT STUDENTS (Update only when data differs)
// ============================================================================
router.post(
  "/students/import",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const payload = Array.isArray(req.body) ? { students: req.body } : req.body;
    const students = Array.isArray(payload?.students) ? payload.students : [];
    const homebaseId = req.user.homebase_id;

    if (students.length === 0) {
      return res.status(400).json({ message: "Data import tidak boleh kosong." });
    }

    const activePeriodeId = await getActivePeriode(client, homebaseId);
    const classResult = await client.query(
      `SELECT
         c.id,
         c.name AS class_name,
         c.is_active,
         g.name AS grade_name
       FROM a_class c
       LEFT JOIN a_grade g ON c.grade_id = g.id
       WHERE c.homebase_id = $1`,
      [homebaseId],
    );
    const classLookup = buildClassLookup(classResult.rows);

    const uniqueRows = [];
    const seenNis = new Set();
    const invalid = [];
    const duplicate = [];

    students.forEach((row, index) => {
      const nis = normalizeIdValue(row?.nis);
      const nisn = normalizeIdValue(row?.nisn);
      const fullName = normalizeText(row?.full_name || row?.name);
      const tingkat = normalizeText(row?.tingkat);
      const kelas = normalizeText(row?.kelas);
      const rfidNo = normalizeRfid(row?.rfid_no ?? row?.rfid);

      if (!nis) {
        invalid.push({
          row: index + 1,
          nis,
          name: fullName,
          reason: "NIS wajib diisi",
        });
        return;
      }

      if (seenNis.has(nis)) {
        duplicate.push({
          row: index + 1,
          nis,
          name: fullName,
          reason: "NIS duplikat di file import",
        });
        return;
      }
      seenNis.add(nis);

      if (!fullName) {
        invalid.push({
          row: index + 1,
          nis,
          name: fullName,
          reason: "Nama wajib diisi",
        });
        return;
      }

      if (!kelas) {
        invalid.push({
          row: index + 1,
          nis,
          name: fullName,
          reason: "Kelas wajib diisi",
        });
        return;
      }

      const matchedClass = resolveClass(classLookup, tingkat, kelas);
      if (!matchedClass) {
        invalid.push({
          row: index + 1,
          nis,
          name: fullName,
          reason: `Kelas tidak ditemukan: ${tingkat ? `${tingkat} - ${kelas}` : kelas}`,
        });
        return;
      }

      uniqueRows.push({
        nis,
        nisn: nisn || null,
        full_name: fullName,
        tingkat,
        kelas,
        class_id: matchedClass.id,
        class_active: matchedClass.is_active !== false,
        rfid_no: rfidNo || null,
      });
    });

    if (uniqueRows.length === 0) {
      return res.status(400).json({
        message: "Tidak ada data valid untuk diimpor.",
        summary: {
          total: students.length,
          updated: 0,
          unchanged: 0,
          not_found: 0,
          invalid: invalid.length,
          duplicate: duplicate.length,
        },
        invalid,
        duplicate,
      });
    }

    const existingResult = await client.query(
      `SELECT
         u.id,
         u.full_name,
         s.nis,
         s.nisn,
         rc.card_uid AS rfid_no,
         c.id AS class_id,
         c.name AS class_name,
         g.name AS grade_name
       FROM u_users u
       JOIN u_students s ON u.id = s.user_id
       LEFT JOIN LATERAL (
         SELECT card_uid
         FROM attendance.rfid_card
         WHERE user_id = u.id AND is_active = true
         ORDER BY is_primary DESC, id DESC
         LIMIT 1
       ) rc ON true
       LEFT JOIN u_class_enrollments ce
         ON ce.student_id = u.id AND ce.periode_id = $2
       LEFT JOIN a_class c ON ce.class_id = c.id
       LEFT JOIN a_grade g ON c.grade_id = g.id
       WHERE u.role = 'student'
         AND s.homebase_id = $1
         AND s.nis::text = ANY($3::text[])`,
      [homebaseId, activePeriodeId, uniqueRows.map((item) => item.nis)],
    );

    const existingByNis = new Map(
      existingResult.rows.map((row) => [normalizeIdValue(row.nis), row]),
    );

    const updated = [];
    const unchanged = [];
    const notFound = [];

    for (const row of uniqueRows) {
      const current = existingByNis.get(row.nis);
      if (!current) {
        notFound.push({
          nis: row.nis,
          name: row.full_name,
          reason: "Siswa tidak ditemukan",
        });
        continue;
      }

      const nameChanged = !valuesEqual(current.full_name, row.full_name);
      const nisnChanged = normalizeIdValue(current.nisn) !== normalizeIdValue(row.nisn);
      const rfidChanged = !rfidEqual(current.rfid_no, row.rfid_no);
      const classChanged = Number(current.class_id || 0) !== Number(row.class_id || 0);

      if (!nameChanged && !nisnChanged && !rfidChanged && !classChanged) {
        unchanged.push({ nis: row.nis, name: row.full_name });
        continue;
      }

      if (classChanged && row.class_active === false) {
        invalid.push({
          nis: row.nis,
          name: row.full_name,
          reason: "Kelas tujuan nonaktif",
        });
        continue;
      }

      if (rfidChanged && row.rfid_no) {
        const existingCard = await client.query(
          `SELECT user_id FROM attendance.rfid_card WHERE card_uid = $1 LIMIT 1`,
          [row.rfid_no],
        );
        if (
          existingCard.rowCount > 0 &&
          Number(existingCard.rows[0].user_id) !== Number(current.id)
        ) {
          invalid.push({
            nis: row.nis,
            name: row.full_name,
            reason: "No RFID sudah dipakai user lain.",
          });
          continue;
        }
      }

      if (nameChanged) {
        await client.query(`UPDATE u_users SET full_name = $1 WHERE id = $2`, [
          row.full_name,
          current.id,
        ]);
      }

      if (nisnChanged || classChanged) {
        await client.query(
          `UPDATE u_students
           SET nisn = $1, current_class_id = $2, current_periode_id = $3
           WHERE user_id = $4`,
          [
            nisnChanged ? row.nisn : current.nisn,
            classChanged ? row.class_id : current.class_id,
            activePeriodeId,
            current.id,
          ],
        );
      }

      if (classChanged) {
        const enrollRes = await client.query(
          `SELECT id FROM u_class_enrollments
           WHERE student_id = $1 AND periode_id = $2`,
          [current.id, activePeriodeId],
        );

        if (enrollRes.rows.length > 0) {
          await client.query(
            `UPDATE u_class_enrollments
             SET class_id = $1
             WHERE student_id = $2 AND periode_id = $3`,
            [row.class_id, current.id, activePeriodeId],
          );
        } else {
          await client.query(
            `INSERT INTO u_class_enrollments (student_id, class_id, periode_id, homebase_id)
             VALUES ($1, $2, $3, $4)`,
            [current.id, row.class_id, activePeriodeId, homebaseId],
          );
        }
      }

      if (rfidChanged) {
        const rfidResult = await syncUserRfid(client, current.id, row.rfid_no);
        if (!rfidResult.ok) {
          invalid.push({
            nis: row.nis,
            name: row.full_name,
            reason: rfidResult.message,
          });
          continue;
        }
      }

      updated.push({
        nis: row.nis,
        name: row.full_name,
        changes: [
          nameChanged ? "Nama" : null,
          nisnChanged ? "NISN" : null,
          classChanged ? "Kelas" : null,
          rfidChanged ? "RFID" : null,
        ].filter(Boolean),
      });
    }

    res.json({
      message: `Import selesai. ${updated.length} data diperbarui, ${unchanged.length} tidak berubah.`,
      summary: {
        total: students.length,
        updated: updated.length,
        unchanged: unchanged.length,
        not_found: notFound.length,
        invalid: invalid.length,
        duplicate: duplicate.length,
      },
      updated,
      unchanged,
      notFound,
      invalid,
      duplicate,
    });
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
