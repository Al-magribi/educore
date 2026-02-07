import { Router } from "express";
import { withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

router.get(
  "/summary",
  authorize("satuan"),
  withQuery(async (req, res, pool) => {
    const homebaseId = req.user.homebase_id;

    if (!homebaseId) {
      return res.status(400).json({
        message: "Homebase tidak ditemukan pada akun admin.",
      });
    }

    const [
      homebaseInfo,
      activePeriode,
      studentCount,
      teacherCount,
      classCount,
      majorCount,
      subjectCount,
      activeExams,
      tahfizToday,
      attendanceStats,
      recentLogs,
    ] = await Promise.all([
      pool.query(
        `SELECT id, name, level FROM a_homebase WHERE id = $1 LIMIT 1`,
        [homebaseId],
      ),
      pool.query(
        `SELECT id, name, is_active 
         FROM a_periode 
         WHERE homebase_id = $1 AND is_active = true 
         ORDER BY id DESC 
         LIMIT 1`,
        [homebaseId],
      ),
      pool.query(
        `SELECT COUNT(*) 
         FROM u_students s 
         JOIN u_users u ON s.user_id = u.id 
         WHERE s.homebase_id = $1 AND u.is_active = true`,
        [homebaseId],
      ),
      pool.query(
        `SELECT COUNT(*) 
         FROM u_teachers t 
         JOIN u_users u ON t.user_id = u.id 
         WHERE t.homebase_id = $1 AND u.is_active = true`,
        [homebaseId],
      ),
      pool.query(`SELECT COUNT(*) FROM a_class WHERE homebase_id = $1`, [
        homebaseId,
      ]),
      pool.query(`SELECT COUNT(*) FROM a_major WHERE homebase_id = $1`, [
        homebaseId,
      ]),
      pool.query(`SELECT COUNT(*) FROM a_subject WHERE homebase_id = $1`, [
        homebaseId,
      ]),
      pool.query(
        `SELECT COUNT(*) 
         FROM c_exam e
         JOIN c_bank b ON e.bank_id = b.id
         JOIN a_subject s ON b.subject_id = s.id
         WHERE e.is_active = true AND s.homebase_id = $1`,
        [homebaseId],
      ),
      pool.query(
        `SELECT COUNT(*) 
         FROM t_daily_record d
         JOIN u_teachers t ON d.teacher_id = t.user_id
         WHERE d.date = CURRENT_DATE AND t.homebase_id = $1`,
        [homebaseId],
      ),
      pool.query(
        `SELECT status, COUNT(*) as count 
         FROM l_attendance a
         JOIN a_class c ON a.class_id = c.id
         WHERE a.date = CURRENT_DATE AND c.homebase_id = $1
         GROUP BY status`,
        [homebaseId],
      ),
      pool.query(
        `SELECT s.action, s.created_at, u.full_name, u.role
         FROM sys_logs s
         JOIN u_users u ON s.user_id = u.id
         LEFT JOIN u_admin a ON u.id = a.user_id
         LEFT JOIN u_teachers t ON u.id = t.user_id
         LEFT JOIN u_students st ON u.id = st.user_id
         LEFT JOIN u_parents p ON u.id = p.user_id
         LEFT JOIN u_students pst ON p.student_id = pst.user_id
         WHERE COALESCE(a.homebase_id, t.homebase_id, st.homebase_id, pst.homebase_id) = $1
         ORDER BY s.created_at DESC
         LIMIT 8`,
        [homebaseId],
      ),
    ]);

    res.json({
      code: 200,
      message: "Dashboard data fetched successfully",
      data: {
        homebase: homebaseInfo.rows[0] || {
          id: homebaseId,
          name: "Homebase",
          level: "Satuan",
        },
        activePeriode: activePeriode.rows[0] || null,
        stats: {
          students: parseInt(studentCount.rows[0].count, 10),
          teachers: parseInt(teacherCount.rows[0].count, 10),
          classes: parseInt(classCount.rows[0].count, 10),
          majors: parseInt(majorCount.rows[0].count, 10),
          subjects: parseInt(subjectCount.rows[0].count, 10),
          activeExams: parseInt(activeExams.rows[0].count, 10),
          tahfizToday: parseInt(tahfizToday.rows[0].count, 10),
        },
        attendance: attendanceStats.rows,
        logs: recentLogs.rows,
      },
    });
  }),
);

router.get(
  "/student-dash",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const userId = req.user.id;

    const studentResult = await pool.query(
      `SELECT u.id, u.full_name, u.img_url, s.nis, s.nisn, s.homebase_id, s.current_class_id, s.current_periode_id
       FROM u_users u
       JOIN u_students s ON u.id = s.user_id
       WHERE u.id = $1
       LIMIT 1`,
      [userId],
    );

    if (studentResult.rows.length === 0) {
      return res.status(404).json({ message: "Data siswa tidak ditemukan." });
    }

    const student = studentResult.rows[0];
    const homebaseId = student.homebase_id;

    const enrollmentResult = await pool.query(
      `SELECT e.class_id, e.periode_id, c.name as class_name, g.name as grade_name, m.name as major_name
       FROM u_class_enrollments e
       JOIN a_class c ON e.class_id = c.id
       LEFT JOIN a_grade g ON c.grade_id = g.id
       LEFT JOIN a_major m ON c.major_id = m.id
       WHERE e.student_id = $1
       ORDER BY e.id DESC
       LIMIT 1`,
      [userId],
    );

    const enrollment = enrollmentResult.rows[0] || null;
    const classId = student.current_class_id || enrollment?.class_id || null;
    const periodeId = student.current_periode_id || enrollment?.periode_id || null;

    const [homebaseInfo, activePeriode, subjects, activeExams] = await Promise.all([
      pool.query(`SELECT id, name, level FROM a_homebase WHERE id = $1 LIMIT 1`, [
        homebaseId,
      ]),
      pool.query(
        `SELECT id, name, is_active 
         FROM a_periode 
         WHERE homebase_id = $1 AND is_active = true 
         ORDER BY id DESC 
         LIMIT 1`,
        [homebaseId],
      ),
      classId
        ? pool.query(
            `SELECT DISTINCT s.id, s.name, s.code
             FROM at_subject a
             JOIN a_subject s ON a.subject_id = s.id
             WHERE a.class_id = $1
             ORDER BY s.name`,
            [classId],
          )
        : Promise.resolve({ rows: [] }),
      classId
        ? pool.query(
            `SELECT e.id, e.name, e.duration_minutes, e.created_at, b.title as bank_title, s.name as subject_name
             FROM c_exam e
             JOIN c_bank b ON e.bank_id = b.id
             JOIN a_subject s ON b.subject_id = s.id
             JOIN c_exam_class ec ON ec.exam_id = e.id
             WHERE ec.class_id = $1 AND e.is_active = true
             ORDER BY e.created_at DESC
             LIMIT 5`,
            [classId],
          )
        : Promise.resolve({ rows: [] }),
    ]);

    res.json({
      code: 200,
      message: "Student dashboard data fetched successfully",
      data: {
        student: {
          id: student.id,
          full_name: student.full_name,
          img_url: student.img_url,
          nis: student.nis,
          nisn: student.nisn,
        },
        homebase: homebaseInfo.rows[0] || null,
        activePeriode: activePeriode.rows[0] || null,
        classInfo: {
          id: classId,
          name: enrollment?.class_name || "-",
          grade: enrollment?.grade_name || "-",
          major: enrollment?.major_name || "-",
          periode_id: periodeId,
        },
        subjects: subjects.rows,
        exams: activeExams.rows,
      },
    });
  }),
);

