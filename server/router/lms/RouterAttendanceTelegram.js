import { Router } from "express";
import { withQuery, withTransaction } from "../../utils/wrapper.js";
import { authorize } from "../../middleware/authorize.js";
import {
  buildTelegramDeepLink,
  ensureTelegramBotReady,
  handleTelegramUpdate,
  sendTelegramMessage,
  unbindParentTelegramChat,
  verifyAndSyncTelegramBot,
} from "../../services/telegram/telegramBotManager.js";
import { isValidTelegramChatId } from "../../services/telegram/recipientResolver.js";
import {
  getTelegramNotificationConfig,
  getTelegramParentBindStats,
  listTelegramParentBindings,
  maskBotToken,
  upsertTelegramNotificationConfig,
} from "../../services/telegram/telegramConfigStore.js";

const router = Router();

const mapConfigResponse = (row, bindStats = null) => ({
  ...row,
  send_time: undefined,
  message_template: undefined,
  skip_on_holiday: undefined,
  last_run_date: undefined,
  bot_token: undefined,
  bot_token_masked: maskBotToken(row?.bot_token),
  has_bot_token: Boolean(String(row?.bot_token || "").trim()),
  bot_deep_link_base: row?.bot_username
    ? `https://t.me/${String(row.bot_username).replace(/^@/, "")}`
    : null,
  bind_stats: bindStats,
});

router.get(
  "/attendance/telegram/config",
  authorize("satuan", "assignment:kurikulum"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const config = await getTelegramNotificationConfig(pool, homebase_id);
    const bindStats = await getTelegramParentBindStats(pool, homebase_id);

    return res.json({
      status: "success",
      data: mapConfigResponse(config, bindStats),
    });
  }),
);

router.put(
  "/attendance/telegram/config",
  authorize("satuan", "assignment:kurikulum"),
  withTransaction(async (req, res, client) => {
    const { id: userId, homebase_id } = req.user;
    const body = req.body || {};

    try {
      const existing = await getTelegramNotificationConfig(client, homebase_id);
      const nextToken =
        body.bot_token === undefined || body.bot_token === null
          ? existing.bot_token
          : String(body.bot_token).trim();

      if (body.is_enabled === true && !nextToken) {
        return res.status(400).json({
          status: "error",
          message: "Bot token wajib diisi sebelum mengaktifkan notifikasi Telegram.",
        });
      }

      await upsertTelegramNotificationConfig(
        client,
        homebase_id,
        {
          ...body,
          bot_token: body.bot_token === undefined ? undefined : nextToken || null,
          bot_username: nextToken ? existing.bot_username : null,
          bot_status: nextToken ? existing.bot_status || "disconnected" : "disconnected",
          last_error: nextToken ? existing.last_error : "Bot token belum diisi.",
          last_connected_at: nextToken ? existing.last_connected_at : null,
        },
        userId,
      );

      if (nextToken) {
        const verified = await verifyAndSyncTelegramBot(client, homebase_id, nextToken);
        if (!verified.ok && body.is_enabled === true) {
          await upsertTelegramNotificationConfig(
            client,
            homebase_id,
            {
              ...body,
              is_enabled: false,
              bot_token: nextToken,
              bot_status: verified.bot_status,
              last_error: verified.message,
            },
            userId,
          );

          return res.status(400).json({
            status: "error",
            message: verified.message || "Bot token Telegram tidak valid.",
          });
        }
      }

      const config = await getTelegramNotificationConfig(client, homebase_id);
      const bindStats = await getTelegramParentBindStats(client, homebase_id);

      return res.json({
        status: "success",
        message: "Konfigurasi notifikasi Telegram berhasil disimpan.",
        data: mapConfigResponse(config, bindStats),
      });
    } catch (error) {
      return res.status(400).json({
        status: "error",
        message: String(error?.message || "Gagal menyimpan konfigurasi Telegram."),
      });
    }
  }),
);

