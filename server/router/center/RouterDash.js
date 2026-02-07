import { Router } from "express";
import { withQuery } from "../../utils/wrapper.js"; // Sesuaikan path utils Anda
import { authorize } from "../../middleware/authorize.js"; // Sesuaikan path middleware Anda

const router = Router();

// Endpoint: /api/center/summary
// Menggunakan authorize() untuk membatasi akses ke user yang login (tambahkan role string jika ingin spesifik, misal authorize('admin', 'center'))
// Menggunakan withQuery untuk menangani error handling dan koneksi database secara otomatis
router.get(
  "/summary",
  authorize("admin"),
  withQuery(async (req, res, db) => {
    // Jalankan query secara paralel menggunakan Promise.all untuk performa maksimal
    // Perhatikan: parameter 'db' di sini adalah 'pool' yang dikirim dari withQuery
    const [
      studentCount,
      teacherCount,
      activeExams,
      tahfizToday,
      attendanceStats,
    ] = await Promise.all([
      // 1. Total Siswa Aktif (filter user aktif)
      db.query(
        "SELECT COUNT(*) FROM u_students JOIN u_users ON u_students.user_id = u_users.id WHERE u_users.is_active = true",
      ),

      // 2. Total Guru
      db.query("SELECT COUNT(*) FROM u_teachers"),

      // 3. Ujian Aktif (CBT)
      db.query("SELECT COUNT(*) FROM c_exam WHERE is_active = true"),

      // 4. Setoran Tahfiz Hari Ini
      db.query("SELECT COUNT(*) FROM t_daily_record WHERE date = CURRENT_DATE"),

      // 5. Statistik Kehadiran Hari Ini (Group by status)
      db.query(`
      SELECT status, COUNT(*) as count 
      FROM l_attendance 
      WHERE date = CURRENT_DATE 
      GROUP BY status
    `),
    ]);

    // Mengambil 5 log aktivitas terakhir sistem
    const recentLogs = await db.query(`
    SELECT s.action, s.created_at, u.full_name 
    FROM sys_logs s
    JOIN u_users u ON s.user_id = u.id
    ORDER BY s.created_at DESC 
    LIMIT 5
  `);

    // Kirim response sukses (Error handling sudah diurus oleh withQuery)
    res.json({
      code: 200,
      message: "Dashboard data fetched successfully",
      data: {
        stats: {
          students: parseInt(studentCount.rows[0].count),
          teachers: parseInt(teacherCount.rows[0].count),
          activeExams: parseInt(activeExams.rows[0].count),
          tahfizToday: parseInt(tahfizToday.rows[0].count),
        },
        attendance: attendanceStats.rows,
        logs: recentLogs.rows,
      },
    });
  }),
);

export default router;
