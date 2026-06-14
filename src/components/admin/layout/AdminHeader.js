"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { IconChevronRight, IconSearch } from "./icons.js";
import { adminNavItems } from "./nav-config.js";

function getPageTitle(pathname) {
  const item = adminNavItems.find((nav) =>
    nav.exact ? pathname === nav.href : pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.label ?? "Admin";
}

export function AdminHeader({ collapsed, onToggleCollapse, schoolName }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

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
        <label className="relative hidden max-w-xs flex-1 sm:block md:max-w-sm">
          <span className="sr-only">Cari</span>
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            placeholder="Cari menu, halaman..."
            className="h-9 w-full rounded-xl border bg-slate-50/80 py-2 pl-9 pr-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[var(--admin-primary)] focus:bg-white focus:ring-2 focus:ring-[var(--admin-ring)]"
            style={{ borderColor: "var(--admin-surface-border)" }}
            disabled
          />
        </label>

        <Link
          href="/admin/tema"
          className="hidden h-9 w-9 rounded-xl border sm:flex sm:items-center sm:justify-center"
          style={{
            borderColor: "var(--admin-surface-border)",
            background: "var(--admin-primary-soft)",
          }}
          title="Palet warna"
        >
          <span
            className="h-4 w-4 rounded-full ring-2 ring-white"
            style={{ background: "var(--admin-primary)" }}
          />
        </Link>

        <div
          className="flex items-center gap-2 rounded-xl border py-1.5 pl-1.5 pr-3"
          style={{ borderColor: "var(--admin-surface-border)" }}
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold"
            style={{
              background: "var(--admin-primary)",
              color: "var(--admin-primary-foreground)",
            }}
          >
            AD
          </span>
          <span className="hidden text-sm font-medium text-slate-700 md:inline">Admin</span>
        </div>
      </div>
    </header>
  );
}
