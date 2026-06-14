import crypto from "crypto";

const PREFIX = "enc:v1:";
const ALGORITHM = "aes-256-gcm";

function getEncryptionKey() {
  const raw = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!raw) return null;
  return crypto.createHash("sha256").update(raw).digest();
}

export function encryptSecret(plain) {
  if (!plain) return null;
  const key = getEncryptionKey();
  if (!key) return plain;

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decryptSecret(stored) {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored;

  const key = getEncryptionKey();
  if (!key) {
    throw new Error("SETTINGS_ENCRYPTION_KEY diperlukan untuk membaca rahasia terenkripsi");
  }

  const payload = stored.slice(PREFIX.length);
  const [ivB64, tagB64, dataB64] = payload.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const data = Buffer.from(dataB64, "base64");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
}

/** Sembunyikan nilai rahasia untuk response API admin */
export function maskSecret(value) {
  if (!value) return "";
  return "••••••••";
}

export function isMaskedSecret(value) {
  return typeof value === "string" && value.startsWith("••••");
}
