import { Router } from "express";
import { randomBytes } from "crypto";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  applyRfidScanToDailyAttendance,
  checkDuplicateScan,
  DAILY_GATE_ACTION,
  isDailyGateAction,
  jakartaLocalToDate,
  reconcilePendingScanLogs,
  resolveDailyGateScanAction,
  resolveScanPolicyDayRule,
  toJakartaDateString,
  validateScanTimeWindow,
} from "../../services/attendance/rfidDailyAttendance.js";
import { applyRfidScanToTeacherSession } from "../../services/attendance/rfidTeacherSession.js";
import {
  deleteDailyAttendanceCascade,
  deleteDailyAttendanceCascadeBulk,
  deleteScanLogsCascade,
} from "../../services/attendance/attendanceReportDelete.js";
import "../../services/attendance/attendanceJobs.js";
import "../../services/whatsapp/whatsappJobs.js";

const router = Router();

const DAILY_ATTENDANCE_STATUSES = new Set([
  "pending",
  "present",
  "late",
  "absent",
  "excused",
  "not_scheduled",
  "incomplete",
  "insufficient_hours",
]);

const ALLOWED_STATUSES = new Set([
  "Hadir",
  "Telat",
  "Sakit",
  "Izin",
  "Alpa",
  "Alpha",
]);

const normalizeStatus = (status) => {
  if (!status) return null;
  const lower = String(status).toLowerCase();
  if (lower === "alpha") return "Alpa";
  if (lower === "alpa") return "Alpa";
  if (lower === "telat") return "Telat";
  if (lower === "hadir") return "Hadir";
  if (lower === "sakit") return "Sakit";
  if (lower === "izin") return "Izin";
  return status;
};

const ATTENDANCE_FEATURE_CODES = [
  "teacher_daily_attendance",
  "teacher_class_session_attendance",
  "student_daily_attendance",
  "student_checkout_logging",
];

const POLICY_TARGET_ROLES = new Set(["student", "teacher"]);
const POLICY_TYPES = new Set([
  "student_fixed",
  "teacher_schedule_based",
  "teacher_fixed_daily",
]);
const DEVICE_TYPES = new Set(["gate", "classroom"]);
const ASSIGNMENT_SCOPES = new Set(["user", "class", "grade", "homebase"]);
const JAKARTA_TZ = "Asia/Jakarta";

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

const toJakartaTimestampSql = (columnSql) =>
  `CASE WHEN ${columnSql} IS NULL THEN NULL ELSE TO_CHAR((${columnSql} AT TIME ZONE '${JAKARTA_TZ}'), 'YYYY-MM-DD HH24:MI:SS') END`;

const getDefaultDateRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const toIsoDate = (value) => value.toISOString().slice(0, 10);
  return {
    startDate: toIsoDate(start),
    endDate: toIsoDate(end),
  };
};

const resolveReportRange = (query = {}) => {
  const fallback = getDefaultDateRange();
  const startDate = String(query.start_date || "").trim() || fallback.startDate;
  const endDate = String(query.end_date || "").trim() || fallback.endDate;
  return { startDate, endDate };
};

const normalizeTimeOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const text = String(value).trim();
  if (!/^\d{2}:\d{2}(:\d{2})?$/.test(text)) return null;
  return text.length === 5 ? `${text}:00` : text;
};

const normalizeNumberOrNull = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  return Math.trunc(num);
};

const normalizeBulkIds = (value, { maxItems = 200 } = {}) => {
  const raw = Array.isArray(value) ? value : [];
  const ids = [
    ...new Set(
      raw
        .map((item) => normalizeNumberOrNull(item))
        .filter((item) => item !== null),
    ),
  ];

  if (ids.length === 0) {
    return { ids: [], error: "Daftar ID wajib diisi." };
  }
  if (ids.length > maxItems) {
    return {
      ids: [],
      error: `Maksimal ${maxItems} item per permintaan.`,
    };
  }

  return { ids, error: null };
};

const parseTimestampOrNull = (value) => {
  if (value === null || value === "") return null;
  if (value === undefined) return undefined;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
};

const evaluateManualCheckinStatus = (checkinAt, dayRule) => {
  if (!dayRule?.reference_checkin_time) {
    return { attendanceStatus: "present", lateMinutes: 0 };
  }

  const attendanceDate = toJakartaDateString(checkinAt);
  const referenceAt = jakartaLocalToDate(
    attendanceDate,
    dayRule.reference_checkin_time,
  );
  if (!referenceAt) {
    return { attendanceStatus: "present", lateMinutes: 0 };
  }

  const toleranceMinutes = Number(dayRule.late_tolerance_minutes || 0);
  const diffMinutes = Math.floor(
    (checkinAt.getTime() - referenceAt.getTime()) / 60000,
  );

  if (diffMinutes <= toleranceMinutes) {
    return { attendanceStatus: "present", lateMinutes: 0 };
  }

  return { attendanceStatus: "late", lateMinutes: diffMinutes };
};

const recalculateDailyAttendanceFields = ({
  checkinAt,
  checkoutAt,
  dayRule,
}) => {
  if (!checkinAt && !checkoutAt) {
    return {
      attendanceStatus: "pending",
      lateMinutes: 0,
      presenceMinutes: null,
    };
  }

  if (!checkinAt) {
    return {
      attendanceStatus: "incomplete",
      lateMinutes: 0,
      presenceMinutes: null,
    };
  }

  const { attendanceStatus, lateMinutes } = evaluateManualCheckinStatus(
    checkinAt,
    dayRule,
  );

  if (!checkoutAt) {
    return {
      attendanceStatus,
      lateMinutes,
      presenceMinutes: null,
    };
  }

  const presenceMinutes = Math.max(
    0,
    Math.floor((checkoutAt.getTime() - checkinAt.getTime()) / 60000),
  );
  const minimumRequiredMinutes = dayRule?.min_presence_minutes ?? null;
  let finalStatus = attendanceStatus;

  if (
    minimumRequiredMinutes &&
    presenceMinutes < minimumRequiredMinutes &&
    finalStatus !== "late"
  ) {
    finalStatus = "insufficient_hours";
  }

  return {
    attendanceStatus: finalStatus,
    lateMinutes,
    presenceMinutes,
  };
};

const getAttendanceFeatureRows = async (pool, homebaseId) => {
  const featureResult = await pool.query(
    `SELECT feature_code, is_enabled, notes, updated_at
     FROM attendance.attendance_feature_setting
     WHERE homebase_id = $1`,
    [homebaseId],
  );

  const featureMap = Object.fromEntries(
    ATTENDANCE_FEATURE_CODES.map((featureCode) => [
      featureCode,
      { feature_code: featureCode, is_enabled: false, notes: null },
    ]),
  );

  featureResult.rows.forEach((row) => {
    featureMap[row.feature_code] = {
      feature_code: row.feature_code,
      is_enabled: row.is_enabled === true,
      notes: row.notes || null,
      updated_at: row.updated_at || null,
    };
  });

  return ATTENDANCE_FEATURE_CODES.map((featureCode) => featureMap[featureCode]);
};

const getPoliciesWithRules = async (pool, homebaseId, filters = {}) => {
  const { targetRole, policyType } = filters;
  const params = [homebaseId];
  const where = ["p.homebase_id = $1"];

  if (targetRole) {
    params.push(targetRole);
    where.push(`p.target_role = $${params.length}`);
  }
  if (policyType) {
    params.push(policyType);
    where.push(`p.policy_type = $${params.length}`);
  }

  const policyResult = await pool.query(
    `SELECT
       p.id,
       p.name,
       p.code,
       p.target_role,
       p.policy_type,
       p.description,
       p.is_active,
       p.updated_at
     FROM attendance.attendance_policy p
     WHERE ${where.join(" AND ")}
     ORDER BY p.target_role ASC, p.policy_type ASC, p.name ASC`,
    params,
  );

  if (policyResult.rowCount === 0) {
    return [];
  }

  const policyIds = policyResult.rows.map((item) => item.id);
  const dayRuleResult = await pool.query(
    `SELECT
       r.id,
       r.policy_id,
       r.day_of_week,
       r.is_active,
       r.checkin_start,
       r.checkin_end,
       r.reference_checkin_time,
       r.late_tolerance_minutes,
       r.checkout_start,
       r.reference_checkout_time,
       r.checkout_is_optional,
       r.min_presence_minutes,
       r.notes
     FROM attendance.attendance_policy_day_rule r
     WHERE r.policy_id = ANY($1::int[])
     ORDER BY r.policy_id ASC, r.day_of_week ASC`,
    [policyIds],
  );

  const ruleMap = new Map();
  dayRuleResult.rows.forEach((row) => {
    if (!ruleMap.has(row.policy_id)) {
      ruleMap.set(row.policy_id, []);
    }
    ruleMap.get(row.policy_id).push(row);
  });

  return policyResult.rows.map((policy) => ({
    ...policy,
    day_rules: ruleMap.get(policy.id) || [],
  }));
};

