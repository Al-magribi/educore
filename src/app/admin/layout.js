import { prisma } from "@/lib/db.js";
import { isAppUploadUrl } from "@/lib/storage/urls.js";
import { toAdminThemeVars } from "@/lib/admin/theme-vars.js";
import { getThemeSettings } from "@/modules/theme/index.js";
import { requireRole } from "@/lib/auth.js";
import { ROLES } from "@/config/roles.js";
import { AdminShell } from "@/components/admin/layout/index.js";
import "./admin.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
};

async function getAdminLayoutData() {
  const [school, theme] = await Promise.all([
    prisma.schoolSettings.findUnique({
      where: { id: "default" },
      select: { name: true, logoUrl: true },
    }),
    getThemeSettings(),
  ]);

  const logoUrl = school?.logoUrl?.trim() ?? "";

  return {
    schoolName: school?.name ?? "EduCore",
    logoUrl,
    hasLogo: isAppUploadUrl(logoUrl),
    themeStyle: toAdminThemeVars(theme),
  };
}

export default async function AdminLayout({ children }) {
  const [layoutData, session] = await Promise.all([
    getAdminLayoutData(),
    requireRole(ROLES.SUPER_ADMIN, ROLES.CMS_ADMIN),
  ]);
  const { schoolName, logoUrl, hasLogo, themeStyle } = layoutData;

  return (
    <AdminShell
      schoolName={schoolName}
      logoUrl={logoUrl}
      hasLogo={hasLogo}
      themeStyle={themeStyle}
      userName={session?.user?.name}
    >
      {children}
    </AdminShell>
  );
}
