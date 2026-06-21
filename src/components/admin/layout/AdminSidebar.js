"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { SchoolBrandMark } from "@/components/branding/SchoolBrandMark.js";
import { IconChevronLeft, IconChevronRight, IconExternal } from "./icons.js";
import { adminNavActions, adminNavSections } from "./nav-config.js";

function isActive(pathname, href, exact) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminSidebar({ collapsed, onToggleCollapse, schoolName, logoUrl, hasLogo }) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleNavAction = async (action) => {
    if (action.id !== "logout" || loggingOut) return;

    setLoggingOut(true);
    try {
      await signOut({ redirectTo: action.redirectTo ?? "/masuk" });
    } catch {
      setLoggingOut(false);
    }
  };

  const renderNavAction = (action) => {
    const Icon = action.icon;

    return (
      <button
        key={action.id}
        type="button"
        onClick={() => handleNavAction(action)}
        disabled={loggingOut}
        title={collapsed ? action.label : undefined}
        className={`admin-nav-item flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
          collapsed ? "justify-center px-2" : ""
        } ${action.id === "logout" ? "text-rose-300 hover:text-rose-200" : ""}`}
      >
        <Icon className="h-5 w-5 shrink-0" />
        {!collapsed ? <span className="truncate">{loggingOut ? "Keluar..." : action.label}</span> : null}
      </button>
    );
  };

  return (
    <aside
      className="admin-sidebar fixed inset-y-0 left-0 z-40 flex flex-col border-r"
      style={{
        backgroundColor: "var(--admin-sidebar-bg)",
        borderColor: "var(--admin-sidebar-border)",
      }}
      aria-label="Navigasi admin"
    >
      <div
        className={`flex h-[var(--admin-header-height)] shrink-0 items-center border-b px-3 ${
          collapsed ? "justify-center" : "justify-between gap-2"
        }`}
        style={{ borderColor: "var(--admin-sidebar-border)" }}
      >
        <Link
          href="/admin"
          className={`flex min-w-0 items-center gap-3 overflow-hidden ${collapsed ? "justify-center" : ""}`}
          title={schoolName}
        >
          <SchoolBrandMark
            logoUrl={logoUrl}
            schoolName={schoolName}
            hasLogo={hasLogo}
          />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{schoolName}</p>
              <p className="truncate text-xs text-slate-400">Admin CMS</p>
            </div>
          ) : null}
        </Link>

        {!collapsed ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-white/10 hover:text-white"
            aria-label="Persempit sidebar"
            title="Persempit sidebar"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4">
        {adminNavSections.map((section) => (
          <div key={section.title} className="mb-6 last:mb-0">
            {!collapsed ? (
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                {section.title}
              </p>
            ) : null}
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = isActive(pathname, item.href, item.exact);
                const Icon = item.icon;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      data-active={active ? "true" : "false"}
                      title={collapsed ? item.label : undefined}
                      className={`admin-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                        collapsed ? "justify-center px-2" : ""
                      }`}
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed ? <span className="truncate">{item.label}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div
        className="shrink-0 border-t p-3"
        style={{ borderColor: "var(--admin-sidebar-border)" }}
      >
        {collapsed ? (
          <div className="flex flex-col gap-1">
            {adminNavActions.map(renderNavAction)}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="admin-nav-item flex w-full items-center justify-center rounded-xl p-2.5 transition"
              aria-label="Perlebar sidebar"
              title="Perlebar sidebar"
            >
              <IconChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : (
          <>
            <Link
              href="/"
              target="_blank"
              className="admin-nav-item flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
            >
              <IconExternal className="h-5 w-5 shrink-0" />
              <span>Lihat situs</span>
            </Link>
            {adminNavActions.map(renderNavAction)}
            <button
              type="button"
              onClick={onToggleCollapse}
              className="admin-nav-item mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition"
              aria-label="Persempit sidebar"
            >
              <IconChevronLeft className="h-5 w-5 shrink-0" />
              <span>Persempit menu</span>
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
