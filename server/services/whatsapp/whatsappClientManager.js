import path from "path";
import fs from "fs";
import whatsappWeb from "whatsapp-web.js";
import pool from "../../config/connection.js";
import { toWhatsAppChatId } from "./phoneUtils.js";
import { updateWhatsappSession } from "./whatsappSessionStore.js";

const { Client, LocalAuth } = whatsappWeb;

const CLIENT_READY_TIMEOUT_MS = Number(process.env.WWEBJS_READY_TIMEOUT_MS || 120000);
const AUTH_BASE_PATH =
  process.env.WWEBJS_AUTH_PATH || path.join(process.cwd(), ".wwebjs_auth");

const clientRegistry = new Map();

const buildAuthPath = (homebaseId) =>
  path.join(AUTH_BASE_PATH, `homebase_${homebaseId}`);

const ensureAuthDirectory = (homebaseId) => {
  const authPath = buildAuthPath(homebaseId);
  fs.mkdirSync(authPath, { recursive: true });
  return authPath;
};

const resolveMessageId = (message) => {
  if (!message?.id) return null;
  if (typeof message.id === "string") return message.id;
  return message.id._serialized || message.id.id || null;
};

const persistSession = async (homebaseId, fields) => {
  try {
    await updateWhatsappSession(pool, homebaseId, fields);
  } catch (error) {
    console.error(
      `[whatsapp] gagal menyimpan session homebase=${homebaseId}`,
      error,
    );
  }
};

const attachClientEvents = (homebaseId, client, entry) => {
  client.on("qr", async (qr) => {
    entry.isReady = false;
    await persistSession(homebaseId, {
      session_status: "qr_pending",
      qr_code: qr,
      qr_generated_at: new Date(),
      last_error: null,
    });
  });

  client.on("authenticated", async () => {
    await persistSession(homebaseId, {
      session_status: "authenticated",
      last_error: null,
    });
  });

  client.on("ready", async () => {
    entry.isReady = true;

    let connectedPhone = null;
    try {
      const wid = client.info?.wid;
      connectedPhone = wid?.user || null;
    } catch {
      connectedPhone = null;
    }

    await persistSession(homebaseId, {
      session_status: "ready",
      connected_phone: connectedPhone,
      qr_code: null,
      qr_generated_at: null,
      last_connected_at: new Date(),
      last_error: null,
    });

    if (entry.readyResolve) {
      entry.readyResolve(client);
      entry.readyResolve = null;
      entry.readyReject = null;
    }
  });

  client.on("auth_failure", async (message) => {
    entry.isReady = false;
    await persistSession(homebaseId, {
      session_status: "auth_failure",
      last_error: String(message || "auth_failure"),
      last_disconnected_at: new Date(),
    });

    if (entry.readyReject) {
      entry.readyReject(new Error(String(message || "auth_failure")));
      entry.readyResolve = null;
      entry.readyReject = null;
    }
  });

  client.on("disconnected", async (reason) => {
    entry.isReady = false;
    await persistSession(homebaseId, {
      session_status: "disconnected",
      last_error: String(reason || "disconnected"),
      last_disconnected_at: new Date(),
    });
  });
};

const waitForClientReady = (entry) =>
  new Promise((resolve, reject) => {
    if (entry.isReady) {
      resolve(entry.client);
      return;
    }

    entry.readyResolve = resolve;
    entry.readyReject = reject;

    setTimeout(() => {
      if (!entry.isReady) {
        reject(new Error("WhatsApp client ready timeout"));
      }
    }, CLIENT_READY_TIMEOUT_MS);
  });

export const getWhatsappClientEntry = (homebaseId) =>
  clientRegistry.get(Number(homebaseId)) || null;

export const isWhatsappClientReady = (homebaseId) => {
  const entry = getWhatsappClientEntry(homebaseId);
  return entry?.isReady === true;
};

export const initializeWhatsappClient = async (homebaseId) => {
  const normalizedHomebaseId = Number(homebaseId);
  const existing = clientRegistry.get(normalizedHomebaseId);

  if (existing?.initPromise) {
    return existing.initPromise;
  }

  if (existing?.isReady) {
    return existing.client;
  }

  const entry = existing || {
    client: null,
    isReady: false,
    initPromise: null,
    readyResolve: null,
    readyReject: null,
  };

  entry.initPromise = (async () => {
    await persistSession(normalizedHomebaseId, {
      session_status: "initializing",
      last_error: null,
    });

    if (!entry.client) {
      const authPath = ensureAuthDirectory(normalizedHomebaseId);
      const client = new Client({
        authStrategy: new LocalAuth({
          clientId: `homebase_${normalizedHomebaseId}`,
          dataPath: authPath,
        }),
        puppeteer: {
          headless: true,
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      });

      entry.client = client;
      attachClientEvents(normalizedHomebaseId, client, entry);
      clientRegistry.set(normalizedHomebaseId, entry);

      await client.initialize();
    }

    if (!entry.isReady) {
      await waitForClientReady(entry);
    }

    return entry.client;
  })();

  try {
    return await entry.initPromise;
  } finally {
    entry.initPromise = null;
  }
};

export const ensureWhatsappClientReady = async (homebaseId) => {
  const normalizedHomebaseId = Number(homebaseId);
  const entry = getWhatsappClientEntry(normalizedHomebaseId);

  if (entry?.isReady) {
    return entry.client;
  }

  return initializeWhatsappClient(normalizedHomebaseId);
};

export const sendWhatsappMessage = async ({ homebaseId, phone, message }) => {
  const chatId = toWhatsAppChatId(phone);
  if (!chatId) {
    throw new Error("Nomor telepon tidak valid.");
  }

  const client = await ensureWhatsappClientReady(homebaseId);
  const result = await client.sendMessage(chatId, message);

  return {
    chatId,
    messageId: resolveMessageId(result),
  };
};

export const destroyWhatsappClient = async (homebaseId) => {
  const normalizedHomebaseId = Number(homebaseId);
  const entry = clientRegistry.get(normalizedHomebaseId);
  if (!entry?.client) return;

  try {
    await entry.client.destroy();
  } catch (error) {
    console.error(
      `[whatsapp] gagal destroy client homebase=${normalizedHomebaseId}`,
      error,
    );
  }

  clientRegistry.delete(normalizedHomebaseId);
  await persistSession(normalizedHomebaseId, {
    session_status: "disconnected",
    last_disconnected_at: new Date(),
  });
};
