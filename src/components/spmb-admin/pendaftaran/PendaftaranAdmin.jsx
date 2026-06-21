"use client";

import { useMemo, useState } from "react";
import { SelectInput, FormMessage } from "@/components/admin/home/AdminFormFields.js";

const statusLabels = {
  draft: "Draft",
  pending_payment: "Menunggu bayar",
  paid: "Sudah bayar",
  form_in_progress: "Mengisi form",
  submitted: "Diajukan",
  under_review: "Review",
  accepted: "Diterima",
  rejected: "Ditolak",
};

const statusTone = {
  accepted: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  rejected: "bg-rose-50 text-rose-800 ring-rose-200",
  pending_payment: "bg-amber-50 text-amber-800 ring-amber-200",
  submitted: "bg-blue-50 text-blue-800 ring-blue-200",
  under_review: "bg-violet-50 text-violet-800 ring-violet-200",
};

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

function DetailPanel({ applicant, onClose, onStatusChange, updating }) {
  if (!applicant) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={onClose} aria-label="Tutup" />
      <aside className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">Detail pendaftar</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Tutup panel"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          <p className="text-xl font-semibold text-slate-900">{applicant.name}</p>
          <p className="mt-1 text-sm text-slate-600">{applicant.email}</p>
          <p className="text-sm text-slate-600">{applicant.phone}</p>
          <div className="mt-4">
            <StatusBadge status={applicant.status} />
          </div>

          <dl className="mt-6 space-y-4 text-sm">
            <div>
              <dt className="text-slate-500">Asal sekolah</dt>
              <dd className="mt-0.5 font-medium text-slate-900">{applicant.school}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Tanggal ajuan</dt>
              <dd className="mt-0.5 font-medium text-slate-900">
                {applicant.submittedAt ?? "Belum diajukan"}
              </dd>
            </div>
          </dl>
        </div>
        <div className="flex flex-col gap-2 border-t border-slate-100 p-5 sm:flex-row">
          <button
            type="button"
            disabled={updating}
            onClick={() => onStatusChange(applicant.id, "accepted")}
            className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            Terima
          </button>
          <button
            type="button"
            disabled={updating}
            onClick={() => onStatusChange(applicant.id, "rejected")}
            className="flex-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-60"
          >
            Tolak
          </button>
        </div>
      </aside>
    </div>
  );
}

export default function PendaftaranAdmin({ initialApplicants = [] }) {
  const [applicants, setApplicants] = useState(initialApplicants);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return applicants.filter((item) => {
      if (statusFilter !== "all" && item.status !== statusFilter) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.email.toLowerCase().includes(q) ||
        item.school.toLowerCase().includes(q)
      );
    });
  }, [applicants, search, statusFilter]);

  const stats = useMemo(() => {
    return {
      total: applicants.length,
      review: applicants.filter((a) => ["submitted", "under_review"].includes(a.status)).length,
      accepted: applicants.filter((a) => a.status === "accepted").length,
    };
  }, [applicants]);

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui status");

      const updated = data.application;
      setApplicants((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setSelected((prev) => (prev?.id === id ? updated : prev));
      setMessage({ type: "success", text: data.message ?? "Status diperbarui" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pendaftaran</h1>
        <p className="mt-1 text-sm text-slate-600">
          Review berkas calon siswa, ubah status, dan pantau proses seleksi.
        </p>
      </div>

      {message ? <FormMessage message={message} /> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total pendaftar", value: stats.total },
          { label: "Perlu review", value: stats.review },
          { label: "Diterima", value: stats.accepted },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center">
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama, email, atau sekolah..."
          className="w-full flex-1 rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-ring)]"
        />
        <SelectInput
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="sm:w-52"
        >
          <option value="all">Semua status</option>
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectInput>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Calon siswa</th>
                <th className="px-4 py-3">Asal sekolah</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Diajukan</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{item.name}</p>
                    <p className="text-xs text-slate-500">{item.email}</p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.school}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={item.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-500">{item.submittedAt ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-primary)] hover:bg-slate-100"
                    >
                      Detail
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {filtered.map((item) => (
            <div key={item.id} className="px-4 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{item.name}</p>
                  <p className="text-sm text-slate-500">{item.school}</p>
                </div>
                <StatusBadge status={item.status} />
              </div>
              <button
                type="button"
                onClick={() => setSelected(item)}
                className="mt-3 text-sm font-medium text-[var(--admin-primary)]"
              >
                Lihat detail
              </button>
            </div>
          ))}
        </div>

        {filtered.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">Tidak ada pendaftar yang cocok.</p>
        ) : null}
      </div>

      <DetailPanel
        applicant={selected}
        onClose={() => setSelected(null)}
        onStatusChange={handleStatusChange}
        updating={updatingId === selected?.id}
      />
    </div>
  );
}
