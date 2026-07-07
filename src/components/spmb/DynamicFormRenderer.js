"use client";

import { useRef, useState } from "react";
import { describeFileAccept, fileMatchesAccept, normalizeFileAccept } from "@/lib/file-accept.js";
import { FormSelect } from "./FormSelect.js";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

function fileNameFromValue(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  const segment = value.split("/").pop();
  return segment ? decodeURIComponent(segment) : "Berkas terunggah";
}

function FileFieldInput({ field, value, onChange, disabled }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileName = fileNameFromValue(value);
  const acceptValue = normalizeFileAccept(field.accept);
  const acceptLabel = describeFileAccept(field.accept) || field.accept;

  const handleUpload = async (file) => {
    if (!file || disabled) return;

    if (field.accept && !fileMatchesAccept(file, field.accept)) {
      setError(
        `Format berkas tidak didukung. Gunakan ${describeFileAccept(field.accept) || field.accept}.`
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", "spmb_docs");

      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah berkas");

      onChange(field.id, data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5">
      {fileName ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 text-left">
            <p className="text-sm font-medium text-slate-900">{fileName}</p>
            <p className="mt-0.5 text-xs text-slate-500">Berkas sudah diunggah</p>
          </div>
          {!disabled ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="inline-flex shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Mengunggah..." : "Ganti berkas"}
            </button>
          ) : null}
        </div>
      ) : (
        <div className="text-center">
          <p className="text-sm text-slate-600">Unggah berkas sesuai persyaratan formulir.</p>
          {acceptLabel ? (
            <p className="mt-1 text-xs text-slate-500">Format: {acceptLabel}</p>
          ) : null}
          {!disabled ? (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? "Mengunggah..." : "Pilih berkas"}
            </button>
          ) : null}
        </div>
      )}

      {!disabled ? (
        <input
          ref={inputRef}
          type="file"
          accept={acceptValue || undefined}
          className="sr-only"
          onChange={(e) => handleUpload(e.target.files?.[0])}
          disabled={uploading}
        />
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-600">{error}</p> : null}
    </div>
  );
}

function FieldInput({ field, value, onChange, disabled, optionalFileFields = false }) {
  const id = `field-${field.id}`;
  const isRequired =
    field.required && !(optionalFileFields && field.type === "file");

  if (field.type === "textarea") {
    return (
      <textarea
        id={id}
        name={field.id}
        rows={4}
        value={value ?? ""}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.placeholder || field.label}
        required={isRequired}
        disabled={disabled}
        className={`${INPUT_CLASS} min-h-[100px] resize-y`}
      />
    );
  }

  if (field.type === "select") {
    return (
      <FormSelect
        id={id}
        name={field.id}
        value={value ?? ""}
        onChange={(next) => onChange(field.id, next)}
        options={field.options ?? []}
        placeholder={`Pilih ${field.label.toLowerCase()}...`}
        required={isRequired}
        disabled={disabled}
      />
    );
  }

  if (field.type === "radio") {
    return (
      <div className="space-y-2.5">
        {(field.options ?? []).map((opt) => (
          <label
            key={opt}
            className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
              value === opt
                ? "border-primary bg-primary/5 text-slate-900"
                : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
            } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
          >
            <input
              type="radio"
              name={field.id}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(field.id, opt)}
              disabled={disabled}
              className="h-4 w-4 border-slate-300 text-primary focus:ring-primary/30"
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === "checkbox") {
    return (
      <label
        className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3 py-2.5 text-sm transition ${
          value
            ? "border-primary bg-primary/5 text-slate-900"
            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <input
          id={id}
          type="checkbox"
          name={field.id}
          checked={Boolean(value)}
          onChange={(e) => onChange(field.id, e.target.checked)}
          disabled={disabled}
          className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary/30"
        />
        <span>
          {field.label}
          {isRequired ? <span className="text-rose-500"> *</span> : null}
        </span>
      </label>
    );
  }

  if (field.type === "file") {
    return <FileFieldInput field={field} value={value} onChange={onChange} disabled={disabled} />;
  }

  const inputType =
    field.type === "number"
      ? "number"
      : field.type === "date"
        ? "date"
        : field.type === "email"
          ? "email"
          : field.type === "tel"
            ? "tel"
            : "text";

  return (
    <input
      id={id}
      type={inputType}
      name={field.id}
      value={value ?? ""}
      onChange={(e) =>
        onChange(
          field.id,
          field.type === "number" ? (e.target.value === "" ? "" : Number(e.target.value)) : e.target.value
        )
      }
      placeholder={field.placeholder || field.label}
      required={isRequired}
      disabled={disabled}
      className={INPUT_CLASS}
    />
  );
}

/**
 * Render form fields dari JSON schema (form_definitions).
 */
export function DynamicFormRenderer({
  groups,
  values,
  onChange,
  disabled = false,
  optionalFileFields = false,
}) {
  const safeGroups = groups ?? [];
  const totalFields = safeGroups.reduce((sum, group) => sum + (group.fields?.length ?? 0), 0);

  if (totalFields === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-8 text-center">
        <p className="text-sm text-slate-500">Formulir belum dikonfigurasi oleh admin.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {safeGroups.map((group) =>
        group.fields?.length === 0 ? null : (
          <section key={group.id} className="scroll-mt-24" id={`group-${group.id}`}>
            <div className="mb-5 border-b border-slate-100 pb-4">
              <h3 className="text-base font-semibold text-slate-900 sm:text-lg">{group.title}</h3>
              {group.description ? (
                <p className="mt-1 text-sm leading-relaxed text-slate-500">{group.description}</p>
              ) : null}
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {group.fields.map((field) => {
                const isFullWidth =
                  field.type === "textarea" ||
                  field.type === "radio" ||
                  field.type === "checkbox" ||
                  field.type === "file";
                const isRequired =
                  field.required && !(optionalFileFields && field.type === "file");

                return (
                  <div key={field.id} className={isFullWidth ? "sm:col-span-2" : ""}>
                    {field.type !== "checkbox" ? (
                      <label htmlFor={`field-${field.id}`} className="mb-1.5 block text-sm font-medium text-slate-700">
                        {field.label}
                        {isRequired ? <span className="text-rose-500"> *</span> : null}
                        {optionalFileFields && field.type === "file" && field.required ? (
                          <span className="ml-1 text-xs font-normal text-slate-400">(opsional)</span>
                        ) : null}
                      </label>
                    ) : null}
                    <FieldInput
                      field={field}
                      value={values?.[field.id]}
                      onChange={onChange}
                      disabled={disabled}
                      optionalFileFields={optionalFileFields}
                    />
                    {field.helpText ? (
                      <p className="mt-1.5 text-xs text-slate-500">{field.helpText}</p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        )
      )}
    </div>
  );
}
