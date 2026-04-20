import { Router } from "express";
import bcrypt from "bcrypt";
import { withTransaction, withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const SEMESTER_MONTHS = {
  1: [7, 8, 9, 10, 11, 12],
  2: [1, 2, 3, 4, 5, 6],
};

const normalizeNisList = (value) => {
  if (!value) return [];
  const items = Array.isArray(value) ? value : [value];
  return Array.from(
    new Set(
      items
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  );
};

const ensureParentStudentTable = async (client) => {
  await client.query(`
    CREATE TABLE IF NOT EXISTS u_parent_students (
      id SERIAL PRIMARY KEY,
      parent_user_id integer NOT NULL REFERENCES u_users(id) ON DELETE CASCADE,
      student_id integer NOT NULL REFERENCES u_students(user_id) ON DELETE CASCADE,
      homebase_id integer NOT NULL REFERENCES a_homebase(id) ON DELETE CASCADE,
      created_at timestamp DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT uq_parent_student_pair UNIQUE (parent_user_id, student_id),
      CONSTRAINT uq_parent_student_owner UNIQUE (student_id)
    )
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_parent_students_parent_homebase
    ON u_parent_students(parent_user_id, homebase_id)
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_parent_students_homebase
    ON u_parent_students(homebase_id)
  `);
};

const syncLegacyParentLinks = async (client, homebaseId) => {
  await client.query(
    `INSERT INTO u_parent_students (parent_user_id, student_id, homebase_id)
     SELECT up.user_id, up.student_id, s.homebase_id
     FROM u_parents up
     JOIN u_users pu ON pu.id = up.user_id AND pu.role = 'parent'
     JOIN u_students s ON s.user_id = up.student_id
     WHERE up.student_id IS NOT NULL
       AND up.user_id IS NOT NULL
       AND s.homebase_id = $1
     ON CONFLICT (student_id) DO NOTHING`,
    [homebaseId],
  );
};

const getActivePeriode = async (client, homebaseId) => {
  const result = await client.query(
    `SELECT id, name
     FROM a_periode
     WHERE homebase_id = $1
       AND is_active = true
     ORDER BY id DESC
     LIMIT 1`,
    [homebaseId],
  );

  return result.rows[0] || null;
};

const resolveStudentsByNis = async (client, homebaseId, nisList, activePeriodeId) => {
  if (!nisList.length) return { rows: [], missingNis: [] };

  const studentRes = await client.query(
    `SELECT s.user_id AS student_id, s.nis, u.full_name
     FROM u_students s
     JOIN u_users u ON u.id = s.user_id
     WHERE s.homebase_id = $1
       AND s.current_periode_id = $2
       AND s.nis = ANY($3::text[])`,
    [homebaseId, activePeriodeId, nisList],
  );

  const foundNis = new Set(studentRes.rows.map((row) => String(row.nis).trim()));
  const missingNis = nisList.filter((nis) => !foundNis.has(nis));

  return { rows: studentRes.rows, missingNis };
};

const parseParentId = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const parsePositiveInt = (value) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
};

const parseSemester = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || ![1, 2].includes(parsed)) return null;
  return parsed;
};

const parseMonth = (value) => {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 12) return null;
  return parsed;
};

const monthFilterSql = (columnRef, paramIndex) => `
  (
    $${paramIndex}::int IS NULL
    OR (
      CASE
        WHEN ${columnRef} ~ '^[0-9]+$' THEN ${columnRef}::int
        ELSE NULL
      END
    ) = $${paramIndex}::int
    OR lower(${columnRef}) = lower(trim(to_char(make_date(2000, $${paramIndex}::int, 1), 'FMMonth')))
  )
`;

const normalizeStatus = (status) => {
  if (!status) return null;
  const lower = String(status).trim().toLowerCase();
  if (lower === "h" || lower === "hadir") return "Hadir";
  if (lower === "t" || lower === "telat") return "Telat";
  if (lower === "s" || lower === "sakit") return "Sakit";
  if (lower === "i" || lower === "izin") return "Izin";
  if (lower === "a" || lower === "alpha" || lower === "alpa") return "Alpa";
  return status;
};

const toStatusCode = (status) => {
  const normalized = normalizeStatus(status);
  if (!normalized) return "-";
  if (normalized === "Hadir") return "H";
  if (normalized === "Telat") return "T";
  if (normalized === "Sakit") return "S";
  if (normalized === "Izin") return "I";
  if (normalized === "Alpa") return "A";
  return "-";
};

const toUniqueSortedIds = (values = []) =>
  Array.from(
    new Set(
      values
        .map((item) => Number(item))
        .filter((item) => Number.isInteger(item) && item > 0),
    ),
  ).sort((a, b) => a - b);

const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

const loadFinanceFeatureAvailability = async (client) => {
  const result = await client.query(`
    SELECT
      to_regclass('finance.savings_transactions') IS NOT NULL AS savings_exists,
      to_regclass('finance.class_cash_transactions') IS NOT NULL AS class_cash_exists
  `);

  return result.rows[0] || {
    savings_exists: false,
    class_cash_exists: false,
  };
};

const toAcademicYears = (periodeName, now = new Date()) => {
  const raw = String(periodeName || "");
  const rangeMatch = raw.match(/(\d{4})\s*\/\s*(\d{4})/);
  if (rangeMatch) {
    return {
      startYear: Number(rangeMatch[1]),
      endYear: Number(rangeMatch[2]),
    };
  }

  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth() + 1;
  if (thisMonth >= 7) {
    return { startYear: thisYear, endYear: thisYear + 1 };
  }
  return { startYear: thisYear - 1, endYear: thisYear };
};

