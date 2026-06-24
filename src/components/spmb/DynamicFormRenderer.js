"use client";

import Link from "next/link";
import { FormSelect } from "./FormSelect.js";

const INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

function FieldInput({ field, value, onChange, disabled }) {
  const id = `field-${field.id}`;

  if (field.type === "textarea") {
    return (
      <textarea
        id={id}
        name={field.id}
        rows={4}
        value={value ?? ""}
        onChange={(e) => onChange(field.id, e.target.value)}
        placeholder={field.placeholder || field.label}
        required={field.required}
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
        required={field.required}
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
          {field.required ? <span className="text-rose-500"> *</span> : null}
        </span>
      </label>
    );
  }

  if (field.type === "file") {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-center">
        <p className="text-sm text-slate-600">
          Unggah berkas ini di halaman{" "}
          <Link href="/spmb/upload" className="font-medium text-primary underline-offset-2 hover:underline">
            Upload Berkas
          </Link>
          .
        </p>
        {field.accept ? (
          <p className="mt-1 text-xs text-slate-500">Format: {field.accept}</p>
        ) : null}
      </div>
    );
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
      required={field.required}
      disabled={disabled}
      className={INPUT_CLASS}
    />
  );
}

/**
 * Render form fields dari JSON schema (form_definitions).
 */
export function DynamicFormRenderer({ groups, values, onChange, disabled = false }) {
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

                return (
                  <div key={field.id} className={isFullWidth ? "sm:col-span-2" : ""}>
                    {field.type !== "checkbox" ? (
                      <label htmlFor={`field-${field.id}`} className="mb-1.5 block text-sm font-medium text-slate-700">
                        {field.label}
                        {field.required ? <span className="text-rose-500"> *</span> : null}
                      </label>
                    ) : null}
                    <FieldInput
                      field={field}
                      value={values?.[field.id]}
                      onChange={onChange}
                      disabled={disabled || field.type === "file"}
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
