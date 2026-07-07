"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "next-auth/react";
import { SchoolBrandMark } from "@/components/branding/SchoolBrandMark.js";
import { IconChevronLeft, IconChevronRight, IconExternal, IconLogout } from "./icons.js";
import { userNavActions, userNavItems } from "./nav-config.js";

function isActive(pathname, href, exact) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function UserSidebar({
  schoolName,
  logoUrl,
  hasLogo,
  userName,
  collapsed = false,
  onToggleCollapse,
  onNavigate,
}) {
  const pathname = usePathname();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await signOut({ redirectTo: "/masuk" });
    } catch {
      setLoggingOut(false);
    }
  };

  const userInitial = userName?.charAt(0).toUpperCase() ?? "?";
  const profileActive = pathname === "/profile" || pathname.startsWith("/profile/");

  const userProfileLink = userName ? (
    <Link
      href="/profile"
      onClick={onNavigate}
      title={collapsed ? userName : "Buka profil"}
      className={collapsed ? "flex justify-center" : "block"}
    >
      {collapsed ? (
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground ${
            profileActive ? "ring-2 ring-primary/40 ring-offset-2" : ""
          }`}
        >
          {userInitial}
        </span>
      ) : (
        <div
          className={`rounded-xl border px-3 py-3 transition hover:border-primary/30 hover:bg-primary/5 ${
            profileActive
              ? "border-primary/40 bg-primary/5"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <p className="text-xs text-slate-500">Masuk sebagai</p>
          <p className="mt-0.5 truncate text-sm font-semibold text-slate-900">{userName}</p>
        </div>
      )}
    </Link>
  ) : null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div
        className={`flex shrink-0 border-b border-slate-200 ${
          collapsed ? "flex-col items-center gap-2 px-2 py-4" : "items-center justify-between gap-2 px-4 py-5"
        }`}
      >
        <Link
          href="/user"
          className={`flex min-w-0 items-center ${collapsed ? "justify-center" : "gap-3"}`}
          onClick={onNavigate}
          title={collapsed ? schoolName : undefined}
        >
          <SchoolBrandMark logoUrl={logoUrl} schoolName={schoolName} hasLogo={hasLogo} />
          {!collapsed ? (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{schoolName}</p>
              <p className="truncate text-xs text-slate-500">Portal Calon Siswa</p>
            </div>
          ) : null}
        </Link>

        {!collapsed && onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Persempit sidebar"
            title="Persempit sidebar"
          >
            <IconChevronLeft className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {userProfileLink ? (
        <div className={`shrink-0 border-b border-slate-200 px-3 py-3 ${collapsed ? "px-2" : ""}`}>
          {userProfileLink}
        </div>
      ) : null}

      <nav
        className="flex-1 space-y-1 overflow-x-hidden overflow-y-auto overscroll-contain px-3 py-4"
        aria-label="Menu pendaftaran"
      >
        {!collapsed ? (
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Menu SPMB
          </p>
        ) : null}
        {userNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(pathname, item.href, item.exact);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              title={collapsed ? item.label : undefined}
              className={`flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition ${
                collapsed ? "justify-center px-2" : "px-3"
              } ${
                active
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span className="truncate">{item.label}</span> : null}
            </Link>
          );
        })}
      </nav>

      <div className="shrink-0 space-y-1 border-t border-slate-200 px-3 py-4">
        {userNavActions.map((action) => {
          if (action.id === "logout") {
            return (
              <button
                key={action.id}
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title={collapsed ? action.label : undefined}
                className={`flex w-full items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-rose-600 transition hover:bg-rose-50 disabled:opacity-60 ${
                  collapsed ? "justify-center px-2" : "px-3"
                }`}
              >
                <IconLogout className="h-5 w-5 shrink-0" />
                {!collapsed ? <span>{loggingOut ? "Keluar..." : action.label}</span> : null}
              </button>
            );
          }

          const Icon = action.icon ?? IconExternal;
          return (
            <Link
              key={action.id}
              href={action.href}
              onClick={onNavigate}
              title={collapsed ? action.label : undefined}
              className={`flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 ${
                collapsed ? "justify-center px-2" : "px-3"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!collapsed ? <span>{action.label}</span> : null}
            </Link>
          );
        })}

        {collapsed && onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mt-1 flex w-full items-center justify-center rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Perlebar sidebar"
            title="Perlebar sidebar"
          >
            <IconChevronRight className="h-5 w-5" />
          </button>
        ) : null}

        {!collapsed && onToggleCollapse ? (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="mt-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Persempit sidebar"
          >
            <IconChevronLeft className="h-5 w-5 shrink-0" />
            <span>Persempit menu</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}
