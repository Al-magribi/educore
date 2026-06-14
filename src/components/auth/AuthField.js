"use client";

export function AuthField({
  id,
  label,
  type = "text",
  placeholder,
  value,
  onChange,
  error,
  required,
  autoComplete,
  hint,
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 ${
          error
            ? "border-red-300 focus:border-red-400"
            : "border-slate-200 focus:border-primary"
        }`}
      />
      {hint && !error && <p className="text-xs text-slate-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