router.get(
  "/parent/dashboard",
  authorize("parent"),
  withQuery(async (req, res, pool) => {
    const parentUserId = req.user.id;

    await ensureParentStudentTable(pool);

    const [parentRes, studentsRes] = await Promise.all([
      pool.query(
        `SELECT
           u.id,
           u.full_name,
           u.img_url,
           p.phone,
           p.email
         FROM u_users u
         LEFT JOIN u_parents p ON p.user_id = u.id
         WHERE u.id = $1
           AND u.role = 'parent'
         LIMIT 1`,
        [parentUserId],
      ),
      pool.query(
        `SELECT
           s.user_id AS student_id,
           su.full_name AS student_name,
           s.nis,
           s.current_class_id AS class_id,
           s.current_periode_id AS periode_id,
           c.name AS class_name,
           g.name AS grade_name,
           hb.id AS homebase_id,
           hb.name AS homebase_name
         FROM u_parent_students ups
         JOIN u_students s ON s.user_id = ups.student_id
         JOIN u_users su ON su.id = s.user_id
         LEFT JOIN a_class c ON c.id = s.current_class_id
         LEFT JOIN a_grade g ON g.id = c.grade_id
         LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
         WHERE ups.parent_user_id = $1
         ORDER BY su.full_name ASC`,
        [parentUserId],
      ),
    ]);

    if (parentRes.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Data orang tua tidak ditemukan.",
      });
    }

    const students = studentsRes.rows;
    const studentIds = Array.from(
      new Set(students.map((item) => Number(item.student_id)).filter(Boolean)),
    );
    const classIds = Array.from(
      new Set(students.map((item) => Number(item.class_id)).filter(Boolean)),
    );

    const activePeriode =
      students[0]?.homebase_id && Number.isInteger(Number(students[0].homebase_id))
        ? await getActivePeriode(pool, Number(students[0].homebase_id))
        : null;

    const financeAvailability = await loadFinanceFeatureAvailability(pool);

    const [savingsRes, classCashRes] = await Promise.all([
      financeAvailability.savings_exists && studentIds.length > 0
        ? pool.query(
            `SELECT
               student_id,
               COUNT(*)::int AS transactions_total,
               MAX(transaction_date) AS last_transaction_date,
               COALESCE(
                 SUM(
                   CASE
                     WHEN lower(transaction_type) = 'deposit' THEN amount
                     WHEN lower(transaction_type) = 'withdrawal' THEN -amount
                     ELSE 0
                   END
                 ),
                 0
               )::numeric AS balance
             FROM finance.savings_transactions
             WHERE student_id = ANY($1::int[])
             GROUP BY student_id`,
            [studentIds],
          )
        : Promise.resolve({ rows: [] }),
      financeAvailability.class_cash_exists && classIds.length > 0
        ? pool.query(
            `SELECT
               class_id,
               COUNT(*)::int AS transactions_total,
               MAX(transaction_date) AS last_transaction_date,
               COALESCE(
                 SUM(
                   CASE
                     WHEN lower(transaction_type) = 'income' THEN amount
                     WHEN lower(transaction_type) = 'expense' THEN -amount
                     ELSE 0
                   END
                 ),
                 0
               )::numeric AS balance
             FROM finance.class_cash_transactions
             WHERE class_id = ANY($1::int[])
             GROUP BY class_id`,
            [classIds],
          )
        : Promise.resolve({ rows: [] }),
    ]);

    const savingsMap = new Map(
      savingsRes.rows.map((row) => [
        Number(row.student_id),
        {
          balance: round2(row.balance),
          transactions_total: Number(row.transactions_total || 0),
          last_transaction_date: row.last_transaction_date || null,
        },
      ]),
    );

    const classCashMap = new Map(
      classCashRes.rows.map((row) => [
        Number(row.class_id),
        {
          balance: round2(row.balance),
          transactions_total: Number(row.transactions_total || 0),
          last_transaction_date: row.last_transaction_date || null,
        },
      ]),
    );

    const studentCards = await Promise.all(
      students.map(async (student) => {
        const studentId = Number(student.student_id);
        const classId = Number(student.class_id);
        const periodeId = Number(student.periode_id);

        const [lmsRes, attendanceRes] = await Promise.all([
          Number.isInteger(classId)
            ? pool.query(
                `SELECT
                   COUNT(DISTINCT ats.subject_id)::int AS subjects_total,
                   COUNT(DISTINCT ct.id)::int AS materials_total
                 FROM at_subject ats
                 LEFT JOIN l_chapter ch
                   ON ch.subject_id = ats.subject_id
                  AND (
                    ch.class_id = $1
                    OR $1 = ANY(COALESCE(ch.class_ids, ARRAY[]::integer[]))
                  )
                 LEFT JOIN l_content ct ON ct.chapter_id = ch.id
                 WHERE ats.class_id = $1`,
                [classId],
              )
            : Promise.resolve({
                rows: [{ subjects_total: 0, materials_total: 0 }],
              }),
          pool.query(
            `SELECT
               COUNT(*)::int AS total_sessions,
               COUNT(*) FILTER (WHERE status IN ('Hadir', 'Telat'))::int AS hadir_sessions
             FROM l_attendance
             WHERE student_id = $1
               AND ($2::int IS NULL OR periode_id = $2)`,
            [studentId, Number.isInteger(periodeId) ? periodeId : null],
          ),
        ]);

        const lms = lmsRes.rows[0] || {};
        const attendance = attendanceRes.rows[0] || {};
        const savings = savingsMap.get(studentId) || {
          balance: 0,
          transactions_total: 0,
          last_transaction_date: null,
        };
        const classCash = classCashMap.get(classId) || {
          balance: 0,
          transactions_total: 0,
          last_transaction_date: null,
        };

        return {
          student_id: studentId,
          student_name: student.student_name,
          nis: student.nis,
          class_name: student.class_name,
          grade_name: student.grade_name,
          homebase_name: student.homebase_name,
          lms: {
            subjects_total: Number(lms.subjects_total || 0),
            materials_total: Number(lms.materials_total || 0),
            attendance: {
              hadir_sessions: Number(attendance.hadir_sessions || 0),
              total_sessions: Number(attendance.total_sessions || 0),
            },
          },
          finance: {
            savings,
            class_cash: classCash,
          },
        };
      }),
    );

    const recentMaterialsRes =
      classIds.length > 0
        ? await pool.query(
            `SELECT
               ct.id,
               ct.title,
               ct.created_at,
               ch.title AS chapter_title,
               sbj.name AS subject_name
             FROM l_content ct
             JOIN l_chapter ch ON ch.id = ct.chapter_id
             JOIN a_subject sbj ON sbj.id = ch.subject_id
             WHERE
               ch.class_id = ANY($1::int[])
               OR EXISTS (
                 SELECT 1
                 FROM unnest(COALESCE(ch.class_ids, ARRAY[]::int[])) AS cid
                 WHERE cid = ANY($1::int[])
               )
             ORDER BY ct.created_at DESC
             LIMIT 8`,
            [classIds],
          )
        : { rows: [] };

    const summary = studentCards.reduce(
      (acc, item) => {
        acc.students_total += 1;
        acc.lms_subjects_total += item.lms.subjects_total;
        acc.lms_materials_total += item.lms.materials_total;
        acc.lms_attendance_total += item.lms.attendance.total_sessions;
        acc.lms_attendance_hadir += item.lms.attendance.hadir_sessions;
        acc.total_savings_balance += Number(item.finance?.savings?.balance || 0);
        acc.total_class_cash_balance += Number(item.finance?.class_cash?.balance || 0);
        return acc;
      },
      {
        students_total: 0,
        lms_subjects_total: 0,
        lms_materials_total: 0,
        lms_attendance_total: 0,
        lms_attendance_hadir: 0,
        total_savings_balance: 0,
        total_class_cash_balance: 0,
      },
    );

    const attendanceRate =
      summary.lms_attendance_total > 0
        ? Math.round(
            (summary.lms_attendance_hadir / summary.lms_attendance_total) * 100,
          )
        : 0;

    res.json({
      status: "success",
      data: {
        parent: parentRes.rows[0],
        active_periode: activePeriode,
        summary: {
          students_total: summary.students_total,
          lms_subjects_total: summary.lms_subjects_total,
          lms_materials_total: summary.lms_materials_total,
          lms_attendance_rate: attendanceRate,
          total_savings_balance: round2(summary.total_savings_balance),
          total_class_cash_balance: round2(summary.total_class_cash_balance),
        },
        students: studentCards,
        recent_lms: recentMaterialsRes.rows,
      },
    });
  }),
);

