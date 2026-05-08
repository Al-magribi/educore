import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();
const DAILY_ALLOWED_RECORDER_ROLES = [
  "admin_tahfiz",
  "homeroom_teacher",
  "musyrif",
];
const DEFAULT_ACTIVITY_TYPES = [
  { code: "ziyadah", name: "Ziyadah" },
  { code: "murajaah", name: "Murajaah" },
  { code: "tasmi", name: "Tasmi" },
  { code: "imtihan", name: "Imtihan" },
];

const toNullableInt = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
};
const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const hasTable = async (db, schemaName, tableName) => {
  const result = await db.query(
    `SELECT 1
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_name = $2
     LIMIT 1`,
    [schemaName, tableName],
  );

  return result.rows.length > 0;
};

const resolveRecorderRole = async (db, req) => {
  if (req.user.role === "admin") {
    if (req.user.admin_level && req.user.admin_level !== "tahfiz") {
      return null;
    }
    const musyrifResult = await db.query(
      `SELECT id
       FROM tahfiz.t_musyrif
       WHERE user_id = $1
         AND is_active = true
       LIMIT 1`,
      [req.user.id],
    );
    if (musyrifResult.rows.length) {
      return "musyrif";
    }
    return "admin_tahfiz";
  }

  if (req.user.role !== "teacher") {
    return null;
  }

  const teacherResult = await db.query(
    `SELECT is_homeroom
     FROM u_teachers
     WHERE user_id = $1`,
    [req.user.id],
  );

  if (!teacherResult.rows.length) {
    return null;
  }

  return teacherResult.rows[0].is_homeroom ? "homeroom_teacher" : null;
};

const resolveActiveMusyrifId = async (db, userId) => {
  const result = await db.query(
    `SELECT id
     FROM tahfiz.t_musyrif
     WHERE user_id = $1
       AND is_active = true
     LIMIT 1`,
    [userId],
  );
  return result.rows[0]?.id || null;
};

const getActivityTypes = async (db) => {
  for (const item of DEFAULT_ACTIVITY_TYPES) {
    await db.query(
      `INSERT INTO tahfiz.t_activity_type (code, name)
       VALUES ($1, $2)
       ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name`,
      [item.code, item.name],
    );
  }

  const result = await db.query(
    `SELECT id, code, name
     FROM tahfiz.t_activity_type
     ORDER BY name ASC`,
  );
  return result.rows;
};

const getSurahLookup = async (db) => {
  const result = await db.query(
    `SELECT id, number, name_latin, total_ayat
     FROM tahfiz.t_surah
     ORDER BY number ASC`,
  );

  return result.rows;
};

const getScopedStudents = async (db, req, scope, recorderRole = null) => {
  if (!scope.selectedPeriodeId || !scope.selectedHomebaseId) return [];

  if (recorderRole === "musyrif") {
    const musyrifId = await resolveActiveMusyrifId(db, req.user.id);
    if (!musyrifId) return [];

    const params = [
      musyrifId,
      scope.selectedPeriodeId,
      scope.selectedGradeId,
      scope.selectedClassId,
    ];

    const result = await db.query(
      `SELECT DISTINCT
         hs.student_id,
         u.full_name AS student_name,
         s.nis,
         ce.class_id,
         c.name AS class_name,
         c.grade_id,
         g.name AS grade_name
       FROM tahfiz.t_halaqoh h
       JOIN tahfiz.t_halaqoh_students hs ON hs.halaqoh_id = h.id
       JOIN u_users u ON u.id = hs.student_id
       LEFT JOIN u_students s ON s.user_id = hs.student_id
       LEFT JOIN LATERAL (
         SELECT e.class_id
         FROM u_class_enrollments e
         WHERE e.student_id = hs.student_id
           AND e.periode_id = $2
         ORDER BY e.id DESC
         LIMIT 1
       ) ce ON true
       LEFT JOIN a_class c ON c.id = ce.class_id
       LEFT JOIN a_grade g ON g.id = c.grade_id
       WHERE h.musyrif_id = $1
         AND h.periode_id = $2
         AND ($3::int IS NULL OR c.grade_id = $3)
         AND ($4::int IS NULL OR c.id = $4)
       ORDER BY g.name ASC NULLS LAST, c.name ASC, u.full_name ASC`,
      params,
    );
    return result.rows;
  }

  const params = [scope.selectedPeriodeId, scope.selectedHomebaseId, scope.selectedGradeId, scope.selectedClassId];
  let teacherFilter = "";

  if (req.user.role === "teacher") {
    params.push(req.user.id);
    teacherFilter = `AND c.homeroom_teacher_id = $5`;
  }

  const result = await db.query(
    `SELECT
       ce.student_id,
       u.full_name AS student_name,
       s.nis,
       ce.class_id,
       c.name AS class_name,
       c.grade_id,
       g.name AS grade_name
     FROM u_class_enrollments ce
     JOIN u_users u ON u.id = ce.student_id
     LEFT JOIN u_students s ON s.user_id = ce.student_id
     JOIN a_class c ON c.id = ce.class_id
     LEFT JOIN a_grade g ON g.id = c.grade_id
     WHERE ce.periode_id = $1
       AND ce.homebase_id = $2
       AND ($3::int IS NULL OR c.grade_id = $3)
       AND ($4::int IS NULL OR c.id = $4)
       ${teacherFilter}
     ORDER BY g.name ASC NULLS LAST, c.name ASC, u.full_name ASC`,
    params,
  );

  return result.rows;
};

const findSurahById = (surahList = [], surahId) => surahList.find((item) => item.id === surahId) || null;

