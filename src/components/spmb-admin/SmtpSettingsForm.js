"use client";

import { useEffect, useState } from "react";

const empty = {
  enabled: false,
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  user: "",
  password: "",
  fromName: "",
  fromEmail: "",
};

export function SmtpSettingsForm() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    fetch("/api/spmb-admin/smtp-settings")
      .then((r) => r.json())
      .then((data) => {
        if (data.settings) {
          setForm({
            enabled: data.settings.enabled,
            host: data.settings.host,
            port: data.settings.port,
            secure: data.settings.secure,
            user: data.settings.user ?? "",
            password: data.settings.password ?? "",
            fromName: data.settings.fromName ?? "",
            fromEmail: data.settings.fromEmail ?? "",
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
      const res = await fetch("/api/spmb-admin/smtp-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          port: Number(form.port),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.settings) {
        setForm((f) => ({ ...f, password: data.settings.password ?? "" }));
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
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-6">
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

      <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
        <input type="checkbox" checked={form.enabled} onChange={set("enabled")} />
        Aktifkan pengiriman email SMTP
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="text-sm font-medium text-slate-700">Host</span>
          <input
            value={form.host}
            onChange={set("host")}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Port</span>
          <input
            type="number"
            value={form.port}
            onChange={set("port")}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="flex items-end gap-2 pb-2 text-sm">
          <input type="checkbox" checked={form.secure} onChange={set("secure")} />
          SSL/TLS (secure)
        </label>
      </div>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Username / Email</span>
        <input
          type="email"
          value={form.user}
          onChange={set("user")}
          placeholder="akun@gmail.com"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </label>

      <label className="block">
        <span className="text-sm font-medium text-slate-700">Password / App Password</span>
        <input
          type="password"
          value={form.password}
          onChange={set("password")}
          placeholder="Kosongkan jika tidak mengubah"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <p className="mt-1 text-xs text-slate-500">
          Untuk Gmail gunakan App Password. Disimpan terenkripsi di database jika{" "}
          <code className="text-primary">SETTINGS_ENCRYPTION_KEY</code> diset.
        </p>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Nama pengirim</span>
          <input
            value={form.fromName}
            onChange={set("fromName")}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Email pengirim</span>
          <input
            type="email"
            value={form.fromEmail}
            onChange={set("fromEmail")}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
      </div>

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
