import dayjs from "dayjs";

export const pageStyle = {
  minHeight: "100%",
  padding: 24,
  borderRadius: 16,
  background:
    "radial-gradient(circle at top left, rgba(14, 165, 233, 0.12), transparent 24%), linear-gradient(180deg, #f8fafc 0%, #eef6ff 100%)",
};

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

export const mapTransactionFormValues = (record) => ({
  student_id: record?.student_id || undefined,
  transaction_type: record?.transaction_type || "income",
  amount: Number(record?.amount || 0) || undefined,
  transaction_date: record?.transaction_date
    ? dayjs(record.transaction_date)
    : dayjs(),
  description: record?.description || undefined,
});
