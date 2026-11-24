import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  CreditCard,
  Gift,
  Wallet,
} from "lucide-react";

import { museColors } from "../../../../../config/theme";
import FinanceStatGrid from "../../../shared/FinanceStatGrid";
import { currencyFormatter } from "../constants";

const OthersSummaryCards = ({ summary }) => {
  const items = [
    {
      title: "Total Tagihan",
      value: summary.total_records || 0,
      formatter: (value) => value,
      note: "Seluruh tagihan non-SPP sesuai filter",
      icon: <CreditCard size={18} />,
      color: museColors.primary,
    },
    {
      title: "Belum Bayar",
      value: summary.unpaid_count || 0,
      formatter: (value) => value,
      note: "Tagihan yang belum memiliki pembayaran",
      icon: <AlertTriangle size={18} />,
      color: museColors.accent,
    },
    {
      title: "Masih Cicilan",
      value: summary.partial_count || 0,
      formatter: (value) => value,
      note: "Tagihan yang baru dibayar sebagian",
      icon: <Coins size={18} />,
      color: museColors.purple,
    },
    {
      title: "Sudah Lunas",
      value: summary.paid_count || 0,
      formatter: (value) => value,
      note: "Tagihan yang telah tertutup seluruhnya",
      icon: <CheckCircle2 size={18} />,
      color: museColors.success,
    },
    {
      title: "Total Netto",
      value: summary.total_due || 0,
      formatter: (value) => currencyFormatter.format(Number(value || 0)),
      note: `Bruto ${currencyFormatter.format(Number(summary.total_bruto || 0))}`,
      icon: <Wallet size={18} />,
      color: museColors.primary,
    },
    {
      title: "Cover Beasiswa",
      value: summary.total_scholarship_cover || 0,
      formatter: (value) => currencyFormatter.format(Number(value || 0)),
      note: "Potongan beasiswa (bukan kas masuk)",
      icon: <Gift size={18} />,
      color: museColors.primary,
    },
    {
      title: "Sudah Dibayar",
      value: summary.total_paid || 0,
      formatter: (value) => currencyFormatter.format(Number(value || 0)),
      note: "Total pembayaran yang sudah masuk",
      icon: <CircleDollarSign size={18} />,
      color: museColors.success,
    },
  ];

  return (
    <FinanceStatGrid
      items={items.map(({ formatter, ...item }) => ({
        ...item,
        value: formatter(item.value),
      }))}
    />
  );
};

export default OthersSummaryCards;
