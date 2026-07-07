"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminHeader } from "./AdminHeader.js";
import { AdminSidebar } from "./AdminSidebar.js";

const STORAGE_KEY = "educore-admin-sidebar-collapsed";

export function AdminShell({ children, schoolName, logoUrl, hasLogo, themeStyle, userName }) {
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
      className="admin-root min-h-dvh"
      data-sidebar-collapsed={collapsed ? "true" : "false"}
      style={themeStyle}
      suppressHydrationWarning
    >
      <AdminSidebar
        collapsed={mounted ? collapsed : false}
        onToggleCollapse={onToggleCollapse}
        schoolName={schoolName}
        logoUrl={logoUrl}
        hasLogo={hasLogo}
      />

      {/* Backdrop mobile saat sidebar terbuka lebar */}
      {!collapsed && mounted ? (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
          aria-label="Tutup menu"
          onClick={onToggleCollapse}
        />
      ) : null}

      <div className="admin-main flex h-dvh flex-col overflow-hidden">
        <AdminHeader
          collapsed={collapsed}
          onToggleCollapse={onToggleCollapse}
          schoolName={schoolName}
          userName={userName}
        />
        <main
          className="admin-content min-h-0 flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 lg:p-8"
          style={{ backgroundColor: "var(--admin-content-bg)" }}
        >
          <div className="mx-auto max-w-[1400px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
