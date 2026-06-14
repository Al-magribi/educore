"use client";

import { GalleryPageHero } from "./GalleryPageHero.js";
import { GalleryAlbumCard } from "./GalleryAlbumCard.js";
import { StaggerChildren, StaggerItem } from "@/components/motion/StaggerChildren.js";

export function GalleryListView({ pageMeta, albums }) {
  return (
    <>
      <GalleryPageHero title={pageMeta.title} subtitle={pageMeta.subtitle} />

      <section className="bg-slate-50 py-12 md:py-16">
        <div className="mx-auto max-w-6xl px-6">
          {albums.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center text-slate-500">
              Belum ada album galeri yang dipublikasikan.
            </p>
          ) : (
            <>
              <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Album Foto</h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {albums.length} album kegiatan dan momen sekolah
                  </p>
                </div>
              </div>

              <StaggerChildren className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {albums.map((album, index) => (
                  <StaggerItem key={album.id}>
                    <GalleryAlbumCard album={album} priority={index === 0} />
                  </StaggerItem>
                ))}
              </StaggerChildren>
            </>
          )}
        </div>
      </section>
    </>
  );
}
