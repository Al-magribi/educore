"use client";

import { useSearchParams } from "next/navigation";

export function LoginNotice() {
  const searchParams = useSearchParams();
  const verified = searchParams.get("verified") === "1";

  if (!verified) return null;

  return (
    <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
      Email berhasil diverifikasi. Silakan masuk ke akun Anda.
    </div>
  );
}
