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
  vision: { title: "Visi", content: "" },
  mission: { title: "Misi", items: [""] },
};

export function VisionMissionTab() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    fetch("/api/admin/about")
      .then((r) => r.json())
      .then((data) => {
        if (data.about) {
          setForm({
            vision: {
              title: data.about.vision?.title ?? "Visi",
              content: data.about.vision?.content ?? "",
            },
            mission: {
              title: data.about.mission?.title ?? "Misi",
              items: data.about.mission?.items?.length ? data.about.mission.items : [""],
            },
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const setVision = (key) => (e) =>
    setForm((f) => ({ ...f, vision: { ...f.vision, [key]: e.target.value } }));

  const setMission = (key) => (e) =>
    setForm((f) => ({ ...f, mission: { ...f.mission, [key]: e.target.value } }));

  const setMissionItem = (index, value) => {
    setForm((f) => {
      const items = [...f.mission.items];
      items[index] = value;
      return { ...f, mission: { ...f.mission, items } };
    });
  };

  const addMissionItem = () => {
    setForm((f) => ({
      ...f,
      mission: { ...f.mission, items: [...f.mission.items, ""] },
    }));
  };

  const removeMissionItem = async (index) => {
    const ok = await confirmDelete({
      title: "Hapus poin misi",
      description: `Poin misi ${index + 1} akan dihapus dari daftar.`,
    });
    if (!ok) return;
    setForm((f) => ({
      ...f,
      mission: {
        ...f.mission,
        items: f.mission.items.filter((_, i) => i !== index),
      },
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
          scope: "vision-mission",
          vision: form.vision,
          mission: {
            title: form.mission.title,
            items: form.mission.items.map((item) => item.trim()).filter(Boolean),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.about) {
        setForm({
          vision: {
            title: data.about.vision?.title ?? "Visi",
            content: data.about.vision?.content ?? "",
          },
          mission: {
            title: data.about.mission?.title ?? "Misi",
            items: data.about.mission?.items?.length ? data.about.mission.items : [""],
          },
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
    <form onSubmit={handleSubmit} className="space-y-8">
      <FormMessage message={message} />

      <div className="space-y-4 rounded-xl border border-slate-200 p-4">
        <h3 className="text-sm font-semibold text-slate-900">Visi</h3>
        <Field label="Judul Visi">
          <TextInput value={form.vision.title} onChange={setVision("title")} required />
        </Field>
        <Field label="Isi Visi">
          <TextArea value={form.vision.content} onChange={setVision("content")} rows={5} required />
        </Field>
      </div>

      <div className="space-y-4 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-900">Misi</h3>
          <button
            type="button"
            onClick={addMissionItem}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Tambah poin
          </button>
        </div>
        <Field label="Judul Misi">
          <TextInput value={form.mission.title} onChange={setMission("title")} required />
        </Field>
        {form.mission.items.map((item, index) => (
          <div key={index} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Poin {index + 1}
              </span>
              {form.mission.items.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeMissionItem(index)}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700"
                >
                  Hapus
                </button>
              ) : null}
            </div>
            <TextArea
              value={item}
              onChange={(e) => setMissionItem(index, e.target.value)}
              rows={3}
            />
          </div>
        ))}
      </div>

      <SaveButton saving={saving} />
      <ConfirmDeleteDialog />
    </form>
  );
}
