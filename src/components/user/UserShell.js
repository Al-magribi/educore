"use client";

import { useCallback, useEffect, useState } from "react";
import { UserHeader } from "./UserHeader.js";
import { UserSidebar } from "./UserSidebar.js";
import { IconClose } from "./icons.js";
import "./user-shell.css";

const STORAGE_KEY = "educore-user-sidebar-collapsed";

export function UserShell({ children, schoolName, logoUrl, hasLogo, userName }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsed(stored === "true");
      }
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const openMobile = useCallback(() => setMobileOpen(true), []);

  const onToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  const sidebarCollapsed = mounted ? collapsed : false;

  return (
    <div
      className="user-shell-root flex min-h-dvh bg-slate-50"
      data-sidebar-collapsed={sidebarCollapsed ? "true" : "false"}
      suppressHydrationWarning
    >
      <aside
        className="user-sidebar fixed inset-y-0 left-0 z-40 hidden flex-col overflow-hidden border-r border-slate-200 bg-white lg:flex"
        aria-label="Navigasi portal calon siswa"
      >
        <UserSidebar
          schoolName={schoolName}
          logoUrl={logoUrl}
          hasLogo={hasLogo}
          userName={userName}
          collapsed={sidebarCollapsed}
          onToggleCollapse={onToggleCollapse}
        />
      </aside>

      {mobileOpen ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-slate-900/40 lg:hidden"
            aria-label="Tutup menu"
            onClick={closeMobile}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-[min(100%,288px)] flex-col bg-white shadow-xl lg:hidden">
            <div className="flex items-center justify-end border-b border-slate-200 px-3 py-2">
              <button
                type="button"
                onClick={closeMobile}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100"
                aria-label="Tutup menu"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <UserSidebar
              schoolName={schoolName}
              logoUrl={logoUrl}
              hasLogo={hasLogo}
              userName={userName}
              onNavigate={closeMobile}
            />
          </aside>
        </>
      ) : null}

      <div className="user-main flex min-h-dvh min-w-0 flex-1 flex-col">
        <UserHeader schoolName={schoolName} onOpenMenu={openMobile} />
        <main className="flex-1 px-4 py-6 md:px-6 md:py-8">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
