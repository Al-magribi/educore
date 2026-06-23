"use client";

import { useCallback, useEffect, useState } from "react";
import { SpmbAdminHeader } from "./SpmbAdminHeader.js";
import { SpmbAdminSidebar } from "./SpmbAdminSidebar.js";

const STORAGE_KEY = "educore-spmb-admin-sidebar-collapsed";

export function SpmbAdminShell({
  children,
  schoolName,
  logoUrl,
  hasLogo,
  themeStyle,
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored !== null) {
        setCollapsed(stored === "true");
      } else if (window.matchMedia("(max-width: 1023px)").matches) {
        setCollapsed(true);
      }
    } catch {
      /* ignore */
    }
    setMounted(true);
  }, []);

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

  return (
    <div
      className="admin-root h-dvh max-h-dvh"
      data-sidebar-collapsed={collapsed ? "true" : "false"}
      style={themeStyle}
      suppressHydrationWarning
    >
      <SpmbAdminSidebar
        collapsed={mounted ? collapsed : false}
        onToggleCollapse={onToggleCollapse}
        schoolName={schoolName}
        logoUrl={logoUrl}
        hasLogo={hasLogo}
      />

      {!collapsed && mounted ? (
        <button
          type='button'
          className='fixed inset-0 z-30 bg-slate-900/40 lg:hidden'
          aria-label='Tutup menu'
          onClick={onToggleCollapse}
        />
      ) : null}

      <div className="admin-main flex h-full min-h-0 flex-col overflow-hidden">
        <SpmbAdminHeader
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          schoolName={schoolName}
        />
        <main
          className="admin-content min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-y-contain p-4 md:p-6 lg:p-8"
          style={{ backgroundColor: "var(--admin-content-bg)" }}
        >
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
