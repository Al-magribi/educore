import { Router } from "express";
import { withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const parseIntOrNull = (value) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

router.get(
  "/dashboard/student-summary",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const requestedHomebaseId = parseIntOrNull(req.query.homebase_id);
    const requestedPeriodeId = parseIntOrNull(req.query.periode_id);

    const isScopedHomebaseUser = Boolean(req.user.homebase_id);

    const homebasesQuery = isScopedHomebaseUser
      ? await pool.query(
          `SELECT id, name, level
           FROM a_homebase
           WHERE id = $1
           ORDER BY name ASC`,
          [req.user.homebase_id],
        )
      : await pool.query(
          `SELECT id, name, level
           FROM a_homebase
           ORDER BY name ASC`,
        );

    const homebases = homebasesQuery.rows;
    if (!homebases.length) {
      return res.json({
        code: 200,
        message: "Ringkasan dashboard Tahfiz berhasil dimuat",
        data: {
          filters: {
            homebases: [],
            periodes: [],
            selected_homebase_id: null,
            selected_periode_id: null,
            active_periode_id: null,
          },
          overview: {
            total_students: 0,
            total_halaqoh: 0,
            total_musyrif: 0,
            total_setoran: 0,
            total_ujian: 0,
            average_exam_score: 0,
          },
          activity_summary: [],
          student_summary: [],
        },
      });
    }

    const availableHomebaseIds = homebases.map((item) => item.id);
    let selectedHomebaseId = Math.min(...availableHomebaseIds);

    if (
      requestedHomebaseId &&
      availableHomebaseIds.includes(requestedHomebaseId)
    ) {
      selectedHomebaseId = requestedHomebaseId;
    }

    const periodesQuery = await pool.query(
      `SELECT id, name, is_active, created_at
       FROM a_periode
       WHERE homebase_id = $1
       ORDER BY is_active DESC, id DESC`,
      [selectedHomebaseId],
    );

    const periodes = periodesQuery.rows;
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
        message: "Ringkasan dashboard Tahfiz berhasil dimuat",
        data: {
          filters: {
            homebases,
            periodes,
            selected_homebase_id: selectedHomebaseId,
            selected_periode_id: null,
            active_periode_id: activePeriode?.id || null,
          },
          overview: {
            total_students: 0,
            total_halaqoh: 0,
            total_musyrif: 0,
            total_setoran: 0,
            total_ujian: 0,
            average_exam_score: 0,
          },
          activity_summary: [],
          student_summary: [],
        },
      });
    }

    const [
      studentCount,
      halaqohCount,
      musyrifCount,
      setoranCount,
      activitySummary,
      studentSummary,
    ] = await Promise.all([
      pool.query(
        `SELECT COUNT(DISTINCT s.user_id) AS count
         FROM u_students s
         JOIN u_users u ON u.id = s.user_id
         JOIN u_class_enrollments e ON e.student_id = s.user_id
         WHERE s.homebase_id = $1
           AND e.homebase_id = $1
           AND e.periode_id = $2
           AND u.is_active = true`,
        [selectedHomebaseId, selectedPeriodeId],
      ),
      pool.query(
        `SELECT COUNT(*) AS count
         FROM tahfiz.t_halaqoh h
         JOIN a_periode p ON p.id = h.periode_id
         WHERE p.homebase_id = $1
           AND h.periode_id = $2`,
        [selectedHomebaseId, selectedPeriodeId],
      ),
      pool.query(
        `SELECT COUNT(DISTINCT h.musyrif_id) AS count
         FROM tahfiz.t_halaqoh h
         JOIN a_periode p ON p.id = h.periode_id
         WHERE p.homebase_id = $1
           AND h.periode_id = $2`,
        [selectedHomebaseId, selectedPeriodeId],
      ),
      pool.query(
        `SELECT COUNT(*) AS count
         FROM tahfiz.t_daily_record d
         JOIN u_students s ON s.user_id = d.student_id
         JOIN tahfiz.t_halaqoh h ON h.id = d.halaqoh_id
         WHERE s.homebase_id = $1
           AND h.periode_id = $2`,
        [selectedHomebaseId, selectedPeriodeId],
      ),
      pool.query(
        `SELECT
           COALESCE(t.name, 'Tanpa Kategori') AS activity_type,
           COUNT(d.id) AS total_setoran,
           COALESCE(SUM(d.lines_count), 0) AS total_lines
         FROM tahfiz.t_daily_record d
         JOIN u_students s ON s.user_id = d.student_id
         JOIN tahfiz.t_halaqoh h ON h.id = d.halaqoh_id
         LEFT JOIN tahfiz.t_activity_type t ON t.id = d.type_id
         WHERE s.homebase_id = $1
           AND h.periode_id = $2
         GROUP BY COALESCE(t.name, 'Tanpa Kategori')
         ORDER BY total_setoran DESC, total_lines DESC`,
        [selectedHomebaseId, selectedPeriodeId],
      ),
      pool.query(
        `WITH latest_enrollment AS (
           SELECT DISTINCT ON (e.student_id)
             e.student_id,
             e.class_id
           FROM u_class_enrollments e
           WHERE e.homebase_id = $1
             AND e.periode_id = $2
           ORDER BY e.student_id, e.id DESC
         ),
         student_base AS (
           SELECT
             s.user_id AS student_id,
             s.nis,
             u.full_name,
             c.name AS class_name
           FROM latest_enrollment le
           JOIN u_students s ON s.user_id = le.student_id
           JOIN u_users u ON u.id = s.user_id
           LEFT JOIN a_class c ON c.id = le.class_id
           WHERE s.homebase_id = $1
             AND u.is_active = true
         )
         SELECT
           sb.student_id,
           sb.nis,
           sb.full_name,
           COALESCE(sb.class_name, '-') AS class_name,
           COALESCE(hq.halaqoh_name, '-') AS halaqoh_name,
           COALESCE(sr.total_setoran, 0) AS total_setoran,
           COALESCE(sr.total_lines, 0) AS total_lines,
           sr.last_setoran_date
         FROM student_base sb
         LEFT JOIN LATERAL (
           SELECT
             COUNT(d.id) AS total_setoran,
             COALESCE(SUM(d.lines_count), 0) AS total_lines,
             MAX(d.date) AS last_setoran_date
           FROM tahfiz.t_daily_record d
           JOIN tahfiz.t_halaqoh h ON h.id = d.halaqoh_id
           WHERE d.student_id = sb.student_id
             AND h.periode_id = $2
         ) sr ON true
         LEFT JOIN LATERAL (
           SELECT h.name AS halaqoh_name
           FROM tahfiz.t_halaqoh_students hs
           JOIN tahfiz.t_halaqoh h ON h.id = hs.halaqoh_id
           WHERE hs.student_id = sb.student_id
             AND h.periode_id = $2
           ORDER BY h.id DESC
           LIMIT 1
         ) hq ON true
         ORDER BY total_setoran DESC, total_lines DESC, sb.full_name ASC`,
        [selectedHomebaseId, selectedPeriodeId],
      ),
    ]);

    return res.json({
      code: 200,
      message: "Ringkasan dashboard Tahfiz berhasil dimuat",
      data: {
        filters: {
          homebases,
          periodes,
          selected_homebase_id: selectedHomebaseId,
          selected_periode_id: selectedPeriodeId,
          active_periode_id: activePeriode?.id || null,
        },
        overview: {
          total_students: Number.parseInt(studentCount.rows[0].count, 10) || 0,
          total_halaqoh: Number.parseInt(halaqohCount.rows[0].count, 10) || 0,
          total_musyrif: Number.parseInt(musyrifCount.rows[0].count, 10) || 0,
          total_setoran: Number.parseInt(setoranCount.rows[0].count, 10) || 0,
          total_ujian: 0,
          average_exam_score: 0,
        },
        activity_summary: activitySummary.rows,
        student_summary: studentSummary.rows,
      },
    });
  }),
);

