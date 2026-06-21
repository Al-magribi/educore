export const PERIOD_WIZARD_STEPS = [
  {
    id: 1,
    key: "gelombang",
    label: "Gelombang",
    description: "Tahun pelajaran, nama, jadwal, dan status aktif",
  },
  {
    id: 2,
    key: "persyaratan",
    label: "Persyaratan Keuangan",
    description: "Judul persyaratan dan daftar item biaya",
  },
  {
    id: 3,
    key: "item",
    label: "Item Biaya",
    description: "Frekuensi dan nominal per gelombang",
  },
];

export function getRecommendedStep(period) {
  if (!period) return 1;
  const itemCount = period.financialFees?.items?.length ?? 0;
  if (itemCount === 0) return 2;
  return 3;
}

export function getStepStatus(period, stepId) {
  if (!period) return stepId === 1 ? "current" : "upcoming";

  const itemCount = period.financialFees?.items?.length ?? 0;
  const hasRequirements = Boolean(period.financialFees?.title);

  if (stepId === 1) return "complete";
  if (stepId === 2) return itemCount > 0 || hasRequirements ? "complete" : "current";
  if (stepId === 3) {
    if (itemCount === 0) return "upcoming";
    const hasAmounts = period.financialFees.items.some((item) => item.amount > 0);
    return hasAmounts ? "complete" : "current";
  }

  return "upcoming";
}
