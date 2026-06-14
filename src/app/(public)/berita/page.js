import { getAllNews, getNewsCategories, NEWS_PAGE_META } from "@/lib/news.js";
import { NewsListView } from "@/components/news/NewsListView.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Berita",
  description: NEWS_PAGE_META.subtitle,
};

export default async function BeritaPage() {
  const [posts, categories] = await Promise.all([getAllNews(), getNewsCategories()]);

  return (
    <NewsListView pageMeta={NEWS_PAGE_META} posts={posts} categories={categories} />
  );
}
