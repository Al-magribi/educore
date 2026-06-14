import { notFound } from "next/navigation";
import { getNewsBySlug, getRelatedNews } from "@/lib/news.js";
import { NewsDetailView } from "@/components/news/NewsDetailView.js";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);

  if (!post) {
    return { title: "Berita tidak ditemukan" };
  }

  return {
    title: post.title,
    description: post.excerpt,
  };
}

export default async function BeritaDetailPage({ params }) {
  const { slug } = await params;
  const post = await getNewsBySlug(slug);

  if (!post) {
    notFound();
  }

  const related = await getRelatedNews(slug, 3);

  return <NewsDetailView post={post} related={related} />;
}
