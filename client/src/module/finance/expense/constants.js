import { museCardStyle } from "../../../config/theme";
// Latar halaman polos; struktur diberi oleh card (CLAUDE.md §3).
export const pageStyle = { minHeight: "100%" };

// Card "criclebox" Muse (CLAUDE.md §4).
export const cardStyle = { ...museCardStyle, border: "none" };

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
