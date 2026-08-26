import pool from "../../config/connection.js";
import { getTelegramUpdates } from "./telegramApi.js";
import { handleTelegramUpdate } from "./telegramBotManager.js";
import {
  listTelegramConfigsWithToken,
  updateTelegramBotMeta,
} from "./telegramConfigStore.js";

const POLL_INTERVAL_MS = Number(process.env.TELEGRAM_POLL_INTERVAL_MS || 4000);
const inFlight = new Set();
let pollerStarted = false;

const pollHomebase = async (config) => {
  const homebaseId = Number(config.homebase_id);
  if (inFlight.has(homebaseId)) return;

  const token = String(config.bot_token || "").trim();
  if (!token) return;

  inFlight.add(homebaseId);

  try {
    const offset =
      config.last_update_id !== null && config.last_update_id !== undefined
        ? Number(config.last_update_id) + 1
        : undefined;

    const updates = await getTelegramUpdates(token, {
      offset,
      timeout: 0,
      limit: 50,
    });

    if (!Array.isArray(updates) || updates.length === 0) {
      return;
    }

    let maxUpdateId = config.last_update_id
      ? Number(config.last_update_id)
      : null;

    for (const update of updates) {
      const updateId = Number(update?.update_id);
      if (Number.isFinite(updateId)) {
        maxUpdateId =
          maxUpdateId === null ? updateId : Math.max(maxUpdateId, updateId);
      }

      try {
        await handleTelegramUpdate(pool, homebaseId, update);
      } catch (error) {
        console.error(
          `[telegram] gagal proses update homebase=${homebaseId} update=${updateId}`,
          error,
        );
      }
    }

    if (maxUpdateId !== null) {
      await updateTelegramBotMeta(pool, homebaseId, {
        last_update_id: maxUpdateId,
        bot_status: "ready",
        last_error: null,
        last_connected_at: new Date(),
      });
    }
  } catch (error) {
    const message = String(error?.message || "Gagal polling Telegram.");
    const status = error?.code === 401 ? "invalid_token" : "error";
    console.error(`[telegram] poll error homebase=${homebaseId}`, error);

    try {
      await updateTelegramBotMeta(pool, homebaseId, {
        bot_status: status,
        last_error: message,
      });
    } catch (metaError) {
      console.error(
        `[telegram] gagal update meta setelah poll error homebase=${homebaseId}`,
        metaError,
      );
    }
  } finally {
    inFlight.delete(homebaseId);
  }
};

const runPollCycle = async () => {
  try {
    const configs = await listTelegramConfigsWithToken(pool);
    await Promise.all(configs.map((config) => pollHomebase(config)));
  } catch (error) {
    console.error("[telegram] poll cycle gagal", error);
  }
};

export const startTelegramPoller = () => {
  if (pollerStarted) return;
  pollerStarted = true;

  const tick = async () => {
    await runPollCycle();
    setTimeout(tick, POLL_INTERVAL_MS);
  };

  console.log(
    `[telegram] poller started (interval=${POLL_INTERVAL_MS}ms) untuk bind /start orang tua`,
  );
  tick();
};

startTelegramPoller();