router.get(
  "/parent/academic-report",
  authorize("parent"),
  withQuery(async (req, res, pool) => {
    const parentUserId = req.user.id;
    await ensureParentStudentTable(pool);

    const semester = parseSemester(req.query.semester);
    const month = parseMonth(req.query.month);

    if (req.query.semester && semester === null) {
      return res.status(400).json({
        status: "error",
        message: "Semester tidak valid. Gunakan 1 atau 2.",
      });
    }

    if (req.query.month && month === null) {
      return res.status(400).json({
        status: "error",
        message: "Bulan tidak valid. Gunakan 1 sampai 12.",
      });
    }

    const studentsRes = await pool.query(
      `SELECT
         s.user_id AS student_id,
         su.full_name AS student_name,
         s.nis,
         s.current_class_id AS class_id,
         s.current_periode_id AS periode_id,
         c.name AS class_name
       FROM u_parent_students ups
       JOIN u_students s ON s.user_id = ups.student_id
       JOIN u_users su ON su.id = s.user_id
       LEFT JOIN a_class c ON c.id = s.current_class_id
       WHERE ups.parent_user_id = $1
       ORDER BY su.full_name ASC`,
      [parentUserId],
    );

    if (studentsRes.rowCount === 0) {
      return res.json({
        status: "success",
        data: {
          filters: {
            selected_student_id: null,
            selected_semester: semester || null,
            selected_month: month || null,
          },
          students: [],
          reports: [],
        },
      });
    }

    const ownedStudentIds = studentsRes.rows.map((row) => Number(row.student_id));
    const requestedStudentId = parsePositiveInt(req.query.student_id);
    const selectedStudentId = requestedStudentId || ownedStudentIds[0];

    if (!ownedStudentIds.includes(selectedStudentId)) {
      return res.status(403).json({
        status: "error",
        message: "Akses siswa tidak diizinkan.",
      });
    }

    const selectedStudent = studentsRes.rows.find(
      (item) => Number(item.student_id) === Number(selectedStudentId),
    );
    const classId = parsePositiveInt(selectedStudent?.class_id);
    const periodeId = parsePositiveInt(selectedStudent?.periode_id);

    if (!classId || !periodeId || !semester || !month) {
      return res.json({
        status: "success",
        data: {
          filters: {
            selected_student_id: selectedStudentId,
            selected_semester: semester || null,
            selected_month: month || null,
          },
          students: studentsRes.rows,
          reports: [],
        },
      });
    }

    const academicYears = toAcademicYears(selectedStudent?.class_name || "");
    const activePeriode = await getActivePeriode(pool, req.user.homebase_id);
    const effectivePeriodeId = parsePositiveInt(activePeriode?.id || periodeId);
    const effectivePeriodeName = activePeriode?.name || null;
    const periodYears = toAcademicYears(effectivePeriodeName);
    const semesterMonths = SEMESTER_MONTHS[semester] || [];

    if (!semesterMonths.includes(month)) {
      return res.status(400).json({
        status: "error",
        message: "Filter semester/bulan tidak valid pada periode aktif ini.",
      });
    }

    const reportYear = semester === 1 ? periodYears.startYear : periodYears.endYear;
    const monthName = MONTH_NAMES[month - 1];
    const nextDate = new Date(Date.UTC(reportYear, month, 1));
    const fromDate = `${reportYear}-${String(month).padStart(2, "0")}-01`;
    const toDate = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-01`;

    const subjectBaseRes = await pool.query(
      `WITH subject_base AS (
         SELECT DISTINCT s.id AS subject_id, s.name AS subject_name, s.code AS subject_code
         FROM a_subject s
         WHERE s.id IN (
           SELECT ats.subject_id
           FROM at_subject ats
           WHERE ats.class_id = $1

           UNION

           SELECT a.subject_id
           FROM l_attendance a
           WHERE a.student_id = $2
             AND a.class_id = $1
             AND EXISTS (
               SELECT 1
               FROM u_class_enrollments e
               WHERE e.student_id = a.student_id
                 AND e.class_id = a.class_id
                 AND e.periode_id = $3
             )
             AND a.date >= $4::date
             AND a.date < $5::date
             AND EXTRACT(MONTH FROM a.date) = $6
             AND EXTRACT(YEAR FROM a.date) = $7
             AND a.subject_id IS NOT NULL

           UNION

           SELECT x.subject_id
           FROM l_score_attitude x
           WHERE x.student_id = $2
             AND x.class_id = $1
             AND x.periode_id = $3
             AND x.month = $8
             AND x.semester = $9
             AND x.subject_id IS NOT NULL

           UNION

           SELECT f.subject_id
           FROM l_score_formative f
           WHERE f.student_id = $2
             AND f.class_id = $1
             AND f.periode_id = $3
             AND f.month = $8
             AND f.semester = $9
             AND f.subject_id IS NOT NULL

           UNION

           SELECT s.subject_id
           FROM l_score_summative s
           WHERE s.student_id = $2
             AND s.class_id = $1
             AND s.periode_id = $3
             AND s.month = $8
             AND s.semester = $9
             AND s.subject_id IS NOT NULL
         )
       )
       SELECT subject_id, subject_name, subject_code
       FROM subject_base
       ORDER BY subject_name ASC`,
      [
        classId,
        selectedStudentId,
        effectivePeriodeId,
        fromDate,
        toDate,
        month,
        reportYear,
        monthName,
        semester,
      ],
    );

    const reports = await Promise.all(
      subjectBaseRes.rows.map(async (subjectRow) => {
        const subjectId = Number(subjectRow.subject_id);

        const teacherAssignmentResult = await pool.query(
          `SELECT DISTINCT teacher_id
           FROM at_subject
           WHERE subject_id = $1
             AND class_id = $2
             AND teacher_id IS NOT NULL`,
          [subjectId, classId],
        );

        const teacherIds = toUniqueSortedIds(
          teacherAssignmentResult.rows.map((row) => row.teacher_id),
        );

        const attendanceFilterClause = teacherIds.length
          ? "AND (a.teacher_id = ANY($9::int[]) OR a.teacher_id IS NULL)"
          : "";
        const attendanceResult = await pool.query(
          `SELECT
             TO_CHAR(a.date::date, 'YYYY-MM-DD') AS attendance_date,
             a.status
           FROM l_attendance a
           WHERE a.student_id = $1
             AND a.subject_id = $2
             AND a.class_id = $3
             AND EXISTS (
               SELECT 1
               FROM u_class_enrollments e
               WHERE e.student_id = a.student_id
                 AND e.class_id = a.class_id
                 AND e.periode_id = $4
             )
             AND a.date >= $5::date
             AND a.date < $6::date
             AND EXTRACT(MONTH FROM a.date) = $7
             AND EXTRACT(YEAR FROM a.date) = $8
             ${attendanceFilterClause}
           ORDER BY a.date ASC`,
          [
            selectedStudentId,
            subjectId,
            classId,
            effectivePeriodeId,
            fromDate,
            toDate,
            month,
            reportYear,
            ...(!teacherIds.length ? [] : [teacherIds]),
          ],
        );

        const attendanceRows = attendanceResult.rows.map((row) => {
          const normalized = normalizeStatus(row.status);
          return {
            date: row.attendance_date,
            status_name: normalized,
            status_code: toStatusCode(normalized),
          };
        });

        const attendanceSummary = attendanceRows.reduce(
          (acc, row) => {
            if (row.status_name === "Hadir" || row.status_name === "Telat") acc.hadir += 1;
            if (row.status_name === "Sakit") acc.sakit += 1;
            if (row.status_name === "Izin") acc.izin += 1;
            if (row.status_name === "Alpa") acc.alpa += 1;
            return acc;
          },
          { hadir: 0, sakit: 0, izin: 0, alpa: 0 },
        );

        const meetingCount = attendanceRows.length;
        const attendancePercent = meetingCount
          ? round2((attendanceSummary.hadir / meetingCount) * 100)
          : 0;

        const teacherFilterScoreClause = teacherIds.length
          ? "AND (teacher_id = ANY($7::int[]) OR teacher_id IS NULL)"
          : "";

        const formativeResult = await pool.query(
          `SELECT
             f.id,
             f.chapter_id,
             f.type,
             f.score,
             ch.title AS chapter_title
           FROM l_score_formative f
           LEFT JOIN l_chapter ch ON ch.id = f.chapter_id
           WHERE f.student_id = $1
             AND f.subject_id = $2
             AND f.class_id = $3
             AND f.periode_id = $4
             AND f.semester = $5
             AND f.month = $6
             ${teacherFilterScoreClause}
           ORDER BY f.chapter_id ASC, f.type ASC, f.id ASC`,
          [
            selectedStudentId,
            subjectId,
            classId,
            effectivePeriodeId,
            semester,
            monthName,
            ...(!teacherIds.length ? [] : [teacherIds]),
          ],
        );

        const formativeEntries = formativeResult.rows.map((row) => ({
          id: row.id,
          chapter_id: row.chapter_id,
          chapter_title: row.chapter_title || `Bab ${row.chapter_id || "-"}`,
          type: row.type || "-",
          score:
            row.score === null || row.score === undefined ? null : Number(row.score),
        }));

        const formativeValues = formativeEntries
          .map((item) => item.score)
          .filter((value) => value !== null && value !== undefined);
        const formativeAverage = formativeValues.length
          ? round2(
              formativeValues.reduce((sum, value) => sum + Number(value), 0) /
                formativeValues.length,
            )
          : 0;

        const summativeResult = await pool.query(
          `SELECT
             s.id,
             s.chapter_id,
             s.type,
             s.score_written,
             s.score_skill,
             s.final_score,
             ch.title AS chapter_title
           FROM l_score_summative s
           LEFT JOIN l_chapter ch ON ch.id = s.chapter_id
           WHERE s.student_id = $1
             AND s.subject_id = $2
             AND s.class_id = $3
             AND s.periode_id = $4
             AND s.semester = $5
             AND s.month = $6
             ${teacherFilterScoreClause}
           ORDER BY s.chapter_id ASC, s.type ASC, s.id ASC`,
          [
            selectedStudentId,
            subjectId,
            classId,
            effectivePeriodeId,
            semester,
            monthName,
            ...(!teacherIds.length ? [] : [teacherIds]),
          ],
        );

        const summativeEntries = summativeResult.rows.map((row) => ({
          id: row.id,
          chapter_id: row.chapter_id,
          chapter_title: row.chapter_title || `Bab ${row.chapter_id || "-"}`,
          type: row.type || "-",
          score_written:
            row.score_written === null || row.score_written === undefined
              ? null
              : Number(row.score_written),
          score_skill:
            row.score_skill === null || row.score_skill === undefined
              ? null
              : Number(row.score_skill),
          final_score:
            row.final_score === null || row.final_score === undefined
              ? null
              : Number(row.final_score),
        }));

        const summativeValues = summativeEntries
          .flatMap((item) => [item.score_written, item.score_skill])
          .filter((value) => value !== null && value !== undefined);
        const summativeAverage = summativeValues.length
          ? round2(
              summativeValues.reduce((sum, value) => sum + Number(value), 0) /
                summativeValues.length,
            )
          : 0;

        const attitudeFilterClause = teacherIds.length
          ? "AND (a.teacher_id = ANY($7::int[]) OR a.teacher_id IS NULL)"
          : "";
        const attitudeResult = await pool.query(
          `SELECT
             a.kinerja,
             a.kedisiplinan,
             a.keaktifan,
             a.percaya_diri,
             a.teacher_note,
             a.average_score
           FROM l_score_attitude a
           WHERE a.student_id = $1
             AND a.subject_id = $2
             AND a.class_id = $3
             AND a.periode_id = $4
             AND a.month = $5
             AND a.semester = $6
             ${attitudeFilterClause}
           ORDER BY a.id DESC`,
          [
            selectedStudentId,
            subjectId,
            classId,
            effectivePeriodeId,
            monthName,
            semester,
            ...(!teacherIds.length ? [] : [teacherIds]),
          ],
        );

        const attitudeRows = attitudeResult.rows;
        const avgFromField = (fieldName) => {
          const values = attitudeRows
            .map((row) => row[fieldName])
            .filter((value) => value !== null && value !== undefined);
          return values.length
            ? round2(
                values.reduce((sum, value) => sum + Number(value), 0) / values.length,
              )
            : null;
        };

        const attitudeAverageValues = attitudeRows
          .map((row) => row.average_score)
          .filter((value) => value !== null && value !== undefined);
        const attitudeAverage = attitudeAverageValues.length
          ? round2(
              attitudeAverageValues.reduce((sum, value) => sum + Number(value), 0) /
                attitudeAverageValues.length,
            )
          : null;

        return {
          subject_id: subjectId,
          subject_name: subjectRow.subject_name,
          subject_code: subjectRow.subject_code,
          attendance: {
            total_meetings: meetingCount,
            percent_hadir: attendancePercent,
            summary: attendanceSummary,
            records: attendanceRows,
          },
          attitude: {
            score: {
              kinerja: avgFromField("kinerja"),
              kedisiplinan: avgFromField("kedisiplinan"),
              keaktifan: avgFromField("keaktifan"),
              percaya_diri: avgFromField("percaya_diri"),
              average_score: attitudeAverage,
            },
            teacher_note:
              attitudeRows.find((item) => item.teacher_note)?.teacher_note || null,
            total_entries: attitudeRows.length,
          },
          formative: {
            average_score: formativeAverage,
            total_entries: formativeEntries.length,
            entries: formativeEntries,
          },
          summative: {
            average_score: summativeAverage,
            total_entries: summativeEntries.length,
            entries: summativeEntries,
          },
        };
      }),
    );

    res.json({
      status: "success",
      data: {
        filters: {
          selected_student_id: selectedStudentId,
          selected_semester: semester || null,
          selected_month: month || null,
        },
        students: studentsRes.rows,
        reports,
      },
    });
  }),
);

router.get(
  "/parents/meta",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(pool);
    await syncLegacyParentLinks(pool, homebaseId);

    const activePeriode = await getActivePeriode(pool, homebaseId);
    let students = [];

    if (activePeriode?.id) {
      const studentsRes = await pool.query(
        `SELECT
           s.user_id AS student_id,
           s.nis,
           u.full_name,
           c.id AS class_id,
           s.current_class_id,
           g.id AS grade_id,
           c.name AS class_name,
           g.name AS grade_name,
           ups.parent_user_id AS owner_parent_id,
           pu.full_name AS owner_parent_name
         FROM u_students s
         JOIN u_users u ON u.id = s.user_id
         LEFT JOIN a_class c ON c.id = s.current_class_id
         LEFT JOIN a_grade g ON g.id = c.grade_id
         LEFT JOIN u_parent_students ups
           ON ups.student_id = s.user_id
          AND ups.homebase_id = $1
         LEFT JOIN u_users pu ON pu.id = ups.parent_user_id
         WHERE s.homebase_id = $1
           AND s.current_periode_id = $2
         ORDER BY u.full_name ASC`,
        [homebaseId, activePeriode.id],
      );
      students = studentsRes.rows;
    }

    res.json({
      status: "success",
      data: {
        active_periode: activePeriode,
        students,
      },
    });
  }),
);

router.get(
  "/parents",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(pool);
    await syncLegacyParentLinks(pool, homebaseId);
    const activePeriode = await getActivePeriode(pool, homebaseId);

    const pageNum = parseInt(req.query.page, 10) || 1;
    const limitNum = parseInt(req.query.limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;
    const search = String(req.query.search || "").trim();
    const gradeId = parsePositiveInt(req.query.grade_id);
    const classId = parsePositiveInt(req.query.class_id);

    if (!activePeriode?.id) {
      return res.json({
        status: "success",
        data: [],
        totalData: 0,
        totalPages: 0,
        page: pageNum,
        limit: limitNum,
      });
    }

    const whereParts = [];
    const baseParams = [homebaseId, activePeriode.id];

    if (search) {
      baseParams.push(`%${search}%`);
      const searchParamIndex = baseParams.length;
      whereParts.push(`(
          u.full_name ILIKE $${searchParamIndex}
          OR u.username ILIKE $${searchParamIndex}
          OR COALESCE(up.email, '') ILIKE $${searchParamIndex}
          OR EXISTS (
            SELECT 1
            FROM u_parent_students ex_ups
            JOIN u_students ex_s ON ex_s.user_id = ex_ups.student_id
            WHERE ex_ups.parent_user_id = u.id
              AND ex_ups.homebase_id = $1
              AND ex_s.current_periode_id = $2
              AND ex_s.nis ILIKE $${searchParamIndex}
          )
        )`);
    }

    if (gradeId) {
      baseParams.push(gradeId);
      const gradeParamIndex = baseParams.length;
      whereParts.push(`EXISTS (
          SELECT 1
          FROM u_parent_students fg_ups
          JOIN u_students fg_s ON fg_s.user_id = fg_ups.student_id
          LEFT JOIN a_class fg_c ON fg_c.id = fg_s.current_class_id
          WHERE fg_ups.parent_user_id = u.id
            AND fg_ups.homebase_id = $1
            AND fg_s.current_periode_id = $2
            AND fg_c.grade_id = $${gradeParamIndex}
        )`);
    }

    if (classId) {
      baseParams.push(classId);
      const classParamIndex = baseParams.length;
      whereParts.push(`EXISTS (
          SELECT 1
          FROM u_parent_students fc_ups
          JOIN u_students fc_s ON fc_s.user_id = fc_ups.student_id
          WHERE fc_ups.parent_user_id = u.id
            AND fc_ups.homebase_id = $1
            AND fc_s.current_periode_id = $2
            AND fc_s.current_class_id = $${classParamIndex}
        )`);
    }

    const whereFilter = whereParts.length
      ? `AND ${whereParts.join("\n        AND ")}`
      : "";

    const limitParamIndex = baseParams.length + 1;
    const offsetParamIndex = baseParams.length + 2;
    const params = [...baseParams, limitNum, offset];
    const countParams = [...baseParams];

    const dataQuery = `
      SELECT
        u.id,
        u.username,
        u.full_name,
        u.is_active,
        up.phone,
        up.email,
        COALESCE(children.students, '[]'::json) AS students,
        COALESCE(children.student_count, 0) AS student_count
      FROM u_users u
      JOIN u_parents up ON up.user_id = u.id
      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int AS student_count,
          json_agg(
            json_build_object(
              'student_id', s.user_id,
              'nis', s.nis,
              'full_name', su.full_name,
              'class_name', c.name
            )
            ORDER BY su.full_name ASC
          ) AS students
        FROM u_parent_students ups
        JOIN u_students s ON s.user_id = ups.student_id
        JOIN u_users su ON su.id = s.user_id
        LEFT JOIN a_class c ON c.id = s.current_class_id
        WHERE ups.parent_user_id = u.id
          AND ups.homebase_id = $1
          AND s.current_periode_id = $2
      ) children ON true
      WHERE u.role = 'parent'
        AND COALESCE(children.student_count, 0) > 0
        ${whereFilter}
      ORDER BY u.full_name ASC
      LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM u_users u
      JOIN u_parents up ON up.user_id = u.id
      WHERE u.role = 'parent'
        AND EXISTS (
          SELECT 1
          FROM u_parent_students ups
          JOIN u_students s ON s.user_id = ups.student_id
          WHERE ups.parent_user_id = u.id
            AND ups.homebase_id = $1
            AND s.current_periode_id = $2
        )
        ${whereFilter}
    `;

    const [dataRes, countRes] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams),
    ]);

    const totalData = parseInt(countRes.rows[0]?.total || 0, 10);

    res.json({
      status: "success",
      data: dataRes.rows,
      totalData,
      totalPages: Math.ceil(totalData / limitNum),
      page: pageNum,
      limit: limitNum,
      active_periode: activePeriode,
    });
  }),
);

router.delete(
  "/parents",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(client);
    await syncLegacyParentLinks(client, homebaseId);

    const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const parentIds = Array.from(
      new Set(
        ids
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0),
      ),
    );

    if (parentIds.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Daftar ID orang tua tidak valid.",
      });
    }

    const ownedParentsRes = await client.query(
      `SELECT DISTINCT ups.parent_user_id AS id
       FROM u_parent_students ups
       JOIN u_users u ON u.id = ups.parent_user_id
       WHERE ups.homebase_id = $1
         AND u.role = 'parent'
         AND ups.parent_user_id = ANY($2::int[])`,
      [homebaseId, parentIds],
    );

    const deletableIds = ownedParentsRes.rows.map((row) => Number(row.id));
    if (deletableIds.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Tidak ada data orang tua yang dapat dihapus.",
      });
    }

    const deleteRes = await client.query(
      `DELETE FROM u_users
       WHERE id = ANY($1::int[])
         AND role = 'parent'`,
      [deletableIds],
    );

    res.json({
      status: "success",
      message: `${deleteRes.rowCount || 0} data orang tua berhasil dihapus.`,
      deleted: deleteRes.rowCount || 0,
    });
  }),
);

router.get(
  "/parents/student-links",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(pool);
    await syncLegacyParentLinks(pool, homebaseId);

    const pageNum = parseInt(req.query.page, 10) || 1;
    const limitNum = parseInt(req.query.limit, 10) || 20;
    const offset = (pageNum - 1) * limitNum;
    const search = String(req.query.search || "").trim();

    const whereSearch = search
      ? `AND (
           su.full_name ILIKE $2
           OR COALESCE(s.nis, '') ILIKE $2
           OR COALESCE(pu.full_name, '') ILIKE $2
           OR COALESCE(up.email, '') ILIKE $2
         )`
      : "";

    const params = search
      ? [homebaseId, `%${search}%`, limitNum, offset]
      : [homebaseId, limitNum, offset];
    const countParams = search ? [homebaseId, `%${search}%`] : [homebaseId];

    const activePeriode = await getActivePeriode(pool, homebaseId);

    const dataQuery = `
      SELECT
        s.user_id AS student_id,
        s.nis,
        su.full_name AS student_name,
        g.name AS grade_name,
        c.name AS class_name,
        ups.parent_user_id AS parent_id,
        pu.full_name AS parent_name,
        up.email AS parent_email
      FROM u_students s
      JOIN u_users su ON su.id = s.user_id
      LEFT JOIN a_class c ON c.id = s.current_class_id
      LEFT JOIN a_grade g ON g.id = c.grade_id
      LEFT JOIN u_parent_students ups
        ON ups.student_id = s.user_id
       AND ups.homebase_id = $1
      LEFT JOIN u_users pu ON pu.id = ups.parent_user_id
      LEFT JOIN u_parents up ON up.user_id = ups.parent_user_id
      WHERE s.homebase_id = $1
      ${whereSearch}
      ORDER BY su.full_name ASC
      LIMIT $${search ? 3 : 2} OFFSET $${search ? 4 : 3}
    `;

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM u_students s
      JOIN u_users su ON su.id = s.user_id
      LEFT JOIN u_parent_students ups
        ON ups.student_id = s.user_id
       AND ups.homebase_id = $1
      LEFT JOIN u_users pu ON pu.id = ups.parent_user_id
      LEFT JOIN u_parents up ON up.user_id = ups.parent_user_id
      WHERE s.homebase_id = $1
      ${whereSearch}
    `;

    const [dataRes, countRes] = await Promise.all([
      pool.query(dataQuery, params),
      pool.query(countQuery, countParams),
    ]);

    const totalData = parseInt(countRes.rows[0]?.total || 0, 10);

    res.json({
      status: "success",
      data: dataRes.rows,
      totalData,
      totalPages: Math.ceil(totalData / limitNum),
      page: pageNum,
      limit: limitNum,
      active_periode: activePeriode,
    });
  }),
);

