import { Field, TextArea, TextInput } from "./AdminFormFields.js";

/**
 * Judul section (eyebrow, title, description) — dipakai testimoni & kontak.
 */
export function SectionHeadingFields({ form, onChange }) {
  const set = (key) => (e) => onChange({ ...form, [key]: e.target.value });

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
      <p className="text-sm font-medium text-slate-800">Judul section</p>
      <Field label="Eyebrow">
        <TextInput value={form.eyebrow} onChange={set("eyebrow")} placeholder="Testimoni Alumni" />
      </Field>
      <Field label="Judul">
        <TextInput value={form.title} onChange={set("title")} required />
      </Field>
      <Field label="Deskripsi">
        <TextArea value={form.description} onChange={set("description")} rows={2} />
      </Field>
    </div>
  );
}
