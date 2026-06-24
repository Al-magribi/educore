import { requireRole } from "@/lib/auth.js";
import { ROLES } from "@/config/roles.js";
import { getApplicantQuestionnairePageData } from "@/modules/spmb/services/applicant-questionnaire.js";
import { KuesionerPageView } from "@/components/spmb/KuesionerPageView.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kuesioner SPMB",
};

export default async function SpmbKuesionerPage() {
  const session = await requireRole(ROLES.APPLICANT);
  const initialData = await getApplicantQuestionnairePageData(session.user.id);

  return <KuesionerPageView initialData={initialData} />;
}