const getAttendanceClasses = async (pool, homebaseId) => {
  const result = await pool.query(
    `SELECT id, name
     FROM a_class
     WHERE homebase_id = $1
     ORDER BY name ASC`,
    [homebaseId],
  );
  return result.rows;
};

const getRfidDevices = async (pool, homebaseId) => {
  const result = await pool.query(
    `SELECT
       d.id,
       d.code,
       d.name,
       d.device_type,
       d.class_id,
       c.name AS class_name,
       d.location_group,
       d.location_detail,
       d.ip_address,
       d.mac_address,
       d.firmware_version,
       d.is_active,
       d.last_seen_at,
       d.installed_at,
       d.updated_at
     FROM attendance.rfid_device d
     LEFT JOIN a_class c ON c.id = d.class_id
     WHERE d.homebase_id = $1
     ORDER BY d.device_type ASC, d.name ASC`,
    [homebaseId],
  );

  return result.rows;
};

const getPolicyAssignments = async (pool, homebaseId, filters = {}) => {
  const { targetRole, assignmentScope } = filters;
  const params = [homebaseId];
  const where = ["a.homebase_id = $1", "p.homebase_id = $1"];

  if (targetRole) {
    params.push(targetRole);
    where.push(`p.target_role = $${params.length}`);
  }
  if (assignmentScope) {
    params.push(assignmentScope);
    where.push(`a.assignment_scope = $${params.length}`);
  }

  const result = await pool.query(
    `SELECT
       a.id,
       a.policy_id,
       p.name AS policy_name,
       p.code AS policy_code,
       p.target_role,
       p.policy_type,
       a.assignment_scope,
       a.user_id,
       u.full_name AS user_name,
       a.class_id,
       c.name AS class_name,
       a.grade_id,
       g.name AS grade_name,
       a.effective_start_date,
       a.effective_end_date,
       a.is_active,
       a.updated_at
     FROM attendance.attendance_policy_assignment a
     JOIN attendance.attendance_policy p ON p.id = a.policy_id
     LEFT JOIN u_users u ON u.id = a.user_id
     LEFT JOIN a_class c ON c.id = a.class_id
     LEFT JOIN a_grade g ON g.id = a.grade_id
     WHERE ${where.join(" AND ")}
     ORDER BY a.assignment_scope ASC, p.target_role ASC, p.name ASC, a.id DESC`,
    params,
  );

  return result.rows;
};

const getAssignmentBootstrapData = async (pool, homebaseId) => {
  const [policiesRes, teachersRes, studentsRes, classesRes, gradesRes] =
    await Promise.all([
      pool.query(
        `SELECT id, name, code, target_role, policy_type, is_active
         FROM attendance.attendance_policy
         WHERE homebase_id = $1
         ORDER BY target_role ASC, name ASC`,
        [homebaseId],
      ),
      pool.query(
        `SELECT u.id AS user_id, u.full_name
         FROM u_teachers t
         JOIN u_users u ON u.id = t.user_id
         WHERE t.homebase_id = $1 AND u.is_active = true
         ORDER BY u.full_name ASC`,
        [homebaseId],
      ),
      pool.query(
        `SELECT u.id AS user_id, u.full_name, s.nis
         FROM u_students s
         JOIN u_users u ON u.id = s.user_id
         WHERE s.homebase_id = $1 AND u.is_active = true
         ORDER BY u.full_name ASC`,
        [homebaseId],
      ),
      pool.query(
        `SELECT id, name
         FROM a_class
         WHERE homebase_id = $1
         ORDER BY name ASC`,
        [homebaseId],
      ),
      pool.query(
        `SELECT id, name
         FROM a_grade
         WHERE homebase_id = $1
         ORDER BY name ASC`,
        [homebaseId],
      ),
    ]);

  return {
    policies: policiesRes.rows,
    teachers: teachersRes.rows,
    students: studentsRes.rows,
    classes: classesRes.rows,
    grades: gradesRes.rows,
  };
};

const ensureActivePeriode = async (pool, homebaseId) => {
  const periodeResult = await pool.query(
    `SELECT id, name 
     FROM a_periode 
     WHERE homebase_id = $1 AND is_active = true 
     ORDER BY id DESC 
     LIMIT 1`,
    [homebaseId],
  );
  return periodeResult.rows[0] || null;
};

// ==========================================
// GET Attendance Students (Role-based)
// ==========================================
router.get(
  "/attendance/students",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, date } = req.query;

    if (!subject_id || !class_id || !date) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan date wajib diisi.",
      });
    }

    if (role === "teacher") {
      const accessCheck = await pool.query(
        `SELECT 1
         FROM at_subject
         WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3
         LIMIT 1`,
        [userId, subject_id, class_id],
      );
      if (accessCheck.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const accessCheck = await pool.query(
        `SELECT 1
         FROM a_subject s
         JOIN a_class c ON c.id = $2
         WHERE s.id = $1 AND s.homebase_id = $3 AND c.homebase_id = $3
         LIMIT 1`,
        [subject_id, class_id, homebase_id],
      );
      if (accessCheck.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    }

    const activePeriode = await ensureActivePeriode(pool, homebase_id);
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const metaResult = await pool.query(
      `SELECT s.name AS subject_name, c.name AS class_name
       FROM a_subject s
       JOIN a_class c ON c.id = $2
       WHERE s.id = $1
       LIMIT 1`,
      [subject_id, class_id],
    );

    const studentResult = await pool.query(
      `SELECT
         u.id AS student_id,
         u.full_name,
         u.gender,
         st.nis,
         st.nisn,
         c.id AS class_id,
         c.name AS class_name,
         a.id AS attendance_id,
         a.status,
         a.date
       FROM u_class_enrollments e
       JOIN u_users u ON e.student_id = u.id
       JOIN u_students st ON e.student_id = st.user_id
       JOIN a_class c ON e.class_id = c.id
       LEFT JOIN lms.l_attendance a
         ON a.student_id = e.student_id
        AND a.class_id = e.class_id
        AND a.subject_id = $1
        AND a.date = $2::date
       WHERE e.class_id = $3
         AND e.periode_id = $4
       ORDER BY u.full_name ASC`,
      [subject_id, date, class_id, activePeriode.id],
    );

    const students = studentResult.rows.map((row) => ({
      ...row,
      status: normalizeStatus(row.status),
    }));

    return res.json({
      status: "success",
      data: {
        meta: {
          subject_id: parseInt(subject_id, 10),
          subject_name: metaResult.rows[0]?.subject_name || "-",
          class_id: parseInt(class_id, 10),
          class_name: metaResult.rows[0]?.class_name || "-",
          date,
          periode_id: activePeriode.id,
          periode_name: activePeriode.name,
          total_students: students.length,
        },
        students,
      },
    });
  }),
);

// ==========================================
// SUBMIT Attendance (Role-based)
// ==========================================
router.post(
  "/attendance/submit",
  authorize("satuan", "teacher"),
  withTransaction(async (req, res, client) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, date, teacher_id, items } = req.body;

    if (!subject_id || !class_id || !date) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan date wajib diisi.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Data absensi siswa belum ada.",
      });
    }
    const effectiveTeacherId =
      role === "teacher" ? userId : Number(teacher_id || 0) || null;
    if (!effectiveTeacherId) {
      return res.status(400).json({
        status: "error",
        message: "teacher_id wajib diisi.",
      });
    }

    if (role === "teacher") {
      const accessCheck = await client.query(
        `SELECT 1
         FROM at_subject
         WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3
         LIMIT 1`,
        [userId, subject_id, class_id],
      );
      if (accessCheck.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const accessCheck = await client.query(
        `SELECT 1
         FROM a_subject s
         JOIN a_class c ON c.id = $2
         WHERE s.id = $1 AND s.homebase_id = $3 AND c.homebase_id = $3
         LIMIT 1`,
        [subject_id, class_id, homebase_id],
      );
      if (accessCheck.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    }

    await client.query(
      `DELETE FROM lms.l_attendance
       WHERE class_id = $1 AND subject_id = $2 AND date = $3::date`,
      [class_id, subject_id, date],
    );

    for (const item of items) {
      const status = normalizeStatus(item.status);
      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({
          status: "error",
          message: `Status tidak valid: ${item.status}`,
        });
      }

      await client.query(
        `INSERT INTO lms.l_attendance (
           class_id,
           subject_id,
           student_id,
           date,
           status,
           teacher_id
         )
         VALUES ($1, $2, $3, $4::date, $5, $6)`,
        [
          class_id,
          subject_id,
          item.student_id,
          date,
          status,
          effectiveTeacherId,
        ],
      );
    }

    return res.json({
      status: "success",
      message: "Absensi berhasil disimpan.",
    });
  }),
);

