import { SmtpSettingsForm } from "@/components/spmb-admin/SmtpSettingsForm.js";

export const metadata = {
  title: "Pengaturan SMTP",
};

export default function SpmbAdminSmtpPage() {
  return (
    <>
      <h1 className="text-2xl font-bold">SMTP</h1>
      <p className="mt-2 text-slate-600">
        Konfigurasi Gmail / SMTP untuk email verifikasi dan konfirmasi pembayaran — disimpan
        di database.
      </p>
      <div className="mt-8">
        <SmtpSettingsForm />
      </div>
    </>
  );
}
