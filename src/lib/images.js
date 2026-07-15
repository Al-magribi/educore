import { isAppUploadUrl } from "@/lib/storage/urls.js";

/** @param {string|null|undefined} url */
export function hasImageUrl(url) {
  return isAppUploadUrl(url);
}

/** URL gambar yang aman untuk ditampilkan di situs publik. */
export function sanitizePublicImageUrl(url) {
  return isAppUploadUrl(url) ? url.trim() : null;
}

/**
 * Upload CMS sudah WebP via Sharp — skip optimizer Next.js.
 * @param {string|null|undefined} src
 */
export function shouldSkipImageOptimizer(src) {
  return isAppUploadUrl(src);
}