const validateDailyRecordPayload = ({ payload = {}, surahList = [], activityTypes = [] }) => {
  const errors = [];

  const studentId = toNullableInt(payload.student_id);
  const typeId = toNullableInt(payload.type_id);
  const startSurahId = toNullableInt(payload.start_surah_id);
  const startAyat = toNullableInt(payload.start_ayat);
  const endSurahId = toNullableInt(payload.end_surah_id) || startSurahId;
  const endAyat = toNullableInt(payload.end_ayat) || startAyat;
  const date = String(payload.date || "").trim();

  if (!studentId) errors.push("Siswa wajib dipilih.");
  if (!typeId) errors.push("Jenis setoran wajib dipilih.");
  if (!startSurahId) errors.push("Surah awal wajib dipilih.");
  if (!startAyat) errors.push("Ayat awal wajib diisi.");
  if (!endSurahId) errors.push("Surah akhir wajib dipilih.");
  if (!endAyat) errors.push("Ayat akhir wajib diisi.");
  if (!date) errors.push("Tanggal setoran wajib diisi.");

  const activityExists = activityTypes.some((item) => item.id === typeId);
  if (typeId && !activityExists) {
    errors.push("Jenis setoran tidak valid.");
  }

  const startSurah = findSurahById(surahList, startSurahId);
  const endSurah = findSurahById(surahList, endSurahId);

  if (startSurahId && !startSurah) errors.push("Surah awal tidak valid.");
  if (endSurahId && !endSurah) errors.push("Surah akhir tidak valid.");

  if (startSurah && startAyat && (startAyat < 1 || startAyat > startSurah.total_ayat)) {
    errors.push(`Ayat awal harus antara 1 sampai ${startSurah.total_ayat}.`);
  }

  if (endSurah && endAyat && (endAyat < 1 || endAyat > endSurah.total_ayat)) {
    errors.push(`Ayat akhir harus antara 1 sampai ${endSurah.total_ayat}.`);
  }

  if (startSurah && endSurah && startAyat && endAyat) {
    const isSameSurah = startSurah.id === endSurah.id;
    if (isSameSurah && startAyat > endAyat) {
      errors.push("Pada surah yang sama, ayat awal tidak boleh lebih besar dari ayat akhir.");
    }

    if (startSurah.number > endSurah.number) {
      errors.push("Surah awal tidak boleh lebih besar dari surah akhir.");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    normalized: {
      student_id: studentId,
      type_id: typeId,
      start_surah_id: startSurahId,
      start_ayat: startAyat,
      end_surah_id: endSurahId,
      end_ayat: endAyat,
      date,
      fluency_grade: String(payload.fluency_grade || "").trim() || null,
      tajweed_grade: String(payload.tajweed_grade || "").trim() || null,
      note: String(payload.note || "").trim() || null,
    },
  };
};

const canAccessStudentInScope = ({ students = [], studentId }) =>
  students.some((item) => item.student_id === studentId);

const getDailyRecordById = async (db, id) => {
  const result = await db.query(
    `SELECT
       dr.id,
       dr.student_id,
       dr.halaqoh_id,
       dr.musyrif_id,
       dr.date,
       dr.type_id,
       dr.start_surah_id,
       dr.start_ayat,
       dr.end_surah_id,
       dr.end_ayat,
       dr.lines_count,
       dr.fluency_grade,
       dr.tajweed_grade,
       dr.note,
       dr.recorded_by_user_id,
       dr.recorded_by_role,
       dr.created_at,
       dr.updated_at
     FROM tahfiz.t_daily_record dr
     WHERE dr.id = $1`,
    [id],
  );

  return result.rows[0] || null;
};

const pickSelectedHomebaseId = (req, requestedHomebaseId, homebases = []) => {
  const scopedHomebaseId = req.user.homebase_id || null;
  if (scopedHomebaseId) return scopedHomebaseId;
  if (requestedHomebaseId) return requestedHomebaseId;
  return homebases[0]?.id ?? null;
};

const buildReportScope = async (db, req, filters = {}) => {
  const requestedHomebaseId = toNullableInt(filters.homebase_id);
  const requestedPeriodeId = toNullableInt(filters.periode_id);
  const requestedGradeId = toNullableInt(filters.grade_id);
  const requestedClassId = toNullableInt(filters.class_id);

  const scopedHomebaseId = req.user.homebase_id || null;

  let homebases = [];
  if (req.user.role === "admin") {
    const homebaseResult = scopedHomebaseId
      ? await db.query(
          `SELECT id, name, level
           FROM a_homebase
           WHERE id = $1
           ORDER BY name ASC`,
          [scopedHomebaseId],
        )
      : await db.query(
          `SELECT id, name, level
           FROM a_homebase
           ORDER BY name ASC`,
        );
    homebases = homebaseResult.rows;
  } else {
    const teacherHomebase = await db.query(
      `SELECT hb.id, hb.name, hb.level
       FROM u_teachers t
       JOIN a_homebase hb ON hb.id = t.homebase_id
       WHERE t.user_id = $1`,
      [req.user.id],
    );
    homebases = teacherHomebase.rows;
  }

  const selectedHomebaseId = pickSelectedHomebaseId(req, requestedHomebaseId, homebases);

  const periodeResult = selectedHomebaseId
    ? await db.query(
        `SELECT id, homebase_id, name, is_active
         FROM a_periode
         WHERE homebase_id = $1
         ORDER BY is_active DESC, id DESC`,
        [selectedHomebaseId],
      )
    : await db.query(
        `SELECT id, homebase_id, name, is_active
         FROM a_periode
         ORDER BY is_active DESC, id DESC`,
      );
  const periodes = periodeResult.rows;
  const selectedPeriodeId =
    requestedPeriodeId || periodes.find((item) => item.is_active)?.id || periodes[0]?.id || null;

  const params = [];

  if (selectedHomebaseId) {
    params.push(selectedHomebaseId);
  }

  if (req.user.role === "teacher") {
    params.push(req.user.id);
  }

  const gradeResult = selectedHomebaseId
    ? await db.query(
        `SELECT DISTINCT g.id, g.homebase_id, g.name
         FROM a_grade g
         JOIN a_class c ON c.grade_id = g.id
         WHERE g.homebase_id = $1
           ${req.user.role === "teacher" ? `AND c.homeroom_teacher_id = $2` : ""}
         ORDER BY g.name ASC`,
        params,
      )
    : await db.query(
        `SELECT id, homebase_id, name
         FROM a_grade
         ORDER BY name ASC`,
      );
  const grades = gradeResult.rows;

  let selectedGradeId = requestedGradeId;
  if (selectedGradeId && !grades.some((item) => item.id === selectedGradeId)) {
    selectedGradeId = null;
  }

  const classParams = [];
  const classFilters = [];

  if (selectedHomebaseId) {
    classParams.push(selectedHomebaseId);
    classFilters.push(`c.homebase_id = $${classParams.length}`);
  }

  if (selectedGradeId) {
    classParams.push(selectedGradeId);
    classFilters.push(`c.grade_id = $${classParams.length}`);
  }

  if (selectedPeriodeId) {
    classParams.push(selectedPeriodeId);
    classFilters.push(`ce.periode_id = $${classParams.length}`);
  }

  if (req.user.role === "teacher") {
    classParams.push(req.user.id);
    classFilters.push(`c.homeroom_teacher_id = $${classParams.length}`);
  }

  const classResult = await db.query(
    `SELECT DISTINCT
       c.id,
       c.name,
       c.grade_id,
       g.name AS grade_name,
       c.homeroom_teacher_id
     FROM a_class c
     LEFT JOIN a_grade g ON g.id = c.grade_id
     LEFT JOIN u_class_enrollments ce ON ce.class_id = c.id
     ${classFilters.length ? `WHERE ${classFilters.join(" AND ")}` : ""}
     ORDER BY g.name ASC NULLS LAST, c.name ASC`,
    classParams,
  );
  const classes = classResult.rows;

  let selectedClassId = requestedClassId;
  if (selectedClassId && !classes.some((item) => item.id === selectedClassId)) {
    selectedClassId = null;
  }

  if (!selectedGradeId && selectedClassId) {
    selectedGradeId = classes.find((item) => item.id === selectedClassId)?.grade_id ?? null;
  }

  return {
    homebases,
    periodes,
    grades,
    classes,
    selectedHomebaseId,
    selectedPeriodeId,
    selectedGradeId,
    selectedClassId,
  };
};

const buildSummaryQuery = ({ enforceTeacherScope = false } = {}) => `
  WITH selected_classes AS (
    SELECT
      ce.student_id,
      ce.class_id,
      ce.periode_id,
      ce.homebase_id,
      c.name AS class_name,
      c.grade_id,
      g.name AS grade_name,
      u.full_name AS student_name,
      s.nis
    FROM u_class_enrollments ce
    JOIN a_class c ON c.id = ce.class_id
    LEFT JOIN a_grade g ON g.id = c.grade_id
    JOIN u_users u ON u.id = ce.student_id
    LEFT JOIN u_students s ON s.user_id = ce.student_id
    WHERE ce.periode_id = $1
      AND ce.homebase_id = $2
      AND ($3::int IS NULL OR c.grade_id = $3)
      AND ($4::int IS NULL OR c.id = $4)
      ${enforceTeacherScope ? "AND c.homeroom_teacher_id = $5" : ""}
  ),
  selected_plans AS (
    SELECT
      p.id AS plan_id,
      p.homebase_id,
      p.grade_id,
      p.periode_id,
      p.title,
      p.notes,
      p.updated_at,
      g.name AS grade_name,
      hb.name AS homebase_name
    FROM tahfiz.t_target_plan p
    JOIN a_grade g ON g.id = p.grade_id
    LEFT JOIN a_homebase hb ON hb.id = p.homebase_id
    WHERE p.is_active = true
      AND p.periode_id = $1
      AND p.homebase_id = $2
      AND ($3::int IS NULL OR p.grade_id = $3)
  ),
  target_ayahs AS (
    SELECT DISTINCT
      sp.plan_id,
      ay.id AS ayah_id,
      ay.ayah_global_number
    FROM selected_plans sp
    JOIN tahfiz.t_target_item ti ON ti.plan_id = sp.plan_id
    JOIN tahfiz.t_ayah ay ON (
      (ti.target_type = 'juz' AND ay.juz_id = ti.juz_id)
      OR (
        ti.target_type = 'surah'
        AND ay.surah_id = ti.surah_id
        AND ay.ayah_number BETWEEN COALESCE(ti.start_ayat, 1) AND COALESCE(ti.end_ayat, ay.ayah_number)
      )
    )
  ),
  target_plan_totals AS (
    SELECT plan_id, COUNT(DISTINCT ayah_id)::int AS target_total_ayahs
    FROM target_ayahs
    GROUP BY plan_id
  ),
  planned_students AS (
    SELECT
      sc.student_id,
      sc.student_name,
      sc.nis,
      sc.class_id,
      sc.class_name,
      sc.grade_id,
      sc.grade_name,
      sc.periode_id,
      sc.homebase_id,
      sp.plan_id,
      sp.title AS plan_title
    FROM selected_classes sc
    JOIN selected_plans sp ON sp.grade_id = sc.grade_id
  ),
  record_ranges AS (
    SELECT DISTINCT
      dr.student_id,
      LEAST(
        sa.ayah_global_number,
        COALESCE(ea.ayah_global_number, sa.ayah_global_number)
      ) AS start_global,
      GREATEST(
        sa.ayah_global_number,
        COALESCE(ea.ayah_global_number, sa.ayah_global_number)
      ) AS end_global
    FROM tahfiz.t_daily_record dr
    JOIN u_class_enrollments ce
      ON ce.student_id = dr.student_id
     AND ce.periode_id = $1
    JOIN tahfiz.t_ayah sa
      ON sa.surah_id = dr.start_surah_id
     AND sa.ayah_number = COALESCE(dr.start_ayat, 1)
    LEFT JOIN tahfiz.t_ayah ea
      ON ea.surah_id = COALESCE(dr.end_surah_id, dr.start_surah_id)
     AND ea.ayah_number = COALESCE(dr.end_ayat, dr.start_ayat, 1)
    LEFT JOIN tahfiz.t_activity_type at ON at.id = dr.type_id
    WHERE (at.code = 'ziyadah' OR at.code IS NULL)
  ),
  student_achievements AS (
    SELECT
      ps.student_id,
      ps.plan_id,
      COUNT(DISTINCT ta.ayah_id)::int AS achieved_ayahs
    FROM planned_students ps
    LEFT JOIN record_ranges rr
      ON rr.student_id = ps.student_id
    LEFT JOIN target_ayahs ta
      ON ta.plan_id = ps.plan_id
     AND ta.ayah_global_number BETWEEN rr.start_global AND rr.end_global
    GROUP BY ps.student_id, ps.plan_id
  ),
  student_rows AS (
    SELECT
      ps.grade_id,
      ps.grade_name,
      ps.class_id,
      ps.class_name,
      ps.student_id,
      ps.student_name,
      ps.nis,
      ps.plan_id,
      ps.plan_title,
      COALESCE(tpt.target_total_ayahs, 0) AS target_total_ayahs,
      COALESCE(sa.achieved_ayahs, 0) AS achieved_ayahs,
      CASE
        WHEN COALESCE(tpt.target_total_ayahs, 0) > 0 THEN ROUND(
          LEAST(
            (COALESCE(sa.achieved_ayahs, 0)::numeric / tpt.target_total_ayahs::numeric) * 100,
            100
          ),
          2
        )
        ELSE 0
      END AS completion_percentage,
      CASE
        WHEN COALESCE(tpt.target_total_ayahs, 0) > 0
         AND COALESCE(sa.achieved_ayahs, 0) >= COALESCE(tpt.target_total_ayahs, 0)
        THEN true
        ELSE false
      END AS is_completed
    FROM planned_students ps
    LEFT JOIN target_plan_totals tpt ON tpt.plan_id = ps.plan_id
    LEFT JOIN student_achievements sa
      ON sa.student_id = ps.student_id
     AND sa.plan_id = ps.plan_id
  ),
  plan_item_rows AS (
    SELECT
      sp.plan_id,
      ti.id,
      ti.target_type,
      ti.order_no,
      j.number AS juz_number,
      s.number AS surah_number,
      s.name_latin AS surah_name_latin,
      ti.start_ayat,
      ti.end_ayat
    FROM selected_plans sp
    JOIN tahfiz.t_target_item ti ON ti.plan_id = sp.plan_id
    LEFT JOIN tahfiz.t_juz j ON j.id = ti.juz_id
    LEFT JOIN tahfiz.t_surah s ON s.id = ti.surah_id
  )
  SELECT json_build_object(
    'overview', json_build_object(
      'total_students', COALESCE((SELECT COUNT(*)::int FROM student_rows), 0),
      'total_classes', COALESCE((SELECT COUNT(DISTINCT class_id)::int FROM student_rows), 0),
      'total_grades', COALESCE((SELECT COUNT(DISTINCT grade_id)::int FROM student_rows), 0),
      'active_plan_count', COALESCE((SELECT COUNT(*)::int FROM selected_plans), 0),
      'total_target_ayahs', COALESCE((SELECT SUM(target_total_ayahs)::int FROM student_rows), 0),
      'total_achieved_ayahs', COALESCE((SELECT SUM(achieved_ayahs)::int FROM student_rows), 0),
      'completed_students', COALESCE((SELECT COUNT(*)::int FROM student_rows WHERE is_completed = true), 0),
      'average_completion_percentage', COALESCE((SELECT ROUND(AVG(completion_percentage), 2) FROM student_rows), 0)
    ),
    'plans', COALESCE((
      SELECT json_agg(
        json_build_object(
          'plan_id', sp.plan_id,
          'grade_id', sp.grade_id,
          'grade_name', sp.grade_name,
          'homebase_name', sp.homebase_name,
          'title', sp.title,
          'notes', sp.notes,
          'updated_at', sp.updated_at,
          'target_total_ayahs', COALESCE(tpt.target_total_ayahs, 0),
          'items', COALESCE((
            SELECT json_agg(
              json_build_object(
                'id', pir.id,
                'target_type', pir.target_type,
                'order_no', pir.order_no,
                'juz_number', pir.juz_number,
                'surah_number', pir.surah_number,
                'surah_name_latin', pir.surah_name_latin,
                'start_ayat', pir.start_ayat,
                'end_ayat', pir.end_ayat
              ) ORDER BY pir.order_no ASC, pir.id ASC
            )
            FROM plan_item_rows pir
            WHERE pir.plan_id = sp.plan_id
          ), '[]'::json)
        )
        ORDER BY sp.grade_name ASC, sp.plan_id ASC
      )
      FROM selected_plans sp
      LEFT JOIN target_plan_totals tpt ON tpt.plan_id = sp.plan_id
    ), '[]'::json),
    'grade_rows', COALESCE((
      SELECT json_agg(
        json_build_object(
          'grade_id', grade_id,
          'grade_name', grade_name,
          'student_count', student_count,
          'class_count', class_count,
          'completed_students', completed_students,
          'target_total_ayahs', target_total_ayahs,
          'achieved_ayahs', achieved_ayahs,
          'completion_percentage', completion_percentage
        ) ORDER BY grade_name ASC
      )
      FROM (
        SELECT
          grade_id,
          grade_name,
          COUNT(*)::int AS student_count,
          COUNT(DISTINCT class_id)::int AS class_count,
          COUNT(*) FILTER (WHERE is_completed = true)::int AS completed_students,
          SUM(target_total_ayahs)::int AS target_total_ayahs,
          SUM(achieved_ayahs)::int AS achieved_ayahs,
          ROUND(AVG(completion_percentage), 2) AS completion_percentage
        FROM student_rows
        GROUP BY grade_id, grade_name
      ) grade_summary
    ), '[]'::json),
    'class_rows', COALESCE((
      SELECT json_agg(
        json_build_object(
          'class_id', class_id,
          'class_name', class_name,
          'grade_id', grade_id,
          'grade_name', grade_name,
          'student_count', student_count,
          'completed_students', completed_students,
          'target_total_ayahs', target_total_ayahs,
          'achieved_ayahs', achieved_ayahs,
          'completion_percentage', completion_percentage
        ) ORDER BY grade_name ASC, class_name ASC
      )
      FROM (
        SELECT
          class_id,
          class_name,
          grade_id,
          grade_name,
          COUNT(*)::int AS student_count,
          COUNT(*) FILTER (WHERE is_completed = true)::int AS completed_students,
          SUM(target_total_ayahs)::int AS target_total_ayahs,
          SUM(achieved_ayahs)::int AS achieved_ayahs,
          ROUND(AVG(completion_percentage), 2) AS completion_percentage
        FROM student_rows
        GROUP BY class_id, class_name, grade_id, grade_name
      ) class_summary
    ), '[]'::json),
    'student_rows', COALESCE((
      SELECT json_agg(
        json_build_object(
          'student_id', student_id,
          'student_name', student_name,
          'nis', nis,
          'class_id', class_id,
          'class_name', class_name,
          'grade_id', grade_id,
          'grade_name', grade_name,
          'plan_id', plan_id,
          'plan_title', plan_title,
          'target_total_ayahs', target_total_ayahs,
          'achieved_ayahs', achieved_ayahs,
          'completion_percentage', completion_percentage,
          'is_completed', is_completed
        ) ORDER BY grade_name ASC, class_name ASC, student_name ASC
      )
      FROM student_rows
    ), '[]'::json)
  ) AS report_data;
`;

const createEmptyPersonalStudentOverview = () => ({
  total_students: 0,
  total_classes: 0,
  total_grades: 0,
  active_plan_count: 0,
  total_target_ayahs: 0,
  total_achieved_ayahs: 0,
  completed_students: 0,
  completed_plans: 0,
  average_completion_percentage: 0,
  total_records: 0,
  ziyadah_records: 0,
  last_record_date: null,
});

const buildPersonalStudentSummaryQuery = () => `
  WITH student_scope AS (
    SELECT
      s.user_id AS student_id,
      u.full_name AS student_name,
      s.nis,
      COALESCE(ce.class_id, s.current_class_id) AS class_id,
      c.name AS class_name,
      c.grade_id,
      g.name AS grade_name,
      COALESCE(ce.periode_id, s.current_periode_id) AS periode_id,
      COALESCE(ce.homebase_id, s.homebase_id, c.homebase_id) AS homebase_id,
      hb.name AS homebase_name,
      p.name AS periode_name
    FROM u_students s
    JOIN u_users u ON u.id = s.user_id
    LEFT JOIN LATERAL (
      SELECT e.class_id, e.periode_id, e.homebase_id
      FROM u_class_enrollments e
      WHERE e.student_id = s.user_id
      ORDER BY
        CASE
          WHEN s.current_periode_id IS NOT NULL AND e.periode_id = s.current_periode_id THEN 0
          ELSE 1
        END,
        e.id DESC
      LIMIT 1
    ) ce ON true
    LEFT JOIN a_class c ON c.id = COALESCE(ce.class_id, s.current_class_id)
    LEFT JOIN a_grade g ON g.id = c.grade_id
    LEFT JOIN a_homebase hb ON hb.id = COALESCE(ce.homebase_id, s.homebase_id, c.homebase_id)
    LEFT JOIN a_periode p ON p.id = COALESCE(ce.periode_id, s.current_periode_id)
    WHERE s.user_id = $1
  ),
  selected_plans AS (
    SELECT
      p.id AS plan_id,
      p.homebase_id,
      p.grade_id,
      p.periode_id,
      p.title,
      p.notes,
      p.updated_at,
      g.name AS grade_name,
      hb.name AS homebase_name
    FROM student_scope ss
    JOIN tahfiz.t_target_plan p
      ON p.is_active = true
     AND p.periode_id = ss.periode_id
     AND p.homebase_id = ss.homebase_id
     AND p.grade_id = ss.grade_id
    JOIN a_grade g ON g.id = p.grade_id
    LEFT JOIN a_homebase hb ON hb.id = p.homebase_id
  ),
  target_ayahs AS (
    SELECT DISTINCT
      sp.plan_id,
      ay.id AS ayah_id,
      ay.ayah_global_number
    FROM selected_plans sp
    JOIN tahfiz.t_target_item ti ON ti.plan_id = sp.plan_id
    JOIN tahfiz.t_ayah ay ON (
      (ti.target_type = 'juz' AND ay.juz_id = ti.juz_id)
      OR (
        ti.target_type = 'surah'
        AND ay.surah_id = ti.surah_id
        AND ay.ayah_number BETWEEN COALESCE(ti.start_ayat, 1) AND COALESCE(ti.end_ayat, ay.ayah_number)
      )
    )
  ),
  target_plan_totals AS (
    SELECT plan_id, COUNT(DISTINCT ayah_id)::int AS target_total_ayahs
    FROM target_ayahs
    GROUP BY plan_id
  ),
  planned_students AS (
    SELECT
      ss.student_id,
      ss.student_name,
      ss.nis,
      ss.class_id,
      ss.class_name,
      ss.grade_id,
      ss.grade_name,
      ss.periode_id,
      ss.homebase_id,
      sp.plan_id,
      sp.title AS plan_title
    FROM student_scope ss
    JOIN selected_plans sp ON true
  ),
  record_ranges AS (
    SELECT DISTINCT
      dr.student_id,
      LEAST(
        sa.ayah_global_number,
        COALESCE(ea.ayah_global_number, sa.ayah_global_number)
      ) AS start_global,
      GREATEST(
        sa.ayah_global_number,
        COALESCE(ea.ayah_global_number, sa.ayah_global_number)
      ) AS end_global
    FROM tahfiz.t_daily_record dr
    JOIN student_scope ss ON ss.student_id = dr.student_id
    JOIN tahfiz.t_ayah sa
      ON sa.surah_id = dr.start_surah_id
     AND sa.ayah_number = COALESCE(dr.start_ayat, 1)
    LEFT JOIN tahfiz.t_ayah ea
      ON ea.surah_id = COALESCE(dr.end_surah_id, dr.start_surah_id)
     AND ea.ayah_number = COALESCE(dr.end_ayat, dr.start_ayat, 1)
    LEFT JOIN tahfiz.t_activity_type at ON at.id = dr.type_id
    WHERE at.code = 'ziyadah' OR at.code IS NULL
  ),
  student_achievements AS (
    SELECT
      ps.student_id,
      ps.plan_id,
      COUNT(DISTINCT ta.ayah_id)::int AS achieved_ayahs
    FROM planned_students ps
    LEFT JOIN record_ranges rr
      ON rr.student_id = ps.student_id
    LEFT JOIN target_ayahs ta
      ON ta.plan_id = ps.plan_id
     AND ta.ayah_global_number BETWEEN rr.start_global AND rr.end_global
    GROUP BY ps.student_id, ps.plan_id
  ),
  student_rows AS (
    SELECT
      ps.grade_id,
      ps.grade_name,
      ps.class_id,
      ps.class_name,
      ps.student_id,
      ps.student_name,
      ps.nis,
      ps.plan_id,
      ps.plan_title,
      COALESCE(tpt.target_total_ayahs, 0) AS target_total_ayahs,
      COALESCE(sa.achieved_ayahs, 0) AS achieved_ayahs,
      CASE
        WHEN COALESCE(tpt.target_total_ayahs, 0) > 0 THEN ROUND(
          LEAST(
            (COALESCE(sa.achieved_ayahs, 0)::numeric / tpt.target_total_ayahs::numeric) * 100,
            100
          ),
          2
        )
        ELSE 0
      END AS completion_percentage,
      CASE
        WHEN COALESCE(tpt.target_total_ayahs, 0) > 0
         AND COALESCE(sa.achieved_ayahs, 0) >= COALESCE(tpt.target_total_ayahs, 0)
        THEN true
        ELSE false
      END AS is_completed
    FROM planned_students ps
    LEFT JOIN target_plan_totals tpt ON tpt.plan_id = ps.plan_id
    LEFT JOIN student_achievements sa
      ON sa.student_id = ps.student_id
     AND sa.plan_id = ps.plan_id
  ),
  plan_item_rows AS (
    SELECT
      sp.plan_id,
      ti.id,
      ti.target_type,
      ti.order_no,
      j.number AS juz_number,
      s.number AS surah_number,
      s.name_latin AS surah_name_latin,
      ti.start_ayat,
      ti.end_ayat
    FROM selected_plans sp
    JOIN tahfiz.t_target_item ti ON ti.plan_id = sp.plan_id
    LEFT JOIN tahfiz.t_juz j ON j.id = ti.juz_id
    LEFT JOIN tahfiz.t_surah s ON s.id = ti.surah_id
  ),
  record_overview AS (
    SELECT
      COUNT(*)::int AS total_records,
      COUNT(*) FILTER (WHERE at.code = 'ziyadah' OR at.code IS NULL)::int AS ziyadah_records,
      MAX(dr.date) AS last_record_date
    FROM tahfiz.t_daily_record dr
    LEFT JOIN tahfiz.t_activity_type at ON at.id = dr.type_id
    WHERE dr.student_id = $1
  )
  SELECT json_build_object(
    'student', COALESCE((
      SELECT json_build_object(
        'student_id', ss.student_id,
        'student_name', ss.student_name,
        'nis', ss.nis,
        'class_id', ss.class_id,
        'class_name', ss.class_name,
        'grade_id', ss.grade_id,
        'grade_name', ss.grade_name,
        'periode_id', ss.periode_id,
        'periode_name', ss.periode_name,
        'homebase_id', ss.homebase_id,
        'homebase_name', ss.homebase_name
      )
      FROM student_scope ss
    ), '{}'::json),
    'overview', json_build_object(
      'total_students', CASE WHEN EXISTS(SELECT 1 FROM student_scope) THEN 1 ELSE 0 END,
      'total_classes', CASE WHEN EXISTS(SELECT 1 FROM student_scope WHERE class_id IS NOT NULL) THEN 1 ELSE 0 END,
      'total_grades', CASE WHEN EXISTS(SELECT 1 FROM student_scope WHERE grade_id IS NOT NULL) THEN 1 ELSE 0 END,
      'active_plan_count', COALESCE((SELECT COUNT(*)::int FROM selected_plans), 0),
      'total_target_ayahs', COALESCE((SELECT SUM(target_total_ayahs)::int FROM student_rows), 0),
      'total_achieved_ayahs', COALESCE((SELECT SUM(achieved_ayahs)::int FROM student_rows), 0),
      'completed_students', CASE
        WHEN EXISTS(SELECT 1 FROM student_rows WHERE is_completed = true) THEN 1
        ELSE 0
      END,
      'completed_plans', COALESCE((SELECT COUNT(*)::int FROM student_rows WHERE is_completed = true), 0),
      'average_completion_percentage', COALESCE((SELECT ROUND(AVG(completion_percentage), 2) FROM student_rows), 0),
      'total_records', COALESCE((SELECT total_records FROM record_overview), 0),
      'ziyadah_records', COALESCE((SELECT ziyadah_records FROM record_overview), 0),
      'last_record_date', (SELECT last_record_date FROM record_overview)
    ),
    'plans', COALESCE((
      SELECT json_agg(
        json_build_object(
          'plan_id', sp.plan_id,
          'grade_id', sp.grade_id,
          'grade_name', sp.grade_name,
          'homebase_name', sp.homebase_name,
          'title', sp.title,
          'notes', sp.notes,
          'updated_at', sp.updated_at,
          'target_total_ayahs', COALESCE(tpt.target_total_ayahs, 0),
          'items', COALESCE((
            SELECT json_agg(
              json_build_object(
                'id', pir.id,
                'target_type', pir.target_type,
                'order_no', pir.order_no,
                'juz_number', pir.juz_number,
                'surah_number', pir.surah_number,
                'surah_name_latin', pir.surah_name_latin,
                'start_ayat', pir.start_ayat,
                'end_ayat', pir.end_ayat
              ) ORDER BY pir.order_no ASC, pir.id ASC
            )
            FROM plan_item_rows pir
            WHERE pir.plan_id = sp.plan_id
          ), '[]'::json)
        )
        ORDER BY sp.grade_name ASC, sp.plan_id ASC
      )
      FROM selected_plans sp
      LEFT JOIN target_plan_totals tpt ON tpt.plan_id = sp.plan_id
    ), '[]'::json),
    'student_rows', COALESCE((
      SELECT json_agg(
        json_build_object(
          'student_id', student_id,
          'student_name', student_name,
          'nis', nis,
          'class_id', class_id,
          'class_name', class_name,
          'grade_id', grade_id,
          'grade_name', grade_name,
          'plan_id', plan_id,
          'plan_title', plan_title,
          'target_total_ayahs', target_total_ayahs,
          'achieved_ayahs', achieved_ayahs,
          'completion_percentage', completion_percentage,
          'is_completed', is_completed
        )
        ORDER BY grade_name ASC, class_name ASC, student_name ASC
      )
      FROM student_rows
    ), '[]'::json)
  ) AS report_data;
`;

const getRecentDailyRecordsForStudent = async (db, studentId, limit = 12) => {
  const result = await db.query(
    `SELECT
       dr.id,
       dr.date,
       at.name AS activity_name,
       at.code AS activity_code,
       ss.number AS start_surah_number,
       ss.name_latin AS start_surah_name,
       dr.start_ayat,
       es.number AS end_surah_number,
       es.name_latin AS end_surah_name,
       dr.end_ayat,
       dr.fluency_grade,
       dr.tajweed_grade,
       dr.note,
       dr.recorded_by_role,
       ru.full_name AS recorded_by_name,
       dr.created_at,
       dr.updated_at
     FROM tahfiz.t_daily_record dr
     LEFT JOIN tahfiz.t_activity_type at ON at.id = dr.type_id
     LEFT JOIN tahfiz.t_surah ss ON ss.id = dr.start_surah_id
     LEFT JOIN tahfiz.t_surah es ON es.id = dr.end_surah_id
     LEFT JOIN u_users ru ON ru.id = dr.recorded_by_user_id
     WHERE dr.student_id = $1
     ORDER BY dr.date DESC, dr.id DESC
     LIMIT $2`,
    [studentId, limit],
  );

  return result.rows;
};

const getParentLinkedStudentIds = async (db, parentUserId) => {
  const parentStudentIds = [];
  const parentStudentTableExists = await hasTable(db, "public", "u_parent_students");

  if (parentStudentTableExists) {
    const relationResult = await db.query(
      `SELECT DISTINCT student_id
       FROM u_parent_students
       WHERE parent_user_id = $1
       ORDER BY student_id ASC`,
      [parentUserId],
    );
    parentStudentIds.push(...relationResult.rows.map((item) => item.student_id));
  }

  if (!parentStudentIds.length) {
    const legacyResult = await db.query(
      `SELECT student_id
       FROM u_parents
       WHERE user_id = $1
         AND student_id IS NOT NULL
       LIMIT 1`,
      [parentUserId],
    );
    if (legacyResult.rows[0]?.student_id) {
      parentStudentIds.push(legacyResult.rows[0].student_id);
    }
  }

  return [...new Set(parentStudentIds.filter(Boolean))];
};

const buildPersonalReportResponse = async (db, studentIds = []) => {
  const reportQuery = buildPersonalStudentSummaryQuery();
  const reports = await Promise.all(
    studentIds.map(async (studentId) => {
      const [reportResult, recentRecords] = await Promise.all([
        db.query(reportQuery, [studentId]),
        getRecentDailyRecordsForStudent(db, studentId),
      ]);

      const reportData = reportResult.rows[0]?.report_data || {};
      return {
        student: reportData.student || {},
        overview: reportData.overview || createEmptyPersonalStudentOverview(),
        plans: reportData.plans || [],
        student_rows: reportData.student_rows || [],
        recent_records: recentRecords,
      };
    }),
  );

  const validReports = reports.filter((item) => item.student?.student_id);
  const aggregatePercentage =
    validReports.length > 0
      ? Number(
          (
            validReports.reduce(
              (total, item) => total + Number(item.overview?.average_completion_percentage || 0),
              0,
            ) / validReports.length
          ).toFixed(2),
        )
      : 0;

  return {
    overview: {
      students_total: validReports.length,
      active_plan_count: validReports.reduce(
        (total, item) => total + Number(item.overview?.active_plan_count || 0),
        0,
      ),
      total_target_ayahs: validReports.reduce(
        (total, item) => total + Number(item.overview?.total_target_ayahs || 0),
        0,
      ),
      total_achieved_ayahs: validReports.reduce(
        (total, item) => total + Number(item.overview?.total_achieved_ayahs || 0),
        0,
      ),
      total_records: validReports.reduce(
        (total, item) => total + Number(item.overview?.total_records || 0),
        0,
      ),
      completed_students: validReports.reduce(
        (total, item) => total + Number(item.overview?.completed_students || 0),
        0,
      ),
      average_completion_percentage: aggregatePercentage,
    },
    students: validReports,
  };
};

router.get(
  "/report/options",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const scope = await buildReportScope(pool, req, req.query);

    return res.json({
      code: 200,
      message: "Opsi laporan tahfiz berhasil dimuat",
      data: {
        homebases: scope.homebases,
        periodes: scope.periodes,
        grades: scope.grades,
        classes: scope.classes,
        selected_homebase_id: scope.selectedHomebaseId,
        selected_periode_id: scope.selectedPeriodeId,
        selected_grade_id: scope.selectedGradeId,
        selected_class_id: scope.selectedClassId,
        role_scope: req.user.role,
      },
    });
  }),
);

