import pool from "../../config/connection.js";
import { getTeacherHomeroomClass } from "../../utils/homeroom.js";

let schemaPromise = null;

/** Idempotent; dijalankan sekali per proses di luar transaksi request. */
export const ensureClassAttendanceOfficerTable = () => {
  if (!schemaPromise) {
    schemaPromise = pool
      .query(
        `CREATE TABLE IF NOT EXISTS attendance.class_attendance_officer (
           class_id integer NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
           student_id integer NOT NULL REFERENCES public.u_users(id) ON DELETE CASCADE,
           homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
           assigned_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
           created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
           PRIMARY KEY (class_id, student_id)
         )`,
      )
      .then(() =>
        pool.query(
          `CREATE INDEX IF NOT EXISTS idx_class_attendance_officer_student
           ON attendance.class_attendance_officer(student_id)`,
        ),
      )
      .catch((error) => {
        schemaPromise = null;
        throw error;
      });
  }
  return schemaPromise;
};

/**
 * Penugasan hanya berlaku selama siswa terdaftar di kelas tersebut pada
 * periode aktif (u_class_enrollments), bukan dari periode sebelumnya.
 */
const OFFICER_CLASS_SQL = `SELECT
     c.id,
     c.name,
     g.name AS grade_name,
     c.homebase_id,
     ap.id AS periode_id
   FROM attendance.class_attendance_officer o
   JOIN public.a_class c ON c.id = o.class_id
   JOIN public.a_periode ap
     ON ap.homebase_id = c.homebase_id
    AND ap.is_active = true
   JOIN public.u_class_enrollments ce
     ON ce.student_id = o.student_id
    AND ce.class_id = o.class_id
    AND ce.periode_id = ap.id
   LEFT JOIN public.a_grade g ON g.id = c.grade_id
   WHERE o.student_id = $1
   LIMIT 1`;

export const isClassAttendanceOfficer = async (executor, studentId) => {
  try {
    await ensureClassAttendanceOfficerTable();
    const result = await executor.query(OFFICER_CLASS_SQL, [studentId]);
    return result.rowCount > 0;
  } catch (error) {
    console.error("[class-attendance] gagal memuat petugas presensi", error);
    return false;
  }
};

export const resolveClassAttendanceAccess = async (executor, user) => {
  await ensureClassAttendanceOfficerTable();

  if (user.role === "teacher") {
    // Wali kelas di periode aktif saja (server/utils/homeroom.js).
    const classInfo = await getTeacherHomeroomClass(executor, {
      teacherId: user.id,
      homebaseId: user.homebase_id,
    });
    if (!classInfo) return null;
    return { classInfo, role: "homeroom" };
  }

  if (user.role === "student") {
    const result = await executor.query(OFFICER_CLASS_SQL, [user.id]);
    if (result.rowCount === 0) return null;
    return { classInfo: result.rows[0], role: "officer" };
  }

  return null;
};