// ==========================================
// Attendance Config - Bootstrap
// ==========================================
router.get(
  "/attendance/config",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;

    const [features, policies, devices, classes] = await Promise.all([
      getAttendanceFeatureRows(pool, homebase_id),
      getPoliciesWithRules(pool, homebase_id),
      getRfidDevices(pool, homebase_id),
      getAttendanceClasses(pool, homebase_id),
    ]);

    return res.json({
      status: "success",
      data: {
        features,
        policies,
        devices,
        classes,
      },
    });
  }),
);

// ==========================================
// Attendance Config - Feature Setting
// ==========================================
router.put(
  "/attendance/config/features",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const { items } = req.body || {};

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "items wajib diisi.",
      });
    }

    for (const rawItem of items) {
      const featureCode = String(rawItem?.feature_code || "").trim();
      if (!ATTENDANCE_FEATURE_CODES.includes(featureCode)) {
        return res.status(400).json({
          status: "error",
          message: `feature_code tidak valid: ${rawItem?.feature_code || "-"}`,
        });
      }
      const isEnabled = rawItem?.is_enabled === true;
      const notes =
        rawItem?.notes === undefined || rawItem?.notes === null
          ? null
          : String(rawItem.notes || "").trim() || null;

      await client.query(
        `INSERT INTO attendance.attendance_feature_setting (
           homebase_id,
           feature_code,
           is_enabled,
           notes,
           created_by,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (homebase_id, feature_code)
         DO UPDATE SET
           is_enabled = EXCLUDED.is_enabled,
           notes = EXCLUDED.notes,
           updated_at = NOW()`,
        [homebase_id, featureCode, isEnabled, notes, userId],
      );
    }

    const features = await getAttendanceFeatureRows(client, homebase_id);
    return res.json({
      status: "success",
      message: "Pengaturan fitur absensi berhasil disimpan.",
      data: features,
    });
  }),
);

// ==========================================
// Attendance Config - Policy
// ==========================================
router.get(
  "/attendance/config/policies",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const targetRole = String(req.query?.target_role || "").trim() || null;
    const policyType = String(req.query?.policy_type || "").trim() || null;

    if (targetRole && !POLICY_TARGET_ROLES.has(targetRole)) {
      return res.status(400).json({
        status: "error",
        message: "target_role tidak valid.",
      });
    }
    if (policyType && !POLICY_TYPES.has(policyType)) {
      return res.status(400).json({
        status: "error",
        message: "policy_type tidak valid.",
      });
    }

    const policies = await getPoliciesWithRules(pool, homebase_id, {
      targetRole,
      policyType,
    });

    return res.json({
      status: "success",
      data: policies,
    });
  }),
);

const upsertPolicyHandler = async (req, res, client, policyIdFromParam = null) => {
  const { id: userId, homebase_id } = req.user;
  const payload = req.body || {};
  const editingPolicyId = policyIdFromParam || Number(payload.id || 0) || null;

  const name = String(payload.name || "").trim();
  const code = String(payload.code || "").trim();
  const targetRole = String(payload.target_role || "").trim();
  const policyType = String(payload.policy_type || "").trim();
  const description = String(payload.description || "").trim() || null;
  const isActive = payload.is_active !== false;
  const dayRules = Array.isArray(payload.day_rules) ? payload.day_rules : [];

  if (!name || !code || !targetRole || !policyType) {
    return res.status(400).json({
      status: "error",
      message: "name, code, target_role, policy_type wajib diisi.",
    });
  }
  if (!POLICY_TARGET_ROLES.has(targetRole)) {
    return res.status(400).json({ status: "error", message: "target_role tidak valid." });
  }
  if (!POLICY_TYPES.has(policyType)) {
    return res.status(400).json({ status: "error", message: "policy_type tidak valid." });
  }

  for (const rawRule of dayRules) {
    const dayOfWeek = normalizeNumberOrNull(rawRule?.day_of_week);
    const lateToleranceMinutes = normalizeNumberOrNull(rawRule?.late_tolerance_minutes) ?? 0;
    const minPresenceMinutes = normalizeNumberOrNull(rawRule?.min_presence_minutes);
    const checkinStart = normalizeTimeOrNull(rawRule?.checkin_start);
    const checkinEnd = normalizeTimeOrNull(rawRule?.checkin_end);
    const checkoutStart = normalizeTimeOrNull(rawRule?.checkout_start);
    const referenceCheckoutTime = normalizeTimeOrNull(rawRule?.reference_checkout_time);

    if (!dayOfWeek || dayOfWeek < 1 || dayOfWeek > 7) {
      return res.status(400).json({ status: "error", message: "day_of_week harus antara 1-7." });
    }
    if (lateToleranceMinutes < 0) {
      return res.status(400).json({ status: "error", message: "late_tolerance_minutes tidak boleh negatif." });
    }
    if (minPresenceMinutes !== null && minPresenceMinutes < 0) {
      return res.status(400).json({ status: "error", message: "min_presence_minutes tidak boleh negatif." });
    }
    if ((checkinStart && !checkinEnd) || (!checkinStart && checkinEnd)) {
      return res.status(400).json({
        status: "error",
        message: "checkin_start dan checkin_end harus diisi berpasangan.",
      });
    }
    if (checkoutStart && referenceCheckoutTime && checkoutStart >= referenceCheckoutTime) {
      return res.status(400).json({
        status: "error",
        message: "checkout_start harus lebih kecil dari reference_checkout_time.",
      });
    }
  }

  let policyId = editingPolicyId;
  if (policyId) {
    const existing = await client.query(
      `SELECT id
       FROM attendance.attendance_policy
       WHERE id = $1 AND homebase_id = $2
       LIMIT 1`,
      [policyId, homebase_id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "Policy tidak ditemukan." });
    }

    await client.query(
      `UPDATE attendance.attendance_policy
       SET
         name = $1,
         code = $2,
         target_role = $3,
         policy_type = $4,
         description = $5,
         is_active = $6,
         updated_at = NOW()
       WHERE id = $7`,
      [name, code, targetRole, policyType, description, isActive, policyId],
    );
  } else {
    const insert = await client.query(
      `INSERT INTO attendance.attendance_policy (
         homebase_id,
         name,
         code,
         target_role,
         policy_type,
         description,
         is_active,
         created_by,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       RETURNING id`,
      [homebase_id, name, code, targetRole, policyType, description, isActive, userId],
    );
    policyId = insert.rows[0].id;
  }

  await client.query(
    `DELETE FROM attendance.attendance_policy_day_rule
     WHERE policy_id = $1`,
    [policyId],
  );

  for (const rawRule of dayRules) {
    const dayOfWeek = normalizeNumberOrNull(rawRule?.day_of_week);
    const isRuleActive = rawRule?.is_active !== false;
    const lateToleranceMinutes = normalizeNumberOrNull(rawRule?.late_tolerance_minutes) ?? 0;
    const minPresenceMinutes = normalizeNumberOrNull(rawRule?.min_presence_minutes);
    const checkoutIsOptional = rawRule?.checkout_is_optional === true;
    const ruleNotes = String(rawRule?.notes || "").trim() || null;

    await client.query(
      `INSERT INTO attendance.attendance_policy_day_rule (
         policy_id,
         day_of_week,
         is_active,
         checkin_start,
         checkin_end,
         reference_checkin_time,
         late_tolerance_minutes,
         checkout_start,
         reference_checkout_time,
         checkout_is_optional,
         min_presence_minutes,
         notes,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4::time, $5::time, $6::time, $7,
         $8::time, $9::time, $10, $11, $12, NOW()
       )`,
      [
        policyId,
        dayOfWeek,
        isRuleActive,
        normalizeTimeOrNull(rawRule?.checkin_start),
        normalizeTimeOrNull(rawRule?.checkin_end),
        normalizeTimeOrNull(rawRule?.reference_checkin_time),
        lateToleranceMinutes,
        normalizeTimeOrNull(rawRule?.checkout_start),
        normalizeTimeOrNull(rawRule?.reference_checkout_time),
        checkoutIsOptional,
        minPresenceMinutes,
        ruleNotes,
      ],
    );
  }

  const policies = await getPoliciesWithRules(client, homebase_id, {
    targetRole,
    policyType,
  });

  return res.json({
    status: "success",
    message: "Policy absensi berhasil disimpan.",
    data: {
      policy_id: policyId,
      policies,
    },
  });
};

router.post(
  "/attendance/config/policies",
  authorize("satuan"),
  withTransaction(async (req, res, client) => upsertPolicyHandler(req, res, client)),
);

router.put(
  "/attendance/config/policies/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) =>
    upsertPolicyHandler(req, res, client, Number(req.params.id || 0) || null),
  ),
);

