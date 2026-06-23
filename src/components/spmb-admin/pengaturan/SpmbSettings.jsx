"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import LandingSettingsTab from "@/components/spmb-admin/pengaturan/LandingSettingsTab.jsx";
import PaymentSettingsTab from "@/components/spmb-admin/pengaturan/PaymentSettingsTab.jsx";
import SmtpSettingsTab from "@/components/spmb-admin/pengaturan/SmtpSettingsTab.jsx";
import PeriodeSettingsTab from "@/components/spmb-admin/pengaturan/PeriodeSettingsTab.jsx";
import { SETTINGS_TABS } from "@/components/spmb-admin/pengaturan/settings-tabs.js";

const TAB_PANELS = {
  landing: LandingSettingsTab,
  pembayaran: PaymentSettingsTab,
  smtp: SmtpSettingsTab,
  periode: PeriodeSettingsTab,
};

export default function SpmbSettings() {
  const searchParams = useSearchParams();
  const tabFromUrl = searchParams.get("tab");
  const initialTab = SETTINGS_TABS.some((t) => t.id === tabFromUrl) ? tabFromUrl : "landing";
  const [activeTab, setActiveTab] = useState(initialTab);
  const tabRefs = useRef({});
  const navRef = useRef(null);

  useEffect(() => {
    if (tabFromUrl && SETTINGS_TABS.some((t) => t.id === tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  useEffect(() => {
    const el = tabRefs.current[activeTab];
    if (!el || !navRef.current) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeTab]);

  const current = SETTINGS_TABS.find((t) => t.id === activeTab) ?? SETTINGS_TABS[0];
  const ActivePanel = TAB_PANELS[activeTab] ?? LandingSettingsTab;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pengaturan SPMB</h1>
        <p className="mt-1 text-sm text-slate-600">
          Kustomisasi landing page, pembayaran, email, dan periode penerimaan siswa baru.
        </p>
      </div>

      <div className="space-y-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div
          className="shrink-0 border-b border-slate-200 bg-slate-50/80"
          role="tablist"
          aria-label="Pengaturan SPMB"
        >
          <div
            ref={navRef}
            className="-mb-px flex gap-0.5 overflow-x-auto overscroll-x-contain px-2 pt-2 sm:gap-1 sm:px-4 sm:pt-3 [scrollbar-width:thin]"
          >
            {SETTINGS_TABS.map((tab) => {
              const active = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  ref={(node) => {
                    tabRefs.current[tab.id] = node;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={active}
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

        <div className="min-h-0 p-4 sm:p-6" role="tabpanel">
          <p className="mb-6 text-sm text-slate-600">{current.description}</p>
          <ActivePanel />
        </div>
      </div>
    </div>
  );
}
