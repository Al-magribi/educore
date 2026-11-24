import {
  BadgeCheck,
  CircleDollarSign,
  ShieldAlert,
  WalletCards,
} from "lucide-react";

import { museColors } from "../../../../../config/theme";
import FinanceStatGrid from "../../../shared/FinanceStatGrid";
import { currencyFormatter } from "./parentTransactionShared";

const summaryStyles = [
  {
    title: "Total Tagihan",
    key: "total_due",
    icon: <CircleDollarSign size={18} />,
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    note: "Akumulasi SPP dan pembayaran lainnya.",
    color: museColors.primary,
  },
  {
    title: "Sudah Dibayar",
    key: "total_paid",
    icon: <BadgeCheck size={18} />,
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    note: "Nominal yang sudah teralokasi ke invoice.",
    color: museColors.success,
  },
  {
    title: "Sisa Tagihan",
    key: "total_remaining",
    icon: <WalletCards size={18} />,
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    note: "Sisa kewajiban yang belum lunas.",
    color: museColors.accent,
  },

  {
    title: "Menunggu Verifikasi",
    key: "pending_count",
    icon: <ShieldAlert size={18} />,
    formatter: (value) => Number(value || 0),
    note: "Tagihan dengan pembayaran yang masih diproses admin atau gateway.",
    color: museColors.cyan,
  },
];

const ParentSummaryCards = ({ summary }) => (
  <FinanceStatGrid
    items={summaryStyles.map(({ formatter, ...item }) => ({
      ...item,
      value: formatter(summary?.[item.key] || 0),
    }))}
  />
);

export default ParentSummaryCards;
