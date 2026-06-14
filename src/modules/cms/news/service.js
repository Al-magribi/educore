import { prisma } from "@/lib/db.js";
import { assertAppUploadUrl } from "@/lib/storage/urls.js";
import { NEWS_CATEGORIES, NEWS_STATUSES } from "./constants.js";
import {
  bodyToJson,
  estimateReadMinutesFromHtml,
  isBodyHtmlEmpty,
  mapNewsPostForAdmin,
  mapNewsPostForPublic,
  normalizeBodyHtml,
} from "./mapper.js";
import { slugify } from "./slug.js";

const authorSelect = { select: { id: true, name: true } };

const postInclude = {
  author: authorSelect,
};

function parseBodyInput(bodyHtml, body) {
  if (typeof bodyHtml === "string" && bodyHtml.trim()) {
    const html = normalizeBodyHtml({ html: bodyHtml });
    if (isBodyHtmlEmpty(html)) {
      throw new Error("Isi berita wajib diisi");
    }
    return html;
  }

  const html = normalizeBodyHtml(body);
  if (isBodyHtmlEmpty(html)) {
    throw new Error("Isi berita wajib diisi");
  }
  return html;
}

function validateCategory(category) {
  const value = String(category ?? "").trim();
  if (!NEWS_CATEGORIES.includes(value)) {
    throw new Error(`Kategori harus salah satu: ${NEWS_CATEGORIES.join(", ")}`);
  }
  return value;
}

function validateStatus(status) {
  const value = String(status ?? "draft");
  if (!NEWS_STATUSES.includes(value)) {
    throw new Error("Status tidak valid");
  }
  return value;
}

async function ensureUniqueSlug(baseSlug, excludeId) {
  let slug = baseSlug || "berita";
  let suffix = 0;

  while (true) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`;
    const existing = await prisma.newsPost.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return candidate;
    suffix += 1;
  }
}

async function clearOtherFeatured(excludeId) {
  await prisma.newsPost.updateMany({
    where: {
      featured: true,
      ...(excludeId ? { NOT: { id: excludeId } } : {}),
    },
    data: { featured: false },
  });
}

/**
 * @param {object} input
 * @param {string} [authorId]
 */
function buildPostData(input, authorId) {
  const bodyHtml = parseBodyInput(input.bodyHtml, input.body);

  const title = String(input.title ?? "").trim();
  if (!title) throw new Error("Judul wajib diisi");

  const excerpt = String(input.excerpt ?? "").trim();
  if (!excerpt) throw new Error("Ringkasan wajib diisi");

  const category = validateCategory(input.category);
  const status = validateStatus(input.status);
  const featured = Boolean(input.featured);

  const coverImage = input.coverImage
    ? assertAppUploadUrl(String(input.coverImage).trim(), { optional: true })
    : null;

  const readMinutes =
    Number(input.readMinutes) > 0
      ? Math.min(60, Math.max(1, Math.round(Number(input.readMinutes))))
      : estimateReadMinutesFromHtml(bodyHtml);

  let publishedAt = input.publishedAt ? new Date(input.publishedAt) : null;
  if (status === "published" && (!publishedAt || Number.isNaN(publishedAt.getTime()))) {
    publishedAt = new Date();
  }
  if (status === "draft") {
    publishedAt = null;
  }

  return {
    title,
    excerpt,
    body: bodyToJson(bodyHtml),
    coverImage,
    coverAlt: String(input.coverAlt ?? "").trim() || null,
    category,
    featured,
    readMinutes,
    status,
    publishedAt,
    authorId: authorId ?? null,
  };
}

export async function listAdminNewsPosts() {
  const rows = await prisma.newsPost.findMany({
    orderBy: [{ updatedAt: "desc" }],
    include: postInclude,
  });
  return rows.map(mapNewsPostForAdmin);
}

export async function getAdminNewsPost(id) {
  const row = await prisma.newsPost.findUnique({
    where: { id },
    include: postInclude,
  });
  if (!row) return null;
  return mapNewsPostForAdmin(row);
}

export async function createNewsPost(input, authorId) {
  const data = buildPostData(input, authorId);
  const baseSlug = slugify(String(input.slug ?? "").trim() || data.title);
  const slug = await ensureUniqueSlug(baseSlug);

  if (data.featured) {
    await clearOtherFeatured();
  }

  const row = await prisma.newsPost.create({
    data: { ...data, slug },
    include: postInclude,
  });

  return mapNewsPostForAdmin(row);
}

export async function updateNewsPost(id, input, authorId) {
  const existing = await prisma.newsPost.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Berita tidak ditemukan");
  }

  const data = buildPostData(input, authorId ?? existing.authorId);

  let slug = existing.slug;
  const requestedSlug = String(input.slug ?? "").trim();
  if (requestedSlug) {
    slug = await ensureUniqueSlug(slugify(requestedSlug), id);
  }

  if (data.featured) {
    await clearOtherFeatured(id);
  }

  const row = await prisma.newsPost.update({
    where: { id },
    data: { ...data, slug },
    include: postInclude,
  });

  return mapNewsPostForAdmin(row);
}

export async function deleteNewsPost(id) {
  const existing = await prisma.newsPost.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    throw new Error("Berita tidak ditemukan");
  }

  await prisma.newsPost.delete({ where: { id } });
}

export async function getPublishedNewsPosts({ limit, featuredOnly = false } = {}) {
  const rows = await prisma.newsPost.findMany({
    where: {
      status: "published",
      ...(featuredOnly ? { featured: true } : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    ...(limit ? { take: limit } : {}),
    include: postInclude,
  });

  return rows.map(mapNewsPostForPublic);
}

export async function getPublishedNewsBySlug(slug) {
  const row = await prisma.newsPost.findFirst({
    where: { slug, status: "published" },
    include: postInclude,
  });
  if (!row) return null;
  return mapNewsPostForPublic(row);
}

export async function getPublishedNewsCategories() {
  const rows = await prisma.newsPost.findMany({
    where: { status: "published" },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });
  return rows.map((r) => r.category);
}

export async function getRelatedPublishedNews(currentSlug, limit = 3) {
  const current = await getPublishedNewsBySlug(currentSlug);
  const all = await getPublishedNewsPosts();

  if (!current) return all.slice(0, limit);

  return all
    .filter((post) => post.slug !== currentSlug)
    .sort((a, b) => {
      const aMatch = a.category === current.category ? 1 : 0;
      const bMatch = b.category === current.category ? 1 : 0;
      return bMatch - aMatch;
    })
    .slice(0, limit);
}
