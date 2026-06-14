"use client";

import { useEffect, useState } from "react";

const empty = {
  registrationFee: 350000,
  manualEnabled: true,
  manualInstructions: "",
  bankName: "",
  bankAccountNumber: "",
  bankAccountName: "",
  midtransEnabled: false,
  midtransServerKey: "",
  midtransClientKey: "",
  midtransMerchantId: "",
  midtransProduction: false,
};

export function PaymentSettingsForm() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch("/api/spmb-admin/payment-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setForm({
            registrationFee: data.settings.registrationFee,
            manualEnabled: data.settings.manualEnabled,
            manualInstructions: data.settings.manualInstructions ?? "",
            bankName: data.settings.bankName ?? "",
            bankAccountNumber: data.settings.bankAccountNumber ?? "",
            bankAccountName: data.settings.bankAccountName ?? "",
            midtransEnabled: data.settings.midtransEnabled,
            midtransServerKey: data.settings.midtransServerKey ?? "",
            midtransClientKey: data.settings.midtransClientKey ?? "",
            midtransMerchantId: data.settings.midtransMerchantId ?? "",
            midtransProduction: data.settings.midtransProduction,
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
      const res = await fetch("/api/spmb-admin/payment-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          registrationFee: Number(form.registrationFee),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.settings) {
        setForm((f) => ({
          ...f,
          midtransServerKey: data.settings.midtransServerKey ?? "",
        }));
      }
      setMessage({ type: "success", text: data.message });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat pengaturan...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">
      {message && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">Umum</h2>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Biaya pendaftaran (Rp)</span>
          <input
            type="number"
            min={0}
            value={form.registrationFee}
            onChange={set("registrationFee")}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Transfer manual</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.manualEnabled}
              onChange={set("manualEnabled")}
            />
            Aktif
          </label>
        </div>
        <textarea
          rows={4}
          placeholder="Instruksi pembayaran untuk calon siswa"
          value={form.manualInstructions}
          onChange={set("manualInstructions")}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <div className="grid gap-3 sm:grid-cols-3">
          <input
            placeholder="Nama bank"
            value={form.bankName}
            onChange={set("bankName")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="No. rekening"
            value={form.bankAccountNumber}
            onChange={set("bankAccountNumber")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <input
            placeholder="Atas nama"
            value={form.bankAccountName}
            onChange={set("bankAccountName")}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </div>
      </section>

      <section className="space-y-4 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900">Midtrans</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.midtransEnabled}
              onChange={set("midtransEnabled")}
            />
            Aktif
          </label>
        </div>
        <p className="text-xs text-slate-500">
          Kunci disimpan di database. Kosongkan Server Key jika tidak ingin mengubah.
        </p>
        <input
          placeholder="Server Key"
          value={form.midtransServerKey}
          onChange={set("midtransServerKey")}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
        />
        <input
          placeholder="Client Key"
          value={form.midtransClientKey}
          onChange={set("midtransClientKey")}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
        />
        <input
          placeholder="Merchant ID (opsional)"
          value={form.midtransMerchantId}
          onChange={set("midtransMerchantId")}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={form.midtransProduction}
            onChange={set("midtransProduction")}
          />
          Mode production (nonaktif = sandbox)
        </label>
      </section>

      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-primary px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
      >
        {saving ? "Menyimpan..." : "Simpan ke Database"}
      </button>
    </form>
  );
}
