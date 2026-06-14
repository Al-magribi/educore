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
  paragraphs: [""],
  highlights: [{ label: "", value: "" }],
};

export function ProfileTab() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    fetch("/api/admin/about")
      .then((r) => r.json())
      .then((data) => {
        if (data.about?.profile) {
          const profile = data.about.profile;
          setForm({
            title: profile.title ?? "",
            paragraphs: profile.paragraphs?.length ? profile.paragraphs : [""],
            highlights: profile.highlights?.length
              ? profile.highlights
              : [{ label: "", value: "" }],
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setParagraph = (index, value) => {
    setForm((f) => {
      const paragraphs = [...f.paragraphs];
      paragraphs[index] = value;
      return { ...f, paragraphs };
    });
  };

  const addParagraph = () => {
    setForm((f) => ({ ...f, paragraphs: [...f.paragraphs, ""] }));
  };

  const removeParagraph = async (index) => {
    const ok = await confirmDelete({
      title: "Hapus paragraf",
      description: `Paragraf ${index + 1} akan dihapus dari profil sekolah.`,
    });
    if (!ok) return;
    setForm((f) => ({
      ...f,
      paragraphs: f.paragraphs.filter((_, i) => i !== index),
    }));
  };

  const setHighlight = (index, key, value) => {
    setForm((f) => {
      const highlights = [...f.highlights];
      highlights[index] = { ...highlights[index], [key]: value };
      return { ...f, highlights };
    });
  };

  const addHighlight = () => {
    setForm((f) => ({
      ...f,
      highlights: [...f.highlights, { label: "", value: "" }],
    }));
  };

  const removeHighlight = async (index) => {
    const item = form.highlights[index];
    const label = item?.label?.trim() || item?.value?.trim() || `Highlight ${index + 1}`;
    const ok = await confirmDelete({
      title: "Hapus highlight",
      description: `"${label}" akan dihapus dari daftar highlight profil.`,
    });
    if (!ok) return;
    setForm((f) => ({
      ...f,
      highlights: f.highlights.filter((_, i) => i !== index),
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
          scope: "profile",
          profile: {
            title: form.title,
            paragraphs: form.paragraphs.map((p) => p.trim()).filter(Boolean),
            highlights: form.highlights
              .map((h) => ({ label: h.label.trim(), value: h.value.trim() }))
              .filter((h) => h.label || h.value),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.about?.profile) {
        const profile = data.about.profile;
        setForm({
          title: profile.title ?? "",
          paragraphs: profile.paragraphs?.length ? profile.paragraphs : [""],
          highlights: profile.highlights?.length
            ? profile.highlights
            : [{ label: "", value: "" }],
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

      <Field label="Judul Section Profil">
        <TextInput value={form.title} onChange={set("title")} required />
      </Field>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">Paragraf Profil</p>
          <button
            type="button"
            onClick={addParagraph}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Tambah paragraf
          </button>
        </div>
        {form.paragraphs.map((paragraph, index) => (
          <div key={index} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Paragraf {index + 1}
              </span>
              {form.paragraphs.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeParagraph(index)}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700"
                >
                  Hapus
                </button>
              ) : null}
            </div>
            <TextArea
              value={paragraph}
              onChange={(e) => setParagraph(index, e.target.value)}
              rows={4}
            />
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700">Highlight Profil</p>
          <button
            type="button"
            onClick={addHighlight}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Tambah highlight
          </button>
        </div>
        {form.highlights.map((item, index) => (
          <div key={index} className="rounded-xl border border-slate-200 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Highlight {index + 1}
              </span>
              {form.highlights.length > 1 ? (
                <button
                  type="button"
                  onClick={() => removeHighlight(index)}
                  className="text-sm font-medium text-rose-600 hover:text-rose-700"
                >
                  Hapus
                </button>
              ) : null}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Label">
                <TextInput
                  value={item.label}
                  onChange={(e) => setHighlight(index, "label", e.target.value)}
                />
              </Field>
              <Field label="Nilai">
                <TextInput
                  value={item.value}
                  onChange={(e) => setHighlight(index, "value", e.target.value)}
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
