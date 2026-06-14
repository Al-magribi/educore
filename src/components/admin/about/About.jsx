"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconExternal } from "@/components/admin/layout/icons.js";
import { PageTab } from "./tabs/PageTab.jsx";
import { ProfileTab } from "./tabs/ProfileTab.jsx";
import { VisionMissionTab } from "./tabs/VisionMissionTab.jsx";
import { ValuesTab } from "./tabs/ValuesTab.jsx";

const TABS = [
  {
    id: "page",
    label: "Halaman Tentang",
    shortLabel: "Halaman",
    description: "Judul, subjudul, dan gambar hero",
  },
  {
    id: "profile",
    label: "Profil Sekolah",
    shortLabel: "Profil",
    description: "Paragraf profil dan highlight statistik",
  },
  {
    id: "vision-mission",
    label: "Visi & Misi",
    shortLabel: "Visi",
    description: "Visi sekolah dan daftar poin misi",
  },
  {
    id: "values",
    label: "Nilai-Nilai Utama",
    shortLabel: "Nilai",
    description: "Nilai-nilai yang menjadi landasan sekolah",
  },
];

export default function About() {
  const [activeTab, setActiveTab] = useState("page");
  const tabRefs = useRef({});
  const navRef = useRef(null);

  const current = TABS.find((t) => t.id === activeTab) ?? TABS[0];

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (!el || !navRef.current) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Halaman Tentang</h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola konten halaman tentang, profil sekolah, visi misi, dan nilai-nilai utama.
          </p>
        </div>
        <Link
          href="/tentang"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
        >
          Lihat halaman
          <IconExternal className="h-4 w-4" />
        </Link>
      </div>

      <div className="space-y-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className="border-b border-slate-200 bg-slate-50/80"
          role="tablist"
          aria-label="Kategori halaman tentang"
        >
          <div
            ref={navRef}
            className="-mb-px flex gap-0.5 overflow-x-auto overscroll-x-contain px-2 pt-2 sm:gap-1 sm:px-4 sm:pt-3 [scrollbar-width:thin]"
          >
            {TABS.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[tab.id] = node;
                  }}
                  type="button"
                  role="tab"
                  id={`about-tab-${tab.id}`}
                  aria-selected={active}
                  aria-controls={`about-panel-${tab.id}`}
                  onClick={() => setActiveTab(tab.id)}
                  className={`shrink-0 rounded-t-xl border-b-2 px-3 py-2.5 text-sm font-medium transition sm:px-4 sm:py-3 ${
                    active
                      ? "border-[var(--admin-primary)] bg-white text-[var(--admin-primary)] shadow-sm"
                      : "border-transparent text-slate-600 hover:border-slate-300 hover:bg-white/60 hover:text-slate-900"
                  }`}
                >
                  <span className="sm:hidden">{tab.shortLabel}</span>
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div
          role="tabpanel"
          id={`about-panel-${activeTab}`}
          aria-labelledby={`about-tab-${activeTab}`}
          className="p-4 sm:p-6"
        >
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">{current.label}</h2>
            <p className="mt-1 text-sm text-slate-500">{current.description}</p>
          </div>

          {activeTab === "page" && <PageTab />}
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "vision-mission" && <VisionMissionTab />}
          {activeTab === "values" && <ValuesTab />}
        </div>
      </div>
    </div>
  );
}
