"use client";

import { AppImage } from "@/components/ui/AppImage.js";
import { useRef, useState } from "react";
import { Field } from "./AdminFormFields.js";
import { useConfirmDelete } from "./ConfirmDeleteModal.js";
import { isAppUploadUrl } from "@/lib/storage/urls.js";

const ACCEPT = "image/jpeg,image/png,image/webp,image/gif";

const PREVIEW_VARIANTS = {
  default: {
    container: "relative aspect-[16/9] max-h-56 w-full bg-slate-200",
    imageClass: "object-cover",
    sizes: "(max-width: 768px) 100vw, 480px",
  },
  logo: {
    container:
      "flex h-32 w-full items-center justify-center rounded-lg bg-gradient-to-b from-slate-50 to-white px-6 py-4 ring-1 ring-inset ring-slate-200",
    imageClass: "object-contain object-center",
    inner: "relative h-24 w-full max-w-sm",
    sizes: "320px",
  },
  favicon: {
    container:
      "inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 p-3 ring-1 ring-inset ring-slate-200",
    imageClass: "object-contain",
    inner: "relative h-14 w-14",
    sizes: "56px",
  },
};

/**
 * @param {{
 *   label: string;
 *   hint?: string;
 *   value: string;
 *   onChange: (url: string) => void;
 *   category?: string;
 *   alt?: string;
 *   onAltChange?: (alt: string) => void;
 *   optional?: boolean;
 *   previewVariant?: "default" | "logo" | "favicon";
 * }} props
 */
export function ImageUploadField({
  label,
  hint,
  value,
  onChange,
  category = "cms",
  alt,
  onAltChange,
  optional = false,
  previewVariant = "default",
}) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const hasImage = isAppUploadUrl(value);
  const preview = PREVIEW_VARIANTS[previewVariant] ?? PREVIEW_VARIANTS.default;

  const handleFile = async (file) => {
    if (!file) return;
    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("category", category);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengunggah");

      onChange(data.url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    const ok = await confirmDelete({
      title: "Hapus gambar",
      description: `Gambar "${label}" akan dihapus dari formulir. Anda perlu mengunggah ulang jika ingin menampilkannya kembali.`,
    });
    if (!ok) return;

    onChange("");
    setError(null);
  };

  return (
    <div className="space-y-3">
      <Field
        label={label}
        hint={
          hint ??
          "JPEG, PNG, WebP, atau GIF — unggah maks. 5 MB. Disimpan otomatis sebagai WebP di bawah 1 MB."
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPT}
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
          disabled={uploading}
        />

        {hasImage ? (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
            {preview.inner ? (
              <div className={previewVariant === "favicon" ? "flex justify-center p-4" : "p-4"}>
                <div
                  className={
                    previewVariant === "logo"
                      ? "flex h-32 w-full items-center justify-center rounded-lg bg-gradient-to-b from-slate-50 to-white px-6 ring-1 ring-inset ring-slate-200"
                      : preview.container
                  }
                >
                  <div className={preview.inner}>
                    <AppImage
                      src={value}
                      alt={alt || label}
                      fill
                      className={preview.imageClass}
                      sizes={preview.sizes}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className={preview.container}>
                <AppImage
                  src={value}
                  alt={alt || label}
                  fill
                  className={preview.imageClass}
                  sizes={preview.sizes}
                />
              </div>
            )}
            {preview.inner ? (
              <p className="border-t border-slate-100 px-4 py-2 text-center text-xs text-slate-500">
                {previewVariant === "logo"
                  ? "Pratinjau logo — proporsi asli dipertahankan"
                  : "Pratinjau favicon — tampil persegi di tab browser"}
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2 border-t border-slate-200 p-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                {uploading ? "Mengunggah..." : "Ganti gambar"}
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={uploading}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
              >
                Hapus
              </button>
            </div>
            <p className="border-t border-slate-100 px-3 py-2 font-mono text-xs text-slate-500">
              {value}
            </p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50/80 px-4 py-10 text-sm text-slate-600 transition hover:border-[var(--admin-primary)] hover:bg-white disabled:opacity-60"
          >
            <svg
              className="h-10 w-10 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
              aria-hidden
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="font-medium text-slate-700">
              {uploading ? "Mengunggah..." : optional ? "Unggah gambar (opsional)" : "Unggah gambar"}
            </span>
            {!optional ? (
              <span className="text-xs text-slate-500">Wajib diunggah ke server</span>
            ) : null}
          </button>
        )}
      </Field>

      {onAltChange ? (
        <Field label="Alt text gambar">
          <input
            type="text"
            value={alt ?? ""}
            onChange={(e) => onAltChange(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-ring)]"
          />
        </Field>
      ) : null}

      {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      <ConfirmDeleteDialog />
    </div>
  );
}