router.delete(
  "/attendance/config/policies/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const policyId = Number(req.params.id || 0);
    if (!policyId) {
      return res
        .status(400)
        .json({ status: "error", message: "id policy tidak valid." });
    }

    const existing = await client.query(
      `SELECT id, name
       FROM attendance.attendance_policy
       WHERE id = $1 AND homebase_id = $2
       LIMIT 1`,
      [policyId, homebase_id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Policy tidak ditemukan.",
      });
    }

    const [assignmentCountRes, dayRuleCountRes] = await Promise.all([
      client.query(
        `SELECT COUNT(*)::int AS total
         FROM attendance.attendance_policy_assignment
         WHERE policy_id = $1`,
        [policyId],
      ),
      client.query(
        `SELECT COUNT(*)::int AS total
         FROM attendance.attendance_policy_day_rule
         WHERE policy_id = $1`,
        [policyId],
      ),
    ]);

    await client.query(
      `DELETE FROM attendance.attendance_policy
       WHERE id = $1 AND homebase_id = $2`,
      [policyId, homebase_id],
    );

    return res.json({
      status: "success",
      message: "Policy absensi berhasil dihapus.",
      data: {
        policy_id: policyId,
        policy_name: existing.rows[0].name,
        deleted_assignment_count: assignmentCountRes.rows[0]?.total || 0,
        deleted_day_rule_count: dayRuleCountRes.rows[0]?.total || 0,
      },
    });
  }),
);

// ==========================================
// Attendance Config - RFID Device
// ==========================================
router.get(
  "/attendance/config/devices",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const devices = await getRfidDevices(pool, homebase_id);
    return res.json({ status: "success", data: devices });
  }),
);

const upsertDeviceHandler = async (req, res, client, deviceIdFromParam = null) => {
  const { id: userId, homebase_id } = req.user;
  const payload = req.body || {};
  const editingDeviceId = deviceIdFromParam || Number(payload.id || 0) || null;

  const code = String(payload.code || "").trim();
  const name = String(payload.name || "").trim();
  const deviceType = String(payload.device_type || "").trim();
  const classId = normalizeNumberOrNull(payload.class_id);
  const isActive = payload.is_active !== false;
  const locationGroup = String(payload.location_group || "").trim() || null;
  const locationDetail = String(payload.location_detail || "").trim() || null;
  const ipAddress = String(payload.ip_address || "").trim() || null;
  const macAddress = String(payload.mac_address || "").trim() || null;
  const firmwareVersion = String(payload.firmware_version || "").trim() || null;
  const apiToken =
    String(payload.api_token || "").trim() ||
    `rfid_${randomBytes(16).toString("hex")}`;

  if (!code || !name || !deviceType) {
    return res.status(400).json({
      status: "error",
      message: "code, name, dan device_type wajib diisi.",
    });
  }
  if (!DEVICE_TYPES.has(deviceType)) {
    return res.status(400).json({
      status: "error",
      message: "device_type harus gate atau classroom.",
    });
  }
  if (deviceType === "classroom" && !classId) {
    return res.status(400).json({
      status: "error",
      message: "class_id wajib untuk device_type classroom.",
    });
  }
  if (deviceType === "gate" && classId) {
    return res.status(400).json({
      status: "error",
      message: "class_id harus kosong untuk device_type gate.",
    });
  }

  if (classId) {
    const classResult = await client.query(
      `SELECT id
       FROM a_class
       WHERE id = $1 AND homebase_id = $2
       LIMIT 1`,
      [classId, homebase_id],
    );
    if (classResult.rowCount === 0) {
      return res.status(400).json({
        status: "error",
        message: "class_id tidak valid untuk homebase ini.",
      });
    }
  }

  if (editingDeviceId) {
    const existing = await client.query(
      `SELECT id
       FROM attendance.rfid_device
       WHERE id = $1 AND homebase_id = $2
       LIMIT 1`,
      [editingDeviceId, homebase_id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({ status: "error", message: "Device tidak ditemukan." });
    }

    await client.query(
      `UPDATE attendance.rfid_device
       SET
         class_id = $1,
         code = $2,
         name = $3,
         device_type = $4,
         location_group = $5,
         location_detail = $6,
         ip_address = $7,
         mac_address = $8,
         api_token = $9,
         firmware_version = $10,
         is_active = $11,
         updated_at = NOW()
       WHERE id = $12`,
      [
        classId,
        code,
        name,
        deviceType,
        locationGroup,
        locationDetail,
        ipAddress,
        macAddress,
        apiToken,
        firmwareVersion,
        isActive,
        editingDeviceId,
      ],
    );
  } else {
    await client.query(
      `INSERT INTO attendance.rfid_device (
         homebase_id,
         class_id,
         code,
         name,
         device_type,
         location_group,
         location_detail,
         ip_address,
         mac_address,
         api_token,
         firmware_version,
         is_active,
         created_by,
         updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW()
       )`,
      [
        homebase_id,
        classId,
        code,
        name,
        deviceType,
        locationGroup,
        locationDetail,
        ipAddress,
        macAddress,
        apiToken,
        firmwareVersion,
        isActive,
        userId,
      ],
    );
  }

  const devices = await getRfidDevices(client, homebase_id);
  return res.json({
    status: "success",
    message: "Device RFID berhasil disimpan.",
    data: devices,
  });
};

router.post(
  "/attendance/config/devices",
  authorize("satuan"),
  withTransaction(async (req, res, client) => upsertDeviceHandler(req, res, client)),
);

router.put(
  "/attendance/config/devices/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) =>
    upsertDeviceHandler(req, res, client, Number(req.params.id || 0) || null),
  ),
);

router.post(
  "/attendance/config/devices/bulk-delete",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const { ids, error } = normalizeBulkIds(req.body?.ids);
    if (error) {
      return res.status(400).json({
        status: "error",
        message: error,
      });
    }

    const deleted = await client.query(
      `DELETE FROM attendance.rfid_device
       WHERE homebase_id = $1
         AND id = ANY($2::int[])
       RETURNING id`,
      [homebase_id, ids],
    );

    return res.json({
      status: "success",
      message: `${deleted.rowCount} device RFID berhasil dihapus.`,
      data: {
        deleted_count: deleted.rowCount,
        deleted_ids: deleted.rows.map((row) => row.id),
      },
    });
  }),
);

// ==========================================
// Attendance Config - Policy Assignment
// ==========================================
router.get(
  "/attendance/config/policy-assignments/bootstrap",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const [options, assignments] = await Promise.all([
      getAssignmentBootstrapData(pool, homebase_id),
      getPolicyAssignments(pool, homebase_id),
    ]);

    return res.json({
      status: "success",
      data: {
        options,
        assignments,
      },
    });
  }),
);

router.get(
  "/attendance/config/policy-assignments",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const targetRole = String(req.query?.target_role || "").trim() || null;
    const assignmentScope =
      String(req.query?.assignment_scope || "").trim() || null;

    if (targetRole && !POLICY_TARGET_ROLES.has(targetRole)) {
      return res
        .status(400)
        .json({ status: "error", message: "target_role tidak valid." });
    }
    if (assignmentScope && !ASSIGNMENT_SCOPES.has(assignmentScope)) {
      return res
        .status(400)
        .json({ status: "error", message: "assignment_scope tidak valid." });
    }

    const rows = await getPolicyAssignments(pool, homebase_id, {
      targetRole,
      assignmentScope,
    });

    return res.json({
      status: "success",
      data: rows,
    });
  }),
);

