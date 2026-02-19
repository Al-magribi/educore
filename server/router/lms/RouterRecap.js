import { Router } from "express";
import { withQuery } from "../../utils/wrapper.js";
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

const monthNameToNumber = (monthName) => {
  if (!monthName) return null;
  const normalized = String(monthName).trim().toLowerCase();
  const index = MONTH_NAMES.findIndex(
    (item) => item.toLowerCase() === normalized,
  );
  return index >= 0 ? index + 1 : null;
};

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

const parseTypeSubchapterNumber = (type) => {
  if (!type) return null;
  const match = String(type).match(/S(\d+)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isInteger(value) ? value : null;
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

const getClassHomebaseId = async (pool, classId) => {
  const result = await pool.query(
    `SELECT homebase_id
     FROM a_class
     WHERE id = $1
     LIMIT 1`,
    [classId],
  );
  return result.rows[0]?.homebase_id || null;
};

const parseClassIds = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isInteger(item));
  }
  if (!value || typeof value !== "string") return [];
  return value
    .replace(/[{}]/g, "")
    .split(",")
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item));
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

router.get(
  "/recap/student-subject-report",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const { id: userId, homebase_id } = req.user;
    const { subject_id, class_id, semester, month } = req.query;

    if (!subject_id || !semester || !month) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, semester, dan month wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    const monthNumber = Number(month);
    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
      });
    }
    if (!Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 12) {
      return res.status(400).json({
        status: "error",
        message: "month harus 1-12.",
      });
    }
    if (!SEMESTER_MONTHS[semesterValue].includes(monthNumber)) {
      return res.status(400).json({
        status: "error",
        message: "month tidak sesuai dengan semester yang dipilih.",
      });
    }

    const studentResult = await pool.query(
      `SELECT
         st.user_id AS student_id,
         st.nis,
         st.current_class_id,
         u.full_name
       FROM u_students st
       JOIN u_users u ON u.id = st.user_id
       WHERE st.user_id = $1
       LIMIT 1`,
      [userId],
    );

    const student = studentResult.rows[0];
    if (!student) {
      return res.status(404).json({
        status: "error",
        message: "Data siswa tidak ditemukan.",
      });
    }

    const effectiveClassId = Number(class_id || student.current_class_id || 0) || null;
    if (!effectiveClassId) {
      return res.status(400).json({
        status: "error",
        message: "class_id tidak ditemukan untuk siswa ini.",
      });
    }

    const classHomebaseId = await getClassHomebaseId(pool, effectiveClassId);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }

    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
      });
    }

    const activePeriode = await ensureActivePeriode(
      pool,
      homebase_id || classHomebaseId,
    );
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const academicYears = toAcademicYears(activePeriode.name);
    const availableSemesterFilters = [
      {
        semester: 1,
        year: academicYears.startYear,
        months: SEMESTER_MONTHS[1],
      },
      {
        semester: 2,
        year: academicYears.endYear,
        months: SEMESTER_MONTHS[2],
      },
    ];
    const selectedSemesterFilter = availableSemesterFilters.find(
      (item) => Number(item.semester) === semesterValue,
    );
    if (!selectedSemesterFilter || !selectedSemesterFilter.months.includes(monthNumber)) {
      return res.status(400).json({
        status: "error",
        message: "Filter semester/bulan tidak valid pada periode aktif ini.",
      });
    }

    const enrollmentCheck = await pool.query(
      `SELECT 1
       FROM u_class_enrollments
       WHERE student_id = $1
         AND class_id = $2
         AND periode_id = $3
       LIMIT 1`,
      [userId, effectiveClassId, activePeriode.id],
    );
    if (enrollmentCheck.rowCount === 0) {
      return res.status(403).json({
        status: "error",
        message: "Siswa tidak terdaftar pada kelas aktif ini.",
      });
    }

    const subjectAccess = await pool.query(
      `SELECT
         s.id,
         s.name,
         c.name AS class_name
       FROM a_subject s
       JOIN at_subject ats ON ats.subject_id = s.id
       JOIN a_class c ON c.id = ats.class_id
       WHERE s.id = $1
         AND ats.class_id = $2
       LIMIT 1`,
      [subject_id, effectiveClassId],
    );
    if (subjectAccess.rowCount === 0) {
      return res.status(403).json({
        status: "error",
        message: "Mapel tidak terdaftar pada kelas ini.",
      });
    }

    const teacherAssignmentResult = await pool.query(
      `SELECT DISTINCT teacher_id
       FROM at_subject
       WHERE subject_id = $1
         AND class_id = $2
         AND teacher_id IS NOT NULL`,
      [subject_id, effectiveClassId],
    );
    const teacherIds = toUniqueSortedIds(
      teacherAssignmentResult.rows.map((row) => row.teacher_id),
    );

    const teacherNamesResult = teacherIds.length
      ? await pool.query(
          `SELECT id, full_name
           FROM u_users
           WHERE id = ANY($1::int[])
           ORDER BY full_name ASC`,
          [teacherIds],
        )
      : { rows: [] };

    const monthName = MONTH_NAMES[monthNumber - 1];
    const reportYear = Number(selectedSemesterFilter.year);
    const nextDate = new Date(Date.UTC(reportYear, monthNumber, 1));
    const fromDate = `${reportYear}-${String(monthNumber).padStart(2, "0")}-01`;
    const toDate = `${nextDate.getUTCFullYear()}-${String(nextDate.getUTCMonth() + 1).padStart(2, "0")}-01`;

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
         AND a.periode_id = $4
         AND a.date >= $5::date
         AND a.date < $6::date
         AND EXTRACT(MONTH FROM a.date) = $7
         AND EXTRACT(YEAR FROM a.date) = $8
         ${attendanceFilterClause}
       ORDER BY a.date ASC`,
      [
        userId,
        subject_id,
        effectiveClassId,
        activePeriode.id,
        fromDate,
        toDate,
        monthNumber,
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
        userId,
        subject_id,
        effectiveClassId,
        activePeriode.id,
        semesterValue,
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
        userId,
        subject_id,
        effectiveClassId,
        activePeriode.id,
        semesterValue,
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
        userId,
        subject_id,
        effectiveClassId,
        activePeriode.id,
        monthName,
        semesterValue,
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

    return res.json({
      status: "success",
      data: {
        meta: {
          student_id: Number(userId),
          student_name: student.full_name || "-",
          nis: student.nis || "-",
          subject_id: Number(subject_id),
          subject_name: subjectAccess.rows[0]?.name || "-",
          class_id: Number(effectiveClassId),
          class_name: subjectAccess.rows[0]?.class_name || "-",
          periode_id: activePeriode.id,
          periode_name: activePeriode.name,
          semester: semesterValue,
          month: monthNumber,
          month_name: monthName,
          year: reportYear,
          available_filters: availableSemesterFilters.map((item) => ({
            semester: item.semester,
            year: item.year,
            months: item.months.map((monthItem) => ({
              month: monthItem,
              month_name: MONTH_NAMES[monthItem - 1],
            })),
          })),
        },
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
        teachers: teacherNamesResult.rows.map((item) => ({
          id: Number(item.id),
          full_name: item.full_name,
        })),
      },
    });
  }),
);

router.get(
  "/recap/teachers",
  authorize("satuan", "teacher", "admin"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id } = req.query;
    let classHomebaseId = null;

    if (!subject_id) {
      return res.status(400).json({
        status: "error",
        message: "subject_id wajib diisi.",
      });
    }

    if (class_id) {
      classHomebaseId = await getClassHomebaseId(pool, class_id);
      if (!classHomebaseId) {
        return res.status(404).json({
          status: "error",
          message: "Kelas tidak ditemukan.",
        });
      }

      if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
        return res.status(403).json({
          status: "error",
          message: "Kelas tidak berada di homebase yang sama.",
        });
      }
    }

    const activePeriode = await ensureActivePeriode(
      pool,
      classHomebaseId || homebase_id,
    );
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    if (role === "teacher") {
      const teacherAccessSql = class_id
        ? `SELECT 1
           FROM at_subject
           WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3
           LIMIT 1`
        : `SELECT 1
           FROM at_subject
           WHERE teacher_id = $1 AND subject_id = $2
           LIMIT 1`;
      const teacherAccessParams = class_id
        ? [userId, subject_id, class_id]
        : [userId, subject_id];
      const accessCheck = await pool.query(
        teacherAccessSql,
        teacherAccessParams,
      );
      if (accessCheck.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      const teacherResult = await pool.query(
        `SELECT id, full_name
         FROM u_users
         WHERE id = $1
         LIMIT 1`,
        [userId],
      );

      return res.json({
        status: "success",
        data: teacherResult.rows,
      });
    }

    const subjectCheck = await pool.query(
      `SELECT 1
       FROM a_subject
       WHERE id = $1 AND homebase_id = $2
       LIMIT 1`,
      [subject_id, homebase_id],
    );
    if (subjectCheck.rowCount === 0) {
      return res.status(403).json({ status: "error", message: "Forbidden" });
    }

    const classFilterQuery = class_id ? "AND ats.class_id = $2" : "";
    const classFilterParams = class_id ? [class_id] : [];

    const teachersResult = await pool.query(
      `SELECT DISTINCT
         u.id,
         u.full_name
       FROM at_subject ats
       JOIN u_users u ON u.id = ats.teacher_id
       JOIN a_class c ON c.id = ats.class_id
       WHERE ats.subject_id = $1
         ${classFilterQuery}
         AND c.homebase_id = $${class_id ? 3 : 2}
       ORDER BY u.full_name ASC`,
      [subject_id, ...classFilterParams, homebase_id],
    );

    return res.json({
      status: "success",
      data: teachersResult.rows,
    });
  }),
);

router.get(
  "/recap/learning-summary",
  authorize("satuan", "teacher", "admin"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, teacher_id, class_id } = req.query;
    let classHomebaseId = null;

    if (!subject_id) {
      return res.status(400).json({
        status: "error",
        message: "subject_id wajib diisi.",
      });
    }

    if (class_id) {
      classHomebaseId = await getClassHomebaseId(pool, class_id);
      if (!classHomebaseId) {
        return res.status(404).json({
          status: "error",
          message: "Kelas tidak ditemukan.",
        });
      }
      if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
        return res.status(403).json({
          status: "error",
          message: "Kelas tidak berada di homebase yang sama.",
        });
      }
    }

    const activePeriode = await ensureActivePeriode(
      pool,
      classHomebaseId || homebase_id,
    );
    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const requestedTeacherId = Number(teacher_id || 0) || null;
    const effectiveTeacherId = role === "teacher" ? userId : requestedTeacherId;

    if (role === "teacher") {
      const teacherAccessSql = class_id
        ? `SELECT 1
           FROM at_subject
           WHERE teacher_id = $1 AND subject_id = $2 AND class_id = $3
           LIMIT 1`
        : `SELECT 1
           FROM at_subject
           WHERE teacher_id = $1 AND subject_id = $2
           LIMIT 1`;
      const teacherAccessParams = class_id
        ? [userId, subject_id, class_id]
        : [userId, subject_id];
      const teacherAccess = await pool.query(teacherAccessSql, teacherAccessParams);
      if (teacherAccess.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }
    } else {
      const subjectCheck = await pool.query(
        `SELECT id, name
         FROM a_subject
         WHERE id = $1 AND homebase_id = $2
         LIMIT 1`,
        [subject_id, homebase_id],
      );
      if (subjectCheck.rowCount === 0) {
        return res.status(403).json({ status: "error", message: "Forbidden" });
      }

      if (effectiveTeacherId) {
        const teacherFilterSql = class_id
          ? `SELECT 1
             FROM at_subject ats
             JOIN a_class c ON c.id = ats.class_id
             WHERE ats.teacher_id = $1
               AND ats.subject_id = $2
               AND ats.class_id = $3
               AND c.homebase_id = $4
             LIMIT 1`
          : `SELECT 1
             FROM at_subject ats
             JOIN a_class c ON c.id = ats.class_id
             WHERE ats.teacher_id = $1
               AND ats.subject_id = $2
               AND c.homebase_id = $3
             LIMIT 1`;
        const teacherFilterParams = class_id
          ? [effectiveTeacherId, subject_id, class_id, homebase_id]
          : [effectiveTeacherId, subject_id, homebase_id];
        const teacherAccess = await pool.query(
          teacherFilterSql,
          teacherFilterParams,
        );
        if (teacherAccess.rowCount === 0) {
          return res.status(403).json({
            status: "error",
            message: "Guru tidak mengampu mapel ini pada filter yang dipilih.",
          });
        }
      }
    }

    const subjectMetaResult = await pool.query(
      `SELECT id, name
       FROM a_subject
       WHERE id = $1
       LIMIT 1`,
      [subject_id],
    );
    const subjectMeta = subjectMetaResult.rows[0] || null;
    if (!subjectMeta) {
      return res.status(404).json({
        status: "error",
        message: "Mata pelajaran tidak ditemukan.",
      });
    }

    const assignmentFilter = [];
    const assignmentParams = [subject_id, homebase_id];
    let assignmentParamIndex = assignmentParams.length + 1;

    if (effectiveTeacherId) {
      assignmentFilter.push(`AND ats.teacher_id = $${assignmentParamIndex}`);
      assignmentParams.push(effectiveTeacherId);
      assignmentParamIndex += 1;
    }
    if (class_id) {
      assignmentFilter.push(`AND ats.class_id = $${assignmentParamIndex}`);
      assignmentParams.push(class_id);
    }

    const assignmentResult = await pool.query(
      `SELECT
         ats.teacher_id,
         u.full_name AS teacher_name,
         ats.class_id,
         c.name AS class_name
       FROM at_subject ats
       JOIN u_users u ON u.id = ats.teacher_id
       JOIN a_class c ON c.id = ats.class_id
       WHERE ats.subject_id = $1
         AND c.homebase_id = $2
         ${assignmentFilter.join("\n")}
       ORDER BY u.full_name ASC, c.name ASC`,
      assignmentParams,
    );

    const chapterFilter = [];
    const chapterParams = [subject_id];
    let chapterParamIndex = 2;
    if (class_id) {
      chapterFilter.push(
        `AND (
          ch.class_id = $${chapterParamIndex}
          OR ($${chapterParamIndex}::int = ANY(ch.class_ids))
          OR (ch.class_id IS NULL AND ch.class_ids IS NULL)
        )`,
      );
      chapterParams.push(class_id);
    }

    const chapterResult = await pool.query(
      `SELECT
         ch.id,
         ch.title,
         ch.description,
         ch.order_number,
         ch.class_id,
         ch.class_ids
       FROM l_chapter ch
       WHERE ch.subject_id = $1
         ${chapterFilter.join("\n")}
       ORDER BY COALESCE(ch.order_number, 9999), ch.title ASC`,
      chapterParams,
    );

    const chapterIds = chapterResult.rows.map((row) => Number(row.id)).filter(Boolean);
    const contentResult =
      chapterIds.length > 0
        ? await pool.query(
            `SELECT
               c.id,
               c.chapter_id,
               c.title,
               c.order_number
             FROM l_content c
             WHERE c.chapter_id = ANY($1::int[])
             ORDER BY COALESCE(c.order_number, 9999), c.created_at ASC`,
            [chapterIds],
          )
        : { rows: [] };

    const assignmentRows = assignmentResult.rows.map((row) => ({
      teacher_id: Number(row.teacher_id),
      teacher_name: row.teacher_name,
      class_id: Number(row.class_id),
      class_name: row.class_name,
    }));

    const allAssignedClassIds = toUniqueSortedIds(
      assignmentRows.map((row) => row.class_id),
    );

    const classNameById = new Map();
    for (const row of assignmentRows) {
      classNameById.set(Number(row.class_id), row.class_name);
    }

    const chapterReferencedClassIds = toUniqueSortedIds(
      chapterResult.rows.flatMap((chapter) => [
        ...parseClassIds(chapter.class_ids),
        ...(chapter.class_id ? [chapter.class_id] : []),
      ]),
    );
    const classLookupIds = toUniqueSortedIds([
      ...allAssignedClassIds,
      ...chapterReferencedClassIds,
      ...(class_id ? [class_id] : []),
    ]);
    if (classLookupIds.length) {
      const classLookupResult = await pool.query(
        `SELECT id, name
         FROM a_class
         WHERE id = ANY($1::int[])
           AND homebase_id = $2`,
        [classLookupIds, homebase_id],
      );
      for (const row of classLookupResult.rows) {
        classNameById.set(Number(row.id), row.name);
      }
    }

    const teachersByClassId = new Map();
    for (const row of assignmentRows) {
      const classKey = Number(row.class_id);
      if (!teachersByClassId.has(classKey)) {
        teachersByClassId.set(classKey, []);
      }
      const list = teachersByClassId.get(classKey);
      if (!list.some((item) => Number(item.id) === Number(row.teacher_id))) {
        list.push({ id: row.teacher_id, full_name: row.teacher_name });
      }
    }

    const contentByChapter = new Map();
    for (const row of contentResult.rows) {
      const chapterKey = String(row.chapter_id);
      if (!contentByChapter.has(chapterKey)) {
        contentByChapter.set(chapterKey, []);
      }
      contentByChapter.get(chapterKey).push({
        id: row.id,
        title: row.title,
        order_number: row.order_number,
      });
    }

    const items = [];

    for (const chapter of chapterResult.rows) {
      const chapterClassIds = toUniqueSortedIds([
        ...parseClassIds(chapter.class_ids),
        ...(chapter.class_id ? [chapter.class_id] : []),
      ]);
      const effectiveChapterClassIds = chapterClassIds.length
        ? chapterClassIds
        : allAssignedClassIds;
      const chapterContents = contentByChapter.get(String(chapter.id)) || [];

      if (!effectiveChapterClassIds.length) {
        items.push({
          key: `chapter-${chapter.id}-class-none`,
          chapter_id: chapter.id,
          chapter_title: chapter.title,
          chapter_description: chapter.description,
          chapter_order: chapter.order_number,
          class_id: null,
          class_name: "-",
          teachers: [],
          subchapters: chapterContents,
          total_subchapters: chapterContents.length,
        });
        continue;
      }

      for (const chapterClassId of effectiveChapterClassIds) {
        const classTeachers = teachersByClassId.get(Number(chapterClassId)) || [];
        if (effectiveTeacherId && !classTeachers.length) continue;

        items.push({
          key: `chapter-${chapter.id}-class-${chapterClassId}`,
          chapter_id: chapter.id,
          chapter_title: chapter.title,
          chapter_description: chapter.description,
          chapter_order: chapter.order_number,
          class_id: Number(chapterClassId),
          class_name: classNameById.get(Number(chapterClassId)) || "-",
          teachers: classTeachers,
          subchapters: chapterContents,
          total_subchapters: chapterContents.length,
        });
      }
    }

    const totalSubchapters = contentResult.rows.length;

    return res.json({
      status: "success",
      data: {
        meta: {
          subject_id: Number(subject_id),
          subject_name: subjectMeta.name,
          teacher_id: effectiveTeacherId,
          class_id: class_id ? Number(class_id) : null,
          total_rows: items.length,
          total_chapters: chapterResult.rows.length,
          total_subchapters: totalSubchapters,
          periode_id: activePeriode?.id || null,
          periode_name: activePeriode?.name || null,
        },
        teachers: Array.from(
          new Map(
            assignmentRows.map((item) => [
              Number(item.teacher_id),
              { id: Number(item.teacher_id), full_name: item.teacher_name },
            ]),
          ).values(),
        ),
        items,
      },
    });
  }),
);

router.get(
  "/recap/attendance",
  authorize("satuan", "teacher", "admin"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, semester, teacher_id } = req.query;

    if (!subject_id || !class_id || !semester) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan semester wajib diisi.",
      });
    }

    const semesterValue = Number(semester);

    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
      });
    }

    const classHomebaseId = await getClassHomebaseId(pool, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }

    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
      });
    }

    const effectiveTeacherId =
      role === "teacher" ? userId : Number(teacher_id || 0) || null;

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

      if (effectiveTeacherId) {
        const teacherAccessCheck = await pool.query(
          `SELECT 1
           FROM at_subject
           WHERE teacher_id = $1
             AND subject_id = $2
             AND class_id = $3
           LIMIT 1`,
          [effectiveTeacherId, subject_id, class_id],
        );
        if (teacherAccessCheck.rowCount === 0) {
          return res.status(403).json({
            status: "error",
            message: "Guru tidak mengampu kombinasi mapel dan kelas ini.",
          });
        }
      }
    }

    const activePeriode = await ensureActivePeriode(
      pool,
      classHomebaseId || homebase_id,
    );

    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const academicYears = toAcademicYears(activePeriode.name);
    const semesterMonths = SEMESTER_MONTHS[semesterValue];
    const semesterStartYear =
      semesterValue === 1 ? academicYears.startYear : academicYears.endYear;
    const fromDate = `${semesterStartYear}-${String(semesterMonths[0]).padStart(2, "0")}-01`;
    const toDate =
      semesterValue === 1
        ? `${academicYears.endYear}-01-01`
        : `${academicYears.endYear}-07-01`;

    const classSubjectMeta = await pool.query(
      `SELECT
         c.name AS class_name,
         s.name AS subject_name
       FROM a_class c
       JOIN a_subject s ON s.id = $1
       WHERE c.id = $2
       LIMIT 1`,
      [subject_id, class_id],
    );

    const studentsResult = await pool.query(
      `SELECT
         u.id AS student_id,
         u.full_name,
         st.nis
       FROM u_class_enrollments e
       JOIN u_users u ON e.student_id = u.id
       JOIN u_students st ON st.user_id = e.student_id
       WHERE e.class_id = $1
         AND e.periode_id = $2
       ORDER BY u.full_name ASC`,
      [class_id, activePeriode.id],
    );

    const attendanceTeacherFilter = effectiveTeacherId
      ? "AND (a.teacher_id = $6 OR a.teacher_id IS NULL)"
      : "";
    const teacherAttendanceParams = effectiveTeacherId ? [effectiveTeacherId] : [];

    const attendanceResult = await pool.query(
      `SELECT
         a.student_id,
         TO_CHAR(a.date::date, 'YYYY-MM-DD') AS attendance_date,
         a.status
       FROM l_attendance a
       WHERE a.class_id = $1
         AND a.subject_id = $2
         AND a.date >= $3::date
         AND a.date < $4::date
         AND a.periode_id = $5
         ${attendanceTeacherFilter}
       ORDER BY a.date ASC`,
      [
        class_id,
        subject_id,
        fromDate,
        toDate,
        activePeriode.id,
        ...teacherAttendanceParams,
      ],
    );

    let teacherName = null;
    if (effectiveTeacherId) {
      const teacherResult = await pool.query(
        `SELECT full_name FROM u_users WHERE id = $1 LIMIT 1`,
        [effectiveTeacherId],
      );
      teacherName = teacherResult.rows[0]?.full_name || null;
    }

    const uniqueDays = Array.from(
      new Set(
        attendanceResult.rows.map((row) => String(row.attendance_date)),
      ),
    ).sort();

    const attendanceMap = new Map();
    for (const row of attendanceResult.rows) {
      const studentKey = String(row.student_id);
      const dateKey = String(row.attendance_date);
      if (!attendanceMap.has(studentKey)) {
        attendanceMap.set(studentKey, new Map());
      }
      attendanceMap.get(studentKey).set(dateKey, normalizeStatus(row.status));
    }

    const students = studentsResult.rows.map((student) => {
      const studentKey = String(student.student_id);
      const dayMap = attendanceMap.get(studentKey) || new Map();

      const daily = {};
      let hadir = 0;
      let sakit = 0;
      let izin = 0;
      let alpa = 0;

      for (const dateKey of uniqueDays) {
        const status = dayMap.get(dateKey) || null;
        const normalized = normalizeStatus(status);
        const code = toStatusCode(normalized);
        daily[dateKey] = code;

        if (normalized === "Hadir" || normalized === "Telat") hadir += 1;
        if (normalized === "Sakit") sakit += 1;
        if (normalized === "Izin") izin += 1;
        if (normalized === "Alpa") alpa += 1;
      }

      const meetingCount = uniqueDays.length;
      const percent = {
        hadir: meetingCount ? Math.round((hadir / meetingCount) * 100) : 0,
        sakit: meetingCount ? Math.round((sakit / meetingCount) * 100) : 0,
        izin: meetingCount ? Math.round((izin / meetingCount) * 100) : 0,
        alpa: meetingCount ? Math.round((alpa / meetingCount) * 100) : 0,
      };

      return {
        student_id: student.student_id,
        nis: student.nis,
        full_name: student.full_name,
        daily,
        summary: { hadir, sakit, izin, alpa },
        percent,
      };
    });

    const days = uniqueDays.map((dateStr) => {
      const [yearPart, monthPart, dayPart] = String(dateStr).split("-");
      const dayNumber = Number(dayPart || 0);
      const monthNumber = Number(monthPart || 0);
      return {
        key: dateStr,
        date: dateStr,
        year: Number(yearPart || 0),
        month: monthNumber,
        month_name: MONTH_NAMES[monthNumber - 1] || "-",
        day: dayNumber,
      };
    });

    return res.json({
      status: "success",
      data: {
        meta: {
          subject_id: Number(subject_id),
          class_id: Number(class_id),
          class_name: classSubjectMeta.rows[0]?.class_name || "-",
          subject_name: classSubjectMeta.rows[0]?.subject_name || "-",
          periode_id: activePeriode.id,
          periode_name: activePeriode.name,
          semester: semesterValue,
          semester_start_year: semesterStartYear,
          semester_end_year: academicYears.endYear,
          months: semesterMonths.map((monthNumber) => ({
            month: monthNumber,
            month_name: MONTH_NAMES[monthNumber - 1],
          })),
          teacher_id: effectiveTeacherId,
          teacher_name: teacherName,
          total_students: students.length,
          total_meetings: uniqueDays.length,
        },
        days,
        students,
      },
    });
  }),
);

router.get(
  "/recap/score-monthly",
  authorize("satuan", "teacher", "admin"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, semester, teacher_id } = req.query;

    if (!subject_id || !class_id || !semester) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan semester wajib diisi.",
      });
    }

    const semesterValue = Number(semester);

    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
      });
    }

    const classHomebaseId = await getClassHomebaseId(pool, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }

    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
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

    const effectiveTeacherId =
      role === "teacher" ? userId : Number(teacher_id || 0) || null;

    const activePeriode = await ensureActivePeriode(
      pool,
      classHomebaseId || homebase_id,
    );

    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const semesterMonths = SEMESTER_MONTHS[semesterValue];

    const classSubjectMeta = await pool.query(
      `SELECT
         c.name AS class_name,
         s.name AS subject_name
       FROM a_class c
       JOIN a_subject s ON s.id = $1
       WHERE c.id = $2
       LIMIT 1`,
      [subject_id, class_id],
    );

    const studentsResult = await pool.query(
      `SELECT
         u.id AS student_id,
         u.full_name,
         st.nis
       FROM u_class_enrollments e
       JOIN u_users u ON e.student_id = u.id
       JOIN u_students st ON st.user_id = e.student_id
       WHERE e.class_id = $1
         AND e.periode_id = $2
       ORDER BY u.full_name ASC`,
      [class_id, activePeriode.id],
    );

    const teacherFilterQuery =
      role === "teacher" || effectiveTeacherId ? "AND teacher_id = $5" : "";
    const teacherFilterParams =
      role === "teacher" || effectiveTeacherId ? [effectiveTeacherId] : [];

    const formativeResult = await pool.query(
      `SELECT
         f.id,
         student_id,
         month,
         chapter_id,
         type,
         score,
         ch.title AS chapter_title
       FROM l_score_formative f
       LEFT JOIN l_chapter ch ON ch.id = f.chapter_id
       WHERE f.subject_id = $1
         AND f.class_id = $2
         AND f.periode_id = $3
         AND f.semester = $4
         ${teacherFilterQuery}
       ORDER BY f.student_id ASC, f.chapter_id ASC, f.type ASC, f.id ASC`,
      [
        subject_id,
        class_id,
        activePeriode.id,
        semesterValue,
        ...teacherFilterParams,
      ],
    );

    const studentsMap = new Map(
      studentsResult.rows.map((student) => {
        const monthScores = {};
        for (const monthNumber of semesterMonths) {
          monthScores[monthNumber] = { formative: [] };
        }
        return [
          String(student.student_id),
          {
            student_id: student.student_id,
            nis: student.nis,
            full_name: student.full_name,
            month_scores: monthScores,
            daily_average: 0,
          },
        ];
      }),
    );

    const monthEntryRegistry = new Map();

    for (const row of formativeResult.rows) {
      const student = studentsMap.get(String(row.student_id));
      if (!student) continue;
      const monthNumber = monthNameToNumber(row.month);
      if (!semesterMonths.includes(monthNumber)) continue;

      const slotKey =
        row.type && String(row.type).trim().length
          ? String(row.type).trim()
          : `c${row.chapter_id || 0}-f${row.id}`;
      const chapterTitle = row.chapter_title || `Bab ${row.chapter_id || "-"}`;

      if (!monthEntryRegistry.has(monthNumber)) {
        monthEntryRegistry.set(monthNumber, new Map());
      }
      const entryRegistryByKey = monthEntryRegistry.get(monthNumber);
      if (!entryRegistryByKey.has(slotKey)) {
        entryRegistryByKey.set(slotKey, {
          slot_key: slotKey,
          chapter_id: row.chapter_id ?? null,
          chapter_title: chapterTitle,
          type: row.type || null,
          subchapter_number: parseTypeSubchapterNumber(row.type),
        });
      }

      student.month_scores[monthNumber].formative.push(
        {
          slot_key: slotKey,
          chapter_id: row.chapter_id,
          chapter_title: chapterTitle,
          type: row.type || null,
          score:
            row.score === null || row.score === undefined
              ? null
              : Number(row.score),
        },
      );
    }

    const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

    const students = Array.from(studentsMap.values()).map((student) => {
      const validScores = [];

      for (const monthNumber of semesterMonths) {
        const monthData = student.month_scores[monthNumber];
        for (const formativeItem of monthData.formative) {
          const score = formativeItem?.score;
          if (score !== null && score !== undefined) {
            validScores.push(Number(score));
          }
        }
      }

      const dailyAverage = validScores.length
        ? round2(
            validScores.reduce((sum, value) => sum + value, 0) /
              validScores.length,
          )
        : 0;

      return {
        ...student,
        daily_average: dailyAverage,
      };
    });

    const monthMatrix = semesterMonths.map((monthNumber) => {
      const entryRegistryByKey = monthEntryRegistry.get(monthNumber);
      const entries = entryRegistryByKey
        ? Array.from(entryRegistryByKey.values())
            .sort((a, b) => {
              const chapterA = Number(a.chapter_id || 0);
              const chapterB = Number(b.chapter_id || 0);
              if (chapterA !== chapterB) return chapterA - chapterB;

              const subA =
                a.subchapter_number === null || a.subchapter_number === undefined
                  ? Number.MAX_SAFE_INTEGER
                  : Number(a.subchapter_number);
              const subB =
                b.subchapter_number === null || b.subchapter_number === undefined
                  ? Number.MAX_SAFE_INTEGER
                  : Number(b.subchapter_number);
              if (subA !== subB) return subA - subB;

              return String(a.slot_key).localeCompare(String(b.slot_key));
            })
            .map((entry, index) => ({
              index: index + 1,
              slot_key: entry.slot_key,
              chapter_id: entry.chapter_id,
              chapter_title: entry.chapter_title,
              type: entry.type,
            }))
        : [];
      const maxFormativeEntries = entries.length;

      return {
        month: monthNumber,
        month_name: MONTH_NAMES[monthNumber - 1],
        max_formative_entries: maxFormativeEntries,
        entries,
      };
    });

    const totals = students.reduce(
      (acc, item) => {
        const allFormativeCount = semesterMonths.reduce(
          (sum, monthNumber) =>
            sum + (item.month_scores[monthNumber]?.formative?.length || 0),
          0,
        );
        acc.formativeCount += allFormativeCount;
        acc.dailyAvgSum += Number(item.daily_average || 0);
        return acc;
      },
      {
        formativeCount: 0,
        dailyAvgSum: 0,
      },
    );
    const totalStudents = students.length;

    return res.json({
      status: "success",
      data: {
        meta: {
          subject_id: Number(subject_id),
          class_id: Number(class_id),
          class_name: classSubjectMeta.rows[0]?.class_name || "-",
          subject_name: classSubjectMeta.rows[0]?.subject_name || "-",
          periode_id: activePeriode.id,
          periode_name: activePeriode.name,
          semester: semesterValue,
          total_students: totalStudents,
          months: semesterMonths.map((monthNumber) => ({
            month: monthNumber,
            month_name: MONTH_NAMES[monthNumber - 1],
          })),
        },
        summary: {
          daily_average: totalStudents ? round2(totals.dailyAvgSum / totalStudents) : 0,
          formative_total_entries: totals.formativeCount,
        },
        month_matrix: monthMatrix,
        students,
      },
    });
  }),
);

router.get(
  "/recap/score-summative",
  authorize("satuan", "teacher", "admin"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, semester, teacher_id } = req.query;

    if (!subject_id || !class_id || !semester) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan semester wajib diisi.",
      });
    }

    const semesterValue = Number(semester);

    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
      });
    }

    const classHomebaseId = await getClassHomebaseId(pool, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }

    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
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

    const effectiveTeacherId =
      role === "teacher" ? userId : Number(teacher_id || 0) || null;

    const activePeriode = await ensureActivePeriode(
      pool,
      classHomebaseId || homebase_id,
    );

    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const semesterMonths = SEMESTER_MONTHS[semesterValue];

    const classSubjectMeta = await pool.query(
      `SELECT
         c.name AS class_name,
         s.name AS subject_name
       FROM a_class c
       JOIN a_subject s ON s.id = $1
       WHERE c.id = $2
       LIMIT 1`,
      [subject_id, class_id],
    );

    const studentsResult = await pool.query(
      `SELECT
         u.id AS student_id,
         u.full_name,
         st.nis
       FROM u_class_enrollments e
       JOIN u_users u ON e.student_id = u.id
       JOIN u_students st ON st.user_id = e.student_id
       WHERE e.class_id = $1
         AND e.periode_id = $2
       ORDER BY u.full_name ASC`,
      [class_id, activePeriode.id],
    );

    const teacherFilterQuery =
      role === "teacher" || effectiveTeacherId ? "AND teacher_id = $5" : "";
    const teacherFilterParams =
      role === "teacher" || effectiveTeacherId ? [effectiveTeacherId] : [];

    const summativeResult = await pool.query(
      `SELECT
         s.id,
         student_id,
         month,
         chapter_id,
         type,
         score_written,
         score_skill,
         final_score,
         ch.title AS chapter_title
       FROM l_score_summative s
       LEFT JOIN l_chapter ch ON ch.id = s.chapter_id
       WHERE s.subject_id = $1
         AND s.class_id = $2
         AND s.periode_id = $3
         AND s.semester = $4
         ${teacherFilterQuery}
       ORDER BY s.student_id ASC, s.chapter_id ASC, s.type ASC, s.id ASC`,
      [
        subject_id,
        class_id,
        activePeriode.id,
        semesterValue,
        ...teacherFilterParams,
      ],
    );

    const studentsMap = new Map(
      studentsResult.rows.map((student) => {
        const monthScores = {};
        for (const monthNumber of semesterMonths) {
          monthScores[monthNumber] = { summative: [] };
        }
        return [
          String(student.student_id),
          {
            student_id: student.student_id,
            nis: student.nis,
            full_name: student.full_name,
            month_scores: monthScores,
            final_average: 0,
          },
        ];
      }),
    );

    const monthEntryRegistry = new Map();

    for (const row of summativeResult.rows) {
      const student = studentsMap.get(String(row.student_id));
      if (!student) continue;
      const monthNumber = monthNameToNumber(row.month);
      if (!semesterMonths.includes(monthNumber)) continue;

      const slotKey =
        row.type && String(row.type).trim().length
          ? String(row.type).trim()
          : `c${row.chapter_id || 0}-s${row.id}`;
      const chapterTitle = row.chapter_title || `Bab ${row.chapter_id || "-"}`;

      if (!monthEntryRegistry.has(monthNumber)) {
        monthEntryRegistry.set(monthNumber, new Map());
      }
      const entryRegistryByKey = monthEntryRegistry.get(monthNumber);
      if (!entryRegistryByKey.has(slotKey)) {
        entryRegistryByKey.set(slotKey, {
          slot_key: slotKey,
          chapter_id: row.chapter_id ?? null,
          chapter_title: chapterTitle,
          type: row.type || null,
          subchapter_number: parseTypeSubchapterNumber(row.type),
        });
      }

      student.month_scores[monthNumber].summative.push({
        slot_key: slotKey,
        chapter_id: row.chapter_id,
        chapter_title: chapterTitle,
        type: row.type || null,
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
      });
    }

    const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

    const students = Array.from(studentsMap.values()).map((student) => {
      const combinedScores = [];

      for (const monthNumber of semesterMonths) {
        const monthData = student.month_scores[monthNumber];
        for (const scoreItem of monthData.summative) {
          if (scoreItem.score_written !== null && scoreItem.score_written !== undefined) {
            combinedScores.push(Number(scoreItem.score_written));
          }
          if (scoreItem.score_skill !== null && scoreItem.score_skill !== undefined) {
            combinedScores.push(Number(scoreItem.score_skill));
          }
        }
      }

      const finalAverage = combinedScores.length
        ? round2(
            combinedScores.reduce((sum, value) => sum + value, 0) /
              combinedScores.length,
          )
        : 0;

      return {
        ...student,
        final_average: finalAverage,
      };
    });

    const monthMatrix = semesterMonths.map((monthNumber) => {
      const entryRegistryByKey = monthEntryRegistry.get(monthNumber);
      const entries = entryRegistryByKey
        ? Array.from(entryRegistryByKey.values())
            .sort((a, b) => {
              const chapterA = Number(a.chapter_id || 0);
              const chapterB = Number(b.chapter_id || 0);
              if (chapterA !== chapterB) return chapterA - chapterB;

              const subA =
                a.subchapter_number === null || a.subchapter_number === undefined
                  ? Number.MAX_SAFE_INTEGER
                  : Number(a.subchapter_number);
              const subB =
                b.subchapter_number === null || b.subchapter_number === undefined
                  ? Number.MAX_SAFE_INTEGER
                  : Number(b.subchapter_number);
              if (subA !== subB) return subA - subB;

              return String(a.slot_key).localeCompare(String(b.slot_key));
            })
            .map((entry, index) => ({
              index: index + 1,
              slot_key: entry.slot_key,
              chapter_id: entry.chapter_id,
              chapter_title: entry.chapter_title,
              type: entry.type,
            }))
        : [];
      const maxSummativeEntries = entries.length;
      const chapterTitles = Array.from(
        new Set(entries.map((entry) => entry.chapter_title).filter(Boolean)),
      );

      return {
        month: monthNumber,
        month_name: MONTH_NAMES[monthNumber - 1],
        max_summative_entries: maxSummativeEntries,
        entries,
        chapter_titles: chapterTitles,
      };
    });

    const totals = students.reduce(
      (acc, item) => {
        const allSummativeCount = semesterMonths.reduce(
          (sum, monthNumber) =>
            sum + (item.month_scores[monthNumber]?.summative?.length || 0),
          0,
        );
        acc.summativeCount += allSummativeCount;
        acc.finalAvgSum += Number(item.final_average || 0);
        return acc;
      },
      {
        summativeCount: 0,
        finalAvgSum: 0,
      },
    );

    const totalStudents = students.length;

    return res.json({
      status: "success",
      data: {
        meta: {
          subject_id: Number(subject_id),
          class_id: Number(class_id),
          class_name: classSubjectMeta.rows[0]?.class_name || "-",
          subject_name: classSubjectMeta.rows[0]?.subject_name || "-",
          periode_id: activePeriode.id,
          periode_name: activePeriode.name,
          semester: semesterValue,
          total_students: totalStudents,
          months: semesterMonths.map((monthNumber) => ({
            month: monthNumber,
            month_name: MONTH_NAMES[monthNumber - 1],
          })),
        },
        summary: {
          final_average: totalStudents
            ? round2(totals.finalAvgSum / totalStudents)
            : 0,
          summative_total_entries: totals.summativeCount,
        },
        month_matrix: monthMatrix,
        students,
      },
    });
  }),
);

router.get(
  "/recap/final-score",
  authorize("satuan", "teacher", "admin"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, semester, teacher_id } = req.query;

    if (!subject_id || !class_id || !semester) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, dan semester wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
      });
    }

    const classHomebaseId = await getClassHomebaseId(pool, class_id);
    if (!classHomebaseId) {
      return res.status(404).json({
        status: "error",
        message: "Kelas tidak ditemukan.",
      });
    }

    if (homebase_id && Number(classHomebaseId) !== Number(homebase_id)) {
      return res.status(403).json({
        status: "error",
        message: "Kelas tidak berada di homebase yang sama.",
      });
    }

    const effectiveTeacherId =
      role === "teacher" ? userId : Number(teacher_id || 0) || null;

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

      if (effectiveTeacherId) {
        const teacherAccessCheck = await pool.query(
          `SELECT 1
           FROM at_subject
           WHERE teacher_id = $1
             AND subject_id = $2
             AND class_id = $3
           LIMIT 1`,
          [effectiveTeacherId, subject_id, class_id],
        );
        if (teacherAccessCheck.rowCount === 0) {
          return res.status(403).json({
            status: "error",
            message: "Guru tidak mengampu kombinasi mapel dan kelas ini.",
          });
        }
      }
    }

    const activePeriode = await ensureActivePeriode(
      pool,
      classHomebaseId || homebase_id,
    );

    if (!activePeriode) {
      return res.status(400).json({
        status: "error",
        message: "Periode aktif belum diatur.",
      });
    }

    const classSubjectMeta = await pool.query(
      `SELECT
         c.name AS class_name,
         s.name AS subject_name
       FROM a_class c
       JOIN a_subject s ON s.id = $1
       WHERE c.id = $2
       LIMIT 1`,
      [subject_id, class_id],
    );

    const studentsResult = await pool.query(
      `SELECT
         u.id AS student_id,
         u.full_name,
         st.nis
       FROM u_class_enrollments e
       JOIN u_users u ON e.student_id = u.id
       JOIN u_students st ON st.user_id = e.student_id
       WHERE e.class_id = $1
         AND e.periode_id = $2
       ORDER BY u.full_name ASC`,
      [class_id, activePeriode.id],
    );

    const teacherFilterQuery =
      role === "teacher" || effectiveTeacherId ? "AND f.teacher_id = $5" : "";
    const teacherFilterParams =
      role === "teacher" || effectiveTeacherId ? [effectiveTeacherId] : [];

    const finalResult = await pool.query(
      `SELECT
         f.student_id,
         f.final_grade
       FROM l_score_final f
       WHERE f.subject_id = $1
         AND f.class_id = $2
         AND f.periode_id = $3
         AND f.semester = $4
         ${teacherFilterQuery}
       ORDER BY f.student_id ASC`,
      [
        subject_id,
        class_id,
        activePeriode.id,
        semesterValue,
        ...teacherFilterParams,
      ],
    );

    const finalMap = new Map(
      finalResult.rows.map((row) => [
        String(row.student_id),
        row.final_grade === null || row.final_grade === undefined
          ? null
          : Number(row.final_grade),
      ]),
    );

    const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

    const students = studentsResult.rows.map((student) => ({
      student_id: student.student_id,
      nis: student.nis,
      full_name: student.full_name,
      final_grade: finalMap.get(String(student.student_id)) ?? null,
    }));

    const gradedValues = students
      .map((item) => item.final_grade)
      .filter((value) => value !== null && value !== undefined);

    return res.json({
      status: "success",
      data: {
        meta: {
          subject_id: Number(subject_id),
          class_id: Number(class_id),
          class_name: classSubjectMeta.rows[0]?.class_name || "-",
          subject_name: classSubjectMeta.rows[0]?.subject_name || "-",
          periode_id: activePeriode.id,
          periode_name: activePeriode.name,
          semester: semesterValue,
          total_students: students.length,
        },
        summary: {
          final_average: gradedValues.length
            ? round2(
                gradedValues.reduce((sum, value) => sum + Number(value), 0) /
                  gradedValues.length,
              )
            : 0,
          total_graded: gradedValues.length,
        },
        students,
      },
    });
  }),
);

export default router;

