import PendaftaranAdmin from "@/components/spmb-admin/pendaftaran/PendaftaranAdmin.jsx";
import { listApplications } from "@/modules/spmb/applications.js";

export const metadata = {
  title: "Pendaftaran",
};

export const dynamic = "force-dynamic";

export default async function SpmbAdminPendaftaranPage() {
  const applicants = await listApplications();
  return <PendaftaranAdmin initialApplicants={applicants} />;
}
