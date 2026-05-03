import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

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

const resolveSelectedHomebase = async (db, userHomebaseId, requestedHomebaseId) => {
  if (userHomebaseId) {
    return userHomebaseId;
  }

  if (requestedHomebaseId) {
    const homebase = await db.query(`SELECT id FROM a_homebase WHERE id = $1`, [requestedHomebaseId]);
    return homebase.rows.length ? requestedHomebaseId : null;
  }

  const fallback = await db.query(`SELECT id FROM a_homebase ORDER BY name ASC LIMIT 1`);
  return fallback.rows[0]?.id || null;
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

    const periodesQuery = selectedHomebaseId
      ? pool.query(
          `SELECT id, homebase_id, name, is_active
           FROM a_periode
           WHERE homebase_id = $1
           ORDER BY is_active DESC, id DESC`,
          [selectedHomebaseId],
        )
      : pool.query(
          `SELECT id, homebase_id, name, is_active
           FROM a_periode
           ORDER BY id DESC`,
        );

    const musyrifQuery = selectedHomebaseId
      ? pool.query(
          `SELECT id, homebase_id, full_name, phone, gender, is_active
           FROM tahfiz.t_musyrif
           WHERE homebase_id = $1
           ORDER BY full_name ASC`,
          [selectedHomebaseId],
        )
      : pool.query(
          `SELECT id, homebase_id, full_name, phone, gender, is_active
           FROM tahfiz.t_musyrif
           ORDER BY full_name ASC`,
        );

    const studentsQuery = selectedHomebaseId
      ? pool.query(
          `SELECT
             s.user_id AS id,
             s.nis,
             u.full_name,
             COALESCE(c.name, '-') AS class_name
           FROM u_students s
           JOIN u_users u ON u.id = s.user_id
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
             s.nis,
             u.full_name,
             COALESCE(c.name, '-') AS class_name
           FROM u_students s
           JOIN u_users u ON u.id = s.user_id
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

    const [homebasesResult, periodesResult, musyrifResult, studentsResult] = await Promise.all([
      homebasesQuery,
      periodesQuery,
      musyrifQuery,
      studentsQuery,
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
         h.name AS homebase_name,
         m.full_name,
         m.phone,
         m.gender,
         m.is_active,
         m.notes,
         m.created_at,
         m.updated_at,
         COUNT(DISTINCT q.id) AS halaqoh_count
       FROM tahfiz.t_musyrif m
       LEFT JOIN a_homebase h ON h.id = m.homebase_id
       LEFT JOIN tahfiz.t_halaqoh q ON q.musyrif_id = m.id
       ${whereClause}
       GROUP BY m.id, h.name
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
    if (!fullName) {
      return res.status(400).json({ message: "Nama musyrif wajib diisi." });
    }

    const homebase = await client.query(`SELECT id FROM a_homebase WHERE id = $1`, [homebaseId]);
    if (!homebase.rows.length) {
      return res.status(404).json({ message: "Homebase tidak ditemukan." });
    }

    const created = await client.query(
      `INSERT INTO tahfiz.t_musyrif (homebase_id, full_name, phone, gender, is_active, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        homebaseId,
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

router.put(
  "/halaqoh/musyrif/:id",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const id = toIntOrNull(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID musyrif tidak valid." });
    }

    const musyrif = await client.query(
      `SELECT id, homebase_id FROM tahfiz.t_musyrif WHERE id = $1`,
      [id],
    );
    if (!musyrif.rows.length) {
      return res.status(404).json({ message: "Musyrif tidak ditemukan." });
    }

    if (req.user.homebase_id && musyrif.rows[0].homebase_id !== req.user.homebase_id) {
      return res.status(403).json({ message: "Akses musyrif ditolak." });
    }

    const requestedHomebaseId = toIntOrNull(req.body.homebase_id);
    const nextHomebaseId = req.user.homebase_id || requestedHomebaseId || musyrif.rows[0].homebase_id;
    const fullName = req.body.full_name?.trim();

    if (!fullName) {
      return res.status(400).json({ message: "Nama musyrif wajib diisi." });
    }

    const updated = await client.query(
      `UPDATE tahfiz.t_musyrif
       SET homebase_id = $1,
           full_name = $2,
           phone = $3,
           gender = $4,
           is_active = $5,
           notes = $6,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [
        nextHomebaseId,
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
      `SELECT id, homebase_id FROM tahfiz.t_musyrif WHERE id = $1`,
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
