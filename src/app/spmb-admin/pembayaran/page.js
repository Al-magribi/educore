import PaymentList from "@/components/spmb-admin/pembayaran/PaymentList.jsx";
import { getAdminPaymentSettings } from "@/modules/payment/settings.js";
import { listPayments } from "@/modules/payment/payments.js";

export const metadata = {
  title: "Pembayaran",
};

export const dynamic = "force-dynamic";

export default async function SpmbAdminPembayaranPage() {
  const [payments, settings] = await Promise.all([
    listPayments({ page: 1, limit: 10 }),
    getAdminPaymentSettings(),
  ]);

  return (
    <PaymentList
      initialItems={payments.items}
      initialPagination={payments.pagination}
      initialActivePeriod={payments.activePeriod}
      initialSettings={{
        midtransEnabled: settings?.midtransEnabled ?? false,
        manualEnabled: settings?.manualEnabled ?? true,
      }}
    />
  );
}
