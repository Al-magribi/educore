import { Router } from "express";
import bcrypt from "bcrypt";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();
const SALT_ROUNDS = 10;

const toIntOrNull = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const toBool = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === "") return defaultValue;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }
  return defaultValue;
};

const normalizeStudentIds = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map((item) => toIntOrNull(item)).filter(Boolean))];
};

const normalizeUsername = (value) => String(value || "").trim().toLowerCase();
const normalizeText = (value) => String(value || "").trim();
const normalizeKey = (value) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, " ");
const normalizeGender = (value) => {
  const raw = normalizeKey(value);
  if (!raw) return null;
  if (["l", "lk", "laki", "laki-laki", "male"].includes(raw)) return "L";
  if (["p", "pr", "perempuan", "female"].includes(raw)) return "P";
  return normalizeText(value);
};

const resolveSelectedHomebase = async (db, userHomebaseId, requestedHomebaseId) => {
  if (userHomebaseId) {
    return userHomebaseId;
  }

  if (requestedHomebaseId) {
    const homebase = await db.query(`SELECT id FROM a_homebase WHERE id = $1`, [requestedHomebaseId]);
    return homebase.rows.length ? requestedHomebaseId : null;
  }

  return null;
};

const ensurePeriodeScope = async (db, periodeId, homebaseId) => {
  const periode = await db.query(
    `SELECT id, homebase_id
     FROM a_periode
     WHERE id = $1
     LIMIT 1`,
    [periodeId],
  );

  if (!periode.rows.length) {
    return { ok: false, message: "Periode tidak ditemukan." };
  }

  if (homebaseId && periode.rows[0].homebase_id !== homebaseId) {
    return { ok: false, message: "Periode tidak sesuai dengan homebase." };
  }

  return { ok: true, data: periode.rows[0] };
};

const ensureMusyrifScope = async (db, musyrifId, homebaseId) => {
  const musyrif = await db.query(
     `SELECT id, homebase_id
     FROM tahfiz.t_musyrif
     WHERE id = $1
     LIMIT 1`,
    [musyrifId],
  );

  if (!musyrif.rows.length) {
    return { ok: false, message: "Musyrif tidak ditemukan." };
  }

  if (homebaseId && musyrif.rows[0].homebase_id !== homebaseId) {
    return { ok: false, message: "Musyrif tidak sesuai dengan homebase." };
  }

  return { ok: true, data: musyrif.rows[0] };
};

const ensureStudentsScope = async (db, studentIds, homebaseId) => {
  if (!studentIds.length) {
    return { ok: true };
  }

  const result = await db.query(
    `SELECT user_id
     FROM u_students
     WHERE homebase_id = $1
       AND user_id = ANY($2::int[])`,
    [homebaseId, studentIds],
  );

  if (result.rows.length !== studentIds.length) {
    return { ok: false, message: "Ada siswa yang tidak sesuai homebase atau tidak ditemukan." };
  }

  return { ok: true };
};

