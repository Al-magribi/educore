"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirmDelete } from "@/components/admin/home/ConfirmDeleteModal.js";
import { Field, RupiahInput, SelectInput } from "@/components/admin/home/AdminFormFields.js";
import {
  FEE_FREQUENCIES,
  FEE_FREQUENCY_LABELS,
  formatRupiah,
} from "@/modules/spmb/period-fees.js";

function ChevronIcon({ expanded }) {
  return (
    <svg
      className={`h-5 w-5 shrink-0 text-slate-500 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function gelombangKey(yearId, periodId) {
  return `${yearId}:${periodId}`;
}

function itemsForPeriod(items, periodId) {
  return items
    .filter(
      (item) =>
        item.applyToAll || item.periodAmounts.some((entry) => entry.periodId === periodId)
    )
    .map((item) => {
      const entry = item.periodAmounts.find((pa) => pa.periodId === periodId);
      return { item, amount: entry?.amount ?? 0 };
    });
}

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

function PeriodAmountAccordion({
  academicYears,
  periodsByYearId,
  expandedYearIds,
  onToggleYear,
  expandedGelombangIds,
  onToggleGelombang,
  form,
  onSetAmount,
  selectable = false,
  onTogglePeriod,
}) {
  const visiblePeriods = useMemo(() => {
    if (!selectable) {
      if (form.applyToAll) {
        return academicYears.flatMap((year) => periodsByYearId.get(year.id) ?? []);
      }
      return academicYears.flatMap((year) =>
        (periodsByYearId.get(year.id) ?? []).filter((period) =>
          form.selectedPeriodIds.includes(period.id)
        )
      );
    }
    return null;
  }, [selectable, form.applyToAll, form.selectedPeriodIds, academicYears, periodsByYearId]);

  if (selectable && form.applyToAll) {
    return (
      <p className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm text-slate-600">
        Berlaku untuk semua gelombang di setiap tahun pelajaran.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {academicYears.map((year) => {
        const yearPeriods = periodsByYearId.get(year.id) ?? [];
        if (yearPeriods.length === 0) return null;

        const periodsToShow = selectable
          ? yearPeriods
          : yearPeriods.filter((period) => visiblePeriods?.some((p) => p.id === period.id));

        if (!selectable && periodsToShow.length === 0) return null;

        const yearExpanded = expandedYearIds.has(year.id);

        return (
          <article
            key={year.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white"
          >
            <button
              type="button"
              aria-expanded={yearExpanded}
              onClick={() => onToggleYear(year.id)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-50/80"
            >
              <ChevronIcon expanded={yearExpanded} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  Tahun Pelajaran {year.academicYear}
                </p>
                <p className="text-xs text-slate-500">
                  {yearPeriods.length} gelombang
                  {year.isActive ? " · Aktif" : ""}
                </p>
              </div>
            </button>

            {yearExpanded ? (
              <div className="space-y-2 border-t border-slate-100 bg-slate-50/40 px-3 py-3">
                {periodsToShow.map((period) => {
                  const gKey = gelombangKey(year.id, period.id);
                  const gExpanded = expandedGelombangIds.has(gKey);

                  if (selectable) {
                    const checked = form.selectedPeriodIds.includes(period.id);
                    return (
                      <label
                        key={period.id}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 ${
                          checked
                            ? "border-primary/30 bg-primary/5"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => onTogglePeriod(period.id)}
                          className="rounded"
                        />
                        <span className="text-sm font-medium text-slate-800">{period.name}</span>
                        {period.isActive ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Aktif
                          </span>
                        ) : null}
                      </label>
                    );
                  }

                  const amount =
                    form.periodAmounts.find((entry) => entry.periodId === period.id)?.amount ?? 0;

                  return (
                    <div key={period.id} className="overflow-hidden rounded-lg border border-slate-200 bg-white">
                      <button
                        type="button"
                        aria-expanded={gExpanded}
                        onClick={() => onToggleGelombang(gKey)}
                        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50/80"
                      >
                        <ChevronIcon expanded={gExpanded} />
                        <span className="text-sm font-medium text-slate-800">{period.name}</span>
                        {period.isActive ? (
                          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Aktif
                          </span>
                        ) : null}
                        <span className="ml-auto text-sm font-semibold text-primary">
                          {formatRupiah(amount)}
                        </span>
                      </button>
                      {gExpanded ? (
                        <div className="border-t border-slate-100 px-3 py-3">
                          <label className="block text-xs font-medium text-slate-600">
                            Nominal untuk {period.name}
                          </label>
                          <RupiahInput
                            value={amount}
                            onValueChange={(numeric) => onSetAmount(period.id, numeric)}
                            className="mt-1 min-w-36"
                          />
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function FeeItemModal({
  open,
  mode,
  academicYears,
  periods,
  initial,
  saving,
  onSave,
  onClose,
}) {
  const [form, setForm] = useState(() => initial ?? emptyForm(periods));
  const [expandedYearIds, setExpandedYearIds] = useState(() => new Set());
  const [expandedGelombangIds, setExpandedGelombangIds] = useState(() => new Set());
  const isEdit = mode === "edit";

  const periodsByYearId = useMemo(() => {
    const map = new Map();
    for (const period of periods) {
      if (!map.has(period.academicYearId)) map.set(period.academicYearId, []);
      map.get(period.academicYearId).push(period);
    }
    return map;
  }, [periods]);

  useEffect(() => {
    if (!open) return;
    setForm(initial ?? emptyForm(periods));
    const active = academicYears.find((year) => year.isActive);
    const defaultYearId = active?.id ?? academicYears[0]?.id;
    if (defaultYearId) {
      setExpandedYearIds(new Set([defaultYearId]));
      const firstPeriod = periodsByYearId.get(defaultYearId)?.[0];
      if (firstPeriod) {
        setExpandedGelombangIds(new Set([gelombangKey(defaultYearId, firstPeriod.id)]));
      }
    }
  }, [open, initial, periods, academicYears, periodsByYearId]);

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

  const toggleYear = (yearId) => {
    setExpandedYearIds((prev) => {
      const next = new Set(prev);
      if (next.has(yearId)) next.delete(yearId);
      else next.add(yearId);
      return next;
    });
  };

  const toggleGelombang = (key) => {
    setExpandedGelombangIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
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
              Tentukan persyaratan, frekuensi, dan nominal biaya per gelombang.
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
              Buat tahun pelajaran dan gelombang di tab Periode sebelum menambahkan item persyaratan.
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

              <Field label="Frekuensi" className="max-w-xs">
                <SelectInput
                  value={form.frequency}
                  onChange={(e) => setForm((current) => ({ ...current, frequency: e.target.value }))}
                >
                  {FEE_FREQUENCIES.map((freq) => (
                    <option key={freq} value={freq}>
                      {FEE_FREQUENCY_LABELS[freq]}
                    </option>
                  ))}
                </SelectInput>
              </Field>

              <fieldset className="space-y-3 rounded-xl border border-slate-200 p-4">
                <legend className="px-1 text-sm font-medium text-slate-700">Tampilkan di gelombang</legend>
                <label className="flex items-start gap-3">
                  <input
                    type="radio"
                    name="applyToAll"
                    checked={form.applyToAll}
                    onChange={() => setForm((current) => ({ ...current, applyToAll: true }))}
                    className="mt-1"
                  />
                  <span className="text-sm text-slate-700">Semua gelombang</span>
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
                  <span className="text-sm text-slate-700">Gelombang tertentu saja</span>
                </label>

                {!form.applyToAll ? (
                  <PeriodAmountAccordion
                    academicYears={academicYears}
                    periodsByYearId={periodsByYearId}
                    expandedYearIds={expandedYearIds}
                    onToggleYear={toggleYear}
                    expandedGelombangIds={expandedGelombangIds}
                    onToggleGelombang={toggleGelombang}
                    form={form}
                    selectable
                    onTogglePeriod={togglePeriod}
                  />
                ) : null}
              </fieldset>

              <section className="space-y-3">
                <div>
                  <h4 className="font-semibold text-slate-900">Biaya per gelombang</h4>
                  <p className="mt-1 text-xs text-slate-500">
                    Buka tahun pelajaran dan gelombang untuk mengatur nominal.
                  </p>
                </div>
                <PeriodAmountAccordion
                  academicYears={academicYears}
                  periodsByYearId={periodsByYearId}
                  expandedYearIds={expandedYearIds}
                  onToggleYear={toggleYear}
                  expandedGelombangIds={expandedGelombangIds}
                  onToggleGelombang={toggleGelombang}
                  form={form}
                  onSetAmount={setAmount}
                />
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

function PersyaratanGelombangPanel({
  period,
  entries,
  onEdit,
  onDelete,
}) {
  const [expanded, setExpanded] = useState(false);
  const panelId = `persyaratan-gelombang-${period.id}`;
  const headerId = `persyaratan-gelombang-header-${period.id}`;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
      <button
        type="button"
        id={headerId}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:bg-slate-50/80"
      >
        <ChevronIcon expanded={expanded} />
        <span className="text-sm font-medium text-slate-800">{period.name}</span>
        {period.isActive ? (
          <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
            Aktif
          </span>
        ) : null}
        <span className="ml-auto text-xs text-slate-500">{entries.length} item</span>
      </button>

      <div id={panelId} role="region" aria-labelledby={headerId} hidden={!expanded}>
        {expanded ? (
          <div className="space-y-2 border-t border-slate-100 px-3 py-3">
            {entries.length === 0 ? (
              <p className="text-center text-sm text-slate-500">Belum ada persyaratan untuk gelombang ini.</p>
            ) : (
              entries.map(({ item, amount }) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">{item.label}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {FEE_FREQUENCY_LABELS[item.frequency] ?? item.frequency}
                      {item.applyToAll ? " · Semua gelombang" : ""}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-primary">{formatRupiah(amount)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(item)}
                      className="rounded-lg border border-primary/20 bg-primary/5 px-2.5 py-1 text-xs font-semibold text-primary hover:bg-primary/10"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(item)}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PersyaratanYearAccordion({
  year,
  periods,
  items,
  expanded,
  onToggle,
  onEdit,
  onDelete,
}) {
  const panelId = `persyaratan-year-${year.id}`;
  const headerId = `persyaratan-year-header-${year.id}`;
  const totalItems = useMemo(() => {
    const ids = new Set();
    for (const period of periods) {
      for (const { item } of itemsForPeriod(items, period.id)) {
        ids.add(item.id);
      }
    }
    return ids.size;
  }, [periods, items]);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        id={headerId}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={onToggle}
        className="flex w-full items-start gap-3 p-5 text-left hover:bg-slate-50/50"
      >
        <ChevronIcon expanded={expanded} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-semibold text-slate-900">Tahun Pelajaran {year.academicYear}</h4>
            {year.isActive ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                Aktif
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {periods.length} gelombang · {totalItems} item persyaratan
            {expanded ? "" : " · klik untuk melihat detail"}
          </p>
        </div>
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!expanded}
        className={expanded ? "border-t border-slate-100" : ""}
      >
        {expanded ? (
          <div className="space-y-3 bg-slate-50/40 px-5 py-4">
            {periods.length === 0 ? (
              <p className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                Belum ada gelombang pada tahun pelajaran ini.
              </p>
            ) : (
              periods.map((period) => (
                <PersyaratanGelombangPanel
                  key={period.id}
                  period={period}
                  entries={itemsForPeriod(items, period.id)}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

export default function PersyaratanItemsTab({ academicYears = [], periods, onMessage }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("create");
  const [editingItem, setEditingItem] = useState(null);
  const [expandedYearIds, setExpandedYearIds] = useState(() => new Set());
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const periodsByYearId = useMemo(() => {
    const map = new Map();
    for (const period of periods) {
      if (!map.has(period.academicYearId)) map.set(period.academicYearId, []);
      map.get(period.academicYearId).push(period);
    }
    return map;
  }, [periods]);

  useEffect(() => {
    if (loading || academicYears.length === 0 || expandedYearIds.size > 0) return;
    const active = academicYears.find((year) => year.isActive);
    setExpandedYearIds(new Set([active?.id ?? academicYears[0].id]));
  }, [loading, academicYears, expandedYearIds.size]);

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

  const toggleYearExpanded = (yearId) => {
    setExpandedYearIds((prev) => {
      const next = new Set(prev);
      if (next.has(yearId)) next.delete(yearId);
      else next.add(yearId);
      return next;
    });
  };

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
      description: `"${item.label}" akan dihapus dari semua gelombang.`,
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

  const hasPeriods = periods.length > 0;

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat item persyaratan...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-900">Alur persyaratan keuangan</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Buat tahun pelajaran dan gelombang di tab Periode</li>
          <li>Tambahkan item persyaratan dengan frekuensi dan biaya per gelombang</li>
          <li>Buka tahun pelajaran → gelombang untuk melihat atau mengatur persyaratan</li>
        </ol>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={openCreate}
          disabled={!hasPeriods}
          className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
        >
          + Tambah item persyaratan
        </button>
      </div>

      {!hasPeriods ? (
        <div className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/80 p-8 text-center text-sm text-amber-900">
          Belum ada gelombang. Buat tahun pelajaran dan gelombang di tab Periode terlebih dahulu.
        </div>
      ) : academicYears.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-600">
          Belum ada tahun pelajaran.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-600">
          Belum ada item persyaratan. Klik &quot;Tambah item persyaratan&quot; untuk memulai.
        </div>
      ) : (
        <div className="grid gap-4">
          {academicYears.map((year) => (
            <PersyaratanYearAccordion
              key={year.id}
              year={year}
              periods={periodsByYearId.get(year.id) ?? []}
              items={items}
              expanded={expandedYearIds.has(year.id)}
              onToggle={() => toggleYearExpanded(year.id)}
              onEdit={openEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <FeeItemModal
        open={modalOpen}
        mode={modalMode}
        academicYears={academicYears}
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
