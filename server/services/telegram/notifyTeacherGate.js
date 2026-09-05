import { JAKARTA_TZ } from "../attendance/rfidDailyAttendance.js";
import {
  DEFAULT_PARENT_CHECKIN_TEMPLATE,
  DEFAULT_PARENT_CHECKOUT_TEMPLATE,
  DEFAULT_STUDENT_CHECKIN_TEMPLATE,
  DEFAULT_STUDENT_CHECKOUT_TEMPLATE,
  DEFAULT_TEACHER_CHECKIN_TEMPLATE,
  DEFAULT_TEACHER_CHECKOUT_TEMPLATE,
  getAttendanceStatusLabel,
  renderGateTelegramMessage,
} from "./messageBuilder.js";
import { sendTelegramMessage } from "./telegramBotManager.js";
import { getTelegramNotificationConfig } from "./telegramConfigStore.js";

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

const pickTemplate = (config, checkinKey, checkoutKey, isCheckin, fallbackCheckin, fallbackCheckout) => {
  const selected = isCheckin ? config?.[checkinKey] : config?.[checkoutKey];
  const text = String(selected || "").trim();
  if (text) return text;
  return isCheckin ? fallbackCheckin : fallbackCheckout;
};

const sendQuietly = async ({ executor, homebaseId, chatId, message, label }) => {
  try {
    await sendTelegramMessage({
      executor,
      homebaseId,
      chatId,
      message,
    });
    return { sent: true };
  } catch (error) {
    console.error(`[telegram] gagal notifikasi gate ${label} homebase=${homebaseId}`, error);
    return {
      sent: false,
      reason: String(error?.message || "send_failed"),
    };
  }
};

const buildGateVars = ({
  name,
  teacherName,
  studentName,
  parentName,
  scannedAt,
  deviceName,
  schoolName,
  className,
  nis,
  attendanceStatus,
  isCheckin,
}) => {
  const deviceLabel = String(deviceName || "").trim();
  return {
    name,
    teacherName,
    studentName,
    parentName,
    dateLabel: formatJakartaDateLabel(scannedAt),
    timeLabel: formatJakartaTime(scannedAt),
    actionLabel: isCheckin ? "DATANG" : "PULANG",
    schoolName: schoolName || "Sekolah",
    deviceName: deviceLabel || "-",
    deviceLine: deviceLabel ? `\nLokasi: ${deviceLabel}` : "",
    className: className || "-",
    nis: nis || "-",
    statusLabel: getAttendanceStatusLabel(attendanceStatus),
  };
};

/**
 * Fire-and-forget Telegram notice after successful gate tap.
 * Teachers get their own datang/pulang message.
 * Students get theirs, and bound parents get a child datang/pulang message.
 * Does not throw to the RFID scan path.
 */
export const notifyGateTelegramTap = async (
  executor,
  {
    homebaseId,
    userId,
    userName,
    scanAction,
    scannedAt,
    deviceName = null,
    className = null,
    attendanceStatus = null,
  },
) => {
  if (scanAction !== "daily_checkin" && scanAction !== "daily_checkout") {
    return { sent: false, reason: "not_gate_action" };
  }

  try {
    const config = await getTelegramNotificationConfig(executor, homebaseId);
    const isCheckin = scanAction === "daily_checkin";
    const results = [];

    const studentResult = await executor.query(
      `SELECT
         s.user_id,
         s.telegram_chat_id,
         s.nis,
         u.full_name,
         c.name AS class_name
       FROM public.u_students s
       JOIN public.u_users u ON u.id = s.user_id
       LEFT JOIN public.a_class c ON c.id = s.current_class_id
       WHERE s.user_id = $1
         AND s.homebase_id = $2
         AND u.is_active = true
       LIMIT 1`,
      [userId, homebaseId],
    );

    const student = studentResult.rows[0];
    if (student) {
      const studentName = student.full_name || userName || "Siswa";
      const resolvedClassName = className || student.class_name || "-";
      const studentTemplate = pickTemplate(
        config,
        "student_checkin_template",
        "student_checkout_template",
        isCheckin,
        DEFAULT_STUDENT_CHECKIN_TEMPLATE,
        DEFAULT_STUDENT_CHECKOUT_TEMPLATE,
      );
      const parentTemplate = pickTemplate(
        config,
        "parent_checkin_template",
        "parent_checkout_template",
        isCheckin,
        DEFAULT_PARENT_CHECKIN_TEMPLATE,
        DEFAULT_PARENT_CHECKOUT_TEMPLATE,
      );

      if (String(student.telegram_chat_id || "").trim()) {
        results.push(
          await sendQuietly({
            executor,
            homebaseId,
            chatId: student.telegram_chat_id,
            message: renderGateTelegramMessage(
              studentTemplate,
              buildGateVars({
                name: studentName,
                studentName,
                scannedAt,
                deviceName,
                schoolName: config.school_name,
                className: resolvedClassName,
                nis: student.nis,
                attendanceStatus,
                isCheckin,
              }),
            ),
            label: `siswa user=${userId}`,
          }),
        );
      }

      const parentsResult = await executor.query(
        `SELECT
           pu.id AS parent_user_id,
           pu.full_name AS parent_name,
           p.telegram_chat_id
         FROM public.u_parent_students ps
         JOIN public.u_users pu
           ON pu.id = ps.parent_user_id
          AND pu.is_active = true
          AND pu.role = 'parent'
         JOIN public.u_parents p ON p.user_id = ps.parent_user_id
         WHERE ps.student_id = $1
           AND ps.homebase_id = $2
           AND NULLIF(TRIM(p.telegram_chat_id), '') IS NOT NULL`,
        [userId, homebaseId],
      );

      for (const parent of parentsResult.rows) {
        results.push(
          await sendQuietly({
            executor,
            homebaseId,
            chatId: parent.telegram_chat_id,
            message: renderGateTelegramMessage(
              parentTemplate,
              buildGateVars({
                name: parent.parent_name,
                studentName,
                parentName: parent.parent_name,
                scannedAt,
                deviceName,
                schoolName: config.school_name,
                className: resolvedClassName,
                nis: student.nis,
                attendanceStatus,
                isCheckin,
              }),
            ),
            label: `ortu user=${parent.parent_user_id} siswa=${userId}`,
          }),
        );
      }

      return {
        sent: results.some((item) => item.sent),
        reason: results.length ? undefined : "student_not_bound",
      };
    }

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
      return { sent: false, reason: "user_not_bound" };
    }

    const teacherName = teacher.full_name || userName || "Bapak/Ibu";
    const teacherTemplate = pickTemplate(
      config,
      "teacher_checkin_template",
      "teacher_checkout_template",
      isCheckin,
      DEFAULT_TEACHER_CHECKIN_TEMPLATE,
      DEFAULT_TEACHER_CHECKOUT_TEMPLATE,
    );

    return sendQuietly({
      executor,
      homebaseId,
      chatId: teacher.telegram_chat_id,
      message: renderGateTelegramMessage(
        teacherTemplate,
        buildGateVars({
          name: teacherName,
          teacherName,
          scannedAt,
          deviceName,
          schoolName: config.school_name,
          className,
          attendanceStatus,
          isCheckin,
        }),
      ),
      label: `guru user=${userId}`,
    });
  } catch (error) {
    console.error(
      `[telegram] gagal notifikasi gate user=${userId} homebase=${homebaseId}`,
      error,
    );
    return {
      sent: false,
      reason: String(error?.message || "send_failed"),
    };
  }
};

export const notifyTeacherGateTelegramTap = notifyGateTelegramTap;
