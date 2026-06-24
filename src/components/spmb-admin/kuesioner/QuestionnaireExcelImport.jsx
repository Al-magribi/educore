"use client";

import { useRef, useState } from "react";
import {
  downloadQuestionnaireExcel,
  exportQuestionnaireToExcel,
  parseQuestionnaireExcelFile,
} from "@/lib/spmb/questionnaire-excel.js";

export function QuestionnaireExcelImport({ draft, onImport, disabled = false }) {
  const inputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [notice, setNotice] = useState(null);

  const handleDownloadTemplate = () => {
    downloadQuestionnaireExcel("template-kuesioner-spmb.xlsx");
    setNotice({ type: "success", text: "Template Excel berhasil diunduh." });
  };

  const handleExport = () => {
    if (!draft?.schema?.questions?.length) {
      setNotice({ type: "error", text: "Tidak ada soal untuk diekspor." });
      return;
    }
    exportQuestionnaireToExcel(draft);
    setNotice({ type: "success", text: "Kuesioner saat ini diekspor ke Excel." });
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImporting(true);
    setNotice(null);

    try {
      const imported = await parseQuestionnaireExcelFile(file);
      onImport(imported);
      setNotice({
        type: "success",
        text: `Berhasil mengimpor ${imported.schema.questions.length} soal dari Excel.`,
      });
    } catch (error) {
      setNotice({
        type: "error",
        text: error.message || "Gagal membaca file Excel.",
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-semibold text-slate-900">Import / Export Excel</h2>
          <p className="mt-1 text-sm text-slate-500">
            Unduh template, isi di Excel, lalu impor kembali. Mendukung soal pilihan ganda dan jawaban
            panjang.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={disabled}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExcelIcon />
            Unduh template
          </button>
          <button
            type="button"
            onClick={handleExport}
            disabled={disabled || !draft?.schema?.questions?.length}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ExportIcon />
            Ekspor draft
          </button>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={disabled || importing}
            className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            style={{ background: "var(--admin-primary)" }}
          >
            <UploadIcon />
            {importing ? "Membaca file..." : "Impor Excel"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>

      {notice ? (
        <p
          className={`mt-4 rounded-xl px-4 py-3 text-sm ${
            notice.type === "success"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          }`}
        >
          {notice.text}
        </p>
      ) : null}

      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-xs leading-relaxed text-slate-600">
        <p className="font-semibold text-slate-700">Struktur template:</p>
        <ul className="mt-1.5 list-inside list-disc space-y-0.5">
          <li>
            <strong>Info</strong> — judul_kuesioner, kategori, deskripsi
          </li>
          <li>
            <strong>Soal</strong> — no, jenis_soal, pertanyaan, placeholder, opsi_a … opsi_f
          </li>
          <li>
            <strong>Panduan</strong> — petunjuk pengisian
          </li>
        </ul>
      </div>
    </section>
  );
}

function ExcelIcon() {
  return (
    <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2 5 5h-5V4zM8.5 13.5 10 16l1.5-2.5L13 16l1.5-2.5L16 16h-7l1.5-2.5z" />
    </svg>
  );
}

function ExportIcon() {
  return (
    <svg className="h-4 w-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
    </svg>
  );
}

function UploadIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4m0 0L8 8m4-4v12" />
    </svg>
  );
}
