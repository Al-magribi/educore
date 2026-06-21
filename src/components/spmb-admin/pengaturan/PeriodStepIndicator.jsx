import { PERIOD_WIZARD_STEPS } from "@/components/spmb-admin/pengaturan/period-steps.js";

const statusStyles = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-800",
  current: "border-primary bg-primary/5 text-primary",
  upcoming: "border-slate-200 bg-white text-slate-500",
};

export function PeriodStepIndicator({ currentStep, onStepClick, period }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-3">
      {PERIOD_WIZARD_STEPS.map((step) => {
        const isCurrent = step.id === currentStep;
        const status = isCurrent ? "current" : period ? (step.id < currentStep ? "complete" : "upcoming") : step.id === 1 ? "current" : "upcoming";

        return (
          <li key={step.id}>
            <button
              type="button"
              onClick={() => onStepClick?.(step.id)}
              disabled={!period && step.id > 1}
              className={`flex w-full items-start gap-3 rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${statusStyles[status]}`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                  status === "current"
                    ? "bg-primary text-white"
                    : status === "complete"
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-100 text-slate-500"
                }`}
              >
                {status === "complete" && !isCurrent ? "✓" : step.id}
              </span>
              <span>
                <span className="block text-sm font-semibold">{step.label}</span>
                <span className="mt-0.5 block text-xs opacity-80">{step.description}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
