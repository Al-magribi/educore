import { JAKARTA_TZ, toJakartaDateString } from "../attendance/rfidDailyAttendance.js";

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

export const ensureWhatsappSessionRow = async (executor, homebaseId) => {
  await executor.query(
    `INSERT INTO attendance.whatsapp_session (homebase_id)
     VALUES ($1)
     ON CONFLICT (homebase_id) DO NOTHING`,
    [homebaseId],
  );
};

export const updateWhatsappSession = async (executor, homebaseId, fields = {}) => {
  await ensureWhatsappSessionRow(executor, homebaseId);

  const assignments = [];
  const values = [homebaseId];
  let paramIndex = 2;

  const setField = (column, value) => {
    assignments.push(`${column} = $${paramIndex}`);
    values.push(value);
    paramIndex += 1;
  };

  if (fields.session_status !== undefined) setField("session_status", fields.session_status);
  if (fields.connected_phone !== undefined) setField("connected_phone", fields.connected_phone);
  if (fields.qr_code !== undefined) setField("qr_code", fields.qr_code);
  if (fields.qr_generated_at !== undefined) setField("qr_generated_at", fields.qr_generated_at);
  if (fields.last_connected_at !== undefined) {
    setField("last_connected_at", fields.last_connected_at);
  }
  if (fields.last_disconnected_at !== undefined) {
    setField("last_disconnected_at", fields.last_disconnected_at);
  }
  if (fields.last_error !== undefined) setField("last_error", fields.last_error);

  if (assignments.length === 0) return null;

  assignments.push("updated_at = NOW()");

  const result = await executor.query(
    `UPDATE attendance.whatsapp_session
     SET ${assignments.join(", ")}
     WHERE homebase_id = $1
     RETURNING *`,
    values,
  );

  return result.rows[0] || null;
};

export const getWhatsappSession = async (executor, homebaseId) => {
  const result = await executor.query(
    `SELECT *
     FROM attendance.whatsapp_session
     WHERE homebase_id = $1
     LIMIT 1`,
    [homebaseId],
  );

  return result.rows[0] || null;
};

export const getDueWhatsappConfigs = async (executor, currentHHmm, attendanceDate) => {
  const result = await executor.query(
    `SELECT
       c.*,
       h.name AS school_name
     FROM attendance.whatsapp_notification_config c
     JOIN public.a_homebase h ON h.id = c.homebase_id
     WHERE c.is_enabled = true
       AND (c.last_run_date IS NULL OR c.last_run_date < $1::date)
     ORDER BY c.homebase_id`,
    [attendanceDate],
  );

  return result.rows.filter((config) => {
    const sendTime = String(config.send_time || "").slice(0, 5);
    return sendTime === currentHHmm || sendTime < currentHHmm;
  });
};

export const claimWhatsappRunDate = async (executor, homebaseId, attendanceDate) => {
  const result = await executor.query(
    `UPDATE attendance.whatsapp_notification_config
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

export const releaseWhatsappRunDate = async (executor, homebaseId, attendanceDate) => {
  await executor.query(
    `UPDATE attendance.whatsapp_notification_config
     SET last_run_date = NULL,
         updated_at = NOW()
     WHERE homebase_id = $1
       AND last_run_date = $2::date`,
    [homebaseId, attendanceDate],
  );
};

const DEFAULT_MESSAGE_TEMPLATE = `Assalamu'alaikum Bapak/Ibu {parent_name},

Berikut laporan kehadiran anak Anda hari ini ({date_label}):

{students_block}

Terima kasih.
-{school_name}`;

export const getDefaultWhatsappConfig = (homebaseId) => ({
  homebase_id: Number(homebaseId),
  is_enabled: false,
  send_time: "08:00:00",
  send_delay_min_seconds: 15,
  send_delay_max_seconds: 20,
  message_template: DEFAULT_MESSAGE_TEMPLATE,
  skip_on_holiday: true,
  last_run_date: null,
});

export const formatWhatsappTime = (value) => {
  if (!value) return "08:00";
  const text = String(value);
  return text.length >= 5 ? text.slice(0, 5) : text;
};

export const isWhatsappSendTimeDue = (sendTimeValue, currentHHmm) => {
  const sendTime = formatWhatsappTime(sendTimeValue);
  return sendTime === currentHHmm || sendTime < currentHHmm;
};

export const normalizeWhatsappTimeInput = (value) => {
  const text = String(value || "").trim();
  if (!text) return "08:00:00";
  if (/^\d{2}:\d{2}$/.test(text)) return `${text}:00`;
  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text;
  return null;
};

export const getWhatsappNotificationConfig = async (executor, homebaseId) => {
  const result = await executor.query(
    `SELECT
       c.*,
       h.name AS school_name
     FROM attendance.whatsapp_notification_config c
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
      ...getDefaultWhatsappConfig(homebaseId),
      school_name: homebase?.name || null,
      is_default: true,
    };
  }

  return {
    ...result.rows[0],
    is_default: false,
  };
};

export const upsertWhatsappNotificationConfig = async (
  executor,
  homebaseId,
  payload,
  userId,
) => {
  const sendTime = normalizeWhatsappTimeInput(payload.send_time);
  if (!sendTime) {
    throw new Error("Format send_time tidak valid. Gunakan HH:mm.");
  }

  const minDelay = Number(payload.send_delay_min_seconds ?? 15);
  const maxDelay = Number(payload.send_delay_max_seconds ?? 20);
  const messageTemplate = String(payload.message_template || "").trim();

  if (!Number.isFinite(minDelay) || minDelay < 1) {
    throw new Error("send_delay_min_seconds minimal 1 detik.");
  }
  if (!Number.isFinite(maxDelay) || maxDelay < minDelay) {
    throw new Error("send_delay_max_seconds harus >= send_delay_min_seconds.");
  }
  if (!messageTemplate) {
    throw new Error("message_template wajib diisi.");
  }

  const result = await executor.query(
    `INSERT INTO attendance.whatsapp_notification_config (
       homebase_id,
       is_enabled,
       send_time,
       send_delay_min_seconds,
       send_delay_max_seconds,
       message_template,
       skip_on_holiday,
       created_by,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     ON CONFLICT (homebase_id)
     DO UPDATE SET
       is_enabled = EXCLUDED.is_enabled,
       send_time = EXCLUDED.send_time,
       send_delay_min_seconds = EXCLUDED.send_delay_min_seconds,
       send_delay_max_seconds = EXCLUDED.send_delay_max_seconds,
       message_template = EXCLUDED.message_template,
       skip_on_holiday = EXCLUDED.skip_on_holiday,
       updated_at = NOW()
     RETURNING *`,
    [
      homebaseId,
      payload.is_enabled === true,
      sendTime,
      minDelay,
      maxDelay,
      messageTemplate,
      payload.skip_on_holiday !== false,
      userId || null,
    ],
  );

  return result.rows[0];
};