router.get(
  "/halaqoh/options",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const scopedHomebaseId = req.user.homebase_id || null;
    const requestedHomebaseId = toIntOrNull(req.query.homebase_id);
    const includeAll = toBool(req.query.include_all, false);
    const selectedHomebaseId = await resolveSelectedHomebase(
      pool,
      scopedHomebaseId,
      requestedHomebaseId,
    );

    const homebasesQuery = scopedHomebaseId
      ? pool.query(
          `SELECT id, name, level
           FROM a_homebase
           WHERE id = $1
           ORDER BY name ASC`,
          [scopedHomebaseId],
        )
      : pool.query(
          `SELECT id, name, level
           FROM a_homebase
           ORDER BY name ASC`,
        );

    const periodesQuery = includeAll
      ? pool.query(
          `SELECT p.id, p.homebase_id, hb.name AS homebase_name, p.name, p.is_active
           FROM a_periode p
           JOIN a_homebase hb ON hb.id = p.homebase_id
           ORDER BY hb.name ASC, p.is_active DESC, p.id DESC`,
        )
      : selectedHomebaseId
      ? pool.query(
          `SELECT p.id, p.homebase_id, hb.name AS homebase_name, p.name, p.is_active
           FROM a_periode p
           JOIN a_homebase hb ON hb.id = p.homebase_id
           WHERE p.homebase_id = $1
           ORDER BY p.is_active DESC, p.id DESC`,
          [selectedHomebaseId],
        )
      : pool.query(
          `SELECT p.id, p.homebase_id, hb.name AS homebase_name, p.name, p.is_active
           FROM a_periode p
           JOIN a_homebase hb ON hb.id = p.homebase_id
           ORDER BY p.id DESC`,
        );

    const musyrifQuery = includeAll
      ? pool.query(
          `SELECT
             m.id,
             m.homebase_id,
             hb.name AS homebase_name,
             m.full_name,
             m.phone,
             m.gender,
             m.is_active,
             u.username
           FROM tahfiz.t_musyrif m
           LEFT JOIN u_users u ON u.id = m.user_id
           LEFT JOIN a_homebase hb ON hb.id = m.homebase_id
           ORDER BY hb.name ASC, m.full_name ASC`,
        )
      : selectedHomebaseId
      ? pool.query(
          `SELECT
             m.id,
             m.homebase_id,
             hb.name AS homebase_name,
             m.full_name,
             m.phone,
             m.gender,
             m.is_active,
             u.username
           FROM tahfiz.t_musyrif m
           LEFT JOIN u_users u ON u.id = m.user_id
           LEFT JOIN a_homebase hb ON hb.id = m.homebase_id
           WHERE m.homebase_id = $1
           ORDER BY m.full_name ASC`,
          [selectedHomebaseId],
        )
      : pool.query(
          `SELECT
             m.id,
             m.homebase_id,
             hb.name AS homebase_name,
             m.full_name,
             m.phone,
             m.gender,
             m.is_active,
             u.username
           FROM tahfiz.t_musyrif m
           LEFT JOIN u_users u ON u.id = m.user_id
           LEFT JOIN a_homebase hb ON hb.id = m.homebase_id
           ORDER BY m.full_name ASC`,
        );

    const studentsQuery = includeAll
      ? pool.query(
          `SELECT
             s.user_id AS id,
             s.homebase_id,
             hb.name AS homebase_name,
             s.nis,
             u.full_name,
             COALESCE(c.name, '-') AS class_name
           FROM u_students s
           JOIN u_users u ON u.id = s.user_id
           LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
           LEFT JOIN LATERAL (
             SELECT c.name
             FROM u_class_enrollments e
             LEFT JOIN a_class c ON c.id = e.class_id
             WHERE e.student_id = s.user_id
             ORDER BY e.id DESC
             LIMIT 1
           ) c ON true
           WHERE u.is_active = true
           ORDER BY hb.name ASC, u.full_name ASC`,
        )
      : selectedHomebaseId
      ? pool.query(
          `SELECT
             s.user_id AS id,
             s.homebase_id,
             hb.name AS homebase_name,
             s.nis,
             u.full_name,
             COALESCE(c.name, '-') AS class_name
           FROM u_students s
           JOIN u_users u ON u.id = s.user_id
           LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
           LEFT JOIN LATERAL (
             SELECT c.name
             FROM u_class_enrollments e
             LEFT JOIN a_class c ON c.id = e.class_id
             WHERE e.student_id = s.user_id
             ORDER BY e.id DESC
             LIMIT 1
           ) c ON true
           WHERE s.homebase_id = $1
             AND u.is_active = true
           ORDER BY u.full_name ASC`,
          [selectedHomebaseId],
        )
      : pool.query(
          `SELECT
             s.user_id AS id,
             s.homebase_id,
             hb.name AS homebase_name,
             s.nis,
             u.full_name,
             COALESCE(c.name, '-') AS class_name
           FROM u_students s
           JOIN u_users u ON u.id = s.user_id
           LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
           LEFT JOIN LATERAL (
             SELECT c.name
             FROM u_class_enrollments e
             LEFT JOIN a_class c ON c.id = e.class_id
             WHERE e.student_id = s.user_id
             ORDER BY e.id DESC
             LIMIT 1
           ) c ON true
           WHERE u.is_active = true
           ORDER BY u.full_name ASC`,
        );

    const importReferenceQuery = pool.query(
          `WITH accessible_homebases AS (
             SELECT id, name
             FROM a_homebase
           ),
           active_periodes AS (
             SELECT DISTINCT ON (p.homebase_id)
               p.homebase_id,
               p.id,
               p.name,
               p.is_active
             FROM a_periode p
             JOIN accessible_homebases hb ON hb.id = p.homebase_id
             ORDER BY p.homebase_id, p.is_active DESC, p.id DESC
           )
           SELECT json_build_object(
             'active_periodes',
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'homebase_id', hb.id,
                     'homebase_name', hb.name,
                     'periode_id', ap.id,
                     'periode_name', ap.name,
                     'is_active', ap.is_active
                   )
                   ORDER BY hb.name ASC
                 )
                 FROM accessible_homebases hb
                 LEFT JOIN active_periodes ap ON ap.homebase_id = hb.id
               ),
               '[]'::json
             ),
             'musyrif',
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'homebase_id', hb.id,
                     'homebase_name', hb.name,
                     'musyrif_id', m.id,
                     'full_name', m.full_name,
                     'username', u.username,
                     'is_active', m.is_active
                   )
                   ORDER BY hb.name ASC, m.full_name ASC
                 )
                 FROM accessible_homebases hb
                 JOIN tahfiz.t_musyrif m ON m.homebase_id = hb.id
                 LEFT JOIN u_users u ON u.id = m.user_id
               ),
               '[]'::json
             ),
             'students',
             COALESCE(
               (
                 SELECT json_agg(
                   json_build_object(
                     'homebase_id', hb.id,
                     'homebase_name', hb.name,
                     'active_periode_id', ap.id,
                     'active_periode_name', ap.name,
                     'student_id', s.user_id,
                     'nis', s.nis,
                     'full_name', u.full_name,
                     'class_name', COALESCE(class_ref.name, '-')
                   )
                   ORDER BY hb.name ASC, u.full_name ASC
                 )
                 FROM accessible_homebases hb
                 JOIN u_students s ON s.homebase_id = hb.id
                 JOIN u_users u ON u.id = s.user_id
                 LEFT JOIN active_periodes ap ON ap.homebase_id = hb.id
                 LEFT JOIN LATERAL (
                   SELECT c.name
                   FROM u_class_enrollments e
                   LEFT JOIN a_class c ON c.id = e.class_id
                   WHERE e.student_id = s.user_id
                     AND (
                       ap.id IS NULL OR
                       e.periode_id = ap.id
                     )
                   ORDER BY e.id DESC
                   LIMIT 1
                 ) class_ref ON true
                 WHERE u.is_active = true
               ),
               '[]'::json
             )
           ) AS data`,
        );

    const [homebasesResult, periodesResult, musyrifResult, studentsResult, importReferenceResult] = await Promise.all([
      homebasesQuery,
      periodesQuery,
      musyrifQuery,
      studentsQuery,
      importReferenceQuery,
    ]);

    return res.json({
      code: 200,
      message: "Referensi halaqoh berhasil dimuat",
      data: {
        selected_homebase_id: selectedHomebaseId,
        homebases: homebasesResult.rows,
        periodes: periodesResult.rows,
        musyrif: musyrifResult.rows,
        students: studentsResult.rows,
        import_reference: importReferenceResult.rows[0]?.data || {
          active_periodes: [],
          musyrif: [],
          students: [],
        },
      },
    });
  }),
);

