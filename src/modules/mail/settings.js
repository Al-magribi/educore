import { prisma } from "@/lib/db.js";
import { decryptSecret, encryptSecret, isMaskedSecret, maskSecret } from "@/lib/secrets.js";

const SETTINGS_ID = "default";

function toAdminSmtpSettings(row) {
  if (!row) return null;
  return {
    enabled: row.enabled,
    host: row.host,
    port: row.port,
    secure: row.secure,
    user: row.user,
    password: row.password ? maskSecret(row.password) : "",
    fromName: row.fromName,
    fromEmail: row.fromEmail,
    passwordSet: Boolean(row.password),
    updatedAt: row.updatedAt,
  };
}

export async function getAdminSmtpSettings() {
  const row = await prisma.smtpSettings.findUnique({ where: { id: SETTINGS_ID } });
  return toAdminSmtpSettings(row);
}

/** Untuk pengiriman email di server */
export async function getSmtpSettingsForServer() {
  const row = await prisma.smtpSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (!row || !row.enabled) return null;

  return {
    host: row.host,
    port: row.port,
    secure: row.secure,
    user: row.user,
    password: row.password ? decryptSecret(row.password) : null,
    fromName: row.fromName,
    fromEmail: row.fromEmail,
  };
}

export async function upsertSmtpSettings(data) {
  const existing = await prisma.smtpSettings.findUnique({ where: { id: SETTINGS_ID } });

  let password = existing?.password ?? null;
  if (data.password !== undefined) {
    if (isMaskedSecret(data.password)) {
      // keep existing
    } else if (data.password === "" || data.password === null) {
      password = null;
    } else {
      password = encryptSecret(data.password);
    }
  }

  const row = await prisma.smtpSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      enabled: data.enabled ?? false,
      host: data.host ?? "smtp.gmail.com",
      port: data.port ?? 587,
      secure: data.secure ?? false,
      user: data.user ?? null,
      password,
      fromName: data.fromName ?? null,
      fromEmail: data.fromEmail ?? null,
    },
    update: {
      enabled: data.enabled,
      host: data.host,
      port: data.port,
      secure: data.secure,
      user: data.user,
      password,
      fromName: data.fromName,
      fromEmail: data.fromEmail,
    },
  });

  return toAdminSmtpSettings(row);
}
