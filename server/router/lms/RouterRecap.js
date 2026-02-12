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
  const lower = String(status).toLowerCase();
  if (lower === "alpha" || lower === "alpa") return "Alpa";
  if (lower === "telat") return "Telat";
  if (lower === "hadir") return "Hadir";
  if (lower === "sakit") return "Sakit";
  if (lower === "izin") return "Izin";
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

router.get(
  "/recap/attendance",
  authorize("satuan", "teacher"),
  withQuery(async (req, res, pool) => {
    const { id: userId, role, homebase_id } = req.user;
    const { subject_id, class_id, semester, month } = req.query;

    if (!subject_id || !class_id || !semester || !month) {
      return res.status(400).json({
        status: "error",
        message: "subject_id, class_id, semester, dan month wajib diisi.",
      });
    }

    const semesterValue = Number(semester);
    const monthValue = Number(month);

    if (![1, 2].includes(semesterValue)) {
      return res.status(400).json({
        status: "error",
        message: "semester harus 1 atau 2.",
      });
    }

    if (!Number.isInteger(monthValue) || monthValue < 1 || monthValue > 12) {
      return res.status(400).json({
        status: "error",
        message: "month harus angka 1-12.",
      });
    }

    if (!SEMESTER_MONTHS[semesterValue].includes(monthValue)) {
      return res.status(400).json({
        status: "error",
        message: "month tidak sesuai semester yang dipilih.",
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
    const targetYear = monthValue >= 7 ? academicYears.startYear : academicYears.endYear;

    const fromDate = `${targetYear}-${String(monthValue).padStart(2, "0")}-01`;
    const toMonth = monthValue === 12 ? 1 : monthValue + 1;
    const toYear = monthValue === 12 ? targetYear + 1 : targetYear;
    const toDate = `${toYear}-${String(toMonth).padStart(2, "0")}-01`;

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

    const attendanceResult = await pool.query(
      `SELECT
         a.student_id,
         a.date::date AS attendance_date,
         a.status
       FROM l_attendance a
       WHERE a.class_id = $1
         AND a.subject_id = $2
         AND a.date >= $3::date
         AND a.date < $4::date
       ORDER BY a.date ASC`,
      [class_id, subject_id, fromDate, toDate],
    );

    const uniqueDays = Array.from(
      new Set(
        attendanceResult.rows.map((row) =>
          new Date(row.attendance_date).toISOString().slice(0, 10),
        ),
      ),
    ).sort();

    const attendanceMap = new Map();
    for (const row of attendanceResult.rows) {
      const studentKey = String(row.student_id);
      const dateKey = new Date(row.attendance_date).toISOString().slice(0, 10);
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
      const dateObj = new Date(`${dateStr}T00:00:00`);
      const dayNumber = dateObj.getDate();
      return {
        key: dateStr,
        date: dateStr,
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
          month: monthValue,
          month_name: MONTH_NAMES[monthValue - 1],
          target_year: targetYear,
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
  authorize("satuan", "teacher"),
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
         student_id,
         month,
         chapter_id,
         type,
         score
       FROM l_score_formative
       WHERE subject_id = $1
         AND class_id = $2
         AND periode_id = $3
         AND semester = $4
         ${teacherFilterQuery}
       ORDER BY student_id ASC, chapter_id ASC, type ASC, id ASC`,
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

    for (const row of formativeResult.rows) {
      const student = studentsMap.get(String(row.student_id));
      if (!student) continue;
      const monthNumber = monthNameToNumber(row.month);
      if (!semesterMonths.includes(monthNumber)) continue;
      student.month_scores[monthNumber].formative.push(
        row.score === null || row.score === undefined ? null : Number(row.score),
      );
    }

    const round2 = (value) => Math.round(Number(value || 0) * 100) / 100;

    const students = Array.from(studentsMap.values()).map((student) => {
      const validScores = [];

      for (const monthNumber of semesterMonths) {
        const monthData = student.month_scores[monthNumber];
        for (const score of monthData.formative) {
          if (score !== null && score !== undefined && Number(score) !== 0) {
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
      const maxFormativeEntries = students.reduce((maxValue, student) => {
        const count = student.month_scores[monthNumber]?.formative?.length || 0;
        return Math.max(maxValue, count);
      }, 0);

      return {
        month: monthNumber,
        month_name: MONTH_NAMES[monthNumber - 1],
        max_formative_entries: maxFormativeEntries,
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
  authorize("satuan", "teacher"),
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
         student_id,
         month,
         chapter_id,
         type,
         score_written,
         score_skill,
         final_score
       FROM l_score_summative
       WHERE subject_id = $1
         AND class_id = $2
         AND periode_id = $3
         AND semester = $4
         ${teacherFilterQuery}
       ORDER BY student_id ASC, chapter_id ASC, type ASC, id ASC`,
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
            written_average: 0,
            skill_average: 0,
            final_average: 0,
          },
        ];
      }),
    );

    for (const row of summativeResult.rows) {
      const student = studentsMap.get(String(row.student_id));
      if (!student) continue;
      const monthNumber = monthNameToNumber(row.month);
      if (!semesterMonths.includes(monthNumber)) continue;
      student.month_scores[monthNumber].summative.push({
        chapter_id: row.chapter_id,
        type: row.type,
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
      const writtenScores = [];
      const skillScores = [];
      const finalScores = [];

      for (const monthNumber of semesterMonths) {
        const monthData = student.month_scores[monthNumber];
        for (const scoreItem of monthData.summative) {
          if (scoreItem.score_written !== null && scoreItem.score_written !== undefined) {
            writtenScores.push(Number(scoreItem.score_written));
          }
          if (scoreItem.score_skill !== null && scoreItem.score_skill !== undefined) {
            skillScores.push(Number(scoreItem.score_skill));
          }
          if (scoreItem.final_score !== null && scoreItem.final_score !== undefined) {
            finalScores.push(Number(scoreItem.final_score));
          }
        }
      }

      const writtenAverage = writtenScores.length
        ? round2(
            writtenScores.reduce((sum, value) => sum + value, 0) /
              writtenScores.length,
          )
        : 0;

      const skillAverage = skillScores.length
        ? round2(
            skillScores.reduce((sum, value) => sum + value, 0) /
              skillScores.length,
          )
        : 0;

      const finalAverage = finalScores.length
        ? round2(
            finalScores.reduce((sum, value) => sum + value, 0) /
              finalScores.length,
          )
        : 0;

      return {
        ...student,
        written_average: writtenAverage,
        skill_average: skillAverage,
        final_average: finalAverage,
      };
    });

    const monthMatrix = semesterMonths.map((monthNumber) => {
      const maxSummativeEntries = students.reduce((maxValue, student) => {
        const count = student.month_scores[monthNumber]?.summative?.length || 0;
        return Math.max(maxValue, count);
      }, 0);

      return {
        month: monthNumber,
        month_name: MONTH_NAMES[monthNumber - 1],
        max_summative_entries: maxSummativeEntries,
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
        acc.writtenAvgSum += Number(item.written_average || 0);
        acc.skillAvgSum += Number(item.skill_average || 0);
        acc.finalAvgSum += Number(item.final_average || 0);
        return acc;
      },
      {
        summativeCount: 0,
        writtenAvgSum: 0,
        skillAvgSum: 0,
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
          written_average: totalStudents
            ? round2(totals.writtenAvgSum / totalStudents)
            : 0,
          skill_average: totalStudents
            ? round2(totals.skillAvgSum / totalStudents)
            : 0,
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

export default router;
