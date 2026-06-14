"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { HOME_SECTION_LABELS, HOME_SECTION_TYPES } from "@/modules/cms/home/index.js";
import { HeroSectionForm } from "./HeroSectionForm.js";
import { TestimonialsSectionForm } from "./TestimonialsSectionForm.js";
import { ContactSectionForm } from "./ContactSectionForm.js";
import { ItemsSectionEditor } from "./ItemsSectionEditor.js";
import { SpmbCtaSectionForm } from "./SpmbCtaSectionForm.js";

const SECTION_DESCRIPTIONS = {
  hero: "Judul utama, tombol aksi, dan statistik di bagian atas beranda.",
  achievements: "Daftar prestasi sekolah dalam bentuk kartu bergambar.",
  extracurricular: "Kegiatan ekstrakurikuler yang ditampilkan sebagai kartu.",
  alumni_testimonials: "Judul section dan kutipan alumni / orang tua.",
  spmb_cta: "Blok ajakan mendaftar SPMB sebelum kontak.",
  contact: "Judul section, alamat, telepon, email, dan jam operasional.",
};

const SECTION_SHORT_LABELS = {
  hero: "Hero",
  achievements: "Prestasi",
  extracurricular: "Ekstra",
  alumni_testimonials: "Alumni",
  spmb_cta: "SPMB",
  contact: "Kontak",
};

const ITEMS_ONLY_SECTIONS = new Set(["achievements", "extracurricular"]);

export function HomeBerandaEditor() {
  const [sections, setSections] = useState([]);
  const [activeType, setActiveType] = useState("hero");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const tabRefs = useRef({});
  const navRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/home");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data");
      setSections(data.sections ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const el = tabRefs.current[activeType];
    if (!el || !navRef.current) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeType]);

  const updateSection = (updated) => {
    setSections((list) => list.map((s) => (s.id === updated.id ? updated : s)));
  };

  const activeSection = sections.find((s) => s.type === activeType);
  const itemCount = activeSection?.items?.length ?? 0;

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-200 bg-white">
        <p className="text-sm text-slate-500">Memuat pengaturan beranda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-800">
        {error}
        <button
          type="button"
          onClick={load}
          className="mt-3 block font-medium text-rose-900 underline"
        >
          Coba lagi
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Beranda</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kelola tampilan halaman depan — dari hero hingga kontak. Perubahan langsung
          tersimpan ke database.
        </p>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex text-sm font-medium text-[var(--admin-primary)] hover:underline"
        >
          Lihat halaman publik →
        </a>
      </div>

      <div className="space-y-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className="border-b border-slate-200 bg-slate-50/80"
          role="tablist"
          aria-label="Section beranda"
        >
          <div
            ref={navRef}
            className="-mb-px flex gap-0.5 overflow-x-auto overscroll-x-contain px-2 pt-2 sm:gap-1 sm:px-4 sm:pt-3 [scrollbar-width:thin]"
          >
            {HOME_SECTION_TYPES.map((type) => {
              const section = sections.find((s) => s.type === type);
              const isActive = activeType === type;
              const count = section?.items?.length ?? 0;

              return (
                <button
                  key={type}
                  ref={(node) => {
                    tabRefs.current[type] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`beranda-tab-${type}`}
                  aria-selected={isActive}
                  aria-controls={`beranda-panel-${type}`}
                  onClick={() => setActiveType(type)}
                  className={`shrink-0 rounded-t-xl border-b-2 px-3 py-2.5 text-sm font-medium transition sm:px-4 sm:py-3 ${
                    isActive
                      ? "border-[var(--admin-primary)] bg-white text-[var(--admin-primary)] shadow-sm"
                      : "border-transparent text-slate-600 hover:border-slate-300 hover:bg-white/60 hover:text-slate-900"
                  }`}
                >
                  <span className="sm:hidden">{SECTION_SHORT_LABELS[type]}</span>
                  <span className="hidden sm:inline">{HOME_SECTION_LABELS[type]}</span>
                  {count > 0 ? (
                    <span
                      className={`ml-1.5 hidden rounded-full px-1.5 py-0.5 text-[10px] font-semibold sm:inline ${
                        isActive
                          ? "bg-[color-mix(in_srgb,var(--admin-primary)_12%,white)] text-[var(--admin-primary)]"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {count}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`beranda-panel-${activeType}`}
          aria-labelledby={`beranda-tab-${activeType}`}
          className="p-4 sm:p-6"
        >
          <div className="mb-6 border-b border-slate-100 pb-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {HOME_SECTION_LABELS[activeType]}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {SECTION_DESCRIPTIONS[activeType]}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    activeSection?.isPublished
                      ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                      : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"
                  }`}
                >
                  {activeSection?.isPublished ? "Tayang" : "Disembunyikan"}
                </span>
                {itemCount > 0 ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
                    {itemCount} item
                  </span>
                ) : null}
              </div>
            </div>
          </div>

          {activeType === "hero" && (
            <HeroSectionForm section={activeSection} onSaved={updateSection} />
          )}
          {activeType === "alumni_testimonials" && (
            <TestimonialsSectionForm section={activeSection} onSectionUpdated={updateSection} />
          )}
          {activeType === "contact" && (
            <ContactSectionForm section={activeSection} onSectionUpdated={updateSection} />
          )}
          {activeType === "spmb_cta" && (
            <SpmbCtaSectionForm section={activeSection} onSaved={updateSection} />
          )}
          {ITEMS_ONLY_SECTIONS.has(activeType) && (
            <ItemsSectionEditor
              key={activeType}
              sectionType={activeType}
              section={activeSection}
              description={SECTION_DESCRIPTIONS[activeType]}
              onSectionUpdated={updateSection}
            />
          )}
        </div>
      </div>
    </div>
  );
}
