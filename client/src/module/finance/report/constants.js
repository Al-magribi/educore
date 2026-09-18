export const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const statusColorMap = {
  paid: "green",
  partial: "blue",
  unpaid: "gold",
};

export const statusLabelMap = {
  paid: "Lunas",
  partial: "Cicilan",
  unpaid: "Belum Bayar",
};

export const pageStyle = {
  minHeight: "100%",
  padding: 24,
  borderRadius: 16,
  background:
    "radial-gradient(circle at top left, rgba(14, 165, 233, 0.12), transparent 26%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
};

export const cardStyle = {
  borderRadius: 24,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
};

export const expenseCategoryLabelMap = {
  operational: "Operasional",
  utilities: "Utilitas",
  salary: "Gaji / Honor",
  maintenance: "Pemeliharaan",
  activity: "Kegiatan",
  supplies: "ATK / Perlengkapan",
  other: "Lainnya",
};

export const expenseCategoryColorMap = {
  operational: "geekblue",
  utilities: "cyan",
  salary: "purple",
  maintenance: "orange",
  activity: "green",
  supplies: "magenta",
  other: "default",
};

export const paymentMethodLabelMap = {
  cash: "Tunai",
  transfer: "Transfer",
  other: "Lainnya",
};

export const MODE_OPTIONS = [
  { value: "periode", label: "Satu periode utuh" },
  { value: "bulan", label: "Bulan" },
  { value: "rentang", label: "Rentang tanggal" },
];