router.get(
  "/parents/:id",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(pool);
    await syncLegacyParentLinks(pool, homebaseId);

    const parentId = parseParentId(req.params.id);
    if (!parentId) {
      return res.status(400).json({
        status: "error",
        message: "ID orang tua tidak valid.",
      });
    }

    const parentRes = await pool.query(
      `SELECT
         u.id,
         u.username,
         u.full_name,
         u.is_active,
         up.phone,
         up.email,
         COALESCE(children.students, '[]'::json) AS students
       FROM u_users u
       LEFT JOIN u_parents up ON up.user_id = u.id
       LEFT JOIN LATERAL (
         SELECT
           json_agg(
             json_build_object(
               'student_id', s.user_id,
               'nis', s.nis,
               'full_name', su.full_name,
               'class_name', c.name
             )
             ORDER BY su.full_name ASC
           ) AS students
         FROM u_parent_students ups
         JOIN u_students s ON s.user_id = ups.student_id
         JOIN u_users su ON su.id = s.user_id
         LEFT JOIN a_class c ON c.id = s.current_class_id
         WHERE ups.parent_user_id = u.id
           AND ups.homebase_id = $2
       ) children ON true
       WHERE u.id = $1
         AND u.role = 'parent'
         AND EXISTS (
           SELECT 1
           FROM u_parent_students ups
           WHERE ups.parent_user_id = u.id
             AND ups.homebase_id = $2
         )
       LIMIT 1`,
      [parentId, homebaseId],
    );

    if (parentRes.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Data orang tua tidak ditemukan.",
      });
    }

    res.json({
      status: "success",
      data: parentRes.rows[0],
    });
  }),
);

