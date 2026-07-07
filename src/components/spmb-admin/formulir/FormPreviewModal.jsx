"use client";

import { useEffect } from "react";
import { describeFileAccept } from "@/lib/file-accept.js";
import { FormSelect } from "@/components/spmb/FormSelect.js";

function FieldPreview({ field }) {
  const baseClass =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800";

  if (field.type === "textarea") {
    return <div className={`${baseClass} min-h-[80px] text-slate-400`}>Teks panjang...</div>;
  }
  if (field.type === "select") {
    return (
      <FormSelect
        value=""
        options={field.options ?? []}
        placeholder={`Pilih ${field.label?.toLowerCase() ?? "opsi"}...`}
        disabled
      />
    );
  }
  if (field.type === "radio") {
    return (
      <div className="space-y-2">
        {(field.options ?? []).map((opt) => (
          <label key={opt} className="flex items-center gap-2 text-sm text-slate-700">
            <span className="h-4 w-4 shrink-0 rounded-full border border-slate-300 bg-white" />
            {opt}
          </label>
        ))}
      </div>
    );
  }
  if (field.type === "checkbox") {
    return (
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <span className="h-4 w-4 shrink-0 rounded border border-slate-300 bg-white" />
        {field.label}
      </label>
    );
  }
  if (field.type === "file") {
    return (
      <div className={`${baseClass} border-dashed bg-slate-50 text-center text-slate-500`}>
        Unggah berkas {field.accept ? `(${describeFileAccept(field.accept)})` : ""}
      </div>
    );
  }

  return (
    <input
      type={
        field.type === "number"
          ? "number"
          : field.type === "date"
            ? "date"
            : field.type === "email"
              ? "email"
              : field.type === "tel"
                ? "tel"
                : "text"
      }
      className={baseClass}
      placeholder={field.placeholder || field.label}
      disabled
    />
  );
}

export function FormPreviewModal({ open, meta, groups, onClose }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const totalFields = groups.reduce((sum, group) => sum + group.fields.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Tutup pratinjau"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="form-preview-title"
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id="form-preview-title" className="text-lg font-semibold text-slate-900">
              Pratinjau formulir
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">Tampilan yang akan dilihat calon siswa.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
            <p className="font-semibold text-slate-900">{meta.name}</p>
            {meta.description ? (
              <p className="mt-1 text-sm text-slate-600">{meta.description}</p>
            ) : null}
          </div>

          {totalFields === 0 ? (
            <p className="text-center text-sm text-slate-500">Belum ada field pada formulir ini.</p>
          ) : (
            <div className="space-y-8">
              {groups.map((group) =>
                group.fields.length === 0 ? null : (
                  <section key={group.id}>
                    <div className="mb-4 border-b border-slate-200 pb-3">
                      <h3 className="font-semibold text-slate-900">{group.title}</h3>
                      {group.description ? (
                        <p className="mt-1 text-sm text-slate-500">{group.description}</p>
                      ) : null}
                    </div>
                    <div className="space-y-5">
                      {group.fields.map((field) => (
                        <div key={field.id}>
                          {field.type !== "checkbox" ? (
                            <p className="mb-1.5 text-sm font-medium text-slate-700">
                              {field.label}
                              {field.required ? <span className="text-rose-500"> *</span> : null}
                            </p>
                          ) : null}
                          <FieldPreview field={field} />
                        </div>
                      ))}
                    </div>
                  </section>
                )
              )}
            </div>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Tutup pratinjau
          </button>
        </div>
      </div>
    </div>
  );
}
