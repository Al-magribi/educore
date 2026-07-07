import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth.js";
import { AuthShell, LoginForm } from "@/components/auth/index.js";
import { LoginNotice } from "@/components/auth/LoginNotice.js";
import { canAccessPath, getLoginRedirect } from "@/lib/auth-redirect.js";

export const metadata = {
  title: "Masuk",
  description: "Login portal SPMB calon siswa dan admin",
};

export default async function MasukPage({ searchParams }) {
  const session = await auth();
  if (session?.user?.role) {
    const params = await searchParams;
    const callbackUrl =
      typeof params?.callbackUrl === "string" ? params.callbackUrl : null;
    const destination =
      callbackUrl && canAccessPath(session.user.role, callbackUrl)
        ? callbackUrl
        : getLoginRedirect(session.user.role);
    redirect(destination);
  }

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
