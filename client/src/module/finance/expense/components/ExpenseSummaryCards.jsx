import { CalendarDays, CalendarRange } from "lucide-react";

import { museColors } from "../../../../config/theme";
import FinanceStatGrid from "../../shared/FinanceStatGrid";
import { currencyFormatter } from "../constants";

const ExpenseSummaryCards = ({ summary = {} }) => {
  const items = [
    {
      title: "Pengeluaran Harian",
      value: summary.daily_amount || 0,
      note: `${summary.daily_count || 0} transaksi hari ini`,
      icon: <CalendarDays size={18} />,
      color: museColors.accent,
    },
    {
      title: "Pengeluaran Bulanan",
      value: summary.monthly_amount || 0,
      note: `${summary.monthly_count || 0} transaksi bulan ini`,
      icon: <CalendarRange size={18} />,
      color: museColors.danger,
    },
  ];

  return (
    <FinanceStatGrid
      minWidth={260}
      items={items.map((item) => ({
        ...item,
        value: currencyFormatter.format(Number(item.value || 0)),
        noteAsText: true,
      }))}
    />
  );
};

export default ExpenseSummaryCards;