router.get(
  "/halaqoh/musyrif",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const scopedHomebaseId = req.user.homebase_id || null;
    const requestedHomebaseId = toIntOrNull(req.query.homebase_id);
    const selectedHomebaseId = await resolveSelectedHomebase(
      pool,
      scopedHomebaseId,
      requestedHomebaseId,
    );

    const params = [];
    const filters = [];

    if (selectedHomebaseId) {
      params.push(selectedHomebaseId);
      filters.push(`m.homebase_id = $${params.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT
         m.id,
         m.homebase_id,
         m.user_id,
         h.name AS homebase_name,
         m.full_name,
         u.username,
         m.phone,
         m.gender,
         m.is_active,
         m.notes,
         m.created_at,
         m.updated_at,
         COUNT(DISTINCT q.id) AS halaqoh_count
       FROM tahfiz.t_musyrif m
       LEFT JOIN a_homebase h ON h.id = m.homebase_id
       LEFT JOIN u_users u ON u.id = m.user_id
       LEFT JOIN tahfiz.t_halaqoh q ON q.musyrif_id = m.id
       ${whereClause}
       GROUP BY m.id, h.name, u.username
       ORDER BY m.full_name ASC`,
      params,
    );

    return res.json({
      code: 200,
      message: "Data musyrif berhasil dimuat",
      data: result.rows,
    });
  }),
);

