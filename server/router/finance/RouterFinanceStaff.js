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

const hasStaffDeskColumn = async (db) => {
  const result = await db.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'finance'
      AND table_name = 'homebase_finance_admin'
      AND column_name = 'staff_id'
    LIMIT 1
  `);
  return result.rowCount > 0;
};

const hasStaffAccountColumn = async (db) => {
  const result = await db.query(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'u_staff'
      AND column_name = 'user_id'
    LIMIT 1
  `);
  return result.rowCount > 0;
};

const listStaff = async (db, homebaseId) => {
  if (!(await hasStaffDeskColumn(db))) return [];

  const accountSelect = (await hasStaffAccountColumn(db))
    ? "s.user_id IS NOT NULL AS has_account"
    : "false AS has_account";

  const result = await db.query(
    `
      SELECT
        s.id,
        s.full_name,
        s.nip,
        s.is_active,
        ${accountSelect},
        EXISTS (
          SELECT 1
          FROM finance.homebase_finance_admin a
          WHERE a.staff_id = s.id
            AND a.homebase_id = s.homebase_id
            AND a.is_active = true
        ) AS is_finance_admin
      FROM public.u_staff s
      WHERE s.homebase_id = $1
      ORDER BY lower(s.full_name) ASC, s.id ASC
    `,
    [homebaseId],
  );

  return result.rows.map((staff) => ({
    ...staff,
    has_account: staff.has_account === true,
    is_finance_admin: staff.is_finance_admin === true,
  }));
};

const saveDeskAssignment = async (client, { homebaseId, column, personId, active, actorId }) => {
  await client.query(
    `
      UPDATE finance.homebase_finance_admin
      SET is_active = false,
          updated_at = CURRENT_TIMESTAMP
      WHERE homebase_id = $1
        AND ${column} = $2
        AND is_active = true
    `,
    [homebaseId, personId],
  );

  if (active) {
    await client.query(
      `
        INSERT INTO finance.homebase_finance_admin (
          homebase_id,
          ${column},
          assigned_by,
          is_active
        )
        VALUES ($1, $2, $3, true)
      `,
      [homebaseId, personId, actorId],
    );
  }
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

    const [homebaseResult, teachersResult, staff] = await Promise.all([
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
      listStaff(db, homebaseId),
    ]);

    return res.json({
      status: "success",
      data: teachersResult.rows.map((teacher) => ({
        ...teacher,
        is_finance_admin: teacher.is_finance_admin === true,
      })),
      staff,
      meta: {
        homebase_id: homebaseId,
        homebase_name: homebaseResult.rows[0]?.name || "",
      },
    });
  }),
);

router.put(
  "/staff-assignments/staff/:staffId",
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

    if (!(await hasStaffDeskColumn(client))) {
      return res.status(503).json({
        status: "error",
        message: "Database belum mendukung penugasan tendik. Jalankan patch terbaru.",
      });
    }

    const staffId = Number.parseInt(req.params.staffId, 10);
    const active = req.body?.active === true;

    if (!Number.isInteger(staffId) || staffId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Tendik tidak valid.",
      });
    }

    const staffCheck = await client.query(
      `
        SELECT id, is_active
        FROM public.u_staff
        WHERE id = $1
          AND homebase_id = $2
        LIMIT 1
      `,
      [staffId, homebaseId],
    );

    if (staffCheck.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Tendik tidak ditemukan di satuan ini.",
      });
    }

    if (active && staffCheck.rows[0].is_active === false) {
      return res.status(400).json({
        status: "error",
        message: "Tendik tidak aktif tidak dapat ditugaskan.",
      });
    }

    await saveDeskAssignment(client, {
      homebaseId,
      column: "staff_id",
      personId: staffId,
      active,
      actorId: req.user.id,
    });

    return res.json({
      status: "success",
      message: active
        ? "Tendik ditugaskan sebagai admin keuangan satuan ini."
        : "Penugasan keuangan tendik dicabut.",
      data: {
        staff_id: staffId,
        is_finance_admin: active,
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

    await saveDeskAssignment(client, {
      homebaseId,
      column: "teacher_id",
      personId: teacherId,
      active,
      actorId: req.user.id,
    });

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
