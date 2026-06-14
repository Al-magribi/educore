import { PaymentSettingsForm } from "@/components/spmb-admin/PaymentSettingsForm.js";

export const metadata = {
  title: "Pengaturan Pembayaran",
};

export default function SpmbAdminPembayaranPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">Pembayaran</h1>
      <p className="mt-2 text-slate-600">
        Konfigurasi transfer manual dan Midtrans — disimpan di database PostgreSQL.
      </p>
      <div className="mt-8">
        <PaymentSettingsForm />
      </div>
    </>
  );
}
