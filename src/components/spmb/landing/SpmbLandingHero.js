"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AppImage } from "@/components/ui/AppImage.js";
import { hasImageUrl } from "@/lib/images.js";

export function SpmbLandingHero({ page }) {
  const useImage = hasImageUrl(page.imageUrl);
  const isOpen = page.status === "open";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-[#1d4ed8] to-secondary">
      {useImage && (
        <>
          <AppImage
            src={page.imageUrl}
            alt={page.imageAlt || page.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-900/85 via-slate-900/75 to-slate-900/60" />
        </>
      )}

      <div className="relative mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20 md:py-24 lg:py-28">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm sm:px-4 sm:py-1.5 sm:text-xs">
              TA {page.academicYear}
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-bold sm:px-4 sm:py-1.5 sm:text-xs ${
                isOpen ? "bg-emerald-500/90 text-white" : "bg-slate-500/90 text-white"
              }`}
            >
              <span
                className={`h-1.5 w-1.5 rounded-full sm:h-2 sm:w-2 ${isOpen ? "bg-white animate-pulse" : "bg-white/70"}`}
              />
              {page.statusLabel}
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-bold leading-tight tracking-tight text-white sm:mt-6 sm:text-4xl md:text-5xl lg:text-[3.25rem]">
            {page.title}
          </h1>
          <p className="mt-3 text-base leading-relaxed text-blue-100 sm:mt-4 sm:text-lg md:text-xl">
            {page.subtitle}
          </p>

          {page.deadline && isOpen && (
            <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-amber-500/15 px-3 py-1.5 text-xs font-medium text-amber-100 ring-1 ring-amber-400/30 sm:text-sm">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Batas pendaftaran: {page.deadline}
            </p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:gap-4"
          >
            <Link
              href="/daftar"
              className="inline-flex items-center justify-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-primary shadow-lg transition hover:bg-blue-50 sm:px-8 sm:py-3.5"
            >
              Daftar Sekarang
            </Link>
            <Link
              href="/masuk"
              className="inline-flex items-center justify-center rounded-xl border-2 border-white/40 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10 sm:px-8 sm:py-3.5"
            >
              Sudah Punya Akun? Masuk
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
