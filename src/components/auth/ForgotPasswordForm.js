"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthField } from "./AuthField.js";
import { AuthButton } from "./AuthButton.js";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Masukkan email yang valid");
      return;
    }
    setError("");
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <div className="space-y-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Email terkirim</h2>
          <p className="mt-2 text-sm text-slate-600">
            Jika akun terdaftar, tautan reset password telah dikirim ke{" "}
            <span className="font-medium text-slate-900">{email}</span>.
          </p>
        </div>
        <Link
          href="/reset-password?token=demo"
          className="inline-block text-sm font-semibold text-primary hover:underline"
        >
          Buka halaman reset (demo)
        </Link>
        <Link
          href="/masuk"
          className="block text-sm text-slate-500 hover:text-primary"
        >
          Kembali ke masuk
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <AuthField
        id="email"
        label="Email terdaftar"
        type="email"
        placeholder="nama@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error}
        required
        autoComplete="email"
        hint="Kami akan mengirim tautan reset password ke email ini."
      />

      <AuthButton disabled={loading}>
        {loading ? "Mengirim..." : "Kirim Tautan Reset"}
      </AuthButton>

      <p className="text-center text-sm text-slate-600">
        <Link href="/masuk" className="font-semibold text-primary hover:underline">
          Kembali ke masuk
        </Link>
      </p>
    </form>
  );
}
