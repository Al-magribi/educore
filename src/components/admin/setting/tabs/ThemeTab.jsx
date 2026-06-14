"use client";

import { useEffect, useState } from "react";
import { Field, FormMessage, SaveButton, TextInput } from "@/components/admin/home/AdminFormFields.js";
import { DEFAULT_THEME } from "@/config/site.js";
import { toAdminThemeVars } from "@/lib/admin/theme-vars.js";

const PRESETS = [
  {
    id: "blue",
    label: "Biru Teknologi",
    theme: {
      primary: "#2563eb",
      primaryForeground: "#ffffff",
      secondary: "#1e40af",
      accent: "#3b82f6",
    },
  },
  {
    id: "emerald",
    label: "Hijau Segar",
    theme: {
      primary: "#059669",
      primaryForeground: "#ffffff",
      secondary: "#047857",
      accent: "#10b981",
    },
  },
  {
    id: "violet",
    label: "Ungu Modern",
    theme: {
      primary: "#7c3aed",
      primaryForeground: "#ffffff",
      secondary: "#5b21b6",
      accent: "#8b5cf6",
    },
  },
  {
    id: "rose",
    label: "Merah Muda",
    theme: {
      primary: "#e11d48",
      primaryForeground: "#ffffff",
      secondary: "#be123c",
      accent: "#f43f5e",
    },
  },
];

const empty = {
  primary: DEFAULT_THEME.primary,
  primaryForeground: DEFAULT_THEME.primaryForeground,
  secondary: DEFAULT_THEME.secondary,
  accent: DEFAULT_THEME.accent,
};

function applyThemePreview(theme) {
  const vars = toAdminThemeVars(theme);
  const root = document.querySelector(".admin-root");
  if (!root) return;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
}

function ColorField({ label, value, onChange }) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
        />
        <TextInput
          value={value}
          onChange={(e) => onChange(e.target.value)}
          pattern="^#[0-9A-Fa-f]{6}$"
        />
      </div>
    </Field>
  );
}

export function ThemeTab() {
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    let active = true;

    fetch("/api/admin/theme-settings")
      .then((r) => r.json())
      .then((data) => {
        if (!active || !data.theme) return;
        setForm({
          primary: data.theme.primary ?? empty.primary,
          primaryForeground: data.theme.primaryForeground ?? empty.primaryForeground,
          secondary: data.theme.secondary ?? empty.secondary,
          accent: data.theme.accent ?? empty.accent,
        });
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    const frame = requestAnimationFrame(() => {
      applyThemePreview(form);
    });

    return () => cancelAnimationFrame(frame);
  }, [form, loading]);

  const setColor = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const applyPreset = (preset) => {
    setForm({ ...preset.theme });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/theme-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, isCustom: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Gagal menyimpan");
      if (data.theme) {
        setForm({
          primary: data.theme.primary,
          primaryForeground: data.theme.primaryForeground,
          secondary: data.theme.secondary,
          accent: data.theme.accent,
        });
      }
      setMessage({ type: "success", text: data.message });
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-500">Memuat tema...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormMessage message={message} />

      <div>
        <p className="text-sm font-medium text-slate-700">Preset cepat</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset)}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-[var(--admin-primary)]"
            >
              <span
                className="h-5 w-5 rounded-full ring-1 ring-slate-200"
                style={{ background: preset.theme.primary }}
              />
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <ColorField label="Primary" value={form.primary} onChange={setColor("primary")} />
        <ColorField
          label="Primary Foreground"
          value={form.primaryForeground}
          onChange={setColor("primaryForeground")}
        />
        <ColorField label="Secondary" value={form.secondary} onChange={setColor("secondary")} />
        <ColorField label="Accent" value={form.accent} onChange={setColor("accent")} />
      </div>

      <div className="rounded-xl border border-slate-200 p-4">
        <p className="text-sm font-medium text-slate-700">Pratinjau</p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: form.primary, color: form.primaryForeground }}
          >
            Tombol Primary
          </button>
          <span
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
            style={{ background: form.secondary }}
          >
            Secondary
          </span>
          <span
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-white"
            style={{ background: form.accent }}
          >
            Accent
          </span>
        </div>
      </div>

      <SaveButton saving={saving} />
    </form>
  );
}
