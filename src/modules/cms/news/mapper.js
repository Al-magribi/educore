import { sanitizePublicImageUrl } from "@/lib/images.js";

/**
 * @param {string} text
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * @param {string} html
 */
export function stripHtml(html) {
  return String(html)
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * @param {string} html
 */
export function isBodyHtmlEmpty(html) {
  return stripHtml(html).length === 0;
}

/**
 * @param {unknown} body
 * @returns {string}
 */
export function normalizeBodyHtml(body) {
  if (body && typeof body === "object" && !Array.isArray(body)) {
    if (typeof body.html === "string") return body.html;
  }

  if (Array.isArray(body)) {
    return body
      .map((p) => String(p).trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join("");
  }

  if (typeof body === "string" && body.trim()) {
    if (/<[a-z][\s\S]*>/i.test(body)) return body;
    return body
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean)
      .map((p) => `<p>${escapeHtml(p)}</p>`)
      .join("");
  }

  return "";
}

/**
 * @param {string} html
 */
export function bodyToJson(html) {
  return { format: "html", html };
}

/**
 * @param {string} html
 */
export function estimateReadMinutesFromHtml(html) {
  const text = stripHtml(html);
  const words = text ? text.split(/\s+/).length : 0;
  return Math.max(1, Math.ceil(words / 200));
}

/** @deprecated gunakan normalizeBodyHtml — untuk kompatibilitas lama */
export function normalizeBodyParagraphs(body) {
  const html = normalizeBodyHtml(body);
  if (!html) return [];
  return stripHtml(html)
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * @param {string} html
 */
export function sanitizeNewsHtml(html) {
  return String(html)
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+\s*=\s*(['"])[^'"]*\1/gi, "")
    .replace(/\s(href|src)\s*=\s*(['"])\s*javascript:[^'"]*\2/gi, "")
    .replace(/&nbsp;/gi, " ");
}

/**
 * @param {import('@prisma/client').NewsPost & { author?: { name: string } | null }} row
 */
export function mapNewsPostForPublic(row) {
  const bodyHtml = sanitizeNewsHtml(normalizeBodyHtml(row.body));
  const publishedAt = row.publishedAt ?? row.createdAt;

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    coverImage: sanitizePublicImageUrl(row.coverImage),
    coverAlt: row.coverAlt ?? "",
    category: row.category,
    author: row.author?.name ?? "Tim Humas",
    publishedAt: publishedAt.toISOString(),
    readMinutes: row.readMinutes ?? estimateReadMinutesFromHtml(bodyHtml),
    featured: row.featured,
    bodyHtml,
  };
}

/**
 * @param {import('@prisma/client').NewsPost & { author?: { name: string } | null }} row
 */
export function mapNewsPostForAdmin(row) {
  const bodyHtml = normalizeBodyHtml(row.body);

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    excerpt: row.excerpt,
    bodyHtml,
    coverImage: row.coverImage ?? "",
    coverAlt: row.coverAlt ?? "",
    category: row.category,
    authorId: row.authorId,
    authorName: row.author?.name ?? null,
    featured: row.featured,
    readMinutes: row.readMinutes,
    status: row.status,
    publishedAt: row.publishedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
