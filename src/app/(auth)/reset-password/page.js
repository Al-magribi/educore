import { Suspense } from "react";
import { AuthShell, ResetPasswordForm } from "@/components/auth/index.js";
import { AuthLoadingFallback } from "@/components/auth/AuthLoadingFallback.js";

export const metadata = {
  title: "Reset Password",
  description: "Atur password baru akun SPMB",
};

function ResetPasswordContent() {
  return (
    <AuthShell
      title="Reset Password"
      subtitle="Buat password baru untuk akun Anda."
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthLoadingFallback />}>
      <ResetPasswordContent />
    </Suspense>
  );
}
