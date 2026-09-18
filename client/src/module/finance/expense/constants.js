export const pageStyle = {
  minHeight: "100%",
  padding: 24,
  borderRadius: 16,
  background:
    "radial-gradient(circle at top left, rgba(234, 88, 12, 0.1), transparent 26%), linear-gradient(180deg, #f8fafc 0%, #fff7ed 100%)",
};

export const cardStyle = {
  borderRadius: 24,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
};

export const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const rupiahInputProps = {
  min: 0,
  precision: 0,
  style: { width: "100%" },
  formatter: (value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, "."),
  parser: (value) => String(value || "").replace(/\./g, ""),
};

export const categoryLabel = {
  operational: "Operasional",
  utilities: "Utilitas",
  salary: "Gaji / Honor",
  maintenance: "Pemeliharaan",
  activity: "Kegiatan",
  supplies: "ATK / Perlengkapan",
  other: "Lainnya",
};

export const categoryColor = {
  operational: "blue",
  utilities: "cyan",
  salary: "purple",
  maintenance: "orange",
  activity: "magenta",
  supplies: "geekblue",
  other: "default",
};

export const paymentMethodLabel = {
  cash: "Tunai",
  transfer: "Transfer",
  other: "Lainnya",
};
