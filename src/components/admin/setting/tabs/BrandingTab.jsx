"use client";

import { useEffect, useState } from "react";
import { FormMessage, SaveButton } from "@/components/admin/home/AdminFormFields.js";
import { ImageUploadField } from "@/components/admin/home/ImageUploadField.js";

const empty = { logoUrl: "", faviconUrl: "" };

export function BrandingTab() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/school-settings")
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data.school) return;
        setForm({
          logoUrl: data.school.logoUrl ?? "",
          faviconUrl: data.school.faviconUrl ?? "",
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/school-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "branding", ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.school) {
        setForm({
          logoUrl: data.school.logoUrl ?? "",
          faviconUrl: data.school.faviconUrl ?? "",
        });
      }
      setMessage({
        type: "success",
        text: `${data.message} Muat ulang halaman untuk memperbarui logo di sidebar.`,
      });
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

      <ImageUploadField
        label="Logo Sekolah"
        hint="PNG transparan disarankan, lebar maks. ~400 px. Tampil di navbar, footer, dan sidebar admin."
        value={form.logoUrl}
        onChange={(url) => setForm((f) => ({ ...f, logoUrl: url }))}
        category="school"
        previewVariant="logo"
        optional
      />

      <ImageUploadField
        label="Favicon"
        hint="Ikon persegi 32×32 atau 64×64 px untuk tab browser."
        value={form.faviconUrl}
        onChange={(url) => setForm((f) => ({ ...f, faviconUrl: url }))}
        category="school"
        previewVariant="favicon"
        optional
      />

      <SaveButton saving={saving} />
    </form>
  );
}