router.get(
  "/dashboard/musyrif-summary",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const requestedPeriodeId = parseIntOrNull(req.query.periode_id);

    const musyrifQuery = await pool.query(
      `SELECT
         m.id,
         m.user_id,
         m.full_name,
         m.homebase_id,
         h.name AS homebase_name
       FROM tahfiz.t_musyrif m
       LEFT JOIN a_homebase h ON h.id = m.homebase_id
       WHERE m.user_id = $1
         AND m.is_active = true
       LIMIT 1`,
      [req.user.id],
    );

    if (!musyrifQuery.rows.length) {
      return res.status(403).json({
        message: "Akses dashboard musyrif ditolak.",
      });
    }

    const musyrif = musyrifQuery.rows[0];

    const periodesQuery = await pool.query(
      `SELECT id, name, is_active, created_at
       FROM a_periode
       WHERE homebase_id = $1
       ORDER BY is_active DESC, id DESC`,
      [musyrif.homebase_id],
    );

    const periodes = periodesQuery.rows;
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
        message: "Ringkasan dashboard musyrif berhasil dimuat",
        data: {
          musyrif: {
            id: musyrif.id,
            full_name: musyrif.full_name,
            homebase_id: musyrif.homebase_id,
            homebase_name: musyrif.homebase_name,
          },
          filters: {
            periodes,
            selected_periode_id: null,
            active_periode_id: activePeriode?.id || null,
          },
          overview: {
            total_halaqoh: 0,
            total_students: 0,
            total_setoran: 0,
            total_lines: 0,
          },
          halaqoh_summary: [],
          activity_summary: [],
          student_summary: [],
        },
      });
    }

    const [
      halaqohSummary,
      studentCount,
      setoranStats,
      activitySummary,
      studentSummary,
    ] = await Promise.all([
      pool.query(
        `SELECT
           h.id,
           h.name,
           h.is_active,
           COUNT(DISTINCT hs.student_id) AS student_count
         FROM tahfiz.t_halaqoh h
         LEFT JOIN tahfiz.t_halaqoh_students hs ON hs.halaqoh_id = h.id
         WHERE h.musyrif_id = $1
           AND h.periode_id = $2
         GROUP BY h.id, h.name, h.is_active
         ORDER BY h.is_active DESC, h.name ASC`,
        [musyrif.id, selectedPeriodeId],
      ),
      pool.query(
        `SELECT COUNT(DISTINCT hs.student_id) AS count
         FROM tahfiz.t_halaqoh_students hs
         JOIN tahfiz.t_halaqoh h ON h.id = hs.halaqoh_id
         WHERE h.musyrif_id = $1
           AND h.periode_id = $2`,
        [musyrif.id, selectedPeriodeId],
      ),
      pool.query(
        `SELECT
           COUNT(d.id) AS total_setoran,
           COALESCE(SUM(d.lines_count), 0) AS total_lines
         FROM tahfiz.t_daily_record d
         JOIN tahfiz.t_halaqoh h ON h.id = d.halaqoh_id
         WHERE h.musyrif_id = $1
           AND h.periode_id = $2`,
        [musyrif.id, selectedPeriodeId],
      ),
      pool.query(
        `SELECT
           COALESCE(t.name, 'Tanpa Kategori') AS activity_type,
           COUNT(d.id) AS total_setoran,
           COALESCE(SUM(d.lines_count), 0) AS total_lines
         FROM tahfiz.t_daily_record d
         JOIN tahfiz.t_halaqoh h ON h.id = d.halaqoh_id
         LEFT JOIN tahfiz.t_activity_type t ON t.id = d.type_id
         WHERE h.musyrif_id = $1
           AND h.periode_id = $2
         GROUP BY COALESCE(t.name, 'Tanpa Kategori')
         ORDER BY total_setoran DESC, total_lines DESC`,
        [musyrif.id, selectedPeriodeId],
      ),
      pool.query(
        `WITH musyrif_students AS (
           SELECT DISTINCT
             hs.student_id,
             h.id AS halaqoh_id,
             h.name AS halaqoh_name
           FROM tahfiz.t_halaqoh_students hs
           JOIN tahfiz.t_halaqoh h ON h.id = hs.halaqoh_id
           WHERE h.musyrif_id = $1
             AND h.periode_id = $2
         ),
         latest_enrollment AS (
           SELECT DISTINCT ON (e.student_id)
             e.student_id,
             e.class_id
           FROM u_class_enrollments e
           JOIN musyrif_students ms ON ms.student_id = e.student_id
           WHERE e.periode_id = $2
           ORDER BY e.student_id, e.id DESC
         )
         SELECT
           ms.student_id,
           s.nis,
           u.full_name,
           COALESCE(c.name, '-') AS class_name,
           ms.halaqoh_id,
           ms.halaqoh_name,
           COALESCE(sr.total_setoran, 0) AS total_setoran,
           COALESCE(sr.total_lines, 0) AS total_lines,
           sr.last_setoran_date
         FROM musyrif_students ms
         JOIN u_students s ON s.user_id = ms.student_id
         JOIN u_users u ON u.id = ms.student_id
         LEFT JOIN latest_enrollment le ON le.student_id = ms.student_id
         LEFT JOIN a_class c ON c.id = le.class_id
         LEFT JOIN LATERAL (
           SELECT
             COUNT(d.id) AS total_setoran,
             COALESCE(SUM(d.lines_count), 0) AS total_lines,
             MAX(d.date) AS last_setoran_date
           FROM tahfiz.t_daily_record d
           JOIN tahfiz.t_halaqoh h ON h.id = d.halaqoh_id
           WHERE d.student_id = ms.student_id
             AND h.musyrif_id = $1
             AND h.periode_id = $2
         ) sr ON true
         WHERE u.is_active = true
         ORDER BY total_setoran DESC, total_lines DESC, u.full_name ASC`,
        [musyrif.id, selectedPeriodeId],
      ),
    ]);

    return res.json({
      code: 200,
      message: "Ringkasan dashboard musyrif berhasil dimuat",
      data: {
        musyrif: {
          id: musyrif.id,
          full_name: musyrif.full_name,
          homebase_id: musyrif.homebase_id,
          homebase_name: musyrif.homebase_name,
        },
        filters: {
          periodes,
          selected_periode_id: selectedPeriodeId,
          active_periode_id: activePeriode?.id || null,
        },
        overview: {
          total_halaqoh: halaqohSummary.rows.length,
          total_students: Number.parseInt(studentCount.rows[0].count, 10) || 0,
          total_setoran:
            Number.parseInt(setoranStats.rows[0].total_setoran, 10) || 0,
          total_lines:
            Number.parseInt(setoranStats.rows[0].total_lines, 10) || 0,
        },
        halaqoh_summary: halaqohSummary.rows,
        activity_summary: activitySummary.rows,
        student_summary: studentSummary.rows,
      },
    });
  }),
);

export default router;
