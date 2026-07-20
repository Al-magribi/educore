import { Router } from "express";
import { withQuery } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";

const router = Router();

// Endpoint: /api/center/summary
// Admin pusat memilih satuan + periode; ringkasan dihitung berdasarkan filter tersebut.
router.get(
  "/summary",
  authorize("pusat"),
  withQuery(async (req, res, db) => {
    const { homebase_id, periode_id } = req.query;

    const homebasesResult = await db.query(
      `SELECT id, name, level
       FROM a_homebase
       ORDER BY name ASC`,
    );
    const homebases = homebasesResult.rows;

    let selectedHomebaseId = homebase_id ? Number(homebase_id) : null;
    if (
      !selectedHomebaseId ||
      !homebases.some((h) => Number(h.id) === selectedHomebaseId)
    ) {
      selectedHomebaseId = homebases.length > 0 ? Number(homebases[0].id) : null;
    }

    if (!selectedHomebaseId) {
      return res.json({
        code: 200,
        message: "Dashboard data fetched successfully",
        data: {
          homebases: [],
          periods: [],
          selected_homebase_id: null,
          selected_periode_id: null,
          stats: {
            students: 0,
            teachers: 0,
            activeExams: 0,
          },
          attendance: [],
          logs: [],
        },
      });
    }

    const periodsResult = await db.query(
      `SELECT id, name, is_active
       FROM a_periode
       WHERE homebase_id = $1
       ORDER BY name DESC`,
      [selectedHomebaseId],
    );
    const periods = periodsResult.rows;

    let selectedPeriodeId = periode_id ? Number(periode_id) : null;
    if (
      !selectedPeriodeId ||
      !periods.some((p) => Number(p.id) === selectedPeriodeId)
    ) {
      const activeP = periods.find((p) => p.is_active);
      selectedPeriodeId = activeP
        ? Number(activeP.id)
        : periods.length > 0
          ? Number(periods[0].id)
          : null;
    }

    const [studentCount, teacherCount, activeExams, attendanceStats, recentLogs] =
      await Promise.all([
        // 1. Total Siswa Aktif (filter satuan + periode)
        selectedPeriodeId
          ? db.query(
              `SELECT COUNT(*)
               FROM u_students s
               JOIN u_users u ON s.user_id = u.id
               WHERE s.homebase_id = $1
                 AND s.current_periode_id = $2
                 AND u.is_active = true`,
              [selectedHomebaseId, selectedPeriodeId],
            )
          : Promise.resolve({ rows: [{ count: "0" }] }),

        // 2. Total Guru (terikat satuan)
        db.query(
          `SELECT COUNT(*)
           FROM u_teachers t
           JOIN u_users u ON t.user_id = u.id
           WHERE t.homebase_id = $1
             AND u.is_active = true`,
          [selectedHomebaseId],
        ),

        // 3. Ujian Aktif (CBT) per satuan
        db.query(
          `SELECT COUNT(*)
           FROM cbt.c_exam e
           JOIN cbt.c_bank b ON e.bank_id = b.id
           JOIN a_subject s ON b.subject_id = s.id
           WHERE e.is_active = true
             AND s.homebase_id = $1`,
          [selectedHomebaseId],
        ),

        // 4. Statistik Kehadiran Hari Ini (kelas satuan)
        db.query(
          `SELECT a.status, COUNT(*) as count
           FROM lms.l_attendance a
           JOIN a_class c ON a.class_id = c.id
           WHERE a.date = CURRENT_DATE
             AND c.homebase_id = $1
           GROUP BY a.status`,
          [selectedHomebaseId],
        ),

        // 5. Log aktivitas terkait satuan
        db.query(
          `SELECT s.action, s.created_at, u.full_name
           FROM sys_logs s
           JOIN u_users u ON s.user_id = u.id
           LEFT JOIN u_admin a ON u.id = a.user_id
           LEFT JOIN u_teachers t ON u.id = t.user_id
           LEFT JOIN u_students st ON u.id = st.user_id
           LEFT JOIN u_parents p ON u.id = p.user_id
           LEFT JOIN u_students pst ON p.student_id = pst.user_id
           WHERE COALESCE(a.homebase_id, t.homebase_id, st.homebase_id, pst.homebase_id) = $1
           ORDER BY s.created_at DESC
           LIMIT 5`,
          [selectedHomebaseId],
        ),
      ]);

    res.json({
      code: 200,
      message: "Dashboard data fetched successfully",
      data: {
        homebases,
        periods,
        selected_homebase_id: selectedHomebaseId,
        selected_periode_id: selectedPeriodeId,
        stats: {
          students: parseInt(studentCount.rows[0].count, 10),
          teachers: parseInt(teacherCount.rows[0].count, 10),
          activeExams: parseInt(activeExams.rows[0].count, 10),
        },
        attendance: attendanceStats.rows,
        logs: recentLogs.rows,
      },
    });
  }),
);

export default router;