router.post(
  "/attendance/telegram/bot/verify",
  authorize("satuan", "assignment:kurikulum"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const config = await getTelegramNotificationConfig(pool, homebase_id);
    const token =
      String(req.body?.bot_token || "").trim() || String(config.bot_token || "").trim();

    if (!token) {
      return res.status(400).json({
        status: "error",
        message: "Bot token wajib diisi.",
      });
    }

    const verified = await verifyAndSyncTelegramBot(pool, homebase_id, token);
    const refreshed = await getTelegramNotificationConfig(pool, homebase_id);
    const bindStats = await getTelegramParentBindStats(pool, homebase_id);

    return res.status(verified.ok ? 200 : 400).json({
      status: verified.ok ? "success" : "error",
      message: verified.message,
      data: mapConfigResponse(refreshed, bindStats),
    });
  }),
);

router.get(
  "/attendance/telegram/status",
  authorize("satuan", "assignment:kurikulum"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const config = await getTelegramNotificationConfig(pool, homebase_id);
    const bindStats = await getTelegramParentBindStats(pool, homebase_id);
    const botState = await ensureTelegramBotReady(pool, homebase_id);

    return res.json({
      status: "success",
      data: {
        ...mapConfigResponse(config, bindStats),
        bot_ready: botState.ready === true,
      },
    });
  }),
);

router.get(
  "/attendance/telegram/parents",
  authorize("satuan", "assignment:kurikulum"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const config = await getTelegramNotificationConfig(pool, homebase_id);
    const parents = await listTelegramParentBindings(pool, homebase_id, {
      limit: req.query.limit,
    });

    const rows = parents.map((parent) => ({
      ...parent,
      is_bound: Boolean(String(parent.telegram_chat_id || "").trim()),
      bind_link: buildTelegramDeepLink(config.bot_username, parent.parent_user_id, "parent"),
    }));

    return res.json({
      status: "success",
      data: rows,
    });
  }),
);

router.delete(
  "/attendance/telegram/parents/:parentUserId/bind",
  authorize("satuan", "assignment:kurikulum"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const parentUserId = Number(req.params.parentUserId);

    if (!Number.isFinite(parentUserId) || parentUserId <= 0) {
      return res.status(400).json({
        status: "error",
        message: "ID orang tua tidak valid.",
      });
    }

    const result = await unbindParentTelegramChat(pool, {
      homebaseId: homebase_id,
      parentUserId,
    });

    return res.status(result.ok ? 200 : 404).json({
      status: result.ok ? "success" : "error",
      message: result.message,
    });
  }),
);

router.post(
  "/attendance/telegram/test",
  authorize("satuan", "assignment:kurikulum"),
  withQuery(async (req, res, pool) => {
    const { homebase_id } = req.user;
    const chatId = String(req.body?.chat_id || "").trim();
    const message = String(
      req.body?.message ||
        "Tes koneksi Telegram dari sistem absensi LMS. Pesan ini aman diabaikan.",
    ).trim();

    if (!chatId) {
      return res.status(400).json({
        status: "error",
        message: "chat_id wajib diisi.",
      });
    }

    if (!isValidTelegramChatId(chatId)) {
      return res.status(400).json({
        status: "error",
        message: "Format chat_id Telegram tidak valid.",
      });
    }

    const botState = await ensureTelegramBotReady(pool, homebase_id);
    if (!botState.ready) {
      return res.status(400).json({
        status: "error",
        message:
          botState.error ||
          "Bot Telegram belum siap. Simpan dan verifikasi bot token dulu.",
      });
    }

    try {
      const result = await sendTelegramMessage({
        executor: pool,
        homebaseId: homebase_id,
        chatId,
        message,
      });

      return res.json({
        status: "success",
        message: "Pesan uji coba berhasil dikirim.",
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: String(error?.message || "Gagal mengirim pesan uji coba."),
      });
    }
  }),
);

router.post(
  "/attendance/telegram/webhook/:homebaseId",
  withQuery(async (req, res, pool) => {
    const homebaseId = Number(req.params.homebaseId);
    if (!Number.isFinite(homebaseId) || homebaseId <= 0) {
      return res.status(400).json({ ok: false });
    }

    const config = await getTelegramNotificationConfig(pool, homebaseId);
    if (!String(config.bot_token || "").trim()) {
      return res.status(404).json({ ok: false });
    }

    try {
      await handleTelegramUpdate(pool, homebaseId, req.body || {});
      return res.json({ ok: true });
    } catch (error) {
      console.error(`[telegram] webhook error homebase=${homebaseId}`, error);
      return res.status(500).json({ ok: false });
    }
  }),
);

