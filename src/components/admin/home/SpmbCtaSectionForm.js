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

const emptyCta = {
  title: "",
  description: "",
  href: "/spmb",
  deadline: "",
  highlights: [],
};

function normalizeCta(content) {
  const c = content && typeof content === "object" ? content : {};
  return {
    ...emptyCta,
    ...c,
    highlights: Array.isArray(c.highlights) ? c.highlights : [],
  };
}

export function SpmbCtaSectionForm({ section, onSaved }) {
  const [isPublished, setIsPublished] = useState(section?.isPublished ?? true);
  const [form, setForm] = useState(() => normalizeCta(section?.content));
  const [highlightsText, setHighlightsText] = useState(
    () => (normalizeCta(section?.content).highlights ?? []).join("\n")
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const highlights = highlightsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);

      const res = await fetch("/api/admin/home/sections/spmb_cta", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isPublished,
          content: { ...form, highlights },
        }),
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
        <p className="text-sm text-slate-600">Kartu ajakan daftar SPMB di bagian bawah beranda.</p>
        <SectionPublishToggle isPublished={isPublished} onChange={setIsPublished} disabled={saving} />
      </div>

      <FormMessage message={message} />

      <Field label="Judul">
        <TextInput value={form.title} onChange={set("title")} required />
      </Field>
      <Field label="Deskripsi">
        <TextArea value={form.description} onChange={set("description")} rows={4} />
      </Field>
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Link tombol daftar">
          <TextInput value={form.href} onChange={set("href")} placeholder="/spmb" />
        </Field>
        <Field label="Batas waktu (teks)" hint="Contoh: 30 Juni 2026">
          <TextInput value={form.deadline} onChange={set("deadline")} />
        </Field>
      </div>
      <Field label="Highlight" hint="Satu item per baris">
        <TextArea
          value={highlightsText}
          onChange={(e) => setHighlightsText(e.target.value)}
          rows={4}
          placeholder={"Pendaftaran Online\nPembayaran Aman"}
        />
      </Field>

      <SaveButton saving={saving} />
    </form>
  );
}
