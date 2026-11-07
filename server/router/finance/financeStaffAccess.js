import pool from "../../config/connection.js";

export const FINANCE_DESK_ROLES = ["teacher", "staff"];

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

  DO $$
  BEGIN
    IF to_regclass('public.u_staff') IS NULL THEN
      RETURN;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'finance'
        AND table_name = 'homebase_finance_admin'
        AND column_name = 'staff_id'
    ) THEN
      ALTER TABLE finance.homebase_finance_admin
        ADD COLUMN staff_id BIGINT REFERENCES public.u_staff(id) ON DELETE CASCADE;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'finance'
        AND table_name = 'homebase_finance_admin'
        AND column_name = 'teacher_id'
        AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE finance.homebase_finance_admin
        ALTER COLUMN teacher_id DROP NOT NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'homebase_finance_admin_person_check'
    ) THEN
      ALTER TABLE finance.homebase_finance_admin
        ADD CONSTRAINT homebase_finance_admin_person_check
        CHECK (num_nonnulls(teacher_id, staff_id) = 1);
    END IF;

    IF to_regclass('finance.uq_homebase_finance_admin_staff_active') IS NULL THEN
      CREATE UNIQUE INDEX uq_homebase_finance_admin_staff_active
        ON finance.homebase_finance_admin (homebase_id, staff_id)
        WHERE is_active = true AND staff_id IS NOT NULL;
    END IF;
  END $$;
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

const TEACHER_DESK_SQL = `
  SELECT 1
  FROM finance.homebase_finance_admin a
  JOIN public.u_teachers t ON t.user_id = a.teacher_id
  WHERE a.teacher_id = $1
    AND a.homebase_id = t.homebase_id
    AND t.homebase_id IS NOT NULL
    AND a.is_active = true
  LIMIT 1
`;

const STAFF_DESK_SQL = `
  SELECT 1
  FROM finance.homebase_finance_admin a
  JOIN public.u_staff s ON s.id = a.staff_id
  WHERE s.user_id = $1
    AND a.homebase_id = s.homebase_id
    AND s.is_active = true
    AND a.is_active = true
  LIMIT 1
`;

const queryFinanceDesk = async (db, user) => {
  const userId = Number(user?.id);
  if (!Number.isInteger(userId) || userId <= 0) return false;
  if (!FINANCE_DESK_ROLES.includes(user?.role)) return false;

  await ensureFinanceStaffTable();
  const result = await db.query(
    user.role === "staff" ? STAFF_DESK_SQL : TEACHER_DESK_SQL,
    [userId],
  );
  return result.rowCount > 0;
};

export const userHasFinanceDesk = async (user) => {
  const homebaseId = Number(user?.homebase_id);
  if (!Number.isInteger(homebaseId) || homebaseId <= 0) return false;
  return queryFinanceDesk(pool, user);
};

export const teacherHasFinanceDesk = userHasFinanceDesk;

export const attachFinanceStaffFlag = async (db, user) => {
  if (!user || !FINANCE_DESK_ROLES.includes(user.role) || !user.id) {
    return user;
  }

  try {
    user.can_manage_finance = await queryFinanceDesk(db, user);
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
