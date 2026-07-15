import "server-only";
import path from "node:path";
import { UPLOAD_PUBLIC_PREFIX } from "./urls.js";

/** Root folder penyimpanan file di disk (default: public/uploads). */
export function getUploadRoot() {
  const custom = process.env.UPLOAD_DIR?.trim();
  if (custom) return path.resolve(custom);
  return path.join(process.cwd(), "public", "uploads");
}

/**
 * Apakah root upload sama dengan `public/uploads`.
 * File tetap dilayani lewat `app/uploads/[...path]/route.js` di kedua kasus.
 */
export function isServedFromPublicDir() {
  const root = getUploadRoot();
  const publicUploads = path.join(process.cwd(), "public", "uploads");
  return root === publicUploads;
}

/**
 * URL publik untuk file yang disimpan.
 * @param {string} relativePath e.g. cms/2026/05/abc.jpg
 */
export function toPublicUploadUrl(relativePath) {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  return `${UPLOAD_PUBLIC_PREFIX}/${normalized}`;
}

/**
 * @param {string} publicUrl path dimulai dengan /uploads/
 */
export function resolveUploadFromPublicUrl(publicUrl) {
  if (!publicUrl?.startsWith(`${UPLOAD_PUBLIC_PREFIX}/`)) {
    throw new Error("Path upload tidak valid");
  }
  const relative = publicUrl.slice(UPLOAD_PUBLIC_PREFIX.length + 1);
  return resolveUploadRelativePath(relative.split("/"));
}

/**
 * @param {string[]} segments
 */
export function resolveUploadRelativePath(segments) {
  const root = getUploadRoot();
  const safe = segments.filter((s) => s && s !== "." && s !== "..");
  const absolute = path.resolve(root, ...safe);

  if (!absolute.startsWith(root + path.sep) && absolute !== root) {
    throw new Error("Path traversal ditolak");
  }

  return absolute;
}
