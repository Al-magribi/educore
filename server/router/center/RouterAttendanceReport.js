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

/** Siswa: tampilkan tap gate + yang belum tap (absent/excused/pending). */
const STUDENT_REPORT_ROW_VISIBLE_SQL = `(
  ${GATE_LINKED_SCAN_EXISTS_SQL}
  OR da.attendance_status IN ('absent', 'excused', 'pending')
)`;

/** Guru: tampilkan tap gate + yang belum tap (absent/excused/pending). */
const TEACHER_REPORT_ROW_VISIBLE_SQL = `(
  ${GATE_LINKED_SCAN_EXISTS_SQL}
  OR da.attendance_status IN ('absent', 'excused', 'pending', 'not_scheduled')
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
    not_scheduled_count: 0,
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
    pending_count: 0,
    not_scheduled_count: 0,
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

const hasRfidCardTable = async (db) => {
  const result = await db.query(
    `SELECT to_regclass('attendance.rfid_card') AS table_name`,
  );
  return Boolean(result.rows[0]?.table_name);
};

const hasCalendarConfigTable = async (db) => {
  const result = await db.query(
    `SELECT to_regclass('attendance.attendance_calendar_config') AS table_name`,
  );
  return Boolean(result.rows[0]?.table_name);
};

const hasHolidayConfigTable = async (db) => {
  const result = await db.query(
    `SELECT to_regclass('attendance.attendance_holiday') AS table_name`,
  );
  return Boolean(result.rows[0]?.table_name);
};

const buildHasGateSql = (hasGateTables) =>
  hasGateTables ? GATE_LINKED_SCAN_EXISTS_SQL : `(da.checkin_at IS NOT NULL)`;

const buildCalendarCte = (hasCalendarTable) =>
  hasCalendarTable
    ? `calendar AS (
         SELECT
           COALESCE(
             (SELECT skip_saturday
              FROM attendance.attendance_calendar_config
              WHERE homebase_id = $1
              LIMIT 1),
             false
           ) AS skip_saturday,
           COALESCE(
             (SELECT skip_sunday
              FROM attendance.attendance_calendar_config
              WHERE homebase_id = $1
              LIMIT 1),
             true
           ) AS skip_sunday
       )`
    : `calendar AS (
         SELECT false AS skip_saturday, true AS skip_sunday
       )`;

const buildOffDaySql = (targetRole, hasHolidayTable) => {
  const holidaySql = hasHolidayTable
    ? `OR EXISTS (
         SELECT 1
         FROM attendance.attendance_holiday h
         WHERE h.homebase_id = $1
           AND h.is_active = true
           AND h.holiday_date = d.attendance_date
           AND h.applies_to_role IN ('all', '${targetRole}')
       )`
    : "";

  return `(
    (cal.skip_saturday AND EXTRACT(ISODOW FROM d.attendance_date) = 6)
    OR (cal.skip_sunday AND EXTRACT(ISODOW FROM d.attendance_date) = 7)
    ${holidaySql}
  )`;
};

/**
 * Status tampilan laporan:
 * - tap gerbang accepted → present / late / incomplete
 * - excused sungguhan (bukan sisa auto-pending tanpa tap) → excused
 * - absent → absent
 * - libur akhir pekan / hari libur tanpa tap → not_scheduled
 * - selain itu (tanpa baris, pending, present/excused tanpa tap) → pending
 */
const buildEffectiveStatusSql = (hasGateSql, offDaySql) => `
  CASE
    WHEN COALESCE((${hasGateSql}), false) THEN
      CASE
        WHEN da.attendance_status IN ('present', 'late', 'incomplete') THEN da.attendance_status
        ELSE 'present'
      END
    WHEN da.attendance_status = 'excused'
      AND COALESCE(da.notes, '') NOT ILIKE 'Auto-pending%' THEN 'excused'
    WHEN da.attendance_status = 'absent' THEN 'absent'
    WHEN ${offDaySql} THEN 'not_scheduled'
    ELSE 'pending'
  END
