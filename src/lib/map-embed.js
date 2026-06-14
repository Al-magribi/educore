/**
 * Normalizes Google Maps embed input — accepts a plain embed URL or full iframe HTML.
 * @param {string | null | undefined} value
 * @returns {string | null}
 */
export function parseMapEmbedUrl(value) {
  if (!value || typeof value !== "string") return null;

  let trimmed = value.trim();
  if (!trimmed) return null;

  const iframeMatch = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeMatch) {
    trimmed = iframeMatch[1];
  } else {
    const srcMatch = trimmed.match(/\ssrc=["']([^"']+)["']/i);
    if (srcMatch) trimmed = srcMatch[1];
  }

  trimmed = trimmed
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();

  trimmed = trimmed.replace(/^https:\/(?!\/)/i, "https://");

  if (!/^https?:\/\//i.test(trimmed)) return null;

  return trimmed;
}
