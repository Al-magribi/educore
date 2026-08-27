import { JAKARTA_TZ } from "../attendance/rfidDailyAttendance.js";
import { sendTelegramMessage } from "./telegramBotManager.js";

const formatJakartaTime = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const formatJakartaDateLabel = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

/**
 * Fire-and-forget Telegram notice after successful gate tap for teachers.
 * Does not throw to the RFID scan path.
 */
export const notifyTeacherGateTelegramTap = async (
  executor,
  {
    homebaseId,
    userId,
    userName,
    scanAction,
    scannedAt,
    deviceName = null,
  },
) => {
  if (scanAction !== "daily_checkin" && scanAction !== "daily_checkout") {
    return { sent: false, reason: "not_gate_action" };
  }

  try {
    const teacherResult = await executor.query(
      `SELECT
         t.user_id,
         t.telegram_chat_id,
         u.full_name
       FROM public.u_teachers t
       JOIN public.u_users u ON u.id = t.user_id
       WHERE t.user_id = $1
         AND t.homebase_id = $2
         AND u.is_active = true
         AND NULLIF(TRIM(t.telegram_chat_id), '') IS NOT NULL
       LIMIT 1`,
      [userId, homebaseId],
    );

    const teacher = teacherResult.rows[0];
    if (!teacher) {
      return { sent: false, reason: "teacher_not_bound" };
    }

    const isCheckin = scanAction === "daily_checkin";
    const timeLabel = formatJakartaTime(scannedAt);
    const dateLabel = formatJakartaDateLabel(scannedAt);
    const actionLabel = isCheckin ? "DATANG" : "PULANG";
    const deviceLine = deviceName ? `\nLokasi: ${deviceName}` : "";

    const message = `Assalamu'alaikum ${teacher.full_name || userName || "Bapak/Ibu"},

Absensi ${actionLabel} tercatat.
Tanggal: ${dateLabel}
Jam: ${timeLabel}${deviceLine}

Terima kasih.`;

    await sendTelegramMessage({
      executor,
      homebaseId,
      chatId: teacher.telegram_chat_id,
      message,
    });

    return { sent: true };
  } catch (error) {
    console.error(
      `[telegram] gagal notifikasi gate guru user=${userId} homebase=${homebaseId}`,
      error,
    );
    return {
      sent: false,
      reason: String(error?.message || "send_failed"),
    };
  }
};
