export const POINT_TYPE_LABELS = {
  reward: "Penghargaan",
  punishment: "Pelanggaran",
};

export const buildRuleSelectOptions = (catalog) =>
  ["reward", "punishment"].flatMap((type) =>
    (catalog?.[type] || [])
      .filter((category) => (category.rules || []).length)
      .map((category) => ({
        label: `${POINT_TYPE_LABELS[type]} · ${category.name}`,
        options: category.rules.map((rule) => ({
          value: rule.id,
          label: `${rule.name} • ${rule.point_value} poin`,
        })),
      })),
  );

export const formatPointDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};