router.post(
  "/halaqoh/musyrif",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const scopedHomebaseId = req.user.homebase_id || null;
    const requestedHomebaseId = toIntOrNull(req.body.homebase_id);
    const homebaseId = scopedHomebaseId || requestedHomebaseId;

    if (!homebaseId) {
      return res.status(400).json({ message: "Homebase wajib diisi." });
    }

    const fullName = req.body.full_name?.trim();
    const username = normalizeUsername(req.body.username);
    const password = String(req.body.password || "").trim();
    if (!fullName) {
      return res.status(400).json({ message: "Nama musyrif wajib diisi." });
    }
    if (!username || !password) {
      return res.status(400).json({ message: "Username dan password wajib diisi." });
    }

    const homebase = await client.query(`SELECT id FROM a_homebase WHERE id = $1`, [homebaseId]);
    if (!homebase.rows.length) {
      return res.status(404).json({ message: "Homebase tidak ditemukan." });
    }

    const existingUser = await client.query(
      `SELECT id FROM u_users WHERE username = $1 LIMIT 1`,
      [username],
    );
    if (existingUser.rows.length) {
      return res.status(400).json({ message: "Username sudah digunakan." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = await client.query(
      `INSERT INTO u_users (username, password, full_name, role, is_active)
       VALUES ($1, $2, $3, 'admin', $4)
       RETURNING id`,
      [username, hashedPassword, fullName, toBool(req.body.is_active, true)],
    );
    const userId = createdUser.rows[0].id;

    await client.query(
      `INSERT INTO u_admin (user_id, homebase_id, level)
       VALUES ($1, $2, 'tahfiz')
       ON CONFLICT (user_id)
       DO UPDATE SET homebase_id = EXCLUDED.homebase_id, level = 'tahfiz'`,
      [userId, homebaseId],
    );

    const created = await client.query(
      `INSERT INTO tahfiz.t_musyrif (homebase_id, user_id, full_name, phone, gender, is_active, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        homebaseId,
        userId,
        fullName,
        req.body.phone?.trim() || null,
        req.body.gender?.trim() || null,
        toBool(req.body.is_active, true),
        req.body.notes?.trim() || null,
      ],
    );

    return res.status(201).json({
      code: 201,
      message: "Musyrif berhasil ditambahkan",
      data: created.rows[0],
    });
  }),
);

router.post(
  "/halaqoh/musyrif/import",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const payload = Array.isArray(req.body) ? { musyrif: req.body } : req.body;
    const rows = Array.isArray(payload?.musyrif) ? payload.musyrif : [];
    const scopedHomebaseId = req.user.homebase_id || null;
    const defaultHomebaseId = scopedHomebaseId || toIntOrNull(payload?.homebase_id);

    if (!rows.length) {
      return res.status(400).json({ message: "Data import musyrif tidak valid." });
    }

    let imported = 0;
    let skippedInvalid = 0;
    let skippedDuplicate = 0;
    const seenUsernames = new Set();

    for (const row of rows) {
      const homebaseId = scopedHomebaseId || toIntOrNull(row?.homebase_id) || defaultHomebaseId;
      const fullName = normalizeText(row?.full_name || row?.name);
      const username = normalizeUsername(row?.username);
      const password = normalizeText(row?.password);
      const phone = normalizeText(row?.phone) || null;
      const gender = normalizeGender(row?.gender);
      const notes = normalizeText(row?.notes) || null;
      const isActive = toBool(row?.is_active, true);

      if (!homebaseId || !fullName || !username || !password) {
        skippedInvalid++;
        continue;
      }

      if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        skippedInvalid++;
        continue;
      }

      const homebase = await client.query(
        `SELECT id
         FROM a_homebase
         WHERE id = $1
         LIMIT 1`,
        [homebaseId],
      );

      if (!homebase.rows.length) {
        skippedInvalid++;
        continue;
      }

      if (seenUsernames.has(username)) {
        skippedDuplicate++;
        continue;
      }
      seenUsernames.add(username);

      const duplicateUser = await client.query(
        `SELECT id
         FROM u_users
         WHERE username = $1
         LIMIT 1`,
        [username],
      );

      if (duplicateUser.rows.length) {
        skippedDuplicate++;
        continue;
      }

      const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
      const createdUser = await client.query(
        `INSERT INTO u_users (username, password, full_name, role, is_active)
         VALUES ($1, $2, $3, 'admin', $4)
         RETURNING id`,
        [username, hashedPassword, fullName, isActive],
      );

      const userId = createdUser.rows[0].id;

      await client.query(
        `INSERT INTO u_admin (user_id, homebase_id, level)
         VALUES ($1, $2, 'tahfiz')
         ON CONFLICT (user_id)
         DO UPDATE SET homebase_id = EXCLUDED.homebase_id, level = 'tahfiz'`,
        [userId, homebaseId],
      );

      await client.query(
        `INSERT INTO tahfiz.t_musyrif (homebase_id, user_id, full_name, phone, gender, is_active, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [homebaseId, userId, fullName, phone, gender, isActive, notes],
      );

      imported++;
    }

    return res.status(201).json({
      code: 201,
      message: `Berhasil mengimpor ${imported} dari ${rows.length} data musyrif.`,
      summary: {
        total: rows.length,
        imported,
        skipped_invalid: skippedInvalid,
        skipped_duplicate: skippedDuplicate,
      },
    });
  }),
);

router.put(
  "/halaqoh/musyrif/:id",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const id = toIntOrNull(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID musyrif tidak valid." });
    }

    const musyrif = await client.query(
      `SELECT id, homebase_id, user_id FROM tahfiz.t_musyrif WHERE id = $1`,
      [id],
    );
    if (!musyrif.rows.length) {
      return res.status(404).json({ message: "Musyrif tidak ditemukan." });
    }

    if (req.user.homebase_id && musyrif.rows[0].homebase_id !== req.user.homebase_id) {
      return res.status(403).json({ message: "Akses musyrif ditolak." });
    }

    const requestedHomebaseId = toIntOrNull(req.body.homebase_id);
    const nextHomebaseId =
      req.user.homebase_id || requestedHomebaseId || musyrif.rows[0].homebase_id;
    const fullName = req.body.full_name?.trim();
    const username = normalizeUsername(req.body.username);
    const nextPassword = String(req.body.password || "").trim();

    if (!fullName) {
      return res.status(400).json({ message: "Nama musyrif wajib diisi." });
    }
    if (!username) {
      return res.status(400).json({ message: "Username wajib diisi." });
    }

    const currentUserId = musyrif.rows[0].user_id;
    let nextUserId = currentUserId;

    if (currentUserId) {
      const duplicate = await client.query(
        `SELECT id FROM u_users WHERE username = $1 AND id <> $2 LIMIT 1`,
        [username, currentUserId],
      );
      if (duplicate.rows.length) {
        return res.status(400).json({ message: "Username sudah digunakan." });
      }
    } else {
      const duplicate = await client.query(
        `SELECT id FROM u_users WHERE username = $1 LIMIT 1`,
        [username],
      );
      if (duplicate.rows.length) {
        return res.status(400).json({ message: "Username sudah digunakan." });
      }
    }

    if (currentUserId) {
      if (nextPassword) {
        const hashedPassword = await bcrypt.hash(nextPassword, 10);
        await client.query(
          `UPDATE u_users
           SET username = $1,
               full_name = $2,
               is_active = $3,
               password = $4
           WHERE id = $5`,
          [username, fullName, toBool(req.body.is_active, true), hashedPassword, currentUserId],
        );
      } else {
        await client.query(
          `UPDATE u_users
           SET username = $1,
               full_name = $2,
               is_active = $3
           WHERE id = $4`,
          [username, fullName, toBool(req.body.is_active, true), currentUserId],
        );
      }
    } else {
      if (!nextPassword) {
        return res
          .status(400)
          .json({ message: "Password wajib diisi untuk musyrif yang belum punya akun login." });
      }
      const hashedPassword = await bcrypt.hash(nextPassword, 10);
      const createdUser = await client.query(
        `INSERT INTO u_users (username, password, full_name, role, is_active)
         VALUES ($1, $2, $3, 'admin', $4)
         RETURNING id`,
        [username, hashedPassword, fullName, toBool(req.body.is_active, true)],
      );
      nextUserId = createdUser.rows[0].id;
    }

    await client.query(
      `INSERT INTO u_admin (user_id, homebase_id, level)
       VALUES ($1, $2, 'tahfiz')
       ON CONFLICT (user_id)
       DO UPDATE SET homebase_id = EXCLUDED.homebase_id, level = 'tahfiz'`,
      [nextUserId, nextHomebaseId],
    );

    const updated = await client.query(
      `UPDATE tahfiz.t_musyrif
       SET homebase_id = $1,
           user_id = $2,
           full_name = $3,
           phone = $4,
           gender = $5,
           is_active = $6,
           notes = $7,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING *`,
      [
        nextHomebaseId,
        nextUserId,
        fullName,
        req.body.phone?.trim() || null,
        req.body.gender?.trim() || null,
        toBool(req.body.is_active, true),
        req.body.notes?.trim() || null,
        id,
      ],
    );

    return res.json({
      code: 200,
      message: "Musyrif berhasil diperbarui",
      data: updated.rows[0],
    });
  }),
);

