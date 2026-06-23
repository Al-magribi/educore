export function FormMessage({ message }) {
  if (!message) return null;
  return (
    <p
      className={`rounded-xl px-4 py-3 text-sm ${
        message.type === "success"
          ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
          : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
      }`}
    >
      {message.text}
    </p>
  );
}

export function Field({ label, hint, children, className = "" }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium text-slate-700">{label}</span>
      {hint ? <span className="mt-0.5 block text-xs text-slate-500">{hint}</span> : null}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-[var(--admin-primary)] focus:ring-2 focus:ring-[var(--admin-ring)]";

export function TextInput({ className = "", ...props }) {
  return <input className={`${inputClass} ${className}`.trim()} {...props} />;
}

export function TextArea({ className = "", ...props }) {
  return (
    <textarea
      className={`${inputClass} min-h-[100px] resize-y ${className}`.trim()}
      {...props}
    />
  );
}

export function SelectInput({ className = "", ...props }) {
  return (
    <div className="relative">
      <select
        className={`${inputClass} appearance-none pr-10 ${className}`.trim()}
        {...props}
      />
      <svg
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
    </div>
  );
}

export function RupiahInput({ value, onValueChange, className = "", ...props }) {
  const display = new Intl.NumberFormat("id-ID").format(Math.max(0, Number(value) || 0));

  const handleChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "");
    const numeric = digits === "" ? 0 : Math.max(0, Number(digits) || 0);
    onValueChange?.(numeric);
  };

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-500">
        Rp
      </span>
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        className={`${inputClass} pl-10 text-right tabular-nums ${className}`.trim()}
        {...props}
      />
    </div>
  );
}

export function SaveButton({ saving, children = "Simpan", form }) {
  return (
    <button
      type="submit"
      form={form}
      disabled={saving}
      className="rounded-xl px-6 py-2.5 text-sm font-semibold text-white shadow-md transition disabled:opacity-60"
      style={{
        background: "var(--admin-primary)",
        boxShadow: "0 4px 14px color-mix(in srgb, var(--admin-primary) 35%, transparent)",
      }}
    >
      {saving ? "Menyimpan..." : children}
    </button>
  );
}
