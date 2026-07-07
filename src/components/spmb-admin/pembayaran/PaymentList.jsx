"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FormMessage } from "@/components/admin/home/AdminFormFields.js";
import { AdminSelect } from "@/components/admin/home/AdminSelect.js";

const statusLabels = {
  pending: "Menunggu",
  paid: "Lunas",
  failed: "Gagal",
  manual_review: "Verifikasi manual",
};

const statusIndicators = {
  pending: "bg-slate-400",
  paid: "bg-emerald-500",
  failed: "bg-rose-500",
  manual_review: "bg-amber-500",
};

const statusOptions = Object.entries(statusLabels).map(([value, label]) => ({
  value,
  label,
  indicatorClassName: statusIndicators[value],
}));

const filterOptions = [
  { value: "all", label: "Semua status", indicatorClassName: "bg-slate-300" },
  ...statusOptions,
];

const categoryOptions = [
  { value: "all", label: "Semua kategori", indicatorClassName: "bg-slate-300" },
  { value: "registration", label: "Pendaftaran", indicatorClassName: "bg-blue-400" },
  { value: "wave_fee", label: "Gelombang", indicatorClassName: "bg-violet-400" },
];

const methodLabels = {
  manual: "Transfer manual",
  midtrans: "Midtrans",
  cash: "Tunai",
};

const statusTone = {
  paid: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  failed: "bg-rose-50 text-rose-800 ring-rose-200",
  manual_review: "bg-amber-50 text-amber-800 ring-amber-200",
  pending: "bg-slate-100 text-slate-700 ring-slate-200",
};

