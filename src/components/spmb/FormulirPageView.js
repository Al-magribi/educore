"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DynamicFormRenderer } from "./DynamicFormRenderer.js";

function isEmptyValue(value) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return Number.isNaN(value);
  return false;
}

function computeProgress(groups, values) {
  const fields = (groups ?? []).flatMap((g) => g.fields ?? []).filter((f) => f.type !== "file");
  const required = fields.filter((f) => f.required);
  const filled = fields.filter((f) => !isEmptyValue(values?.[f.id]));
  const filledRequired = required.filter((f) => !isEmptyValue(values?.[f.id]));
  return {
    totalFields: fields.length,
    filledFields: filled.length,
    requiredCount: required.length,
    filledRequired: filledRequired.length,
    percent: fields.length > 0 ? Math.round((filled.length / fields.length) * 100) : 0,
  };
}

function LockedPaymentCard({ paymentState, payment }) {
  if (paymentState.isReview) {
    return (
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xl text-white">
            ⏳
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-blue-950">Menunggu verifikasi pembayaran</h2>
            <p className="mt-2 text-sm leading-relaxed text-blue-900/80">
              Bukti pembayaran Anda sedang diverifikasi oleh admin SPMB. Formulir pendaftaran akan
              terbuka setelah pembayaran dikonfirmasi.
            </p>
            {payment?.createdAt ? (
              <p className="mt-3 text-xs text-blue-800/70">Dikirim: {payment.createdAt}</p>
            ) : null}
            <Link
              href="/spmb/pembayaran"
              className="mt-5 inline-flex items-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-medium text-blue-900 transition hover:bg-blue-100"
            >
              Lihat status pembayaran
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 sm:p-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xl text-white">
          🔒
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-bold text-amber-950">Formulir terkunci</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
            Selesaikan dan verifikasi pembayaran biaya formulir terlebih dahulu sebelum mengisi
            data pendaftaran.
          </p>
          <Link
            href="/spmb/pembayaran"
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Ke halaman pembayaran
            <span aria-hidden>→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function SubmittedBanner({ application }) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold text-emerald-950">Formulir telah diajukan</h2>
          <p className="mt-1 text-sm text-emerald-900/80">
            Data pendaftaran Anda sudah terkirim
            {application?.submittedAt ? ` pada ${application.submittedAt}` : ""}. Lanjutkan ke
            unggah berkas jika diperlukan.
          </p>
        </div>
        <Link
          href="/spmb/upload"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700"
        >
          Upload berkas
        </Link>
      </div>
    </div>
  );
}

function PageHeader({ period, formDefinition, progress, access }) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-gradient-to-br from-primary via-secondary to-accent p-6 text-primary-foreground shadow-sm md:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-medium text-white/80">Formulir Pendaftaran</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight md:text-3xl">
            {formDefinition?.name ?? "Formulir SPMB"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/85">
            {period
              ? `Gelombang ${period.name} · ${period.academicYear}`
              : "Lengkapi data calon siswa sesuai ketentuan sekolah."}
          </p>
          {formDefinition?.schema?.meta?.description ? (
            <p className="mt-2 max-w-2xl text-sm text-white/75">
              {formDefinition.schema.meta.description}
            </p>
          ) : null}
        </div>
        {access.canFill ? (
          <div className="shrink-0 rounded-2xl border border-white/20 bg-white/10 px-5 py-4 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-wide text-white/70">Kelengkapan</p>
            <p className="mt-1 text-2xl font-bold">{progress?.percent ?? 0}%</p>
            <div className="mt-2 h-1.5 w-full min-w-[140px] overflow-hidden rounded-full bg-white/20">
              <div
                className="h-full rounded-full bg-white transition-all duration-300"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-white/75">
              {progress?.filledFields ?? 0} dari {progress?.totalFields ?? 0} field terisi
            </p>
          </div>
        ) : null}
      </div>
      {period?.closesAt ? (
        <p className="mt-5 text-sm text-white/80">Batas pendaftaran: {period.closesAt}</p>
      ) : null}
    </section>
  );
}

