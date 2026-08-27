const TELEGRAM_API_BASE = "https://api.telegram.org";

export const callTelegramApi = async (botToken, method, payload = null) => {
  const token = String(botToken || "").trim();
  if (!token) {
    throw new Error("Bot token Telegram kosong.");
  }

  const url = `${TELEGRAM_API_BASE}/bot${token}/${method}`;
  const hasBody = payload !== null && payload !== undefined;
  const response = await fetch(url, {
    method: hasBody ? "POST" : "GET",
    headers: hasBody ? { "Content-Type": "application/json" } : undefined,
    body: hasBody ? JSON.stringify(payload) : undefined,
  });

  let data = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok || !data?.ok) {
    const description =
      data?.description || `Telegram API ${method} gagal (HTTP ${response.status}).`;
    const error = new Error(description);
    error.code = data?.error_code || response.status;
    error.telegram = data;
    throw error;
  }

  return data.result;
};

export const getTelegramMe = async (botToken) => callTelegramApi(botToken, "getMe");

export const sendTelegramText = async (botToken, chatId, text) =>
  callTelegramApi(botToken, "sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: true,
  });

export const getTelegramUpdates = async (botToken, { offset, timeout = 0, limit = 50 } = {}) =>
  callTelegramApi(botToken, "getUpdates", {
    offset: offset || undefined,
    timeout,
    limit,
    allowed_updates: ["message"],
  });

export const deleteTelegramWebhook = async (botToken, { dropPendingUpdates = false } = {}) =>
  callTelegramApi(botToken, "deleteWebhook", {
    drop_pending_updates: dropPendingUpdates === true,
  });
