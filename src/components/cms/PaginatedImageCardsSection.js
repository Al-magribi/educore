"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { SectionHeading } from "./SectionHeading.js";
import { StaggerChildren, StaggerItem } from "@/components/motion/StaggerChildren.js";
import { hasImageUrl } from "@/lib/images.js";

const PAGE_SIZE = 8;

function CardPagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <nav
      className="mt-10 flex flex-col items-center gap-4 sm:mt-12"
      aria-label="Paginasi kartu"
    >
      <p className="text-sm text-slate-500">
        Halaman <span className="font-semibold text-slate-800">{page + 1}</span> dari{" "}
        <span className="font-semibold text-slate-800">{totalPages}</span>
      </p>

      <div className="flex w-full max-w-md items-center justify-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 0}
          aria-label="Halaman sebelumnya"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
          {Array.from({ length: totalPages }, (_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => onPageChange(index)}
              aria-label={`Ke halaman ${index + 1}`}
              aria-current={page === index ? "page" : undefined}
              className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl px-3 text-sm font-semibold transition ${
                page === index
                  ? "bg-primary text-white shadow-md shadow-primary/25"
                  : "border border-slate-200 bg-white text-slate-700 hover:border-primary hover:text-primary"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages - 1}
          aria-label="Halaman berikutnya"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 shadow-sm transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </nav>
  );
}

export function PaginatedImageCardsSection({
  items = [],
  eyebrow,
  title,
  description,
  badgeLabel,
  sectionClassName = "bg-white py-20 md:py-28",
  prioritizeFirst = false,
}) {
  const visibleItems = items.filter((item) => hasImageUrl(item.imageUrl));
  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));
  const [page, setPage] = useState(0);

  useEffect(() => {
    setPage(0);
  }, [visibleItems.length]);

  useEffect(() => {
    if (page > totalPages - 1) {
      setPage(Math.max(0, totalPages - 1));
    }
  }, [page, totalPages]);

  const pageItems = visibleItems.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  const handlePageChange = (nextPage) => {
    setPage(Math.min(Math.max(0, nextPage), totalPages - 1));
  };

  if (visibleItems.length === 0) return null;

  return (
    <section className={sectionClassName}>
      <div className="mx-auto max-w-6xl px-6">
        <SectionHeading eyebrow={eyebrow} title={title} description={description} />

        <StaggerChildren className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pageItems.map((item, index) => (
            <StaggerItem key={item.id}>
              <motion.article
                whileHover={{ y: -8, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="group relative min-h-[240px] overflow-hidden rounded-2xl shadow-md"
              >
                <Image
                  src={item.imageUrl}
                  alt={item.imageAlt || item.title}
                  fill
                  priority={prioritizeFirst && page === 0 && index === 0}
                  loading={page === 0 && index < 3 ? "eager" : "lazy"}
                  className="object-cover transition duration-500 group-hover:scale-110"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/20" />
                <div className="absolute inset-0 bg-primary/20 mix-blend-multiply opacity-60" />
                <div className="absolute inset-0 bg-black/10 opacity-0 transition-opacity group-hover:opacity-100" />

                <div className="relative flex min-h-[240px] flex-col justify-end p-6 text-white">
                  <div className="mb-auto">
                    <span className="inline-block rounded-lg bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
                      {badgeLabel}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-blue-50/90">
                    {item.description}
                  </p>
                </div>
              </motion.article>
            </StaggerItem>
          ))}
        </StaggerChildren>

        <CardPagination page={page} totalPages={totalPages} onPageChange={handlePageChange} />
      </div>
    </section>
  );
}
