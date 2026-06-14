"use client";

import { useEffect, useState } from "react";
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

function emptyItem(sectionType) {
  if (sectionType === "alumni_testimonials") {
    return {
      title: "",
      description: "",
      imageUrl: "",
      imageAlt: "",
      metadata: { quote: "", author: "", role: "", year: "" },
    };
  }
  return {
    title: "",
    description: "",
    imageUrl: "",
    imageAlt: "",
    metadata: null,
  };
}

function itemToForm(sectionType, item) {
  if (!item) return emptyItem(sectionType);

  if (sectionType === "alumni_testimonials") {
    const meta = item.metadata && typeof item.metadata === "object" ? item.metadata : {};
    return {
      title: item.title ?? meta.author ?? "",
      description: item.description ?? meta.quote ?? "",
      imageUrl: item.imageUrl ?? "",
      imageAlt: item.imageAlt ?? "",
      metadata: {
        quote: meta.quote ?? item.description ?? "",
        author: meta.author ?? item.title ?? "",
        role: meta.role ?? "",
        year: meta.year ?? "",
      },
    };
  }

  return {
    title: item.title ?? "",
    description: item.description ?? "",
    imageUrl: item.imageUrl ?? "",
    imageAlt: item.imageAlt ?? "",
    metadata: null,
  };
}

function formToPayload(sectionType, form) {
  if (sectionType === "alumni_testimonials") {
    const { quote, author, role, year } = form.metadata;
    return {
      title: author || form.title,
      description: quote || form.description,
      imageUrl: form.imageUrl || null,
      imageAlt: form.imageAlt || null,
      metadata: { quote, author, role, year },
    };
  }

  return {
    title: form.title,
    description: form.description,
    imageUrl: form.imageUrl || null,
    imageAlt: form.imageAlt || null,
    metadata: null,
  };
}

