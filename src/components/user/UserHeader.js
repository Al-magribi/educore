"use client";

import { usePathname } from "next/navigation";
import { IconChevronRight, IconMenu } from "./icons.js";
import { userNavItems } from "./nav-config.js";

function getPageTitle(pathname) {
  if (pathname === "/profile" || pathname.startsWith("/profile/")) {
    return "Profil";
  }
  const item = userNavItems.find((nav) =>
    nav.exact ? pathname === nav.href : pathname === nav.href || pathname.startsWith(`${nav.href}/`)
  );
  return item?.label ?? "Portal Calon Siswa";
}

export function UserHeader({ schoolName, onOpenMenu }) {
  const pathname = usePathname();
  const pageTitle = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur md:px-6 lg:hidden">
      <button
        type="button"
        onClick={onOpenMenu}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50"
        aria-label="Buka menu"
      >
        <IconMenu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <p className="truncate text-xs text-slate-500">{schoolName}</p>
        <h1 className="truncate text-sm font-semibold text-slate-900">{pageTitle}</h1>
      </div>

      <IconChevronRight className="hidden h-4 w-4 shrink-0 text-slate-300 sm:block" aria-hidden />
    </header>
  );
}
