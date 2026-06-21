"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirmDelete } from "@/components/admin/home/ConfirmDeleteModal.js";
import { GelombangStepForm } from "@/components/spmb-admin/pengaturan/GelombangStepForm.jsx";
import { ItemBiayaStep } from "@/components/spmb-admin/pengaturan/ItemBiayaStep.jsx";
import PersyaratanItemsTab from "@/components/spmb-admin/pengaturan/PersyaratanItemsTab.jsx";
import { formatRupiah } from "@/modules/spmb/period-fees.js";

const SUB_TABS = [
  { id: "periode", label: "Periode" },
  { id: "persyaratan", label: "Persyaratan" },
];

function formatDateRange(opensAt, closesAt) {
  const open = new Date(opensAt);
  const close = new Date(closesAt);
  if (Number.isNaN(open.getTime()) || Number.isNaN(close.getTime())) return "—";

  const fmt = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return `${fmt.format(open)} – ${fmt.format(close)}`;
}

function toDateInputValue(iso) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function buildGelombangForm(period) {
  if (!period) {
    return {
      academicYear: "2026/2027",
      name: "",
      opensAt: "",
      closesAt: "",
      isActive: false,
    };
  }

  return {
    academicYear: period.academicYear,
    name: period.name,
    opensAt: toDateInputValue(period.opensAt),
    closesAt: toDateInputValue(period.closesAt),
    isActive: period.isActive,
  };
}

