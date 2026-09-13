export const isValidTelegramChatId = (chatId) => {
  const value = String(chatId || "").trim();
  if (!value) return false;
  return /^-?\d{5,20}$/.test(value);
};

const STUDENT_GUARDIAN_CHAT_SQL = `
  SELECT
    recipient_user_id,
    recipient_name,
    chat_id
  FROM (
    SELECT
      pu.id AS recipient_user_id,
      pu.full_name AS recipient_name,
      NULLIF(TRIM(p.telegram_chat_id), '') AS chat_id
    FROM public.u_parent_students ps
    JOIN public.u_users pu
      ON pu.id = ps.parent_user_id
     AND pu.is_active = true
    LEFT JOIN public.u_parents p ON p.user_id = ps.parent_user_id
    WHERE ps.student_id = $1
      AND ps.homebase_id = $2

    UNION ALL

    SELECT
      t.user_id AS recipient_user_id,
      tu.full_name AS recipient_name,
      NULLIF(TRIM(t.telegram_chat_id), '') AS chat_id
    FROM public.u_parent_students ps
    JOIN public.u_parents p
      ON p.user_id = ps.parent_user_id
    JOIN public.u_teachers t
      ON t.homebase_id = $2
     AND NULLIF(TRIM(t.telegram_chat_id), '') IS NOT NULL
     AND NULLIF(TRIM(t.telegram_chat_id), '') = NULLIF(TRIM(p.telegram_chat_id), '')
    JOIN public.u_users tu
      ON tu.id = t.user_id
     AND tu.is_active = true
    WHERE ps.student_id = $1
      AND ps.homebase_id = $2
      AND NULLIF(TRIM(p.telegram_chat_id), '') IS NOT NULL
  ) guardians
  WHERE NULLIF(TRIM(chat_id), '') IS NOT NULL
`;

export const listStudentGuardianTelegramChats = async (
  executor,
  { homebaseId, studentId },
) => {
  const result = await executor.query(STUDENT_GUARDIAN_CHAT_SQL, [
    studentId,
    homebaseId,
  ]);

  const unique = new Map();
  for (const row of result.rows) {
    const chatId = String(row.chat_id || "").trim();
    if (!chatId || unique.has(chatId)) continue;
    unique.set(chatId, {
      recipient_user_id: Number(row.recipient_user_id),
      recipient_name: row.recipient_name,
      chat_id: chatId,
    });
  }

  return Array.from(unique.values());
};

export const resolveTelegramRecipients = async (executor, { homebaseId, attendanceDate }) => {
  const result = await executor.query(
    `SELECT
       e.student_id,
       s.full_name AS student_name,
       COALESCE(da.attendance_status, 'pending') AS attendance_status,
       da.checkin_at,
       guardian.recipient_user_id AS parent_user_id,
       guardian.recipient_name AS parent_name,
       guardian.chat_id
     FROM public.u_class_enrollments e
     JOIN public.a_periode pr
       ON pr.id = e.periode_id
      AND pr.is_active = true
      AND pr.homebase_id = $1
     JOIN public.u_users s
       ON s.id = e.student_id
      AND s.is_active = true
      AND s.role = 'student'
     JOIN LATERAL (
       SELECT
         recipient_user_id,
         recipient_name,
         chat_id
       FROM (
         SELECT
           pu.id AS recipient_user_id,
           pu.full_name AS recipient_name,
           NULLIF(TRIM(p.telegram_chat_id), '') AS chat_id
         FROM public.u_parent_students ps
         JOIN public.u_users pu
           ON pu.id = ps.parent_user_id
          AND pu.is_active = true
         LEFT JOIN public.u_parents p ON p.user_id = ps.parent_user_id
         WHERE ps.student_id = e.student_id
           AND ps.homebase_id = $1

         UNION ALL

         SELECT
           t.user_id AS recipient_user_id,
           tu.full_name AS recipient_name,
           NULLIF(TRIM(t.telegram_chat_id), '') AS chat_id
         FROM public.u_parent_students ps
         JOIN public.u_parents p
           ON p.user_id = ps.parent_user_id
         JOIN public.u_teachers t
           ON t.homebase_id = $1
          AND NULLIF(TRIM(t.telegram_chat_id), '') IS NOT NULL
          AND NULLIF(TRIM(t.telegram_chat_id), '') = NULLIF(TRIM(p.telegram_chat_id), '')
         JOIN public.u_users tu
           ON tu.id = t.user_id
          AND tu.is_active = true
         WHERE ps.student_id = e.student_id
           AND ps.homebase_id = $1
           AND NULLIF(TRIM(p.telegram_chat_id), '') IS NOT NULL
       ) guardians
       WHERE NULLIF(TRIM(chat_id), '') IS NOT NULL
     ) guardian ON true
     LEFT JOIN attendance.daily_attendance da
       ON da.user_id = e.student_id
      AND da.attendance_date = $2::date
      AND da.target_role = 'student'
     WHERE e.homebase_id = $1
     ORDER BY guardian.recipient_name ASC, s.full_name ASC`,
    [homebaseId, attendanceDate],
  );

  const grouped = new Map();

  for (const row of result.rows) {
    const chatId = String(row.chat_id || "").trim();
    if (!chatId) continue;

    if (!grouped.has(chatId)) {
      grouped.set(chatId, {
        parent_user_id: Number(row.parent_user_id),
        parent_name: row.parent_name,
        chat_id: chatId,
        students: [],
      });
    }

    grouped.get(chatId).students.push({
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
