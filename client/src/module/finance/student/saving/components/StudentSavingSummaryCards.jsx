import { createElement } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  PiggyBank,
  Wallet,
} from "lucide-react";

import { museColors } from "../../../../../config/theme";
import FinanceStatGrid from "../../../shared/FinanceStatGrid";
import { currencyFormatter } from "../constants";

const items = [
  {
    key: "balance",
    title: "Saldo Tabungan",
    valueKey: "balance",
    icon: Wallet,
    color: museColors.primary,
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
  },
  {
    key: "deposit",
    title: "Total Setoran",
    valueKey: "total_deposit",
    icon: ArrowDownToLine,
    color: museColors.success,
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
  },
  {
    key: "withdrawal",
    title: "Total Penarikan",
    valueKey: "total_withdrawal",
    icon: ArrowUpFromLine,
    color: museColors.accent,
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
  },
  {
    key: "transaction_count",
    title: "Jumlah Transaksi",
    valueKey: "transaction_count",
    icon: PiggyBank,
    color: museColors.purple,
  },
];

const StudentSavingSummaryCards = ({ summary }) => (
  <FinanceStatGrid
    items={items.map(({ icon: IconComponent, valueKey, formatter, ...item }) => {
      const value = summary?.[valueKey] || 0;

      return {
        ...item,
        icon: createElement(IconComponent, { size: 18 }),
        value: formatter ? formatter(value) : Number(value).toLocaleString("id-ID"),
      };
    })}
  />
);

export default StudentSavingSummaryCards;