const upsertAssignmentHandler = async (
  req,
  res,
  client,
  assignmentIdFromParam = null,
) => {
  const { id: userId, homebase_id } = req.user;
  const payload = req.body || {};
  const assignmentId =
    assignmentIdFromParam || Number(payload.id || 0) || null;
  const policyId = normalizeNumberOrNull(payload.policy_id);
  const assignmentScope = String(payload.assignment_scope || "").trim();
  const scopeUserId = normalizeNumberOrNull(payload.user_id);
  const scopeUserIds = Array.isArray(payload.user_ids)
    ? payload.user_ids
        .map((value) => normalizeNumberOrNull(value))
        .filter((value) => Boolean(value))
    : [];
  const scopeClassId = normalizeNumberOrNull(payload.class_id);
  const scopeClassIds = Array.isArray(payload.class_ids)
    ? payload.class_ids
        .map((value) => normalizeNumberOrNull(value))
        .filter((value) => Boolean(value))
    : [];
  const scopeGradeId = normalizeNumberOrNull(payload.grade_id);
  const scopeGradeIds = Array.isArray(payload.grade_ids)
    ? payload.grade_ids
        .map((value) => normalizeNumberOrNull(value))
        .filter((value) => Boolean(value))
    : [];
  const isActive = payload.is_active !== false;
  const startDate = String(payload.effective_start_date || "").trim() || null;
  const endDate = String(payload.effective_end_date || "").trim() || null;

  if (!policyId || !assignmentScope) {
    return res.status(400).json({
      status: "error",
      message: "policy_id dan assignment_scope wajib diisi.",
    });
  }
  if (!ASSIGNMENT_SCOPES.has(assignmentScope)) {
    return res.status(400).json({
      status: "error",
      message: "assignment_scope tidak valid.",
    });
  }
  if (startDate && endDate && startDate > endDate) {
    return res.status(400).json({
      status: "error",
      message: "effective_end_date tidak boleh lebih kecil dari effective_start_date.",
    });
  }

  const policyRes = await client.query(
    `SELECT id, target_role
     FROM attendance.attendance_policy
     WHERE id = $1 AND homebase_id = $2
     LIMIT 1`,
    [policyId, homebase_id],
  );
  if (policyRes.rowCount === 0) {
    return res
      .status(404)
      .json({ status: "error", message: "Policy tidak ditemukan." });
  }
  const policyTargetRole = policyRes.rows[0].target_role;

  if (assignmentScope === "user") {
    const targetUserIds = assignmentId
      ? [scopeUserId].filter(Boolean)
      : scopeUserIds.length > 0
        ? scopeUserIds
        : [scopeUserId].filter(Boolean);

    if (targetUserIds.length === 0) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "user_id atau user_ids wajib untuk scope user.",
        });
    }

    const roleCheckQuery =
      policyTargetRole === "teacher"
        ? `SELECT 1 FROM u_teachers WHERE user_id = $1 AND homebase_id = $2 LIMIT 1`
        : `SELECT 1 FROM u_students WHERE user_id = $1 AND homebase_id = $2 LIMIT 1`;

    for (const targetUserId of targetUserIds) {
      const roleCheck = await client.query(roleCheckQuery, [
        targetUserId,
        homebase_id,
      ]);
      if (roleCheck.rowCount === 0) {
        return res.status(400).json({
          status: "error",
          message: `user_id ${targetUserId} tidak sesuai target_role ${policyTargetRole}.`,
        });
      }
    }
  }

  if (assignmentScope === "class") {
    const targetClassIds = assignmentId
      ? [scopeClassId].filter(Boolean)
      : scopeClassIds.length > 0
        ? scopeClassIds
        : [scopeClassId].filter(Boolean);

    if (targetClassIds.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "class_id atau class_ids wajib untuk scope class.",
      });
    }

    for (const targetClassId of targetClassIds) {
      const classCheck = await client.query(
        `SELECT 1 FROM a_class WHERE id = $1 AND homebase_id = $2 LIMIT 1`,
        [targetClassId, homebase_id],
      );
      if (classCheck.rowCount === 0) {
        return res.status(400).json({
          status: "error",
          message: `class_id ${targetClassId} tidak valid.`,
        });
      }
    }
  }

  if (assignmentScope === "grade") {
    const targetGradeIds = assignmentId
      ? [scopeGradeId].filter(Boolean)
      : scopeGradeIds.length > 0
        ? scopeGradeIds
        : [scopeGradeId].filter(Boolean);

    if (targetGradeIds.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "grade_id atau grade_ids wajib untuk scope grade.",
      });
    }

    for (const targetGradeId of targetGradeIds) {
      const gradeCheck = await client.query(
        `SELECT 1 FROM a_grade WHERE id = $1 AND homebase_id = $2 LIMIT 1`,
        [targetGradeId, homebase_id],
      );
      if (gradeCheck.rowCount === 0) {
        return res.status(400).json({
          status: "error",
          message: `grade_id ${targetGradeId} tidak valid.`,
        });
      }
    }
  }

  if (assignmentId) {
    const existing = await client.query(
      `SELECT id
       FROM attendance.attendance_policy_assignment
       WHERE id = $1 AND homebase_id = $2
       LIMIT 1`,
      [assignmentId, homebase_id],
    );
    if (existing.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Assignment policy tidak ditemukan.",
      });
    }

    await client.query(
      `UPDATE attendance.attendance_policy_assignment
       SET
         policy_id = $1,
         assignment_scope = $2,
         user_id = $3,
         class_id = $4,
         grade_id = $5,
         effective_start_date = $6::date,
         effective_end_date = $7::date,
         is_active = $8,
         updated_at = NOW()
       WHERE id = $9`,
      [
        policyId,
        assignmentScope,
        assignmentScope === "user"
          ? scopeUserId || scopeUserIds[0] || null
          : null,
        assignmentScope === "class"
          ? scopeClassId || scopeClassIds[0] || null
          : null,
        assignmentScope === "grade"
          ? scopeGradeId || scopeGradeIds[0] || null
          : null,
        startDate,
        endDate,
        isActive,
        assignmentId,
      ],
    );
  } else {
    const targetUserIds =
      assignmentScope === "user"
        ? scopeUserIds.length > 0
          ? scopeUserIds
          : [scopeUserId].filter(Boolean)
        : [null];
    const targetClassIds =
      assignmentScope === "class"
        ? scopeClassIds.length > 0
          ? scopeClassIds
          : [scopeClassId].filter(Boolean)
        : [null];
    const targetGradeIds =
      assignmentScope === "grade"
        ? scopeGradeIds.length > 0
          ? scopeGradeIds
          : [scopeGradeId].filter(Boolean)
        : [null];

    for (const targetUserId of targetUserIds) {
      for (const targetClassId of targetClassIds) {
        for (const targetGradeId of targetGradeIds) {
          await client.query(
            `INSERT INTO attendance.attendance_policy_assignment (
               policy_id,
               assignment_scope,
               user_id,
               class_id,
               grade_id,
               homebase_id,
               effective_start_date,
               effective_end_date,
               is_active,
               created_by,
               updated_at
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7::date, $8::date, $9, $10, NOW())`,
            [
              policyId,
              assignmentScope,
              assignmentScope === "user" ? targetUserId : null,
              assignmentScope === "class" ? targetClassId : null,
              assignmentScope === "grade" ? targetGradeId : null,
              homebase_id,
              startDate,
              endDate,
              isActive,
              userId,
            ],
          );
        }
      }
    }
  }

  const assignments = await getPolicyAssignments(client, homebase_id);
  return res.json({
    status: "success",
    message: "Assignment policy berhasil disimpan.",
    data: assignments,
  });
};

router.post(
  "/attendance/config/policy-assignments",
  authorize("satuan"),
  withTransaction(async (req, res, client) =>
    upsertAssignmentHandler(req, res, client),
  ),
);

router.put(
  "/attendance/config/policy-assignments/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) =>
    upsertAssignmentHandler(req, res, client, Number(req.params.id || 0) || null),
  ),
);

router.delete(
  "/attendance/config/policy-assignments/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const assignmentId = Number(req.params.id || 0);
    if (!assignmentId) {
      return res
        .status(400)
        .json({ status: "error", message: "id assignment tidak valid." });
    }

    const deleted = await client.query(
      `DELETE FROM attendance.attendance_policy_assignment
       WHERE id = $1 AND homebase_id = $2
       RETURNING id`,
      [assignmentId, homebase_id],
    );
    if (deleted.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Assignment policy tidak ditemukan.",
      });
    }

    return res.json({
      status: "success",
      message: "Assignment policy berhasil dihapus.",
    });
  }),
);

router.post(
  "/attendance/config/policy-assignments/bulk-delete",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const { ids, error } = normalizeBulkIds(req.body?.ids);
    if (error) {
      return res.status(400).json({
        status: "error",
        message: error,
      });
    }

    const deleted = await client.query(
      `DELETE FROM attendance.attendance_policy_assignment
       WHERE homebase_id = $1
         AND id = ANY($2::int[])
       RETURNING id`,
      [homebase_id, ids],
    );

    return res.json({
      status: "success",
      message: `${deleted.rowCount} assignment policy berhasil dihapus.`,
      data: {
        deleted_count: deleted.rowCount,
        deleted_ids: deleted.rows.map((row) => row.id),
      },
    });
  }),
);

// ==========================================
// RFID Scan Endpoint (for ESP32/MFRC522)
// ==========================================
router.get(
  "/attendance/rfid/ping",
  withQuery(async (_req, res) => {
    return res.json({
      status: "success",
      message: "RFID endpoint aktif.",
      server_time_wib: new Date().toLocaleString("sv-SE", {
        timeZone: JAKARTA_TZ,
      }),
      timezone: JAKARTA_TZ,
    });
  }),
);

