import { museCardStyle } from "../../../../config/theme";
export const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: "easeOut",
      staggerChildren: 0.08,
    },
  },
};

export const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: "easeOut",
    },
  },
};

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
  formatter: (value) =>
    value === undefined || value === null || value === ""
      ? ""
      : `Rp ${new Intl.NumberFormat("id-ID").format(Number(value))}`,
  parser: (value) => value?.replace(/[^\d]/g, "") || "",
};

export const chargeStatusColorMap = {
  unpaid: "gold",
  partial: "blue",
  paid: "green",
};

export const chargeStatusLabelMap = {
  unpaid: "Belum Bayar",
  partial: "Cicilan",
  paid: "Lunas",
};
