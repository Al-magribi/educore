export const resolveWhatsappRecipients = async (executor, { homebaseId, attendanceDate }) => {
  const result = await executor.query(
    `SELECT
       e.student_id,
       s.full_name AS student_name,
       COALESCE(da.attendance_status, 'pending') AS attendance_status,
       da.checkin_at,
       ps.parent_user_id,
       pu.full_name AS parent_name,
       p.phone AS parent_phone
     FROM public.u_class_enrollments e
     JOIN public.a_periode pr
       ON pr.id = e.periode_id
      AND pr.is_active = true
      AND pr.homebase_id = $1
     JOIN public.u_users s
       ON s.id = e.student_id
      AND s.is_active = true
      AND s.role = 'student'
     JOIN public.u_parent_students ps
       ON ps.student_id = e.student_id
     JOIN public.u_parents p
       ON p.user_id = ps.parent_user_id
     JOIN public.u_users pu
       ON pu.id = ps.parent_user_id
      AND pu.is_active = true
     LEFT JOIN attendance.daily_attendance da
       ON da.user_id = e.student_id
      AND da.attendance_date = $2::date
      AND da.target_role = 'student'
     WHERE e.homebase_id = $1
       AND NULLIF(TRIM(p.phone), '') IS NOT NULL
     ORDER BY pu.full_name ASC, s.full_name ASC`,
    [homebaseId, attendanceDate],
  );

  const grouped = new Map();

  for (const row of result.rows) {
    const parentUserId = Number(row.parent_user_id);
    if (!grouped.has(parentUserId)) {
      grouped.set(parentUserId, {
        parent_user_id: parentUserId,
        parent_name: row.parent_name,
        phone: String(row.parent_phone || "").trim(),
        students: [],
      });
    }

    grouped.get(parentUserId).students.push({
      student_id: Number(row.student_id),
      student_name: row.student_name,
      attendance_status: row.attendance_status,
      checkin_at: row.checkin_at,
    });
  }

  return Array.from(grouped.values());
};

export const getActivePeriodeId = async (executor, homebaseId) => {
  const result = await executor.query(
    `SELECT id
     FROM public.a_periode
     WHERE homebase_id = $1
       AND is_active = true
     ORDER BY id DESC
     LIMIT 1`,
    [homebaseId],
  );

  return result.rows[0]?.id ? Number(result.rows[0].id) : null;
};

export { isStudentHoliday } from "../attendance/holidayCalendar.js";
