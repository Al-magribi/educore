"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { SelectInput, FormMessage } from "@/components/admin/home/AdminFormFields.js";
import { DetailPanel } from "./DetailPanel.jsx";
import { ManualRegistrationWizard } from "./ManualRegistrationWizard.jsx";
import { StatusBadge } from "./StatusBadge.jsx";
import { getFormEditLabel, statusLabels } from "./constants.js";

export default function PendaftaranAdmin({ initialApplicants = [] }) {
  const [applicants, setApplicants] = useState(initialApplicants);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [message, setMessage] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [resettingId, setResettingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [wizardOpen, setWizardOpen] = useState(false);

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

  const handleReset = async (id) => {
    setResettingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mereset status");

      const updated = data.application;
      setApplicants((prev) => prev.map((a) => (a.id === id ? updated : a)));
      setSelected((prev) => (prev?.id === id ? updated : prev));
      setMessage({ type: "success", text: data.message ?? "Status direset ke diajukan" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setResettingId(null);
    }
  };

  const handleManualCreated = (application) => {
    setApplicants((prev) => [application, ...prev]);
    setMessage({ type: "success", text: "Pendaftaran manual berhasil dibuat." });
  };

  const handleDelete = async (id) => {
    setDeletingId(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/applications/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus pendaftaran");

      setApplicants((prev) => prev.filter((a) => a.id !== id));
      setSelected((prev) => (prev?.id === id ? null : prev));
      setMessage({ type: "success", text: data.message ?? "Pendaftaran dihapus" });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Pendaftaran</h1>
          <p className="mt-1 text-sm text-slate-600">
            Review berkas calon siswa, buat pendaftaran manual, dan pantau proses seleksi.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setWizardOpen(true)}
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[var(--admin-primary)] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
        >
          + Buat pendaftaran
        </button>
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
          <table className="w-full min-w-[800px] text-left text-sm">
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
                    <div className="flex justify-end gap-2">
                      <Link
                        href={`/spmb-admin/pendaftaran/${item.id}/formulir`}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50"
                      >
                        {getFormEditLabel(item.status)}
                      </Link>
                      <button
                        type="button"
                        onClick={() => setSelected(item)}
                        className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-primary)] hover:bg-slate-100"
                      >
                        Detail
                      </button>
                    </div>
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
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href={`/spmb-admin/pendaftaran/${item.id}/formulir`}
                  className="text-sm font-medium text-emerald-700"
                >
                  {getFormEditLabel(item.status)}
                </Link>
                <button
                  type="button"
                  onClick={() => setSelected(item)}
                  className="text-sm font-medium text-[var(--admin-primary)]"
                >
                  Lihat detail
                </button>
              </div>
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
        onReset={handleReset}
        onDelete={handleDelete}
        updating={updatingId === selected?.id}
        resetting={resettingId === selected?.id}
        deleting={deletingId === selected?.id}
      />

      <ManualRegistrationWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onCreated={handleManualCreated}
      />
    </div>
  );
}
