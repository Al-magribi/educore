import { prisma } from "@/lib/db.js";
import { isAppUploadUrl } from "@/lib/storage/urls.js";
import { toAdminThemeVars } from "@/lib/admin/theme-vars.js";
import { getThemeSettings } from "@/modules/theme/index.js";
import { getPublicSchoolBranding } from "@/modules/cms/school-settings.js";
import { requireAuth } from "@/lib/auth.js";
import { ROLES } from "@/config/roles.js";
import { UserShell } from "@/components/user/index.js";
import { AdminShell } from "@/components/admin/layout/index.js";
import { SpmbAdminShell } from "@/components/spmb-admin/layout/index.js";
import "@/app/admin/admin.css";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Profil Saya",
};

async function getAdminShellData() {
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

export default async function ProfileLayout({ children }) {
  const session = await requireAuth();
  const role = session.user.role;

  if (role === ROLES.APPLICANT) {
    const school = await getPublicSchoolBranding();
    return (
      <UserShell
        schoolName={school.name}
        logoUrl={school.logoUrl}
        hasLogo={school.hasLogo}
        userName={session.user.name}
      >
        {children}
      </UserShell>
    );
  }

  const shellData = await getAdminShellData();

  if (role === ROLES.SPMB_ADMIN) {
    return (
      <SpmbAdminShell
        schoolName={shellData.schoolName}
        logoUrl={shellData.logoUrl}
        hasLogo={shellData.hasLogo}
        themeStyle={shellData.themeStyle}
        userName={session.user.name}
      >
        {children}
      </SpmbAdminShell>
    );
  }

  return (
    <AdminShell
      schoolName={shellData.schoolName}
      logoUrl={shellData.logoUrl}
      hasLogo={shellData.hasLogo}
      themeStyle={shellData.themeStyle}
      userName={session.user.name}
    >
      {children}
    </AdminShell>
  );
}
