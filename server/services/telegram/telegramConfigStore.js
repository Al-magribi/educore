import {
  DEFAULT_PARENT_CHECKIN_TEMPLATE,
  DEFAULT_PARENT_CHECKOUT_TEMPLATE,
  DEFAULT_STUDENT_CHECKIN_TEMPLATE,
  DEFAULT_STUDENT_CHECKOUT_TEMPLATE,
  DEFAULT_TEACHER_CHECKIN_TEMPLATE,
  DEFAULT_TEACHER_CHECKOUT_TEMPLATE,
  DEFAULT_TEACHER_STUDENT_CHECKIN_TEMPLATE,
  DEFAULT_TEACHER_STUDENT_CHECKOUT_TEMPLATE,
} from "./messageBuilder.js";

const normalizeTemplate = (value, fallback) => {
  const text = String(value || "").trim();
  return text || fallback;
};

export const getDefaultTelegramConfig = (homebaseId) => ({
  homebase_id: Number(homebaseId),
  is_enabled: false,
  bot_token: null,
  bot_username: null,
  bot_status: "disconnected",
  last_update_id: null,
  last_error: null,
  teacher_checkin_template: DEFAULT_TEACHER_CHECKIN_TEMPLATE,
  teacher_checkout_template: DEFAULT_TEACHER_CHECKOUT_TEMPLATE,
  teacher_student_checkin_template: DEFAULT_TEACHER_STUDENT_CHECKIN_TEMPLATE,
  teacher_student_checkout_template: DEFAULT_TEACHER_STUDENT_CHECKOUT_TEMPLATE,
  student_checkin_template: DEFAULT_STUDENT_CHECKIN_TEMPLATE,
  student_checkout_template: DEFAULT_STUDENT_CHECKOUT_TEMPLATE,
  parent_checkin_template: DEFAULT_PARENT_CHECKIN_TEMPLATE,
  parent_checkout_template: DEFAULT_PARENT_CHECKOUT_TEMPLATE,
  last_connected_at: null,
});

export const maskBotToken = (token) => {
  const value = String(token || "").trim();
  if (!value) return null;
  if (value.length <= 10) return "••••••••";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
};

export const getTelegramNotificationConfig = async (executor, homebaseId) => {
  const result = await executor.query(
    `SELECT
       c.*,
       h.name AS school_name
     FROM attendance.telegram_notification_config c
     JOIN public.a_homebase h ON h.id = c.homebase_id
     WHERE c.homebase_id = $1
     LIMIT 1`,
    [homebaseId],
  );

  if (!result.rows[0]) {
    const homebaseResult = await executor.query(
      `SELECT id, name FROM public.a_homebase WHERE id = $1 LIMIT 1`,
      [homebaseId],
    );
    const homebase = homebaseResult.rows[0];
    return {
      ...getDefaultTelegramConfig(homebaseId),
      school_name: homebase?.name || null,
      is_default: true,
    };
  }

  return {
    ...getDefaultTelegramConfig(homebaseId),
    ...result.rows[0],
    is_default: false,
  };
};

export const upsertTelegramNotificationConfig = async (
  executor,
  homebaseId,
  payload,
  userId,
) => {
  const incomingToken =
    payload.bot_token === undefined || payload.bot_token === null
      ? undefined
      : String(payload.bot_token).trim();

  const existing = await getTelegramNotificationConfig(executor, homebaseId);
  const nextToken =
    incomingToken === undefined
      ? existing.bot_token || null
      : incomingToken || null;
  const isEnabled =
    payload.is_enabled === undefined ? existing.is_enabled === true : payload.is_enabled === true;

  if (isEnabled && !nextToken) {
    throw new Error("Bot token wajib diisi sebelum mengaktifkan notifikasi Telegram.");
  }

  const teacherCheckinTemplate = normalizeTemplate(
    payload.teacher_checkin_template ?? existing.teacher_checkin_template,
    DEFAULT_TEACHER_CHECKIN_TEMPLATE,
  );
  const teacherCheckoutTemplate = normalizeTemplate(
    payload.teacher_checkout_template ?? existing.teacher_checkout_template,
    DEFAULT_TEACHER_CHECKOUT_TEMPLATE,
  );
  const teacherStudentCheckinTemplate = normalizeTemplate(
    payload.teacher_student_checkin_template ?? existing.teacher_student_checkin_template,
    DEFAULT_TEACHER_STUDENT_CHECKIN_TEMPLATE,
  );
  const teacherStudentCheckoutTemplate = normalizeTemplate(
    payload.teacher_student_checkout_template ?? existing.teacher_student_checkout_template,
    DEFAULT_TEACHER_STUDENT_CHECKOUT_TEMPLATE,
  );
  const studentCheckinTemplate = normalizeTemplate(
    payload.student_checkin_template ?? existing.student_checkin_template,
    DEFAULT_STUDENT_CHECKIN_TEMPLATE,
  );
  const studentCheckoutTemplate = normalizeTemplate(
    payload.student_checkout_template ?? existing.student_checkout_template,
    DEFAULT_STUDENT_CHECKOUT_TEMPLATE,
  );
  const parentCheckinTemplate = normalizeTemplate(
    payload.parent_checkin_template ?? existing.parent_checkin_template,
    DEFAULT_PARENT_CHECKIN_TEMPLATE,
  );
  const parentCheckoutTemplate = normalizeTemplate(
    payload.parent_checkout_template ?? existing.parent_checkout_template,
    DEFAULT_PARENT_CHECKOUT_TEMPLATE,
  );

  const result = await executor.query(
    `INSERT INTO attendance.telegram_notification_config (
       homebase_id,
       is_enabled,
       bot_token,
       bot_username,
       bot_status,
       last_error,
       teacher_checkin_template,
       teacher_checkout_template,
       teacher_student_checkin_template,
       teacher_student_checkout_template,
       student_checkin_template,
       student_checkout_template,
       parent_checkin_template,
       parent_checkout_template,
       last_connected_at,
       created_by,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
     ON CONFLICT (homebase_id)
     DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled,
       bot_token = EXCLUDED.bot_token,
       bot_username = EXCLUDED.bot_username,
       bot_status = EXCLUDED.bot_status,
       last_error = EXCLUDED.last_error,
       teacher_checkin_template = EXCLUDED.teacher_checkin_template,
       teacher_checkout_template = EXCLUDED.teacher_checkout_template,
       teacher_student_checkin_template = EXCLUDED.teacher_student_checkin_template,
       teacher_student_checkout_template = EXCLUDED.teacher_student_checkout_template,
       student_checkin_template = EXCLUDED.student_checkin_template,
       student_checkout_template = EXCLUDED.student_checkout_template,
       parent_checkin_template = EXCLUDED.parent_checkin_template,
       parent_checkout_template = EXCLUDED.parent_checkout_template,
       last_connected_at = EXCLUDED.last_connected_at,
       updated_at = NOW()
     RETURNING *`,
    [
      homebaseId,
      isEnabled,
      nextToken,
      payload.bot_username ?? existing.bot_username ?? null,
      payload.bot_status || existing.bot_status || "disconnected",
      payload.last_error === undefined ? existing.last_error || null : payload.last_error,
      teacherCheckinTemplate,
      teacherCheckoutTemplate,
      teacherStudentCheckinTemplate,
      teacherStudentCheckoutTemplate,
      studentCheckinTemplate,
      studentCheckoutTemplate,
      parentCheckinTemplate,
      parentCheckoutTemplate,
      payload.last_connected_at === undefined
        ? existing.last_connected_at || null
        : payload.last_connected_at,
      userId || null,
    ],
  );

  return result.rows[0];
};