router.post(
  "/attendance/rfid/scan",
  withTransaction(async (req, res, client) => {
    const payload = req.body || {};
    const deviceCode = String(payload.device_code || "").trim();
    const deviceToken = String(payload.device_token || "").trim();
    const cardUid = String(payload.card_uid || "").trim();
    const scanAction = String(payload.scan_action || "").trim() || null;
    const scannedAtRaw = String(payload.scanned_at || "").trim();

    if (!deviceCode || !deviceToken || !cardUid) {
      return res.status(400).json({
        status: "error",
        message: "device_code, device_token, dan card_uid wajib diisi.",
      });
    }

    const deviceRes = await client.query(
      `SELECT id, homebase_id, class_id, device_type, api_token, is_active
       FROM attendance.rfid_device
       WHERE code = $1
       LIMIT 1`,
      [deviceCode],
    );
    if (deviceRes.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Device tidak ditemukan.",
      });
    }
    const device = deviceRes.rows[0];

    const scannedAt = (() => {
      if (!scannedAtRaw) return new Date();
      const parsed = new Date(scannedAtRaw);
      return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
    })();

    const activePeriodeRes = await client.query(
      `SELECT id
       FROM a_periode
       WHERE homebase_id = $1
         AND is_active = true
       ORDER BY id DESC
       LIMIT 1`,
      [device.homebase_id],
    );
    const activePeriodeId = activePeriodeRes.rows[0]?.id || null;

    const rejectAndLog = async (resultStatus, reason) => {
      const inserted = await client.query(
        `INSERT INTO attendance.rfid_scan_log (
           homebase_id,
           periode_id,
           device_id,
           class_id,
           scan_source,
           scan_action,
           card_uid,
           scanned_at,
           device_time_at,
           result_status,
           rejection_reason,
           raw_payload
         )
         VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::timestamptz, $10, $11, $12::jsonb
         )
         RETURNING id, scanned_at`,
        [
          device.homebase_id,
          activePeriodeId,
          device.id,
          device.class_id,
          device.device_type,
          scanAction || "unknown",
          cardUid,
          scannedAt.toISOString(),
          scannedAt.toISOString(),
          resultStatus,
          reason,
          JSON.stringify(payload),
        ],
      );

      return res.status(400).json({
        status: "error",
        result_status: resultStatus,
        message: reason,
        scan_log_id: inserted.rows[0]?.id || null,
      });
    };

    if (device.api_token !== deviceToken) {
      return rejectAndLog("rejected", "Token device tidak valid.");
    }
    if (device.is_active !== true) {
      return rejectAndLog("device_inactive", "Device tidak aktif.");
    }

    const cardRes = await client.query(
      `SELECT
         rc.id AS card_id,
         rc.user_id,
         rc.is_active AS card_is_active,
         u.is_active AS user_is_active,
         u.full_name
       FROM attendance.rfid_card rc
       JOIN u_users u ON u.id = rc.user_id
       WHERE rc.card_uid = $1
       ORDER BY rc.is_primary DESC, rc.id DESC
       LIMIT 1`,
      [cardUid],
    );
    if (cardRes.rowCount === 0) {
      return rejectAndLog("unregistered", "Kartu RFID tidak terdaftar.");
    }
    const card = cardRes.rows[0];
    if (card.card_is_active !== true) {
      return rejectAndLog("card_inactive", "Kartu RFID tidak aktif.");
    }
    if (card.user_is_active !== true) {
      return rejectAndLog("user_inactive", "User pemilik kartu tidak aktif.");
    }

    const finalScanAction =
      scanAction ||
      (device.device_type === "gate"
        ? DAILY_GATE_ACTION
        : "teacher_session_checkin");

    let requestedScanAction = finalScanAction;
    let resolvedScanAction = finalScanAction;

    if (device.device_type === "gate" && isDailyGateAction(finalScanAction)) {
      const gateResolution = await resolveDailyGateScanAction(client, {
        homebaseId: device.homebase_id,
        userId: card.user_id,
        cardUid,
        scannedAt,
      });

      if (!gateResolution.resolvedAction) {
        return rejectAndLog("duplicate", gateResolution.error);
      }

      resolvedScanAction = gateResolution.resolvedAction;
    }

    const duplicateCheck = await checkDuplicateScan(client, {
      homebaseId: device.homebase_id,
      cardUid,
      scanAction: resolvedScanAction,
      scannedAt,
    });
    if (duplicateCheck.isDuplicate) {
      return rejectAndLog("duplicate", duplicateCheck.reason);
    }

    if (
      device.device_type === "gate" &&
      (resolvedScanAction === "daily_checkin" ||
        resolvedScanAction === "daily_checkout")
    ) {
      const dayRule = await resolveScanPolicyDayRule(client, {
        homebaseId: device.homebase_id,
        userId: card.user_id,
        scannedAt,
      });
      const windowCheck = validateScanTimeWindow(
        scannedAt,
        dayRule,
        resolvedScanAction,
      );
      if (!windowCheck.valid) {
        return rejectAndLog("out_of_window", windowCheck.reason);
      }
    }

    const accepted = await client.query(
      `INSERT INTO attendance.rfid_scan_log (
         homebase_id,
         periode_id,
         device_id,
         card_id,
         user_id,
         class_id,
         scan_source,
         scan_action,
         card_uid,
         scanned_at,
         device_time_at,
         result_status,
         raw_payload
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamptz, $11::timestamptz, 'accepted', $12::jsonb
       )
       RETURNING id, scanned_at`,
      [
        device.homebase_id,
        activePeriodeId,
        device.id,
        card.card_id,
        card.user_id,
        device.class_id,
        device.device_type,
        resolvedScanAction,
        cardUid,
        scannedAt.toISOString(),
        scannedAt.toISOString(),
        JSON.stringify({
          ...payload,
          requested_scan_action: requestedScanAction,
          resolved_scan_action: resolvedScanAction,
        }),
      ],
    );

    const scanLogId = accepted.rows[0].id;
    let attendanceResult = null;

    if (device.device_type === "gate") {
      attendanceResult = await applyRfidScanToDailyAttendance(client, {
        homebaseId: device.homebase_id,
        periodeId: activePeriodeId,
        userId: card.user_id,
        scanAction: resolvedScanAction,
        scannedAt,
        scanLogId,
      });

      if (
        !attendanceResult?.attendance_id &&
        (resolvedScanAction === "daily_checkin" ||
          resolvedScanAction === "daily_checkout")
      ) {
        console.warn(
          `[attendance] Scan ${scanLogId} diterima tetapi daily_attendance tidak terbentuk untuk user ${card.user_id}.`,
        );
      }
    } else if (device.device_type === "classroom") {
      attendanceResult = await applyRfidScanToTeacherSession(client, {
        homebaseId: device.homebase_id,
        periodeId: activePeriodeId,
        userId: card.user_id,
        classId: device.class_id,
        scanAction: finalScanAction,
        scannedAt,
        scanLogId,
      });

      if (!attendanceResult?.attendance_id) {
        console.warn(
          `[attendance] Scan kelas ${scanLogId} diterima tetapi sesi guru tidak terbentuk untuk user ${card.user_id} (kelas ${device.class_id}).`,
        );
      }
    }

    const scanLabel =
      device.device_type === "gate"
        ? resolvedScanAction === "daily_checkout"
          ? "Tap pulang"
          : "Tap datang"
        : "Scan";

    return res.json({
      status: "success",
      result_status: "accepted",
      message: `${scanLabel} diterima untuk ${card.full_name}.`,
      data: {
        scan_log_id: scanLogId,
        user_id: card.user_id,
        user_name: card.full_name,
        scan_action: resolvedScanAction,
        requested_scan_action: requestedScanAction,
        resolved_scan_action: resolvedScanAction,
        scan_source: device.device_type,
        attendance_id: attendanceResult?.attendance_id || null,
        attendance_status: attendanceResult?.attendance_status || null,
        attendance_date: attendanceResult?.attendance_date || null,
        schedule_entry_id: attendanceResult?.schedule_entry_id || null,
        teacher_session_log_id:
          attendanceResult?.teacher_session_log_id || null,
        session_status: attendanceResult?.session_status || null,
      },
    });
  }),
);

