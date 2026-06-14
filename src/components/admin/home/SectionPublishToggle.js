"use client";

export function SectionPublishToggle({ isPublished, onChange, disabled }) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-[var(--admin-primary)] focus:ring-[var(--admin-ring)]"
        checked={isPublished}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
      />
      <span className="text-sm font-medium text-slate-700">
        {isPublished ? "Tayang di situs" : "Disembunyikan"}
      </span>
    </label>
  );
}
