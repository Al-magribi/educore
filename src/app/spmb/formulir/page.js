import { requireRole } from "@/lib/auth.js";
import { ROLES } from "@/config/roles.js";
import { getApplicantFormPageData } from "@/modules/spmb/services/applicant-form.js";
import { FormulirPageView } from "@/components/spmb/FormulirPageView.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Formulir SPMB",
};

export default async function SpmbFormulirPage() {
  const session = await requireRole(ROLES.APPLICANT);
  const initialData = await getApplicantFormPageData(session.user.id);

  return <FormulirPageView initialData={initialData} />;
}
