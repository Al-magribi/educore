"use client";

export function GelombangStepForm({ form, onChange, onSubmit, onCancel, saving, submitLabel }) {
  const setField = (key, value) => onChange((current) => ({ ...current, [key]: value }));

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Buat / Edit Gelombang</h3>
        <p className="mt-1 text-sm text-slate-600">
          Tentukan gelombang pendaftaran, jadwal buka/tutup, dan apakah gelombang ini aktif.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Tahun pelajaran</span>
          <input
            type="text"
            required
            placeholder="2026/2027"
            value={form.academicYear}
            onChange={(e) => setField("academicYear", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Nama gelombang</span>
          <input
            type="text"
            required
            placeholder="Gelombang 1"
            value={form.name}
            onChange={(e) => setField("name", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Tanggal buka</span>
          <input
            type="date"
            required
            value={form.opensAt}
            onChange={(e) => setField("opensAt", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium text-slate-700">Tanggal tutup</span>
          <input
            type="date"
            required
            value={form.closesAt}
            onChange={(e) => setField("closesAt", e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            className="mt-1"
            checked={form.isActive}
            onChange={(e) => setField("isActive", e.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium text-slate-900">Aktifkan gelombang ini</span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Hanya satu gelombang yang boleh aktif. Gelombang aktif digunakan untuk pendaftaran
              SPMB saat ini.
            </span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1d4ed8] disabled:opacity-60"
        >
          {saving ? "Menyimpan..." : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
        ) : null}
      </div>
    </form>
  );
}
