import { requireRole } from "@/lib/auth.js";
import { ROLES } from "@/config/roles.js";
import { getInvoiceData } from "@/modules/payment/invoice.js";
import { InvoicePrintView } from "@/components/spmb-admin/pembayaran/InvoicePrintView.jsx";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoice Pembayaran",
};

export default async function SpmbAdminInvoicePage({ params }) {
  await requireRole(ROLES.SPMB_ADMIN);
  const { id } = await params;
  const invoice = await getInvoiceData(id);

  return <InvoicePrintView initialInvoice={invoice} paymentId={id} />;
}