export const updateTelegramBotMeta = async (executor, homebaseId, fields = {}) => {
  const assignments = [];
  const values = [homebaseId];
  let paramIndex = 2;

  const setField = (column, value) => {
    assignments.push(`${column} = $${paramIndex}`);
    values.push(value);
    paramIndex += 1;
  };

  if (fields.bot_username !== undefined) setField("bot_username", fields.bot_username);
  if (fields.bot_status !== undefined) setField("bot_status", fields.bot_status);
  if (fields.last_error !== undefined) setField("last_error", fields.last_error);
  if (fields.last_update_id !== undefined) setField("last_update_id", fields.last_update_id);
  if (fields.last_connected_at !== undefined) {
    setField("last_connected_at", fields.last_connected_at);
  }

  if (assignments.length === 0) return null;

  assignments.push("updated_at = NOW()");

  const result = await executor.query(
    `UPDATE attendance.telegram_notification_config
     SET ${assignments.join(", ")}
     WHERE homebase_id = $1
     RETURNING *`,
    values,
  );

  return result.rows[0] || null;
};

export const listTelegramConfigsWithToken = async (executor) => {
  const result = await executor.query(
    `SELECT
       c.*,
       h.name AS school_name
     FROM attendance.telegram_notification_config c
     JOIN public.a_homebase h ON h.id = c.homebase_id
     WHERE NULLIF(TRIM(c.bot_token), '') IS NOT NULL
     ORDER BY c.homebase_id`,
  );

  return result.rows;
};

export const getTelegramParentBindStats = async (executor, homebaseId) => {
  const result = await executor.query(
    `SELECT
       COUNT(DISTINCT ps.parent_user_id)::int AS total_parents,
       COUNT(DISTINCT ps.parent_user_id)
         FILTER (
           WHERE NULLIF(TRIM(p.telegram_chat_id), '') IS NOT NULL
         )::int AS bound_parents
     FROM public.u_parent_students ps
     JOIN public.u_users u
       ON u.id = ps.parent_user_id
      AND u.is_active = true
      AND u.role = 'parent'
     LEFT JOIN public.u_parents p ON p.user_id = ps.parent_user_id
     WHERE ps.homebase_id = $1`,
    [homebaseId],
  );

  return {
    total_parents: result.rows[0]?.total_parents || 0,
    bound_parents: result.rows[0]?.bound_parents || 0,
  };
};

export const listTelegramParentBindings = async (executor, homebaseId, { limit = 100 } = {}) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);
  const result = await executor.query(
    `SELECT
       u.id AS parent_user_id,
       u.full_name AS parent_name,
       MAX(p.phone) AS phone,
       MAX(NULLIF(TRIM(p.telegram_chat_id), '')) AS telegram_chat_id,
       COUNT(DISTINCT ps.student_id)::int AS student_count
     FROM public.u_parent_students ps
     JOIN public.u_users u
       ON u.id = ps.parent_user_id
      AND u.is_active = true
      AND u.role = 'parent'
     LEFT JOIN public.u_parents p ON p.user_id = ps.parent_user_id
     WHERE ps.homebase_id = $1
     GROUP BY u.id, u.full_name
     ORDER BY
       CASE WHEN MAX(NULLIF(TRIM(p.telegram_chat_id), '')) IS NULL THEN 0 ELSE 1 END ASC,
       u.full_name ASC
     LIMIT $2`,
    [homebaseId, safeLimit],
  );

  return result.rows;
};
