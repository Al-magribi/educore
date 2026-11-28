import { museCardStyle } from "../../../../config/theme";
import dayjs from "dayjs";

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

export const transactionTypeMeta = {
  deposit: {
    label: "Setoran",
    color: "green",
  },
  withdrawal: {
    label: "Penarikan",
    color: "gold",
  },
};

export const formatSavingDate = (value) =>
  value ? dayjs(value).format("DD MMM YYYY") : "-";