// ==========================================
// Attendance Reports
// ==========================================
router.get(
  "/attendance/reports/students",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const { startDate, endDate } = resolveReportRange(req.query);
    const classId = normalizeNumberOrNull(req.query?.class_id);
    const gradeId = normalizeNumberOrNull(req.query?.grade_id);
    const status = String(req.query?.status || "").trim() || null;
    const userName = String(req.query?.user_name || "").trim() || null;

    await reconcilePendingScanLogs(pool, {
      homebaseId: homebase_id,
      startDate,
      endDate,
    });

    if (classId) {
      const classCheck = await pool.query(
        `SELECT 1
         FROM a_class
         WHERE id = $1 AND homebase_id = $2
         LIMIT 1`,
        [classId, homebase_id],
      );
      if (classCheck.rowCount === 0) {
        return res.status(400).json({
          status: "error",
          message: "class_id tidak valid untuk homebase ini.",
        });
      }
    }
    if (gradeId) {
      const gradeCheck = await pool.query(
        `SELECT 1
         FROM a_grade
         WHERE id = $1 AND homebase_id = $2
         LIMIT 1`,
        [gradeId, homebase_id],
      );
      if (gradeCheck.rowCount === 0) {
        return res.status(400).json({
          status: "error",
          message: "grade_id tidak valid untuk homebase ini.",
        });
      }
    }

    const params = [homebase_id, startDate, endDate];
    const where = [
      "da.homebase_id = $1",
      "da.target_role = 'student'",
      "da.attendance_date BETWEEN $2::date AND $3::date",
      GATE_LINKED_SCAN_EXISTS_SQL,
    ];

    if (classId) {
      params.push(classId);
      where.push(`st.current_class_id = $${params.length}`);
    }
    if (gradeId) {
      params.push(gradeId);
      where.push(`c.grade_id = $${params.length}`);
    }
    if (status) {
      params.push(status);
      where.push(`da.attendance_status = $${params.length}`);
    }
    if (userName) {
      params.push(`%${userName}%`);
      where.push(`u.full_name ILIKE $${params.length}`);
    }

    const rowsResult = await pool.query(
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
       ORDER BY da.attendance_date DESC, u.full_name ASC`,
      params,
    );

    const summaryResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_records,
         COUNT(DISTINCT da.user_id)::int AS total_students,
         COUNT(*) FILTER (WHERE da.attendance_status = 'present')::int AS present_count,
         COUNT(*) FILTER (WHERE da.attendance_status = 'late')::int AS late_count,
         COUNT(*) FILTER (WHERE da.attendance_status = 'absent')::int AS absent_count,
         COUNT(*) FILTER (WHERE da.attendance_status = 'excused')::int AS excused_count,
         COUNT(*) FILTER (WHERE da.attendance_status = 'incomplete')::int AS incomplete_count
       FROM attendance.daily_attendance da
       JOIN u_users u ON u.id = da.user_id
       JOIN u_students st ON st.user_id = da.user_id
       LEFT JOIN a_class c ON c.id = st.current_class_id
       WHERE ${where.join(" AND ")}`,
      params,
    );

    return res.json({
      status: "success",
      data: {
        summary: summaryResult.rows[0] || {},
        rows: rowsResult.rows,
        filters: {
          start_date: startDate,
          end_date: endDate,
          class_id: classId,
          grade_id: gradeId,
          status,
          user_name: userName,
        },
      },
    });
  }),
);

router.get(
  "/attendance/reports/teachers",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const { startDate, endDate } = resolveReportRange(req.query);
    const status = String(req.query?.status || "").trim() || null;
    const userName = String(req.query?.user_name || "").trim() || null;

    await reconcilePendingScanLogs(pool, {
      homebaseId: homebase_id,
      startDate,
      endDate,
    });

    const params = [homebase_id, startDate, endDate];
    const where = [
      "da.homebase_id = $1",
      "da.target_role = 'teacher'",
      "da.attendance_date BETWEEN $2::date AND $3::date",
      GATE_LINKED_SCAN_EXISTS_SQL,
    ];

    if (status) {
      params.push(status);
      where.push(`da.attendance_status = $${params.length}`);
    }
    if (userName) {
      params.push(`%${userName}%`);
      where.push(`u.full_name ILIKE $${params.length}`);
    }

    const rowsResult = await pool.query(
      `SELECT
         da.id,
         TO_CHAR(da.attendance_date, 'YYYY-MM-DD') AS attendance_date,
         da.attendance_status,
         ${toJakartaTimestampSql("da.checkin_at")} AS checkin_at,
         ${toJakartaTimestampSql("da.checkout_at")} AS checkout_at,
         da.late_minutes,
         da.presence_minutes,
         da.minimum_required_minutes,
         da.notes,
         u.id AS user_id,
         u.full_name,
         t.nip
       FROM attendance.daily_attendance da
       JOIN u_users u ON u.id = da.user_id
       JOIN u_teachers t ON t.user_id = da.user_id
       WHERE ${where.join(" AND ")}
       ORDER BY da.attendance_date DESC, u.full_name ASC`,
      params,
    );

    const summaryResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_records,
         COUNT(DISTINCT da.user_id)::int AS total_teachers,
         COUNT(*) FILTER (WHERE da.attendance_status = 'present')::int AS present_count,
         COUNT(*) FILTER (WHERE da.attendance_status = 'late')::int AS late_count,
         COUNT(*) FILTER (WHERE da.attendance_status = 'absent')::int AS absent_count,
         COUNT(*) FILTER (WHERE da.attendance_status = 'incomplete')::int AS incomplete_count,
         COUNT(*) FILTER (WHERE da.attendance_status = 'insufficient_hours')::int AS insufficient_hours_count,
         COUNT(*) FILTER (WHERE da.attendance_status = 'not_scheduled')::int AS not_scheduled_count
       FROM attendance.daily_attendance da
       JOIN u_users u ON u.id = da.user_id
       JOIN u_teachers t ON t.user_id = da.user_id
       WHERE ${where.join(" AND ")}`,
      params,
    );

    const sessionSummaryParams = [homebase_id, startDate, endDate];
    const sessionSummaryWhere = [
      "da.homebase_id = $1",
      "da.attendance_date BETWEEN $2::date AND $3::date",
    ];
    if (userName) {
      sessionSummaryParams.push(`%${userName}%`);
      sessionSummaryWhere.push(`u.full_name ILIKE $${sessionSummaryParams.length}`);
    }

    const sessionSummaryResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_sessions,
         COUNT(*) FILTER (WHERE tsr.session_status = 'present')::int AS present_sessions,
         COUNT(*) FILTER (WHERE tsr.session_status = 'late')::int AS late_sessions,
         COUNT(*) FILTER (WHERE tsr.session_status = 'missed')::int AS missed_sessions,
         COUNT(*) FILTER (WHERE tsr.session_status = 'partial')::int AS partial_sessions,
         COUNT(*) FILTER (WHERE tsr.session_status = 'excused')::int AS excused_sessions
       FROM attendance.teacher_schedule_requirement tsr
       JOIN attendance.daily_attendance da ON da.id = tsr.attendance_id
       JOIN u_users u ON u.id = da.user_id
       WHERE ${sessionSummaryWhere.join(" AND ")}`,
      sessionSummaryParams,
    );

    return res.json({
      status: "success",
      data: {
        summary: summaryResult.rows[0] || {},
        session_summary: sessionSummaryResult.rows[0] || {},
        rows: rowsResult.rows,
        filters: {
          start_date: startDate,
          end_date: endDate,
          status,
          user_name: userName,
        },
      },
    });
  }),
);

