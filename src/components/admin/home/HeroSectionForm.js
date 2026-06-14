"use client";

import { useState } from "react";
import {
  Field,
  FormMessage,
  SaveButton,
  TextArea,
  TextInput,
} from "./AdminFormFields.js";
import { SectionPublishToggle } from "./SectionPublishToggle.js";
import { ImageUploadField } from "./ImageUploadField.js";
import { useConfirmDelete } from "./ConfirmDeleteModal.js";
import { isAppUploadUrl } from "@/lib/storage/urls.js";

const emptyHero = {
  imageUrl: "",
  imageAlt: "",
  overlayOpacity: 0.72,
  badge: "",
  title: "",
  subtitle: "",
  ctaLabel: "",
  ctaHref: "",
  secondaryCtaLabel: "",
  secondaryCtaHref: "",
  stats: [],
};

function normalizeHero(content) {
  const c = content && typeof content === "object" ? content : {};
  return {
    ...emptyHero,
    ...c,
    imageUrl: c.imageUrl ?? "",
    stats: Array.isArray(c.stats) ? c.stats : [],
  };
}

export function HeroSectionForm({ section, onSaved }) {
  const [isPublished, setIsPublished] = useState(section?.isPublished ?? true);
  const [form, setForm] = useState(() => normalizeHero(section?.content));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  const set = (key) => (e) => {
    const value = e.target.type === "number" ? Number(e.target.value) : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const setStat = (index, key, value) => {
    setForm((f) => {
      const stats = [...f.stats];
      stats[index] = { ...stats[index], [key]: value };
      return { ...f, stats };
    });
  };

  const addStat = () => {
    setForm((f) => ({
      ...f,
      stats: [...f.stats, { label: "", value: "" }],
    }));
  };

  const removeStat = async (index) => {
    const stat = form.stats[index];
    const label = stat?.label?.trim() || stat?.value?.trim() || `Statistik ${index + 1}`;
    const ok = await confirmDelete({
      title: "Hapus statistik",
      description: `"${label}" akan dihapus dari daftar statistik hero.`,
    });
    if (!ok) return;

    setForm((f) => ({
      ...f,
      stats: f.stats.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const imageUrl = form.imageUrl.trim();
      if (imageUrl && !isAppUploadUrl(imageUrl)) {
        throw new Error("Gambar hero harus diunggah melalui aplikasi.");
      }

      const content = {
        ...form,
        imageUrl: imageUrl || null,
        overlayOpacity: Number(form.overlayOpacity) || 0.72,
        stats: form.stats.filter((s) => s.label?.trim() || s.value?.trim()),
      };

      const res = await fetch("/api/admin/home/sections/hero", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished, content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");

      setMessage({ type: "success", text: data.message });
      onSaved?.(data.section);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-600">
          Bagian paling atas beranda. Tanpa gambar = tampilan gradient biru.
        </p>
        <SectionPublishToggle isPublished={isPublished} onChange={setIsPublished} disabled={saving} />
      </div>

      <FormMessage message={message} />

      <ImageUploadField
        label="Gambar latar hero"
        hint="Opsional. Jika kosong, hero memakai gradient biru."
        value={form.imageUrl}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
        alt={form.imageAlt}
        onAltChange={(alt) => setForm((f) => ({ ...f, imageAlt: alt }))}
        category="cms"
        optional
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Opacity overlay" hint="0–1, untuk gambar hero">
          <TextInput
            type="number"
            min={0}
            max={1}
            step={0.05}
            value={form.overlayOpacity}
            onChange={set("overlayOpacity")}
          />
        </Field>
        <Field label="Badge">
          <TextInput value={form.badge} onChange={set("badge")} placeholder="Tahun Ajaran 2026/2027" />
        </Field>
      </div>

      <Field label="Judul utama">
        <TextInput value={form.title} onChange={set("title")} required />
      </Field>
      <Field label="Subjudul">
        <TextArea value={form.subtitle} onChange={set("subtitle")} rows={3} />
      </Field>

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Tombol utama — label">
          <TextInput value={form.ctaLabel} onChange={set("ctaLabel")} />
        </Field>
        <Field label="Tombol utama — link">
          <TextInput value={form.ctaHref} onChange={set("ctaHref")} placeholder="/spmb" />
        </Field>
        <Field label="Tombol sekunder — label">
          <TextInput value={form.secondaryCtaLabel} onChange={set("secondaryCtaLabel")} />
        </Field>
        <Field label="Tombol sekunder — link">
          <TextInput value={form.secondaryCtaHref} onChange={set("secondaryCtaHref")} placeholder="/tentang" />
        </Field>
      </div>

      <div>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-medium text-slate-700">Statistik (maks. 3 kolom)</p>
          <button
            type="button"
            onClick={addStat}
            className="text-sm font-medium text-[var(--admin-primary)] hover:underline"
          >
            + Tambah stat
          </button>
        </div>
        <div className="space-y-3">
          {form.stats.map((stat, index) => (
            <div key={index} className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 p-4">
              <Field label="Nilai" className="min-w-[120px] flex-1">
                <TextInput
                  value={stat.value}
                  onChange={(e) => setStat(index, "value", e.target.value)}
                  placeholder="98%"
                />
              </Field>
              <Field label="Label" className="min-w-[160px] flex-[2]">
                <TextInput
                  value={stat.label}
                  onChange={(e) => setStat(index, "label", e.target.value)}
                  placeholder="Tingkat Kelulusan"
                />
              </Field>
              <button
                type="button"
                onClick={() => removeStat(index)}
                className="mb-1 rounded-lg px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      </div>

      <SaveButton saving={saving} />
      <ConfirmDeleteDialog />
    </form>
  );
}

export { TestimonialsSectionForm } from "./TestimonialsSectionForm.js";
export { ContactSectionForm } from "./ContactSectionForm.js";
