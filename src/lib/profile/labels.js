import { ROLES } from "@/config/roles.js";

const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: "Super Admin",
  [ROLES.CMS_ADMIN]: "Admin CMS",
  [ROLES.SPMB_ADMIN]: "Admin SPMB",
  [ROLES.APPLICANT]: "Calon Siswa",
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] ?? role?.replace(/_/g, " ") ?? "Pengguna";
}

export function formatProfileDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}
