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

export const pageStyle = {
  minHeight: "100%",
  padding: 24,
  borderRadius: 16,
  background:
    "radial-gradient(circle at top left, rgba(14, 165, 233, 0.12), transparent 26%), linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%)",
};

export const cardStyle = {
  borderRadius: 24,
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.08)",
};