function ItemForm({ sectionType, item, onCancel, onSaved }) {
  const [form, setForm] = useState(() => itemToForm(sectionType, item));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const isNew = !item?.id;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const setMeta = (key) => (e) =>
    setForm((f) => ({
      ...f,
      metadata: { ...f.metadata, [key]: e.target.value },
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    try {
      const imageRequired = sectionType !== "alumni_testimonials";
      if (imageRequired && !isAppUploadUrl(form.imageUrl)) {
        throw new Error("Gambar wajib diunggah melalui aplikasi.");
      }
      if (form.imageUrl && !isAppUploadUrl(form.imageUrl)) {
        throw new Error("URL eksternal tidak diizinkan. Unggah gambar ke server.");
      }

      const payload = formToPayload(sectionType, form);
      const url = isNew ? "/api/admin/home/items" : `/api/admin/home/items/${item.id}`;
      const method = isNew ? "POST" : "PUT";
      const body = isNew ? { sectionType, ...payload } : payload;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");

      onSaved(data.item);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  const isTestimonial = sectionType === "alumni_testimonials";

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
      <p className="mb-4 text-sm font-semibold text-slate-900">
        {isNew ? "Tambah item baru" : "Edit item"}
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormMessage message={message} />

        {isTestimonial ? (
          <>
            <Field label="Kutipan / quote">
              <TextArea
                value={form.metadata.quote}
                onChange={setMeta("quote")}
                rows={3}
                required
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nama">
                <TextInput value={form.metadata.author} onChange={setMeta("author")} required />
              </Field>
              <Field label="Peran / jabatan">
                <TextInput value={form.metadata.role} onChange={setMeta("role")} />
              </Field>
              <Field label="Angkatan / tahun">
                <TextInput value={form.metadata.year} onChange={setMeta("year")} placeholder="2022" />
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Judul">
              <TextInput value={form.title} onChange={set("title")} required />
            </Field>
            <Field label="Deskripsi">
              <TextArea value={form.description} onChange={set("description")} rows={3} required />
            </Field>
          </>
        )}

        <ImageUploadField
          label="Gambar"
          value={form.imageUrl}
          onChange={(url) => setForm((f) => ({ ...f, imageUrl: url }))}
          alt={form.imageAlt}
          onAltChange={(alt) => setForm((f) => ({ ...f, imageAlt: alt }))}
          category="cms"
          optional={sectionType === "alumni_testimonials"}
        />

        <div className="flex flex-wrap gap-3">
          <SaveButton saving={saving}>{isNew ? "Tambahkan" : "Simpan item"}</SaveButton>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-white"
          >
            Batal
          </button>
        </div>
      </form>
    </div>
  );
}

export function ItemsSectionEditor({
  sectionType,
  section,
  description,
  onSectionUpdated,
  hidePublishToggle = false,
}) {
  const [isPublished, setIsPublished] = useState(section?.isPublished ?? true);
  const [items, setItems] = useState(section?.items ?? []);
  const [editingId, setEditingId] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [savingPublish, setSavingPublish] = useState(false);
  const [message, setMessage] = useState(null);
  const { confirmDelete, ConfirmDeleteDialog } = useConfirmDelete();

  useEffect(() => {
    setItems(section?.items ?? []);
    setIsPublished(section?.isPublished ?? true);
    setEditingId(null);
    setIsAdding(false);
  }, [section?.id]);

  const persistPublish = async (published) => {
    setSavingPublish(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/home/sections/${sectionType}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished: published }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal memperbarui status");
      setIsPublished(published);
      onSectionUpdated?.(data.section);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
      setIsPublished(!published);
    } finally {
      setSavingPublish(false);
    }
  };

  const displayTitle = (item) => {
    if (sectionType === "alumni_testimonials") {
      return item.metadata?.author ?? item.title ?? "Tanpa nama";
    }
    return item.title ?? "Tanpa judul";
  };

  const handleDelete = async (item) => {
    const title = displayTitle(item);
    const ok = await confirmDelete({
      title: "Hapus item",
      description: `Item "${title}" akan dihapus permanen dari section ini. Tindakan ini tidak dapat dibatalkan.`,
    });
    if (!ok) return;

    try {
      const res = await fetch(`/api/admin/home/items/${item.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menghapus");
      setItems((list) => list.filter((i) => i.id !== item.id));
      if (editingId === item.id) setEditingId(null);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const moveItem = async (index, direction) => {
    const next = index + direction;
    if (next < 0 || next >= items.length) return;
    const ordered = [...items];
    [ordered[index], ordered[next]] = [ordered[next], ordered[index]];
    const orderedIds = ordered.map((i) => i.id);

    try {
      const res = await fetch("/api/admin/home/items/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sectionType, orderedIds }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal mengurutkan");
      setItems(data.section.items);
      onSectionUpdated?.(data.section);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  };

  const handleItemSaved = (item) => {
    setItems((list) => {
      const exists = list.find((i) => i.id === item.id);
      if (exists) return list.map((i) => (i.id === item.id ? item : i));
      return [...list, item];
    });
    setEditingId(null);
    setIsAdding(false);
  };

  return (
    <div className="space-y-6">
      {!hidePublishToggle ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          {description ? <p className="text-sm text-slate-600">{description}</p> : <span />}
          <SectionPublishToggle
            isPublished={isPublished}
            onChange={(v) => {
              setIsPublished(v);
              persistPublish(v);
            }}
            disabled={savingPublish}
          />
        </div>
      ) : null}

      <FormMessage message={message} />

      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={item.id}>
            {editingId === item.id ? (
              <ItemForm
                sectionType={sectionType}
                item={item}
                onCancel={() => setEditingId(null)}
                onSaved={handleItemSaved}
              />
            ) : (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-slate-900">{displayTitle(item)}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-slate-600">
                    {sectionType === "alumni_testimonials"
                      ? item.metadata?.quote ?? item.description
                      : item.description}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(index, 1)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdding(false);
                      setEditingId(item.id);
                    }}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--admin-primary)] hover:bg-slate-50"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="rounded-lg px-3 py-1.5 text-sm text-rose-600 hover:bg-rose-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {items.length === 0 && !isAdding ? (
          <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
            Belum ada item. Tambahkan konten untuk section ini.
          </div>
        ) : null}
      </div>

      {isAdding ? (
        <ItemForm
          sectionType={sectionType}
          item={null}
          onCancel={() => setIsAdding(false)}
          onSaved={handleItemSaved}
        />
      ) : (
        <button
          type="button"
          onClick={() => {
            setEditingId(null);
            setIsAdding(true);
          }}
          className="rounded-xl border border-dashed border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:border-[var(--admin-primary)] hover:text-[var(--admin-primary)]"
        >
          + Tambah item
        </button>
      )}
      <ConfirmDeleteDialog />
    </div>
  );
}
