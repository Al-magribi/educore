"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { AuthField } from "./AuthField.js";
import { AuthButton } from "./AuthButton.js";
import { canAccessPath, getLoginRedirect } from "@/lib/auth-redirect.js";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form, setForm] = useState({ email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    if (!form.email.trim()) next.email = "Email wajib diisi";
    if (!form.password) next.password = "Password wajib diisi";
    setErrors(next);
    if (Object.keys(next).length) return;

    setLoading(true);
    setErrors({});

    const result = await signIn("credentials", {
      email: form.email.trim().toLowerCase(),
      password: form.password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      if (result.code === "email_not_verified") {
        setErrors({
          form: "Email belum diverifikasi. Periksa kotak masuk Anda atau daftar ulang.",
        });
      } else {
        setErrors({ form: "Email atau password salah." });
      }
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role;
    const callbackUrl = searchParams.get("callbackUrl");

    setLoading(false);

    if (callbackUrl && canAccessPath(role, callbackUrl)) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }

    router.push(getLoginRedirect(role));
    router.refresh();
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
        id="password"
        label="Password"
        type="password"
        placeholder="••••••••"
        value={form.password}
        onChange={set("password")}
        error={errors.password}
        required
        autoComplete="current-password"
      />

      <div className="flex justify-end">
        <Link
          href="/lupa-password"
          className="text-sm font-medium text-primary hover:underline"
        >
          Lupa password?
        </Link>
      </div>

      <AuthButton disabled={loading}>{loading ? "Memproses..." : "Masuk"}</AuthButton>

      <p className="text-center text-sm text-slate-600">
        Belum punya akun?{" "}
        <Link href="/daftar" className="font-semibold text-primary hover:underline">
          Daftar sekarang
        </Link>
      </p>
    </form>
  );
}
