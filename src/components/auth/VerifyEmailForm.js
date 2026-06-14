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
  const [countdown, setCountdown] = useState(0);

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
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    router.push("/masuk?verified=1");
  };

  const handleResend = async () => {
    if (countdown > 0) return;
    setResent(true);
    setCountdown(60);
    await new Promise((r) => setTimeout(r, 500));
    setResent(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-xl bg-primary/5 px-4 py-3 text-center text-sm text-slate-600">
        Kode verifikasi dikirim ke{" "}
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
          disabled={countdown > 0}
          className="font-semibold text-primary hover:underline disabled:cursor-not-allowed disabled:text-slate-400"
        >
          {countdown > 0 ? `Kirim ulang (${countdown}s)` : "Kirim ulang"}
        </button>
      </div>

      <p className="text-center text-sm text-slate-500">
        <Link href="/daftar" className="text-primary hover:underline">
          Ubah alamat email
        </Link>
      </p>
    </form>
  );
}
