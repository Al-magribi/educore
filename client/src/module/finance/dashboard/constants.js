import {
  Banknote,
  CreditCard,
  Landmark,
  PiggyBank,
  Wallet,
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
  borderRadius: 28,
  border: "1px solid rgba(148,163,184,0.14)",
  boxShadow: "0 24px 60px rgba(15,23,42,0.07)",
  background: "rgba(255,255,255,0.9)",
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
  revenue: Banknote,
  spp: CreditCard,
  savings: PiggyBank,
  cash: Wallet,
};

export const summaryToneMap = {
  revenue: {
    color: "#0f766e",
    bg: "linear-gradient(135deg, #ccfbf1, #d1fae5)",
  },
  spp: { color: "#2563eb", bg: "linear-gradient(135deg, #dbeafe, #eff6ff)" },
  savings: {
    color: "#15803d",
    bg: "linear-gradient(135deg, #dcfce7, #f0fdf4)",
  },
  cash: { color: "#7c3aed", bg: "linear-gradient(135deg, #ede9fe, #f5f3ff)" },
};

export const heroIcon = Landmark;
