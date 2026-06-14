import { isAppUploadUrl } from "@/lib/storage/urls.js";

/** @param {string|null|undefined} url */
export function hasImageUrl(url) {
  return isAppUploadUrl(url);
}

/** URL gambar yang aman untuk ditampilkan di situs publik. */
export function sanitizePublicImageUrl(url) {
  return isAppUploadUrl(url) ? url.trim() : null;
}
