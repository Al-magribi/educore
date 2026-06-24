"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STATUS_CONFIG = {
  pending: {
    label: "Menunggu pembayaran",
    tone: "amber",
    description: "Selesaikan pembayaran untuk melanjutkan pendaftaran.",
  },
  paid: {
    label: "Lunas",
    tone: "emerald",
    description: "Pembayaran telah dikonfirmasi. Anda dapat melanjutkan ke formulir.",
  },
  failed: {
    label: "Gagal",
    tone: "rose",
    description: "Pembayaran tidak berhasil. Silakan coba lagi.",
  },
  manual_review: {
    label: "Menunggu verifikasi",
    tone: "blue",
    description: "Bukti transfer sedang diverifikasi oleh admin SPMB.",
  },
};

const TONE_CLASSES = {
  amber: "bg-amber-50 text-amber-900 ring-amber-200",
  emerald: "bg-emerald-50 text-emerald-900 ring-emerald-200",
  rose: "bg-rose-50 text-rose-900 ring-rose-200",
  blue: "bg-blue-50 text-blue-900 ring-blue-200",
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
};

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount ?? 0);
}

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    tone: "slate",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${TONE_CLASSES[config.tone] ?? TONE_CLASSES.slate}`}
    >
      {config.label}
    </span>
  );
}

function CopyButton({ value, label }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      aria-label={`Salin ${label}`}
    >
      {copied ? "Tersalin" : "Salin"}
    </button>
  );
}

function BankDetailRow({ label, value, copyable = false }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 break-all text-sm font-semibold text-slate-900">{value || "—"}</p>
      </div>
      {copyable && value ? <CopyButton value={value} label={label} /> : null}
    </div>
  );
}

function loadMidtransSnap(scriptUrl, clientKey) {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && window.snap) {
      resolve(window.snap);
      return;
    }

    const existing = document.querySelector("script[data-midtrans-snap]");
    if (existing) {
      existing.addEventListener("load", () => resolve(window.snap));
      existing.addEventListener("error", reject);
      return;
    }

    const script = document.createElement("script");
    script.src = scriptUrl;
    script.setAttribute("data-client-key", clientKey);
    script.setAttribute("data-midtrans-snap", "true");
    script.async = true;
    script.onload = () => resolve(window.snap);
    script.onerror = () => reject(new Error("Gagal memuat Midtrans Snap"));
    document.body.appendChild(script);
  });
}

function MethodTabs({ methods, selected, onSelect }) {
  if (methods.length <= 1) return null;

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      {methods.map((method) => {
        const active = selected === method.id;
        return (
          <button
            key={method.id}
            type="button"
            onClick={() => onSelect(method.id)}
            className={`flex-1 rounded-xl border px-4 py-3 text-left transition ${
              active
                ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <p className={`text-sm font-semibold ${active ? "text-primary" : "text-slate-900"}`}>
              {method.label}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{method.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function ManualPaymentForm({ settings, amount, onSuccess, disabled }) {
  const inputRef = useRef(null);
  const [proofUrl, setProofUrl] = useState("");
  const [previewName, setPreviewName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "spmb_docs");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah bukti");

      setProofUrl(data.url);
      setPreviewName(file.name);
    } catch (err) {
      setError(err.message);
      setProofUrl("");
      setPreviewName("");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!proofUrl) {
      setError("Unggah bukti transfer terlebih dahulu");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/spmb/payment/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proofUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengirim bukti");

      onSuccess(data.payment, data.message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const hasBankInfo =
    settings.bankName || settings.bankAccountNumber || settings.bankAccountName;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {hasBankInfo ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-900">Rekening tujuan transfer</h3>
          <BankDetailRow label="Bank" value={settings.bankName} />
          <BankDetailRow
            label="Nomor rekening"
            value={settings.bankAccountNumber}
            copyable
          />
          <BankDetailRow label="Atas nama" value={settings.bankAccountName} copyable />
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Detail rekening belum dikonfigurasi admin. Hubungi sekolah untuk informasi transfer.
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Nominal transfer
        </p>
        <p className="mt-1 text-2xl font-bold text-slate-900">{formatRupiah(amount)}</p>
        <p className="mt-2 text-xs text-slate-500">
          Transfer sesuai nominal di atas agar verifikasi lebih cepat.
        </p>
      </div>

      {settings.manualInstructions ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900">Petunjuk pembayaran</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
            {settings.manualInstructions}
          </p>
        </div>
      ) : null}

      <div className="space-y-3">
        <label className="block text-sm font-semibold text-slate-900">
          Bukti transfer
          <span className="ml-1 text-rose-500">*</span>
        </label>
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/80 p-5 text-center">
          {proofUrl ? (
            <div className="space-y-3">
              {/\.(jpe?g|png|gif|webp)(\?|$)/i.test(proofUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={proofUrl}
                  alt="Pratinjau bukti pembayaran"
                  className="mx-auto max-h-48 rounded-lg border border-slate-200 object-contain"
                />
              ) : (
                <p className="text-sm text-slate-600">{previewName || "Bukti terunggah"}</p>
              )}
              <button
                type="button"
                onClick={() => {
                  setProofUrl("");
                  setPreviewName("");
                }}
                className="text-sm font-medium text-slate-600 underline-offset-2 hover:underline"
              >
                Ganti file
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-slate-600">
                Unggah screenshot atau foto bukti transfer (JPG, PNG, WebP — maks. 5 MB)
              </p>
              <label className="mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800">
                {uploading ? "Mengunggah..." : "Pilih file"}
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="sr-only"
                  disabled={uploading || disabled}
                  onChange={(e) => handleUpload(e.target.files?.[0])}
                />
              </label>
            </>
          )}
        </div>
      </div>

      {error ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      <button
        type="submit"
        disabled={disabled || submitting || uploading || !proofUrl}
        className="inline-flex w-full items-center justify-center rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {submitting ? "Mengirim..." : "Kirim bukti pembayaran"}
      </button>
    </form>
  );
}

function MidtransPaymentPanel({
  scriptUrl,
  clientKey,
  payment,
  onRefresh,
  disabled,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const openSnap = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch("/api/spmb/payment/midtrans", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai pembayaran");

      const snap = await loadMidtransSnap(scriptUrl, clientKey || data.clientKey);

      snap.pay(data.snapToken, {
        onSuccess: async () => {
          setMessage("Pembayaran berhasil. Memperbarui status...");
          await onRefresh(data.payment?.id);
        },
        onPending: async () => {
          setMessage("Pembayaran tertunda. Status akan diperbarui otomatis.");
          await onRefresh(data.payment?.id);
        },
        onError: () => {
          setError("Pembayaran gagal atau dibatalkan. Silakan coba lagi.");
        },
        onClose: () => {
          setLoading(false);
        },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-slate-900">Pembayaran instan via Midtrans</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-600">
              Kartu kredit/debit, transfer bank virtual account, QRIS, GoPay, ShopeePay, dan lainnya.
            </p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-lg font-bold text-primary">
            M
          </div>
        </div>
      </div>

      {payment?.status === "pending" && payment?.externalId ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Transaksi sebelumnya masih aktif. Anda dapat melanjutkan atau membuat pembayaran baru.
        </div>
      ) : null}

      {message ? (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div>
      ) : null}

      <button
        type="button"
        onClick={openSnap}
        disabled={disabled || loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
      >
        {loading ? "Membuka pembayaran..." : "Bayar sekarang"}
      </button>
    </div>
  );
}

function PaidSuccessCard({ payment }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center sm:p-8">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl text-white">
        ✓
      </div>
      <h2 className="mt-4 text-xl font-bold text-emerald-950">Pembayaran berhasil</h2>
      <p className="mt-2 text-sm leading-relaxed text-emerald-900/80">
        Biaya formulir sebesar {formatRupiah(payment?.amount)} telah dikonfirmasi.
        {payment?.paidAt ? ` Dibayar pada ${payment.paidAt}.` : ""}
      </p>
      <Link
        href="/spmb/formulir"
        className="mt-6 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
      >
        Lanjut ke formulir
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

function ReviewPendingCard({ payment, syncing }) {
  return (
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xl text-white">
          ⏳
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-bold text-blue-950">Bukti pembayaran diterima</h2>
            {syncing ? (
              <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-medium text-blue-800">
                Memeriksa status...
              </span>
            ) : null}
          </div>
          <p className="mt-2 text-sm leading-relaxed text-blue-900/80">
            Admin SPMB sedang memverifikasi bukti transfer Anda. Halaman ini diperbarui otomatis
            setelah admin mengubah status pembayaran.
          </p>
          {payment?.proofUrl && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(payment.proofUrl) ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={payment.proofUrl}
              alt="Bukti pembayaran yang dikirim"
              className="mt-4 max-h-40 rounded-lg border border-blue-200 object-contain"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function FailedPaymentCard({ onRetry }) {
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-rose-500 text-xl text-white">
          ✕
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-rose-950">Pembayaran ditolak atau gagal</h2>
          <p className="mt-2 text-sm leading-relaxed text-rose-900/80">
            Admin belum dapat memverifikasi pembayaran Anda, atau transaksi online tidak berhasil.
            Silakan lakukan pembayaran ulang atau hubungi admin SPMB jika Anda yakin sudah transfer.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700"
          >
            Coba bayar lagi
          </button>
        </div>
      </div>
    </div>
  );
}

export function PaymentPageView({ initialData }) {
  const [data, setData] = useState(initialData);
  const [selectedMethod, setSelectedMethod] = useState(initialData.methods[0]?.id ?? "manual");
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(!initialData);
  const [syncing, setSyncing] = useState(false);
  const prevPaidRef = useRef(initialData?.paymentState?.isPaid ?? false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/spmb/payment", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setData(json);
      if (json.methods?.length && !json.methods.find((m) => m.id === selectedMethod)) {
        setSelectedMethod(json.methods[0].id);
      }
    }
    return json;
  }, [selectedMethod]);

  useEffect(() => {
    if (!initialData) {
      refresh().finally(() => setLoading(false));
    }
  }, [initialData, refresh]);

  const payment = data?.payment;
  const paymentState = data?.paymentState ?? {
    isPaid: false,
    isReview: false,
    isFailed: false,
    canPay: true,
  };
  const settings = data?.settings;
  const methods = data?.methods ?? [];
  const amount = settings?.registrationFee ?? 0;

  const { isPaid, isReview, isFailed, canPay } = paymentState;

  const shouldPoll =
    payment?.status === "manual_review" ||
    (payment?.status === "pending" && payment?.method === "midtrans");

  useEffect(() => {
    if (isPaid && !prevPaidRef.current) {
      setNotice({ type: "success", text: "Pembayaran telah dikonfirmasi. Anda dapat melanjutkan." });
    }
    prevPaidRef.current = isPaid;
  }, [isPaid]);

  useEffect(() => {
    if (!shouldPoll) return undefined;

    const syncStatus = async () => {
      setSyncing(true);
      try {
        if (payment?.method === "midtrans" && payment?.id) {
          await fetch("/api/spmb/payment/midtrans", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ paymentId: payment.id }),
          });
        }
        await refresh();
      } finally {
        setSyncing(false);
      }
    };

    const interval = setInterval(syncStatus, 15000);

    const onVisible = () => {
      if (document.visibilityState === "visible") syncStatus();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [shouldPoll, payment?.id, payment?.method, refresh]);

  const activeMethod = useMemo(() => {
    if (methods.length === 1) return methods[0].id;
    return selectedMethod;
  }, [methods, selectedMethod]);

  const handleManualSuccess = async (_updatedPayment, msg) => {
    await refresh();
    setNotice({ type: "success", text: msg });
  };

  const handleMidtransRefresh = async (paymentId) => {
    if (!paymentId) {
      await refresh();
      return;
    }

    const res = await fetch("/api/spmb/payment/midtrans", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ paymentId }),
    });
    const json = await res.json();
    if (res.ok) {
      await refresh();
      if (json.payment?.status === "paid") {
        setNotice({ type: "success", text: "Pembayaran berhasil dikonfirmasi." });
      }
    } else {
      await refresh();
    }
  };

  const handleRetryAfterFailed = () => {
    setNotice(null);
    refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-slate-600">Memuat halaman pembayaran...</p>
        </div>
      </div>
    );
  }

  if (!data?.activePeriod) {
    return (
      <div className="space-y-6">
        <PageHeader amount={amount} period={null} />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-amber-950">Periode pendaftaran belum dibuka</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
            Saat ini tidak ada gelombang pendaftaran aktif. Silakan cek kembali nanti atau hubungi
            admin SPMB sekolah.
          </p>
          <Link
            href="/user"
            className="mt-5 inline-flex rounded-xl border border-amber-300 bg-white px-4 py-2.5 text-sm font-medium text-amber-900 transition hover:bg-amber-100"
          >
            Kembali ke dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (methods.length === 0) {
    return (
      <div className="space-y-6">
        <PageHeader amount={amount} period={data.activePeriod} />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Metode pembayaran belum tersedia</h2>
          <p className="mt-2 text-sm text-slate-600">
            Admin belum mengaktifkan metode pembayaran. Hubungi sekolah untuk informasi lebih lanjut.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <PageHeader amount={amount} period={data.activePeriod} payment={payment} />

      {notice ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            notice.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-rose-50 text-rose-800"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {isPaid ? (
        <PaidSuccessCard payment={payment} />
      ) : isReview ? (
        <ReviewPendingCard payment={payment} syncing={syncing} />
      ) : isFailed ? (
        <div className="space-y-6">
          <FailedPaymentCard onRetry={handleRetryAfterFailed} />
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <h2 className="text-lg font-semibold text-slate-900">Pembayaran ulang</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Pilih metode pembayaran untuk mencoba kembali.
                </p>
              </div>
              <MethodTabs methods={methods} selected={activeMethod} onSelect={setSelectedMethod} />
              <div className={methods.length > 1 ? "mt-6" : ""}>
                {activeMethod === "manual" ? (
                  <ManualPaymentForm
                    settings={settings}
                    amount={amount}
                    onSuccess={handleManualSuccess}
                    disabled={!canPay}
                  />
                ) : null}
                {activeMethod === "midtrans" ? (
                  <MidtransPaymentPanel
                    scriptUrl={data.midtransScriptUrl}
                    clientKey={settings?.midtransClientKey}
                    payment={payment}
                    onRefresh={handleMidtransRefresh}
                    disabled={!canPay}
                  />
                ) : null}
              </div>
            </section>
            <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Status terakhir</h3>
              <div className="mt-3">
                <StatusBadge status={payment?.status ?? "failed"} />
              </div>
            </aside>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Pilih metode pembayaran</h2>
                <p className="mt-1 text-sm text-slate-600">
                  Sesuai pengaturan admin sekolah
                </p>
              </div>
              {payment ? <StatusBadge status={payment.status} /> : null}
            </div>

            <MethodTabs methods={methods} selected={activeMethod} onSelect={setSelectedMethod} />

            <div className={methods.length > 1 ? "mt-6" : ""}>
              {activeMethod === "manual" ? (
                <ManualPaymentForm
                  settings={settings}
                  amount={amount}
                  onSuccess={handleManualSuccess}
                  disabled={!canPay}
                />
              ) : null}

              {activeMethod === "midtrans" ? (
                <MidtransPaymentPanel
                  scriptUrl={data.midtransScriptUrl}
                  clientKey={settings?.midtransClientKey}
                  payment={payment}
                  onRefresh={handleMidtransRefresh}
                  disabled={!canPay}
                />
              ) : null}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900">Ringkasan</h3>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Biaya formulir</dt>
                  <dd className="font-semibold text-slate-900">{formatRupiah(amount)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Gelombang</dt>
                  <dd className="text-right font-medium text-slate-900">{data.activePeriod.name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-slate-500">Tahun ajaran</dt>
                  <dd className="font-medium text-slate-900">{data.activePeriod.academicYear}</dd>
                </div>
              </dl>
              <div className="mt-4 border-t border-slate-100 pt-4">
                <div className="flex justify-between gap-3 text-sm">
                  <span className="font-medium text-slate-700">Total</span>
                  <span className="text-lg font-bold text-primary">{formatRupiah(amount)}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Tips</h3>
              <ul className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
                <li>• Pastikan nominal transfer sesuai tanpa pembulatan.</li>
                <li>• Simpan bukti pembayaran hingga pendaftaran selesai.</li>
                <li>• Pembayaran online diproses otomatis setelah berhasil.</li>
              </ul>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function PageHeader({ amount, period, payment }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-primary via-secondary to-accent p-6 text-primary-foreground shadow-sm md:p-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">Pembayaran SPMB</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            Biaya Formulir Pendaftaran
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/85">
            {period
              ? `Gelombang ${period.name} · ${period.academicYear}`
              : "Lakukan pembayaran untuk melanjutkan proses pendaftaran."}
          </p>
        </div>
        <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-white/70">Total bayar</p>
          <p className="mt-1 text-2xl font-bold">{formatRupiah(amount)}</p>
          {payment ? (
            <div className="mt-2">
              <StatusBadge status={payment.status} />
            </div>
          ) : null}
        </div>
      </div>
      {period?.closesAt ? (
        <p className="mt-5 text-sm text-white/80">Batas pendaftaran: {period.closesAt}</p>
      ) : null}
    </section>
  );
}