router.get(
  "/attendance/reports/scan-logs",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const { startDate, endDate } = resolveReportRange(req.query);
    const deviceId = normalizeNumberOrNull(req.query?.device_id);
    const resultStatus = String(req.query?.result_status || "").trim() || null;
    const userName = String(req.query?.user_name || "").trim() || null;

    if (deviceId) {
      const deviceCheck = await pool.query(
        `SELECT 1
         FROM attendance.rfid_device
         WHERE id = $1 AND homebase_id = $2
         LIMIT 1`,
        [deviceId, homebase_id],
      );
      if (deviceCheck.rowCount === 0) {
        return res.status(400).json({
          status: "error",
          message: "device_id tidak valid untuk homebase ini.",
        });
      }
    }

    const params = [homebase_id, startDate, endDate];
    const where = [
      "sl.homebase_id = $1",
      `(sl.scanned_at AT TIME ZONE '${JAKARTA_TZ}')::date BETWEEN $2::date AND $3::date`,
    ];

    if (deviceId) {
      params.push(deviceId);
      where.push(`sl.device_id = $${params.length}`);
    }
    if (resultStatus) {
      if (resultStatus === "unregistered") {
        where.push(
          `(sl.result_status = 'unregistered' OR (sl.result_status = 'rejected' AND sl.rejection_reason ILIKE '%tidak terdaftar%'))`,
        );
      } else {
        params.push(resultStatus);
        where.push(`sl.result_status = $${params.length}`);
      }
    }
    if (userName) {
      params.push(`%${userName}%`);
      where.push(`u.full_name ILIKE $${params.length}`);
    }

    const joinUser = userName ? "JOIN u_users u ON u.id = sl.user_id" : "LEFT JOIN u_users u ON u.id = sl.user_id";

    const rowsResult = await pool.query(
      `SELECT
         sl.id,
         sl.user_id,
         sl.device_id,
         sl.attendance_id,
         ${toJakartaTimestampSql("sl.scanned_at")} AS scanned_at,
         ${toJakartaTimestampSql("sl.device_time_at")} AS device_time_at,
         ${toJakartaTimestampSql("sl.server_received_at")} AS server_received_at,
         ${toJakartaTimestampSql("sl.created_at")} AS created_at,
         sl.scan_source,
         sl.scan_action,
         sl.card_uid,
         sl.result_status,
         sl.rejection_reason,
         sl.raw_payload,
         d.code AS device_code,
         d.name AS device_name,
         u.full_name AS user_name
       FROM attendance.rfid_scan_log sl
       LEFT JOIN attendance.rfid_device d ON d.id = sl.device_id
       ${joinUser}
       WHERE ${where.join(" AND ")}
       ORDER BY sl.scanned_at DESC, sl.id DESC`,
      params,
    );

    const summaryResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_records,
         COUNT(*) FILTER (WHERE sl.result_status = 'accepted')::int AS accepted_count,
         COUNT(*) FILTER (WHERE sl.result_status = 'duplicate')::int AS duplicate_count,
         COUNT(*) FILTER (
           WHERE sl.result_status = 'rejected'
             AND NOT (sl.rejection_reason ILIKE '%tidak terdaftar%')
         )::int AS rejected_count,
         COUNT(*) FILTER (
           WHERE sl.result_status = 'unregistered'
              OR (sl.result_status = 'rejected' AND sl.rejection_reason ILIKE '%tidak terdaftar%')
         )::int AS unregistered_count,
         COUNT(*) FILTER (WHERE sl.result_status = 'out_of_window')::int AS out_of_window_count,
         COUNT(*) FILTER (WHERE sl.result_status = 'not_scheduled')::int AS not_scheduled_count,
         COUNT(*) FILTER (WHERE sl.result_status = 'card_inactive')::int AS card_inactive_count,
         COUNT(*) FILTER (WHERE sl.result_status = 'device_inactive')::int AS device_inactive_count,
         COUNT(*) FILTER (WHERE sl.result_status = 'user_inactive')::int AS user_inactive_count,
         COUNT(*) FILTER (WHERE sl.result_status = 'policy_missing')::int AS policy_missing_count
       FROM attendance.rfid_scan_log sl
       ${userName ? "JOIN u_users u ON u.id = sl.user_id" : ""}
       WHERE ${where.join(" AND ")}`,
      params,
    );

    return res.json({
      status: "success",
      data: {
        summary: summaryResult.rows[0] || {},
        rows: rowsResult.rows,
        filters: {
          start_date: startDate,
          end_date: endDate,
          device_id: deviceId,
          result_status: resultStatus,
          user_name: userName,
        },
      },
    });
  }),
);

router.delete(
  "/attendance/reports/scan-logs/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const logId = normalizeNumberOrNull(req.params?.id);
    if (!logId) {
      return res.status(400).json({
        status: "error",
        message: "ID log scan tidak valid.",
      });
    }

    const deleted = await deleteScanLogsCascade(client, {
      homebaseId: homebase_id,
      scanLogIds: [logId],
    });
    if (deleted.deleted_scan_log_count === 0) {
      return res.status(404).json({
        status: "error",
        message: "Log scan tidak ditemukan.",
      });
    }

    return res.json({
      status: "success",
      message: "Log scan dan data presensi terkait berhasil dihapus.",
      data: deleted,
    });
  }),
);

router.post(
  "/attendance/reports/scan-logs/bulk-delete",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const { ids, error } = normalizeBulkIds(req.body?.ids);
    if (error) {
      return res.status(400).json({
        status: "error",
        message: error,
      });
    }

    const deleted = await deleteScanLogsCascade(client, {
      homebaseId: homebase_id,
      scanLogIds: ids,
    });

    return res.json({
      status: "success",
      message: `${deleted.deleted_scan_log_count} log scan dan data presensi terkait berhasil dihapus.`,
      data: deleted,
    });
  }),
);

router.put(
  "/attendance/reports/daily/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const recordId = normalizeNumberOrNull(req.params?.id);
    if (!recordId) {
      return res.status(400).json({
        status: "error",
        message: "ID absensi tidak valid.",
      });
    }

    const existingRes = await client.query(
      `SELECT
         id,
         user_id,
         attendance_date,
         checkin_at,
         checkout_at
       FROM attendance.daily_attendance
       WHERE id = $1
         AND homebase_id = $2
       LIMIT 1`,
      [recordId, homebase_id],
    );
    if (existingRes.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Data absensi tidak ditemukan.",
      });
    }

    const existing = existingRes.rows[0];
    const payload = req.body || {};
    const hasCheckinField = Object.prototype.hasOwnProperty.call(
      payload,
      "checkin_at",
    );
    const hasCheckoutField = Object.prototype.hasOwnProperty.call(
      payload,
      "checkout_at",
    );
    const hasStatusField = Object.prototype.hasOwnProperty.call(
      payload,
      "attendance_status",
    );
    const hasNotesField = Object.prototype.hasOwnProperty.call(payload, "notes");

    if (
      !hasCheckinField &&
      !hasCheckoutField &&
      !hasStatusField &&
      !hasNotesField
    ) {
      return res.status(400).json({
        status: "error",
        message:
          "Minimal satu field checkin_at, checkout_at, attendance_status, atau notes wajib diisi.",
      });
    }

    const checkinAt = hasCheckinField
      ? parseTimestampOrNull(payload.checkin_at)
      : existing.checkin_at
        ? new Date(existing.checkin_at)
        : null;
    const checkoutAt = hasCheckoutField
      ? parseTimestampOrNull(payload.checkout_at)
      : existing.checkout_at
        ? new Date(existing.checkout_at)
        : null;

    if (hasCheckinField && payload.checkin_at && !checkinAt) {
      return res.status(400).json({
        status: "error",
        message: "Format checkin_at tidak valid.",
      });
    }
    if (hasCheckoutField && payload.checkout_at && !checkoutAt) {
      return res.status(400).json({
        status: "error",
        message: "Format checkout_at tidak valid.",
      });
    }
    if (checkinAt && checkoutAt && checkoutAt.getTime() < checkinAt.getTime()) {
      return res.status(400).json({
        status: "error",
        message: "checkout_at tidak boleh lebih awal dari checkin_at.",
      });
    }

    const referenceAt = checkinAt || checkoutAt || new Date(existing.attendance_date);
    const dayRule = await resolveScanPolicyDayRule(client, {
      homebaseId: homebase_id,
      userId: existing.user_id,
      scannedAt: referenceAt,
    });
    const recalculated = recalculateDailyAttendanceFields({
      checkinAt,
      checkoutAt,
      dayRule,
    });

    let attendanceStatus = recalculated.attendanceStatus;
    let lateMinutes = recalculated.lateMinutes;
    let presenceMinutes = recalculated.presenceMinutes;

    if (hasStatusField) {
      const requestedStatus = String(payload.attendance_status || "").trim();
      if (!DAILY_ATTENDANCE_STATUSES.has(requestedStatus)) {
        return res.status(400).json({
          status: "error",
          message: "attendance_status tidak valid.",
        });
      }
      attendanceStatus = requestedStatus;
    }

    const notesValue = hasNotesField
      ? String(payload.notes || "").trim() || null
      : undefined;

    const updated = await client.query(
      `UPDATE attendance.daily_attendance
       SET
         checkin_at = $3::timestamptz,
         checkout_at = $4::timestamptz,
         attendance_status = $5,
         late_minutes = $6,
         presence_minutes = $7,
         minimum_required_minutes = COALESCE($8, minimum_required_minutes),
         notes = CASE WHEN $9::boolean THEN $10 ELSE notes END,
         evaluated_at = NOW(),
         updated_at = NOW()
       WHERE id = $1
         AND homebase_id = $2
       RETURNING
         id,
         attendance_status,
         ${toJakartaTimestampSql("checkin_at")} AS checkin_at,
         ${toJakartaTimestampSql("checkout_at")} AS checkout_at,
         late_minutes,
         presence_minutes,
         notes`,
      [
        recordId,
        homebase_id,
        checkinAt ? checkinAt.toISOString() : null,
        checkoutAt ? checkoutAt.toISOString() : null,
        attendanceStatus,
        lateMinutes,
        presenceMinutes,
        dayRule?.min_presence_minutes ?? null,
        hasNotesField,
        notesValue,
      ],
    );

    return res.json({
      status: "success",
      message: "Data absensi berhasil diperbarui.",
      data: updated.rows[0],
    });
  }),
);

router.delete(
  "/attendance/reports/daily/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const recordId = normalizeNumberOrNull(req.params?.id);
    if (!recordId) {
      return res.status(400).json({
        status: "error",
        message: "ID absensi tidak valid.",
      });
    }

    const deleted = await deleteDailyAttendanceCascade(client, {
      homebaseId: homebase_id,
      attendanceId: recordId,
    });
    if (!deleted.deleted) {
      return res.status(404).json({
        status: "error",
        message: "Data absensi tidak ditemukan.",
      });
    }

    return res.json({
      status: "success",
      message: "Data absensi dan log scan terkait berhasil dihapus.",
      data: deleted,
    });
  }),
);

router.post(
  "/attendance/reports/daily/bulk-delete",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const { homebase_id } = req.user;
    const { ids, error } = normalizeBulkIds(req.body?.ids);
    if (error) {
      return res.status(400).json({
        status: "error",
        message: error,
      });
    }

    const deleted = await deleteDailyAttendanceCascadeBulk(client, {
      homebaseId: homebase_id,
      attendanceIds: ids,
    });

    return res.json({
      status: "success",
      message: `${deleted.deleted_count} data absensi dan log scan terkait berhasil dihapus.`,
      data: deleted,
    });
  }),
);

// for RFID attendance, reports, etc.
export default router;
