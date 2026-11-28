import { museCardStyle } from "../../../../config/theme";
import dayjs from "dayjs";

export const currentMonth = dayjs().month() + 1;
export const currentYear = dayjs().year();

export const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

export const statusColorMap = {
  paid: "green",
  unpaid: "gold",
  overdue: "red",
};

export const statusLabelMap = {
  paid: "Lunas",
  unpaid: "Belum Bayar",
  overdue: "Terlambat",
};

// Latar halaman polos; struktur diberi oleh card (CLAUDE.md §3).
export const pageStyle = { minHeight: "100%" };

// Card "criclebox" Muse (CLAUDE.md §4).
export const cardStyle = { ...museCardStyle, border: "none" };
