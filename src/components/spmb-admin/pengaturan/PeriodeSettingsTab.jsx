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
      name: "",
      opensAt: "",
      closesAt: "",
      isActive: false,
    };
  }

  return {
    name: period.name,
    opensAt: toDateInputValue(period.opensAt),
    closesAt: toDateInputValue(period.closesAt),
    isActive: period.isActive,
  };
}

function useModalLock(open, onClose, disabled = false) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape" && !disabled) onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, disabled, onClose]);
}

function ModalShell({ open, titleId, title, description, onClose, disabled, children, footer }) {
  useModalLock(open, onClose, disabled);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Tutup"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        onClick={disabled ? undefined : onClose}
        disabled={disabled}
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
            {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disabled}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer ? (
          <div className="shrink-0 border-t border-slate-100 bg-slate-50/60 px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>
  );
}

function GelombangModal({ open, mode, form, saving, onChange, onSubmit, onClose }) {
  const isCreate = mode === "create";
  const titleId = "gelombang-modal-title";

  return (
    <ModalShell
      open={open}
      titleId={titleId}
      title={isCreate ? "Buat gelombang baru" : "Edit gelombang"}
      description="Tentukan jadwal buka/tutup dan status aktif gelombang pendaftaran."
      onClose={onClose}
      disabled={saving}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
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
            form="gelombang-modal-form"
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : isCreate ? "Buat gelombang" : "Simpan perubahan"}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5">
        <GelombangStepForm
          form={form}
          onChange={onChange}
          onSubmit={onSubmit}
          saving={saving}
          embedded
          hideActions
          formId="gelombang-modal-form"
          submitLabel={isCreate ? "Buat gelombang" : "Simpan perubahan"}
        />
      </div>
    </ModalShell>
  );
}

function FeeDetailModal({ open, period, onClose }) {
  const titleId = "fee-detail-modal-title";

  if (!period) {
    return null;
  }

  return (
    <ModalShell
      open={open}
      titleId={titleId}
      title={`Rincian biaya — ${period.name}`}
      description={`${period.academicYear} · Total ${formatRupiah(period.financialFees?.total ?? 0)}`}
      onClose={onClose}
      footer={
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Tutup
          </button>
        </div>
      }
    >
      <div className="px-5 py-5">
        <ItemBiayaStep
          form={{
            title: "Persyaratan keuangan",
            note: "",
            items: period.financialFees?.items ?? [],
          }}
          onChange={() => {}}
          onSubmit={(e) => e.preventDefault()}
          periodName={period.name}
          readOnly
          embedded
          hideActions
          emptyMessage="Belum ada item persyaratan untuk gelombang ini. Atur di tab Persyaratan."
        />
      </div>
    </ModalShell>
  );
}

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

