import { ROLES } from "@/config/roles.js";

/** @param {string | undefined} role */
export function getLoginRedirect(role) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.CMS_ADMIN:
      return "/admin";
    case ROLES.SPMB_ADMIN:
      return "/spmb-admin";
    case ROLES.APPLICANT:
      return "/spmb/dashboard";
    default:
      return "/";
  }
}

/** Tujuan tombol Dashboard di navbar publik. */
export function getPublicDashboardHref(role) {
  switch (role) {
    case ROLES.SUPER_ADMIN:
    case ROLES.CMS_ADMIN:
      return "/admin";
    default:
      return "/spmb";
  }
}

/** @param {string | undefined} role @param {string} pathname */
export function canAccessPath(role, pathname) {
  if (pathname.startsWith("/admin")) {
    return role === ROLES.SUPER_ADMIN || role === ROLES.CMS_ADMIN;
  }
  if (pathname.startsWith("/spmb-admin")) {
    return role === ROLES.SUPER_ADMIN || role === ROLES.SPMB_ADMIN;
  }
  if (pathname.startsWith("/spmb/")) {
    return role === ROLES.APPLICANT;
  }
  return true;
}
