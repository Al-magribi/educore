import { Suspense } from "react";
import { AuthShell, VerifyEmailForm } from "@/components/auth/index.js";
import { AuthLoadingFallback } from "@/components/auth/AuthLoadingFallback.js";

export const metadata = {
  title: "Verifikasi Email",
  description: "Konfirmasi email dengan kode verifikasi",
};

function VerifyEmailContent() {
  return (
    <AuthShell
      title="Verifikasi Email"
      subtitle="Cek email Anda dan masukkan kode 6 digit untuk mengaktifkan akun."
    >
      <VerifyEmailForm />
    </AuthShell>
  );
}

export default function VerifikasiEmailPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
