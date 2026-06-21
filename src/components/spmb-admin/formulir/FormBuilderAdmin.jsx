"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useConfirmDelete } from "@/components/admin/home/ConfirmDeleteModal.js";
import { FormMessage } from "@/components/admin/home/AdminFormFields.js";
import { createBlankFormDraft } from "./form-constants.js";
import { FormBuilderEditor } from "./FormBuilderEditor.jsx";
import { FormPreviewModal } from "./FormPreviewModal.jsx";

function formatListDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
        active
          ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
          : "bg-slate-100 text-slate-600 ring-slate-200"
      }`}
    >
      {active ? "Aktif" : "Tidak aktif"}
    </span>
  );
}

export default function FormBuilderAdmin() {
  const [forms, setForms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [editorForm, setEditorForm] = useState(null);
  const [previewForm, setPreviewForm] = useState(null);
  const [activatingId, setActivatingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const activeForm = useMemo(() => forms.find((form) => form.isActive) ?? null, [forms]);

  const loadForms = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/spmb-admin/forms");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat formulir");
      setForms(data.forms ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForms();
  }, [loadForms]);

  const openCreate = () => {
    setEditorForm(createBlankFormDraft());
    setMessage(null);
  };

  const openEdit = async (formId) => {
    setMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/forms/${formId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memuat formulir");
      setEditorForm(data.form);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleActivate = async (form) => {
    if (form.isActive) return;

    setActivatingId(form.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/forms/${form.id}/activate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengaktifkan formulir");
      setMessage({ type: "success", text: data.message || "Formulir diaktifkan" });
      await loadForms();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async (form) => {
    const ok = await confirmDelete({
      title: "Hapus formulir?",
      description: `"${form.name}" akan dihapus permanen dari database.`,
    });
    if (!ok) return;

    setDeletingId(form.id);
    setMessage(null);
    try {
      const res = await fetch(`/api/spmb-admin/forms/${form.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus formulir");
      setMessage({ type: "success", text: data.message || "Formulir dihapus" });
      await loadForms();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setDeletingId(null);
    }
  };

  const handleEditorSaved = async () => {
    setEditorForm(null);
    setMessage({ type: "success", text: "Formulir berhasil disimpan" });
    await loadForms();
  };

  if (editorForm) {
    return (
      <FormBuilderEditor
        form={editorForm}
        onCancel={() => setEditorForm(null)}
        onSaved={handleEditorSaved}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Formulir Pendaftaran</h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola formulir pendaftaran calon siswa. Hanya satu formulir yang aktif pada satu waktu.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-md transition"
          style={{
            background: "var(--admin-primary)",
            boxShadow: "0 4px 14px color-mix(in srgb, var(--admin-primary) 35%, transparent)",
          }}
        >
          Formulir Baru
        </button>
      </div>

      <FormMessage message={message} />

      {activeForm ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Formulir aktif
              </p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{activeForm.name}</p>
              <p className="mt-1 text-sm text-slate-600">
                {activeForm.groupCount} grup · {activeForm.fieldCount} field · Versi {activeForm.version}
              </p>
              {activeForm.periodName ? (
                <p className="mt-1 text-xs text-slate-500">
                  Periode: {activeForm.periodName} ({activeForm.academicYear})
                </p>
              ) : null}
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPreviewForm(activeForm)}
                className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-emerald-50"
              >
                Pratinjau
              </button>
              <button
                type="button"
                onClick={() => openEdit(activeForm.id)}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "var(--admin-primary)" }}
              >
                Edit
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          Belum ada formulir aktif. Buat formulir baru lalu aktifkan agar calon siswa dapat mengisi.
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-900">Semua formulir</h2>
          <p className="text-sm text-slate-500">{forms.length} formulir tersimpan</p>
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Memuat daftar formulir...</p>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-rose-600">{error}</p>
            <button
              type="button"
              onClick={loadForms}
              className="mt-3 text-sm font-medium text-[var(--admin-primary)] hover:underline"
            >
              Coba lagi
            </button>
          </div>
        ) : forms.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Belum ada formulir. Klik «Formulir Baru» untuk memulai.
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Isi</th>
                    <th className="px-4 py-3">Diperbarui</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {forms.map((form) => (
                    <tr key={form.id} className="hover:bg-slate-50/80">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{form.name}</p>
                        <p className="text-xs text-slate-500">Versi {form.version}</p>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge active={form.isActive} />
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {form.groupCount} grup · {form.fieldCount} field
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {formatListDate(form.updatedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewForm(form)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                          >
                            Pratinjau
                          </button>
                          <button
                            type="button"
                            onClick={() => openEdit(form.id)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-primary)] hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          {!form.isActive ? (
                            <button
                              type="button"
                              onClick={() => handleActivate(form)}
                              disabled={activatingId === form.id}
                              className="rounded-lg px-3 py-1.5 text-sm font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-60"
                            >
                              {activatingId === form.id ? "..." : "Aktifkan"}
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleDelete(form)}
                            disabled={deletingId === form.id}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                          >
                            {deletingId === form.id ? "..." : "Hapus"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {forms.map((form) => (
                <div key={form.id} className="px-4 py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">{form.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Versi {form.version} · {form.groupCount} grup · {form.fieldCount} field
                      </p>
                    </div>
                    <StatusBadge active={form.isActive} />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">{formatListDate(form.updatedAt)}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewForm(form)}
                      className="rounded-lg px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100"
                    >
                      Pratinjau
                    </button>
                    <button
                      type="button"
                      onClick={() => openEdit(form.id)}
                      className="rounded-lg px-3 py-1.5 text-sm text-[var(--admin-primary)] hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    {!form.isActive ? (
                      <button
                        type="button"
                        onClick={() => handleActivate(form)}
                        disabled={activatingId === form.id}
                        className="rounded-lg px-3 py-1.5 text-sm text-emerald-700 hover:bg-emerald-50"
                      >
                        Aktifkan
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => handleDelete(form)}
                      disabled={deletingId === form.id}
                      className="rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <FormPreviewModal
        open={Boolean(previewForm)}
        meta={{
          name: previewForm?.schema?.meta?.name || previewForm?.name || "",
          description: previewForm?.schema?.meta?.description || "",
        }}
        groups={previewForm?.schema?.groups ?? []}
        onClose={() => setPreviewForm(null)}
      />

      <ConfirmDeleteDialog />
    </div>
  );
}
