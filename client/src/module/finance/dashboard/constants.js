import {
  AlertTriangle,
  Banknote,
  Layers3,
  Receipt,
  Scale,
  Users,
} from "lucide-react";

export const currency = (value) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export const formatDateTime = (value) => {
  if (!value) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
};

export const cardBaseStyle = {
  borderRadius: 20,
  border: "1px solid rgba(148,163,184,0.14)",
  boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
  background: "rgba(255,255,255,0.96)",
};

export const statusColorMap = {
  Lunas: "green",
  Cicilan: "gold",
  Penarikan: "orange",
  Setoran: "cyan",
  Pengeluaran: "red",
  Pemasukan: "blue",
};

export const percentColor = (value) => {
  if (value >= 85) return "#15803d";
  if (value >= 65) return "#2563eb";
  if (value >= 45) return "#d97706";
  return "#dc2626";
};

export const summaryIconMap = {
  fee_income_total: Layers3,
  expense_grand_total: Receipt,
  net_balance: Scale,
  fee_remaining_total: AlertTriangle,
  unpaid_student_count: Users,
};

export const summaryToneMap = {
  fee_income_total: {
    color: "#0f766e",
    bg: "linear-gradient(135deg, #ccfbf1, #f0fdfa)",
  },
  expense_grand_total: {
    color: "#dc2626",
    bg: "linear-gradient(135deg, #fee2e2, #fff1f2)",
  },
  net_balance: {
    color: "#0f766e",
    bg: "linear-gradient(135deg, #ccfbf1, #f0fdfa)",
  },
  fee_remaining_total: {
    color: "#d97706",
    bg: "linear-gradient(135deg, #fef3c7, #fff7ed)",
  },
  unpaid_student_count: {
    color: "#b45309",
    bg: "linear-gradient(135deg, #ffedd5, #fff7ed)",
  },
};

export const heroIcon = Banknote;
