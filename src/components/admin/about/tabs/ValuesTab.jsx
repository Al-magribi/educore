"use client";

import { useEffect, useState } from "react";
import {
  Field,
  FormMessage,
  SaveButton,
  TextArea,
  TextInput,
} from "@/components/admin/home/AdminFormFields.js";
import { useConfirmDelete } from "@/components/admin/home/ConfirmDeleteModal.js";

const empty = {
  title: "",
  items: [{ id: "", title: "", description: "" }],
};

function newValueItem() {
  return {
    id: crypto.randomUUID(),
    title: "",
    description: "",
  };
}

export function ValuesTab() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    fetch("/api/admin/about")
      .then((r) => r.json())
      .then((data) => {
        if (data.about?.values) {
          const values = data.about.values;
          setForm({
            title: values.title ?? "",
            items: values.items?.length
              ? values.items.map((item) => ({
                  id: item.id ?? crypto.randomUUID(),
                  title: item.title ?? "",
                  description: item.description ?? "",
                }))
              : [newValueItem()],
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setItem = (index, key, value) => {
    setForm((f) => {
      const items = [...f.items];
      items[index] = { ...items[index], [key]: value };
      return { ...f, items };
    });
  };

  const addItem = () => {
    setForm((f) => ({ ...f, items: [...f.items, newValueItem()] }));
  };

  const removeItem = async (index) => {
    const item = form.items[index];
    const label = item?.title?.trim() || `Nilai ${index + 1}`;
    const ok = await confirmDelete({
      title: "Hapus nilai",
      description: `"${label}" akan dihapus dari daftar nilai-nilai utama.`,
    });
    if (!ok) return;
    setForm((f) => ({
      ...f,
      items: f.items.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "values",
          values: {
            title: form.title,
            items: form.items
              .map((item) => ({
                id: item.id || crypto.randomUUID(),
                title: item.title.trim(),
                description: item.description.trim(),
              }))
              .filter((item) => item.title || item.description),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.about?.values) {
        const values = data.about.values;
        setForm({
          title: values.title ?? "",
          items: values.items?.length
            ? values.items.map((item) => ({
                id: item.id ?? crypto.randomUUID(),
                title: item.title ?? "",
                description: item.description ?? "",
              }))
            : [newValueItem()],
        });
      }
      setMessage({ type: "success", text: data.message });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat data...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormMessage message={message} />

      <Field label="Judul Section Nilai-Nilai">
        <TextInput value={form.title} onChange={set("title")} required />
      </Field>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">Daftar Nilai</p>
          <button
            type="button"
            onClick={addItem}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Tambah nilai
          </button>
        </div>
        {form.items.map((item, index) => (
          <div key={item.id || index} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Nilai {index + 1}
              </span>
              {form.items.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700"
                >
                  Hapus
                </button>
              ) : null}
            </div>
            <div className="space-y-3">
              <Field label="Judul Nilai">
                <TextInput
                  value={item.title}
                  onChange={(e) => setItem(index, "title", e.target.value)}
                />
              </Field>
              <Field label="Deskripsi">
                <TextArea
                  value={item.description}
                  onChange={(e) => setItem(index, "description", e.target.value)}
                  rows={3}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>

      <SaveButton saving={saving} />
      <ConfirmDeleteDialog />
    </form>
  );
}
