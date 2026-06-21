"use client";

import { useCallback, useState } from "react";
import { FormMessage, SelectInput } from "@/components/admin/home/AdminFormFields.js";

const statusLabels = {
  pending: "Menunggu",
  paid: "Lunas",
  failed: "Gagal",
  manual_review: "Verifikasi manual",
};

const methodLabels = {
  manual: "Transfer manual",
  midtrans: "Midtrans",
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

function ProofModal({ payment, onClose }) {
  if (!payment?.proofUrl) return null;

  const isImage = /\.(jpe?g|png|gif|webp)(\?|$)/i.test(payment.proofUrl);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Tutup"
      />
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Bukti pembayaran</h2>
            <p className="text-sm text-slate-500">{payment.applicant.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Tutup"
          >
            ✕
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-5">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={payment.proofUrl}
              alt={`Bukti pembayaran ${payment.applicant.name}`}
              className="mx-auto max-h-[60vh] rounded-xl border border-slate-200 object-contain"
            />
          ) : (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-center">
              <p className="text-sm text-slate-600">Bukti tersedia sebagai file.</p>
              <a
                href={payment.proofUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex rounded-xl bg-[var(--admin-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        onClick={onClose}
        aria-label="Tutup"
      />
      <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <h2 className="text-lg font-semibold text-slate-900">Hapus pembayaran?</h2>
        <p className="mt-2 text-sm text-slate-600">
          Data pembayaran <strong>{payment.applicant.name}</strong> (
          {formatRupiah(payment.amount)}) akan dihapus permanen.
        </p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(payment.id)}
            disabled={deleting}
            className="rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:opacity-60"
          >
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
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i += 1) pages.push(i);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-slate-500">
        Halaman {page} dari {totalPages} · {total} pembayaran
      </p>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Sebelumnya
        </button>
        {pages.map((p) => (
          <button
            key={p}
            type="button"
            disabled={loading}
            onClick={() => onPageChange(p)}
            className={`min-w-9 rounded-lg px-3 py-1.5 text-sm font-medium ${
              p === page
                ? "bg-[var(--admin-primary)] text-white"
                : "border border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            {p}
          </button>
        ))}
        <button
          type="button"
          disabled={loading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
        >
          Berikutnya
        </button>
      </div>
    </div>
  );
}

export default function PaymentList({
  initialItems = [],
  initialPagination = { page: 1, limit: 10, total: 0, totalPages: 1 },
  initialSettings = { midtransEnabled: false, manualEnabled: true },
}) {
  const [items, setItems] = useState(initialItems);
  const [pagination, setPagination] = useState(initialPagination);
  const [settings, setSettings] = useState(initialSettings);
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [proofPayment, setProofPayment] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const manualManagementEnabled = !settings.midtransEnabled;

  const fetchPayments = useCallback(async (page = 1, status = statusFilter) => {
    setLoading(true);
    setMessage(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
      });
      if (status !== "all") params.set("status", status);

      const res = await fetch(`/api/spmb-admin/payments?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat pembayaran");

      setItems(data.items);
      setPagination(data.pagination);
      setSettings(data.settings);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setLoading(false);
    }
  }, [pagination.limit, statusFilter]);

  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    fetchPayments(1, value);
  };

  const handlePageChange = (page) => {
    fetchPayments(page, statusFilter);
  };

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
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
    }
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/payments/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus pembayaran");

      setDeleteTarget(null);
      setMessage({ type: "success", text: data.message ?? "Pembayaran dihapus" });
      await fetchPayments(pagination.page, statusFilter);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pembayaran</h1>
        <p className="mt-1 text-sm text-slate-600">
          Pantau pembayaran formulir SPMB terbaru, verifikasi bukti transfer, dan kelola status.
        </p>
      </div>

      {settings.midtransEnabled ? (
        <p className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Midtrans aktif — status pembayaran online diperbarui otomatis. Verifikasi manual hanya
          berlaku untuk metode transfer.
        </p>
      ) : (
        <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Mode manual — Anda dapat memverifikasi bukti transfer dan mengubah status pembayaran.
        </p>
      )}

      {message ? <FormMessage message={message} /> : null}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <SelectInput
          value={statusFilter}
          onChange={(e) => handleStatusFilterChange(e.target.value)}
          className="sm:w-52"
          disabled={loading}
        >
          <option value="all">Semua status</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectInput>
        {loading ? <p className="text-sm text-slate-500">Memuat...</p> : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[880px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Pendaftar</th>
                <th className="px-4 py-3">Nominal</th>
                <th className="px-4 py-3">Metode</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Dibuat</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map((item) => {
                const canManage =
                  manualManagementEnabled && item.method === "manual";
                const canViewProof = canManage && Boolean(item.proofUrl);

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{item.applicant.name}</p>
                      <p className="text-xs text-slate-500">{item.applicant.email}</p>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {formatRupiah(item.amount)}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {methodLabels[item.method] ?? item.method}
                    </td>
                    <td className="px-4 py-3">
                      {canManage ? (
                        <SelectInput
                          value={item.status}
                          disabled={updatingId === item.id}
                          onChange={(e) => handleStatusChange(item.id, e.target.value)}
                          className="min-w-[10rem] py-1.5 text-xs"
                        >
                          {Object.entries(statusLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </SelectInput>
                      ) : (
                        <StatusBadge status={item.status} />
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-500">{item.createdAt ?? "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {canViewProof ? (
                          <button
                            type="button"
                            onClick={() => setProofPayment(item)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-primary)] hover:bg-slate-100"
                          >
                            Bukti
                          </button>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(item)}
                          className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {items.map((item) => {
            const canManage = manualManagementEnabled && item.method === "manual";
            const canViewProof = canManage && Boolean(item.proofUrl);

            return (
              <div key={item.id} className="px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{item.applicant.name}</p>
                    <p className="text-sm text-slate-500">{item.applicant.email}</p>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
                <p className="mt-2 text-sm font-medium text-slate-900">
                  {formatRupiah(item.amount)}
                </p>
                <p className="text-xs text-slate-500">
                  {methodLabels[item.method] ?? item.method} · {item.createdAt ?? "—"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {canManage ? (
                    <SelectInput
                      value={item.status}
                      disabled={updatingId === item.id}
                      onChange={(e) => handleStatusChange(item.id, e.target.value)}
                      className="flex-1 py-1.5 text-xs"
                    >
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </SelectInput>
                  ) : null}
                  {canViewProof ? (
                    <button
                      type="button"
                      onClick={() => setProofPayment(item)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-primary)] hover:bg-slate-100"
                    >
                      Bukti
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(item)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {loading ? "Memuat data..." : "Belum ada data pembayaran."}
          </p>
        ) : null}

        <Pagination pagination={pagination} onPageChange={handlePageChange} loading={loading} />
      </div>

      <ProofModal payment={proofPayment} onClose={() => setProofPayment(null)} />
      <DeleteConfirmModal
        payment={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={Boolean(deletingId)}
      />
    </div>
  );
}
