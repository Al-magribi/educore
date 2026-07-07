"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STATUS_CONFIG = {
  pending: { label: "Menunggu pembayaran", tone: "amber" },
  paid: { label: "Lunas", tone: "emerald" },
  failed: { label: "Gagal", tone: "rose" },
  manual_review: { label: "Menunggu verifikasi", tone: "blue" },
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
  const config = STATUS_CONFIG[status] ?? { label: status, tone: "slate" };
  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ${TONE_CLASSES[config.tone] ?? TONE_CLASSES.slate}`}>
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
    } catch { /* ignore */ }
  };
  return (
    <button type="button" onClick={handleCopy} className="shrink-0 rounded-lg border bg-white px-3 py-1.5 text-xs font-medium">
      {copied ? "Tersalin" : "Salin"}
    </button>
  );
}

function BankDetailRow({ label, value, copyable = false }) {
  return (
    <div className="flex flex-col gap-2 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="mt-1 break-all text-sm font-semibold">{value || "—"}</p>
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
          <button key={method.id} type="button" onClick={() => onSelect(method.id)} className={`flex-1 rounded-xl border px-4 py-3 text-left ${active ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-slate-200 bg-white"}`}>
            <p className={`text-sm font-semibold ${active ? "text-primary" : "text-slate-900"}`}>{method.label}</p>
            <p className="mt-1 text-xs text-slate-600">{method.description}</p>
          </button>
        );
      })}
    </div>
  );
}

function ManualPaymentForm({ settings, amount, category, feeItemIds, onSuccess, disabled }) {
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
        body: JSON.stringify({ proofUrl, category, feeItemIds }),
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

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {(settings.bankName || settings.bankAccountNumber) && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Rekening tujuan transfer</h3>
          <BankDetailRow label="Bank" value={settings.bankName} />
          <BankDetailRow label="Nomor rekening" value={settings.bankAccountNumber} copyable />
          <BankDetailRow label="Atas nama" value={settings.bankAccountName} copyable />
        </div>
      )}
      <div className="rounded-xl border bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Nominal transfer</p>
        <p className="mt-1 text-2xl font-bold">{formatRupiah(amount)}</p>
      </div>
      {settings.manualInstructions ? (
        <div className="rounded-xl border bg-slate-50 p-4">
          <p className="text-sm font-semibold">Petunjuk pembayaran</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{settings.manualInstructions}</p>
        </div>
      ) : null}
      <div className="rounded-xl border border-dashed p-5 text-center">
        {proofUrl ? (
          <div className="space-y-3">
            {/\.(jpe?g|png|gif|webp)(\?|$)/i.test(proofUrl) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={proofUrl} alt="Bukti" className="mx-auto max-h-48 rounded-lg border object-contain" />
            ) : (
              <p className="text-sm">{previewName || "Bukti terunggah"}</p>
            )}
            <button type="button" onClick={() => { setProofUrl(""); setPreviewName(""); }} className="text-sm underline">
              Ganti file
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-slate-600">Unggah bukti transfer (JPG, PNG, WebP)</p>
            <label className="mt-4 inline-flex cursor-pointer rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white">
              {uploading ? "Mengunggah..." : "Pilih file"}
              <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" disabled={uploading || disabled} onChange={(e) => handleUpload(e.target.files?.[0])} />
            </label>
          </>
        )}
      </div>
      {error ? <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
      <button type="submit" disabled={disabled || submitting || uploading || !proofUrl} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {submitting ? "Mengirim..." : "Kirim bukti pembayaran"}
      </button>
    </form>
  );
}