`;

const buildAttendanceJoinSql = (hasDailyTable, targetRole) => {
  if (!hasDailyTable) return "";
  return `
    LEFT JOIN attendance.daily_attendance da
      ON da.user_id = r.user_id
     AND da.attendance_date = d.attendance_date
     AND da.target_role = '${targetRole}'
     AND da.homebase_id = $1`;
};

const appendOptionalFilters = (params, { status, userName }) => {
  const where = [];
  if (status) {
    params.push(status);
    where.push(`rep.attendance_status = $${params.length}`);
  } else {
    where.push(`rep.attendance_status <> 'not_scheduled'`);
  }
  if (userName) {
    params.push(`%${userName}%`);
    where.push(`rep.full_name ILIKE $${params.length}`);
  }
  return where.length ? `WHERE ${where.join(" AND ")}` : "";
};

const attendanceSelectSql = ({
  hasDailyTable,
  hasGateTables,
  targetRole,
  hasHolidayTable,
}) => {
  const offDaySql = buildOffDaySql(targetRole, hasHolidayTable);
  if (!hasDailyTable) {
    return `
      CASE WHEN ${offDaySql} THEN 'not_scheduled'::text ELSE 'pending'::text END AS attendance_status,
      NULL::text AS checkin_at,
      NULL::text AS checkout_at,
      NULL::int AS late_minutes,
      NULL::int AS presence_minutes,
      NULL::text AS notes`;
  }

  const hasGateSql = buildHasGateSql(hasGateTables);
  const effectiveStatusSql = buildEffectiveStatusSql(hasGateSql, offDaySql);
  return `
      (${effectiveStatusSql}) AS attendance_status,
      ${toJakartaTimestampSql("da.checkin_at")} AS checkin_at,
      ${toJakartaTimestampSql("da.checkout_at")} AS checkout_at,
      da.late_minutes,
      da.presence_minutes,
      da.notes`;
};

const buildStudentReportCte = ({
  hasDailyTable,
  hasGateTables,
  hasCalendarTable,
  hasHolidayTable,
  periodeId,
  params,
}) => {
  const attendanceJoin = buildAttendanceJoinSql(hasDailyTable, "student");
  const attendanceSelect = attendanceSelectSql({
    hasDailyTable,
    hasGateTables,
    targetRole: "student",
    hasHolidayTable,
  });
  const calendarCte = buildCalendarCte(hasCalendarTable);

  let rosterPeriodeFilter = "";
  if (periodeId) {
    params.push(periodeId);
    rosterPeriodeFilter = `AND s.current_periode_id = $${params.length}`;
  }

  return `
    dates AS (
      SELECT generate_series($2::date, $3::date, INTERVAL '1 day')::date AS attendance_date
    ),
    ${calendarCte},
    roster AS (
      SELECT
        s.user_id,
        u.full_name,
        s.nis,
        c.id AS class_id,
        c.name AS class_name,
        g.id AS grade_id,
        g.name AS grade_name
      FROM u_students s
      JOIN u_users u ON u.id = s.user_id
      LEFT JOIN a_class c ON c.id = s.current_class_id
      LEFT JOIN a_grade g ON g.id = c.grade_id
      WHERE s.homebase_id = $1
        AND u.is_active = true
        ${rosterPeriodeFilter}
    ),
    report AS (
      SELECT
        COALESCE(
          ${hasDailyTable ? "da.id::text" : "NULL::text"},
          'roster-' || r.user_id::text || '-' || TO_CHAR(d.attendance_date, 'YYYY-MM-DD')
        ) AS id,
        TO_CHAR(d.attendance_date, 'YYYY-MM-DD') AS attendance_date,
        ${attendanceSelect},
        r.user_id,
        r.full_name,
        r.nis,
        r.class_id,
        r.class_name,
        r.grade_id,
        r.grade_name
      FROM roster r
      CROSS JOIN dates d
      CROSS JOIN calendar cal
      ${attendanceJoin}
    )`;
};

const buildTeacherReportCte = ({
  hasDailyTable,
  hasGateTables,
  hasRfidCard,
  hasCalendarTable,
  hasHolidayTable,
}) => {
  const attendanceJoin = buildAttendanceJoinSql(hasDailyTable, "teacher");
  const attendanceSelect = attendanceSelectSql({
    hasDailyTable,
    hasGateTables,
    targetRole: "teacher",
    hasHolidayTable,
  });
  const calendarCte = buildCalendarCte(hasCalendarTable);
  const cardUidSelect = hasRfidCard
    ? `(
         SELECT rc.card_uid
         FROM attendance.rfid_card rc
         WHERE rc.user_id = r.user_id
           AND rc.is_active = true
         ORDER BY rc.is_primary DESC, rc.id DESC
         LIMIT 1
       ) AS card_uid`
    : `NULL::text AS card_uid`;

  return `
    dates AS (
      SELECT generate_series($2::date, $3::date, INTERVAL '1 day')::date AS attendance_date
    ),
    ${calendarCte},
    roster AS (
      SELECT
        t.user_id,
        u.full_name,
        t.nip
      FROM u_teachers t
      JOIN u_users u ON u.id = t.user_id
      WHERE t.homebase_id = $1
        AND u.is_active = true
    ),
    report AS (
      SELECT
        COALESCE(
          ${hasDailyTable ? "da.id::text" : "NULL::text"},
          'roster-' || r.user_id::text || '-' || TO_CHAR(d.attendance_date, 'YYYY-MM-DD')
        ) AS id,
        TO_CHAR(d.attendance_date, 'YYYY-MM-DD') AS attendance_date,
        ${attendanceSelect},
        r.user_id,
        r.full_name,
        r.nip,
        ${cardUidSelect}
      FROM roster r
      CROSS JOIN dates d
      CROSS JOIN calendar cal
      ${attendanceJoin}
    )`;
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

    const [hasDailyTable, hasGateTables, hasCalendarTable, hasHolidayTable] = await Promise.all([
      hasDailyAttendanceTable(db),
      hasGateScanTables(db),
      hasCalendarConfigTable(db),
      hasHolidayConfigTable(db),
    ]);

    const cteParams = [homebaseId, startDate, endDate];
    const cte = buildStudentReportCte({
      hasDailyTable,
      hasGateTables,
      hasCalendarTable,
      hasHolidayTable,
      periodeId,
      params: cteParams,
    });

    const rowParams = [...cteParams];
    const rowWhere = appendOptionalFilters(rowParams, { status, userName });

    const [rowsResult, summaryResult] = await Promise.all([
      db.query(
        `WITH ${cte}
         SELECT *
         FROM report rep
         ${rowWhere}
         ORDER BY
           GREATEST(rep.checkout_at, rep.checkin_at) DESC NULLS LAST,
           rep.attendance_date DESC,
           rep.class_name ASC NULLS LAST,
           rep.full_name ASC`,
        rowParams,
      ),
      db.query(
        `WITH ${cte}
         SELECT
           COUNT(*)::int AS total_records,
           COUNT(DISTINCT rep.user_id)::int AS total_students,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'present')::int AS present_count,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'late')::int AS late_count,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'absent')::int AS absent_count,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'excused')::int AS excused_count,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'incomplete')::int AS incomplete_count,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'pending')::int AS pending_count,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'not_scheduled')::int AS not_scheduled_count
         FROM report rep`,
        cteParams,
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

    const [hasDailyTable, hasGateTables, hasRfidCard, hasCalendarTable, hasHolidayTable] =
      await Promise.all([
        hasDailyAttendanceTable(db),
        hasGateScanTables(db),
        hasRfidCardTable(db),
        hasCalendarConfigTable(db),
        hasHolidayConfigTable(db),
      ]);

    const cteParams = [homebaseId, startDate, endDate];
    const cte = buildTeacherReportCte({
      hasDailyTable,
      hasGateTables,
      hasRfidCard,
      hasCalendarTable,
      hasHolidayTable,
    });

    const rowParams = [...cteParams];
    const rowWhere = appendOptionalFilters(rowParams, { status, userName });

    const [rowsResult, summaryResult] = await Promise.all([
      db.query(
        `WITH ${cte}
         SELECT *
         FROM report rep
         ${rowWhere}
         ORDER BY
           GREATEST(rep.checkout_at, rep.checkin_at) DESC NULLS LAST,
           rep.attendance_date DESC,
           rep.full_name ASC`,
        rowParams,
      ),
      db.query(
        `WITH ${cte}
         SELECT
           COUNT(*)::int AS total_records,
           COUNT(DISTINCT rep.user_id)::int AS total_teachers,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'present')::int AS present_count,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'late')::int AS late_count,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'absent')::int AS absent_count,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'incomplete')::int AS incomplete_count,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'pending')::int AS pending_count,
           COUNT(*) FILTER (WHERE rep.attendance_status = 'not_scheduled')::int AS not_scheduled_count,
           COUNT(DISTINCT CASE
             WHEN rep.attendance_status IN ('present', 'late', 'incomplete') THEN rep.user_id
           END)::int AS present_teachers,
           COUNT(DISTINCT CASE
             WHEN rep.attendance_status NOT IN ('present', 'late', 'incomplete', 'not_scheduled') THEN rep.user_id
           END)::int AS absent_teachers
         FROM report rep`,
        cteParams,
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
