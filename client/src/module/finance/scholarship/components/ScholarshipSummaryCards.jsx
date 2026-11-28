import { Award, CheckCircle2, Gift, Users } from "lucide-react";

import { museColors } from "../../../../config/theme";
import FinanceStatGrid from "../../shared/FinanceStatGrid";
import { currencyFormatter } from "../constants";

const ScholarshipSummaryCards = ({ summary = {} }) => {
  const items = [
    {
      title: "Total Beasiswa",
      value: summary.total || 0,
      note: "Semua program beasiswa",
      icon: <Award size={18} />,
      color: museColors.primary,
      format: (v) => v,
    },
    {
      title: "Aktif",
      value: summary.active || 0,
      note: "Sedang berlaku untuk penerima",
      icon: <CheckCircle2 size={18} />,
      color: museColors.success,
      format: (v) => v,
    },
    {
      title: "Total Penerima",
      value: summary.students || 0,
      note: "Siswa aktif di semua beasiswa",
      icon: <Users size={18} />,
      color: museColors.purple,
      format: (v) => v,
    },
    {
      title: "Total Cover",
      value: summary.total_cover || 0,
      note: `SPP ${currencyFormatter.format(Number(summary.spp_cover || 0))} · Lainnya ${currencyFormatter.format(Number(summary.other_cover || 0))}`,
      icon: <Gift size={18} />,
      color: museColors.primary,
      format: (v) => currencyFormatter.format(Number(v || 0)),
    },
  ];

  return (
    <FinanceStatGrid
      items={items.map(({ format, ...item }) => ({
        ...item,
        value: format(item.value),
        noteAsText: true,
      }))}
    />
  );
};

export default ScholarshipSummaryCards;
