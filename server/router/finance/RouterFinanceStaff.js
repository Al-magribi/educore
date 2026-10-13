import { Router } from "express";
import { authorize } from "../../middleware/authorize.js";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { ensureFinanceStaffTable } from "./financeStaffAccess.js";

const router = Router();

const satuanHomebaseId = (user) => {
  const level = user?.admin_level || user?.level;
  const homebaseId = Number(user?.homebase_id);

  if (user?.role !== "admin" || level !== "satuan") return null;
  if (!Number.isInteger(homebaseId) || homebaseId <= 0) return null;
  return homebaseId;
};

router.get(
  "/staff-assignments",
  authorize("satuan"),
  withQuery(async (req, res, db) => {
    await ensureFinanceStaffTable();
    const homebaseId = satuanHomebaseId(req.user);

    if (!homebaseId) {
      return res.status(403).json({
        status: "error",
        message: "Hanya admin satuan yang dapat melihat penugasan keuangan.",
      });
    }

    const [homebaseResult, teachersResult] = await Promise.all([
      db.query(
        `SELECT id, name FROM public.a_homebase WHERE id = $1 LIMIT 1`,
        [homebaseId],
      ),
      db.query(
        `
          SELECT
            u.id,
            u.full_name,
            u.is_active,
            t.nip,
            EXISTS (
              SELECT 1
              FROM finance.homebase_finance_admin a
              WHERE a.teacher_id = u.id
                AND a.homebase_id = t.homebase_id
                AND a.is_active = true
            ) AS is_finance_admin
          FROM public.u_users u
          JOIN public.u_teachers t ON t.user_id = u.id
          WHERE t.homebase_id = $1
            AND u.role = 'teacher'
          ORDER BY lower(u.full_name) ASC
        `,
        [homebaseId],
      ),
    ]);

    return res.json({
      status: "success",
      data: teachersResult.rows.map((teacher) => ({
        ...teacher,
        is_finance_admin: teacher.is_finance_admin === true,
      })),
      meta: {
        homebase_id: homebaseId,
        homebase_name: homebaseResult.rows[0]?.name || "",
      },
    });
  }),
);

router.put(
  "/staff-assignments/:teacherId",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    await ensureFinanceStaffTable();
    const homebaseId = satuanHomebaseId(req.user);

    if (!homebaseId) {
      return res.status(403).json({
        status: "error",
        message: "Hanya admin satuan yang dapat mengubah penugasan keuangan.",
      });
    }

    const teacherId = Number.parseInt(req.params.teacherId, 10);
    const active = req.body?.active === true;

    if (!Number.isInteger(teacherId) || teacherId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Guru tidak valid.",
      });
    }

    const teacherCheck = await client.query(
      `
        SELECT u.id, u.is_active
        FROM public.u_users u
        JOIN public.u_teachers t ON t.user_id = u.id
        WHERE u.id = $1
          AND u.role = 'teacher'
          AND t.homebase_id = $2
        LIMIT 1
      `,
      [teacherId, homebaseId],
    );

    if (teacherCheck.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Guru tidak ditemukan di satuan ini.",
      });
    }

    if (active && teacherCheck.rows[0].is_active === false) {
      return res.status(400).json({
        status: "error",
        message: "Guru tidak aktif tidak dapat ditugaskan.",
      });
    }

    await client.query(
      `
        UPDATE finance.homebase_finance_admin
        SET is_active = false,
            updated_at = CURRENT_TIMESTAMP
        WHERE homebase_id = $1
          AND teacher_id = $2
          AND is_active = true
      `,
      [homebaseId, teacherId],
    );

    if (active) {
      await client.query(
        `
          INSERT INTO finance.homebase_finance_admin (
            homebase_id,
            teacher_id,
            assigned_by,
            is_active
          )
          VALUES ($1, $2, $3, true)
        `,
        [homebaseId, teacherId, req.user.id],
      );
    }

    return res.json({
      status: "success",
      message: active
        ? "Guru ditugaskan sebagai admin keuangan satuan ini."
        : "Penugasan keuangan guru dicabut.",
      data: {
        teacher_id: teacherId,
        is_finance_admin: active,
      },
    });
  }),
);

export default router;
