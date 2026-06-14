import { AuthShell, RegisterForm } from "@/components/auth/index.js";

export const metadata = {
  title: "Daftar",
  description: "Registrasi akun calon siswa SPMB",
};

export default function DaftarPage() {
  return (
    <AuthShell
      title="Buat Akun"
      subtitle="Daftar untuk mengikuti penerimaan siswa baru. Setelah mendaftar, verifikasi email Anda."
    >
      <RegisterForm />
    </AuthShell>
  );
}
