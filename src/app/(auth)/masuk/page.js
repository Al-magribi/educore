import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth.js";
import { AuthShell, LoginForm } from "@/components/auth/index.js";
import { LoginNotice } from "@/components/auth/LoginNotice.js";
import { getLoginRedirect } from "@/lib/auth-redirect.js";

export const metadata = {
  title: "Masuk",
  description: "Login portal SPMB calon siswa dan admin",
};

export default async function MasukPage() {
  const session = await auth();
  if (session?.user?.role) {
    redirect(getLoginRedirect(session.user.role));
  }

  return (
    <AuthShell
      title="Masuk"
      subtitle="Gunakan email dan password yang telah Anda daftarkan."
    >
      <Suspense fallback={null}>
        <LoginNotice />
      </Suspense>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </AuthShell>
  );
}
