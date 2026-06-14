import Link from "next/link";
import { NewsCard } from "@/components/news/NewsCard.js";
import { SectionHeading } from "./SectionHeading.js";

/**
 * @param {{ posts: import('@/lib/news.js').NewsPostPublic[] }} props
 */
export function HomeNewsSection({ posts }) {
  if (!posts?.length) return null;

  const [featured, ...rest] = posts;
  const gridPosts = featured?.featured ? [featured, ...rest.slice(0, 2)] : posts.slice(0, 3);

  return (
    <section className="bg-white py-16 md:py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <SectionHeading
            title="Berita & Informasi"
            subtitle="Kabar terbaru seputar kegiatan dan prestasi sekolah."
          />
          <Link
            href="/berita"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-primary hover:text-primary sm:self-auto"
          >
            Lihat semua
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {gridPosts[0] ? (
            <div className={gridPosts.length > 1 ? "lg:row-span-2" : ""}>
              <NewsCard post={gridPosts[0]} featured={gridPosts[0].featured} />
            </div>
          ) : null}
          {gridPosts.length > 1 ? (
            <div className="flex flex-col gap-6">
              {gridPosts.slice(1).map((post) => (
                <NewsCard key={post.id} post={post} />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