export function FormulirPageView({ initialData }) {
  const [data, setData] = useState(initialData);
  const [values, setValues] = useState(initialData?.answers ?? {});
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/spmb/formulir", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setData(json);
      setValues(json.answers ?? {});
    }
    return json;
  }, []);

  useEffect(() => {
    if (!initialData) {
      refresh().finally(() => setLoading(false));
    }
  }, [initialData, refresh]);

  useEffect(() => {
    setValues(data?.answers ?? {});
  }, [data?.answers]);

  const groups = data?.formDefinition?.schema?.groups ?? [];
  const access = data?.access ?? { canFill: false, isEditable: false, isSubmitted: false };
  const isReadOnly = !access.isEditable;
  const progress = useMemo(
    () => (access.isEditable ? computeProgress(groups, values) : data?.progress),
    [access.isEditable, groups, values, data?.progress]
  );

  const handleChange = useCallback((fieldId, value) => {
    setValues((prev) => ({ ...prev, [fieldId]: value }));
    setError(null);
  }, []);

  const persist = async (submit) => {
    setNotice(null);
    setError(null);
    if (submit) setSubmitting(true);
    else setSaving(true);

    try {
      const res = await fetch("/api/spmb/formulir", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: values, submit }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error || "Gagal menyimpan formulir");
        return;
      }

      setData(json);
      setValues(json.answers ?? {});
      setNotice({
        type: "success",
        text: submit
          ? "Formulir berhasil diajukan. Silakan lanjut ke upload berkas."
          : "Perubahan berhasil disimpan.",
      });
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const handleSaveDraft = (e) => {
    e.preventDefault();
    persist(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    persist(true);
  };

  const canSubmit = useMemo(() => {
    if (!access.isEditable) return false;
    const required = progress?.requiredCount ?? 0;
    const filled = progress?.filledRequired ?? 0;
    return required === 0 || filled >= required;
  }, [access.isEditable, progress]);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-sm text-slate-600">Memuat formulir pendaftaran...</p>
        </div>
      </div>
    );
  }

  if (!data?.activePeriod) {
    return (
      <div className="space-y-6">
        <PageHeader period={null} formDefinition={null} progress={null} access={access} />
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
          <h2 className="text-lg font-semibold text-amber-950">Periode pendaftaran belum dibuka</h2>
          <p className="mt-2 text-sm leading-relaxed text-amber-900/80">
            Saat ini tidak ada gelombang pendaftaran aktif. Silakan cek kembali nanti.
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

  if (!data.formDefinition) {
    return (
      <div className="space-y-6">
        <PageHeader period={data.activePeriod} formDefinition={null} progress={null} access={access} />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Formulir belum tersedia</h2>
          <p className="mt-2 text-sm text-slate-600">
            Admin belum mempublikasikan formulir pendaftaran untuk periode ini.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        period={data.activePeriod}
        formDefinition={data.formDefinition}
        progress={progress}
        access={access}
      />

      {!access.canFill ? (
        <LockedPaymentCard paymentState={data.paymentState} payment={data.payment} />
      ) : access.isSubmitted ? (
        <SubmittedBanner application={data.application} />
      ) : null}

      {notice ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            notice.type === "success"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          }`}
        >
          {notice.text}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200">
          {error}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-6">
        <section
          className={`rounded-2xl border bg-white p-5 shadow-sm sm:p-6 lg:p-8 ${
            !access.canFill ? "border-slate-200 opacity-75" : "border-slate-200"
          }`}
          aria-disabled={!access.canFill}
        >
          <DynamicFormRenderer
            groups={groups}
            values={values}
            onChange={handleChange}
            disabled={isReadOnly || !access.canFill}
          />
        </section>

        {access.canFill && access.isEditable ? (
          <div className="sticky bottom-0 z-10 -mx-1 border-t border-slate-200/80 bg-white/95 px-1 py-4 backdrop-blur-sm sm:static sm:border-0 sm:bg-transparent sm:p-0 sm:backdrop-blur-none">
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-center text-xs text-slate-500 sm:text-left">
                Field bertanda <span className="text-rose-500">*</span> wajib diisi sebelum mengajukan.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={saving || submitting}
                  className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Menyimpan..." : "Simpan draf"}
                </button>
                <button
                  type="submit"
                  disabled={saving || submitting || !canSubmit}
                  className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Mengajukan..." : "Ajukan formulir"}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {access.canFill && isReadOnly && !access.isSubmitted ? (
          <p className="text-center text-sm text-slate-500">
            Formulir dalam mode baca saja.
          </p>
        ) : null}
      </form>
    </div>
  );
}
