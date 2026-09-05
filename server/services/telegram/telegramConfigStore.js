import { JAKARTA_TZ, toJakartaDateString } from "../attendance/rfidDailyAttendance.js";
import {
  DEFAULT_PARENT_CHECKIN_TEMPLATE,
  DEFAULT_PARENT_CHECKOUT_TEMPLATE,
  DEFAULT_PARENT_DAILY_TEMPLATE,
  DEFAULT_STUDENT_CHECKIN_TEMPLATE,
  DEFAULT_STUDENT_CHECKOUT_TEMPLATE,
  DEFAULT_TEACHER_CHECKIN_TEMPLATE,
  DEFAULT_TEACHER_CHECKOUT_TEMPLATE,
} from "./messageBuilder.js";

export const getJakartaHHmm = (date = new Date()) =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone: JAKARTA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

export const getJakartaNowContext = (date = new Date()) => ({
  now: date,
  attendanceDate: toJakartaDateString(date),
  currentHHmm: getJakartaHHmm(date),
});

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
  send_time: "08:00:00",
  message_template: DEFAULT_PARENT_DAILY_TEMPLATE,
  teacher_checkin_template: DEFAULT_TEACHER_CHECKIN_TEMPLATE,
  teacher_checkout_template: DEFAULT_TEACHER_CHECKOUT_TEMPLATE,
  student_checkin_template: DEFAULT_STUDENT_CHECKIN_TEMPLATE,
  student_checkout_template: DEFAULT_STUDENT_CHECKOUT_TEMPLATE,
  parent_checkin_template: DEFAULT_PARENT_CHECKIN_TEMPLATE,
  parent_checkout_template: DEFAULT_PARENT_CHECKOUT_TEMPLATE,
  skip_on_holiday: true,
  last_run_date: null,
  last_connected_at: null,
});

export const formatTelegramTime = (value) => {
  if (!value) return "08:00";
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : text;
};

export const normalizeTelegramTimeInput = (value) => {
  const text = String(value || "").trim();
  if (!text) return "08:00:00";
  if (/^\d{2}:\d{2}$/.test(text)) return `${text}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text;
  return null;
};

export const maskBotToken = (token) => {
  const value = String(token || "").trim();
  if (!value) return null;
  if (value.length <= 10) return "••••••••";
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
};

export const getDueTelegramConfigs = async (executor, currentHHmm, attendanceDate) => {
  const result = await executor.query(
    `SELECT
       c.*,
       h.name AS school_name
     FROM attendance.telegram_notification_config c
     JOIN public.a_homebase h ON h.id = c.homebase_id
     WHERE c.is_enabled = true
       AND NULLIF(TRIM(c.bot_token), '') IS NOT NULL
       AND c.bot_status = 'ready'
       AND (c.last_run_date IS NULL OR c.last_run_date < $1::date)
     ORDER BY c.homebase_id`,
    [attendanceDate],
  );

  return result.rows.filter((config) => {
    const sendTime = String(config.send_time || "").slice(0, 5);
    return sendTime === currentHHmm || sendTime < currentHHmm;
  });
};

export const claimTelegramRunDate = async (executor, homebaseId, attendanceDate) => {
  const result = await executor.query(
    `UPDATE attendance.telegram_notification_config
     SET last_run_date = $2,
         updated_at = NOW()
     WHERE homebase_id = $1
       AND is_enabled = true
       AND (last_run_date IS NULL OR last_run_date < $2::date)
     RETURNING *`,
    [homebaseId, attendanceDate],
  );

  return result.rows[0] || null;
};

export const releaseTelegramRunDate = async (executor, homebaseId, attendanceDate) => {
  await executor.query(
    `UPDATE attendance.telegram_notification_config
     SET last_run_date = NULL,
         updated_at = NOW()
     WHERE homebase_id = $1
       AND last_run_date = $2::date`,
    [homebaseId, attendanceDate],
  );
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
  const sendTime = normalizeTelegramTimeInput(payload.send_time);
  if (!sendTime) {
    throw new Error("Format send_time tidak valid. Gunakan HH:mm.");
  }

  const messageTemplate = String(payload.message_template || "").trim();
  const incomingToken =
    payload.bot_token === undefined || payload.bot_token === null
      ? undefined
      : String(payload.bot_token).trim();

  if (!messageTemplate) {
    throw new Error("message_template wajib diisi.");
  }

  const existing = await getTelegramNotificationConfig(executor, homebaseId);
  const nextToken =
    incomingToken === undefined
      ? existing.bot_token || null
      : incomingToken || null;

  if (payload.is_enabled === true && !nextToken) {
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
       send_time,
       message_template,
       teacher_checkin_template,
       teacher_checkout_template,
       student_checkin_template,
       student_checkout_template,
       parent_checkin_template,
       parent_checkout_template,
       skip_on_holiday,
       last_connected_at,
       created_by,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
     ON CONFLICT (homebase_id)
     DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled,
       bot_token = EXCLUDED.bot_token,
       bot_username = EXCLUDED.bot_username,
       bot_status = EXCLUDED.bot_status,
       last_error = EXCLUDED.last_error,
       send_time = EXCLUDED.send_time,
       message_template = EXCLUDED.message_template,
       teacher_checkin_template = EXCLUDED.teacher_checkin_template,
       teacher_checkout_template = EXCLUDED.teacher_checkout_template,
       student_checkin_template = EXCLUDED.student_checkin_template,
       student_checkout_template = EXCLUDED.student_checkout_template,
       parent_checkin_template = EXCLUDED.parent_checkin_template,
       parent_checkout_template = EXCLUDED.parent_checkout_template,
       skip_on_holiday = EXCLUDED.skip_on_holiday,
       last_connected_at = EXCLUDED.last_connected_at,
       updated_at = NOW()
     RETURNING *`,
    [
      homebaseId,
      payload.is_enabled === true,
      nextToken,
      payload.bot_username ?? existing.bot_username ?? null,
      payload.bot_status || existing.bot_status || "disconnected",
      payload.last_error === undefined ? existing.last_error || null : payload.last_error,
      sendTime,
      messageTemplate,
      teacherCheckinTemplate,
      teacherCheckoutTemplate,
      studentCheckinTemplate,
      studentCheckoutTemplate,
      parentCheckinTemplate,
      parentCheckoutTemplate,
      payload.skip_on_holiday !== false,
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
       p.phone,
       p.telegram_chat_id,
       COUNT(ps.student_id)::int AS student_count
     FROM public.u_parent_students ps
     JOIN public.u_users u
       ON u.id = ps.parent_user_id
      AND u.is_active = true
      AND u.role = 'parent'
     LEFT JOIN public.u_parents p ON p.user_id = ps.parent_user_id
     WHERE ps.homebase_id = $1
     GROUP BY u.id, u.full_name, p.phone, p.telegram_chat_id
     ORDER BY
       CASE WHEN NULLIF(TRIM(p.telegram_chat_id), '') IS NULL THEN 0 ELSE 1 END ASC,
       u.full_name ASC
     LIMIT $2`,
    [homebaseId, safeLimit],
  );

  return result.rows;
};
