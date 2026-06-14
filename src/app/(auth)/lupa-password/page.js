import { AuthShell, ForgotPasswordForm } from "@/components/auth/index.js";

export const metadata = {
  title: "Lupa Password",
  description: "Reset password akun SPMB",
};

export default function LupaPasswordPage() {
  return (
    <AuthShell
      title="Lupa Password"
      subtitle="Masukkan email terdaftar. Kami akan mengirim tautan untuk mengatur ulang password."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