function GelombangCard({ period, onEdit, onActivate, onDelete, onViewFees, deleting }) {
  const itemCount = period.financialFees?.items?.length ?? 0;

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-semibold text-slate-900">{period.name}</h4>
            {period.isActive ? (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                Aktif
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                Nonaktif
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-slate-600">{formatDateRange(period.opensAt, period.closesAt)}</p>
          <p className="mt-2 text-sm font-medium text-primary">
            Total biaya masuk: {formatRupiah(period.financialFees?.total ?? 0)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {itemCount} item persyaratan · {period.applicationCount} pendaftar
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!period.isActive ? (
            <button
              type="button"
              onClick={() => onActivate(period.id)}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Aktifkan gelombang
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => onEdit(period)}
            className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            Edit periode
          </button>
          <button
            type="button"
            onClick={() => onViewFees(period)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Lihat rincian biaya
          </button>
          <button
            type="button"
            onClick={() => onDelete(period)}
            disabled={deleting}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            {deleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </article>
  );
}

function PeriodeListPanel({
  periods,
  loading,
  message,
  onMessage,
  onPeriodsChange,
}) {
  const [formMode, setFormMode] = useState(null);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [gelombangForm, setGelombangForm] = useState(() => buildGelombangForm(null));
  const [saving, setSaving] = useState(false);
  const [viewingPeriod, setViewingPeriod] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const groupedPeriods = useMemo(() => {
    const groups = new Map();
    for (const period of periods) {
      const key = period.academicYear;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(period);
    }
    return [...groups.entries()];
  }, [periods]);

  const openCreate = () => {
    setFormMode("create");
    setEditingPeriod(null);
    setGelombangForm(buildGelombangForm(null));
    setViewingPeriod(null);
  };

  const openEdit = (period) => {
    setFormMode("edit");
    setEditingPeriod(period);
    setGelombangForm(buildGelombangForm(period));
    setViewingPeriod(null);
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingPeriod(null);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    onMessage(null);
    try {
      const isCreate = formMode === "create";
      const res = await fetch(
        isCreate ? "/api/spmb-admin/periods" : `/api/spmb-admin/periods/${editingPeriod.id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(gelombangForm),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan periode");

      onMessage({ type: "success", text: data.message || "Periode disimpan" });
      closeForm();
      await onPeriodsChange();
    } catch (err) {
      onMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id) => {
    onMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/periods/${id}/activate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengaktifkan gelombang");
      onMessage({ type: "success", text: data.message });
      await onPeriodsChange();
    } catch (err) {
      onMessage({ type: "error", text: err.message });
    }
  };

  const handleDelete = async (period) => {
    const applicantNote =
      period.applicationCount > 0
        ? ` Gelombang ini memiliki ${period.applicationCount} pendaftar terhubung dan tidak dapat dihapus.`
        : " Semua data gelombang akan dihapus permanen.";

    const ok = await confirmDelete({
      title: `Hapus ${period.name}?`,
      description: `${period.name} (${period.academicYear}).${applicantNote}`,
    });
    if (!ok) return;

    onMessage(null);
    setDeletingId(period.id);
    try {
      const res = await fetch(`/api/spmb-admin/periods/${period.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus gelombang");
      onMessage({ type: "success", text: data.message });
      if (editingPeriod?.id === period.id) closeForm();
      if (viewingPeriod?.id === period.id) setViewingPeriod(null);
      await onPeriodsChange();
    } catch (err) {
      onMessage({ type: "error", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat periode SPMB...</p>;
  }

  return (
    <div className="space-y-6">
      {message ? (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm font-medium text-slate-900">Alur pengaturan periode</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-slate-600">
          <li>Buat gelombang — tentukan jadwal dan status aktif</li>
          <li>Lanjut ke tab Persyaratan untuk menambahkan item biaya per gelombang</li>
        </ol>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          Setiap gelombang memiliki jadwal sendiri. Item biaya diatur di tab Persyaratan.
        </p>
        {!formMode ? (
          <button
            type="button"
            onClick={openCreate}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            + Buat gelombang baru
          </button>
        ) : (
          <button
            type="button"
            onClick={closeForm}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Tutup form
          </button>
        )}
      </div>

      {formMode ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
          <GelombangStepForm
            form={gelombangForm}
            onChange={setGelombangForm}
            onSubmit={handleSave}
            onCancel={closeForm}
            saving={saving}
            submitLabel={formMode === "create" ? "Buat gelombang" : "Simpan perubahan"}
          />
        </div>
      ) : null}

      {viewingPeriod ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                Rincian biaya — {viewingPeriod.name}
              </h3>
              <p className="text-sm text-slate-600">{viewingPeriod.academicYear}</p>
            </div>
            <button
              type="button"
              onClick={() => setViewingPeriod(null)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Tutup
            </button>
          </div>
          <ItemBiayaStep
            form={{
              title: "Persyaratan keuangan",
              note: "",
              items: viewingPeriod.financialFees?.items ?? [],
            }}
            onChange={() => {}}
            onSubmit={(e) => e.preventDefault()}
            readOnly
          />
        </div>
      ) : null}

      {groupedPeriods.length === 0 && !formMode ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-600">
          Belum ada gelombang. Klik &quot;Buat gelombang baru&quot; untuk memulai.
        </div>
      ) : (
        groupedPeriods.map(([academicYear, yearPeriods]) => (
          <section key={academicYear} className="space-y-3">
            <h3 className="text-base font-semibold text-slate-900">
              Tahun pelajaran {academicYear}
            </h3>
            <div className="grid gap-4">
              {yearPeriods.map((period) => (
                <GelombangCard
                  key={period.id}
                  period={period}
                  onEdit={openEdit}
                  onActivate={handleActivate}
                  onDelete={handleDelete}
                  onViewFees={setViewingPeriod}
                  deleting={deletingId === period.id}
                />
              ))}
            </div>
          </section>
        ))
      )}
      <ConfirmDeleteDialog />
    </div>
  );
}

export default function PeriodeSettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState("periode");
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spmb-admin/periods");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat periode");
      setPeriods(data.periods ?? []);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  return (
    <div className="space-y-6">
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1" role="tablist">
        {SUB_TABS.map((tab) => {
          const active = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveSubTab(tab.id)}
              className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-white text-primary shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeSubTab === "periode" ? (
        <PeriodeListPanel
          periods={periods}
          loading={loading}
          message={message}
          onMessage={setMessage}
          onPeriodsChange={loadPeriods}
        />
      ) : (
        <>
          {message ? (
            <div
              className={`rounded-lg px-4 py-3 text-sm ${
                message.type === "success"
                  ? "bg-emerald-50 text-emerald-800"
                  : "bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          ) : null}
          <PersyaratanItemsTab periods={periods} onMessage={setMessage} />
        </>
      )}
    </div>
  );
}
