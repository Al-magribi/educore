"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Field,
  FormMessage,
  SaveButton,
  TextInput,
} from "@/components/admin/home/AdminFormFields.js";
import { useConfirmDelete } from "@/components/admin/home/ConfirmDeleteModal.js";

const emptyForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
};

function formatListDate(iso) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function UserFormModal({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Tutup dialog"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Tutup"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-5">{children}</div>
      </div>
    </div>
  );
}

export default function SpmbUsersAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [forbidden, setForbidden] = useState(false);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const isEditing = Boolean(editingId);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setForbidden(false);
    try {
      const res = await fetch("/api/admin/spmb-users");
      const data = await res.json();
      if (res.status === 403) {
        setForbidden(true);
        return;
      }
      if (!res.ok) throw new Error(data.error || "Gagal memuat daftar akun");
      setUsers(data.users ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (user) =>
        user.name.toLowerCase().includes(q) ||
        user.email.toLowerCase().includes(q) ||
        (user.phone ?? "").toLowerCase().includes(q)
    );
  }, [users, search]);

  const setField = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
    setShowForm(true);
  };

  const openEdit = (user) => {
    setEditingId(user.id);
    setForm({
      name: user.name ?? "",
      email: user.email ?? "",
      phone: user.phone ?? "",
      password: "",
    });
    setMessage(null);
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
    };
    if (form.password.trim()) {
      payload.password = form.password;
    } else if (!isEditing) {
      setMessage({ type: "error", text: "Password wajib diisi untuk akun baru" });
      setSaving(false);
      return;
    }

    try {
      const url = isEditing ? `/api/admin/spmb-users/${editingId}` : "/api/admin/spmb-users";
      const method = isEditing ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan akun");

      if (isEditing) {
        setUsers((prev) => prev.map((u) => (u.id === data.user.id ? data.user : u)));
      } else {
        setUsers((prev) => [data.user, ...prev]);
      }

      closeForm();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user) => {
    const ok = await confirmDelete({
      title: "Hapus akun admin SPMB?",
      description: `Akun "${user.name}" (${user.email}) akan dihapus permanen.`,
    });
    if (!ok) return;

    setDeletingId(user.id);
    try {
      const res = await fetch(`/api/admin/spmb-users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus akun");
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
    } catch (err) {
      window.alert(err.message);
    } finally {
      setDeletingId(null);
    }
  };

  if (forbidden) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="text-xl font-bold">Akun SPMB</h1>
        <p className="mt-2 text-sm">
          Hanya super admin yang dapat membuat dan mengelola akun admin SPMB.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Akun SPMB</h1>
          <p className="mt-1 text-sm text-slate-600">
            Buat dan kelola akun admin yang mengakses panel SPMB.
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
          Akun Baru
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-4">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, email, atau telepon..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-ring)]"
          />
        </div>

        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Memuat daftar akun...</p>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-rose-600">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-3 text-sm font-medium text-[var(--admin-primary)] hover:underline"
            >
              Coba lagi
            </button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {users.length === 0
              ? "Belum ada akun admin SPMB. Klik «Akun Baru» untuk memulai."
              : "Tidak ada akun yang cocok dengan pencarian."}
          </p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    <th className="px-4 py-3">Nama</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Telepon</th>
                    <th className="px-4 py-3">Dibuat</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="transition hover:bg-slate-50/80">
                      <td className="px-4 py-3 font-medium text-slate-900">{user.name}</td>
                      <td className="px-4 py-3 text-slate-600">{user.email}</td>
                      <td className="px-4 py-3 text-slate-500">{user.phone || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {formatListDate(user.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(user)}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-primary)] hover:bg-slate-100"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(user)}
                            disabled={deletingId === user.id}
                            className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                          >
                            {deletingId === user.id ? "Menghapus..." : "Hapus"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="divide-y divide-slate-100 md:hidden">
              {filteredUsers.map((user) => (
                <div key={user.id} className="px-4 py-4">
                  <p className="font-medium text-slate-900">{user.name}</p>
                  <p className="mt-1 text-sm text-slate-600">{user.email}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {user.phone || "Tanpa telepon"} · {formatListDate(user.createdAt)}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(user)}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-primary)] hover:bg-slate-100"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      disabled={deletingId === user.id}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-60"
                    >
                      {deletingId === user.id ? "Menghapus..." : "Hapus"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <UserFormModal
        open={showForm}
        title={isEditing ? "Edit Akun SPMB" : "Akun Admin SPMB Baru"}
        onClose={closeForm}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <FormMessage message={message} />

          <Field label="Nama lengkap">
            <TextInput
              value={form.name}
              onChange={setField("name")}
              required
              placeholder="Admin SPMB"
            />
          </Field>

          <Field label="Email" hint="Digunakan untuk login ke panel SPMB.">
            <TextInput
              type="email"
              value={form.email}
              onChange={setField("email")}
              required
              placeholder="spmb@sekolah.sch.id"
            />
          </Field>

          <Field label="Telepon" hint="Opsional.">
            <TextInput
              type="tel"
              value={form.phone}
              onChange={setField("phone")}
              placeholder="08xxxxxxxxxx"
            />
          </Field>

          <Field
            label={isEditing ? "Password baru" : "Password"}
            hint={
              isEditing
                ? "Kosongkan jika tidak ingin mengubah password."
                : "Minimal 8 karakter."
            }
          >
            <TextInput
              type="password"
              value={form.password}
              onChange={setField("password")}
              required={!isEditing}
              minLength={isEditing && !form.password ? undefined : 8}
              autoComplete={isEditing ? "new-password" : "off"}
              placeholder={isEditing ? "Biarkan kosong untuk tidak mengubah" : "Minimal 8 karakter"}
            />
          </Field>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={closeForm}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Batal
            </button>
            <SaveButton saving={saving}>{isEditing ? "Simpan Perubahan" : "Buat Akun"}</SaveButton>
          </div>
        </form>
      </UserFormModal>

      <ConfirmDeleteDialog />
    </div>
  );
}
