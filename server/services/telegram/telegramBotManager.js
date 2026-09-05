import {
  getTelegramMe,
  sendTelegramText,
} from "./telegramApi.js";
import {
  getTelegramNotificationConfig,
  updateTelegramBotMeta,
} from "./telegramConfigStore.js";

const BIND_PREFIX = {
  parent: "p",
  teacher: "t",
  student: "s",
};

export const buildTelegramBindPayload = (userId, role = "parent") => {
  const prefix = BIND_PREFIX[role] || "p";
  return `${prefix}${Number(userId)}`;
};

export const parseTelegramBindPayload = (text) => {
  const raw = String(text || "").trim();
  if (!raw) return null;

  const startMatch = raw.match(/^\/start(?:@\w+)?(?:\s+(.+))?$/i);
  const payload = startMatch ? String(startMatch[1] || "").trim() : raw;
  if (!payload) return { type: "start_plain" };

  const parentMatch = payload.match(/^p[_-]?(\d+)$/i);
  if (parentMatch) {
    return {
      type: "bind_parent",
      parent_user_id: Number(parentMatch[1]),
    };
  }

  const teacherMatch = payload.match(/^t[_-]?(\d+)$/i);
  if (teacherMatch) {
    return {
      type: "bind_teacher",
      teacher_user_id: Number(teacherMatch[1]),
    };
  }

  const studentMatch = payload.match(/^s[_-]?(\d+)$/i);
  if (studentMatch) {
    return {
      type: "bind_student",
      student_user_id: Number(studentMatch[1]),
    };
  }

  return { type: "unknown", payload };
};

export const buildTelegramDeepLink = (botUsername, userId, role = "parent") => {
  const username = String(botUsername || "").replace(/^@/, "").trim();
  if (!username) return null;
  return `https://t.me/${username}?start=${buildTelegramBindPayload(userId, role)}`;
};

export const verifyAndSyncTelegramBot = async (executor, homebaseId, botToken) => {
  const token = String(botToken || "").trim();
  if (!token) {
    await updateTelegramBotMeta(executor, homebaseId, {
      bot_username: null,
      bot_status: "disconnected",
      last_error: "Bot token belum diisi.",
    });
    return {
      ok: false,
      bot_status: "disconnected",
      message: "Bot token belum diisi.",
    };
  }

  try {
    const me = await getTelegramMe(token);
    const username = me?.username || null;

    await updateTelegramBotMeta(executor, homebaseId, {
      bot_username: username,
      bot_status: "ready",
      last_error: null,
      last_connected_at: new Date(),
    });

    return {
      ok: true,
      bot_status: "ready",
      bot_username: username,
      bot_id: me?.id || null,
      message: "Bot Telegram terverifikasi.",
    };
  } catch (error) {
    const message = String(error?.message || "Gagal memverifikasi bot Telegram.");
    const status = error?.code === 401 ? "invalid_token" : "error";

    await updateTelegramBotMeta(executor, homebaseId, {
      bot_status: status,
      last_error: message,
    });

    return {
      ok: false,
      bot_status: status,
      message,
    };
  }
};

export const ensureTelegramBotReady = async (executor, homebaseId) => {
  const config = await getTelegramNotificationConfig(executor, homebaseId);
  const token = String(config.bot_token || "").trim();

  if (!token) {
    return {
      ready: false,
      reason: "bot_token_missing",
      bot_status: config.bot_status || "disconnected",
    };
  }

  if (config.bot_status === "ready") {
    return {
      ready: true,
      config,
      bot_token: token,
    };
  }

  const verified = await verifyAndSyncTelegramBot(executor, homebaseId, token);
  if (!verified.ok) {
    return {
      ready: false,
      reason: verified.bot_status || "bot_not_ready",
      bot_status: verified.bot_status,
      error: verified.message,
    };
  }

  const refreshed = await getTelegramNotificationConfig(executor, homebaseId);
  return {
    ready: true,
    config: refreshed,
    bot_token: token,
  };
};

export const sendTelegramMessage = async ({ executor, homebaseId, chatId, message }) => {
  const state = await ensureTelegramBotReady(executor, homebaseId);
  if (!state.ready) {
    throw new Error(state.error || "Bot Telegram belum siap.");
  }

  const result = await sendTelegramText(state.bot_token, chatId, message);
  return {
    messageId: result?.message_id ? String(result.message_id) : null,
    chatId: String(chatId),
  };
};

export const bindParentTelegramChat = async (
  executor,
  { homebaseId, parentUserId, chatId },
) => {
  const parentCheck = await executor.query(
    `SELECT
       u.id,
       u.full_name,
       p.telegram_chat_id
     FROM public.u_users u
     JOIN public.u_parent_students ps
       ON ps.parent_user_id = u.id
      AND ps.homebase_id = $1
     LEFT JOIN public.u_parents p ON p.user_id = u.id
     WHERE u.id = $2
       AND u.role = 'parent'
       AND u.is_active = true
     LIMIT 1`,
    [homebaseId, parentUserId],
  );

  const parent = parentCheck.rows[0];
  if (!parent) {
    return {
      ok: false,
      message: "Akun orang tua tidak ditemukan di sekolah ini.",
    };
  }

  await executor.query(
    `INSERT INTO public.u_parents (user_id, telegram_chat_id)
     VALUES ($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET telegram_chat_id = EXCLUDED.telegram_chat_id`,
    [parentUserId, String(chatId)],
  );

  return {
    ok: true,
    parent_user_id: Number(parent.id),
    parent_name: parent.full_name,
    chat_id: String(chatId),
    message: `Berhasil terhubung sebagai ${parent.full_name}.`,
  };
};

