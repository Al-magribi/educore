"use client";

import { useState } from "react";
import { FormMessage, SaveButton } from "./AdminFormFields.js";
import { SectionHeadingFields } from "./SectionHeadingFields.js";
import { SectionPublishToggle } from "./SectionPublishToggle.js";
import { ItemsSectionEditor } from "./ItemsSectionEditor.js";

const emptyHeading = {
  eyebrow: "",
  title: "",
  description: "",
};

function normalizeHeading(content) {
  const c = content && typeof content === "object" ? content : {};
  return { ...emptyHeading, ...c };
}

export function TestimonialsSectionForm({ section, onSectionUpdated }) {
  const [isPublished, setIsPublished] = useState(section?.isPublished ?? true);
  const [heading, setHeading] = useState(() => normalizeHeading(section?.content));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const saveHeading = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/admin/home/sections/alumni_testimonials", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished, content: heading }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");

      setMessage({ type: "success", text: data.message });
      onSectionUpdated?.(data.section);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <form onSubmit={saveHeading} className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-slate-600">
            Atur judul section dan daftar kutipan alumni di bawah.
          </p>
          <SectionPublishToggle
            isPublished={isPublished}
            onChange={setIsPublished}
            disabled={saving}
          />
        </div>

        <FormMessage message={message} />

        <SectionHeadingFields form={heading} onChange={setHeading} />

        <SaveButton saving={saving}>Simpan judul section</SaveButton>
      </form>

      <div className="border-t border-slate-200 pt-8">
        <h3 className="text-base font-semibold text-slate-900">Daftar testimoni</h3>
        <p className="mt-1 text-sm text-slate-600">
          Setiap kartu menampilkan kutipan, nama, peran, dan foto (opsional).
        </p>
        <div className="mt-6">
          <ItemsSectionEditor
            sectionType="alumni_testimonials"
            section={section}
            description=""
            onSectionUpdated={onSectionUpdated}
            hidePublishToggle
          />
        </div>
      </div>
    </div>
  );
}
