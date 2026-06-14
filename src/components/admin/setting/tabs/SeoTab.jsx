"use client";

import { useEffect, useState } from "react";
import { Field, FormMessage, SaveButton, TextArea, TextInput } from "@/components/admin/home/AdminFormFields.js";
import { ImageUploadField } from "@/components/admin/home/ImageUploadField.js";

const empty = {
  siteTitle: "",
  siteUrl: "",
  metaDescription: "",
  metaKeywords: "",
  robotsIndex: true,
  robotsFollow: true,
  ogImageUrl: "",
};

export function SeoTab() {
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
            siteTitle: data.school.siteTitle ?? "",
            siteUrl: data.school.siteUrl ?? "",
            metaDescription: data.school.metaDescription ?? "",
            metaKeywords: data.school.metaKeywords ?? "",
            robotsIndex: data.school.robotsIndex !== false,
            robotsFollow: data.school.robotsFollow !== false,
            ogImageUrl: data.school.ogImageUrl ?? "",
          });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const set = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/school-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "seo", ...form }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.school) {
        setForm({
          siteTitle: data.school.siteTitle ?? "",
          siteUrl: data.school.siteUrl ?? "",
          metaDescription: data.school.metaDescription ?? "",
          metaKeywords: data.school.metaKeywords ?? "",
          robotsIndex: data.school.robotsIndex !== false,
          robotsFollow: data.school.robotsFollow !== false,
          ogImageUrl: data.school.ogImageUrl ?? "",
        });
      }
      setMessage({ type: "success", text: data.message });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const robotsPreview = [
    form.robotsIndex ? "index" : "noindex",
    form.robotsFollow ? "follow" : "nofollow",
  ].join(", ");

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat data...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <FormMessage message={message} />

      <Field
        label="URL Situs (Canonical)"
        hint="Alamat utama situs, mis. https://smkcontoh.sch.id"
      >
        <TextInput
          type="url"
          value={form.siteUrl}
          onChange={set("siteUrl")}
          placeholder="https://"
        />
      </Field>

      <Field label="Meta Title">
        <TextInput value={form.siteTitle} onChange={set("siteTitle")} />
      </Field>

      <Field
        label="Meta Description"
        hint="Ringkasan halaman untuk hasil pencarian Google (150–160 karakter)"
      >
        <TextArea
          value={form.metaDescription}
          onChange={set("metaDescription")}
          rows={4}
        />
      </Field>

      <Field label="Meta Keywords" hint="Kata kunci dipisah koma">
        <TextInput
          value={form.metaKeywords}
          onChange={set("metaKeywords")}
          placeholder="sekolah, pendidikan, SPMB"
        />
      </Field>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <p className="text-sm font-medium text-slate-700">Robots (Google Crawler)</p>
        <p className="mt-1 text-xs text-slate-500">
          Atur apakah halaman diindeks dan link diikuti crawler.
        </p>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.robotsIndex}
              onChange={set("robotsIndex")}
            />
            Izinkan index
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={form.robotsFollow}
              onChange={set("robotsFollow")}
            />
            Izinkan follow
          </label>
        </div>
        <p className="mt-3 font-mono text-xs text-slate-500">
          robots: {robotsPreview}
        </p>
      </div>

      <ImageUploadField
        label="Open Graph Image"
        hint="Gambar pratinjau saat link dibagikan di media sosial (1200×630 px)"
        value={form.ogImageUrl}
        onChange={(url) => setForm((f) => ({ ...f, ogImageUrl: url }))}
        category="school"
        optional
      />

      <SaveButton saving={saving} />
    </form>
  );
}
