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
  formatter: (value) =>
    `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, "."),
  parser: (value) => String(value || "").replace(/\./g, ""),
};

export const benefitTargetLabel = {
  spp: "SPP",
  other: "Pembayaran Lainnya",
};

export const benefitTypeLabel = {
  fixed: "Nominal",
  full: "Gratis",
};

export const monthKey = (periodeId, monthNum) => `${periodeId}:${monthNum}`;

export const parseMonthKey = (key) => {
  const [periodeId, monthNum] = String(key || "").split(":");
  return {
    periode_id: Number(periodeId) || null,
    month_num: Number(monthNum) || null,
  };
};
