import { listQuestionnaires } from "@/modules/spmb/questionnaires.js";
import KuesionerAdmin from "@/components/spmb-admin/kuesioner/KuesionerAdmin.jsx";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Kuesioner",
};

export default async function SpmbAdminKuesionerPage() {
  const questionnaires = await listQuestionnaires();

  return <KuesionerAdmin initialQuestionnaires={questionnaires} />;
}