router.delete(
  "/halaqoh/musyrif/:id",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const id = toIntOrNull(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID musyrif tidak valid." });
    }

    const musyrif = await client.query(
      `SELECT id, homebase_id, user_id FROM tahfiz.t_musyrif WHERE id = $1`,
      [id],
    );
    if (!musyrif.rows.length) {
      return res.status(404).json({ message: "Musyrif tidak ditemukan." });
    }

    if (req.user.homebase_id && musyrif.rows[0].homebase_id !== req.user.homebase_id) {
      return res.status(403).json({ message: "Akses musyrif ditolak." });
    }

    const usage = await client.query(
      `SELECT EXISTS(SELECT 1 FROM tahfiz.t_halaqoh WHERE musyrif_id = $1) AS in_halaqoh,
              EXISTS(SELECT 1 FROM tahfiz.t_daily_record WHERE musyrif_id = $1) AS in_daily_record`,
      [id],
    );

    if (usage.rows[0].in_halaqoh || usage.rows[0].in_daily_record) {
      return res.status(400).json({
        message: "Musyrif sudah dipakai pada halaqoh/setoran dan tidak bisa dihapus.",
      });
    }

    await client.query(`DELETE FROM tahfiz.t_musyrif WHERE id = $1`, [id]);
    if (musyrif.rows[0].user_id) {
      await client.query(`DELETE FROM u_users WHERE id = $1`, [musyrif.rows[0].user_id]);
    }

    return res.json({
      code: 200,
      message: "Musyrif berhasil dihapus",
    });
  }),
);

