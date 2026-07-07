import { AdminFormEditor } from "@/components/spmb-admin/pendaftaran/AdminFormEditor.jsx";
import { getAdminApplicationFormData } from "@/modules/spmb/services/admin-form.js";

export const metadata = {
  title: "Isi formulir pendaftar",
};

export const dynamic = "force-dynamic";

export default async function AdminApplicantFormPage({ params }) {
  const { id } = await params;

  let initialData = null;
  try {
    initialData = await getAdminApplicationFormData(id);
  } catch {
    initialData = null;
  }

  return <AdminFormEditor applicationId={id} initialData={initialData} />;
}
