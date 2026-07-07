"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, FormMessage, TextInput } from "@/components/admin/home/AdminFormFields.js";
import { formatRupiah, generatePassword } from "./constants.js";

const STEPS = [
  { id: 1, label: "Data pendaftar" },
  { id: 2, label: "Pembayaran" },
];

function StepIndicator({ currentStep }) {
  return (
    <ol className="flex items-center gap-2">
      {STEPS.map((step) => {
        const isActive = step.id === currentStep;
        const isDone = step.id < currentStep;
        return (
          <li key={step.id} className="flex items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                isActive
                  ? "bg-[var(--admin-primary)] text-white"
                  : isDone
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
              }`}
            >
              {isDone ? "✓" : step.id}
            </span>
            <span
              className={`hidden text-sm sm:inline ${
                isActive ? "font-medium text-slate-900" : "text-slate-500"
              }`}
            >
              {step.label}
            </span>
            {step.id < STEPS.length ? (
              <span className="mx-1 hidden h-px w-6 bg-slate-200 sm:block" aria-hidden />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function CredentialsBanner({ credentials, onClose }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = `Email: ${credentials.email}\nPassword: ${credentials.password}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
      <p className="text-sm font-semibold text-emerald-900">Akun SPMB berhasil dibuat</p>
      <p className="mt-1 text-xs text-emerald-800/80">
        Simpan kredensial ini untuk diberikan kepada orang tua / calon siswa.
      </p>
      <dl className="mt-3 space-y-1 text-sm text-emerald-950">
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-emerald-700">Email</dt>
          <dd className="font-medium">{credentials.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 shrink-0 text-emerald-700">Password</dt>
          <dd className="font-mono font-medium">{credentials.password}</dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className="rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-sm font-medium text-emerald-800 hover:bg-emerald-100"
        >
          {copied ? "Tersalin!" : "Salin kredensial"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-700"
        >
          Lanjut isi formulir
        </button>
      </div>
    </div>
  );
}

export function ManualRegistrationWizard({ open, onClose, onCreated }) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [setup, setSetup] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [setupError, setSetupError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState(null);
  const [credentials, setCredentials] = useState(null);
  const [createdApplicationId, setCreatedApplicationId] = useState(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    useGeneratedPassword: true,
    note: "",
    receiptNo: "",
  });

  useEffect(() => {
    if (!open) return;

    setStep(1);
    setMessage(null);
    setCredentials(null);
    setCreatedApplicationId(null);
    setForm({
      name: "",
      email: "",
      phone: "",
      password: generatePassword(),
      useGeneratedPassword: true,
      note: "",
      receiptNo: "",
    });

    let cancelled = false;
    setSetupLoading(true);
    setSetupError(null);

    fetch("/api/spmb-admin/applications")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat data");
        if (!cancelled) setSetup(data);
      })
      .catch((err) => {
        if (!cancelled) setSetupError(err.message);
      })
      .finally(() => {
        if (!cancelled) setSetupLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;

  const handleRegeneratePassword = () => {
    setForm((prev) => ({ ...prev, password: generatePassword(), useGeneratedPassword: true }));
  };

  const validateStep1 = () => {
    if (!form.name.trim()) return "Nama wajib diisi";
    if (!form.email.trim()) return "Email wajib diisi";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      return "Format email tidak valid";
    }
    const password = form.useGeneratedPassword ? form.password : form.password.trim();
    if (!password || password.length < 8) return "Password minimal 8 karakter";
    return null;
  };

  const handleNext = () => {
    const error = validateStep1();
    if (error) {
      setMessage({ type: "error", text: error });
      return;
    }
    setMessage(null);
    setStep(2);
  };

  const handleSubmit = async () => {
    const error = validateStep1();
    if (error) {
      setMessage({ type: "error", text: error });
      setStep(1);
      return;
    }

    setSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/spmb-admin/applications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant: {
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim() || null,
            password: form.useGeneratedPassword ? form.password : form.password.trim(),
          },
          payment: {
            note: form.note.trim() || null,
            receiptNo: form.receiptNo.trim() || null,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal membuat pendaftaran");

      setCredentials(data.credentials);
      setCreatedApplicationId(data.application.id);
      onCreated?.(data.application);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinueToForm = () => {
    onClose();
    if (createdApplicationId) {
      router.push(`/spmb-admin/pendaftaran/${createdApplicationId}/formulir`);
    }
  };

  const registrationFee = setup?.registrationFee ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Tutup"
      />
      <div className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Buat pendaftaran manual</h2>
              <p className="mt-0.5 text-sm text-slate-500">
                Untuk calon siswa yang mendaftar langsung di sekolah.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Tutup"
            >
              ✕
            </button>
          </div>
          {!credentials ? (
            <div className="mt-4">
              <StepIndicator currentStep={step} />
            </div>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {setupLoading ? (
            <p className="text-center text-sm text-slate-500">Memuat data...</p>
          ) : setupError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              {setupError}
            </div>
          ) : !setup?.activePeriod ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Tidak ada periode pendaftaran aktif. Aktifkan periode terlebih dahulu sebelum membuat
              pendaftaran manual.
            </div>
          ) : credentials ? (
            <CredentialsBanner credentials={credentials} onClose={handleContinueToForm} />
          ) : step === 1 ? (
            <div className="space-y-4">
              <Field label="Nama calon siswa / wali" hint="Nama yang akan tampil di daftar pendaftar">
                <TextInput
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Contoh: Ahmad Fadillah"
                  autoFocus
                />
              </Field>
              <Field label="Email" hint="Digunakan untuk login portal SPMB">
                <TextInput
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  placeholder="email@contoh.com"
                />
              </Field>
              <Field label="Telepon" hint="Opsional">
                <TextInput
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="08xxxxxxxxxx"
                />
              </Field>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Password akun</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Berikan kepada orang tua untuk login mandiri nanti.
                    </p>
                  </div>
                  <label className="flex shrink-0 items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.useGeneratedPassword}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          useGeneratedPassword: e.target.checked,
                          password: e.target.checked ? generatePassword() : f.password,
                        }))
                      }
                      className="rounded border-slate-300"
                    />
                    Auto
                  </label>
                </div>
                {form.useGeneratedPassword ? (
                  <div className="mt-3 flex items-center gap-2">
                    <code className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm">
                      {form.password}
                    </code>
                    <button
                      type="button"
                      onClick={handleRegeneratePassword}
                      className="shrink-0 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                    >
                      Acak ulang
                    </button>
                  </div>
                ) : (
                  <TextInput
                    className="mt-3"
                    type="text"
                    value={form.password}
                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                    placeholder="Minimal 8 karakter"
                  />
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Periode</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {setup.activePeriod.name} · {setup.activePeriod.academicYear}
                </p>
              </div>

              <div className="rounded-xl border border-[var(--admin-primary)]/20 bg-[var(--admin-primary)]/5 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Biaya pendaftaran
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {formatRupiah(registrationFee)}
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Konfirmasi bahwa pembayaran tunai telah diterima di loket sekolah.
                </p>
              </div>

              <Field label="No. kwitansi" hint="Opsional">
                <TextInput
                  value={form.receiptNo}
                  onChange={(e) => setForm((f) => ({ ...f, receiptNo: e.target.value }))}
                  placeholder="Contoh: KWT-2026-001"
                />
              </Field>
              <Field label="Catatan" hint="Opsional — nama kasir, keterangan lain">
                <TextInput
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Contoh: Diterima kasir Bu Siti"
                />
              </Field>

              <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                Pembayaran akan langsung tercatat sebagai <strong>lunas</strong>. Setelah ini Anda
                dapat mengisi formulir pendaftaran untuk calon siswa ini.
              </div>
            </div>
          )}

          {message ? (
            <div className="mt-4">
              <FormMessage message={message} />
            </div>
          ) : null}
        </div>

        {!credentials && setup?.activePeriod && !setupLoading ? (
          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 p-5 sm:flex-row sm:justify-between">
            {step === 2 ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                disabled={submitting}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Kembali
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
            )}
            {step === 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="rounded-xl bg-[var(--admin-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                Lanjut ke pembayaran
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-xl bg-[var(--admin-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Memproses..." : "Konfirmasi & buat pendaftaran"}
              </button>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