function formatRupiah(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
        statusTone[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}

function StatusSelectField({ value, disabled, loading, onChange, className = "" }) {
  return (
    <div className={className}>
      <AdminSelect
        value={value}
        options={statusOptions}
        onChange={onChange}
        disabled={disabled}
        loading={loading}
        size="sm"
        className="min-w-[10rem]"
      />
      {loading ? (
        <p className="mt-1 text-[11px] font-medium text-[var(--admin-primary)]">Menyimpan status...</p>
      ) : null}
    </div>
  );
}

function PaymentActionsSelect({ item, canManage, onProof, onDelete, disabled }) {
  const router = useRouter();

  const options = useMemo(() => {
    const opts = [{ value: "placeholder", label: "Aksi..." }];
    if (item.status === "paid") {
      opts.push({
        value: "invoice",
        label: item.invoiceNumber ? "Lihat invoice" : "Terbitkan invoice",
      });
    }
    if (canManage && item.proofUrl) {
      opts.push({ value: "proof", label: "Lihat bukti" });
    }
    opts.push({ value: "delete", label: "Hapus pembayaran" });
    return opts;
  }, [item.status, item.invoiceNumber, item.proofUrl, canManage]);

  const handleChange = (value) => {
    if (value === "placeholder" || !value) return;

    if (value === "invoice") {
      router.push(`/spmb-admin/pembayaran/${item.id}/invoice`);
      return;
    }
    if (value === "proof") {
      onProof(item);
      return;
    }
    if (value === "delete") {
      onDelete(item);
    }
  };

  return (
    <AdminSelect
      value="placeholder"
      options={options}
      onChange={handleChange}
      disabled={disabled}
      size="sm"
      align="right"
      className="min-w-[9.5rem]"
      aria-label={`Aksi pembayaran ${item.applicant.name}`}
    />
  );
}

function ProofModal({ payment, onClose }) {
  if (!payment?.proofUrl) return null;
  const isImage = /\.(jpe?g|png|gif|webp)(\?|$)/i.test(payment.proofUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Tutup" />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Bukti pembayaran</h2>
            <p className="text-sm text-slate-500">{payment.applicant.name}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup">
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={payment.proofUrl} alt={`Bukti ${payment.applicant.name}`} className="mx-auto max-h-[60vh] rounded-xl border object-contain" />
          ) : (
            <div className="rounded-xl border bg-slate-50 p-6 text-center">
              <a href={payment.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl bg-[var(--admin-primary)] px-4 py-2 text-sm font-semibold text-white">
                Buka bukti
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ payment, onClose, onConfirm, deleting }) {
  if (!payment) return null;
  const clearsForm = payment.category === "registration";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-slate-900/50" onClick={onClose} aria-label="Tutup" />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900">Hapus pembayaran?</h2>
        <p className="mt-2 text-sm text-slate-600">
          Data pembayaran <strong>{payment.applicant.name}</strong> ({formatRupiah(payment.amount)}) akan
          dihapus permanen.
        </p>
        {clearsForm ? (
          <p className="mt-2 text-sm text-amber-800">
            Formulir pendaftaran terkait dan bukti fisik pembayaran juga akan dihapus.
          </p>
        ) : payment.proofUrl ? (
          <p className="mt-2 text-sm text-amber-800">Bukti fisik pembayaran juga akan dihapus.</p>
        ) : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} disabled={deleting} className="rounded-xl border px-4 py-2.5 text-sm font-medium">
            Batal
          </button>
          <button type="button" onClick={() => onConfirm(payment.id)} disabled={deleting} className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white">
            {deleting ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Pagination({ pagination, onPageChange, loading }) {
  const { page, totalPages, total } = pagination;
  if (total === 0) return null;
  const pages = [];
  for (let i = Math.max(1, page - 2); i <= Math.min(totalPages, page + 2); i += 1) pages.push(i);

  return (
    <div className="mt-auto flex shrink-0 flex-col gap-3 px-1 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Halaman {page} dari {totalPages} · {total} pembayaran
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button type="button" disabled={loading || page <= 1} onClick={() => onPageChange(page - 1)} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">
          Sebelumnya
        </button>
        {pages.map((p) => (
          <button key={p} type="button" disabled={loading} onClick={() => onPageChange(p)} className={`min-w-9 rounded-lg px-3 py-1.5 text-sm font-medium ${p === page ? "bg-[var(--admin-primary)] text-white" : "border"}`}>
            {p}
          </button>
        ))}
        <button type="button" disabled={loading || page >= totalPages} onClick={() => onPageChange(page + 1)} className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-40">
          Berikutnya
        </button>
      </div>
    </div>
  );
}

function waveStatusTone(enrollmentStatus, isFullyPaid) {
  if (enrollmentStatus === "enrolled") {
    return "bg-emerald-50 text-emerald-800 ring-emerald-200";
  }
  if (enrollmentStatus === "late" || (isFullyPaid && enrollmentStatus !== "installment")) {
    return "bg-amber-50 text-amber-800 ring-amber-200";
  }
  return "bg-blue-50 text-blue-800 ring-blue-200";
}

function WaveApplicantsPanel({ applicants, activePeriod }) {
  if (!activePeriod) {
    return (
      <div className="rounded-2xl border bg-amber-50 p-6 text-center text-sm text-amber-900">
        Tidak ada periode SPMB aktif.
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      <div className="px-1 py-4">
        <h2 className="text-lg font-semibold text-slate-900">Pembayaran Gelombang Aktif</h2>
        <p className="mt-1 text-sm text-slate-600">
          {activePeriod.name} · {activePeriod.academicYear} — pendaftar yang sudah bayar (cicil/lunas)
        </p>
      </div>
      {applicants.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-500">Belum ada pendaftar yang membayar biaya gelombang aktif.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Pendaftar</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Pembayaran</th>
              </tr>
            </thead>
            <tbody>
              {applicants.map((row) => (
                <tr key={row.applicationId} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{row.applicant.name}</p>
                    <p className="text-xs text-slate-500">{row.applicant.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {formatRupiah(row.waveProgress.paidAmount)} / {formatRupiah(row.waveProgress.totalAmount)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {row.waveProgress.paidCount} dari {row.waveProgress.totalCount} item
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${waveStatusTone(row.waveProgress.enrollmentStatus, row.waveProgress.isFullyPaid)}`}>
                      {row.waveProgress.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="space-y-1">
                      {row.payments.map((payment) => (
                        <div key={payment.id} className="flex items-center gap-2 text-xs text-slate-600">
                          <span>{formatRupiah(payment.amount)}</span>
                          <span>·</span>
                          <span>{payment.methodLabel}</span>
                          <Link href={`/spmb-admin/pembayaran/${payment.id}/invoice`} className="font-medium text-[var(--admin-primary)] hover:underline">
                            Invoice
                          </Link>
                        </div>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PaymentList({
  initialItems = [],
  initialPagination = { page: 1, limit: 10, total: 0, totalPages: 1 },
  initialActivePeriod = null,
  initialSettings = { midtransEnabled: false, manualEnabled: true },
}) {
  const [items, setItems] = useState(initialItems);
  const [pagination, setPagination] = useState(initialPagination);
  const [activePeriod, setActivePeriod] = useState(initialActivePeriod);
  const [settings, setSettings] = useState(initialSettings);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [viewMode, setViewMode] = useState("payments");
  const [waveApplicants, setWaveApplicants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [pendingStatusById, setPendingStatusById] = useState({});
  const [deletingId, setDeletingId] = useState(null);
  const [proofPayment, setProofPayment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const manualManagementEnabled = !settings.midtransEnabled;

  const fetchPayments = useCallback(async (page = 1, status = statusFilter, category = categoryFilter) => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(pagination.limit) });
      if (status !== "all") params.set("status", status);
      if (category !== "all") params.set("category", category);

      const res = await fetch(`/api/spmb-admin/payments?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat pembayaran");

      setItems(data.items);
      setPagination(data.pagination);
      setActivePeriod(data.activePeriod);
      setSettings(data.settings);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, statusFilter, categoryFilter]);

  const fetchWaveApplicants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/spmb-admin/payments?view=wave_applicants");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat data gelombang");
      setWaveApplicants(data.applicants ?? []);
      setActivePeriod(data.activePeriod ?? activePeriod);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, [activePeriod]);

  useEffect(() => {
    if (viewMode === "wave_applicants") fetchWaveApplicants();
  }, [viewMode, fetchWaveApplicants]);

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    setPendingStatusById((prev) => ({ ...prev, [id]: status }));
    setMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/payments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui status");
      setItems((prev) => prev.map((item) => (item.id === id ? data.payment : item)));
      setMessage({ type: "success", text: data.message ?? "Status diperbarui" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUpdatingId(null);
      setPendingStatusById((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/spmb-admin/payments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus pembayaran");
      setDeleteTarget(null);
      setMessage({ type: "success", text: data.message ?? "Pembayaran dihapus" });
      await fetchPayments(pagination.page, statusFilter, categoryFilter);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex min-h-[calc(100dvh-var(--admin-header-height)-2rem)] flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pembayaran</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pembayaran periode SPMB aktif: pendaftaran formulir dan biaya gelombang (cicil/lunas).
        </p>
      </div>

      {activePeriod ? (
        <div className="rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm text-violet-900">
          Periode aktif: <strong>{activePeriod.name}</strong> · {activePeriod.academicYear}
        </div>
      ) : (
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Tidak ada gelombang aktif. Aktifkan tahun pelajaran dan gelombang di Pengaturan → Periode SPMB.
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setViewMode("payments")} className={`rounded-xl px-4 py-2 text-sm font-medium ${viewMode === "payments" ? "bg-[var(--admin-primary)] text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
            Semua Transaksi
          </button>
          <button type="button" onClick={() => setViewMode("wave_applicants")} className={`rounded-xl px-4 py-2 text-sm font-medium ${viewMode === "wave_applicants" ? "bg-[var(--admin-primary)] text-white" : "border border-slate-200 bg-white text-slate-700"}`}>
            Pembayar Gelombang Aktif
          </button>
        </div>

        {viewMode === "payments" ? (
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <AdminSelect value={statusFilter} options={filterOptions} onChange={(value) => { setStatusFilter(value); fetchPayments(1, value, categoryFilter); }} className="sm:w-56" disabled={loading} size="md" />
            <AdminSelect value={categoryFilter} options={categoryOptions} onChange={(value) => { setCategoryFilter(value); fetchPayments(1, statusFilter, value); }} className="sm:w-56" disabled={loading} size="md" />
            {loading ? <p className="text-sm text-slate-500">Memuat...</p> : null}
          </div>
        ) : null}
      </div>

      {message ? <FormMessage message={message} /> : null}

      {viewMode === "wave_applicants" ? (
        <WaveApplicantsPanel applicants={waveApplicants} activePeriod={activePeriod} />
      ) : (
        <>
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead>
                  <tr className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Pendaftar</th>
                    <th className="px-4 py-3">Kategori</th>
                    <th className="px-4 py-3">Nominal</th>
                    <th className="px-4 py-3">Metode</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Progress Gelombang</th>
                    <th className="px-4 py-3">Dibuat</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const canManage = manualManagementEnabled && (item.method === "manual" || item.method === "cash");
                    const displayStatus = pendingStatusById[item.id] ?? item.status;
                    const isUpdating = updatingId === item.id;

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50/80 ${isUpdating ? "bg-amber-50/40" : ""}`}>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-900">{item.applicant.name}</p>
                          <p className="text-xs text-slate-500">{item.applicant.email}</p>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{item.categoryLabel}</td>
                        <td className="px-4 py-3 font-medium">{formatRupiah(item.amount)}</td>
                        <td className="px-4 py-3 text-slate-600">{item.methodLabel}</td>
                        <td className="px-4 py-3">
                          {canManage ? (
                            <StatusSelectField value={displayStatus} loading={isUpdating} onChange={(next) => handleStatusChange(item.id, next)} />
                          ) : (
                            <StatusBadge status={item.status} />
                          )}
                        </td>
                        <td className="px-4 py-3 text-xs text-slate-600">
                          {item.waveProgress ? (
                            <>
                              {formatRupiah(item.waveProgress.paidAmount)} / {formatRupiah(item.waveProgress.totalAmount)}
                              <br />
                              {item.waveProgress.enrollmentStatusLabel ??
                                (item.waveProgress.isFullyPaid ? "Lunas" : "Cicilan")}
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{item.createdAt ?? "—"}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end">
                            <PaymentActionsSelect
                              item={item}
                              canManage={canManage}
                              onProof={setProofPayment}
                              onDelete={setDeleteTarget}
                              disabled={loading || isUpdating || Boolean(deletingId)}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {items.length === 0 ? (
              <p className="p-8 text-center text-sm text-slate-500">
                {loading ? "Memuat data..." : "Belum ada data pembayaran untuk periode aktif."}
              </p>
            ) : null}

            <Pagination pagination={pagination} onPageChange={(page) => fetchPayments(page, statusFilter, categoryFilter)} loading={loading} />
          </div>
        </>
      )}

      <ProofModal payment={proofPayment} onClose={() => setProofPayment(null)} />
      <DeleteConfirmModal payment={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} deleting={Boolean(deletingId)} />
    </div>
  );
}
