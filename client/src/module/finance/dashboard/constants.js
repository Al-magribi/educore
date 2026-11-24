import {
  AlertTriangle,
  Banknote,
  Layers3,
  Receipt,
  Scale,
  Users,
} from "lucide-react";

import { museCardStyle, museColors } from "../../../config/theme";

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

// Card "criclebox" Muse (CLAUDE.md §4).
export const cardBaseStyle = { ...museCardStyle, border: "none" };

export const statusColorMap = {
  Lunas: "green",
  Cicilan: "gold",
  Penarikan: "orange",
  Setoran: "cyan",
  Pengeluaran: "red",
  Pemasukan: "blue",
};

export const percentColor = (value) => {
  if (value >= 85) return museColors.success;
  if (value >= 65) return museColors.primary;
  if (value >= 45) return museColors.warning;
  return museColors.danger;
};

export const summaryIconMap = {
  fee_income_total: Layers3,
  expense_grand_total: Receipt,
  net_balance: Scale,
  fee_remaining_total: AlertTriangle,
  unpaid_student_count: Users,
};

// Tone kotak ikon StatCard (kunci museColors).
export const summaryToneMap = {
  fee_income_total: "success",
  expense_grand_total: "danger",
  net_balance: "primary",
  fee_remaining_total: "warning",
  unpaid_student_count: "accent",
};

export const heroIcon = Banknote;
