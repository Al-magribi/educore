import { prisma } from "@/lib/db.js";
import { isAppUploadUrl } from "@/lib/storage/urls.js";
import { toAdminThemeVars } from "@/lib/admin/theme-vars.js";
import { getThemeSettings } from "@/modules/theme/index.js";
import { SpmbAdminShell } from "@/components/spmb-admin/layout/index.js";
import "@/app/admin/admin.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin SPMB",
};

async function getSpmbAdminLayoutData() {
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

export default async function SpmbAdminLayout({ children }) {
  const { schoolName, logoUrl, hasLogo, themeStyle } = await getSpmbAdminLayoutData();

  return (
    <SpmbAdminShell
      schoolName={schoolName}
      logoUrl={logoUrl}
      hasLogo={hasLogo}
      themeStyle={themeStyle}
    >
      {children}
    </SpmbAdminShell>
  );
}
