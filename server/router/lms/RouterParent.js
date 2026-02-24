import { Router } from "express";
import bcrypt from "bcrypt";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const normalizeNisList = (value) => {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      items
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );
};

const ensureParentStudentTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS u_parent_students (
      id SERIAL PRIMARY KEY,
      parent_user_id integer NOT NULL REFERENCES u_users(id) ON DELETE CASCADE,
      student_id integer NOT NULL REFERENCES u_students(user_id) ON DELETE CASCADE,
      homebase_id integer NOT NULL REFERENCES a_homebase(id) ON DELETE CASCADE,
      created_at timestamp DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_parent_student_pair UNIQUE (parent_user_id, student_id),
      CONSTRAINT uq_parent_student_owner UNIQUE (student_id)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_parent_students_parent_homebase
    ON u_parent_students(parent_user_id, homebase_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_parent_students_homebase
    ON u_parent_students(homebase_id)
  `);
};

const syncLegacyParentLinks = async (client, homebaseId) => {
  await client.query(
    `INSERT INTO u_parent_students (parent_user_id, student_id, homebase_id)
     SELECT up.user_id, up.student_id, s.homebase_id
     FROM u_parents up
     JOIN u_students s ON s.user_id = up.student_id
     WHERE up.student_id IS NOT NULL
       AND s.homebase_id = $1
     ON CONFLICT (student_id) DO NOTHING`,
    [homebaseId],
  );
};

const getActivePeriode = async (client, homebaseId) => {
  const result = await client.query(
    `SELECT id, name
     FROM a_periode
     WHERE homebase_id = $1
       AND is_active = true
     ORDER BY id DESC
     LIMIT 1`,
    [homebaseId],
  );

  return result.rows[0] || null;
};

const resolveStudentsByNis = async (client, homebaseId, nisList, activePeriodeId) => {
  if (!nisList.length) return { rows: [], missingNis: [] };

  const studentRes = await client.query(
    `SELECT s.user_id AS student_id, s.nis, u.full_name
     FROM u_students s
     JOIN u_users u ON u.id = s.user_id
     WHERE s.homebase_id = $1
       AND s.current_periode_id = $2
       AND s.nis = ANY($3::text[])`,
    [homebaseId, activePeriodeId, nisList],
  );

  const foundNis = new Set(studentRes.rows.map((row) => String(row.nis).trim()));
  const missingNis = nisList.filter((nis) => !foundNis.has(nis));

  return { rows: studentRes.rows, missingNis };
};

const parseParentId = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

router.get(
  "/parents/meta",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(pool);
    await syncLegacyParentLinks(pool, homebaseId);

    const activePeriode = await getActivePeriode(pool, homebaseId);
    let students = [];

    if (activePeriode?.id) {
      const studentsRes = await pool.query(
        `SELECT
           s.user_id AS student_id,
           s.nis,
           u.full_name,
           c.id AS class_id,
           s.current_class_id,
           g.id AS grade_id,
           c.name AS class_name,
           g.name AS grade_name,
           ups.parent_user_id AS owner_parent_id,
           pu.full_name AS owner_parent_name
         FROM u_students s
         JOIN u_users u ON u.id = s.user_id
         LEFT JOIN a_class c ON c.id = s.current_class_id
         LEFT JOIN a_grade g ON g.id = c.grade_id
         LEFT JOIN u_parent_students ups
           ON ups.student_id = s.user_id
          AND ups.homebase_id = $1
         LEFT JOIN u_users pu ON pu.id = ups.parent_user_id
         WHERE s.homebase_id = $1
           AND s.current_periode_id = $2
         ORDER BY u.full_name ASC`,
        [homebaseId, activePeriode.id],
      );
      students = studentsRes.rows;
    }

    res.json({
      status: "success",
      data: {
        active_periode: activePeriode,
        students,
      },
    });
  }),
);

router.get(
  "/parents",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(pool);
    await syncLegacyParentLinks(pool, homebaseId);

    const pageNum = parseInt(req.query.page, 10) || 1;
    const limitNum = parseInt(req.query.limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;
    const search = String(req.query.search || "").trim();
    const gradeId = parsePositiveInt(req.query.grade_id);
    const classId = parsePositiveInt(req.query.class_id);

    const whereParts = [];
    const baseParams = [homebaseId];

    if (search) {
      baseParams.push(`%${search}%`);
      const searchParamIndex = baseParams.length;
      whereParts.push(`(
          u.full_name ILIKE $${searchParamIndex}
          OR u.username ILIKE $${searchParamIndex}
          OR COALESCE(up.email, '') ILIKE $${searchParamIndex}
          OR EXISTS (
            SELECT 1
            FROM u_parent_students ex_ups
            JOIN u_students ex_s ON ex_s.user_id = ex_ups.student_id
            WHERE ex_ups.parent_user_id = u.id
              AND ex_ups.homebase_id = $1
              AND ex_s.nis ILIKE $${searchParamIndex}
          )
        )`);
    }

    if (gradeId) {
      baseParams.push(gradeId);
      const gradeParamIndex = baseParams.length;
      whereParts.push(`EXISTS (
          SELECT 1
          FROM u_parent_students fg_ups
          JOIN u_students fg_s ON fg_s.user_id = fg_ups.student_id
          LEFT JOIN a_class fg_c ON fg_c.id = fg_s.current_class_id
          WHERE fg_ups.parent_user_id = u.id
            AND fg_ups.homebase_id = $1
            AND fg_c.grade_id = $${gradeParamIndex}
        )`);
    }

    if (classId) {
      baseParams.push(classId);
      const classParamIndex = baseParams.length;
      whereParts.push(`EXISTS (
          SELECT 1
          FROM u_parent_students fc_ups
          JOIN u_students fc_s ON fc_s.user_id = fc_ups.student_id
          WHERE fc_ups.parent_user_id = u.id
            AND fc_ups.homebase_id = $1
            AND fc_s.current_class_id = $${classParamIndex}
        )`);
    }

    const whereFilter = whereParts.length
      ? `AND ${whereParts.join("\n        AND ")}`
      : "";

    const limitParamIndex = baseParams.length + 1;
    const offsetParamIndex = baseParams.length + 2;
    const params = [...baseParams, limitNum, offset];
    const countParams = [...baseParams];

    const dataQuery = `
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.is_active,
        up.phone,
        up.email,
        COALESCE(children.students, '[]'::json) AS students,
        COALESCE(children.student_count, 0) AS student_count
      FROM u_users u
      JOIN u_parents up ON up.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS student_count,
          json_agg(
            json_build_object(
              'student_id', s.user_id,
              'nis', s.nis,
              'full_name', su.full_name,
              'class_name', c.name
            )
            ORDER BY su.full_name ASC
          ) AS students
        FROM u_parent_students ups
        JOIN u_students s ON s.user_id = ups.student_id
        JOIN u_users su ON su.id = s.user_id
        LEFT JOIN a_class c ON c.id = s.current_class_id
        WHERE ups.parent_user_id = u.id
          AND ups.homebase_id = $1
      ) children ON true
      WHERE u.role = 'parent'
        AND COALESCE(children.student_count, 0) > 0
        ${whereFilter}
      ORDER BY u.full_name ASC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM u_users u
      JOIN u_parents up ON up.user_id = u.id
      WHERE u.role = 'parent'
        AND EXISTS (
          SELECT 1
          FROM u_parent_students ups
          WHERE ups.parent_user_id = u.id
            AND ups.homebase_id = $1
        )
        ${whereFilter}
    `;

    const [dataRes, countRes] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams),
    ]);

    const totalData = parseInt(countRes.rows[0]?.total || 0, 10);

    res.json({
      status: "success",
      data: dataRes.rows,
      totalData,
      totalPages: Math.ceil(totalData / limitNum),
      page: pageNum,
      limit: limitNum,
    });
  }),
);

router.get(
  "/parents/student-links",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(pool);
    await syncLegacyParentLinks(pool, homebaseId);

    const pageNum = parseInt(req.query.page, 10) || 1;
    const limitNum = parseInt(req.query.limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;
    const search = String(req.query.search || "").trim();

    const whereSearch = search
      ? `AND (
           su.full_name ILIKE $2
           OR COALESCE(s.nis, '') ILIKE $2
           OR COALESCE(pu.full_name, '') ILIKE $2
           OR COALESCE(up.email, '') ILIKE $2
         )`
      : "";

    const params = search
      ? [homebaseId, `%${search}%`, limitNum, offset]
      : [homebaseId, limitNum, offset];
    const countParams = search ? [homebaseId, `%${search}%`] : [homebaseId];

    const activePeriode = await getActivePeriode(pool, homebaseId);

    const dataQuery = `
      SELECT
        s.user_id AS student_id,
        s.nis,
        su.full_name AS student_name,
        g.name AS grade_name,
        c.name AS class_name,
        ups.parent_user_id AS parent_id,
        pu.full_name AS parent_name,
        up.email AS parent_email
      FROM u_students s
      JOIN u_users su ON su.id = s.user_id
      LEFT JOIN a_class c ON c.id = s.current_class_id
      LEFT JOIN a_grade g ON g.id = c.grade_id
      LEFT JOIN u_parent_students ups
        ON ups.student_id = s.user_id
       AND ups.homebase_id = $1
      LEFT JOIN u_users pu ON pu.id = ups.parent_user_id
      LEFT JOIN u_parents up ON up.user_id = ups.parent_user_id
      WHERE s.homebase_id = $1
      ${whereSearch}
      ORDER BY su.full_name ASC
      LIMIT $${search ? 3 : 2} OFFSET $${search ? 4 : 3}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM u_students s
      JOIN u_users su ON su.id = s.user_id
      LEFT JOIN u_parent_students ups
        ON ups.student_id = s.user_id
       AND ups.homebase_id = $1
      LEFT JOIN u_users pu ON pu.id = ups.parent_user_id
      LEFT JOIN u_parents up ON up.user_id = ups.parent_user_id
      WHERE s.homebase_id = $1
      ${whereSearch}
    `;

    const [dataRes, countRes] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams),
    ]);

    const totalData = parseInt(countRes.rows[0]?.total || 0, 10);

    res.json({
      status: "success",
      data: dataRes.rows,
      totalData,
      totalPages: Math.ceil(totalData / limitNum),
      page: pageNum,
      limit: limitNum,
      active_periode: activePeriode,
    });
  }),
);

router.get(
  "/parents/:id",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(pool);
    await syncLegacyParentLinks(pool, homebaseId);

    const parentId = parseParentId(req.params.id);
    if (!parentId) {
      return res.status(400).json({
        status: "error",
        message: "ID orang tua tidak valid.",
      });
    }

    const parentRes = await pool.query(
      `SELECT
         u.id,
         u.username,
         u.full_name,
         u.is_active,
         up.phone,
         up.email,
         COALESCE(children.students, '[]'::json) AS students
       FROM u_users u
       LEFT JOIN u_parents up ON up.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT
           json_agg(
             json_build_object(
               'student_id', s.user_id,
               'nis', s.nis,
               'full_name', su.full_name,
               'class_name', c.name
             )
             ORDER BY su.full_name ASC
           ) AS students
         FROM u_parent_students ups
         JOIN u_students s ON s.user_id = ups.student_id
         JOIN u_users su ON su.id = s.user_id
         LEFT JOIN a_class c ON c.id = s.current_class_id
         WHERE ups.parent_user_id = u.id
           AND ups.homebase_id = $2
       ) children ON true
       WHERE u.id = $1
         AND u.role = 'parent'
         AND EXISTS (
           SELECT 1
           FROM u_parent_students ups
           WHERE ups.parent_user_id = u.id
             AND ups.homebase_id = $2
         )
       LIMIT 1`,
      [parentId, homebaseId],
    );

    if (parentRes.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Data orang tua tidak ditemukan.",
      });
    }

    res.json({
      status: "success",
      data: parentRes.rows[0],
    });
  }),
);

router.post(
  "/parents",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(client);
    await syncLegacyParentLinks(client, homebaseId);

    const {
      username,
      password,
      full_name,
      phone,
      email,
      is_active = true,
      nis_list,
    } = req.body;

    const nisList = normalizeNisList(nis_list);

    if (!username || !full_name || !password) {
      return res.status(400).json({
        status: "error",
        message: "username, password, dan full_name wajib diisi.",
      });
    }

    if (nisList.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Minimal 1 NIS siswa wajib dipilih.",
      });
    }

    const activePeriode = await getActivePeriode(client, homebaseId);
    if (!activePeriode?.id) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const existingUser = await client.query(
      "SELECT id FROM u_users WHERE username = $1",
      [String(username).trim()],
    );
    if (existingUser.rowCount > 0) {
      return res.status(400).json({
        status: "error",
        message: "Username sudah digunakan.",
      });
    }

    const { rows: students, missingNis } = await resolveStudentsByNis(
      client,
      homebaseId,
      nisList,
      activePeriode.id,
    );

    if (missingNis.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `NIS tidak ditemukan pada periode aktif: ${missingNis.join(", ")}`,
      });
    }

    const studentIds = students.map((row) => row.student_id);
    const conflictRes = await client.query(
      `SELECT s.nis, pu.full_name AS parent_name
       FROM u_parent_students ups
       JOIN u_students s ON s.user_id = ups.student_id
       JOIN u_users pu ON pu.id = ups.parent_user_id
       WHERE ups.student_id = ANY($1::int[])
         AND ups.homebase_id = $2`,
      [studentIds, homebaseId],
    );

    if (conflictRes.rowCount > 0) {
      const details = conflictRes.rows
        .map((row) => `${row.nis} (milik ${row.parent_name})`)
        .join(", ");
      return res.status(400).json({
        status: "error",
        message: `Siswa sudah terhubung ke orang tua lain: ${details}`,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(String(password), salt);

    const userRes = await client.query(
      `INSERT INTO u_users (username, password, full_name, role, is_active)
       VALUES ($1, $2, $3, 'parent', $4)
       RETURNING id`,
      [String(username).trim(), hashedPassword, String(full_name).trim(), !!is_active],
    );
    const parentUserId = userRes.rows[0].id;

    await client.query(
      `INSERT INTO u_parents (user_id, student_id, phone, email)
       VALUES ($1, $2, $3, $4)`,
      [
        parentUserId,
        students[0].student_id,
        phone ? String(phone).trim() : null,
        email ? String(email).trim() : null,
      ],
    );

    for (const student of students) {
      await client.query(
        `INSERT INTO u_parent_students (parent_user_id, student_id, homebase_id)
         VALUES ($1, $2, $3)`,
        [parentUserId, student.student_id, homebaseId],
      );
    }

    res.status(201).json({
      status: "success",
      message: "Orang tua berhasil ditambahkan.",
    });
  }),
);

router.put(
  "/parents/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(client);
    await syncLegacyParentLinks(client, homebaseId);

    const parentId = parseParentId(req.params.id);
    if (!parentId) {
      return res.status(400).json({
        status: "error",
        message: "ID orang tua tidak valid.",
      });
    }
    const {
      username,
      password,
      full_name,
      phone,
      email,
      is_active,
      nis_list,
    } = req.body;

    if (!username || !full_name) {
      return res.status(400).json({
        status: "error",
        message: "username dan full_name wajib diisi.",
      });
    }

    const ownerCheck = await client.query(
      `SELECT 1
       FROM u_users u
       WHERE u.id = $1
         AND u.role = 'parent'
         AND EXISTS (
           SELECT 1
           FROM u_parent_students ups
           WHERE ups.parent_user_id = u.id
             AND ups.homebase_id = $2
         )`,
      [parentId, homebaseId],
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Data orang tua tidak ditemukan.",
      });
    }

    const userExists = await client.query(
      "SELECT id FROM u_users WHERE username = $1 AND id <> $2",
      [String(username).trim(), parentId],
    );
    if (userExists.rowCount > 0) {
      return res.status(400).json({
        status: "error",
        message: "Username sudah digunakan.",
      });
    }

    const nisList = normalizeNisList(nis_list);
    if (nisList.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Minimal 1 NIS siswa wajib dipilih.",
      });
    }

    const activePeriode = await getActivePeriode(client, homebaseId);
    if (!activePeriode?.id) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const { rows: students, missingNis } = await resolveStudentsByNis(
      client,
      homebaseId,
      nisList,
      activePeriode.id,
    );

    if (missingNis.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `NIS tidak ditemukan pada periode aktif: ${missingNis.join(", ")}`,
      });
    }

    const studentIds = students.map((row) => row.student_id);
    const conflictRes = await client.query(
      `SELECT s.nis, pu.full_name AS parent_name
       FROM u_parent_students ups
       JOIN u_students s ON s.user_id = ups.student_id
       JOIN u_users pu ON pu.id = ups.parent_user_id
       WHERE ups.student_id = ANY($1::int[])
         AND ups.parent_user_id <> $2
         AND ups.homebase_id = $3`,
      [studentIds, parentId, homebaseId],
    );

    if (conflictRes.rowCount > 0) {
      const details = conflictRes.rows
        .map((row) => `${row.nis} (milik ${row.parent_name})`)
        .join(", ");
      return res.status(400).json({
        status: "error",
        message: `Siswa sudah terhubung ke orang tua lain: ${details}`,
      });
    }

    if (password && String(password).trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(String(password), salt);
      await client.query(
        `UPDATE u_users
         SET username = $1, full_name = $2, password = $3, is_active = $4
         WHERE id = $5`,
        [
          String(username).trim(),
          String(full_name).trim(),
          hashedPassword,
          typeof is_active === "boolean" ? is_active : true,
          parentId,
        ],
      );
    } else {
      await client.query(
        `UPDATE u_users
         SET username = $1, full_name = $2, is_active = $3
         WHERE id = $4`,
        [
          String(username).trim(),
          String(full_name).trim(),
          typeof is_active === "boolean" ? is_active : true,
          parentId,
        ],
      );
    }

    await client.query(
      `INSERT INTO u_parents (user_id, student_id, phone, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET student_id = EXCLUDED.student_id, phone = EXCLUDED.phone, email = EXCLUDED.email`,
      [
        parentId,
        students[0].student_id,
        phone ? String(phone).trim() : null,
        email ? String(email).trim() : null,
      ],
    );

    await client.query(
      `DELETE FROM u_parent_students
       WHERE parent_user_id = $1 AND homebase_id = $2`,
      [parentId, homebaseId],
    );

    for (const student of students) {
      await client.query(
        `INSERT INTO u_parent_students (parent_user_id, student_id, homebase_id)
         VALUES ($1, $2, $3)`,
        [parentId, student.student_id, homebaseId],
      );
    }

    res.json({
      status: "success",
      message: "Orang tua berhasil diperbarui.",
    });
  }),
);

router.delete(
  "/parents/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(client);
    await syncLegacyParentLinks(client, homebaseId);

    const parentId = parseParentId(req.params.id);
    if (!parentId) {
      return res.status(400).json({
        status: "error",
        message: "ID orang tua tidak valid.",
      });
    }

    const check = await client.query(
      `SELECT 1
       FROM u_users u
       WHERE u.id = $1
         AND u.role = 'parent'
         AND EXISTS (
           SELECT 1
           FROM u_parent_students ups
           WHERE ups.parent_user_id = u.id
             AND ups.homebase_id = $2
         )`,
      [parentId, homebaseId],
    );

    if (check.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Data orang tua tidak ditemukan.",
      });
    }

    await client.query("DELETE FROM u_users WHERE id = $1", [parentId]);

    res.json({
      status: "success",
      message: "Orang tua berhasil dihapus.",
    });
  }),
);

export default router;
