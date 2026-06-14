"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { formatGalleryDate } from "@/lib/gallery-utils.js";
import { hasImageUrl } from "@/lib/images.js";

function Lightbox({ images, index, onClose, onPrev, onNext }) {
  const image = images[index];

  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, onPrev, onNext]);

  if (!image?.imageUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/95 p-4">
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Tutup"
      />

      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white backdrop-blur-sm transition hover:bg-white/20"
        aria-label="Tutup lightbox"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {images.length > 1 ? (
        <>
          <button
            type="button"
            onClick={onPrev}
            className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/20 sm:left-4"
            aria-label="Gambar sebelumnya"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={onNext}
            className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white backdrop-blur-sm transition hover:bg-white/20 sm:right-4"
            aria-label="Gambar berikutnya"
          >
            ›
          </button>
        </>
      ) : null}

      <AnimatePresence mode="wait">
        <motion.div
          key={image.id}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.2 }}
          className="relative z-[1] flex max-h-[85dvh] w-full max-w-5xl flex-col items-center"
        >
          <div className="relative max-h-[75dvh] w-full">
            <Image
              src={image.imageUrl}
              alt={image.imageAlt}
              width={1600}
              height={1200}
              className="mx-auto max-h-[75dvh] w-auto max-w-full rounded-lg object-contain"
              sizes="100vw"
              priority
            />
          </div>
          {(image.caption || images.length > 1) && (
            <div className="mt-4 max-w-2xl text-center">
              {images.length > 1 ? (
                <p className="text-sm text-slate-400">
                  {index + 1} / {images.length}
                </p>
              ) : null}
              {image.caption ? (
                <p className="mt-1 text-sm text-white/90">{image.caption}</p>
              ) : null}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export function GalleryAlbumView({ album }) {
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const visibleImages = album.images.filter((img) => hasImageUrl(img.imageUrl));

  const openLightbox = (index) => setLightboxIndex(index);
  const closeLightbox = () => setLightboxIndex(null);

  const goPrev = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i - 1 + visibleImages.length) % visibleImages.length));
  }, [visibleImages.length]);

  const goNext = useCallback(() => {
    setLightboxIndex((i) => (i === null ? null : (i + 1) % visibleImages.length));
  }, [visibleImages.length]);

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-[#1d4ed8] to-secondary">
        <div className="relative mx-auto max-w-6xl px-6 py-12 md:py-16">
          <Link
            href="/galeri"
            className="inline-flex items-center gap-2 text-sm font-medium text-blue-100 transition hover:text-white"
          >
            ← Kembali ke galeri
          </Link>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mt-6 max-w-3xl"
          >
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">
              {album.title}
            </h1>
            {album.description ? (
              <p className="mt-3 text-lg leading-relaxed text-blue-100">{album.description}</p>
            ) : null}
            <p className="mt-4 text-sm text-blue-200/90">
              {visibleImages.length} foto
              {album.publishedAt ? ` · ${formatGalleryDate(album.publishedAt)}` : ""}
            </p>
          </motion.div>
        </div>
      </section>

      <section className="bg-slate-50 py-10 md:py-14">
        <div className="mx-auto max-w-6xl px-6">
          {visibleImages.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
              Album ini belum memiliki foto.
            </p>
          ) : (
            <div className="columns-1 gap-4 sm:columns-2 lg:columns-3">
              {visibleImages.map((image, index) => (
                <motion.button
                  key={image.id}
                  type="button"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.35 }}
                  onClick={() => openLightbox(index)}
                  className="group mb-4 block w-full break-inside-avoid overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <div className="relative w-full">
                    <Image
                      src={image.imageUrl}
                      alt={image.imageAlt}
                      width={800}
                      height={600}
                      priority={index === 0}
                      className="h-auto w-full object-cover transition duration-300 group-hover:scale-[1.02]"
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/0 transition group-hover:bg-slate-900/20">
                      <span className="scale-90 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-800 opacity-0 shadow transition group-hover:scale-100 group-hover:opacity-100">
                        Perbesar
                      </span>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </section>

      {lightboxIndex !== null ? (
        <Lightbox
          images={visibleImages}
          index={lightboxIndex}
          onClose={closeLightbox}
          onPrev={goPrev}
          onNext={goNext}
        />
      ) : null}
    </>
  );
}
