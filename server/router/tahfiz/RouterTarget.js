import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const hasColumn = async (db, tableName, columnName) => {
  const result = await db.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [tableName, columnName],
  );

  return result.rows.length > 0;
};

const toNullableInt = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const normalizeItems = (items = []) => {
  if (!Array.isArray(items)) return [];

  return items
    .map((item, index) => ({
      target_type: item.target_type,
      juz_id: toNullableInt(item.juz_id),
      surah_id: toNullableInt(item.surah_id),
      start_ayat: toNullableInt(item.start_ayat),
      end_ayat: toNullableInt(item.end_ayat),
      order_no: toNullableInt(item.order_no) || index + 1,
      is_mandatory: item.is_mandatory !== false,
      notes: item.notes || null,
    }))
    .filter((item) => item.target_type === "juz" || item.target_type === "surah");
};

const validateItems = (items) => {
  if (!items.length) {
    return "Minimal 1 item target wajib diisi.";
  }

  for (const item of items) {
    if (item.target_type === "juz") {
      if (!item.juz_id || item.surah_id) {
        return "Target tipe juz wajib memilih juz dan tidak boleh memilih surah.";
      }
    }

    if (item.target_type === "surah") {
      if (!item.surah_id || item.juz_id) {
        return "Target tipe surah wajib memilih surah dan tidak boleh memilih juz.";
      }
      const hasRange = item.start_ayat != null || item.end_ayat != null;
      if (hasRange) {
        if (item.start_ayat == null || item.end_ayat == null) {
          return "Jika mengisi rentang ayat, start dan end ayat harus diisi lengkap.";
        }
        if (item.start_ayat > item.end_ayat) {
          return "Start ayat tidak boleh lebih besar dari end ayat.";
        }
      }
    }
  }

  return null;
};

const validatePlanScope = async (db, { homebaseId, periodeId, gradeId }) => {
  const periode = await db.query(`SELECT id, homebase_id FROM a_periode WHERE id = $1`, [
    periodeId,
  ]);
  if (!periode.rows.length) {
    return "Periode tidak ditemukan.";
  }

  const grade = await db.query(`SELECT id, homebase_id FROM a_grade WHERE id = $1`, [
    gradeId,
  ]);
  if (!grade.rows.length) {
    return "Tingkat/grade tidak ditemukan.";
  }

  if (homebaseId) {
    const homebase = await db.query(`SELECT id FROM a_homebase WHERE id = $1`, [homebaseId]);
    if (!homebase.rows.length) {
      return "Homebase tidak ditemukan.";
    }

    if (periode.rows[0].homebase_id !== homebaseId) {
      return "Periode tidak sesuai dengan homebase yang dipilih.";
    }

    if (grade.rows[0].homebase_id !== homebaseId) {
      return "Grade tidak sesuai dengan homebase yang dipilih.";
    }
  }

  return null;
};

router.get(
  "/target/options",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const scopedHomebaseId = req.user.homebase_id || null;
    const requestedHomebaseId = toNullableInt(req.query.homebase_id);
    const selectedHomebaseId = scopedHomebaseId || requestedHomebaseId || null;

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

    const gradesQuery = selectedHomebaseId
      ? pool.query(
          `SELECT id, homebase_id, name
           FROM a_grade
           WHERE homebase_id = $1
           ORDER BY name ASC`,
          [selectedHomebaseId],
        )
      : pool.query(
          `SELECT id, homebase_id, name
           FROM a_grade
           ORDER BY name ASC`,
        );

    const hasJuzLineCount = await hasColumn(pool, "t_juz", "line_count");
    const juzLineSelect = hasJuzLineCount ? "line_count" : "NULL::integer AS line_count";

    const [homebasesResult, periodesResult, gradesResult, juzResult, surahResult] =
      await Promise.all([
        homebasesQuery,
        periodesQuery,
        gradesQuery,
        pool.query(
          `SELECT id, number, description, ${juzLineSelect}
           FROM t_juz
           ORDER BY number ASC`,
        ),
        pool.query(
          `SELECT id, number, name_latin, total_ayat
           FROM t_surah
           ORDER BY number ASC`,
        ),
      ]);

    return res.json({
      code: 200,
      message: "Referensi target berhasil dimuat",
      data: {
        selected_homebase_id: selectedHomebaseId,
        homebases: homebasesResult.rows,
        periodes: periodesResult.rows,
        grades: gradesResult.rows,
        juz: juzResult.rows,
        surah: surahResult.rows,
      },
    });
  }),
);