router.get(
  "/report/summary",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const ayahTableExists = await hasTable(pool, "tahfiz", "t_ayah");
    if (!ayahTableExists) {
      return res.status(400).json({
        message: "Tabel tahfiz.t_ayah belum tersedia. Jalankan schema tahfiz terbaru terlebih dahulu.",
      });
    }

    const scope = await buildReportScope(pool, req, req.query);

    if (!scope.selectedHomebaseId || !scope.selectedPeriodeId) {
      return res.json({
        code: 200,
        message: "Belum ada homebase atau periode yang bisa dipilih",
        data: {
          filters: {
            homebases: scope.homebases,
            periodes: scope.periodes,
            grades: scope.grades,
            classes: scope.classes,
            selected_homebase_id: scope.selectedHomebaseId,
            selected_periode_id: scope.selectedPeriodeId,
            selected_grade_id: scope.selectedGradeId,
            selected_class_id: scope.selectedClassId,
          },
          overview: {
            total_students: 0,
            total_classes: 0,
            total_grades: 0,
            active_plan_count: 0,
            total_target_ayahs: 0,
            total_achieved_ayahs: 0,
            completed_students: 0,
            average_completion_percentage: 0,
          },
          plans: [],
          grade_rows: [],
          class_rows: [],
          student_rows: [],
        },
      });
    }

    const query = buildSummaryQuery({ enforceTeacherScope: req.user.role === "teacher" });
    const params = [
      scope.selectedPeriodeId,
      scope.selectedHomebaseId,
      scope.selectedGradeId,
      scope.selectedClassId,
    ];

    if (req.user.role === "teacher") {
      params.push(req.user.id);
    }

    const reportResult = await pool.query(query, params);
    const reportData = reportResult.rows[0]?.report_data || {};

    return res.json({
      code: 200,
      message: "Ringkasan laporan tahfiz berhasil dimuat",
      data: {
        filters: {
          homebases: scope.homebases,
          periodes: scope.periodes,
          grades: scope.grades,
          classes: scope.classes,
          selected_homebase_id: scope.selectedHomebaseId,
          selected_periode_id: scope.selectedPeriodeId,
          selected_grade_id: scope.selectedGradeId,
          selected_class_id: scope.selectedClassId,
          role_scope: req.user.role,
        },
        overview: reportData.overview || {
          total_students: 0,
          total_classes: 0,
          total_grades: 0,
          active_plan_count: 0,
          total_target_ayahs: 0,
          total_achieved_ayahs: 0,
          completed_students: 0,
          average_completion_percentage: 0,
        },
        plans: reportData.plans || [],
        grade_rows: reportData.grade_rows || [],
        class_rows: reportData.class_rows || [],
        student_rows: reportData.student_rows || [],
      },
    });
  }),
);

