"use client";

import { useRef, useState } from "react";
import { FormMessage } from "@/components/admin/home/AdminFormFields.js";

export function BackupTab() {
  const fileRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState(null);
  const [includeUploads, setIncludeUploads] = useState(true);

  const handleDownload = async () => {
    setDownloading(true);
    setMessage(null);
    try {
      const query = includeUploads ? "" : "?uploads=false";
      const res = await fetch(`/api/admin/backup${query}`);
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal mengunduh backup");
      }

      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? "educore-backup.json";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);

      setMessage({
        type: "success",
        text: "Backup berhasil diunduh. Simpan file JSON di tempat aman.",
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setDownloading(false);
    }
  };

  const handleRestore = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setMessage({ type: "error", text: "Pilih file backup JSON terlebih dahulu" });
      return;
    }

    const confirmed = window.confirm(
      "Restore akan menimpa data CMS dan file upload dari backup. Lanjutkan?"
    );
    if (!confirmed) return;

    setRestoring(true);
    setMessage(null);
    try {
      const text = await file.text();
      const backup = JSON.parse(text);

      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backup),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal restore");

      if (fileRef.current) fileRef.current.value = "";
      setMessage({
        type: "success",
        text: `${data.message}. Muat ulang halaman untuk melihat perubahan.`,
      });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setRestoring(false);
    }
  };

  return (
    <div className="space-y-8">
      <FormMessage message={message} />

      <section className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <h3 className="text-base font-semibold text-slate-900">Backup Data</h3>
        <p className="mt-2 text-sm text-slate-600">
          Ekspor pengaturan sekolah, tema, konten beranda, berita, dan file upload ke
          satu file JSON.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={includeUploads}
            onChange={(e) => setIncludeUploads(e.target.checked)}
          />
          Sertakan file upload (maks. 100 MB total)
        </label>

        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="mt-4 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-60"
          style={{
            background: "var(--admin-primary)",
            boxShadow: "0 4px 14px color-mix(in srgb, var(--admin-primary) 35%, transparent)",
          }}
        >
          {downloading ? "Menyiapkan backup..." : "Unduh Backup"}
        </button>
      </section>

      <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
        <h3 className="text-base font-semibold text-amber-900">Restore Data</h3>
        <p className="mt-2 text-sm text-amber-800">
          Pulihkan database CMS dan file upload dari file backup. Hanya{" "}
          <strong>super admin</strong> yang dapat melakukan restore.
        </p>

        <div className="mt-4 space-y-3">
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-slate-700 hover:file:bg-slate-50"
          />

          <button
            type="button"
            onClick={handleRestore}
            disabled={restoring}
            className="rounded-xl border border-amber-300 bg-white px-5 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-100 disabled:opacity-60"
          >
            {restoring ? "Memulihkan..." : "Restore dari Backup"}
          </button>
        </div>
      </section>

      <div className="rounded-xl border border-slate-200 p-4 text-sm text-slate-600">
        <p className="font-medium text-slate-800">Yang disertakan dalam backup:</p>
        <ul className="mt-2 list-inside list-disc space-y-1">
          <li>Pengaturan sekolah &amp; tema</li>
          <li>Section beranda &amp; item</li>
          <li>Halaman tentang &amp; berita</li>
          <li>Pengaturan pembayaran &amp; SMTP</li>
          <li>File upload (opsional)</li>
        </ul>
      </div>
    </div>
  );
}
