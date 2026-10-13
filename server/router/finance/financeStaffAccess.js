import pool from "../../config/connection.js";

const STAFF_TABLE_SQL = `
  CREATE SCHEMA IF NOT EXISTS finance;

  CREATE TABLE IF NOT EXISTS finance.homebase_finance_admin (
    id SERIAL PRIMARY KEY,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    teacher_id integer NOT NULL REFERENCES public.u_teachers(user_id) ON DELETE CASCADE,
    assigned_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
  );

  CREATE UNIQUE INDEX IF NOT EXISTS uq_homebase_finance_admin_active
    ON finance.homebase_finance_admin (homebase_id, teacher_id)
    WHERE is_active = true;

  CREATE INDEX IF NOT EXISTS idx_homebase_finance_admin_teacher
    ON finance.homebase_finance_admin (teacher_id, homebase_id)
    WHERE is_active = true;
`;

let ensureTablePromise = null;

export const ensureFinanceStaffTable = async () => {
  if (!ensureTablePromise) {
    ensureTablePromise = pool.query(STAFF_TABLE_SQL).catch((error) => {
      ensureTablePromise = null;
      throw error;
    });
  }

  await ensureTablePromise;
};

export const teacherHasFinanceDesk = async (user) => {
  const teacherId = Number(user?.id);
  const homebaseId = Number(user?.homebase_id);

  if (!Number.isInteger(teacherId) || teacherId <= 0) return false;
  if (!Number.isInteger(homebaseId) || homebaseId <= 0) return false;

  await ensureFinanceStaffTable();

  const result = await pool.query(
    `
      SELECT 1
      FROM finance.homebase_finance_admin
      WHERE teacher_id = $1
        AND homebase_id = $2
        AND is_active = true
      LIMIT 1
    `,
    [teacherId, homebaseId],
  );

  return result.rowCount > 0;
};

export const attachFinanceStaffFlag = async (db, user) => {
  if (!user || user.role !== "teacher" || !user.id) {
    return user;
  }

  try {
    await ensureFinanceStaffTable();
    const result = await db.query(
      `
        SELECT 1
        FROM finance.homebase_finance_admin a
        JOIN public.u_teachers t ON t.user_id = a.teacher_id
        WHERE a.teacher_id = $1
          AND a.homebase_id = t.homebase_id
          AND t.homebase_id IS NOT NULL
          AND a.is_active = true
        LIMIT 1
      `,
      [user.id],
    );
    user.can_manage_finance = result.rowCount > 0;
  } catch (error) {
    console.error("[finance-staff] gagal memuat penugasan", error);
    user.can_manage_finance = false;
  }

  return user;
};

export const lockFinanceStaffHomebase = (req) => {
  const homebaseId = Number(req.user?.homebase_id);
  if (!Number.isInteger(homebaseId) || homebaseId <= 0) {
    return false;
  }

  if (req.query && typeof req.query === "object") {
    req.query.homebase_id = String(homebaseId);
  }

  if (req.body && typeof req.body === "object" && !Array.isArray(req.body)) {
    req.body.homebase_id = homebaseId;
  }

  if (req.params && Object.prototype.hasOwnProperty.call(req.params, "homebaseId")) {
    req.params.homebaseId = String(homebaseId);
  }

  return true;
};
