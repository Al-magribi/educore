/** Prefix URL publik untuk file yang diunggah (aman untuk client & server). */
export const UPLOAD_PUBLIC_PREFIX = "/uploads";

/**
 * @param {string|null|undefined} url
 */
export function isAppUploadUrl(url) {
  if (!url?.trim()) return false;
  const trimmed = url.trim();
  if (!trimmed.startsWith(`${UPLOAD_PUBLIC_PREFIX}/`)) return false;
  if (trimmed.includes("..")) return false;
  return true;
}

/**
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function assertAppUploadUrl(url, { optional = false } = {}) {
  if (!url?.trim()) {
    if (optional) return null;
    return null;
  }
  const trimmed = url.trim();
  if (!isAppUploadUrl(trimmed)) {
    throw new Error("Gambar harus diunggah melalui aplikasi (bukan URL eksternal).");
  }
  return trimmed;
}
