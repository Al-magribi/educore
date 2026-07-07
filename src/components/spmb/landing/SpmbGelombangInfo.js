"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { StaggerChildren, StaggerItem } from "@/components/motion/StaggerChildren.js";
import {
  FEE_FREQUENCY_LABELS,
  formatRupiah,
} from "@/modules/spmb/period-fees.js";

function useModalLock(open, onClose) {
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
}

function GelombangDetailModal({ gelombang, onClose }) {
  const handleClose = useCallback(() => onClose(), [onClose]);
  useModalLock(Boolean(gelombang), handleClose);

  if (!gelombang) return null;

  const { name, academicYear, dateRange, isActive, financialFees } = gelombang;
  const items = financialFees?.items ?? [];
  const total = financialFees?.total ?? 0;
  const titleId = "gelombang-detail-modal-title";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        onClick={handleClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 id={titleId} className="text-lg font-semibold text-slate-900">
                {name}
              </h2>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                  isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"
                }`}
              >
                {isActive ? "Gelombang Aktif" : "Tidak Aktif"}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-slate-500">
              {academicYear} · {dateRange}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-4 py-3">
              <h3 className="font-semibold text-slate-900">
                {financialFees?.title || "Persyaratan keuangan"}
              </h3>
              {financialFees?.note ? (
                <p className="mt-1 text-xs text-slate-500">{financialFees.note}</p>
              ) : null}
            </div>

            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-slate-500">
                Belum ada item persyaratan untuk gelombang ini.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Uraian</th>
                      <th className="px-4 py-3 font-semibold">Frekuensi</th>
                      <th className="px-4 py-3 font-semibold">Nominal (Rp)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 text-slate-700">{item.label}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {FEE_FREQUENCY_LABELS[item.frequency] ?? item.frequency}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {formatRupiah(item.amount)}
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 font-semibold text-slate-900">
                      <td className="px-4 py-3" colSpan={2}>
                        Jumlah total gelombang ini
                      </td>
                      <td className="px-4 py-3">{formatRupiah(total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function SpmbGelombangInfo({ items = [] }) {
  const [selected, setSelected] = useState(null);

  if (!items.length) return null;

  return (
    <>
      <section className="relative z-10 -mt-6 pb-2 sm:-mt-8 md:-mt-10 md:pb-4">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <StaggerChildren
            className={`grid items-stretch gap-3 sm:gap-4 ${
              items.length === 1
                ? "mx-auto max-w-md"
                : items.length === 2
                  ? "sm:grid-cols-2"
                  : "sm:grid-cols-2 lg:grid-cols-3"
            }`}
          >
            {items.map((item) => (
              <StaggerItem key={item.id} className="h-full">
                <motion.div
                  whileHover={{ y: -4 }}
                  className={`flex h-full min-h-[148px] flex-col items-center justify-center rounded-2xl border bg-white p-5 text-center shadow-lg sm:min-h-[160px] sm:p-6 ${
                    item.isActive
                      ? "border-emerald-300 shadow-emerald-100/80 ring-2 ring-emerald-200/60"
                      : "border-red-200 shadow-red-100/60 ring-1 ring-red-100"
                  }`}
                >
                  <div className="flex w-full flex-col items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                        item.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {item.isActive ? "Gelombang Aktif" : "Tidak Aktif"}
                    </span>
                    <p
                      className={`text-lg font-bold sm:text-xl ${
                        item.isActive ? "text-emerald-700" : "text-red-600"
                      }`}
                    >
                      {item.name}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">{item.dateRange}</p>
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className={`mt-2 rounded-lg border px-4 py-1.5 text-xs font-semibold transition hover:shadow-sm sm:text-sm ${
                        item.isActive
                          ? "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      Detail
                    </button>
                  </div>
                </motion.div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      </section>

      <GelombangDetailModal gelombang={selected} onClose={() => setSelected(null)} />
    </>
  );
}
