"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { hasImageUrl } from "@/lib/images.js";

export function SpmbLandingHero({ page }) {
  const useImage = hasImageUrl(page.imageUrl);
  const isOpen = page.status === "open";

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-[#1d4ed8] to-secondary">
      {useImage && (
        <>
          <Image
            src={page.imageUrl}
            alt={page.imageAlt || page.title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-slate-900/75" />
        </>
      )}

      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-3xl"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
              TA {page.academicYear}
            </span>
            <span
              className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-bold ${
                isOpen
                  ? "bg-emerald-500/90 text-white"
                  : "bg-slate-500/90 text-white"
              }`}
            >
              <span
                className={`h-2 w-2 rounded-full ${isOpen ? "bg-white animate-pulse" : "bg-white/70"}`}
              />
              {page.statusLabel}
            </span>
          </div>

          <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl">
            {page.title}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-blue-100 md:text-xl">
            {page.subtitle}
          </p>

          {page.deadline && isOpen && (
            <p className="mt-3 text-sm font-medium text-amber-200">
              Batas pendaftaran: {page.deadline}
            </p>
          )}

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="mt-10 flex flex-wrap gap-4"
          >
            <Link
              href="/daftar"
              className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-primary shadow-lg transition hover:bg-blue-50"
            >
              Daftar Sekarang
            </Link>
            <Link
              href="/masuk"
              className="inline-flex items-center justify-center rounded-xl border-2 border-white/40 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/10"
            >
              Sudah Punya Akun? Masuk
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
