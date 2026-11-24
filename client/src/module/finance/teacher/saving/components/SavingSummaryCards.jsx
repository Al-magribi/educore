import { createElement, memo } from "react";
import { PiggyBank, Users, WalletCards } from "lucide-react";

import { museColors } from "../../../../../config/theme";
import FinanceStatGrid from "../../../shared/FinanceStatGrid";
import { currencyFormatter } from "../constants";

const items = [
  {
    key: "students",
    title: "Total Siswa",
    dataKey: "total_students",
    icon: Users,
    color: museColors.primary,
    tooltip: "Jumlah siswa yang masuk dalam cakupan filter aktif.",
  },
  {
    key: "active",
    title: "Sudah Menabung",
    dataKey: "active_students",
    icon: PiggyBank,
    color: museColors.success,
    tooltip: "Siswa yang sudah memiliki minimal satu transaksi tabungan.",
  },
  {
    key: "balance",
    title: "Saldo",
    dataKey: "total_balance",
    icon: WalletCards,
    color: museColors.purple,
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    tooltip: "Akumulasi saldo tabungan seluruh siswa pada cakupan aktif.",
  },
  {
    key: "deposit",
    title: "Total Setoran",
    dataKey: "total_deposit",
    icon: PiggyBank,
    color: museColors.success,
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    tooltip: "Akumulasi seluruh setoran yang pernah tercatat.",
  },
];

const SavingSummaryCards = ({ summary }) => (
  <FinanceStatGrid
    items={items.map(({ icon: IconComponent, dataKey, formatter, tooltip, ...item }) => {
      const value = summary?.[dataKey] || 0;

      return {
        ...item,
        note: tooltip,
        icon: createElement(IconComponent, { size: 18 }),
        value: formatter ? formatter(value) : Number(value).toLocaleString("id-ID"),
      };
    })}
  />
);

export default memo(SavingSummaryCards);
