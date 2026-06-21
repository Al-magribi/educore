"use client";

import { useConfirmDelete } from "@/components/admin/home/ConfirmDeleteModal.js";
import {
  createEmptyFeeItem,
  createTemplateFinancialFees,
  DEFAULT_FINANCIAL_TITLE,
} from "@/modules/spmb/period-fees.js";

export function PersyaratanKeuanganStep({
  form,
  onChange,
  onSubmit,
  onBack,
  saving,
  periodName,
}) {
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();
  const setField = (key, value) =>
    onChange((current) => ({
      ...current,
      [key]: value,
    }));

  const addItem = () => {
    onChange((current) => ({
      ...current,
      items: [...(current.items ?? []), createEmptyFeeItem(`Item ${(current.items?.length ?? 0) + 1}`)],
    }));
  };

  const updateItemLabel = (itemId, label) => {
    onChange((current) => ({
      ...current,
      items: (current.items ?? []).map((item) =>
        item.id === itemId ? { ...item, label } : item
      ),
    }));
  };

  const removeItem = async (item) => {
    const ok = await confirmDelete({
      title: "Hapus item biaya?",
      description: item.label
        ? `"${item.label}" akan dihapus dari daftar persyaratan keuangan.`
        : "Item biaya ini akan dihapus dari daftar persyaratan keuangan.",
    });
    if (!ok) return;

    onChange((current) => ({
      ...current,
      items: (current.items ?? []).filter((entry) => entry.id !== item.id),
    }));
  };

  const loadTemplate = () => {
    const template = createTemplateFinancialFees();
    onChange(() => ({
      title: template.title,
      note: template.note,
      items: template.items,
    }));
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Langkah 2 — Persyaratan Keuangan</h3>
        <p className="mt-1 text-sm text-slate-600">
          Definisikan judul persyaratan keuangan untuk{" "}
          <span className="font-medium text-slate-900">{periodName}</span>, lalu buat daftar item
          biaya. Frekuensi dan nominal diatur di langkah berikutnya.
        </p>
      </div>

      <div className="grid gap-4">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Judul persyaratan</span>
          <input
            type="text"
            required
            value={form.title}
            placeholder={DEFAULT_FINANCIAL_TITLE}
            onChange={(e) => setField("title", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Catatan (opsional)</span>
          <textarea
            rows={2}
            value={form.note}
            onChange={(e) => setField("note", e.target.value)}
            placeholder="Contoh: Persyaratan keuangan tahun pelajaran 2026/2027"
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h4 className="font-semibold text-slate-900">Daftar item biaya</h4>
            <p className="mt-1 text-xs text-slate-500">
              Buat uraian item terlebih dahulu. Nominal per gelombang di langkah 3.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadTemplate}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Template standar sekolah
            </button>
            <button
              type="button"
              onClick={addItem}
              className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              + Tambah item
            </button>
          </div>
        </div>

        {(form.items ?? []).length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            Belum ada item. Gunakan template standar atau tambah item manual.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {(form.items ?? []).map((item, index) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="w-6 shrink-0 text-xs font-semibold text-slate-400">
                  {String.fromCharCode(97 + index)}.
                </span>
                <input
                  type="text"
                  required
                  value={item.label}
                  placeholder={`Uraian item ${index + 1}`}
                  onChange={(e) => updateItemLabel(item.id, e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => removeItem(item)}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Hapus
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving || (form.items ?? []).length === 0}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : "Simpan & lanjut ke item biaya"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Kembali
        </button>
      </div>
      <ConfirmDeleteDialog />
    </form>
  );
}
