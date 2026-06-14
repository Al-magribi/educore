"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatGalleryDate } from "@/lib/gallery-utils.js";
import { hasImageUrl } from "@/lib/images.js";

export function GalleryAlbumCard({ album, priority = false }) {
  return (
    <motion.article
      whileHover={{ y: -6 }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg hover:shadow-primary/5"
    >
      <Link href={`/galeri/${album.slug}`} className="flex h-full flex-col">
        <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
          {hasImageUrl(album.coverImage) ? (
            <>
              <Image
                src={album.coverImage}
                alt={album.coverAlt || album.title}
                fill
                priority={priority}
                className="object-cover transition duration-500 group-hover:scale-105"
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />
            </>
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-primary/80 to-secondary">
              <svg className="h-12 w-12 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
          <span className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1 text-xs font-semibold text-white backdrop-blur-sm">
            {album.imageCount} foto
          </span>
        </div>
        <div className="flex flex-1 flex-col p-5">
          <h2 className="text-lg font-bold leading-snug text-slate-900 transition group-hover:text-primary">
            {album.title}
          </h2>
          {album.description ? (
            <p className="mt-2 line-clamp-2 flex-1 text-sm leading-relaxed text-slate-600">
              {album.description}
            </p>
          ) : null}
          {album.publishedAt ? (
            <p className="mt-4 border-t border-slate-100 pt-3 text-xs text-slate-500">
              {formatGalleryDate(album.publishedAt)}
            </p>
          ) : null}
        </div>
      </Link>
    </motion.article>
  );
}