router.post(
  "/parents",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(client);
    await syncLegacyParentLinks(client, homebaseId);

    const {
      username,
      password,
      full_name,
      phone,
      email,
      is_active = true,
      nis_list,
    } = req.body;

    const nisList = normalizeNisList(nis_list);

    if (!username || !full_name || !password) {
      return res.status(400).json({
        status: "error",
        message: "username, password, dan full_name wajib diisi.",
      });
    }

    if (nisList.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Minimal 1 NIS siswa wajib dipilih.",
      });
    }

    const activePeriode = await getActivePeriode(client, homebaseId);
    if (!activePeriode?.id) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const existingUser = await client.query(
      "SELECT id FROM u_users WHERE username = $1",
      [String(username).trim()],
    );
    if (existingUser.rowCount > 0) {
      return res.status(400).json({
        status: "error",
        message: "Username sudah digunakan.",
      });
    }

    const { rows: students, missingNis } = await resolveStudentsByNis(
      client,
      homebaseId,
      nisList,
      activePeriode.id,
    );

    if (missingNis.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `NIS tidak ditemukan pada periode aktif: ${missingNis.join(", ")}`,
      });
    }

    const studentIds = students.map((row) => row.student_id);
    const conflictRes = await client.query(
      `SELECT s.nis, pu.full_name AS parent_name
       FROM u_parent_students ups
       JOIN u_students s ON s.user_id = ups.student_id
       JOIN u_users pu ON pu.id = ups.parent_user_id
       WHERE ups.student_id = ANY($1::int[])
         AND ups.homebase_id = $2`,
      [studentIds, homebaseId],
    );

    if (conflictRes.rowCount > 0) {
      const details = conflictRes.rows
        .map((row) => `${row.nis} (milik ${row.parent_name})`)
        .join(", ");
      return res.status(400).json({
        status: "error",
        message: `Siswa sudah terhubung ke orang tua lain: ${details}`,
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(String(password), salt);

    const userRes = await client.query(
      `INSERT INTO u_users (username, password, full_name, role, is_active)
       VALUES ($1, $2, $3, 'parent', $4)
       RETURNING id`,
      [String(username).trim(), hashedPassword, String(full_name).trim(), !!is_active],
    );
    const parentUserId = userRes.rows[0].id;

    await client.query(
      `INSERT INTO u_parents (user_id, student_id, phone, email)
       VALUES ($1, $2, $3, $4)`,
      [
        parentUserId,
        students[0].student_id,
        phone ? String(phone).trim() : null,
        email ? String(email).trim() : null,
      ],
    );

    for (const student of students) {
      await client.query(
        `INSERT INTO u_parent_students (parent_user_id, student_id, homebase_id)
         VALUES ($1, $2, $3)`,
        [parentUserId, student.student_id, homebaseId],
      );
    }

    res.status(201).json({
      status: "success",
      message: "Orang tua berhasil ditambahkan.",
    });
  }),
);

