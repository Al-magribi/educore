/**
 * Sakit dan Izin dicatat terpisah sebagai `sick` dan `permit`. `excused` tetap
 * diterima untuk data lama yang belum dibedakan (Sakit/Izin).
 */
export const EXCUSED_STATUSES = ["sick", "permit", "excused"];

export const EXCUSED_STATUS_SQL = EXCUSED_STATUSES.map((status) => `'${status}'`).join(", ");

const STATUS_CONSTRAINTS = [
  {
    table: "attendance.daily_attendance",
    column: "attendance_status",
    name: "daily_attendance_status_check",
    statuses: [
      "pending",
      "present",
      "late",
      "absent",
      ...EXCUSED_STATUSES,
      "not_scheduled",
      "incomplete",
      "insufficient_hours",
    ],
  },
  {
    table: "attendance.teacher_schedule_requirement",
    column: "session_status",
    name: "teacher_schedule_requirement_status_check",
    statuses: ["pending", "present", "late", "missed", "partial", ...EXCUSED_STATUSES],
  },
  {
    table: "attendance.staff_daily_attendance",
    column: "attendance_status",
    name: "staff_daily_attendance_status_check",
    statuses: [
      "pending",
      "present",
      "late",
      "absent",
      ...EXCUSED_STATUSES,
      "incomplete",
      "insufficient_hours",
    ],
  },
];

/** Idempotent; memperluas CHECK status agar `sick` dan `permit` bisa disimpan. */
export const runAttendanceStatusMigration = async (db) => {
  for (const item of STATUS_CONSTRAINTS) {
    const tableRes = await db.query(`SELECT to_regclass($1) AS rel`, [item.table]);
    if (!tableRes.rows[0]?.rel) continue;

    const current = await db.query(
      `SELECT pg_get_constraintdef(oid) AS def
       FROM pg_constraint
       WHERE conrelid = $1::regclass
         AND conname = $2
       LIMIT 1`,
      [item.table, item.name],
    );
    const def = String(current.rows[0]?.def || "");
    if (def.includes("'sick'") && def.includes("'permit'")) continue;

    const allowed = item.statuses.map((status) => `'${status}'`).join(", ");
    await db.query(`ALTER TABLE ${item.table} DROP CONSTRAINT IF EXISTS ${item.name}`);
    await db.query(
      `ALTER TABLE ${item.table} ADD CONSTRAINT ${item.name} CHECK (${item.column} IN (${allowed}))`,
    );
  }
};