router.get(
  "/parent/telegram",
  authorize("parent"),
  withQuery(async (req, res, pool) => {
    const parentUserId = Number(req.user.id);

    const linkResult = await pool.query(
      `SELECT homebase_id
       FROM public.u_parent_students
       WHERE parent_user_id = $1
       ORDER BY id ASC
       LIMIT 1`,
      [parentUserId],
    );

    const homebaseId = Number(
      linkResult.rows[0]?.homebase_id || req.user.homebase_id || 0,
    );

    if (!homebaseId) {
      return res.json({
        status: "success",
        data: {
          is_bound: false,
          telegram_chat_id: null,
          bot_username: null,
          bind_link: null,
          bot_ready: false,
        },
      });
    }

    const config = await getTelegramNotificationConfig(pool, homebaseId);
    const parentResult = await pool.query(
      `SELECT MAX(NULLIF(TRIM(telegram_chat_id), '')) AS telegram_chat_id
       FROM public.u_parents
       WHERE user_id = $1`,
      [parentUserId],
    );

    const chatId = parentResult.rows[0]?.telegram_chat_id || null;

    return res.json({
      status: "success",
      data: {
        is_bound: Boolean(String(chatId || "").trim()),
        telegram_chat_id: chatId,
        bot_username: config.bot_username || null,
        bind_link: buildTelegramDeepLink(config.bot_username, parentUserId, "parent"),
        bot_ready: config.bot_status === "ready" && Boolean(config.bot_username),
      },
    });
  }),
);

router.get(
  "/teacher/telegram",
  authorize("teacher"),
  withQuery(async (req, res, pool) => {
    const teacherUserId = Number(req.user.id);
    const homebaseId = Number(req.user.homebase_id || 0);

    if (!homebaseId) {
      return res.json({
        status: "success",
        data: {
          is_bound: false,
          telegram_chat_id: null,
          bot_username: null,
          bind_link: null,
          bot_ready: false,
        },
      });
    }

    const config = await getTelegramNotificationConfig(pool, homebaseId);
    const teacherResult = await pool.query(
      `SELECT telegram_chat_id
       FROM public.u_teachers
       WHERE user_id = $1
         AND homebase_id = $2
       LIMIT 1`,
      [teacherUserId, homebaseId],
    );

    const chatId = teacherResult.rows[0]?.telegram_chat_id || null;

    return res.json({
      status: "success",
      data: {
        is_bound: Boolean(String(chatId || "").trim()),
        telegram_chat_id: chatId,
        bot_username: config.bot_username || null,
        bind_link: buildTelegramDeepLink(config.bot_username, teacherUserId, "teacher"),
        bot_ready: config.bot_status === "ready" && Boolean(config.bot_username),
      },
    });
  }),
);

router.get(
  "/student/telegram",
  authorize("student"),
  withQuery(async (req, res, pool) => {
    const studentUserId = Number(req.user.id);
    const homebaseId = Number(req.user.homebase_id || 0);

    if (!homebaseId) {
      return res.json({
        status: "success",
        data: {
          is_bound: false,
          telegram_chat_id: null,
          bot_username: null,
          bind_link: null,
          bot_ready: false,
        },
      });
    }

    const config = await getTelegramNotificationConfig(pool, homebaseId);
    const studentResult = await pool.query(
      `SELECT telegram_chat_id
       FROM public.u_students
       WHERE user_id = $1
         AND homebase_id = $2
       LIMIT 1`,
      [studentUserId, homebaseId],
    );

    const chatId = studentResult.rows[0]?.telegram_chat_id || null;

    return res.json({
      status: "success",
      data: {
        is_bound: Boolean(String(chatId || "").trim()),
        telegram_chat_id: chatId,
        bot_username: config.bot_username || null,
        bind_link: buildTelegramDeepLink(config.bot_username, studentUserId, "student"),
        bot_ready: config.bot_status === "ready" && Boolean(config.bot_username),
      },
    });
  }),
);

export default router;
