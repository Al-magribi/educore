import {
  getPublishedNewsBySlug,
  getPublishedNewsCategories,
  getPublishedNewsPosts,
  getRelatedPublishedNews,
  HOME_NEWS_LIMIT,
  NEWS_PAGE_META,
} from "@/modules/cms/news/index.js";

/** @typedef {Awaited<ReturnType<import('@/modules/cms/news/mapper.js').mapNewsPostForPublic>>} NewsPostPublic */

export { NEWS_PAGE_META };

export async function getAllNews() {
  return getPublishedNewsPosts();
}

export async function getNewsBySlug(slug) {
  return getPublishedNewsBySlug(slug);
}

export async function getFeaturedNews() {
  const featured = await getPublishedNewsPosts({ featuredOnly: true, limit: 1 });
  if (featured[0]) return featured[0];
  const all = await getPublishedNewsPosts({ limit: 1 });
  return all[0] ?? null;
}

export async function getRelatedNews(currentSlug, limit = 3) {
  return getRelatedPublishedNews(currentSlug, limit);
}

export async function getHomeNews(limit = HOME_NEWS_LIMIT) {
  const posts = await getPublishedNewsPosts({ limit: limit + 2 });
  const featured = posts.find((p) => p.featured);
  if (!featured) return posts.slice(0, limit);

  const others = posts.filter((p) => p.id !== featured.id).slice(0, limit - 1);
  return [featured, ...others];
}

export async function getNewsCategories() {
  return getPublishedNewsCategories();
}

export function formatNewsDate(isoString) {
  if (!isoString) return "";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(isoString));
}
