"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChevronRight } from "./icons.js";
import { spmbNavItems } from "./nav-config.js";

function getPageTitle(pathname) {
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return "Profil";
  }
  const item = spmbNavItems.find((nav) =>
    nav.exact ? pathname === nav.href : pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.label ?? "Admin SPMB";
}

export function SpmbAdminHeader({ collapsed, onToggleCollapse, schoolName, userName }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);
  const displayName = userName?.trim() || "Admin SPMB";
  const userInitial = displayName.charAt(0).toUpperCase();

  return (
    <header
      className="z-30 flex h-[var(--admin-header-height)] shrink-0 items-center gap-4 border-b bg-white px-4 shadow-sm md:px-6"
      style={{ borderColor: "var(--admin-surface-border)" }}
    >
      <button
        type="button"
        onClick={onToggleCollapse}
        className="flex h-9 w-9 items-center justify-center rounded-lg border text-slate-600 transition hover:bg-slate-50 lg:hidden"
        style={{ borderColor: "var(--admin-surface-border)" }}
        aria-label={collapsed ? "Buka sidebar" : "Tutup sidebar"}
      >
        <span className="sr-only">Toggle menu</span>
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
          <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      <div className="hidden min-w-0 items-center gap-2 text-sm text-slate-500 sm:flex">
        <span className="truncate font-medium text-slate-400">{schoolName}</span>
        <IconChevronRight className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-semibold text-slate-900">{pageTitle}</span>
      </div>

      <h1 className="truncate text-base font-semibold text-slate-900 sm:hidden">{pageTitle}</h1>

      <div className="ml-auto flex items-center gap-3">
        <Link
          href="/profile"
          className="flex max-w-[200px] items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-3 transition hover:bg-slate-50"
          style={{ borderColor: "var(--admin-surface-border)" }}
          title="Profil saya"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
            style={{
              background: "var(--admin-primary)",
              color: "var(--admin-primary-foreground)",
            }}
          >
            {userInitial}
          </span>
          <span className="hidden truncate text-sm font-medium text-slate-700 md:inline">{displayName}</span>
        </Link>
      </div>
    </header>
  );
}
