import { requireRole } from "@/lib/auth.js";
import { ROLES } from "@/config/roles.js";
import { getApplicantDashboardData } from "@/modules/spmb/services/applicant-dashboard.js";
import { UserDashboard } from "@/components/user/index.js";

export const dynamic = "force-dynamic";

export default async function UserDashboardPage() {
  const session = await requireRole(ROLES.APPLICANT);
  const data = await getApplicantDashboardData(session.user.id);

  return <UserDashboard userName={session.user.name} data={data} />;
}
