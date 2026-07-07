import { Suspense } from "react";
import { AuthShell, LoginForm } from "@/components/auth/index.js";
import { LoginNotice } from "@/components/auth/LoginNotice.js";

export const metadata = {
  title: "Masuk",
  description: "Login portal SPMB calon siswa dan admin",
};

export default function MasukPage() {
  return (
    <AuthShell
      title="Masuk"
      subtitle="Gunakan email dan password yang telah Anda daftarkan."
    >
      <Suspense fallback={<div className="h-40 animate-pulse rounded-xl bg-slate-100" />}>
        <LoginNotice />
      </Suspense>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-slate-100" />}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
