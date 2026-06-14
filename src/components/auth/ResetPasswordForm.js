"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthField } from "./AuthField.js";
import { AuthButton } from "./AuthButton.js";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  if (!token) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-red-600">Tautan reset tidak valid atau sudah kedaluwarsa.</p>
        <Link href="/lupa-password" className="text-sm font-semibold text-primary hover:underline">
          Minta tautan baru
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.password) next.password = "Password wajib diisi";
    else if (form.password.length < 8) next.password = "Minimal 8 karakter";
    if (form.password !== form.confirmPassword) next.confirmPassword = "Password tidak cocok";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setDone(true);
    setTimeout(() => router.push("/masuk"), 2000);
  };

  if (done) {
    return (
      <div className="space-y-4 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <p className="text-sm text-slate-600">Password berhasil diubah. Mengalihkan ke halaman masuk...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthField
        id="password"
        label="Password Baru"
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
        label="Konfirmasi Password Baru"
        type="password"
        placeholder="Ulangi password"
        value={form.confirmPassword}
        onChange={set("confirmPassword")}
        error={errors.confirmPassword}
        required
        autoComplete="new-password"
      />

      <AuthButton disabled={loading}>
        {loading ? "Menyimpan..." : "Simpan Password Baru"}
      </AuthButton>

      <p className="text-center text-sm text-slate-600">
        <Link href="/masuk" className="font-semibold text-primary hover:underline">
          Kembali ke masuk
        </Link>
      </p>
    </form>
  );
}