router.get(
  "/target/plans",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const scopedHomebaseId = req.user.homebase_id || null;

    const filters = [];
    const params = [];

    if (scopedHomebaseId) {
      params.push(scopedHomebaseId);
      filters.push(`COALESCE(p.homebase_id, ${scopedHomebaseId}) = $${params.length}`);
    } else {
      const homebaseId = toNullableInt(req.query.homebase_id);
      if (homebaseId) {
        params.push(homebaseId);
        filters.push(`COALESCE(p.homebase_id, $${params.length}) = $${params.length}`);
      }
    }

    const periodeId = toNullableInt(req.query.periode_id);
    if (periodeId) {
      params.push(periodeId);
      filters.push(`p.periode_id = $${params.length}`);
    }

    const gradeId = toNullableInt(req.query.grade_id);
    if (gradeId) {
      params.push(gradeId);
      filters.push(`p.grade_id = $${params.length}`);
    }

    if (req.query.search) {
      params.push(`%${req.query.search}%`);
      filters.push(`(
        p.title ILIKE $${params.length}
        OR pe.name ILIKE $${params.length}
        OR g.name ILIKE $${params.length}
        OR hb.name ILIKE $${params.length}
      )`);
    }

    const whereClause = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const hasJuzLineCount = await hasColumn(pool, "t_juz", "line_count");
    const juzLineExpr = hasJuzLineCount ? "j.line_count" : "NULL::integer";

    const plansQuery = await pool.query(
      `SELECT
         p.id,
         p.periode_id,
         p.homebase_id,
         p.grade_id,
         p.title,
         p.notes,
         p.is_active,
         p.created_at,
         p.updated_at,
         pe.name AS periode_name,
         g.name AS grade_name,
         hb.name AS homebase_name,
         COALESCE(
           json_agg(
             jsonb_build_object(
               'id', i.id,
               'target_type', i.target_type,
               'juz_id', i.juz_id,
               'surah_id', i.surah_id,
               'start_ayat', i.start_ayat,
               'end_ayat', i.end_ayat,
               'order_no', i.order_no,
               'is_mandatory', i.is_mandatory,
               'notes', i.notes,
               'juz_number', j.number,
               'juz_line_count', ${juzLineExpr},
               'surah_number', s.number,
               'surah_name_latin', s.name_latin,
               'surah_total_ayat', s.total_ayat
             )
             ORDER BY i.order_no ASC, i.id ASC
           ) FILTER (WHERE i.id IS NOT NULL),
           '[]'::json
         ) AS items
       FROM t_target_plan p
       JOIN a_periode pe ON pe.id = p.periode_id
       JOIN a_grade g ON g.id = p.grade_id
       LEFT JOIN a_homebase hb ON hb.id = p.homebase_id
       LEFT JOIN t_target_item i ON i.plan_id = p.id
       LEFT JOIN t_juz j ON j.id = i.juz_id
       LEFT JOIN t_surah s ON s.id = i.surah_id
       ${whereClause}
       GROUP BY p.id, pe.name, g.name, hb.name
       ORDER BY p.is_active DESC, p.updated_at DESC, p.id DESC`,
      params,
    );

    const summaryQuery = await pool.query(
      `SELECT
         COUNT(*)::int AS total_plans,
         COUNT(*) FILTER (WHERE p.is_active = true)::int AS active_plans
       FROM t_target_plan p
       JOIN a_periode pe ON pe.id = p.periode_id
       JOIN a_grade g ON g.id = p.grade_id
       LEFT JOIN a_homebase hb ON hb.id = p.homebase_id
       ${whereClause}`,
      params,
    );

    const totalItems = plansQuery.rows.reduce(
      (accumulator, plan) => accumulator + (Array.isArray(plan.items) ? plan.items.length : 0),
      0,
    );

    return res.json({
      code: 200,
      message: "Daftar target berhasil dimuat",
      data: {
        plans: plansQuery.rows,
        summary: {
          total_plans: summaryQuery.rows[0]?.total_plans || 0,
          active_plans: summaryQuery.rows[0]?.active_plans || 0,
          total_items: totalItems,
        },
      },
    });
  }),
);