router.get(
  "/teacher-dash",
  authorize("teacher"),
  withQuery(async (req, res, pool) => {
    const userId = req.user.id;

    const teacherResult = await pool.query(
      `SELECT u.id, u.full_name, u.img_url, t.nip, t.homebase_id
       FROM u_users u
       JOIN u_teachers t ON u.id = t.user_id
       WHERE u.id = $1
       LIMIT 1`,
      [userId],
    );

    if (teacherResult.rows.length === 0) {
      return res.status(404).json({ message: "Data guru tidak ditemukan." });
    }

    const teacher = teacherResult.rows[0];
    const homebaseId = teacher.homebase_id;

    const [
      homebaseInfo,
      activePeriode,
      subjectCount,
      bankCount,
      examTotal,
      examActive,
      subjects,
      banks,
      exams,
    ] = await Promise.all([
      pool.query(`SELECT id, name, level FROM a_homebase WHERE id = $1 LIMIT 1`, [
        homebaseId,
      ]),
      pool.query(
        `SELECT id, name, is_active
         FROM a_periode
         WHERE homebase_id = $1 AND is_active = true
         ORDER BY id DESC
         LIMIT 1`,
        [homebaseId],
      ),
      pool.query(
        `SELECT COUNT(DISTINCT subject_id)
         FROM at_subject
         WHERE teacher_id = $1`,
        [userId],
      ),
      pool.query(`SELECT COUNT(*) FROM c_bank WHERE teacher_id = $1`, [userId]),
      pool.query(
        `SELECT COUNT(*)
         FROM c_exam e
         JOIN c_bank b ON e.bank_id = b.id
         WHERE b.teacher_id = $1`,
        [userId],
      ),
      pool.query(
        `SELECT COUNT(*)
         FROM c_exam e
         JOIN c_bank b ON e.bank_id = b.id
         WHERE b.teacher_id = $1 AND e.is_active = true`,
        [userId],
      ),
      pool.query(
        `SELECT
           s.id,
           s.name,
           s.code,
           COALESCE(
             json_agg(
               DISTINCT jsonb_build_object('id', c.id, 'name', c.name)
             ) FILTER (WHERE c.id IS NOT NULL),
             '[]'
           ) as classes,
           COUNT(DISTINCT c.id) as class_count
         FROM at_subject a
         JOIN a_subject s ON a.subject_id = s.id
         LEFT JOIN a_class c ON a.class_id = c.id
         WHERE a.teacher_id = $1
         GROUP BY s.id
         ORDER BY s.name ASC`,
        [userId],
      ),
      pool.query(
        `SELECT
           b.id,
           b.title,
           b.type,
           b.created_at,
           s.name as subject_name,
           s.code as subject_code,
           COUNT(q.id) as question_count
         FROM c_bank b
         LEFT JOIN a_subject s ON b.subject_id = s.id
         LEFT JOIN c_question q ON q.bank_id = b.id
         WHERE b.teacher_id = $1
         GROUP BY b.id, s.name, s.code
         ORDER BY b.created_at DESC
         LIMIT 5`,
        [userId],
      ),
      pool.query(
        `SELECT
           e.id,
           e.name,
           e.duration_minutes,
           e.is_active,
           e.created_at,
           b.title as bank_title,
           s.name as subject_name,
           COALESCE(
             json_agg(
               DISTINCT jsonb_build_object('id', c.id, 'name', c.name)
             ) FILTER (WHERE c.id IS NOT NULL),
             '[]'
           ) as classes,
           COUNT(DISTINCT c.id) as class_count
         FROM c_exam e
         JOIN c_bank b ON e.bank_id = b.id
         LEFT JOIN a_subject s ON b.subject_id = s.id
         LEFT JOIN c_exam_class ec ON ec.exam_id = e.id
         LEFT JOIN a_class c ON ec.class_id = c.id
         WHERE b.teacher_id = $1
         GROUP BY e.id, b.title, s.name
         ORDER BY e.created_at DESC
         LIMIT 5`,
        [userId],
      ),
    ]);

    res.json({
      code: 200,
      message: "Teacher dashboard data fetched successfully",
      data: {
        teacher: {
          id: teacher.id,
          full_name: teacher.full_name,
          img_url: teacher.img_url,
          nip: teacher.nip,
        },
        homebase: homebaseInfo.rows[0] || null,
        activePeriode: activePeriode.rows[0] || null,
        stats: {
          subjects: parseInt(subjectCount.rows[0].count, 10),
          banks: parseInt(bankCount.rows[0].count, 10),
          examsTotal: parseInt(examTotal.rows[0].count, 10),
          examsActive: parseInt(examActive.rows[0].count, 10),
        },
        subjects: subjects.rows,
        banks: banks.rows,
        exams: exams.rows,
      },
    });
  }),
);

export default router;
