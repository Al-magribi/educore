"use client";

import { useEffect, useState } from "react";
import { Field, FormMessage, SaveButton, TextInput } from "@/components/admin/home/AdminFormFields.js";

const empty = { name: "", tagline: "", siteTitle: "" };

export function IdentityTab() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch("/api/admin/school-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.school) {
          setForm({
            name: data.school.name ?? "",
            tagline: data.school.tagline ?? "",
            siteTitle: data.school.siteTitle ?? "",
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
      const res = await fetch("/api/admin/school-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "identity", ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.school) {
        setForm({
          name: data.school.name ?? "",
          tagline: data.school.tagline ?? "",
          siteTitle: data.school.siteTitle ?? "",
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

      <Field label="Nama Sekolah" hint="Ditampilkan di navbar, footer, dan sidebar admin">
        <TextInput value={form.name} onChange={set("name")} required />
      </Field>

      <Field label="Tagline / Slogan" hint="Kalimat singkat di bawah nama sekolah">
        <TextInput value={form.tagline} onChange={set("tagline")} />
      </Field>

      <Field
        label="Judul Situs (Site Title)"
        hint="Judul tab browser dan fallback metadata SEO"
      >
        <TextInput value={form.siteTitle} onChange={set("siteTitle")} />
      </Field>

      <SaveButton saving={saving} />
    </form>
  );
}