function GelombangCard({ period, onEdit, onActivate, onDelete, onViewFees, deleting, canActivate, nested = false }) {
  const itemCount = period.financialFees?.items?.length ?? 0;

  return (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${
        nested ? "border-slate-100 bg-slate-50/50" : ""
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-base font-semibold text-slate-900">{period.name}</h4>
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
          {!period.isActive && canActivate ? (
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
            Edit gelombang
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

function AcademicYearAccordionItem({
  year,
  periods,
  expanded,
  onToggle,
  onActivate,
  onDeactivate,
  onDelete,
  onEdit,
  onCreateGelombang,
  onEditGelombang,
  onActivateGelombang,
  onDeleteGelombang,
  onViewFees,
  deletingYear,
  deletingGelombangId,
}) {
  const panelId = `gelombang-panel-${year.id}`;
  const headerId = `periode-header-${year.id}`;

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-5">
        <button
          type="button"
          id={headerId}
          aria-expanded={expanded}
          aria-controls={panelId}
          onClick={onToggle}
          className="flex min-w-0 flex-1 items-start gap-3 text-left"
        >
          <ChevronIcon expanded={expanded} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-lg font-semibold text-slate-900">Tahun Pelajaran {year.academicYear}</h4>
              {year.isActive ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                  Aktif
                </span>
              ) : (
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                  Nonaktif
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-slate-600">
              {periods.length} gelombang pendaftaran
              {expanded ? "" : " · klik untuk melihat gelombang"}
            </p>
          </div>
        </button>
        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
          {year.isActive ? (
            <button
              type="button"
              onClick={() => onDeactivate(year.id)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Nonaktifkan
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onActivate(year.id)}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              Aktifkan
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(year)}
            className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(year)}
            disabled={deletingYear}
            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            {deletingYear ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>

      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        hidden={!expanded}
        className={expanded ? "border-t border-slate-100" : ""}
      >
        {expanded ? (
          <div className="space-y-4 bg-slate-50/40 px-5 py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-700">Gelombang pendaftaran</p>
              {year.isActive ? (
                <button
                  type="button"
                  onClick={() => onCreateGelombang(year)}
                  className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1d4ed8]"
                >
                  + Buat gelombang
                </button>
              ) : (
                <p className="text-xs text-amber-700">Aktifkan tahun pelajaran ini untuk menambah gelombang.</p>
              )}
            </div>

            {periods.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
                {year.isActive
                  ? "Belum ada gelombang. Klik \"Buat gelombang\" untuk memulai."
                  : "Belum ada gelombang pada tahun pelajaran ini."}
              </div>
            ) : (
              <div className="grid gap-3">
                {periods.map((period) => (
                  <GelombangCard
                    key={period.id}
                    period={period}
                    onEdit={onEditGelombang}
                    onActivate={onActivateGelombang}
                    onDelete={onDeleteGelombang}
                    onViewFees={onViewFees}
                    deleting={deletingGelombangId === period.id}
                    canActivate={year.isActive}
                    nested
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function AcademicYearModal({ open, mode, value, saving, onChange, onSubmit, onClose }) {
  const isCreate = mode === "create";
  const titleId = "academic-year-modal-title";

  return (
    <ModalShell
      open={open}
      titleId={titleId}
      title={isCreate ? "Buat tahun pelajaran" : "Edit tahun pelajaran"}
      description="Format tahun pelajaran seperti 2027/2028. Hanya satu tahun pelajaran yang boleh aktif."
      onClose={onClose}
      disabled={saving}
      footer={
        <div className="flex flex-wrap justify-end gap-3">
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
            form="academic-year-modal-form"
            disabled={saving}
            className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
          >
            {saving ? "Menyimpan..." : isCreate ? "Buat tahun pelajaran" : "Simpan perubahan"}
          </button>
        </div>
      }
    >
      <div className="px-5 py-5">
        <form id="academic-year-modal-form" onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Tahun pelajaran</span>
            <input
              type="text"
              required
              placeholder="2027/2028"
              value={value}
              onChange={(e) => onChange(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
        </form>
      </div>
    </ModalShell>
  );
}

function PeriodeListPanel({
  academicYears,
  periods,
  loading,
  message,
  onMessage,
  onPeriodsChange,
  onAcademicYearsChange,
}) {
  const [yearFormMode, setYearFormMode] = useState(null);
  const [yearFormOpen, setYearFormOpen] = useState(false);
  const [editingYear, setEditingYear] = useState(null);
  const [yearFormValue, setYearFormValue] = useState("2027/2028");
  const [yearSaving, setYearSaving] = useState(false);
  const [deletingYearId, setDeletingYearId] = useState(null);
  const [formMode, setFormMode] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPeriod, setEditingPeriod] = useState(null);
  const [gelombangForm, setGelombangForm] = useState(() => buildGelombangForm(null));
  const [saving, setSaving] = useState(false);
  const [viewingPeriod, setViewingPeriod] = useState(null);
  const [feeModalOpen, setFeeModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
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

  const toggleYearExpanded = (yearId) => {
    setExpandedYearIds((prev) => {
      const next = new Set(prev);
      if (next.has(yearId)) next.delete(yearId);
      else next.add(yearId);
      return next;
    });
  };

  const openCreate = (year) => {
    if (!year?.isActive) {
      onMessage({ type: "error", text: "Aktifkan tahun pelajaran terlebih dahulu sebelum membuat gelombang" });
      return;
    }
    setExpandedYearIds((prev) => new Set([...prev, year.id]));
    setFormMode("create");
    setEditingPeriod(null);
    setGelombangForm(buildGelombangForm(null));
    setFormOpen(true);
  };

  const openCreateYear = () => {
    setYearFormMode("create");
    setEditingYear(null);
    setYearFormValue("2027/2028");
    setYearFormOpen(true);
  };

  const openEditYear = (year) => {
    setYearFormMode("edit");
    setEditingYear(year);
    setYearFormValue(year.academicYear);
    setYearFormOpen(true);
  };

  const closeYearForm = () => {
    if (yearSaving) return;
    setYearFormOpen(false);
    setYearFormMode(null);
    setEditingYear(null);
  };

  const openEdit = (period) => {
    setExpandedYearIds((prev) => new Set([...prev, period.academicYearId]));
    setFormMode("edit");
    setEditingPeriod(period);
    setGelombangForm(buildGelombangForm(period));
    setFormOpen(true);
  };

  const openFeeDetail = (period) => {
    setViewingPeriod(period);
    setFeeModalOpen(true);
  };

  const closeForm = () => {
    if (saving) return;
    setFormOpen(false);
    setFormMode(null);
    setEditingPeriod(null);
  };

  const closeFeeDetail = () => {
    setFeeModalOpen(false);
    setViewingPeriod(null);
  };

  const handleSaveYear = async (e) => {
    e.preventDefault();
    setYearSaving(true);
    onMessage(null);
    try {
      const isCreate = yearFormMode === "create";
      const res = await fetch(
        isCreate ? "/api/spmb-admin/academic-years" : `/api/spmb-admin/academic-years/${editingYear.id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ academicYear: yearFormValue }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan tahun pelajaran");

      onMessage({ type: "success", text: data.message || "Tahun pelajaran disimpan" });
      setYearFormOpen(false);
      setYearFormMode(null);
      setEditingYear(null);
      await onAcademicYearsChange();
    } catch (err) {
      onMessage({ type: "error", text: err.message });
    } finally {
      setYearSaving(false);
    }
  };

  const handleActivateYear = async (id) => {
    onMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/academic-years/${id}/activate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengaktifkan tahun pelajaran");
      onMessage({ type: "success", text: data.message });
      setExpandedYearIds((prev) => new Set([...prev, id]));
      await Promise.all([onAcademicYearsChange(), onPeriodsChange()]);
    } catch (err) {
      onMessage({ type: "error", text: err.message });
    }
  };

  const handleDeactivateYear = async (id) => {
    onMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/academic-years/${id}/deactivate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menonaktifkan tahun pelajaran");
      onMessage({ type: "success", text: data.message });
      await Promise.all([onAcademicYearsChange(), onPeriodsChange()]);
    } catch (err) {
      onMessage({ type: "error", text: err.message });
    }
  };

  const handleDeleteYear = async (year) => {
    const ok = await confirmDelete({
      title: `Hapus tahun pelajaran ${year.academicYear}?`,
      description:
        year.periodCount > 0
          ? `Tahun pelajaran ini memiliki ${year.periodCount} gelombang. Semua gelombang tanpa pendaftar akan ikut terhapus.`
          : "Tahun pelajaran akan dihapus permanen.",
    });
    if (!ok) return;

    onMessage(null);
    setDeletingYearId(year.id);
    try {
      const res = await fetch(`/api/spmb-admin/academic-years/${year.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus tahun pelajaran");
      onMessage({ type: "success", text: data.message });
      if (editingYear?.id === year.id) closeYearForm();
      await Promise.all([onAcademicYearsChange(), onPeriodsChange()]);
    } catch (err) {
      onMessage({ type: "error", text: err.message });
    } finally {
      setDeletingYearId(null);
    }
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
      setFormOpen(false);
      setFormMode(null);
      setEditingPeriod(null);
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
      if (viewingPeriod?.id === period.id) closeFeeDetail();
      await onPeriodsChange();
    } catch (err) {
      onMessage({ type: "error", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat pengaturan periode SPMB...</p>;
  }

  return (
    <div className="space-y-8">
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
          <li>Buat dan aktifkan tahun pelajaran (hanya satu yang aktif)</li>
          <li>Buka tahun pelajaran, lalu buat gelombang pendaftaran di dalamnya</li>
          <li>Lanjut ke tab Persyaratan untuk menambahkan item biaya per gelombang</li>
        </ol>
      </div>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Periode Tahun Pelajaran</h3>
            <p className="mt-1 text-sm text-slate-600">
              Klik tahun pelajaran untuk membuka daftar gelombang. Hanya satu tahun pelajaran yang boleh aktif.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateYear}
            className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8]"
          >
            + Buat tahun pelajaran
          </button>
        </div>

        {academicYears.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-8 text-center text-sm text-slate-600">
            Belum ada tahun pelajaran. Buat tahun pelajaran terlebih dahulu.
          </div>
        ) : (
          <div className="grid gap-4">
            {academicYears.map((year) => (
              <AcademicYearAccordionItem
                key={year.id}
                year={year}
                periods={periodsByYearId.get(year.id) ?? []}
                expanded={expandedYearIds.has(year.id)}
                onToggle={() => toggleYearExpanded(year.id)}
                onActivate={handleActivateYear}
                onDeactivate={handleDeactivateYear}
                onDelete={handleDeleteYear}
                onEdit={openEditYear}
                onCreateGelombang={openCreate}
                onEditGelombang={openEdit}
                onActivateGelombang={handleActivate}
                onDeleteGelombang={handleDelete}
                onViewFees={openFeeDetail}
                deletingYear={deletingYearId === year.id}
                deletingGelombangId={deletingId}
              />
            ))}
          </div>
        )}
      </section>

      <AcademicYearModal
        open={yearFormOpen}
        mode={yearFormMode ?? "create"}
        value={yearFormValue}
        saving={yearSaving}
        onChange={setYearFormValue}
        onSubmit={handleSaveYear}
        onClose={closeYearForm}
      />
      <GelombangModal
        open={formOpen}
        mode={formMode ?? "create"}
        form={gelombangForm}
        saving={saving}
        onChange={setGelombangForm}
        onSubmit={handleSave}
        onClose={closeForm}
      />
      <FeeDetailModal open={feeModalOpen} period={viewingPeriod} onClose={closeFeeDetail} />
      <ConfirmDeleteDialog />
    </div>
  );
}

export default function PeriodeSettingsTab() {
  const [activeSubTab, setActiveSubTab] = useState("periode");
  const [academicYears, setAcademicYears] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  const loadAcademicYears = useCallback(async () => {
    try {
      const res = await fetch("/api/spmb-admin/academic-years");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat tahun pelajaran");
      setAcademicYears(data.academicYears ?? []);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }, []);

  const loadPeriods = useCallback(async () => {
    try {
      const res = await fetch("/api/spmb-admin/periods");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat periode");
      setPeriods(data.periods ?? []);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([loadAcademicYears(), loadPeriods()]);
    setLoading(false);
  }, [loadAcademicYears, loadPeriods]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  return (
    <div className="space-y-6">
      <div
        className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50/80"
        role="tablist"
        aria-label="Pengaturan periode SPMB"
      >
        <div className="-mb-px flex border-b border-slate-200">
          {SUB_TABS.map((tab) => {
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex-1 border-b-2 px-5 py-3.5 text-sm font-semibold transition sm:px-6 ${
                  active
                    ? "border-[var(--admin-primary)] bg-white text-[var(--admin-primary)] shadow-sm"
                    : "border-transparent text-slate-600 hover:border-slate-300 hover:bg-white/70 hover:text-slate-900"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {activeSubTab === "periode" ? (
        <PeriodeListPanel
          academicYears={academicYears}
          periods={periods}
          loading={loading}
          message={message}
          onMessage={setMessage}
          onPeriodsChange={loadPeriods}
          onAcademicYearsChange={loadAcademicYears}
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
          <PersyaratanItemsTab
            academicYears={academicYears}
            periods={periods}
            onMessage={setMessage}
          />
        </>
      )}
    </div>
  );
}
