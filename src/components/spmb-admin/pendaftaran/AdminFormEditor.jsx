"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DynamicFormRenderer } from "@/components/spmb/DynamicFormRenderer.js";
import { StatusBadge } from "./StatusBadge.jsx";

function isEmptyValue(value) {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (typeof value === "boolean") return false;
  if (typeof value === "number") return Number.isNaN(value);
  return false;
}

function isAdminRequiredField(field) {
  if (!field.required) return false;
  if (field.type === "file") return false;
  return true;
}

function computeProgress(groups, values) {
  const fields = (groups ?? []).flatMap((g) => g.fields ?? []);
  const required = fields.filter(isAdminRequiredField);
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

export function AdminFormEditor({ applicationId, initialData = null }) {
  const [data, setData] = useState(initialData);
  const [values, setValues] = useState(initialData?.answers ?? {});
  const [notice, setNotice] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(!initialData);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const apiBase = `/api/spmb-admin/applications/${applicationId}/form`;

  const refresh = useCallback(async () => {
    const res = await fetch(apiBase, { cache: "no-store" });
    const json = await res.json();
    if (res.ok) {
      setData(json);
      setValues(json.answers ?? {});
    }
    return json;
  }, [apiBase]);

  useEffect(() => {
    if (!initialData) {
      refresh().finally(() => setLoading(false));
    }
  }, [initialData, refresh]);

  useEffect(() => {
    setValues(data?.answers ?? {});
  }, [data?.answers]);

  const groups = data?.formDefinition?.schema?.groups ?? [];
  const access = data?.access ?? { canFill: true, isEditable: true, isSubmitted: false };
  const progress = useMemo(
    () => computeProgress(groups, values),
    [groups, values]
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
      const res = await fetch(apiBase, {
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
        text: submit ? "Formulir berhasil diajukan." : "Perubahan berhasil disimpan.",
      });
    } catch {
      setError("Terjadi kesalahan jaringan. Coba lagi.");
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const questionnaireProgress = data?.questionnaireProgress ?? {
    total: 0,
    completed: 0,
    isComplete: true,
    incomplete: [],
  };

  const formFieldsComplete = useMemo(() => {
    const required = progress?.requiredCount ?? 0;
    const filled = progress?.filledRequired ?? 0;
    return required === 0 || filled >= required;
  }, [progress]);

  const canSubmit = useMemo(() => {
    const questionnairesComplete =
      questionnaireProgress.total === 0 || questionnaireProgress.isComplete === true;
    return formFieldsComplete && questionnairesComplete;
  }, [formFieldsComplete, questionnaireProgress]);

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center">
        <p className="text-sm text-slate-500">Memuat formulir...</p>
      </div>
    );
  }

  if (!data?.formDefinition) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Formulir belum tersedia</h2>
          <p className="mt-2 text-sm text-slate-600">
            Admin belum mempublikasikan formulir pendaftaran untuk periode ini.
          </p>
          <Link
            href="/spmb-admin/pendaftaran"
            className="mt-4 inline-flex text-sm font-medium text-[var(--admin-primary)] hover:underline"
          >
            Kembali ke daftar pendaftar
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/spmb-admin/pendaftaran"
            className="text-sm font-medium text-slate-500 hover:text-[var(--admin-primary)]"
          >
            ← Kembali ke pendaftaran
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">
            {data.formDefinition.name ?? "Formulir pendaftaran"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Mengisi atas nama{" "}
            <span className="font-medium text-slate-900">{data.applicant?.name}</span>
            {data.applicant?.email ? ` (${data.applicant.email})` : ""}
          </p>
          {data.activePeriod ? (
            <p className="mt-0.5 text-sm text-slate-500">
              {data.activePeriod.name} · {data.activePeriod.academicYear}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {data.application?.status ? <StatusBadge status={data.application.status} /> : null}
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm">
            <span className="text-slate-500">Kelengkapan </span>
            <span className="font-semibold text-slate-900">{progress?.percent ?? 0}%</span>
          </div>
        </div>
      </div>

      {access.isSubmitted ? (
        <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Formulir dalam status diajukan/review. Admin tetap dapat mengubah isian dan menyimpan
          perubahan.
        </div>
      ) : null}

      {!formFieldsComplete ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Lengkapi semua field wajib (<span className="text-rose-500">*</span>) sebelum mengajukan.
          Upload berkas bersifat opsional untuk admin.
        </div>
      ) : null}
      {questionnaireProgress.total > 0 && !questionnaireProgress.isComplete ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Kuesioner wajib belum lengkap ({questionnaireProgress.completed}/
          {questionnaireProgress.total} selesai). Calon siswa perlu menyelesaikan kuesioner melalui
          portal sebelum formulir dapat diajukan.
        </div>
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

      <form
        onSubmit={(e) => {
          e.preventDefault();
          persist(true);
        }}
        className="space-y-6"
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <DynamicFormRenderer
            groups={groups}
            values={values}
            onChange={handleChange}
            optionalFileFields
          />
        </section>

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {canSubmit
                ? "Semua persyaratan terpenuhi. Formulir siap diajukan."
                : "Simpan draf kapan saja, ajukan setelah semua field wajib terisi."}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => persist(false)}
                disabled={saving || submitting}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan draf"}
              </button>
              <button
                type="submit"
                disabled={saving || submitting || !canSubmit}
                className="rounded-xl bg-[var(--admin-primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? "Mengajukan..." : "Ajukan formulir"}
              </button>
            </div>
          </div>
      </form>
    </div>
  );
}
