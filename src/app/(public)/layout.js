import { auth } from "@/auth.js";
import { getPublicDashboardHref } from "@/lib/auth-redirect.js";
import { getPublicSchoolBranding } from "@/modules/cms/school-settings.js";
import { PublicNavbar, PublicFooter } from "@/components/layout/index.js";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }) {
  const [school, session] = await Promise.all([getPublicSchoolBranding(), auth()]);
  const dashboardHref = session?.user?.role
    ? getPublicDashboardHref(session.user.role)
    : null;

  return (
    <div className="flex min-h-full flex-col bg-white">
      <PublicNavbar
        schoolName={school.name}
        logoUrl={school.logoUrl}
        hasLogo={school.hasLogo}
        dashboardHref={dashboardHref}
      />
      <main className="min-w-0 flex-1 w-full">{children}</main>
      <PublicFooter
        schoolName={school.name}
        tagline={school.tagline}
        logoUrl={school.logoUrl}
        hasLogo={school.hasLogo}
      />
    </div>
  );
}
