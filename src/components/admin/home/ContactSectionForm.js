"use client";

import { useEffect, useState } from "react";
import { Field, FormMessage, SaveButton, TextArea, TextInput } from "./AdminFormFields.js";
import { SectionHeadingFields } from "./SectionHeadingFields.js";
import { SectionPublishToggle } from "./SectionPublishToggle.js";
import { useConfirmDelete } from "./ConfirmDeleteModal.js";
import { parseMapEmbedUrl } from "@/lib/map-embed.js";

const emptySchool = {
  name: "",
  street: "",
  district: "",
  city: "",
  province: "",
  postalCode: "",
  country: "Indonesia",
  phone: "",
  email: "",
  whatsapp: "",
  mapsUrl: "",
  mapEmbedUrl: "",
  officeHours: [{ day: "", time: "" }],
};

const emptyHeading = {
  eyebrow: "",
  title: "",
  description: "",
};

function normalizeHeading(content) {
  const c = content && typeof content === "object" ? content : {};
  return { ...emptyHeading, ...c };
}

function normalizeSchool(school) {
  if (!school) return { ...emptySchool };
  const hours = Array.isArray(school.officeHours) ? school.officeHours : [];
  return {
    ...emptySchool,
    name: school.name ?? "",
    street: school.street ?? "",
    district: school.district ?? "",
    city: school.city ?? "",
    province: school.province ?? "",
    postalCode: school.postalCode ?? "",
    country: school.country ?? "Indonesia",
    phone: school.phone ?? "",
    email: school.email ?? "",
    whatsapp: school.whatsapp ?? "",
    mapsUrl: school.mapsUrl ?? "",
    mapEmbedUrl: school.mapEmbedUrl ?? "",
    officeHours: hours.length > 0 ? hours : [{ day: "", time: "" }],
  };
}

export function ContactSectionForm({ section, onSectionUpdated }) {
  const [isPublished, setIsPublished] = useState(section?.isPublished ?? true);
  const [heading, setHeading] = useState(() => normalizeHeading(section?.content));
  const [school, setSchool] = useState(emptySchool);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    fetch("/api/admin/school-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.school) setSchool(normalizeSchool(data.school));
      })
      .finally(() => setLoading(false));
  }, []);

  const setSchoolField = (key) => (e) => {
    setSchool((f) => ({ ...f, [key]: e.target.value }));
  };

  const setOfficeHour = (index, key, value) => {
    setSchool((f) => {
      const officeHours = [...f.officeHours];
      officeHours[index] = { ...officeHours[index], [key]: value };
      return { ...f, officeHours };
    });
  };

  const addOfficeHour = () => {
    setSchool((f) => ({ ...f, officeHours: [...f.officeHours, { day: "", time: "" }] }));
  };

  const removeOfficeHour = async (index) => {
    const row = school.officeHours[index];
    const label = row?.day?.trim() || row?.time?.trim() || `Baris ${index + 1}`;
    const ok = await confirmDelete({
      title: "Hapus jam operasional",
      description: `Baris "${label}" akan dihapus dari daftar jam operasional.`,
    });
    if (!ok) return;

    setSchool((f) => ({
      ...f,
      officeHours: f.officeHours.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const sectionRes = await fetch("/api/admin/home/sections/contact", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished, content: heading }),
      });
      const sectionData = await sectionRes.json();
      if (!sectionRes.ok) throw new Error(sectionData.error || "Gagal menyimpan section");

      const schoolRes = await fetch("/api/admin/school-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...school,
          officeHours: school.officeHours.filter((h) => h.day?.trim() || h.time?.trim()),
          mapEmbedUrl: parseMapEmbedUrl(school.mapEmbedUrl),
          mapsUrl: school.mapsUrl.trim() || null,
        }),
      });
      const schoolData = await schoolRes.json();
      if (!schoolRes.ok) throw new Error(schoolData.error || "Gagal menyimpan kontak");

      setMessage({ type: "success", text: "Section kontak berhasil disimpan" });
      onSectionUpdated?.(sectionData.section);
      if (schoolData.school) setSchool(normalizeSchool(schoolData.school));
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat data kontak...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-slate-600">
          Blok alamat & kontak di bagian bawah beranda (sebelum footer).
        </p>
        <SectionPublishToggle isPublished={isPublished} onChange={setIsPublished} disabled={saving} />
      </div>

      <FormMessage message={message} />

      <SectionHeadingFields form={heading} onChange={setHeading} />

      <div className="space-y-4 rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-800">Data kontak sekolah</p>
        <Field label="Nama sekolah (tampilan)">
          <TextInput value={school.name} onChange={setSchoolField("name")} required />
        </Field>
        <Field label="Alamat jalan">
          <TextInput value={school.street} onChange={setSchoolField("street")} />
        </Field>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Kecamatan">
            <TextInput value={school.district} onChange={setSchoolField("district")} />
          </Field>
          <Field label="Kota">
            <TextInput value={school.city} onChange={setSchoolField("city")} />
          </Field>
          <Field label="Provinsi">
            <TextInput value={school.province} onChange={setSchoolField("province")} />
          </Field>
          <Field label="Kode pos">
            <TextInput value={school.postalCode} onChange={setSchoolField("postalCode")} />
          </Field>
          <Field label="Negara">
            <TextInput value={school.country} onChange={setSchoolField("country")} />
          </Field>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Telepon">
            <TextInput value={school.phone} onChange={setSchoolField("phone")} />
          </Field>
          <Field label="Email">
            <TextInput type="email" value={school.email} onChange={setSchoolField("email")} />
          </Field>
          <Field label="WhatsApp">
            <TextInput value={school.whatsapp} onChange={setSchoolField("whatsapp")} />
          </Field>
          <Field label="Link Google Maps">
            <TextInput value={school.mapsUrl} onChange={setSchoolField("mapsUrl")} placeholder="https://maps.google.com/..." />
          </Field>
        </div>
        <Field
          label="URL embed peta"
          hint="Tempel URL embed atau kode iframe dari Google Maps (Bagikan → Sematkan peta)"
        >
          <TextArea value={school.mapEmbedUrl} onChange={setSchoolField("mapEmbedUrl")} rows={2} />
        </Field>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Jam operasional</p>
            <button
              type="button"
              onClick={addOfficeHour}
              className="text-sm font-medium text-[var(--admin-primary)] hover:underline"
            >
              + Tambah baris
            </button>
          </div>
          <div className="space-y-2">
            {school.officeHours.map((row, index) => (
              <div key={index} className="flex flex-wrap items-end gap-2">
                <Field label="Hari" className="min-w-[140px] flex-1">
                  <TextInput
                    value={row.day}
                    onChange={(e) => setOfficeHour(index, "day", e.target.value)}
                    placeholder="Senin – Jumat"
                  />
                </Field>
                <Field label="Jam" className="min-w-[140px] flex-1">
                  <TextInput
                    value={row.time}
                    onChange={(e) => setOfficeHour(index, "time", e.target.value)}
                    placeholder="07.00 – 15.30 WIB"
                  />
                </Field>
                {school.officeHours.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => removeOfficeHour(index)}
                    className="mb-1 rounded-lg px-2 py-2 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Hapus
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>

      <SaveButton saving={saving} />
      <ConfirmDeleteDialog />
    </form>
  );
}
