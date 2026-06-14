"use client";

import { useRef, useEffect, useState } from "react";
import { IdentityTab } from "./tabs/IdentityTab.jsx";
import { BrandingTab } from "./tabs/BrandingTab.jsx";
import { SeoTab } from "./tabs/SeoTab.jsx";
import { ProfileTab } from "./tabs/ProfileTab.jsx";
import { BackupTab } from "./tabs/BackupTab.jsx";
import { ThemeTab } from "./tabs/ThemeTab.jsx";

const TABS = [
  { id: "branding", label: "Logo & Favicon", shortLabel: "Logo", description: "Aset visual sekolah" },
  { id: "identity", label: "Nama Sekolah", shortLabel: "Nama", description: "Identitas dan judul situs" },
  { id: "seo", label: "SEO & Crawler", shortLabel: "SEO", description: "Metadata untuk Google" },
  { id: "profile", label: "Profil Admin", shortLabel: "Profil", description: "Akun dan password" },
  { id: "backup", label: "Backup & Restore", shortLabel: "Backup", description: "Database dan upload" },
  { id: "theme", label: "Tema Warna", shortLabel: "Tema", description: "Palet warna aplikasi" },
];

export default function Setting() {
  const [activeTab, setActiveTab] = useState("branding");
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
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan Aplikasi</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kelola identitas sekolah, branding, SEO, profil admin, backup, dan tema warna.
        </p>
      </div>

      <div className="space-y-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className="border-b border-slate-200 bg-slate-50/80"
          role="tablist"
          aria-label="Kategori pengaturan"
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
                  id={`setting-tab-${tab.id}`}
                  aria-selected={active}
                  aria-controls={`setting-panel-${tab.id}`}
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
          id={`setting-panel-${activeTab}`}
          aria-labelledby={`setting-tab-${activeTab}`}
          className="p-4 sm:p-6"
        >
          <div className="mb-6 border-b border-slate-100 pb-4">
            <h2 className="text-lg font-semibold text-slate-900">{current.label}</h2>
            <p className="mt-1 text-sm text-slate-500">{current.description}</p>
          </div>

          {activeTab === "identity" && <IdentityTab />}
          {activeTab === "branding" && <BrandingTab />}
          {activeTab === "seo" && <SeoTab />}
          {activeTab === "profile" && <ProfileTab />}
          {activeTab === "backup" && <BackupTab />}
          {activeTab === "theme" && <ThemeTab />}
        </div>
      </div>
    </div>
  );
}
