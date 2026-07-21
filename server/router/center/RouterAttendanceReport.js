import { Router } from "express";
import { withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const JAKARTA_TZ = "Asia/Jakarta";

const toJakartaTimestampSql = (columnSql) =>
  `CASE WHEN ${columnSql} IS NULL THEN NULL ELSE TO_CHAR((${columnSql} AT TIME ZONE '${JAKARTA_TZ}'), 'YYYY-MM-DD HH24:MI:SS') END`;

const GATE_LINKED_SCAN_EXISTS_SQL = `EXISTS (
  SELECT 1
  FROM attendance.rfid_scan_log sl
  JOIN attendance.rfid_device d ON d.id = sl.device_id
  WHERE sl.result_status = 'accepted'
    AND d.device_type = 'gate'
    AND (
      sl.attendance_id = da.id
      OR sl.id = da.first_gate_scan_id
      OR sl.id = da.last_gate_scan_id
    )
)`;

const normalizeNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.trunc(num);
};

const toIsoDate = (value) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const resolveReportRange = (query = {}) => {
  const today = toIsoDate(new Date());
  const startDate = String(query.start_date || "").trim() || today;
  const endDate = String(query.end_date || "").trim() || today;
  return { startDate, endDate };
};

const appendPeriodeFilter = (where, params, periodeId, column = "da.periode_id") => {
  if (!periodeId) return;
  params.push(periodeId);
  where.push(`${column} = $${params.length}`);
};

const emptyStudentPayload = (startDate, endDate) => ({
  summary: {
    total_records: 0,
    total_students: 0,
    present_count: 0,
    late_count: 0,
    absent_count: 0,
    excused_count: 0,
    incomplete_count: 0,
    pending_count: 0,
  },
  rows: [],
  filters: { start_date: startDate, end_date: endDate },
});

const emptyTeacherPayload = (startDate, endDate) => ({
  summary: {
    total_records: 0,
    total_teachers: 0,
    present_count: 0,
    late_count: 0,
    absent_count: 0,
    incomplete_count: 0,
    present_teachers: 0,
    absent_teachers: 0,
  },
  rows: [],
  filters: { start_date: startDate, end_date: endDate },
});

const hasDailyAttendanceTable = async (db) => {
  const result = await db.query(
    `SELECT to_regclass('attendance.daily_attendance') AS table_name`,
  );
  return Boolean(result.rows[0]?.table_name);
};

const hasGateScanTables = async (db) => {
  const result = await db.query(
    `SELECT
       to_regclass('attendance.rfid_scan_log') AS scan_log,
       to_regclass('attendance.rfid_device') AS device`,
  );
  const row = result.rows[0] || {};
  return Boolean(row.scan_log && row.device);
};

// GET /api/center/attendance/reports/students
router.get(
  "/attendance/reports/students",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    const homebaseId = normalizeNumberOrNull(req.query?.homebase_id);
    const periodeId = normalizeNumberOrNull(req.query?.periode_id);
    const { startDate, endDate } = resolveReportRange(req.query);
    const status = String(req.query?.status || "").trim() || null;
    const userName = String(req.query?.user_name || "").trim() || null;

    if (!homebaseId) {
      return res.status(400).json({
        status: "error",
        message: "homebase_id wajib diisi.",
      });
    }

    if (!(await hasDailyAttendanceTable(db))) {
      return res.json({
        status: "success",
        data: emptyStudentPayload(startDate, endDate),
      });
    }

    const params = [homebaseId, startDate, endDate];
    const where = [
      "da.homebase_id = $1",
      "da.target_role = 'student'",
      "da.attendance_date BETWEEN $2::date AND $3::date",
    ];
    if (await hasGateScanTables(db)) {
      where.push(GATE_LINKED_SCAN_EXISTS_SQL);
    }
    appendPeriodeFilter(where, params, periodeId);

    if (status) {
      params.push(status);
      where.push(`da.attendance_status = $${params.length}`);
    }
    if (userName) {
      params.push(`%${userName}%`);
      where.push(`u.full_name ILIKE $${params.length}`);
    }

    const [rowsResult, summaryResult] = await Promise.all([
      db.query(
        `SELECT
           da.id,
           TO_CHAR(da.attendance_date, 'YYYY-MM-DD') AS attendance_date,
           da.attendance_status,
           ${toJakartaTimestampSql("da.checkin_at")} AS checkin_at,
           ${toJakartaTimestampSql("da.checkout_at")} AS checkout_at,
           da.late_minutes,
           da.presence_minutes,
           da.notes,
           u.id AS user_id,
           u.full_name,
           st.nis,
           c.id AS class_id,
           c.name AS class_name,
           g.id AS grade_id,
           g.name AS grade_name
         FROM attendance.daily_attendance da
         JOIN u_users u ON u.id = da.user_id
         JOIN u_students st ON st.user_id = da.user_id
         LEFT JOIN a_class c ON c.id = st.current_class_id
         LEFT JOIN a_grade g ON g.id = c.grade_id
         WHERE ${where.join(" AND ")}
         ORDER BY
           GREATEST(da.checkout_at, da.checkin_at) DESC NULLS LAST,
           da.attendance_date DESC,
           u.full_name ASC`,
        params,
      ),
      db.query(
        `SELECT
           COUNT(*)::int AS total_records,
           COUNT(DISTINCT da.user_id)::int AS total_students,
           COUNT(*) FILTER (WHERE da.attendance_status = 'present')::int AS present_count,
           COUNT(*) FILTER (WHERE da.attendance_status = 'late')::int AS late_count,
           COUNT(*) FILTER (WHERE da.attendance_status = 'absent')::int AS absent_count,
           COUNT(*) FILTER (WHERE da.attendance_status = 'excused')::int AS excused_count,
           COUNT(*) FILTER (WHERE da.attendance_status = 'incomplete')::int AS incomplete_count,
           COUNT(*) FILTER (WHERE da.attendance_status = 'pending')::int AS pending_count
         FROM attendance.daily_attendance da
         JOIN u_users u ON u.id = da.user_id
         JOIN u_students st ON st.user_id = da.user_id
         LEFT JOIN a_class c ON c.id = st.current_class_id
         WHERE ${where.join(" AND ")}`,
        params,
      ),
    ]);

    return res.json({
      status: "success",
      data: {
        summary: summaryResult.rows[0] || emptyStudentPayload(startDate, endDate).summary,
        rows: rowsResult.rows,
        filters: {
          start_date: startDate,
          end_date: endDate,
          status,
          user_name: userName,
          homebase_id: homebaseId,
          periode_id: periodeId,
        },
      },
    });
  }),
);