router.get(
  "/report/personal-summary",
  authorize("student", "parent"),
  withQuery(async (req, res, pool) => {
    const ayahTableExists = await hasTable(pool, "tahfiz", "t_ayah");
    if (!ayahTableExists) {
      return res.status(400).json({
        message: "Tabel tahfiz.t_ayah belum tersedia. Jalankan schema tahfiz terbaru terlebih dahulu.",
      });
    }

    const studentIds =
      req.user.role === "student"
        ? [req.user.id]
        : await getParentLinkedStudentIds(pool, req.user.id);

    const reportPayload = await buildPersonalReportResponse(pool, studentIds);

    return res.json({
      code: 200,
      message: "Ringkasan laporan tahfiz personal berhasil dimuat",
      data: {
        viewer: {
          user_id: req.user.id,
          full_name: req.user.full_name,
          role: req.user.role,
        },
        overview: reportPayload.overview,
        students: reportPayload.students,
      },
    });
  }),
);

router.get(
  "/report/musyrif-summary",
  authorize("admin", "tahfiz"),
  withQuery(async (req, res, pool) => {
    const ayahTableExists = await hasTable(pool, "tahfiz", "t_ayah");
    if (!ayahTableExists) {
      return res.status(400).json({
        message: "Tabel tahfiz.t_ayah belum tersedia. Jalankan schema tahfiz terbaru terlebih dahulu.",
      });
    }

    const requestedPeriodeId = toNullableInt(req.query.periode_id);
    const requestedHalaqohId = toNullableInt(req.query.halaqoh_id);

    const musyrifResult = await pool.query(
      `SELECT m.id, m.homebase_id, m.full_name, hb.name AS homebase_name
       FROM tahfiz.t_musyrif m
       LEFT JOIN a_homebase hb ON hb.id = m.homebase_id
       WHERE m.user_id = $1
         AND m.is_active = true
       LIMIT 1`,
      [req.user.id],
    );

    if (!musyrifResult.rows.length) {
      return res.status(403).json({ message: "Akses laporan musyrif ditolak." });
    }

    const musyrif = musyrifResult.rows[0];

    const periodesResult = await pool.query(
      `SELECT id, name, is_active
       FROM a_periode
       WHERE homebase_id = $1
       ORDER BY is_active DESC, id DESC`,
      [musyrif.homebase_id],
    );
    const periodes = periodesResult.rows;
    const activePeriode = periodes.find((item) => item.is_active) || null;

    let selectedPeriodeId = null;
    if (requestedPeriodeId && periodes.some((item) => item.id === requestedPeriodeId)) {
      selectedPeriodeId = requestedPeriodeId;
    } else if (activePeriode) {
      selectedPeriodeId = activePeriode.id;
    } else if (periodes.length) {
      selectedPeriodeId = periodes[0].id;
    }

    if (!selectedPeriodeId) {
      return res.json({
        code: 200,
        message: "Ringkasan laporan musyrif berhasil dimuat",
        data: {
          musyrif,
          filters: {
            periodes,
            halaqoh: [],
            selected_periode_id: null,
            selected_halaqoh_id: null,
            active_periode_id: activePeriode?.id || null,
          },
          overview: {
            total_students: 0,
            total_classes: 0,
            total_grades: 0,
            active_plan_count: 0,
            total_target_ayahs: 0,
            total_achieved_ayahs: 0,
            completed_students: 0,
            average_completion_percentage: 0,
          },
          plans: [],
          grade_rows: [],
          class_rows: [],
          student_rows: [],
        },
      });
    }

    const halaqohResult = await pool.query(
      `SELECT id, name, is_active
       FROM tahfiz.t_halaqoh
       WHERE musyrif_id = $1
         AND periode_id = $2
       ORDER BY is_active DESC, name ASC`,
      [musyrif.id, selectedPeriodeId],
    );
    const halaqoh = halaqohResult.rows;

    let selectedHalaqohId = null;
    if (requestedHalaqohId && halaqoh.some((item) => item.id === requestedHalaqohId)) {
      selectedHalaqohId = requestedHalaqohId;
    }

    if (!halaqoh.length) {
      return res.json({
        code: 200,
        message: "Ringkasan laporan musyrif berhasil dimuat",
        data: {
          musyrif,
          filters: {
            periodes,
            halaqoh: [],
            selected_periode_id: selectedPeriodeId,
            selected_halaqoh_id: null,
            active_periode_id: activePeriode?.id || null,
          },
          overview: {
            total_students: 0,
            total_classes: 0,
            total_grades: 0,
            active_plan_count: 0,
            total_target_ayahs: 0,
            total_achieved_ayahs: 0,
            completed_students: 0,
            average_completion_percentage: 0,
          },
          plans: [],
          grade_rows: [],
          class_rows: [],
          student_rows: [],
        },
      });
    }

    const reportQuery = `
      WITH musyrif_halaqoh AS (
        SELECT h.id, h.periode_id
        FROM tahfiz.t_halaqoh h
        WHERE h.musyrif_id = $1
          AND h.periode_id = $2
          AND ($3::int IS NULL OR h.id = $3)
      ),
      selected_students AS (
        SELECT DISTINCT hs.student_id, hs.halaqoh_id
        FROM tahfiz.t_halaqoh_students hs
        JOIN musyrif_halaqoh mh ON mh.id = hs.halaqoh_id
      ),
      latest_enrollment AS (
        SELECT DISTINCT ON (e.student_id)
          e.student_id,
          e.class_id
        FROM u_class_enrollments e
        JOIN selected_students ss ON ss.student_id = e.student_id
        WHERE e.periode_id = $2
        ORDER BY e.student_id, e.id DESC
      ),
      selected_classes AS (
        SELECT
          ss.student_id,
          ss.halaqoh_id,
          le.class_id,
          c.name AS class_name,
          c.grade_id,
          g.name AS grade_name,
          u.full_name AS student_name,
          s.nis
        FROM selected_students ss
        LEFT JOIN latest_enrollment le ON le.student_id = ss.student_id
        LEFT JOIN a_class c ON c.id = le.class_id
        LEFT JOIN a_grade g ON g.id = c.grade_id
        JOIN u_users u ON u.id = ss.student_id
        LEFT JOIN u_students s ON s.user_id = ss.student_id
        WHERE u.is_active = true
      ),
      selected_plans AS (
        SELECT
          p.id AS plan_id,
          p.homebase_id,
          p.grade_id,
          p.periode_id,
          p.title,
          p.notes,
          p.updated_at,
          g.name AS grade_name,
          hb.name AS homebase_name
        FROM tahfiz.t_target_plan p
        JOIN a_grade g ON g.id = p.grade_id
        LEFT JOIN a_homebase hb ON hb.id = p.homebase_id
        WHERE p.is_active = true
          AND p.periode_id = $2
          AND p.homebase_id = $4
          AND p.grade_id IN (
            SELECT DISTINCT sc.grade_id
            FROM selected_classes sc
            WHERE sc.grade_id IS NOT NULL
          )
      ),
      target_ayahs AS (
        SELECT DISTINCT
          sp.plan_id,
          ay.id AS ayah_id,
          ay.ayah_global_number
        FROM selected_plans sp
        JOIN tahfiz.t_target_item ti ON ti.plan_id = sp.plan_id
        JOIN tahfiz.t_ayah ay ON (
          (ti.target_type = 'juz' AND ay.juz_id = ti.juz_id)
          OR (
            ti.target_type = 'surah'
            AND ay.surah_id = ti.surah_id
            AND ay.ayah_number BETWEEN COALESCE(ti.start_ayat, 1) AND COALESCE(ti.end_ayat, ay.ayah_number)
          )
        )
      ),
      target_plan_totals AS (
        SELECT plan_id, COUNT(DISTINCT ayah_id)::int AS target_total_ayahs
        FROM target_ayahs
        GROUP BY plan_id
      ),
      planned_students AS (
        SELECT
          sc.halaqoh_id,
          sc.student_id,
          sc.student_name,
          sc.nis,
          sc.class_id,
          sc.class_name,
          sc.grade_id,
          sc.grade_name,
          sp.plan_id,
          sp.title AS plan_title
        FROM selected_classes sc
        JOIN selected_plans sp ON sp.grade_id = sc.grade_id
      ),
      record_ranges AS (
        SELECT DISTINCT
          dr.student_id,
          LEAST(
            sa.ayah_global_number,
            COALESCE(ea.ayah_global_number, sa.ayah_global_number)
          ) AS start_global,
          GREATEST(
            sa.ayah_global_number,
            COALESCE(ea.ayah_global_number, sa.ayah_global_number)
          ) AS end_global
        FROM tahfiz.t_daily_record dr
        JOIN selected_students ss ON ss.student_id = dr.student_id
        JOIN u_class_enrollments ce
          ON ce.student_id = dr.student_id
         AND ce.periode_id = $2
         AND ce.homebase_id = $4
        JOIN tahfiz.t_ayah sa
          ON sa.surah_id = dr.start_surah_id
         AND sa.ayah_number = COALESCE(dr.start_ayat, 1)
        LEFT JOIN tahfiz.t_ayah ea
          ON ea.surah_id = COALESCE(dr.end_surah_id, dr.start_surah_id)
         AND ea.ayah_number = COALESCE(dr.end_ayat, dr.start_ayat, 1)
        LEFT JOIN tahfiz.t_activity_type at ON at.id = dr.type_id
        WHERE (at.code = 'ziyadah' OR at.code IS NULL)
      ),
      student_achievements AS (
        SELECT
          ps.student_id,
          ps.plan_id,
          COUNT(DISTINCT ta.ayah_id)::int AS achieved_ayahs
        FROM planned_students ps
        LEFT JOIN record_ranges rr
          ON rr.student_id = ps.student_id
        LEFT JOIN target_ayahs ta
          ON ta.plan_id = ps.plan_id
         AND ta.ayah_global_number BETWEEN rr.start_global AND rr.end_global
        GROUP BY ps.student_id, ps.plan_id
      ),
      student_rows AS (
        SELECT
          ps.halaqoh_id,
          ps.grade_id,
          ps.grade_name,
          ps.class_id,
          COALESCE(ps.class_name, '-') AS class_name,
          ps.student_id,
          ps.student_name,
          ps.nis,
          ps.plan_id,
          ps.plan_title,
          COALESCE(tpt.target_total_ayahs, 0) AS target_total_ayahs,
          COALESCE(sa.achieved_ayahs, 0) AS achieved_ayahs,
          CASE
            WHEN COALESCE(tpt.target_total_ayahs, 0) > 0 THEN ROUND(
              LEAST(
                (COALESCE(sa.achieved_ayahs, 0)::numeric / tpt.target_total_ayahs::numeric) * 100,
                100
              ),
              2
            )
            ELSE 0
          END AS completion_percentage,
          CASE
            WHEN COALESCE(tpt.target_total_ayahs, 0) > 0
             AND COALESCE(sa.achieved_ayahs, 0) >= COALESCE(tpt.target_total_ayahs, 0)
            THEN true
            ELSE false
          END AS is_completed
        FROM planned_students ps
        LEFT JOIN target_plan_totals tpt ON tpt.plan_id = ps.plan_id
        LEFT JOIN student_achievements sa
          ON sa.student_id = ps.student_id
         AND sa.plan_id = ps.plan_id
      ),
      plan_item_rows AS (
        SELECT
          sp.plan_id,
          ti.id,
          ti.target_type,
          ti.order_no,
          j.number AS juz_number,
          s.number AS surah_number,
          s.name_latin AS surah_name_latin,
          ti.start_ayat,
          ti.end_ayat
        FROM selected_plans sp
        JOIN tahfiz.t_target_item ti ON ti.plan_id = sp.plan_id
        LEFT JOIN tahfiz.t_juz j ON j.id = ti.juz_id
        LEFT JOIN tahfiz.t_surah s ON s.id = ti.surah_id
      ),
      grade_summary AS (
        SELECT
          grade_id,
          grade_name,
          COUNT(*)::int AS student_count,
          COUNT(DISTINCT class_id)::int AS class_count,
          COUNT(*) FILTER (WHERE is_completed = true)::int AS completed_students,
          SUM(target_total_ayahs)::int AS target_total_ayahs,
          SUM(achieved_ayahs)::int AS achieved_ayahs,
          ROUND(AVG(completion_percentage), 2) AS completion_percentage
        FROM student_rows
        GROUP BY grade_id, grade_name
      ),
      class_summary AS (
        SELECT
          class_id,
          class_name,
          grade_name,
          COUNT(*)::int AS student_count,
          COUNT(*) FILTER (WHERE is_completed = true)::int AS completed_students,
          SUM(target_total_ayahs)::int AS target_total_ayahs,
          SUM(achieved_ayahs)::int AS achieved_ayahs,
          ROUND(AVG(completion_percentage), 2) AS completion_percentage
        FROM student_rows
        GROUP BY class_id, class_name, grade_name
      )
      SELECT json_build_object(
        'overview', json_build_object(
          'total_students', COALESCE((SELECT COUNT(*)::int FROM student_rows), 0),
          'total_classes', COALESCE((SELECT COUNT(DISTINCT class_id)::int FROM student_rows), 0),
          'total_grades', COALESCE((SELECT COUNT(DISTINCT grade_id)::int FROM student_rows), 0),
          'active_plan_count', COALESCE((SELECT COUNT(*)::int FROM selected_plans), 0),
          'total_target_ayahs', COALESCE((SELECT SUM(target_total_ayahs)::int FROM student_rows), 0),
          'total_achieved_ayahs', COALESCE((SELECT SUM(achieved_ayahs)::int FROM student_rows), 0),
          'completed_students', COALESCE((SELECT COUNT(*)::int FROM student_rows WHERE is_completed = true), 0),
          'average_completion_percentage', COALESCE((SELECT ROUND(AVG(completion_percentage), 2) FROM student_rows), 0)
        ),
        'plans', COALESCE((
          SELECT json_agg(
            json_build_object(
              'plan_id', sp.plan_id,
              'grade_id', sp.grade_id,
              'grade_name', sp.grade_name,
              'homebase_name', sp.homebase_name,
              'title', sp.title,
              'notes', sp.notes,
              'updated_at', sp.updated_at,
              'target_total_ayahs', COALESCE(tpt.target_total_ayahs, 0),
              'items', COALESCE((
                SELECT json_agg(
                  json_build_object(
                    'id', pir.id,
                    'target_type', pir.target_type,
                    'order_no', pir.order_no,
                    'juz_number', pir.juz_number,
                    'surah_number', pir.surah_number,
                    'surah_name_latin', pir.surah_name_latin,
                    'start_ayat', pir.start_ayat,
                    'end_ayat', pir.end_ayat
                  ) ORDER BY pir.order_no ASC, pir.id ASC
                )
                FROM plan_item_rows pir
                WHERE pir.plan_id = sp.plan_id
              ), '[]'::json)
            )
            ORDER BY sp.grade_name ASC, sp.plan_id ASC
          )
          FROM selected_plans sp
          LEFT JOIN target_plan_totals tpt ON tpt.plan_id = sp.plan_id
        ), '[]'::json),
        'grade_rows', COALESCE((
          SELECT json_agg(
            json_build_object(
              'grade_id', grade_id,
              'grade_name', grade_name,
              'student_count', student_count,
              'class_count', class_count,
              'completed_students', completed_students,
              'target_total_ayahs', target_total_ayahs,
              'achieved_ayahs', achieved_ayahs,
              'completion_percentage', completion_percentage
            ) ORDER BY grade_name ASC
          )
          FROM grade_summary
        ), '[]'::json),
        'class_rows', COALESCE((
          SELECT json_agg(
            json_build_object(
              'class_id', class_id,
              'class_name', class_name,
              'grade_name', grade_name,
              'student_count', student_count,
              'completed_students', completed_students,
              'target_total_ayahs', target_total_ayahs,
              'achieved_ayahs', achieved_ayahs,
              'completion_percentage', completion_percentage
            ) ORDER BY grade_name ASC NULLS LAST, class_name ASC
          )
          FROM class_summary
        ), '[]'::json),
        'student_rows', COALESCE((
          SELECT json_agg(
            json_build_object(
              'grade_id', grade_id,
              'grade_name', grade_name,
              'class_id', class_id,
              'class_name', class_name,
              'student_id', student_id,
              'student_name', student_name,
              'nis', nis,
              'plan_id', plan_id,
              'plan_title', plan_title,
              'target_total_ayahs', target_total_ayahs,
              'achieved_ayahs', achieved_ayahs,
              'completion_percentage', completion_percentage,
              'is_completed', is_completed
            )
            ORDER BY grade_name ASC NULLS LAST, class_name ASC, student_name ASC
          )
          FROM student_rows
        ), '[]'::json)
      ) AS report_data;
    `;

    const reportResult = await pool.query(reportQuery, [
      musyrif.id,
      selectedPeriodeId,
      selectedHalaqohId,
      musyrif.homebase_id,
    ]);
    const reportData = reportResult.rows[0]?.report_data || {};

    return res.json({
      code: 200,
      message: "Ringkasan laporan musyrif berhasil dimuat",
      data: {
        musyrif,
        filters: {
          periodes,
          halaqoh,
          selected_periode_id: selectedPeriodeId,
          selected_halaqoh_id: selectedHalaqohId,
          active_periode_id: activePeriode?.id || null,
        },
        overview: reportData.overview || {
          total_students: 0,
          total_classes: 0,
          total_grades: 0,
          active_plan_count: 0,
          total_target_ayahs: 0,
          total_achieved_ayahs: 0,
          completed_students: 0,
          average_completion_percentage: 0,
        },
        plans: reportData.plans || [],
        grade_rows: reportData.grade_rows || [],
        class_rows: reportData.class_rows || [],
        student_rows: reportData.student_rows || [],
      },
    });
  }),
);