router.get(
  "/halaqoh/list",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const scopedHomebaseId = req.user.homebase_id || null;
    const requestedHomebaseId = toIntOrNull(req.query.homebase_id);
    const selectedHomebaseId = await resolveSelectedHomebase(
      pool,
      scopedHomebaseId,
      requestedHomebaseId,
    );
    const periodeId = toIntOrNull(req.query.periode_id);

    const params = [];
    const filters = [];

    if (selectedHomebaseId) {
      params.push(selectedHomebaseId);
      filters.push(`p.homebase_id = $${params.length}`);
    }

    if (periodeId) {
      params.push(periodeId);
      filters.push(`h.periode_id = $${params.length}`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const result = await pool.query(
      `SELECT
         h.id,
         h.periode_id,
         p.name AS periode_name,
         p.homebase_id,
         hb.name AS homebase_name,
         h.name,
         h.musyrif_id,
         m.full_name AS musyrif_name,
         m.phone AS musyrif_phone,
         h.is_active,
         COUNT(DISTINCT hs.student_id) AS student_count,
         COALESCE(
           json_agg(
             DISTINCT jsonb_build_object(
               'id', u.id,
               'full_name', u.full_name,
               'nis', s.nis
             )
           ) FILTER (WHERE u.id IS NOT NULL),
           '[]'::json
         ) AS students
       FROM tahfiz.t_halaqoh h
       JOIN a_periode p ON p.id = h.periode_id
       LEFT JOIN a_homebase hb ON hb.id = p.homebase_id
       LEFT JOIN tahfiz.t_musyrif m ON m.id = h.musyrif_id
       LEFT JOIN tahfiz.t_halaqoh_students hs ON hs.halaqoh_id = h.id
       LEFT JOIN u_students s ON s.user_id = hs.student_id
       LEFT JOIN u_users u ON u.id = s.user_id
       ${whereClause}
       GROUP BY h.id, p.name, p.homebase_id, hb.name, m.full_name, m.phone
       ORDER BY h.id DESC`,
      params,
    );

    return res.json({
      code: 200,
      message: "Data halaqoh berhasil dimuat",
      data: result.rows,
    });
  }),
);

router.get(
  "/halaqoh/musyrif/list",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const requestedPeriodeId = toIntOrNull(req.query.periode_id);

    const musyrifResult = await pool.query(
      `SELECT id, homebase_id, full_name
       FROM tahfiz.t_musyrif
       WHERE user_id = $1
         AND is_active = true
       LIMIT 1`,
      [req.user.id],
    );

    if (!musyrifResult.rows.length) {
      return res.status(403).json({ message: "Akses musyrif ditolak." });
    }

    const musyrif = musyrifResult.rows[0];
    const periodesResult = await pool.query(
      `SELECT id, name, is_active
       FROM a_periode
       WHERE homebase_id = $1
       ORDER BY is_active DESC, id DESC`,
      [musyrif.homebase_id],
    );

    const periodes = periodesResult.rows;
    const activePeriode = periodes.find((item) => item.is_active) || null;

    let selectedPeriodeId = null;
    if (requestedPeriodeId && periodes.some((item) => item.id === requestedPeriodeId)) {
      selectedPeriodeId = requestedPeriodeId;
    } else if (activePeriode) {
      selectedPeriodeId = activePeriode.id;
    } else if (periodes.length) {
      selectedPeriodeId = periodes[0].id;
    }

    if (!selectedPeriodeId) {
      return res.json({
        code: 200,
        message: "Daftar halaqoh musyrif berhasil dimuat",
        data: {
          musyrif,
          filters: {
            periodes,
            selected_periode_id: null,
            active_periode_id: activePeriode?.id || null,
          },
          halaqoh: [],
        },
      });
    }

    const halaqohResult = await pool.query(
      `SELECT
         h.id,
         h.name,
         h.is_active,
         COUNT(DISTINCT hs.student_id) AS student_count,
         COALESCE(
           json_agg(
             DISTINCT jsonb_build_object(
               'id', u.id,
               'full_name', u.full_name,
               'nis', s.nis,
               'class_name', COALESCE(c_latest.class_name, '-')
             )
           ) FILTER (WHERE u.id IS NOT NULL),
           '[]'::json
         ) AS students
       FROM tahfiz.t_halaqoh h
       LEFT JOIN tahfiz.t_halaqoh_students hs ON hs.halaqoh_id = h.id
       LEFT JOIN u_students s ON s.user_id = hs.student_id
       LEFT JOIN u_users u ON u.id = hs.student_id
       LEFT JOIN LATERAL (
         SELECT c.name AS class_name
         FROM u_class_enrollments e
         LEFT JOIN a_class c ON c.id = e.class_id
         WHERE e.student_id = hs.student_id
           AND e.periode_id = h.periode_id
         ORDER BY e.id DESC
         LIMIT 1
       ) c_latest ON true
       WHERE h.musyrif_id = $1
         AND h.periode_id = $2
       GROUP BY h.id, h.name, h.is_active
       ORDER BY h.is_active DESC, h.name ASC`,
      [musyrif.id, selectedPeriodeId],
    );

    return res.json({
      code: 200,
      message: "Daftar halaqoh musyrif berhasil dimuat",
      data: {
        musyrif,
        filters: {
          periodes,
          selected_periode_id: selectedPeriodeId,
          active_periode_id: activePeriode?.id || null,
        },
        halaqoh: halaqohResult.rows,
      },
    });
  }),
);

