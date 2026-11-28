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