function MidtransPaymentPanel({ scriptUrl, clientKey, category, feeItemIds, payment, onRefresh, disabled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const openSnap = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/spmb/payment/midtrans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, feeItemIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memulai pembayaran");
      const snap = await loadMidtransSnap(scriptUrl, clientKey || data.clientKey);
      snap.pay(data.snapToken, {
        onSuccess: async () => { setMessage("Pembayaran berhasil."); await onRefresh(data.payment?.id); },
        onPending: async () => { setMessage("Pembayaran tertunda."); await onRefresh(data.payment?.id); },
        onError: () => setError("Pembayaran gagal atau dibatalkan."),
        onClose: () => setLoading(false),
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {message ? <div className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}
      {error ? <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</div> : null}
      {payment?.status === "pending" && payment?.externalId ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Transaksi sebelumnya masih aktif untuk kategori ini.
        </div>
      ) : null}
      <button type="button" onClick={openSnap} disabled={disabled || loading} className="rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-50">
        {loading ? "Membuka pembayaran..." : "Bayar sekarang"}
      </button>
    </div>
  );
}

function WaveFeeSelector({ waveFee, selectedIds, onChange }) {
  const remaining = waveFee.remainingItems ?? [];

  const toggleItem = (id) => {
    onChange(selectedIds.includes(id) ? selectedIds.filter((item) => item !== id) : [...selectedIds, id]);
  };

  const selectAll = () => onChange(remaining.map((item) => item.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-slate-900">Pilih item biaya</h3>
        <button type="button" onClick={selectAll} className="text-sm font-medium text-primary hover:underline">
          Pilih semua (bayar lunas)
        </button>
      </div>
      <div className="space-y-2">
        {remaining.map((item) => (
          <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-white p-4 hover:border-primary/30">
            <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleItem(item.id)} className="mt-1" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <p className="mt-1 text-sm font-semibold text-primary">{formatRupiah(item.amount)}</p>
            </div>
          </label>
        ))}
      </div>
      {waveFee.items?.some((item) => item.isPaid) ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-semibold text-emerald-900">Sudah dibayar</p>
          <ul className="mt-2 space-y-1 text-sm text-emerald-800">
            {waveFee.items.filter((item) => item.isPaid).map((item) => (
              <li key={item.id}>✓ {item.label} — {formatRupiah(item.amount)}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function PaymentSection({
  title,
  description,
  amount,
  payment,
  paymentState,
  settings,
  methods,
  midtransScriptUrl,
  category,
  feeItemIds,
  onRefresh,
  onSuccess,
  extraContent,
}) {
  const [selectedMethod, setSelectedMethod] = useState(methods[0]?.id ?? "manual");
  const { isPaid, isReview, isFailed, canPay } = paymentState;
  const activeMethod = methods.length === 1 ? methods[0].id : selectedMethod;

  if (isPaid) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h2 className="text-lg font-bold text-emerald-950">{title} — Lunas</h2>
        <p className="mt-2 text-sm text-emerald-900/80">
          {formatRupiah(payment?.amount ?? amount)} telah dikonfirmasi.
          {payment?.paidAt ? ` Dibayar pada ${payment.paidAt}.` : ""}
        </p>
        {category === "registration" ? (
          <Link href="/spmb/formulir" className="mt-4 inline-flex rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">
            Lanjut ke formulir →
          </Link>
        ) : null}
      </div>
    );
  }

  if (isReview) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700" aria-hidden>
            ⏳
          </span>
          <div>
            <h2 className="text-lg font-bold text-amber-950">{title} — Menunggu verifikasi admin</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
              Bukti pembayaran Anda sudah kami terima. Admin sedang memverifikasi transfer Anda.
              Anda tidak perlu mengirim ulang bukti pembayaran.
            </p>
            {payment?.createdAt ? (
              <p className="mt-2 text-xs text-amber-800/80">Dikirim pada {payment.createdAt}</p>
            ) : null}
          </div>
        </div>
        {payment?.proofUrl && /\.(jpe?g|png|gif|webp)(\?|$)/i.test(payment.proofUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={payment.proofUrl} alt="Bukti transfer" className="mt-4 max-h-40 rounded-lg border border-amber-200 object-contain" />
        ) : null}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
        <p className="mt-3 text-2xl font-bold text-primary">{formatRupiah(amount)}</p>
      </div>

      {extraContent}

      {isFailed ? (
        <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          Pembayaran sebelumnya gagal. Silakan coba lagi.
        </div>
      ) : null}

      {!canPay ? (
        <p className="text-sm text-slate-600">Pembayaran belum tersedia untuk tahap ini.</p>
      ) : methods.length === 0 ? (
        <p className="text-sm text-slate-600">Metode pembayaran belum diaktifkan admin.</p>
      ) : (
        <>
          <MethodTabs methods={methods} selected={activeMethod} onSelect={setSelectedMethod} />
          <div className={methods.length > 1 ? "mt-6" : "mt-2"}>
            {activeMethod === "manual" ? (
              <ManualPaymentForm settings={settings} amount={amount} category={category} feeItemIds={feeItemIds} onSuccess={onSuccess} disabled={!canPay} />
            ) : null}
            {activeMethod === "midtrans" ? (
              <MidtransPaymentPanel scriptUrl={midtransScriptUrl} clientKey={settings?.midtransClientKey} category={category} feeItemIds={feeItemIds} payment={payment} onRefresh={onRefresh} disabled={!canPay} />
            ) : null}
          </div>
        </>
      )}
    </section>
  );
}

export function PaymentPageView({ initialData }) {
  const [data, setData] = useState(initialData);
  const [activeSection, setActiveSection] = useState("registration");
  const [selectedFeeItemIds, setSelectedFeeItemIds] = useState([]);
  const [notice, setNotice] = useState(null);
  const [loading, setLoading] = useState(!initialData);
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/spmb/payment", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setData(json);
    return json;
  }, []);

  useEffect(() => {
    if (!initialData) refresh().finally(() => setLoading(false));
  }, [initialData, refresh]);

  useEffect(() => {
    const remaining = data?.waveFee?.remainingItems ?? [];
    if (remaining.length > 0 && selectedFeeItemIds.length === 0) {
      setSelectedFeeItemIds([remaining[0].id]);
    }
  }, [data?.waveFee?.remainingItems, selectedFeeItemIds.length]);

  const registrationPayment = data?.registrationPayment;
  const registrationState = data?.registrationPaymentState ?? { isPaid: false, isReview: false, isFailed: false, canPay: true };
  const waveFee = data?.waveFee;
  const wavePayments = data?.wavePayments ?? [];
  const latestWavePayment = wavePayments[0] ?? null;
  const wavePaymentState = (() => {
    if (waveFee?.isFullyPaid) {
      return { isPaid: true, isReview: false, isFailed: false, canPay: false };
    }
    if (latestWavePayment) {
      return {
        isPaid: false,
        isReview: latestWavePayment.status === "manual_review",
        isFailed: latestWavePayment.status === "failed",
        canPay: waveFee?.canPay && !waveFee?.hasPendingPayment,
      };
    }
    return {
      isPaid: false,
      isReview: false,
      isFailed: false,
      canPay: waveFee?.canPay ?? false,
    };
  })();

  const selectedWaveAmount = useMemo(() => {
    const remaining = waveFee?.remainingItems ?? [];
    return remaining.filter((item) => selectedFeeItemIds.includes(item.id)).reduce((sum, item) => sum + item.amount, 0);
  }, [waveFee?.remainingItems, selectedFeeItemIds]);

  const shouldPoll =
    registrationPayment?.status === "manual_review" ||
    (registrationPayment?.status === "pending" && registrationPayment?.method === "midtrans") ||
    latestWavePayment?.status === "manual_review" ||
    (latestWavePayment?.status === "pending" && latestWavePayment?.method === "midtrans");

  useEffect(() => {
    if (!shouldPoll) return undefined;
    const syncStatus = async () => {
      setSyncing(true);
      try {
        const pending = [registrationPayment, latestWavePayment].filter(
          (payment) => payment?.method === "midtrans" && payment?.status === "pending"
        );
        for (const payment of pending) {
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
    return () => clearInterval(interval);
  }, [shouldPoll, registrationPayment, latestWavePayment, refresh]);

  const handleSuccess = async (_payment, msg) => {
    await refresh();
    setNotice({ type: "success", text: msg });
  };

  const handleMidtransRefresh = async (paymentId) => {
    if (paymentId) {
      await fetch("/api/spmb/payment/midtrans", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
    }
    await refresh();
  };

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!data?.activePeriod) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <h2 className="text-lg font-semibold text-amber-950">Periode pendaftaran belum dibuka</h2>
        <p className="mt-2 text-sm text-amber-900/80">Saat ini tidak ada gelombang pendaftaran aktif.</p>
      </div>
    );
  }

  const settings = data.settings;
  const methods = data.methods ?? [];
  const registrationAmount = settings?.registrationFee ?? 0;

  return (
    <div className="space-y-6 pb-4">
      <section className="overflow-hidden rounded-[28px] border bg-gradient-to-br from-primary via-secondary to-accent p-6 text-primary-foreground shadow-sm md:p-8">
        <p className="text-sm font-medium text-white/80">Pembayaran SPMB</p>
        <h1 className="mt-2 text-2xl font-bold md:text-3xl">Pembayaran Gelombang {data.activePeriod.name}</h1>
        <p className="mt-2 text-sm text-white/85">
          {data.activePeriod.academicYear} · Batas pendaftaran: {data.activePeriod.closesAt}
        </p>
        {syncing ? <p className="mt-3 text-xs text-white/70">Memeriksa status pembayaran...</p> : null}
      </section>

      {notice ? (
        <div className={`rounded-xl px-4 py-3 text-sm ${notice.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-rose-800"}`}>
          {notice.text}
        </div>
      ) : null}

      {data.migratedFrom ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Batas pembayaran <strong>{data.migratedFrom.periodName}</strong> telah berakhir. Anda
          otomatis dipindahkan ke <strong>{data.activePeriod.name}</strong> untuk melanjutkan
          pembayaran gelombang.
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => setActiveSection("registration")} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${activeSection === "registration" ? "bg-primary text-primary-foreground" : "border border-slate-200 bg-white text-slate-700"}`}>
          1. Pendaftaran Formulir
        </button>
        <button type="button" onClick={() => setActiveSection("wave_fee")} disabled={!registrationState.isPaid} className={`rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50 ${activeSection === "wave_fee" ? "bg-primary text-primary-foreground" : "border border-slate-200 bg-white text-slate-700"}`}>
          2. Pembayaran Gelombang Aktif
        </button>
      </div>

      {activeSection === "registration" ? (
        <PaymentSection
          title="Biaya Formulir Pendaftaran"
          description="Bayar biaya pendaftaran untuk mengisi formulir SPMB."
          amount={registrationAmount}
          payment={registrationPayment}
          paymentState={registrationState}
          settings={settings}
          methods={methods}
          midtransScriptUrl={data.midtransScriptUrl}
          category="registration"
          feeItemIds={[]}
          onRefresh={handleMidtransRefresh}
          onSuccess={handleSuccess}
        />
      ) : (
        <>
          {!registrationState.isPaid ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
              Selesaikan pembayaran pendaftaran formulir terlebih dahulu.
            </div>
          ) : waveFee?.totalCount === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              Admin belum mengatur item biaya untuk gelombang aktif ini.
            </div>
          ) : waveFee?.isEnrolled ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 sm:p-8">
              <h2 className="text-lg font-bold text-emerald-950">Anda resmi masuk {data.activePeriod.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-emerald-900/80">
                Pembayaran gelombang aktif telah lunas sebelum batas akhir pendaftaran (
                {data.activePeriod.closesAt}).
              </p>
            </div>
          ) : waveFee?.isFullyPaid && waveFee?.enrollmentStatus === "late" ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              Biaya gelombang sudah lunas, tetapi pembayaran melewati batas akhir gelombang sehingga
              status masuk gelombang tidak berlaku.
            </div>
          ) : data.activePeriod?.isOpen === false && !waveFee?.isFullyPaid ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              Batas pembayaran gelombang {data.activePeriod.name} telah berakhir pada{" "}
              {data.activePeriod.closesAt}.
            </div>
          ) : (
            <PaymentSection
              title={waveFee.title}
              description="Bayar biaya gelombang aktif sekaligus atau per cicilan (pilih item biaya)."
              amount={selectedWaveAmount}
              payment={latestWavePayment}
              paymentState={wavePaymentState}
              settings={settings}
              methods={methods}
              midtransScriptUrl={data.midtransScriptUrl}
              category="wave_fee"
              feeItemIds={selectedFeeItemIds}
              onRefresh={handleMidtransRefresh}
              onSuccess={handleSuccess}
              extraContent={
                !waveFee.isFullyPaid ? (
                  <div className="mb-6">
                    <WaveFeeSelector waveFee={waveFee} selectedIds={selectedFeeItemIds} onChange={setSelectedFeeItemIds} />
                    <p className="mt-4 text-sm text-slate-600">
                      Progress: {formatRupiah(waveFee.paidAmount)} dari {formatRupiah(waveFee.totalAmount)}
                      {waveFee.enrollmentStatusLabel ? ` · ${waveFee.enrollmentStatusLabel}` : ""}
                    </p>
                  </div>
                ) : null
              }
            />
          )}
        </>
      )}
    </div>
  );
}
