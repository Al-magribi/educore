import path from "path";
import fs from "fs";
import whatsappWeb from "whatsapp-web.js";
import pool from "../../config/connection.js";
import { toWhatsAppChatId } from "./phoneUtils.js";
import { sleep } from "./sendQueue.js";
import { updateWhatsappSession } from "./whatsappSessionStore.js";

const { Client, LocalAuth } = whatsappWeb;

const CLIENT_READY_TIMEOUT_MS = Number(process.env.WWEBJS_READY_TIMEOUT_MS || 120000);
const AUTH_BASE_PATH =
  process.env.WWEBJS_AUTH_PATH || path.join(process.cwd(), ".wwebjs_auth");

const clientRegistry = new Map();

const PUPPETEER_OPTIONS = {
  headless: true,
  args: [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--no-first-run",
    "--no-zygote",
  ],
};

const buildAuthPath = (homebaseId) =>
  path.join(AUTH_BASE_PATH, `homebase_${homebaseId}`);

const buildSessionDirName = (homebaseId) => `session-homebase_${Number(homebaseId)}`;

const getAuthPathsToClear = (homebaseId) => {
  const normalizedHomebaseId = Number(homebaseId);
  const homebaseAuthPath = buildAuthPath(normalizedHomebaseId);
  const sessionDirName = buildSessionDirName(normalizedHomebaseId);

  return [
    path.join(homebaseAuthPath, sessionDirName),
    homebaseAuthPath,
    path.join(AUTH_BASE_PATH, sessionDirName),
  ];
};

const removePathWithRetry = async (targetPath, maxAttempts = 6) => {
  if (!targetPath || !fs.existsSync(targetPath)) return true;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await fs.promises.rm(targetPath, {
        recursive: true,
        force: true,
        maxRetries: 3,
        retryDelay: 300,
      });
      return true;
    } catch (error) {
      if (attempt === maxAttempts) {
        console.error(`[whatsapp] gagal hapus folder auth: ${targetPath}`, error);
        return false;
      }
      await sleep(400 * attempt);
    }
  }

  return false;
};

const ensureAuthDirectory = (homebaseId) => {
  const authPath = buildAuthPath(homebaseId);
  fs.mkdirSync(authPath, { recursive: true });
  return authPath;
};

const clearAuthDirectory = async (homebaseId) => {
  const paths = getAuthPathsToClear(homebaseId);
  let cleared = 0;

  for (const authPath of paths) {
    const removed = await removePathWithRetry(authPath);
    if (removed) cleared += 1;
  }

  console.log(
    `[whatsapp] auth folder dibersihkan homebase=${homebaseId} (${cleared}/${paths.length} path)`,
  );
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

const rejectPendingReady = (entry, reason = "Session di-reset") => {
  if (!entry?.readyReject) return;
  entry.readyReject(new Error(reason));
  entry.readyResolve = null;
  entry.readyReject = null;
};

const attachClientEvents = (homebaseId, client, entry) => {
  client.on("qr", async (qr) => {
    entry.isReady = false;
    await persistSession(homebaseId, {
      session_status: "qr_pending",
      qr_code: qr,
      qr_generated_at: new Date(),
      connected_phone: null,
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
      connected_phone: null,
      qr_code: null,
      last_error: String(message || "auth_failure"),
      last_disconnected_at: new Date(),
    });

    rejectPendingReady(entry, String(message || "auth_failure"));
  });

  client.on("disconnected", async (reason) => {
    entry.isReady = false;
    entry.client = null;
    clientRegistry.delete(Number(homebaseId));

    await persistSession(homebaseId, {
      session_status: "disconnected",
      connected_phone: null,
      qr_code: null,
      last_error: String(reason || "disconnected"),
      last_disconnected_at: new Date(),
    });

    rejectPendingReady(entry, String(reason || "disconnected"));
  });
};

const createClientEntry = (homebaseId) => {
  const entry = {
    client: null,
    isReady: false,
    initPromise: null,
    readyResolve: null,
    readyReject: null,
  };

  const authPath = ensureAuthDirectory(homebaseId);
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: `homebase_${homebaseId}`,
      dataPath: authPath,
    }),
    puppeteer: PUPPETEER_OPTIONS,
  });

  entry.client = client;
  attachClientEvents(homebaseId, client, entry);
  clientRegistry.set(Number(homebaseId), entry);

  return entry;
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

export const resetWhatsappClient = async (homebaseId) => {
  const normalizedHomebaseId = Number(homebaseId);
  const entry = clientRegistry.get(normalizedHomebaseId);

  if (entry?.initPromise) {
    try {
      await entry.initPromise;
    } catch {
      // Init gagal — lanjut reset.
    }
  }

  rejectPendingReady(entry, "Session di-reset");

  if (entry?.client) {
    try {
      await entry.client.logout().catch(() => {});
    } catch {
      // logout bisa gagal jika sesi sudah putus.
    }

    try {
      await entry.client.destroy();
    } catch (error) {
      console.error(
        `[whatsapp] gagal destroy client homebase=${normalizedHomebaseId}`,
        error,
      );
    }
  }

  clientRegistry.delete(normalizedHomebaseId);
  await sleep(800);
  await clearAuthDirectory(normalizedHomebaseId);

  await persistSession(normalizedHomebaseId, {
    session_status: "disconnected",
    connected_phone: null,
    qr_code: null,
    qr_generated_at: null,
    last_error: null,
    last_disconnected_at: new Date(),
  });
};

export const startWhatsappClient = async (homebaseId) => {
  const normalizedHomebaseId = Number(homebaseId);
  const existing = clientRegistry.get(normalizedHomebaseId);

  if (existing?.initPromise) {
    return existing.initPromise;
  }

  if (existing?.isReady && existing.client) {
    return existing.client;
  }

  if (existing?.client) {
    clientRegistry.delete(normalizedHomebaseId);
  }

  const entry = createClientEntry(normalizedHomebaseId);

  entry.initPromise = (async () => {
    await persistSession(normalizedHomebaseId, {
      session_status: "initializing",
      connected_phone: null,
      qr_code: null,
      qr_generated_at: null,
      last_error: null,
    });

    try {
      await entry.client.initialize();
      return entry.client;
    } catch (error) {
      clientRegistry.delete(normalizedHomebaseId);
      entry.client = null;
      entry.isReady = false;

      await persistSession(normalizedHomebaseId, {
        session_status: "disconnected",
        connected_phone: null,
        qr_code: null,
        last_error: String(error?.message || error),
        last_disconnected_at: new Date(),
      });

      throw error;
    }
  })();

  try {
    return await entry.initPromise;
  } finally {
    entry.initPromise = null;
  }
};

export const initializeWhatsappClient = async (homebaseId) => {
  const entry = await startWhatsappClient(homebaseId);
  const registryEntry = clientRegistry.get(Number(homebaseId));

  if (!registryEntry?.isReady) {
    await waitForClientReady(registryEntry);
  }

  return entry;
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
  await resetWhatsappClient(homebaseId);
};

export const reconnectWhatsappClient = async (homebaseId) => {
  await resetWhatsappClient(homebaseId);
  await sleep(1500);
  return startWhatsappClient(homebaseId);
};
