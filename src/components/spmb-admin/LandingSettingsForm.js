"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Field,
  FormMessage,
  SaveButton,
  SelectInput,
  TextArea,
  TextInput,
} from "@/components/admin/home/AdminFormFields.js";
import { ImageUploadField } from "@/components/admin/home/ImageUploadField.js";
import { spmbLandingDefaults } from "@/data/spmb-landing-defaults.js";

function SectionPanel({ title, description, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className='rounded-xl border border-slate-200 bg-slate-50/40'>
      <button
        type='button'
        onClick={() => setOpen((v) => !v)}
        className='flex w-full items-start justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-50 sm:px-5'
      >
        <div>
          <h3 className='text-sm font-semibold text-slate-900'>{title}</h3>
          {description ? (
            <p className='mt-0.5 text-xs text-slate-500'>{description}</p>
          ) : null}
        </div>
        <svg
          className={`mt-0.5 h-5 w-5 shrink-0 text-slate-400 transition ${open ? "rotate-180" : ""}`}
          fill='none'
          viewBox='0 0 24 24'
          stroke='currentColor'
          aria-hidden
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d='M19 9l-7 7-7-7'
          />
        </svg>
      </button>
      {open ? (
        <div className='space-y-4 border-t border-slate-100 px-4 py-4 sm:px-5'>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function ListActions({ onAdd, addLabel = "Tambah item" }) {
  return (
    <button
      type='button'
      onClick={onAdd}
      className='rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-[var(--admin-primary)] hover:text-[var(--admin-primary)]'
    >
      + {addLabel}
    </button>
  );
}

function RemoveButton({ onClick }) {
  return (
    <button
      type='button'
      onClick={onClick}
      className='text-xs font-medium text-rose-600 hover:text-rose-700'
    >
      Hapus
    </button>
  );
}

function HeadingFields({ prefix, form, setForm }) {
  const sections = form.page.sections ?? {};
  const current = sections[prefix] ?? {};

  const setHeading = (key, value) => {
    setForm((f) => ({
      ...f,
      page: {
        ...f.page,
        sections: {
          ...f.page.sections,
          [prefix]: { ...current, [key]: value },
        },
      },
    }));
  };

  return (
    <div className='grid gap-3 rounded-lg bg-slate-50 p-3 sm:grid-cols-3'>
      <Field label='Label kecil'>
        <TextInput
          value={current.eyebrow ?? ""}
          onChange={(e) => setHeading("eyebrow", e.target.value)}
          placeholder='Contoh: Jadwal'
        />
      </Field>
      <Field label='Judul seksi'>
        <TextInput
          value={current.title ?? ""}
          onChange={(e) => setHeading("title", e.target.value)}
        />
      </Field>
      <Field label='Deskripsi seksi' className='sm:col-span-1'>
        <TextInput
          value={current.description ?? ""}
          onChange={(e) => setHeading("description", e.target.value)}
        />
      </Field>
    </div>
  );
}

function normalizeForm(content) {
  const defaults = spmbLandingDefaults;
  const merged = {
    ...defaults,
    ...content,
    page: { ...defaults.page, ...(content?.page ?? {}) },
    fees: { ...defaults.fees, ...(content?.fees ?? {}) },
    contact: { ...defaults.contact, ...(content?.contact ?? {}) },
  };

  return {
    ...merged,
    isOpen: merged.isOpen ?? merged.page.status === "open",
    requirementsText: (merged.requirements ?? []).join("\n"),
    paymentMethodsText: (merged.fees?.paymentMethods ?? []).join("\n"),
  };
}

function formToPayload(form) {
  const { requirementsText, paymentMethodsText, ...rest } = form;
  return {
    ...rest,
    requirements: requirementsText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean),
    fees: {
      ...rest.fees,
      paymentMethods: paymentMethodsText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
    },
    page: {
      ...rest.page,
      status: rest.isOpen ? "open" : "closed",
      academicYear: rest.academicYear,
    },
    academicYear: rest.academicYear,
  };
}

export function LandingSettingsForm() {
  const [form, setForm] = useState(() => normalizeForm(null));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch("/api/spmb-admin/landing-content")
      .then((r) => r.json())
      .then((data) => {
        if (data.content) setForm(normalizeForm(data.content));
      })
      .finally(() => setLoading(false));
  }, []);

  const setPage = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, page: { ...f.page, [key]: value } }));
  };

  const setField = (key) => (e) => {
    const value =
      e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: value }));
  };

  const setFees = (key) => (e) =>
    setForm((f) => ({ ...f, fees: { ...f.fees, [key]: e.target.value } }));

  const setContact = (key) => (e) =>
    setForm((f) => ({
      ...f,
      contact: { ...f.contact, [key]: e.target.value },
    }));

  const updateList = (key, index, itemKey, value) => {
    setForm((f) => {
      const list = [...(f[key] ?? [])];
      list[index] = { ...list[index], [itemKey]: value };
      return { ...f, [key]: list };
    });
  };

  const addSchedule = () =>
    setForm((f) => ({
      ...f,
      schedule: [
        ...(f.schedule ?? []),
        { id: String(Date.now()), date: "", title: "", description: "" },
      ],
    }));

  const addFlow = () =>
    setForm((f) => ({
      ...f,
      flow: [
        ...(f.flow ?? []),
        {
          step: (f.flow?.length ?? 0) + 1,
          title: "",
          description: "",
        },
      ],
    }));

  const addFaq = () =>
    setForm((f) => ({
      ...f,
      faq: [
        ...(f.faq ?? []),
        { id: String(Date.now()), question: "", answer: "" },
      ],
    }));

  const removeItem = (key, index) =>
    setForm((f) => ({
      ...f,
      [key]: (f[key] ?? []).filter((_, i) => i !== index),
    }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/spmb-admin/landing-content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formToPayload(form)),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.content) setForm(normalizeForm(data.content));
      setMessage({ type: "success", text: data.message });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className='py-8 text-center text-sm text-slate-500'>
        Memuat konten landing...
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className='space-y-4'>
      <div className='flex flex-col gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 sm:flex-row sm:items-center sm:justify-between'>
        <p className='text-sm text-blue-900'>
          Perubahan akan tampil di halaman publik{" "}
          <Link
            href='/spmb'
            target='_blank'
            className='font-semibold underline'
          >
            /spmb
          </Link>
        </p>
        <SaveButton saving={saving} />
      </div>

      <FormMessage message={message} />

      <SectionPanel
        title='Hero & Status'
        description='Judul utama, gambar latar, dan status pendaftaran'
        defaultOpen
      >
        <div className='grid gap-4 sm:grid-cols-2'>
          <p className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:col-span-2'>
            Batas pendaftaran di hero mengikuti tanggal tutup gelombang yang aktif di tab
            Periode.
          </p>
          <Field label='Judul halaman' className='sm:col-span-2'>
            <TextInput
              value={form.page.title ?? ""}
              onChange={setPage("title")}
            />
          </Field>
          <Field label='Subjudul' className='sm:col-span-2'>
            <TextArea
              rows={4}
              value={form.page.subtitle ?? ""}
              onChange={setPage("subtitle")}
              className='min-h-[112px]'
            />
          </Field>
          <Field label='Tahun ajaran'>
            <TextInput
              value={form.academicYear ?? ""}
              onChange={setField("academicYear")}
            />
          </Field>
          <Field label='Label status (tampilan)'>
            <TextInput
              value={form.page.statusLabel ?? ""}
              onChange={setPage("statusLabel")}
            />
          </Field>
          <Field label='Status pendaftaran'>
            <SelectInput
              value={form.isOpen ? "open" : "closed"}
              onChange={(e) =>
                setForm((f) => ({ ...f, isOpen: e.target.value === "open" }))
              }
            >
              <option value='open'>Dibuka</option>
              <option value='closed'>Ditutup</option>
            </SelectInput>
          </Field>
        </div>

        <ImageUploadField
          label='Gambar hero'
          hint='Opsional. Disarankan landscape 1920×1080.'
          value={form.page.imageUrl ?? ""}
          onChange={(url) =>
            setForm((f) => ({ ...f, page: { ...f.page, imageUrl: url } }))
          }
          category='spmb'
          alt={form.page.imageAlt ?? ""}
          onAltChange={(alt) =>
            setForm((f) => ({ ...f, page: { ...f.page, imageAlt: alt } }))
          }
          optional
        />
      </SectionPanel>

      <SectionPanel title='Jadwal' description='Timeline kegiatan SPMB'>
        <HeadingFields prefix='schedule' form={form} setForm={setForm} />
        <div className='space-y-3'>
          {(form.schedule ?? []).map((item, i) => (
            <div
              key={item.id ?? i}
              className='space-y-3 rounded-lg border border-slate-200 p-3'
            >
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Item {i + 1}
                </span>
                <RemoveButton onClick={() => removeItem("schedule", i)} />
              </div>
              <div className='grid gap-3 sm:grid-cols-2'>
                <Field label='Tanggal'>
                  <TextInput
                    value={item.date ?? ""}
                    onChange={(e) =>
                      updateList("schedule", i, "date", e.target.value)
                    }
                  />
                </Field>
                <Field label='Judul'>
                  <TextInput
                    value={item.title ?? ""}
                    onChange={(e) =>
                      updateList("schedule", i, "title", e.target.value)
                    }
                  />
                </Field>
                <Field label='Deskripsi' className='sm:col-span-2'>
                  <TextArea
                    value={item.description ?? ""}
                    onChange={(e) =>
                      updateList("schedule", i, "description", e.target.value)
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
          <ListActions onAdd={addSchedule} addLabel='Tambah jadwal' />
        </div>
      </SectionPanel>

      <SectionPanel
        title='Alur Pendaftaran'
        description='Langkah-langkah untuk calon siswa'
      >
        <HeadingFields prefix='flow' form={form} setForm={setForm} />
        <div className='space-y-3'>
          {(form.flow ?? []).map((item, i) => (
            <div
              key={item.step ?? i}
              className='space-y-3 rounded-lg border border-slate-200 p-3'
            >
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  Langkah {item.step ?? i + 1}
                </span>
                <RemoveButton onClick={() => removeItem("flow", i)} />
              </div>
              <div className='grid gap-3 sm:grid-cols-[80px_1fr]'>
                <Field label='No.'>
                  <TextInput
                    type='number'
                    min={1}
                    value={item.step ?? i + 1}
                    onChange={(e) =>
                      updateList(
                        "flow",
                        i,
                        "step",
                        Number(e.target.value) || i + 1,
                      )
                    }
                  />
                </Field>
                <Field label='Judul'>
                  <TextInput
                    value={item.title ?? ""}
                    onChange={(e) =>
                      updateList("flow", i, "title", e.target.value)
                    }
                  />
                </Field>
                <Field label='Deskripsi' className='sm:col-span-2'>
                  <TextArea
                    value={item.description ?? ""}
                    onChange={(e) =>
                      updateList("flow", i, "description", e.target.value)
                    }
                  />
                </Field>
              </div>
            </div>
          ))}
          <ListActions onAdd={addFlow} addLabel='Tambah langkah' />
        </div>
      </SectionPanel>

      <SectionPanel
        title='Persyaratan & Biaya'
        description='Dokumen dan informasi pembayaran'
      >
        <HeadingFields prefix='requirements' form={form} setForm={setForm} />
        <Field label='Daftar dokumen' hint='Satu baris per item'>
          <TextArea
            value={form.requirementsText ?? ""}
            onChange={(e) =>
              setForm((f) => ({ ...f, requirementsText: e.target.value }))
            }
            className='min-h-[140px] font-mono text-xs'
          />
        </Field>
        <div className='grid gap-4 sm:grid-cols-2'>
          <p className='rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-500 sm:col-span-2'>
            Nominal biaya pendaftaran diambil dari Pengaturan Pembayaran.
          </p>
          <Field label='Catatan biaya' className='sm:col-span-2'>
            <TextArea
              value={form.fees?.note ?? ""}
              onChange={setFees("note")}
            />
          </Field>
          <Field
            label='Metode pembayaran'
            hint='Satu baris per metode'
            className='sm:col-span-2'
          >
            <TextArea
              value={form.paymentMethodsText ?? ""}
              onChange={(e) =>
                setForm((f) => ({ ...f, paymentMethodsText: e.target.value }))
              }
            />
          </Field>
        </div>
      </SectionPanel>

      <SectionPanel title='FAQ' description='Pertanyaan yang sering diajukan'>
        <HeadingFields prefix='faq' form={form} setForm={setForm} />
        <div className='space-y-3'>
          {(form.faq ?? []).map((item, i) => (
            <div
              key={item.id ?? i}
              className='space-y-3 rounded-lg border border-slate-200 p-3'
            >
              <div className='flex items-center justify-between'>
                <span className='text-xs font-semibold uppercase tracking-wide text-slate-500'>
                  FAQ {i + 1}
                </span>
                <RemoveButton onClick={() => removeItem("faq", i)} />
              </div>
              <Field label='Pertanyaan'>
                <TextInput
                  value={item.question ?? ""}
                  onChange={(e) =>
                    updateList("faq", i, "question", e.target.value)
                  }
                />
              </Field>
              <Field label='Jawaban'>
                <TextArea
                  value={item.answer ?? ""}
                  onChange={(e) =>
                    updateList("faq", i, "answer", e.target.value)
                  }
                />
              </Field>
            </div>
          ))}
          <ListActions onAdd={addFaq} addLabel='Tambah FAQ' />
        </div>
      </SectionPanel>

      <SectionPanel
        title='Kontak Bantuan'
        description='Informasi tim SPMB di bagian bawah halaman'
      >
        <div className='grid gap-4 sm:grid-cols-2'>
          <Field label='Judul' className='sm:col-span-2'>
            <TextInput
              value={form.contact?.title ?? ""}
              onChange={setContact("title")}
            />
          </Field>
          <Field label='Deskripsi' className='sm:col-span-2'>
            <TextArea
              value={form.contact?.description ?? ""}
              onChange={setContact("description")}
            />
          </Field>
          <Field label='Email'>
            <TextInput
              type='email'
              value={form.contact?.email ?? ""}
              onChange={setContact("email")}
            />
          </Field>
          <Field label='Telepon'>
            <TextInput
              value={form.contact?.phone ?? ""}
              onChange={setContact("phone")}
            />
          </Field>
          <Field label='WhatsApp' className='sm:col-span-2'>
            <TextInput
              value={form.contact?.whatsapp ?? ""}
              onChange={setContact("whatsapp")}
            />
          </Field>
        </div>
      </SectionPanel>

      <div className='flex justify-end pt-2'>
        <SaveButton saving={saving} />
      </div>
    </form>
  );
}
