import { museCardStyle } from "../../../../config/theme";
import dayjs from "dayjs";

// Card "criclebox" Muse (CLAUDE.md §4).
export const cardStyle = { ...museCardStyle, border: "none" };

export const currencyFormatter = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

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
