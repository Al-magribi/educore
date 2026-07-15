"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AppImage } from "@/components/ui/AppImage.js";

function HeroGradientBackground() {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-[#1d4ed8] to-secondary" />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />
      <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl" />
    </>
  );
}

function HeroImageBackground({ imageUrl, imageAlt, overlayOpacity }) {
  const overlay = Math.min(1, Math.max(0, overlayOpacity ?? 0.6));

  return (
    <>
      <AppImage
        src={imageUrl}
        alt={imageAlt}
        fill
        priority
        loading="eager"
        className="object-cover object-center"
        sizes="100vw"
      />
      {/* Overlay gelap agar teks tetap terbaca */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-slate-900/90 via-slate-900/70 to-slate-900/40"
        style={{ opacity: overlay }}
      />
      <div className="absolute inset-0 bg-primary/20 mix-blend-multiply" />
    </>
  );
}

function HeroContent({
  badge,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  stats,
}) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        className="max-w-3xl"
      >
        {badge && (
          <motion.span
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.15, duration: 0.4 }}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white/95 backdrop-blur-sm"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            {badge}
          </motion.span>
        )}

        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-white md:text-5xl lg:text-6xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-6 text-lg leading-relaxed text-blue-50/95 md:text-xl">
            {subtitle}
          </p>
        )}

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.5 }}
          className="mt-10 flex flex-wrap gap-4"
        >
          {ctaHref && ctaLabel && (
            <Link
              href={ctaHref}
              className="inline-flex items-center justify-center rounded-xl bg-white px-8 py-3.5 text-sm font-semibold text-primary shadow-lg shadow-blue-900/20 transition hover:bg-blue-50 hover:shadow-xl"
            >
              {ctaLabel}
            </Link>
          )}
          {secondaryCtaHref && secondaryCtaLabel && (
            <Link
              href={secondaryCtaHref}
              className="inline-flex items-center justify-center rounded-xl border-2 border-white/40 px-8 py-3.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:border-white hover:bg-white/10"
            >
              {secondaryCtaLabel}
            </Link>
          )}
        </motion.div>
      </motion.div>

      {stats?.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-16 grid gap-4 sm:grid-cols-3"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 + i * 0.08 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="rounded-2xl border border-white/15 bg-white/10 p-6 backdrop-blur-md"
            >
              <p className="text-3xl font-bold text-white md:text-4xl">{stat.value}</p>
              <p className="mt-1 text-sm font-medium text-blue-100">{stat.label}</p>
            </motion.div>
          ))}
        </motion.div>
      )}
    </>
  );
}

/**
 * Default: gradient biru. Jika `imageUrl` diisi (upload CMS), tampilkan hero bergambar.
 *
 * @param {string} [imageUrl]
 * @param {string} [imageAlt]
 * @param {number} [overlayOpacity] 0–1, kegelapan overlay di atas gambar
 */
export function HeroSection({
  imageUrl,
  imageAlt = "",
  overlayOpacity = 0.65,
  badge,
  title,
  subtitle,
  ctaLabel,
  ctaHref,
  secondaryCtaLabel,
  secondaryCtaHref,
  stats = [],
}) {
  const useImage = Boolean(imageUrl?.trim());

  return (
    <section className="relative min-h-[520px] overflow-hidden md:min-h-[600px]">
      <div className="absolute inset-0">
        {useImage ? (
          <HeroImageBackground
            imageUrl={imageUrl}
            imageAlt={imageAlt || title || "Hero sekolah"}
            overlayOpacity={overlayOpacity}
          />
        ) : (
          <HeroGradientBackground />
        )}
      </div>

      <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-28 lg:py-32">
        <HeroContent
          badge={badge}
          title={title}
          subtitle={subtitle}
          ctaLabel={ctaLabel}
          ctaHref={ctaHref}
          secondaryCtaLabel={secondaryCtaLabel}
          secondaryCtaHref={secondaryCtaHref}
          stats={stats}
        />
      </div>
    </section>
  );
}
