"use client";

import { useEffect, useState } from "react";
import {
  Field,
  FormMessage,
  SaveButton,
  TextArea,
  TextInput,
} from "@/components/admin/home/AdminFormFields.js";
import { ImageUploadField } from "@/components/admin/home/ImageUploadField.js";

const empty = {
  title: "",
  subtitle: "",
  imageUrl: "",
  imageAlt: "",
};

export function PageTab() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch("/api/admin/about")
      .then((r) => r.json())
      .then((data) => {
        if (data.about?.page) {
          setForm({
            title: data.about.page.title ?? "",
            subtitle: data.about.page.subtitle ?? "",
            imageUrl: data.about.page.imageUrl ?? "",
            imageAlt: data.about.page.imageAlt ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/about", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "page", page: form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.about?.page) {
        setForm({
          title: data.about.page.title ?? "",
          subtitle: data.about.page.subtitle ?? "",
          imageUrl: data.about.page.imageUrl ?? "",
          imageAlt: data.about.page.imageAlt ?? "",
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
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormMessage message={message} />

      <Field label="Judul Halaman" hint="Judul utama di hero halaman tentang">
        <TextInput value={form.title} onChange={set("title")} required />
      </Field>

      <Field label="Subjudul" hint="Deskripsi singkat di bawah judul">
        <TextArea value={form.subtitle} onChange={set("subtitle")} rows={3} />
      </Field>

      <ImageUploadField
        label="Gambar Hero"
        hint="Gambar latar belakang hero halaman tentang"
        value={form.imageUrl}
        onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
        alt={form.imageAlt}
        onAltChange={(alt) => setForm((f) => ({ ...f, imageAlt: alt }))}
        optional
        category="cms"
      />

      <SaveButton saving={saving} />
    </form>
  );
}