router.post(
  "/halaqoh/list",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const periodeId = toIntOrNull(req.body.periode_id);
    const musyrifId = toIntOrNull(req.body.musyrif_id);
    const name = req.body.name?.trim();
    const studentIds = normalizeStudentIds(req.body.student_ids);

    if (!periodeId || !musyrifId || !name) {
      return res.status(400).json({ message: "Periode, musyrif, dan nama halaqoh wajib diisi." });
    }

    const periodeScope = await ensurePeriodeScope(client, periodeId, req.user.homebase_id || null);
    if (!periodeScope.ok) {
      return res.status(400).json({ message: periodeScope.message });
    }

    const homebaseId = periodeScope.data.homebase_id;

    const musyrifScope = await ensureMusyrifScope(client, musyrifId, homebaseId);
    if (!musyrifScope.ok) {
      return res.status(400).json({ message: musyrifScope.message });
    }

    const studentScope = await ensureStudentsScope(client, studentIds, homebaseId);
    if (!studentScope.ok) {
      return res.status(400).json({ message: studentScope.message });
    }

    const created = await client.query(
      `INSERT INTO tahfiz.t_halaqoh (periode_id, name, musyrif_id, is_active)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [periodeId, name, musyrifId, toBool(req.body.is_active, true)],
    );

    const halaqohId = created.rows[0].id;

    if (studentIds.length) {
      await client.query(
        `INSERT INTO tahfiz.t_halaqoh_students (halaqoh_id, student_id)
         SELECT $1, unnest($2::int[])
         ON CONFLICT (halaqoh_id, student_id) DO NOTHING`,
        [halaqohId, studentIds],
      );
    }

    return res.status(201).json({
      code: 201,
      message: "Halaqoh berhasil ditambahkan",
      data: created.rows[0],
    });
  }),
);

router.post(
  "/halaqoh/list/import",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const payload = Array.isArray(req.body) ? { halaqoh: req.body } : req.body;
    const rows = Array.isArray(payload?.halaqoh) ? payload.halaqoh : [];

    if (!rows.length) {
      return res.status(400).json({ message: "Data import halaqoh tidak valid." });
    }

    let imported = 0;
    let skippedInvalid = 0;
    let skippedDuplicate = 0;
    const seenKeys = new Set();

    for (const row of rows) {
      const periodeId = toIntOrNull(row?.periode_id);
      const musyrifId = toIntOrNull(row?.musyrif_id);
      const name = normalizeText(row?.name);
      const studentIds = normalizeStudentIds(row?.student_ids);
      const isActive = toBool(row?.is_active, true);

      if (!periodeId || !musyrifId || !name) {
        skippedInvalid++;
        continue;
      }

      const periodeScope = await ensurePeriodeScope(client, periodeId, null);
      if (!periodeScope.ok) {
        skippedInvalid++;
        continue;
      }

      const homebaseId = periodeScope.data.homebase_id;

      const musyrifScope = await ensureMusyrifScope(client, musyrifId, homebaseId);
      if (!musyrifScope.ok) {
        skippedInvalid++;
        continue;
      }

      const studentScope = await ensureStudentsScope(client, studentIds, homebaseId);
      if (!studentScope.ok) {
        skippedInvalid++;
        continue;
      }

      const dedupeKey = `${periodeId}::${normalizeKey(name)}`;
      if (seenKeys.has(dedupeKey)) {
        skippedDuplicate++;
        continue;
      }
      seenKeys.add(dedupeKey);

      const duplicate = await client.query(
        `SELECT id
         FROM tahfiz.t_halaqoh
         WHERE periode_id = $1
           AND LOWER(name) = LOWER($2)
         LIMIT 1`,
        [periodeId, name],
      );

      if (duplicate.rows.length) {
        skippedDuplicate++;
        continue;
      }

      const created = await client.query(
        `INSERT INTO tahfiz.t_halaqoh (periode_id, name, musyrif_id, is_active)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [periodeId, name, musyrifId, isActive],
      );

      const halaqohId = created.rows[0].id;

      if (studentIds.length) {
        await client.query(
          `INSERT INTO tahfiz.t_halaqoh_students (halaqoh_id, student_id)
           SELECT $1, unnest($2::int[])
           ON CONFLICT (halaqoh_id, student_id) DO NOTHING`,
          [halaqohId, studentIds],
        );
      }

      imported++;
    }

    return res.status(201).json({
      code: 201,
      message: `Berhasil mengimpor ${imported} dari ${rows.length} data halaqoh.`,
      summary: {
        total: rows.length,
        imported,
        skipped_invalid: skippedInvalid,
        skipped_duplicate: skippedDuplicate,
      },
    });
  }),
);

