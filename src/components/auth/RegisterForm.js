"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthField } from "./AuthField.js";
import { AuthButton } from "./AuthButton.js";

export function RegisterForm() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.name.trim()) next.name = "Nama wajib diisi";
    if (!form.email.trim()) next.email = "Email wajib diisi";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = "Format email tidak valid";
    if (!form.password) next.password = "Password wajib diisi";
    else if (form.password.length < 8) next.password = "Minimal 8 karakter";
    if (form.password !== form.confirmPassword) next.confirmPassword = "Password tidak cocok";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim() || undefined,
          password: form.password,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.error || "Gagal mendaftar. Coba lagi." });
        return;
      }

      router.push(`/verifikasi-email?email=${encodeURIComponent(data.email)}`);
    } catch {
      setErrors({ form: "Koneksi gagal. Periksa jaringan Anda." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errors.form ? (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {errors.form}
        </div>
      ) : null}
      <AuthField
        id="name"
        label="Nama Lengkap"
        placeholder="Sesuai akta kelahiran"
        value={form.name}
        onChange={set("name")}
        error={errors.name}
        required
        autoComplete="name"
      />
      <AuthField
        id="email"
        label="Email"
        type="email"
        placeholder="nama@email.com"
        value={form.email}
        onChange={set("email")}
        error={errors.email}
        required
        autoComplete="email"
      />
      <AuthField
        id="phone"
        label="No. WhatsApp"
        type="tel"
        placeholder="08xxxxxxxxxx"
        value={form.phone}
        onChange={set("phone")}
        hint="Opsional — untuk notifikasi SPMB"
        autoComplete="tel"
      />
      <AuthField
        id="password"
        label="Password"
        type="password"
        placeholder="Minimal 8 karakter"
        value={form.password}
        onChange={set("password")}
        error={errors.password}
        required
        autoComplete="new-password"
      />
      <AuthField
        id="confirmPassword"
        label="Konfirmasi Password"
        type="password"
        placeholder="Ulangi password"
        value={form.confirmPassword}
        onChange={set("confirmPassword")}
        error={errors.confirmPassword}
        required
        autoComplete="new-password"
      />

      <p className="text-xs leading-relaxed text-slate-500">
        Dengan mendaftar, Anda menyetujui ketentuan pendaftaran SPMB sekolah.
      </p>

      <AuthButton disabled={loading}>{loading ? "Memproses..." : "Daftar"}</AuthButton>

      <p className="text-center text-sm text-slate-600">
        Sudah punya akun?{" "}
        <Link href="/masuk" className="font-semibold text-primary hover:underline">
          Masuk
        </Link>
      </p>
    </form>
  );
}
