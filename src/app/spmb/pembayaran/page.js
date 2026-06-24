import { requireRole } from "@/lib/auth.js";
import { ROLES } from "@/config/roles.js";
import { getApplicantPaymentPageData } from "@/modules/payment/applicant-payment.js";
import { PaymentPageView } from "@/components/spmb/PaymentPageView.js";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Pembayaran SPMB",
};

export default async function SpmbPembayaranPage() {
  const session = await requireRole(ROLES.APPLICANT);
  const initialData = await getApplicantPaymentPageData(session.user.id);

  return <PaymentPageView initialData={initialData} />;
}
