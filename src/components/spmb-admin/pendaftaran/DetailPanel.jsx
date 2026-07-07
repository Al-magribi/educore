"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { downloadApplicationFormWord } from "@/lib/spmb/application-form-word.js";
import { RESETTABLE_STATUSES, getFormEditLabel } from "./constants.js";
import { StatusBadge } from "./StatusBadge.jsx";

function FieldValueDisplay({ field }) {
  if (!field.hasValue) {
    return <span className="italic text-slate-400">Belum diisi</span>;
  }

  if (field.type === "file" && field.value?.type === "file") {
    return (
      <a
        href={field.value.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 font-medium text-[var(--admin-primary)] hover:underline"
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
          />
        </svg>
        <span className="break-all">{field.value.fileName ?? "Lihat berkas"}</span>
      </a>
    );
  }

  if (field.type === "textarea") {
    return <p className="whitespace-pre-wrap break-words">{field.value}</p>;
  }

  return <span className="break-words">{field.value}</span>;
}

function FormSections({ sections }) {
  if (!sections?.length) {
    return (
      <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Formulir belum dikonfigurasi atau belum ada jawaban.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {sections.map((section) => (
        <section key={section.id}>
          <div className="mb-3 border-b border-slate-100 pb-2">
            <h3 className="text-sm font-semibold text-slate-900">{section.title}</h3>
            {section.description ? (
              <p className="mt-0.5 text-xs text-slate-500">{section.description}</p>
            ) : null}
          </div>
          <div className="space-y-3">
            {(section.fields ?? []).map((field) => (
              <div key={field.id} className="rounded-xl border border-slate-200 p-3">
                <p className="text-xs font-medium text-slate-500">
                  {field.label}
                  {field.required ? <span className="text-rose-500"> *</span> : null}
                </p>
                <div className="mt-1.5 text-sm text-slate-800">
                  <FieldValueDisplay field={field} />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export function DetailPanel({
  applicant,
  onClose,
  onStatusChange,
  onReset,
  onDelete,
  updating,
  resetting,
  deleting,
}) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [exportNotice, setExportNotice] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!applicant?.id) {
      setDetail(null);
      setLoadError(null);
      setExportNotice(null);
      setConfirmReset(false);
      setConfirmDelete(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    setDetail(null);
    setExportNotice(null);
    setConfirmReset(false);
    setConfirmDelete(false);

    fetch(`/api/spmb-admin/applications/${applicant.id}`)
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal memuat detail formulir");
        if (!cancelled) setDetail(data.application);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicant?.id, applicant?.status]);

  const handleExportWord = () => {
    if (!detail) return;
    setExportNotice(null);
    try {
      downloadApplicationFormWord(detail);
      setExportNotice({ type: "success", text: "Formulir berhasil diekspor ke Word." });
    } catch (err) {
      setExportNotice({ type: "error", text: err.message });
    }
  };

  if (!applicant) return null;

  const display = detail ?? applicant;
  const canReset = RESETTABLE_STATUSES.has(display.status);
  const isBusy = updating || resetting || deleting;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-label="Tutup" />
      <aside className="relative flex h-full w-full max-w-2xl flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-slate-900">Detail pendaftar</h2>
            {detail?.formDefinition?.name ? (
              <p className="truncate text-xs text-slate-500">{detail.formDefinition.name}</p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Tutup panel"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-xl font-semibold text-slate-900">{display.name}</p>
          <p className="mt-1 text-sm text-slate-600">{display.email}</p>
          <p className="text-sm text-slate-600">{display.phone}</p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <StatusBadge status={display.status} />
            <Link
              href={`/spmb-admin/pendaftaran/${applicant.id}/formulir`}
              className="inline-flex rounded-lg bg-[var(--admin-primary)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
            >
              {getFormEditLabel(display.status)}
            </Link>
          </div>

          <dl className="mt-6 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-slate-500">Asal sekolah</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{display.school}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tanggal ajuan</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {display.submittedAtFormatted ?? display.submittedAt ?? "Belum diajukan"}
              </dd>
            </div>
            {display.periodName ? (
              <div className="sm:col-span-2">
                <dt className="text-slate-500">Periode</dt>
                <dd className="mt-0.5 font-medium text-slate-900">
                  {display.periodName}
                  {display.academicYear ? ` · ${display.academicYear}` : ""}
                </dd>
              </div>
            ) : null}
          </dl>

          <div className="mt-8">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-base font-semibold text-slate-900">Isian formulir</h3>
              <button
                type="button"
                onClick={handleExportWord}
                disabled={loading || !detail}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg className="h-4 w-4 text-blue-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zM8.5 13.5 10 16l1.5-2.5L13 16l1.5-2.5L16 16h-7l1.5-2.5z" />
                </svg>
                Ekspor Word
              </button>
            </div>

            {exportNotice ? (
              <div
                className={`mb-4 rounded-xl px-4 py-3 text-sm ${
                  exportNotice.type === "success"
                    ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
                    : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
                }`}
              >
                {exportNotice.text}
              </div>
            ) : null}

            {loading ? (
              <div className="flex min-h-[160px] items-center justify-center text-sm text-slate-500">
                Memuat formulir...
              </div>
            ) : loadError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
                {loadError}
              </div>
            ) : (
              <FormSections sections={detail?.sections} />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-slate-100 p-5">
          {confirmDelete ? (
            <div className="mb-2 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-medium text-rose-950">Hapus pendaftaran?</p>
              <p className="mt-1 text-xs text-rose-900/80">
                Pendaftaran <strong>{display.name}</strong>, formulir, berkas unggahan, dan riwayat
                pembayaran terkait akan dihapus permanen.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setConfirmDelete(false)}
                  className="flex-1 rounded-lg border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-900 hover:bg-rose-100 disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    await onDelete?.(applicant.id);
                    setConfirmDelete(false);
                  }}
                  className="flex-1 rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
                >
                  {deleting ? "Menghapus..." : "Ya, hapus"}
                </button>
              </div>
            </div>
          ) : null}
          {confirmReset ? (
            <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="text-sm font-medium text-amber-950">Reset status ke diajukan?</p>
              <p className="mt-1 text-xs text-amber-900/80">
                Status akan kembali ke <strong>Diajukan</strong> dan keputusan review (terima/tolak)
                dibatalkan.
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => setConfirmReset(false)}
                  className="flex-1 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-60"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={async () => {
                    await onReset?.(applicant.id);
                    setConfirmReset(false);
                  }}
                  className="flex-1 rounded-lg bg-amber-600 px-3 py-2 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {resetting ? "Mereset..." : "Ya, reset"}
                </button>
              </div>
            </div>
          ) : null}
          <div className="flex flex-col gap-2 sm:flex-row">
            {canReset ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => setConfirmReset(true)}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Reset
              </button>
            ) : null}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setConfirmDelete(true)}
              className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-100 disabled:opacity-60"
            >
              Hapus
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onStatusChange(applicant.id, "accepted")}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              Terima
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => onStatusChange(applicant.id, "rejected")}
              className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
            >
              Tolak
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}
