"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatNewsDate } from "@/lib/news.js";
import { hasImageUrl } from "@/lib/images.js";

const categoryColors = {
  SPMB: "bg-amber-500/10 text-amber-700",
  Prestasi: "bg-emerald-500/10 text-emerald-700",
  Kegiatan: "bg-sky-500/10 text-sky-700",
  Informasi: "bg-primary/10 text-primary",
};

export function NewsCard({ post, featured = false }) {
  const categoryClass =
    categoryColors[post.category] ?? "bg-slate-100 text-slate-700";

  const coverBlock = hasImageUrl(post.coverImage) ? (
    <Image
      src={post.coverImage}
      alt={post.coverAlt || post.title}
      fill
      className="object-cover transition duration-500 group-hover:scale-105"
      sizes={featured ? "(max-width: 768px) 100vw, 50vw" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
      priority={featured}
    />
  ) : (
    <div
      className="flex h-full min-h-full items-end bg-gradient-to-br from-primary to-secondary p-6"
      aria-hidden
    >
      <span className={`rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${categoryClass}`}>
        {post.category}
      </span>
    </div>
  );

  if (featured) {
    return (
      <motion.article
        whileHover={{ y: -4 }}
        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-xl hover:shadow-primary/5"
      >
        <Link href={`/berita/${post.slug}`} className="grid md:grid-cols-2">
          <div className="relative aspect-[16/10] overflow-hidden bg-slate-200 md:aspect-auto md:min-h-[320px]">
            {coverBlock}
          </div>
          <div className="flex flex-col justify-center p-8 md:p-10">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-white">
                Unggulan
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${categoryClass}`}>
                {post.category}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-bold leading-snug text-slate-900 transition group-hover:text-primary md:text-3xl">
              {post.title}
            </h2>
            <p className="mt-3 line-clamp-3 text-slate-600">{post.excerpt}</p>
            <NewsMeta post={post} className="mt-6" />
          </div>
        </Link>
      </motion.article>
    );
  }

  return (
    <motion.article
      whileHover={{ y: -6 }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg hover:shadow-primary/5"
    >
      <Link href={`/berita/${post.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[16/10] overflow-hidden bg-slate-200">
          {coverBlock}
          {hasImageUrl(post.coverImage) ? (
            <span
              className={`absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur-sm ${categoryClass}`}
            >
              {post.category}
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h2 className="text-lg font-bold leading-snug text-slate-900 transition group-hover:text-primary">
            {post.title}
          </h2>
          <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
            {post.excerpt}
          </p>
          <NewsMeta post={post} className="mt-4 border-t border-slate-100 pt-4" />
        </div>
      </Link>
    </motion.article>
  );
}

function NewsMeta({ post, className = "" }) {
  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 ${className}`}>
      <span>{formatNewsDate(post.publishedAt)}</span>
      <span aria-hidden>•</span>
      <span>{post.readMinutes} menit baca</span>
      <span aria-hidden>•</span>
      <span>{post.author}</span>
    </div>
  );
}
