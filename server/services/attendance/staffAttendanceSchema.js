import pool from "../../config/connection.js";
import { ensureStaffTable } from "../academic/staffTable.js";

const POLICY_TARGET_ROLE_CHECK = `CHECK (target_role IN ('student', 'teacher', 'all', 'staff'))`;
const POLICY_TYPE_CHECK = `CHECK (policy_type IN ('student_fixed', 'teacher_schedule_based', 'teacher_fixed_daily', 'activity_fixed', 'staff_fixed_daily'))`;

const replaceConstraintIfMissingStaff = async (db, constraintName, definition) => {
  const current = await db.query(
    `SELECT pg_get_constraintdef(oid) AS def
     FROM pg_constraint
     WHERE conrelid = 'attendance.attendance_policy'::regclass
       AND conname = $1
     LIMIT 1`,
    [constraintName],
  );
  if (String(current.rows[0]?.def || "").includes("staff")) return;

  await db.query(
    `ALTER TABLE attendance.attendance_policy DROP CONSTRAINT IF EXISTS ${constraintName}`,
  );
  await db.query(
    `ALTER TABLE attendance.attendance_policy ADD CONSTRAINT ${constraintName} ${definition}`,
  );
};

const runStaffAttendanceMigration = async (db) => {
  await ensureStaffTable(db);

  await replaceConstraintIfMissingStaff(
    db,
    "attendance_policy_target_role_check",
    POLICY_TARGET_ROLE_CHECK,
  );
  await replaceConstraintIfMissingStaff(db, "attendance_policy_type_check", POLICY_TYPE_CHECK);

  await db.query(`
    ALTER TABLE attendance.rfid_scan_log
    ADD COLUMN IF NOT EXISTS staff_id BIGINT REFERENCES public.u_staff(id) ON DELETE SET NULL
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_rfid_scan_log_staff_time
    ON attendance.rfid_scan_log (staff_id, scanned_at DESC)
    WHERE staff_id IS NOT NULL
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS attendance.staff_daily_attendance (
      id BIGSERIAL PRIMARY KEY,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      periode_id INT REFERENCES public.a_periode(id) ON DELETE SET NULL,
      staff_id BIGINT NOT NULL REFERENCES public.u_staff(id) ON DELETE CASCADE,
      policy_id INT REFERENCES attendance.attendance_policy(id) ON DELETE SET NULL,
      attendance_date DATE NOT NULL,
      checkin_at TIMESTAMPTZ,
      checkout_at TIMESTAMPTZ,
      first_gate_scan_id BIGINT REFERENCES attendance.rfid_scan_log(id) ON DELETE SET NULL,
      last_gate_scan_id BIGINT REFERENCES attendance.rfid_scan_log(id) ON DELETE SET NULL,
      attendance_status VARCHAR(30) NOT NULL DEFAULT 'pending',
      late_minutes INT NOT NULL DEFAULT 0,
      presence_minutes INT,
      minimum_required_minutes INT,
      is_checkout_optional BOOLEAN NOT NULL DEFAULT false,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT staff_daily_attendance_status_check CHECK (
        attendance_status IN ('pending', 'present', 'late', 'absent', 'excused', 'incomplete', 'insufficient_hours')
      ),
      CONSTRAINT staff_daily_attendance_time_order_check CHECK (
        checkout_at IS NULL OR checkin_at IS NULL OR checkout_at >= checkin_at
      ),
      CONSTRAINT staff_daily_attendance_minutes_check CHECK (
        late_minutes >= 0 AND (presence_minutes IS NULL OR presence_minutes >= 0)
      )
    )
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_daily_attendance_staff_date
    ON attendance.staff_daily_attendance (staff_id, attendance_date)
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_staff_daily_attendance_homebase_date
    ON attendance.staff_daily_attendance (homebase_id, attendance_date)
  `);
};

let schemaPromise = null;

/** Idempotent; dijalankan sekali per proses di luar transaksi request agar ALTER tidak menunggu lock scan. */
export const ensureStaffAttendanceSchema = () => {
  if (!schemaPromise) {
    schemaPromise = runStaffAttendanceMigration(pool).catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
};
