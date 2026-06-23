"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { OtpInput } from "./OtpInput.js";
import { AuthButton } from "./AuthButton.js";

export function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "email Anda";

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resent, setResent] = useState(false);
  const [resendError, setResendError] = useState("");
  const [countdown, setCountdown] = useState(60);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Masukkan 6 digit kode verifikasi");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: typeof email === "string" ? email : "",
          code,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Verifikasi gagal. Coba lagi.");
        return;
      }

      router.push("/masuk?verified=1");
    } catch {
      setError("Koneksi gagal. Periksa jaringan Anda.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResendError("");
    setResent(true);

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setResendError(data.error || "Gagal mengirim ulang kode.");
        return;
      }

      setCountdown(60);
    } catch {
      setResendError("Koneksi gagal. Periksa jaringan Anda.");
    } finally {
      setResent(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.75}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700">Periksa kotak masuk Anda</p>
      </div>

      <div className="rounded-xl bg-primary/5 px-4 py-3 text-center text-sm text-slate-600">
        Kode verifikasi 6 digit telah dikirim ke{" "}
        <span className="font-semibold text-slate-900">{email}</span>
      </div>

      <div>
        <p className="mb-4 text-center text-sm font-medium text-slate-700">
          Masukkan kode 6 digit
        </p>
        <OtpInput length={6} value={code} onChange={setCode} />
        {error && <p className="mt-3 text-center text-xs text-red-600">{error}</p>}
      </div>

      <AuthButton disabled={loading || code.length !== 6}>
        {loading ? "Memverifikasi..." : "Verifikasi Email"}
      </AuthButton>

      <div className="text-center text-sm text-slate-600">
        Tidak menerima kode?{" "}
        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || resent}
          className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {resent
            ? "Mengirim..."
            : countdown > 0
              ? `Kirim ulang (${countdown}s)`
              : "Kirim ulang"}
        </button>
        {resendError ? (
          <p className="mt-2 text-xs text-red-600">{resendError}</p>
        ) : null}
      </div>

      <p className="text-center text-sm text-slate-500">
        <Link href="/daftar" className="text-primary hover:underline">
          Ubah alamat email
        </Link>
      </p>
    </form>
  );
}