router.put(
  "/halaqoh/list/:id",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const id = toIntOrNull(req.params.id);
    const periodeId = toIntOrNull(req.body.periode_id);
    const musyrifId = toIntOrNull(req.body.musyrif_id);
    const name = req.body.name?.trim();
    const studentIds = normalizeStudentIds(req.body.student_ids);

    if (!id || !periodeId || !musyrifId || !name) {
      return res.status(400).json({ message: "Data halaqoh tidak lengkap." });
    }

    const existing = await client.query(
      `SELECT h.id, p.homebase_id
       FROM tahfiz.t_halaqoh h
       JOIN a_periode p ON p.id = h.periode_id
       WHERE h.id = $1`,
      [id],
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: "Halaqoh tidak ditemukan." });
    }

    if (req.user.homebase_id && existing.rows[0].homebase_id !== req.user.homebase_id) {
      return res.status(403).json({ message: "Akses halaqoh ditolak." });
    }

    const periodeScope = await ensurePeriodeScope(client, periodeId, req.user.homebase_id || null);
    if (!periodeScope.ok) {
      return res.status(400).json({ message: periodeScope.message });
    }

    const homebaseId = periodeScope.data.homebase_id;

    const musyrifScope = await ensureMusyrifScope(client, musyrifId, homebaseId);
    if (!musyrifScope.ok) {
      return res.status(400).json({ message: musyrifScope.message });
    }

    const studentScope = await ensureStudentsScope(client, studentIds, homebaseId);
    if (!studentScope.ok) {
      return res.status(400).json({ message: studentScope.message });
    }

    const updated = await client.query(
      `UPDATE tahfiz.t_halaqoh
       SET periode_id = $1,
           name = $2,
           musyrif_id = $3,
           is_active = $4
       WHERE id = $5
       RETURNING *`,
      [periodeId, name, musyrifId, toBool(req.body.is_active, true), id],
    );

    await client.query(`DELETE FROM tahfiz.t_halaqoh_students WHERE halaqoh_id = $1`, [id]);

    if (studentIds.length) {
      await client.query(
        `INSERT INTO tahfiz.t_halaqoh_students (halaqoh_id, student_id)
         SELECT $1, unnest($2::int[])
         ON CONFLICT (halaqoh_id, student_id) DO NOTHING`,
        [id, studentIds],
      );
    }

    return res.json({
      code: 200,
      message: "Halaqoh berhasil diperbarui",
      data: updated.rows[0],
    });
  }),
);

router.delete(
  "/halaqoh/list/:id",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const id = toIntOrNull(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID halaqoh tidak valid." });
    }

    const existing = await client.query(
      `SELECT h.id, p.homebase_id
       FROM tahfiz.t_halaqoh h
       JOIN a_periode p ON p.id = h.periode_id
       WHERE h.id = $1`,
      [id],
    );

    if (!existing.rows.length) {
      return res.status(404).json({ message: "Halaqoh tidak ditemukan." });
    }

    if (req.user.homebase_id && existing.rows[0].homebase_id !== req.user.homebase_id) {
      return res.status(403).json({ message: "Akses halaqoh ditolak." });
    }

    const recordUsage = await client.query(
      `SELECT COUNT(*)::int AS total
       FROM tahfiz.t_daily_record
       WHERE halaqoh_id = $1`,
      [id],
    );

    if (recordUsage.rows[0].total > 0) {
      return res.status(400).json({
        message: "Halaqoh sudah memiliki data setoran dan tidak bisa dihapus.",
      });
    }

    await client.query(`DELETE FROM tahfiz.t_halaqoh_students WHERE halaqoh_id = $1`, [id]);
    await client.query(`DELETE FROM tahfiz.t_halaqoh WHERE id = $1`, [id]);

    return res.json({
      code: 200,
      message: "Halaqoh berhasil dihapus",
    });
  }),
);

export default router;