router.get(
  "/report/daily/options",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const recorderRole = await resolveRecorderRole(pool, req);
    if (!recorderRole || !DAILY_ALLOWED_RECORDER_ROLES.includes(recorderRole)) {
      return res.status(403).json({
        message: "Akses ditolak. Hanya admin tahfiz, wali kelas, dan musyrif yang bisa mencatat hafalan.",
      });
    }

    const scope = await buildReportScope(pool, req, req.query);
    const [activities, surahs, students] = await Promise.all([
      getActivityTypes(pool),
      getSurahLookup(pool),
      getScopedStudents(pool, req, scope, recorderRole),
    ]);

    return res.json({
      code: 200,
      message: "Referensi setoran hafalan berhasil dimuat",
      data: {
        actor: {
          user_id: req.user.id,
          user_role: recorderRole === "musyrif" ? "musyrif" : req.user.role,
          recorder_role: recorderRole,
        },
        filters: {
          homebases: scope.homebases,
          periodes: scope.periodes,
          grades: scope.grades,
          classes: scope.classes,
          selected_homebase_id: scope.selectedHomebaseId,
          selected_periode_id: scope.selectedPeriodeId,
          selected_grade_id: scope.selectedGradeId,
          selected_class_id: scope.selectedClassId,
        },
        reference: {
          activity_types: activities,
          surahs,
          students,
        },
      },
    });
  }),
);

