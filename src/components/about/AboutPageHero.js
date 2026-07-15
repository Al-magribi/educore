"use client";

import { motion } from "framer-motion";
import { AppImage } from "@/components/ui/AppImage.js";
import { hasImageUrl } from "@/lib/images.js";

export function AboutPageHero({ title, subtitle, imageUrl, imageAlt }) {
  const useImage = hasImageUrl(imageUrl);

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-primary via-[#1d4ed8] to-secondary">
      {useImage && (
        <>
          <AppImage
            src={imageUrl}
            alt={imageAlt || title}
            fill
            priority
            className="object-cover"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-slate-900/75" />
        </>
      )}
      {!useImage && (
        <>
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4z'/%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
          <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
        </>
      )}

      <div className="relative mx-auto max-w-6xl px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-2xl"
        >
          <span className="inline-block rounded-full border border-white/25 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-white/95 backdrop-blur-sm">
            Profil Institusi
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight text-white md:text-5xl">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-4 text-lg leading-relaxed text-blue-100 md:text-xl">
              {subtitle}
            </p>
          )}
        </motion.div>
      </div>
    </section>
  );
}
