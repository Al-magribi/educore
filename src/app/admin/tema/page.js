export default function AdminTemaPage() {
  return (
    <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: "var(--admin-surface-border)" }}>
      <h1 className="text-2xl font-bold text-slate-900">Palet warna</h1>
      <p className="mt-2 max-w-2xl text-slate-600">
        Primary default biru (<code className="text-sm">#2563eb</code>). Nilai disimpan di{" "}
        <code className="text-sm">theme_settings</code> dan diterapkan ke seluruh admin melalui
        variabel CSS <code className="text-sm">--admin-primary</code>,{" "}
        <code className="text-sm">--admin-secondary</code>, dan{" "}
        <code className="text-sm">--admin-accent</code>.
      </p>
      <div className="mt-6 flex flex-wrap gap-4">
        {[
          { label: "Primary", var: "--admin-primary" },
          { label: "Secondary", var: "--admin-secondary" },
          { label: "Accent", var: "--admin-accent" },
        ].map((swatch) => (
          <div key={swatch.var} className="flex items-center gap-3">
            <span
              className="h-12 w-12 rounded-xl ring-1 ring-slate-200"
              style={{ background: `var(${swatch.var})` }}
            />
            <div>
              <p className="text-sm font-medium text-slate-900">{swatch.label}</p>
              <p className="font-mono text-xs text-slate-500">{swatch.var}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
