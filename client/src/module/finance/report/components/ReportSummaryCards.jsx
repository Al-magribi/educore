import { AlertTriangle, Layers3, Receipt, Scale, Users } from "lucide-react";

import { museColors } from "../../../../config/theme";
import FinanceStatGrid from "../../shared/FinanceStatGrid";
import { currencyFormatter } from "../constants";

const cards = [
  {
    key: "fee_income_total",
    title: "Pendapatan Fee",
    note: "Kas masuk SPP + pembayaran lainnya (confirmed/paid) sesuai filter.",
    icon: <Layers3 size={18} />,
    color: museColors.success,
  },
  {
    key: "expense_grand_total",
    title: "Total Pengeluaran",
    note: "Pengeluaran operasional + honorarium terkunci. Draft honorarium tidak termasuk.",
    icon: <Receipt size={18} />,
    color: museColors.danger,
  },
  {
    key: "net_balance",
    title: "Saldo Bersih",
    note: "Pendapatan fee dikurangi total pengeluaran. Draft honorarium tidak mengurangi saldo.",
    icon: <Scale size={18} />,
    color: museColors.success,
    signColored: true,
  },
  {
    key: "fee_remaining_total",
    title: "Sisa Tagihan",
    note: "Total kewajiban siswa yang belum lunas pada cakupan laporan.",
    icon: <AlertTriangle size={18} />,
    color: museColors.accent,
  },
  {
    key: "unpaid_student_count",
    title: "Siswa Belum Lunas",
    note: "Jumlah siswa unik yang masih punya sisa tagihan.",
    icon: <Users size={18} />,
    color: museColors.accent,
    isCount: true,
  },
];

const signColor = (value) => (value >= 0 ? museColors.success : museColors.danger);

const ReportSummaryCards = ({ summary = {} }) => (
  <FinanceStatGrid
    items={cards.map(({ signColored, isCount, ...item }) => {
      const raw = Number(summary[item.key] || 0);

      return {
        ...item,
        value: isCount ? raw.toLocaleString("id-ID") : currencyFormatter.format(raw),
        valueColor: signColored ? signColor(raw) : undefined,
      };
    })}
  />
);

export default ReportSummaryCards;
