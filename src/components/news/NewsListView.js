"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { NewsPageHero } from "./NewsPageHero.js";
import { NewsCard } from "./NewsCard.js";
import { StaggerChildren, StaggerItem } from "@/components/motion/StaggerChildren.js";

export function NewsListView({ pageMeta, posts, categories }) {
  const [activeCategory, setActiveCategory] = useState("Semua");

  const featured = posts.find((p) => p.featured) ?? posts[0];
  const rest = posts.filter((p) => p.slug !== featured?.slug);

  const filtered = useMemo(() => {
    const pool = activeCategory === "Semua" ? rest : rest.filter((p) => p.category === activeCategory);
    return pool;
  }, [rest, activeCategory]);

  const filterOptions = ["Semua", ...categories];

  return (
    <>
      <NewsPageHero title={pageMeta.title} subtitle={pageMeta.subtitle} />

      <section className="bg-slate-50 py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          {posts.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
              Belum ada berita yang dipublikasikan.
            </p>
          ) : null}

          {featured && posts.length > 0 ? (
            <div className="mb-12">
              <NewsCard post={featured} featured />
            </div>
          ) : null}

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-xl font-bold text-slate-900">Artikel Terbaru</h2>
            <div className="flex flex-wrap gap-2">
              {filterOptions.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    activeCategory === cat
                      ? "bg-primary text-white shadow-md shadow-primary/25"
                      : "bg-white text-slate-600 ring-1 ring-slate-200 hover:ring-primary/30 hover:text-primary"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="mt-8"
            >
              {filtered.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
                  Belum ada berita dalam kategori ini.
                </p>
              ) : (
                <StaggerChildren className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filtered.map((post) => (
                    <StaggerItem key={post.id}>
                      <NewsCard post={post} />
                    </StaggerItem>
                  ))}
                </StaggerChildren>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </section>
    </>
  );
}
