"use client";

import { useMemo } from "react";
import { RupiahInput, SelectInput } from "@/components/admin/home/AdminFormFields.js";
import {
  calculateFeeTotal,
  FEE_FREQUENCIES,
  FEE_FREQUENCY_LABELS,
  formatRupiah,
} from "@/modules/spmb/period-fees.js";

export function ItemBiayaStep({
  form,
  onChange,
  onSubmit,
  onBack,
  saving,
  periodName,
  readOnly = false,
  embedded = false,
  hideActions = false,
  emptyMessage,
}) {
  const total = useMemo(() => calculateFeeTotal(form.items ?? []), [form.items]);

  const setItemField = (itemId, key, value) => {
    onChange((current) => ({
      ...current,
      items: (current.items ?? []).map((item) =>
        item.id === itemId ? { ...item, [key]: value } : item
      ),
    }));
  };

  const setItemAmount = (itemId, value) => {
    setItemField(itemId, "amount", Math.max(0, Number(value) || 0));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {!embedded ? (
        <div>
          <h3 className="text-lg font-semibold text-slate-900">Langkah 3 — Item Biaya per Gelombang</h3>
          <p className="mt-1 text-sm text-slate-600">
            Atur frekuensi dan nominal biaya untuk{" "}
            <span className="font-medium text-slate-900">{periodName}</span>
            {form.title ? (
              <>
                {" "}
                — <span className="font-medium text-slate-900">{form.title}</span>
              </>
            ) : null}
            .
          </p>
        </div>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-4 py-3">
          <h4 className="font-semibold text-slate-900">{form.title || "Persyaratan keuangan"}</h4>
          {form.note ? <p className="mt-1 text-xs text-slate-500">{form.note}</p> : null}
        </div>

        {(form.items ?? []).length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            {emptyMessage ??
              "Belum ada item. Kembali ke langkah 2 untuk menambahkan item biaya."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Uraian</th>
                  <th className="px-4 py-3 font-semibold">Frekuensi</th>
                  <th className="px-4 py-3 font-semibold">Nominal gelombang ini (Rp)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(form.items ?? []).map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-slate-700">{item.label}</td>
                    <td className="px-4 py-3">
                      {readOnly ? (
                        <span className="text-slate-500">
                          ({FEE_FREQUENCY_LABELS[item.frequency] ?? item.frequency})
                        </span>
                      ) : (
                        <SelectInput
                          value={item.frequency}
                          onChange={(e) => setItemField(item.id, "frequency", e.target.value)}
                          className="min-w-36"
                        >
                          {FEE_FREQUENCIES.map((freq) => (
                            <option key={freq} value={freq}>
                              {FEE_FREQUENCY_LABELS[freq]}
                            </option>
                          ))}
                        </SelectInput>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {readOnly ? (
                        <span className="font-medium text-slate-900">{formatRupiah(item.amount)}</span>
                      ) : (
                        <RupiahInput
                          value={item.amount}
                          onValueChange={(numeric) => setItemAmount(item.id, numeric)}
                          className="min-w-36"
                        />
                      )}
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

      {!readOnly && !hideActions ? (
        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={saving || (form.items ?? []).length === 0}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : "Simpan biaya gelombang"}
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Kembali
          </button>
        </div>
      ) : null}
    </form>
  );
}
