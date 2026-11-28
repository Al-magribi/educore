import { museCardStyle } from "../../../config/theme";
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

// Latar halaman polos; struktur diberi oleh card (CLAUDE.md §3).
export const pageStyle = { minHeight: "100%" };

// Card "criclebox" Muse (CLAUDE.md §4).
export const cardStyle = { ...museCardStyle, border: "none" };

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