router.post(
  "/target/plans",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const scopedHomebaseId = req.user.homebase_id || null;

    const periodeId = toNullableInt(req.body.periode_id);
    const gradeId = toNullableInt(req.body.grade_id);
    const requestedHomebaseId = toNullableInt(req.body.homebase_id);
    const homebaseId = scopedHomebaseId || requestedHomebaseId || null;
    const title = req.body.title?.trim() || null;
    const notes = req.body.notes?.trim() || null;
    const isActive = req.body.is_active !== false;
    const items = normalizeItems(req.body.items);

    if (!homebaseId || !periodeId || !gradeId) {
      return res.status(400).json({
        message: "Satuan (homebase), periode, dan grade wajib dipilih.",
      });
    }

    const itemError = validateItems(items);
    if (itemError) {
      return res.status(400).json({ message: itemError });
    }

    const scopeError = await validatePlanScope(client, { homebaseId, periodeId, gradeId });
    if (scopeError) {
      return res.status(400).json({ message: scopeError });
    }

    try {
      const planResult = await client.query(
        `INSERT INTO t_target_plan
         (periode_id, homebase_id, grade_id, title, notes, is_active, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
        [periodeId, homebaseId, gradeId, title, notes, isActive, req.user.id],
      );

      const planId = planResult.rows[0].id;

      for (const item of items) {
        await client.query(
          `INSERT INTO t_target_item
           (plan_id, target_type, juz_id, surah_id, start_ayat, end_ayat, order_no, is_mandatory, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            planId,
            item.target_type,
            item.juz_id,
            item.surah_id,
            item.start_ayat,
            item.end_ayat,
            item.order_no,
            item.is_mandatory,
            item.notes,
          ],
        );
      }

      return res.status(201).json({
        code: 201,
        message: "Target plan berhasil dibuat",
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "Kombinasi periode, homebase, dan grade sudah memiliki target plan.",
        });
      }
      throw error;
    }
  }),
);

router.put(
  "/target/plans/:id",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const planId = toNullableInt(req.params.id);
    if (!planId) {
      return res.status(400).json({ message: "ID target plan tidak valid." });
    }

    const scopedHomebaseId = req.user.homebase_id || null;
    const periodeId = toNullableInt(req.body.periode_id);
    const gradeId = toNullableInt(req.body.grade_id);
    const requestedHomebaseId = toNullableInt(req.body.homebase_id);
    const homebaseId = scopedHomebaseId || requestedHomebaseId || null;
    const title = req.body.title?.trim() || null;
    const notes = req.body.notes?.trim() || null;
    const isActive = req.body.is_active !== false;
    const items = normalizeItems(req.body.items);

    if (!homebaseId || !periodeId || !gradeId) {
      return res.status(400).json({
        message: "Satuan (homebase), periode, dan grade wajib dipilih.",
      });
    }

    const existing = await client.query(`SELECT id, homebase_id FROM t_target_plan WHERE id = $1`, [
      planId,
    ]);

    if (!existing.rows.length) {
      return res.status(404).json({ message: "Target plan tidak ditemukan." });
    }

    if (scopedHomebaseId && existing.rows[0].homebase_id !== scopedHomebaseId) {
      return res.status(403).json({ message: "Akses ditolak untuk target plan ini." });
    }

    const itemError = validateItems(items);
    if (itemError) {
      return res.status(400).json({ message: itemError });
    }

    const scopeError = await validatePlanScope(client, { homebaseId, periodeId, gradeId });
    if (scopeError) {
      return res.status(400).json({ message: scopeError });
    }

    try {
      await client.query(
        `UPDATE t_target_plan
         SET periode_id = $1,
             homebase_id = $2,
             grade_id = $3,
             title = $4,
             notes = $5,
             is_active = $6,
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $7`,
        [periodeId, homebaseId, gradeId, title, notes, isActive, planId],
      );

      await client.query(`DELETE FROM t_target_item WHERE plan_id = $1`, [planId]);

      for (const item of items) {
        await client.query(
          `INSERT INTO t_target_item
           (plan_id, target_type, juz_id, surah_id, start_ayat, end_ayat, order_no, is_mandatory, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            planId,
            item.target_type,
            item.juz_id,
            item.surah_id,
            item.start_ayat,
            item.end_ayat,
            item.order_no,
            item.is_mandatory,
            item.notes,
          ],
        );
      }

      return res.json({
        code: 200,
        message: "Target plan berhasil diperbarui",
      });
    } catch (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          message: "Kombinasi periode, homebase, dan grade sudah memiliki target plan.",
        });
      }
      throw error;
    }
  }),
);

router.delete(
  "/target/plans/:id",
  authorize("admin", "tahfiz"),
  withTransaction(async (req, res, client) => {
    const planId = toNullableInt(req.params.id);
    if (!planId) {
      return res.status(400).json({ message: "ID target plan tidak valid." });
    }

    const scopedHomebaseId = req.user.homebase_id || null;

    const existing = await client.query(`SELECT id, homebase_id FROM t_target_plan WHERE id = $1`, [
      planId,
    ]);

    if (!existing.rows.length) {
      return res.status(404).json({ message: "Target plan tidak ditemukan." });
    }

    if (scopedHomebaseId && existing.rows[0].homebase_id !== scopedHomebaseId) {
      return res.status(403).json({ message: "Akses ditolak untuk target plan ini." });
    }

    await client.query(`DELETE FROM t_target_plan WHERE id = $1`, [planId]);

    return res.json({
      code: 200,
      message: "Target plan berhasil dihapus",
    });
  }),
);

export default router;