router.put(
  "/parents/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(client);
    await syncLegacyParentLinks(client, homebaseId);

    const parentId = parseParentId(req.params.id);
    if (!parentId) {
      return res.status(400).json({
        status: "error",
        message: "ID orang tua tidak valid.",
      });
    }
    const {
      username,
      password,
      full_name,
      phone,
      email,
      is_active,
      nis_list,
    } = req.body;

    if (!username || !full_name) {
      return res.status(400).json({
        status: "error",
        message: "username dan full_name wajib diisi.",
      });
    }

    const ownerCheck = await client.query(
      `SELECT 1
       FROM u_users u
       WHERE u.id = $1
         AND u.role = 'parent'
         AND EXISTS (
           SELECT 1
           FROM u_parent_students ups
           WHERE ups.parent_user_id = u.id
             AND ups.homebase_id = $2
         )`,
      [parentId, homebaseId],
    );
    if (ownerCheck.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Data orang tua tidak ditemukan.",
      });
    }

    const userExists = await client.query(
      "SELECT id FROM u_users WHERE username = $1 AND id <> $2",
      [String(username).trim(), parentId],
    );
    if (userExists.rowCount > 0) {
      return res.status(400).json({
        status: "error",
        message: "Username sudah digunakan.",
      });
    }

    const nisList = normalizeNisList(nis_list);
    if (nisList.length === 0) {
      return res.status(400).json({
        status: "error",
        message: "Minimal 1 NIS siswa wajib dipilih.",
      });
    }

    const activePeriode = await getActivePeriode(client, homebaseId);
    if (!activePeriode?.id) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif tidak ditemukan.",
      });
    }

    const { rows: students, missingNis } = await resolveStudentsByNis(
      client,
      homebaseId,
      nisList,
      activePeriode.id,
    );

    if (missingNis.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `NIS tidak ditemukan pada periode aktif: ${missingNis.join(", ")}`,
      });
    }

    const studentIds = students.map((row) => row.student_id);
    const conflictRes = await client.query(
      `SELECT s.nis, pu.full_name AS parent_name
       FROM u_parent_students ups
       JOIN u_students s ON s.user_id = ups.student_id
       JOIN u_users pu ON pu.id = ups.parent_user_id
       WHERE ups.student_id = ANY($1::int[])
         AND ups.parent_user_id <> $2
         AND ups.homebase_id = $3`,
      [studentIds, parentId, homebaseId],
    );

    if (conflictRes.rowCount > 0) {
      const details = conflictRes.rows
        .map((row) => `${row.nis} (milik ${row.parent_name})`)
        .join(", ");
      return res.status(400).json({
        status: "error",
        message: `Siswa sudah terhubung ke orang tua lain: ${details}`,
      });
    }

    if (password && String(password).trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(String(password), salt);
      await client.query(
        `UPDATE u_users
         SET username = $1, full_name = $2, password = $3, is_active = $4
         WHERE id = $5`,
        [
          String(username).trim(),
          String(full_name).trim(),
          hashedPassword,
          typeof is_active === "boolean" ? is_active : true,
          parentId,
        ],
      );
    } else {
      await client.query(
        `UPDATE u_users
         SET username = $1, full_name = $2, is_active = $3
         WHERE id = $4`,
        [
          String(username).trim(),
          String(full_name).trim(),
          typeof is_active === "boolean" ? is_active : true,
          parentId,
        ],
      );
    }

    await client.query(
      `INSERT INTO u_parents (user_id, student_id, phone, email)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id)
       DO UPDATE SET student_id = EXCLUDED.student_id, phone = EXCLUDED.phone, email = EXCLUDED.email`,
      [
        parentId,
        students[0].student_id,
        phone ? String(phone).trim() : null,
        email ? String(email).trim() : null,
      ],
    );

    await client.query(
      `DELETE FROM u_parent_students
       WHERE parent_user_id = $1 AND homebase_id = $2`,
      [parentId, homebaseId],
    );

    for (const student of students) {
      await client.query(
        `INSERT INTO u_parent_students (parent_user_id, student_id, homebase_id)
         VALUES ($1, $2, $3)`,
        [parentId, student.student_id, homebaseId],
      );
    }

    res.json({
      status: "success",
      message: "Orang tua berhasil diperbarui.",
    });
  }),
);

router.delete(
  "/parents/:id",
  authorize("satuan"),
  withTransaction(async (req, res, client) => {
    const homebaseId = req.user.homebase_id;
    await ensureParentStudentTable(client);
    await syncLegacyParentLinks(client, homebaseId);

    const parentId = parseParentId(req.params.id);
    if (!parentId) {
      return res.status(400).json({
        status: "error",
        message: "ID orang tua tidak valid.",
      });
    }

    const check = await client.query(
      `SELECT 1
       FROM u_users u
       WHERE u.id = $1
         AND u.role = 'parent'
         AND EXISTS (
           SELECT 1
           FROM u_parent_students ups
           WHERE ups.parent_user_id = u.id
             AND ups.homebase_id = $2
         )`,
      [parentId, homebaseId],
    );

    if (check.rowCount === 0) {
      return res.status(404).json({
        status: "error",
        message: "Data orang tua tidak ditemukan.",
      });
    }

    await client.query("DELETE FROM u_users WHERE id = $1", [parentId]);

    res.json({
      status: "success",
      message: "Orang tua berhasil dihapus.",
    });
  }),
);

export default router;
