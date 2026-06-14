"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatNewsDate } from "@/lib/news.js";
import { hasImageUrl } from "@/lib/images.js";
import { NewsCard } from "./NewsCard.js";
import { FadeIn } from "@/components/motion/FadeIn.js";

export function NewsDetailView({ post, related = [] }) {
  return (
    <article className="w-full min-w-0 overflow-x-hidden">
      <header className="relative overflow-hidden bg-slate-900">
        {hasImageUrl(post.coverImage) && (
          <>
            <Image
              src={post.coverImage}
              alt={post.coverAlt || post.title}
              fill
              priority
              className="object-cover opacity-50"
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-slate-900/40" />
          </>
        )}
        {!hasImageUrl(post.coverImage) && (
          <div className="absolute inset-0 bg-gradient-to-br from-primary to-secondary" />
        )}

        <div className="relative mx-auto w-full min-w-0 max-w-3xl px-6 pb-12 pt-8 md:pb-16 md:pt-12">
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
              <li>
                <Link href="/" className="hover:text-white">
                  Beranda
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li>
                <Link href="/berita" className="hover:text-white">
                  Berita
                </Link>
              </li>
              <li aria-hidden>/</li>
              <li className="text-slate-300 line-clamp-1">{post.title}</li>
            </ol>
          </nav>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="mt-6 inline-block rounded-full bg-primary/90 px-4 py-1 text-xs font-semibold text-white">
              {post.category}
            </span>
            <h1 className="mt-4 text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl">
              {post.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-slate-300">
              <span>{formatNewsDate(post.publishedAt)}</span>
              <span aria-hidden>•</span>
              <span>{post.readMinutes} menit baca</span>
              <span aria-hidden>•</span>
              <span>Oleh {post.author}</span>
            </div>
          </motion.div>
        </div>
      </header>

      <div className="mx-auto w-full min-w-0 max-w-3xl px-6 py-12 md:py-16">
        <FadeIn>
          <p className="text-xl font-medium leading-relaxed text-slate-700 md:text-2xl">
            {post.excerpt}
          </p>
        </FadeIn>

        <FadeIn>
          <div
            className="news-body mt-10"
            dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
          />
        </FadeIn>

        <FadeIn className="mt-12 flex flex-wrap gap-4 border-t border-slate-200 pt-8">
          <Link
            href="/berita"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-primary hover:text-primary"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke Berita
          </Link>
        </FadeIn>
      </div>

      {related.length > 0 && (
        <section className="border-t border-slate-200 bg-slate-50 py-16">
          <div className="mx-auto max-w-6xl px-6">
            <h2 className="text-2xl font-bold text-slate-900">Berita Terkait</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <NewsCard key={item.id} post={item} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