// GET /api/center/attendance/reports/teachers
router.get(
  "/attendance/reports/teachers",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    const homebaseId = normalizeNumberOrNull(req.query?.homebase_id);
    const periodeId = normalizeNumberOrNull(req.query?.periode_id);
    const { startDate, endDate } = resolveReportRange(req.query);
    const status = String(req.query?.status || "").trim() || null;
    const userName = String(req.query?.user_name || "").trim() || null;

    if (!homebaseId) {
      return res.status(400).json({
        status: "error",
        message: "homebase_id wajib diisi.",
      });
    }

    if (!(await hasDailyAttendanceTable(db))) {
      return res.json({
        status: "success",
        data: emptyTeacherPayload(startDate, endDate),
      });
    }

    const params = [homebaseId, startDate, endDate];
    const where = [
      "da.homebase_id = $1",
      "da.target_role = 'teacher'",
      "da.attendance_date BETWEEN $2::date AND $3::date",
    ];
    if (await hasGateScanTables(db)) {
      where.push(GATE_LINKED_SCAN_EXISTS_SQL);
    }
    appendPeriodeFilter(where, params, periodeId);

    if (status) {
      params.push(status);
      where.push(`da.attendance_status = $${params.length}`);
    }
    if (userName) {
      params.push(`%${userName}%`);
      where.push(`u.full_name ILIKE $${params.length}`);
    }

    const hasRfidCard = Boolean(
      (
        await db.query(`SELECT to_regclass('attendance.rfid_card') AS table_name`)
      ).rows[0]?.table_name,
    );

    const cardUidSelect = hasRfidCard
      ? `(
           SELECT rc.card_uid
           FROM attendance.rfid_card rc
           WHERE rc.user_id = da.user_id
             AND rc.is_active = true
           ORDER BY rc.is_primary DESC, rc.id DESC
           LIMIT 1
         ) AS card_uid`
      : `NULL::text AS card_uid`;

    const [rowsResult, summaryResult] = await Promise.all([
      db.query(
        `SELECT
           da.id,
           TO_CHAR(da.attendance_date, 'YYYY-MM-DD') AS attendance_date,
           da.attendance_status,
           ${toJakartaTimestampSql("da.checkin_at")} AS checkin_at,
           ${toJakartaTimestampSql("da.checkout_at")} AS checkout_at,
           da.late_minutes,
           da.presence_minutes,
           da.notes,
           u.id AS user_id,
           u.full_name,
           t.nip,
           ${cardUidSelect}
         FROM attendance.daily_attendance da
         JOIN u_users u ON u.id = da.user_id
         JOIN u_teachers t ON t.user_id = da.user_id
         WHERE ${where.join(" AND ")}
         ORDER BY
           GREATEST(da.checkout_at, da.checkin_at) DESC NULLS LAST,
           da.attendance_date DESC,
           u.full_name ASC`,
        params,
      ),
      db.query(
        `SELECT
           COUNT(*)::int AS total_records,
           COUNT(DISTINCT da.user_id)::int AS total_teachers,
           COUNT(*) FILTER (WHERE da.attendance_status = 'present')::int AS present_count,
           COUNT(*) FILTER (WHERE da.attendance_status = 'late')::int AS late_count,
           COUNT(*) FILTER (WHERE da.attendance_status = 'absent')::int AS absent_count,
           COUNT(*) FILTER (WHERE da.attendance_status = 'incomplete')::int AS incomplete_count,
           COUNT(DISTINCT CASE
             WHEN da.attendance_status IN ('present', 'late') THEN da.user_id
           END)::int AS present_teachers,
           COUNT(DISTINCT CASE
             WHEN da.attendance_status = 'absent' THEN da.user_id
           END)::int AS absent_teachers
         FROM attendance.daily_attendance da
         JOIN u_users u ON u.id = da.user_id
         JOIN u_teachers t ON t.user_id = da.user_id
         WHERE ${where.join(" AND ")}`,
        params,
      ),
    ]);

    return res.json({
      status: "success",
      data: {
        summary: summaryResult.rows[0] || emptyTeacherPayload(startDate, endDate).summary,
        rows: rowsResult.rows,
        filters: {
          start_date: startDate,
          end_date: endDate,
          status,
          user_name: userName,
          homebase_id: homebaseId,
          periode_id: periodeId,
        },
      },
    });
  }),
);

export default router;
