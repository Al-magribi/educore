import pool from "../../config/connection.js";
import { deleteTelegramWebhook, getTelegramUpdates } from "./telegramApi.js";
import { handleTelegramUpdate } from "./telegramBotManager.js";
import {
  listTelegramConfigsWithToken,
  updateTelegramBotMeta,
} from "./telegramConfigStore.js";

const POLL_INTERVAL_MS = Number(process.env.TELEGRAM_POLL_INTERVAL_MS || 4000);
const CONFLICT_BACKOFF_MS = Number(process.env.TELEGRAM_CONFLICT_BACKOFF_MS || 30000);

const GLOBAL_KEY = "__educoreTelegramPollerState";

const getState = () => {
  if (!globalThis[GLOBAL_KEY]) {
    globalThis[GLOBAL_KEY] = {
      started: false,
      timer: null,
      inFlightTokens: new Set(),
      webhookCleared: new Set(),
      conflictUntil: new Map(),
      lastConflictLogAt: new Map(),
    };
  }
  return globalThis[GLOBAL_KEY];
};

const groupConfigsByToken = (configs) => {
  const groups = new Map();

  for (const config of configs) {
    const token = String(config.bot_token || "").trim();
    if (!token) continue;

    if (!groups.has(token)) {
      groups.set(token, []);
    }
    groups.get(token).push(config);
  }

  return groups;
};

const getSharedOffset = (configs) => {
  let maxUpdateId = null;

  for (const config of configs) {
    if (config.last_update_id === null || config.last_update_id === undefined) {
      continue;
    }
    const value = Number(config.last_update_id);
    if (!Number.isFinite(value)) continue;
    maxUpdateId = maxUpdateId === null ? value : Math.max(maxUpdateId, value);
  }

  return maxUpdateId === null ? undefined : maxUpdateId + 1;
};

const ensureWebhookCleared = async (token) => {
  const state = getState();
  if (state.webhookCleared.has(token)) return;

  try {
    await deleteTelegramWebhook(token, { dropPendingUpdates: false });
  } catch (error) {
    // Non-fatal: polling still works if webhook was already empty.
    console.warn(
      `[telegram] deleteWebhook gagal (lanjut polling): ${error?.message || error}`,
    );
  }

  state.webhookCleared.add(token);
};

const markConfigsReady = async (configs, maxUpdateId) => {
  const now = new Date();

  await Promise.all(
    configs.map((config) =>
      updateTelegramBotMeta(pool, Number(config.homebase_id), {
        last_update_id: maxUpdateId,
        bot_status: "ready",
        last_error: null,
        last_connected_at: now,
      }),
    ),
  );
};

const handleConflict = (token, configs, error) => {
  const state = getState();
  const until = Date.now() + CONFLICT_BACKOFF_MS;
  state.conflictUntil.set(token, until);

  const lastLog = state.lastConflictLogAt.get(token) || 0;
  if (Date.now() - lastLog > CONFLICT_BACKOFF_MS) {
    state.lastConflictLogAt.set(token, Date.now());
    const homebases = configs.map((item) => item.homebase_id).join(",");
    console.warn(
      `[telegram] getUpdates conflict untuk token homebase=[${homebases}]. ` +
        `Backoff ${Math.round(CONFLICT_BACKOFF_MS / 1000)}s. ` +
        `Pastikan hanya 1 proses server yang berjalan (jangan dobel npm run dev).`,
      error?.message || error,
    );
  }
};

const pollTokenGroup = async (token, configs) => {
  const state = getState();
  if (state.inFlightTokens.has(token)) return;

  const conflictUntil = state.conflictUntil.get(token) || 0;
  if (Date.now() < conflictUntil) return;

  state.inFlightTokens.add(token);

  try {
    await ensureWebhookCleared(token);

    const offset = getSharedOffset(configs);
    const updates = await getTelegramUpdates(token, {
      offset,
      timeout: 0,
      limit: 50,
    });

    state.conflictUntil.delete(token);

    if (!Array.isArray(updates) || updates.length === 0) {
      return;
    }

    let maxUpdateId = offset ? offset - 1 : null;

    for (const update of updates) {
      const updateId = Number(update?.update_id);
      if (Number.isFinite(updateId)) {
        maxUpdateId =
          maxUpdateId === null ? updateId : Math.max(maxUpdateId, updateId);
      }

      for (const config of configs) {
        const homebaseId = Number(config.homebase_id);
        try {
          await handleTelegramUpdate(pool, homebaseId, update);
        } catch (error) {
          console.error(
            `[telegram] gagal proses update homebase=${homebaseId} update=${updateId}`,
            error,
          );
        }
      }
    }

    if (maxUpdateId !== null) {
      await markConfigsReady(configs, maxUpdateId);
    }
  } catch (error) {
    if (Number(error?.code) === 409) {
      handleConflict(token, configs, error);
      return;
    }

    const message = String(error?.message || "Gagal polling Telegram.");
    const status = error?.code === 401 ? "invalid_token" : "error";
    console.error(
      `[telegram] poll error homebase=[${configs.map((item) => item.homebase_id).join(",")}]`,
      error,
    );

    await Promise.all(
      configs.map(async (config) => {
        try {
          await updateTelegramBotMeta(pool, Number(config.homebase_id), {
            bot_status: status,
            last_error: message,
          });
        } catch (metaError) {
          console.error(
            `[telegram] gagal update meta setelah poll error homebase=${config.homebase_id}`,
            metaError,
          );
        }
      }),
    );
  } finally {
    state.inFlightTokens.delete(token);
  }
};

const runPollCycle = async () => {
  try {
    const configs = await listTelegramConfigsWithToken(pool);
    const groups = groupConfigsByToken(configs);

    // Serial per cycle agar token yang sama tidak dipanggil paralel.
    for (const [token, group] of groups.entries()) {
      await pollTokenGroup(token, group);
    }
  } catch (error) {
    console.error("[telegram] poll cycle gagal", error);
  }
};

export const startTelegramPoller = () => {
  const state = getState();
  if (state.started) return;

  state.started = true;

  const tick = async () => {
    await runPollCycle();
    state.timer = setTimeout(tick, POLL_INTERVAL_MS);
  };

  console.log(
    `[telegram] poller started (interval=${POLL_INTERVAL_MS}ms) untuk bind /start orang tua`,
  );
  tick();
};

startTelegramPoller();
