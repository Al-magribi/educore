import { getPublicSchoolBranding } from "@/modules/cms/school-settings.js";
import { requireRole } from "@/lib/auth.js";
import { ROLES } from "@/config/roles.js";
import { UserShell } from "@/components/user/index.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Portal SPMB",
};

export default async function SpmbApplicantLayout({ children }) {
  const session = await requireRole(ROLES.APPLICANT);
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
