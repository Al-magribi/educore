import { CheckCircle2, UserCog, Users, Wallet } from "lucide-react";

import { museColors } from "../../../../../config/theme";
import FinanceStatGrid from "../../../shared/FinanceStatGrid";
import { currencyFormatter } from "../constants";

const StudentContributionSummaryCards = ({ summary }) => {
  const items = [
    {
      title: "Saldo Kas",
      value: summary.balance || 0,
      color: museColors.success,
      icon: <Wallet size={18} />,
      currency: true,
    },
    {
      title: "Sudah Bayar",
      value: summary.paid_students || 0,
      color: museColors.success,
      icon: <CheckCircle2 size={18} />,
    },
    {
      title: "Belum Bayar",
      value: summary.unpaid_students || 0,
      color: museColors.accent,
      icon: <Users size={18} />,
    },
    {
      title: "Petugas Aktif",
      value: summary.active_officers || 0,
      color: museColors.primary,
      icon: <UserCog size={18} />,
    },
  ];

  return (
    <FinanceStatGrid
      items={items.map(({ currency, ...item }) => ({
        ...item,
        value: currency
          ? currencyFormatter.format(Number(item.value || 0))
          : Number(item.value || 0).toLocaleString("id-ID"),
      }))}
    />
  );
};

export default StudentContributionSummaryCards;
