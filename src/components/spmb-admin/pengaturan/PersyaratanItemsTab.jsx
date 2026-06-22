"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirmDelete } from "@/components/admin/home/ConfirmDeleteModal.js";
import {
  FEE_FREQUENCIES,
  FEE_FREQUENCY_LABELS,
  formatRupiah,
} from "@/modules/spmb/period-fees.js";

function emptyForm(periods) {
  return {
    label: "",
    frequency: "once",
    applyToAll: true,
    periodAmounts: periods.map((period) => ({
      periodId: period.id,
      amount: 0,
    })),
    selectedPeriodIds: [],
  };
}

function formFromItem(item, periods) {
  const amountByPeriod = new Map(
    (item.periodAmounts ?? []).map((entry) => [entry.periodId, entry.amount])
  );

  return {
    label: item.label,
    frequency: item.frequency,
    applyToAll: item.applyToAll,
    periodAmounts: periods.map((period) => ({
      periodId: period.id,
      amount: amountByPeriod.get(period.id) ?? 0,
    })),
    selectedPeriodIds: item.applyToAll
      ? periods.map((period) => period.id)
      : (item.periodAmounts ?? []).map((entry) => entry.periodId),
  };
}

function FeeItemModal({ open, mode, periods, initial, saving, onSave, onClose }) {
  const [form, setForm] = useState(() => initial ?? emptyForm(periods));
  const isEdit = mode === "edit";

  useEffect(() => {
    if (!open) return;
    setForm(initial ?? emptyForm(periods));
  }, [open, initial, periods]);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape" && !saving) onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, saving, onClose]);

  const visiblePeriods = useMemo(() => {
    if (form.applyToAll) return periods;
    return periods.filter((period) => form.selectedPeriodIds.includes(period.id));
  }, [form.applyToAll, form.selectedPeriodIds, periods]);

  const setAmount = (periodId, value) => {
    setForm((current) => ({
      ...current,
      periodAmounts: current.periodAmounts.map((entry) =>
        entry.periodId === periodId ? { ...entry, amount: Math.max(0, Number(value) || 0) } : entry
      ),
    }));
  };

  const togglePeriod = (periodId) => {
    setForm((current) => {
      const selected = new Set(current.selectedPeriodIds);
      if (selected.has(periodId)) selected.delete(periodId);
      else selected.add(periodId);
      return { ...current, selectedPeriodIds: [...selected] };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      label: form.label.trim(),
      frequency: form.frequency,
      applyToAll: form.applyToAll,
      periodAmounts: form.applyToAll
        ? form.periodAmounts
        : form.periodAmounts.filter((entry) => form.selectedPeriodIds.includes(entry.periodId)),
    };
    onSave(payload);
  };

  if (!open) return null;

  const title = isEdit ? "Edit item persyaratan" : "Tambah item persyaratan";
  const titleId = "fee-item-modal-title";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        onClick={saving ? undefined : onClose}
        disabled={saving}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 id={titleId} className="text-lg font-semibold text-slate-900">
              {title}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Tentukan persyaratan, frekuensi, visibilitas periode, dan nominal biaya per gelombang.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {periods.length === 0 ? (
          <div className="px-5 py-6">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Buat periode SPMB terlebih dahulu di tab Periode sebelum menambahkan item persyaratan.
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Persyaratan / uraian biaya</span>
                <input
                  type="text"
                  required
                  value={form.label}
                  onChange={(e) => setForm((current) => ({ ...current, label: e.target.value }))}
                  placeholder="Contoh: Iuran Pengembangan Sarana Pendidikan (IPSP)"
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                />
              </label>

              <label className="block max-w-xs">
                <span className="text-sm font-medium text-slate-700">Frekuensi</span>
                <select
                  value={form.frequency}
                  onChange={(e) => setForm((current) => ({ ...current, frequency: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  {FEE_FREQUENCIES.map((freq) => (
                    <option key={freq} value={freq}>
                      {FEE_FREQUENCY_LABELS[freq]}
                    </option>
                  ))}
                </select>
              </label>

              <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-medium text-slate-700">Tampilkan di periode</legend>
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="applyToAll"
                    checked={form.applyToAll}
                    onChange={() => setForm((current) => ({ ...current, applyToAll: true }))}
                    className="mt-1"
                  />
                  <span className="text-sm text-slate-700">Semua periode (gelombang)</span>
                </label>
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="applyToAll"
                    checked={!form.applyToAll}
                    onChange={() =>
                      setForm((current) => ({
                        ...current,
                        applyToAll: false,
                        selectedPeriodIds: current.selectedPeriodIds.length
                          ? current.selectedPeriodIds
                          : [periods[0]?.id].filter(Boolean),
                      }))
                    }
                    className="mt-1"
                  />
                  <span className="text-sm text-slate-700">Periode tertentu saja</span>
                </label>

                {!form.applyToAll ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {periods.map((period) => {
                      const checked = form.selectedPeriodIds.includes(period.id);
                      return (
                        <label
                          key={period.id}
                          className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs font-medium ${
                            checked
                              ? "border-primary/30 bg-primary/5 text-primary"
                              : "border-slate-200 bg-slate-50 text-slate-600"
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="sr-only"
                            checked={checked}
                            onChange={() => togglePeriod(period.id)}
                          />
                          {period.name} ({period.academicYear})
                        </label>
                      );
                    })}
                  </div>
                ) : null}
              </fieldset>

              <section className="overflow-hidden rounded-xl border border-slate-200">
                <div className="border-b border-slate-100 px-4 py-3">
                  <h4 className="font-semibold text-slate-900">Biaya per periode</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Nominal dapat berbeda untuk setiap gelombang.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Periode</th>
                        <th className="px-4 py-3 font-semibold">Nominal (Rp)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {visiblePeriods.map((period) => {
                        const amount =
                          form.periodAmounts.find((entry) => entry.periodId === period.id)?.amount ?? 0;
                        return (
                          <tr key={period.id}>
                            <td className="px-4 py-3 text-slate-700">
                              {period.name}
                              <span className="ml-2 text-xs text-slate-400">{period.academicYear}</span>
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="number"
                                min={0}
                                step={1000}
                                value={amount}
                                onChange={(e) => setAmount(period.id, e.target.value)}
                                className="w-full min-w-32 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>

            <div className="flex shrink-0 flex-wrap justify-end gap-3 border-t border-slate-100 bg-slate-50/60 px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
              >
                {saving ? "Menyimpan..." : isEdit ? "Simpan perubahan" : "Tambah item"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function PersyaratanItemsTab({ periods, onMessage }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingItem, setEditingItem] = useState(null);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const loadItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spmb-admin/fee-items");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat item persyaratan");
      setItems(data.items ?? []);
    } catch (err) {
      onMessage?.({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, [onMessage]);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const closeModal = () => {
    if (saving) return;
    setModalOpen(false);
    setEditingItem(null);
  };

  const handleSave = async (payload) => {
    setSaving(true);
    try {
      const isEdit = modalMode === "edit" && editingItem;
      const res = await fetch(
        isEdit ? `/api/spmb-admin/fee-items/${editingItem.id}` : "/api/spmb-admin/fee-items",
        {
          method: isEdit ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan item");

      onMessage?.({ type: "success", text: data.message });
      setModalOpen(false);
      setEditingItem(null);
      await loadItems();
    } catch (err) {
      onMessage?.({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item) => {
    const ok = await confirmDelete({
      title: "Hapus item persyaratan?",
      description: `"${item.label}" akan dihapus dari semua periode.`,
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/spmb-admin/fee-items/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus item");
      onMessage?.({ type: "success", text: data.message });
      if (editingItem?.id === item.id) closeModal();
      await loadItems();
    } catch (err) {
      onMessage?.({ type: "error", text: err.message });
    }
  };

  const openCreate = () => {
    setModalMode("create");
    setEditingItem(null);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setModalMode("edit");
    setEditingItem(item);
    setModalOpen(true);
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat item persyaratan...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-900">Alur persyaratan keuangan</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Buat periode/gelombang terlebih dahulu di tab Periode</li>
          <li>Tambahkan item persyaratan dengan frekuensi dan biaya per gelombang</li>
          <li>Pilih apakah item ditampilkan di semua periode atau periode tertentu</li>
        </ol>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          disabled={periods.length === 0}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
        >
          + Tambah item persyaratan
        </button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-600">
          Belum ada item persyaratan. Tambahkan item setelah periode dibuat.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <article
              key={item.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-slate-900">{item.label}</h4>
                  <p className="mt-1 text-sm text-slate-600">
                    Frekuensi: {FEE_FREQUENCY_LABELS[item.frequency] ?? item.frequency}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {item.applyToAll
                      ? "Ditampilkan di semua periode"
                      : `Periode tertentu (${item.periodAmounts.length})`}
                  </p>
                  <ul className="mt-3 space-y-1 text-sm text-slate-700">
                    {item.periodAmounts.map((entry) => (
                      <li key={entry.periodId}>
                        {entry.period?.name ?? entry.periodId}:{" "}
                        <span className="font-medium">{formatRupiah(entry.amount)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEdit(item)}
                    className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <FeeItemModal
        open={modalOpen}
        mode={modalMode}
        periods={periods}
        initial={editingItem ? formFromItem(editingItem, periods) : null}
        saving={saving}
        onSave={handleSave}
        onClose={closeModal}
      />

      <ConfirmDeleteDialog />
    </div>
  );
}
