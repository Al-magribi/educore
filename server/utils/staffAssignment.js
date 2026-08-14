import pool from "../config/connection.js";

const ASSIGNMENT_TYPES = ["cbt", "kurikulum", "kesiswaan"];
const ASSIGNMENT_PREFIX = "assignment:";

let ensureTablePromise = null;

export const getAssignmentTypes = () => [...ASSIGNMENT_TYPES];

export const parseAssignmentToken = (value) => {
  if (typeof value !== "string" || !value.startsWith(ASSIGNMENT_PREFIX)) {
    return null;
  }
  return value.slice(ASSIGNMENT_PREFIX.length);
};

export const normalizeAssignments = (value) => {
  const source = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? (() => {
          try {
            return JSON.parse(value);
          } catch {
            return [];
          }
        })()
      : [];

  return [
    ...new Set(
      source
        .map((item) => String(item || "").trim().toLowerCase())
        .filter((item) => ASSIGNMENT_TYPES.includes(item)),
    ),
  ];
};

export const isSatuanAdmin = (user) =>
  user?.role === "admin" &&
  (user?.admin_level === "satuan" || user?.level === "satuan");

export const hasStaffAssignment = (user, type) =>
  user?.role === "teacher" &&
  normalizeAssignments(user?.assignments).includes(type);

export const canManageCbt = (user) =>
  isSatuanAdmin(user) || hasStaffAssignment(user, "cbt");

export const canManageKurikulum = (user) =>
  isSatuanAdmin(user) || hasStaffAssignment(user, "kurikulum");

export const canManageKesiswaan = (user) =>
  isSatuanAdmin(user) || hasStaffAssignment(user, "kesiswaan");

export const isTeacherDataScoped = (user, requestedTeacherId) => {
  if (user?.role !== "teacher") return false;
  if (!canManageKurikulum(user)) return true;
  return !requestedTeacherId;
};

export const isForbiddenCbtOwner = (user, owner) => {
  if (!owner) return true;
  if (canManageCbt(user)) {
    return Number(owner.homebase_id) !== Number(user.homebase_id);
  }
  return Number(owner.teacher_id) !== Number(user.id);
};

export const ensureStaffAssignmentTable = async () => {
  if (!ensureTablePromise) {
    ensureTablePromise = pool
      .query(
        `
          CREATE TABLE IF NOT EXISTS public.u_staff_assignment (
            id SERIAL PRIMARY KEY,
            homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
            teacher_id integer NOT NULL REFERENCES public.u_teachers(user_id) ON DELETE CASCADE,
            assignment_type varchar(20) NOT NULL
              CHECK (assignment_type IN ('cbt', 'kurikulum', 'kesiswaan')),
            assigned_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
            is_active boolean NOT NULL DEFAULT true,
            created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
          )
        `,
      )
      .then(() =>
        Promise.all([
          pool.query(`
            CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_assignment_active
            ON public.u_staff_assignment (homebase_id, teacher_id, assignment_type)
            WHERE (is_active = true)
          `),
          pool.query(`
            CREATE INDEX IF NOT EXISTS idx_staff_assignment_teacher
            ON public.u_staff_assignment (teacher_id, homebase_id, is_active)
          `),
          pool.query(`
            CREATE INDEX IF NOT EXISTS idx_staff_assignment_homebase
            ON public.u_staff_assignment (homebase_id, assignment_type, is_active)
          `),
        ]),
      )
      .catch((error) => {
        ensureTablePromise = null;
        throw error;
      });
  }

  await ensureTablePromise;
};

export const fetchTeacherAssignments = async (executor, teacherId, homebaseId) => {
  if (!teacherId || !homebaseId) return [];

  try {
    await ensureStaffAssignmentTable();
    const result = await executor.query(
      `
        SELECT assignment_type
        FROM public.u_staff_assignment
        WHERE teacher_id = $1
          AND homebase_id = $2
          AND is_active = true
        ORDER BY assignment_type ASC
      `,
      [teacherId, homebaseId],
    );
    return result.rows.map((row) => row.assignment_type);
  } catch (error) {
    console.error("[staff-assignment] gagal memuat penugasan", error);
    return [];
  }
};

export const attachAssignmentFlags = (user, assignments = []) => {
  const normalized = normalizeAssignments(assignments);
  return {
    ...user,
    assignments: normalized,
    can_manage_cbt: normalized.includes("cbt"),
    can_manage_kurikulum: normalized.includes("kurikulum"),
    can_manage_kesiswaan: normalized.includes("kesiswaan"),
  };
};
