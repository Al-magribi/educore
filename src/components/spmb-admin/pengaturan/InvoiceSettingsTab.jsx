"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Field,
  FormMessage,
  SaveButton,
  TextArea,
  TextInput,
} from "@/components/admin/home/AdminFormFields.js";
import { ImageUploadField } from "@/components/admin/home/ImageUploadField.js";
import { InvoiceDocument } from "@/components/spmb-admin/pembayaran/InvoiceDocument.jsx";

const API = "/api/spmb-admin/invoice-settings";

const empty = {
  treasurerName: "",
  treasurerSignatureUrl: "",
  invoiceLogoUrl: "",
  invoiceSchoolName: "",
  invoiceSchoolAddress: "",
};

const emptySchoolDefaults = {
  logoUrl: "",
  schoolName: "Sekolah",
  schoolAddress: "",
};

function buildPreviewInvoice(form, schoolDefaults) {
  const now = new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date());

  return {
    invoiceNumber: "INV/PREVIEW/001",
    invoiceIssuedAt: now,
    header: {
      logoUrl: form.invoiceLogoUrl?.trim() || schoolDefaults.logoUrl || "",
      schoolName: form.invoiceSchoolName?.trim() || schoolDefaults.schoolName || "Sekolah",
      schoolAddress: form.invoiceSchoolAddress?.trim() || schoolDefaults.schoolAddress || "",
      treasurerName: form.treasurerName?.trim() || "",
      treasurerSignatureUrl: form.treasurerSignatureUrl?.trim() || "",
    },
    applicant: {
      name: "Contoh Pendaftar",
      email: "pendaftar@example.com",
      phone: "081234567890",
    },
    period: {
      name: "Gelombang 1",
      academicYear: "2026/2027",
    },
    payment: {
      category: "wave_fee",
      method: "manual",
      amount: 5_590_000,
      paidAt: now,
    },
    lineItems: [
      { label: "Cicilan — Iuran Pengembangan Sarana Pendidikan (IPSP)", amount: 5_000_000 },
      { label: "Cicilan — Sumbangan Pengelolaan Pendidikan (SPP)", amount: 590_000 },
    ],
  };
}

export default function InvoiceSettingsTab() {
  const [form, setForm] = useState(empty);
  const [schoolDefaults, setSchoolDefaults] = useState(emptySchoolDefaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  const previewInvoice = useMemo(
    () => buildPreviewInvoice(form, schoolDefaults),
    [form, schoolDefaults]
  );

  useEffect(() => {
    fetch(API)
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setForm({
            treasurerName: data.settings.treasurerName ?? "",
            treasurerSignatureUrl: data.settings.treasurerSignatureUrl ?? "",
            invoiceLogoUrl: data.settings.invoiceLogoUrl ?? "",
            invoiceSchoolName: data.settings.invoiceSchoolName ?? "",
            invoiceSchoolAddress: data.settings.invoiceSchoolAddress ?? "",
          });
        }
        if (data.schoolDefaults) {
          setSchoolDefaults({
            logoUrl: data.schoolDefaults.logoUrl ?? "",
            schoolName: data.schoolDefaults.schoolName ?? "Sekolah",
            schoolAddress: data.schoolDefaults.schoolAddress ?? "",
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
      const res = await fetch(API, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.settings) setForm({ ...empty, ...data.settings });
      setMessage({ type: "success", text: data.message });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat pengaturan invoice...</p>;
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <form onSubmit={handleSubmit} className="space-y-6">
        <FormMessage message={message} />

        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
          Pengaturan ini digunakan saat menerbitkan invoice pembayaran SPMB. Kosongkan field header
          untuk memakai logo, nama, dan alamat sekolah dari pengaturan CMS admin.
        </div>

        <Field label="Nama Bendahara" hint="Nama yang tampil di bagian tanda tangan invoice">
          <TextInput value={form.treasurerName} onChange={set("treasurerName")} />
        </Field>

        <ImageUploadField
          label="Tanda Tangan Bendahara"
          hint="Unggah gambar tanda tangan (PNG transparan disarankan)"
          value={form.treasurerSignatureUrl}
          onChange={(url) => setForm((f) => ({ ...f, treasurerSignatureUrl: url }))}
          category="school"
          previewVariant="logo"
          optional
        />

        <div className="border-t border-slate-100 pt-6">
          <h3 className="text-base font-semibold text-slate-900">Header Invoice Kustom</h3>
          <p className="mt-1 text-sm text-slate-500">
            Logo sekolah, nama sekolah, dan alamat yang tampil di bagian atas invoice.
          </p>
        </div>

        <ImageUploadField
          label="Logo Invoice"
          hint="Logo khusus invoice (opsional)"
          value={form.invoiceLogoUrl}
          onChange={(url) => setForm((f) => ({ ...f, invoiceLogoUrl: url }))}
          category="school"
          previewVariant="logo"
          optional
        />

        <Field label="Nama Sekolah (Invoice)">
          <TextInput value={form.invoiceSchoolName} onChange={set("invoiceSchoolName")} />
        </Field>

        <Field label="Alamat Sekolah (Invoice)" hint="Alamat lengkap yang tampil di header invoice">
          <TextArea
            value={form.invoiceSchoolAddress}
            onChange={set("invoiceSchoolAddress")}
            rows={4}
          />
        </Field>

        <SaveButton saving={saving}>Simpan Pengaturan Invoice</SaveButton>
      </form>

      <aside className="xl:sticky xl:top-6 xl:self-start">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-slate-900">Pratinjau Invoice</h3>
          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
            Contoh data
          </span>
        </div>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">
          Pratinjau diperbarui otomatis saat Anda mengubah pengaturan. Nomor dan data pendaftar
          hanya ilustrasi.
        </p>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100/60 p-3 sm:p-4">
            <InvoiceDocument invoice={previewInvoice} compact />
        </div>
      </aside>
    </div>
  );
}
