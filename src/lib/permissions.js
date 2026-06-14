import { ROLES } from "@/config/roles.js";

const ROLE_PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: ["cms:*", "spmb:admin-users"],
  [ROLES.CMS_ADMIN]: ["cms:*"],
  [ROLES.SPMB_ADMIN]: ["spmb:*"],
  [ROLES.APPLICANT]: ["spmb:apply"],
};

export function can(role, permission) {
  const permissions = ROLE_PERMISSIONS[role] ?? [];
  return permissions.some(
    (p) => p === permission || (p.endsWith(":*") && permission.startsWith(p.slice(0, -1)))
  );
}