export const bindTeacherTelegramChat = async (
  executor,
  { homebaseId, teacherUserId, chatId },
) => {
  const teacherCheck = await executor.query(
    `SELECT
       u.id,
       u.full_name,
       t.telegram_chat_id
     FROM public.u_users u
     JOIN public.u_teachers t
       ON t.user_id = u.id
      AND t.homebase_id = $1
     WHERE u.id = $2
       AND u.role = 'teacher'
       AND u.is_active = true
     LIMIT 1`,
    [homebaseId, teacherUserId],
  );

  const teacher = teacherCheck.rows[0];
  if (!teacher) {
    return {
      ok: false,
      message: "Akun guru tidak ditemukan di sekolah ini.",
    };
  }

  await executor.query(
    `UPDATE public.u_teachers
     SET telegram_chat_id = $2
     WHERE user_id = $1
       AND homebase_id = $3`,
    [teacherUserId, String(chatId), homebaseId],
  );

  return {
    ok: true,
    teacher_user_id: Number(teacher.id),
    teacher_name: teacher.full_name,
    chat_id: String(chatId),
    message: `Berhasil terhubung sebagai ${teacher.full_name}.`,
  };
};

export const bindStudentTelegramChat = async (
  executor,
  { homebaseId, studentUserId, chatId },
) => {
  const studentCheck = await executor.query(
    `SELECT
       u.id,
       u.full_name,
       s.telegram_chat_id
     FROM public.u_users u
     JOIN public.u_students s
       ON s.user_id = u.id
      AND s.homebase_id = $1
     WHERE u.id = $2
       AND u.role = 'student'
       AND u.is_active = true
     LIMIT 1`,
    [homebaseId, studentUserId],
  );

  const student = studentCheck.rows[0];
  if (!student) {
    return {
      ok: false,
      message: "Akun siswa tidak ditemukan di sekolah ini.",
    };
  }

  await executor.query(
    `UPDATE public.u_students
     SET telegram_chat_id = $2
     WHERE user_id = $1
       AND homebase_id = $3`,
    [studentUserId, String(chatId), homebaseId],
  );

  return {
    ok: true,
    student_user_id: Number(student.id),
    student_name: student.full_name,
    chat_id: String(chatId),
    message: `Berhasil terhubung sebagai ${student.full_name}.`,
  };
};

export const unbindParentTelegramChat = async (executor, { homebaseId, parentUserId }) => {
  const result = await executor.query(
    `UPDATE public.u_parents p
     SET telegram_chat_id = NULL
     FROM public.u_parent_students ps
     WHERE p.user_id = ps.parent_user_id
       AND ps.parent_user_id = $2
       AND ps.homebase_id = $1
     RETURNING p.user_id`,
    [homebaseId, parentUserId],
  );

  return {
    ok: result.rowCount > 0,
    message:
      result.rowCount > 0
        ? "Ikatan Telegram orang tua dilepas."
        : "Orang tua tidak ditemukan atau belum terikat.",
  };
};

export const handleTelegramUpdate = async (executor, homebaseId, update) => {
  const message = update?.message;
  const text = String(message?.text || "").trim();
  const chatId = message?.chat?.id;

  if (!text || chatId === undefined || chatId === null) {
    return { handled: false };
  }

  const parsed = parseTelegramBindPayload(text);

  if (parsed?.type === "start_plain") {
    await sendTelegramMessage({
      executor,
      homebaseId,
      chatId,
      message:
        "Assalamu'alaikum. Bot notifikasi absensi siap.\n\nBuka tautan khusus dari portal orang tua, dashboard guru, atau dashboard siswa, lalu tekan Start agar akun Anda terhubung.",
    });
    return { handled: true, action: "start_help" };
  }

  if (parsed?.type === "bind_parent") {
    const bindResult = await bindParentTelegramChat(executor, {
      homebaseId,
      parentUserId: parsed.parent_user_id,
      chatId,
    });

    await sendTelegramMessage({
      executor,
      homebaseId,
      chatId,
      message: bindResult.ok
        ? `${bindResult.message}\n\nAnda akan menerima laporan kehadiran anak dan notifikasi datang/pulang melalui chat ini.`
        : bindResult.message,
    });

    return {
      handled: true,
      action: "bind_parent",
      ...bindResult,
    };
  }

  if (parsed?.type === "bind_teacher") {
    const bindResult = await bindTeacherTelegramChat(executor, {
      homebaseId,
      teacherUserId: parsed.teacher_user_id,
      chatId,
    });

    await sendTelegramMessage({
      executor,
      homebaseId,
      chatId,
      message: bindResult.ok
        ? `${bindResult.message}\n\nAnda akan menerima notifikasi saat tap absensi datang/pulang di mesin RFID.`
        : bindResult.message,
    });

    return {
      handled: true,
      action: "bind_teacher",
      ...bindResult,
    };
  }

  if (parsed?.type === "bind_student") {
    const bindResult = await bindStudentTelegramChat(executor, {
      homebaseId,
      studentUserId: parsed.student_user_id,
      chatId,
    });

    await sendTelegramMessage({
      executor,
      homebaseId,
      chatId,
      message: bindResult.ok
        ? `${bindResult.message}\n\nAnda akan menerima notifikasi saat tap absensi datang/pulang di mesin RFID.`
        : bindResult.message,
    });

    return {
      handled: true,
      action: "bind_student",
      ...bindResult,
    };
  }

  if (text.startsWith("/")) {
    await sendTelegramMessage({
      executor,
      homebaseId,
      chatId,
      message:
        "Perintah tidak dikenali. Gunakan tautan bind dari portal sekolah, lalu tekan Start.",
    });
    return { handled: true, action: "unknown_command" };
  }

  return { handled: false };
};
