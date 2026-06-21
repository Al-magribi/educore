"use client";

import { useMemo } from "react";
import {
  calculateFeeTotal,
  createEmptyFeeItem,
  createFeeItemsFromPreset,
  DEFAULT_WAVE_FEE_PRESETS,
  FEE_FREQUENCIES,
  FEE_FREQUENCY_LABELS,
  formatRupiah,
} from "@/modules/spmb/period-fees.js";

export function FinancialFeesEditor({ items = [], onChange, readOnly = false }) {
  const total = useMemo(() => calculateFeeTotal(items), [items]);

  const updateItems = (nextItems) => onChange(nextItems);

  const setItemField = (itemId, key, value) => {
    updateItems(
      items.map((item) => (item.id === itemId ? { ...item, [key]: value } : item))
    );
  };

  const setItemAmount = (itemId, value) => {
    setItemField(itemId, "amount", Math.max(0, Number(value) || 0));
  };

  const addItem = () => {
    updateItems([...items, createEmptyFeeItem(`Item ${items.length + 1}`)]);
  };

  const removeItem = (itemId) => {
    updateItems(items.filter((item) => item.id !== itemId));
  };

  const applyPreset = (presetKey) => {
    updateItems(createFeeItemsFromPreset(DEFAULT_WAVE_FEE_PRESETS[presetKey]));
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h4 className="font-semibold text-slate-900">Persyaratan keuangan siswa baru</h4>
          <p className="mt-1 text-xs text-slate-500">
            Tambah, ubah, atau hapus rincian biaya masuk. Total dihitung otomatis.
          </p>
        </div>
        {!readOnly ? (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset("gelombang1")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Preset Gelombang 1
            </button>
            <button
              type="button"
              onClick={() => applyPreset("gelombang2")}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Preset Gelombang 2
            </button>
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              + Tambah item
            </button>
          </div>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="px-4 py-8 text-center text-sm text-slate-500">
          Belum ada item biaya.
          {!readOnly ? (
            <button
              type="button"
              onClick={addItem}
              className="ml-1 font-semibold text-primary hover:underline"
            >
              Tambah item pertama
            </button>
          ) : null}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Uraian</th>
                <th className="px-4 py-3 font-semibold">Frekuensi</th>
                <th className="px-4 py-3 font-semibold">Nominal (Rp)</th>
                {!readOnly ? <th className="px-4 py-3 font-semibold">Aksi</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item, index) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <span className="text-slate-700">{item.label}</span>
                    ) : (
                      <input
                        type="text"
                        required
                        value={item.label}
                        placeholder={`Uraian biaya ${index + 1}`}
                        onChange={(e) => setItemField(item.id, "label", e.target.value)}
                        className="w-full min-w-[12rem] rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <span className="text-slate-500">
                        ({FEE_FREQUENCY_LABELS[item.frequency] ?? item.frequency})
                      </span>
                    ) : (
                      <select
                        value={item.frequency}
                        onChange={(e) => setItemField(item.id, "frequency", e.target.value)}
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      >
                        {FEE_FREQUENCIES.map((freq) => (
                          <option key={freq} value={freq}>
                            {FEE_FREQUENCY_LABELS[freq]}
                          </option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <span className="font-medium text-slate-900">{formatRupiah(item.amount)}</span>
                    ) : (
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={item.amount}
                        onChange={(e) => setItemAmount(item.id, e.target.value)}
                        className="w-full min-w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                      />
                    )}
                  </td>
                  {!readOnly ? (
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                        aria-label={`Hapus ${item.label || "item"}`}
                      >
                        Hapus
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
              <tr className="bg-slate-50 font-semibold text-slate-900">
                <td className="px-4 py-3" colSpan={2}>
                  Jumlah
                </td>
                <td className="px-4 py-3">{formatRupiah(total)}</td>
                {!readOnly ? <td className="px-4 py-3" /> : null}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
