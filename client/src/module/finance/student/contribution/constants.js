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

export const transactionTypeOptions = [
  { value: "income", label: "Pemasukan" },
  { value: "expense", label: "Pengeluaran" },
];

export const formatDateTime = (value) =>
  value ? dayjs(value).format("DD MMM YYYY HH:mm") : "-";

export const transactionTypeLabel = (value) => {
  if (value === "income") {
    return "Pemasukan";
  }

  if (value === "expense") {
    return "Pengeluaran";
  }

  return value || "-";
};

export const mapTransactionFormValues = (record) => ({
  student_id: record?.student_id || undefined,
  transaction_type: record?.transaction_type || "income",
  amount: Number(record?.amount || 0) || undefined,
  transaction_date: record?.transaction_date
    ? dayjs(record.transaction_date)
    : dayjs(),
  description: record?.description || undefined,
});
