import { redirect } from "next/navigation";

export default function SpmbAdminSmtpRedirectPage() {
  redirect("/spmb-admin/pengaturan?tab=smtp");
}