router.get(
  "/report/daily/students",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const recorderRole = await resolveRecorderRole(pool, req);
    if (!recorderRole || !DAILY_ALLOWED_RECORDER_ROLES.includes(recorderRole)) {
      return res.status(403).json({
        message: "Akses ditolak. Hanya admin tahfiz, wali kelas, dan musyrif yang bisa mencatat hafalan.",
      });
    }

    const scope = await buildReportScope(pool, req, req.query);
    const students = await getScopedStudents(pool, req, scope, recorderRole);

    return res.json({
      code: 200,
      message: "Daftar siswa setoran berhasil dimuat",
      data: {
        actor: {
          user_id: req.user.id,
          user_role: recorderRole === "musyrif" ? "musyrif" : req.user.role,
          recorder_role: recorderRole,
        },
        filters: {
          selected_homebase_id: scope.selectedHomebaseId,
          selected_periode_id: scope.selectedPeriodeId,
          selected_grade_id: scope.selectedGradeId,
          selected_class_id: scope.selectedClassId,
        },
        students,
      },
    });
  }),
);

router.get(
  "/report/daily/records",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const recorderRole = await resolveRecorderRole(pool, req);
    if (!recorderRole || !DAILY_ALLOWED_RECORDER_ROLES.includes(recorderRole)) {
      return res.status(403).json({
        message: "Akses ditolak. Hanya admin tahfiz, wali kelas, dan musyrif yang bisa melihat setoran hafalan.",
      });
    }

    const scope = await buildReportScope(pool, req, req.query);
    if (!scope.selectedPeriodeId || !scope.selectedHomebaseId) {
      return res.json({
        code: 200,
        message: "Belum ada periode/homebase aktif",
        data: [],
        meta: { page: 1, page_size: 10, total: 0, total_pages: 0 },
      });
    }

    const page = toPositiveInt(req.query.page, 1);
    const pageSize = Math.min(toPositiveInt(req.query.page_size, 10), 100);
    const offset = (page - 1) * pageSize;
    const dateFrom = String(req.query.date_from || "").trim() || null;
    const dateTo = String(req.query.date_to || "").trim() || null;

    const params = [
      scope.selectedPeriodeId,
      scope.selectedHomebaseId,
      scope.selectedGradeId,
      scope.selectedClassId,
    ];

    const whereClauses = [
      "($3::int IS NULL OR c.grade_id = $3)",
      "($4::int IS NULL OR c.id = $4)",
    ];

    if (req.user.role === "teacher") {
      params.push(req.user.id);
      whereClauses.push(`c.homeroom_teacher_id = $${params.length}`);
    }

    if (recorderRole === "musyrif") {
      const musyrifId = await resolveActiveMusyrifId(pool, req.user.id);
      if (!musyrifId) {
        return res.status(403).json({
          message: "Akses musyrif tidak valid atau sudah tidak aktif.",
        });
      }
      params.push(musyrifId);
      whereClauses.push(
        `EXISTS (
           SELECT 1
           FROM tahfiz.t_halaqoh_students hs
           JOIN tahfiz.t_halaqoh h ON h.id = hs.halaqoh_id
           WHERE hs.student_id = dr.student_id
             AND h.periode_id = $1
             AND h.musyrif_id = $${params.length}
         )`,
      );
    }

    if (dateFrom) {
      params.push(dateFrom);
      whereClauses.push(`dr.date >= $${params.length}::date`);
    }

    if (dateTo) {
      params.push(dateTo);
      whereClauses.push(`dr.date <= $${params.length}::date`);
    }

    const fromSql = `
       FROM tahfiz.t_daily_record dr
       JOIN u_class_enrollments ce
         ON ce.student_id = dr.student_id
        AND ce.periode_id = $1
        AND ce.homebase_id = $2
       JOIN a_class c ON c.id = ce.class_id
       LEFT JOIN a_grade g ON g.id = c.grade_id
       JOIN u_users u ON u.id = dr.student_id
       LEFT JOIN u_students s ON s.user_id = dr.student_id
       LEFT JOIN tahfiz.t_activity_type at ON at.id = dr.type_id
       LEFT JOIN tahfiz.t_surah ss ON ss.id = dr.start_surah_id
       LEFT JOIN tahfiz.t_surah es ON es.id = dr.end_surah_id
       LEFT JOIN u_users ru ON ru.id = dr.recorded_by_user_id
       WHERE ${whereClauses.join(" AND ")}
    `;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total ${fromSql}`,
      params,
    );
    const total = countResult.rows[0]?.total || 0;
    const totalPages = total > 0 ? Math.ceil(total / pageSize) : 0;

    const resultParams = [...params, pageSize, offset];
    const result = await pool.query(
      `SELECT
         dr.id,
         dr.student_id,
         u.full_name AS student_name,
         s.nis,
         dr.date,
         dr.type_id,
         at.name AS activity_name,
         at.code AS activity_code,
         dr.start_surah_id,
         ss.number AS start_surah_number,
         ss.name_latin AS start_surah_name,
         dr.start_ayat,
         dr.end_surah_id,
         es.number AS end_surah_number,
         es.name_latin AS end_surah_name,
         dr.end_ayat,
         dr.fluency_grade,
         dr.tajweed_grade,
         dr.note,
         dr.recorded_by_user_id,
         dr.recorded_by_role,
         ru.full_name AS recorded_by_name,
         dr.created_at,
         dr.updated_at
       ${fromSql}
       ORDER BY dr.date DESC, dr.id DESC
       LIMIT $${resultParams.length - 1}
       OFFSET $${resultParams.length}`,
      resultParams,
    );

    return res.json({
      code: 200,
      message: "Riwayat setoran berhasil dimuat",
      data: result.rows,
      meta: {
        page,
        page_size: pageSize,
        total,
        total_pages: totalPages,
        date_from: dateFrom,
        date_to: dateTo,
      },
    });
  }),
);

router.post(
  "/report/daily/validate",
  authorize("admin", "teacher"),
  withQuery(async (req, res, pool) => {
    const recorderRole = await resolveRecorderRole(pool, req);
    if (!recorderRole || !DAILY_ALLOWED_RECORDER_ROLES.includes(recorderRole)) {
      return res.status(403).json({
        message: "Akses ditolak. Hanya admin tahfiz, wali kelas, dan musyrif yang bisa mencatat hafalan.",
      });
    }

    const scope = await buildReportScope(pool, req, req.body || {});
    const [surahs, activities, students] = await Promise.all([
      getSurahLookup(pool),
      getActivityTypes(pool),
      getScopedStudents(pool, req, scope, recorderRole),
    ]);

    const validation = validateDailyRecordPayload({
      payload: req.body || {},
      surahList: surahs,
      activityTypes: activities.filter((item) => item.id),
    });

    if (validation.normalized.student_id) {
      const studentExistsInScope = students.some(
        (item) => item.student_id === validation.normalized.student_id,
      );
      if (!studentExistsInScope) {
        validation.isValid = false;
        validation.errors.push("Siswa tidak berada dalam cakupan akses pencatat.");
      }
    }

    return res.json({
      code: 200,
      message: validation.isValid
        ? "Validasi setoran hafalan berhasil"
        : "Validasi setoran hafalan gagal",
      data: {
        is_valid: validation.isValid,
        errors: validation.errors,
      },
    });
  }),
);

router.post(
  "/report/daily/records",
  authorize("admin", "teacher"),
  withTransaction(async (req, res, client) => {
    const recorderRole = await resolveRecorderRole(client, req);
    if (!recorderRole || !DAILY_ALLOWED_RECORDER_ROLES.includes(recorderRole)) {
      return res.status(403).json({
        message: "Akses ditolak. Hanya admin tahfiz, wali kelas, dan musyrif yang bisa mencatat hafalan.",
      });
    }

    const scope = await buildReportScope(client, req, req.body || {});
    const [surahs, activities, students] = await Promise.all([
      getSurahLookup(client),
      getActivityTypes(client),
      getScopedStudents(client, req, scope, recorderRole),
    ]);

    const validation = validateDailyRecordPayload({
      payload: req.body || {},
      surahList: surahs,
      activityTypes: activities.filter((item) => item.id),
    });

    if (validation.normalized.student_id) {
      const studentAllowed = canAccessStudentInScope({
        students,
        studentId: validation.normalized.student_id,
      });
      if (!studentAllowed) {
        validation.isValid = false;
        validation.errors.push("Siswa tidak berada dalam cakupan akses pencatat.");
      }
    }

    if (!validation.isValid) {
      return res.status(400).json({
        message: "Validasi setoran hafalan gagal.",
        errors: validation.errors,
      });
    }

    const saved = await client.query(
      `INSERT INTO tahfiz.t_daily_record (
        student_id,
        date,
        type_id,
        start_surah_id,
        start_ayat,
        end_surah_id,
        end_ayat,
        fluency_grade,
        tajweed_grade,
        note,
        recorded_by_user_id,
        recorded_by_role
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
      RETURNING id`,
      [
        validation.normalized.student_id,
        validation.normalized.date,
        validation.normalized.type_id,
        validation.normalized.start_surah_id,
        validation.normalized.start_ayat,
        validation.normalized.end_surah_id,
        validation.normalized.end_ayat,
        validation.normalized.fluency_grade,
        validation.normalized.tajweed_grade,
        validation.normalized.note,
        req.user.id,
        recorderRole,
      ],
    );

    return res.status(201).json({
      code: 201,
      message: "Setoran hafalan berhasil disimpan",
      data: {
        id: saved.rows[0].id,
        ...validation.normalized,
      },
    });
  }),
);

router.put(
  "/report/daily/records/:id",
  authorize("admin", "teacher"),
  withTransaction(async (req, res, client) => {
    const id = toNullableInt(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID setoran tidak valid." });
    }

    const recorderRole = await resolveRecorderRole(client, req);
    if (!recorderRole || !DAILY_ALLOWED_RECORDER_ROLES.includes(recorderRole)) {
      return res.status(403).json({
        message: "Akses ditolak. Hanya admin tahfiz, wali kelas, dan musyrif yang bisa memperbarui setoran.",
      });
    }

    const existing = await getDailyRecordById(client, id);
    if (!existing) {
      return res.status(404).json({ message: "Setoran tidak ditemukan." });
    }
    if (req.user.role === "teacher" && existing.recorded_by_user_id !== req.user.id) {
      return res.status(403).json({
        message: "Wali kelas hanya boleh memperbarui setoran yang dibuat sendiri.",
      });
    }

    const scope = await buildReportScope(client, req, req.body || {});
    const [surahs, activities, students] = await Promise.all([
      getSurahLookup(client),
      getActivityTypes(client),
      getScopedStudents(client, req, scope, recorderRole),
    ]);

    const mergedPayload = {
      student_id: req.body.student_id ?? existing.student_id,
      date: req.body.date ?? existing.date,
      type_id: req.body.type_id ?? existing.type_id,
      start_surah_id: req.body.start_surah_id ?? existing.start_surah_id,
      start_ayat: req.body.start_ayat ?? existing.start_ayat,
      end_surah_id: req.body.end_surah_id ?? existing.end_surah_id,
      end_ayat: req.body.end_ayat ?? existing.end_ayat,
      fluency_grade: req.body.fluency_grade ?? existing.fluency_grade,
      tajweed_grade: req.body.tajweed_grade ?? existing.tajweed_grade,
      note: req.body.note ?? existing.note,
    };

    const validation = validateDailyRecordPayload({
      payload: mergedPayload,
      surahList: surahs,
      activityTypes: activities.filter((item) => item.id),
    });

    if (validation.normalized.student_id) {
      const studentAllowed = canAccessStudentInScope({
        students,
        studentId: validation.normalized.student_id,
      });
      if (!studentAllowed) {
        validation.isValid = false;
        validation.errors.push("Siswa tidak berada dalam cakupan akses pencatat.");
      }
    }

    if (!validation.isValid) {
      return res.status(400).json({
        message: "Validasi setoran hafalan gagal.",
        errors: validation.errors,
      });
    }

    await client.query(
      `UPDATE tahfiz.t_daily_record
       SET student_id = $1,
           date = $2,
           type_id = $3,
           start_surah_id = $4,
           start_ayat = $5,
           end_surah_id = $6,
           end_ayat = $7,
           fluency_grade = $8,
           tajweed_grade = $9,
           note = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11`,
      [
        validation.normalized.student_id,
        validation.normalized.date,
        validation.normalized.type_id,
        validation.normalized.start_surah_id,
        validation.normalized.start_ayat,
        validation.normalized.end_surah_id,
        validation.normalized.end_ayat,
        validation.normalized.fluency_grade,
        validation.normalized.tajweed_grade,
        validation.normalized.note,
        id,
      ],
    );

    return res.json({
      code: 200,
      message: "Setoran hafalan berhasil diperbarui",
      data: {
        id,
        ...validation.normalized,
      },
    });
  }),
);

router.delete(
  "/report/daily/records/:id",
  authorize("admin", "teacher"),
  withTransaction(async (req, res, client) => {
    const id = toNullableInt(req.params.id);
    if (!id) {
      return res.status(400).json({ message: "ID setoran tidak valid." });
    }

    const recorderRole = await resolveRecorderRole(client, req);
    if (!recorderRole || !DAILY_ALLOWED_RECORDER_ROLES.includes(recorderRole)) {
      return res.status(403).json({
        message: "Akses ditolak. Hanya admin tahfiz, wali kelas, dan musyrif yang bisa menghapus setoran.",
      });
    }

    const existing = await getDailyRecordById(client, id);
    if (!existing) {
      return res.status(404).json({ message: "Setoran tidak ditemukan." });
    }
    if (req.user.role === "teacher" && existing.recorded_by_user_id !== req.user.id) {
      return res.status(403).json({
        message: "Wali kelas hanya boleh menghapus setoran yang dibuat sendiri.",
      });
    }

    const scope = await buildReportScope(client, req, req.query || {});
    const students = await getScopedStudents(client, req, scope, recorderRole);
    const studentAllowed = canAccessStudentInScope({
      students,
      studentId: existing.student_id,
    });
    if (!studentAllowed) {
      return res.status(403).json({ message: "Setoran di luar cakupan akses Anda." });
    }

    await client.query(`DELETE FROM tahfiz.t_daily_record WHERE id = $1`, [id]);

    return res.json({
      code: 200,
      message: "Setoran hafalan berhasil dihapus",
      data: { id },
    });
  }),
);

export default router;
