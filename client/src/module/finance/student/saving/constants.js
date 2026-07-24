import dayjs from "dayjs";

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
