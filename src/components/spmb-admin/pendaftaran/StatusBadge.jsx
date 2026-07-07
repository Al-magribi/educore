import { statusLabels, statusTone } from "./constants.js";

export function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${
        statusTone[status] ?? "bg-slate-100 text-slate-700 ring-slate-200"
      }`}
    >
      {statusLabels[status] ?? status}
    </span>
  );
}
