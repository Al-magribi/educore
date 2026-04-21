import { Card, Statistic } from "antd";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CircleDollarSign,
  CreditCard,
  WalletCards,
} from "lucide-react";
import { currencyFormatter } from "./parentTransactionShared";

const MotionDiv = motion.div;

const summaryStyles = [
  {
    title: "Total Tagihan",
    key: "total_due",
    icon: <CircleDollarSign size={18} />,
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    note: "Akumulasi SPP dan pembayaran lainnya.",
    bg: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
    color: "#1d4ed8",
  },
  {
    title: "Sudah Dibayar",
    key: "total_paid",
    icon: <BadgeCheck size={18} />,
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    note: "Nominal yang sudah teralokasi ke invoice.",
    bg: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
    color: "#15803d",
  },
  {
    title: "Sisa Tagihan",
    key: "total_remaining",
    icon: <WalletCards size={18} />,
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    note: "Sisa kewajiban yang belum lunas.",
    bg: "linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)",
    color: "#c2410c",
  },
  {
    title: "Item Terpantau",
    key: "total_items",
    icon: <CreditCard size={18} />,
    formatter: (value) => Number(value || 0),
    note: "Seluruh item pembayaran untuk periode ini.",
    bg: "linear-gradient(135deg, #f8fafc 0%, #eef2ff 100%)",
    color: "#475569",
  },
];

const ParentSummaryCards = ({ summary }) => (
  <div
    style={{
      display: "grid",
      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
      gap: 16,
    }}
  >
    {summaryStyles.map((item, index) => (
      <MotionDiv
        key={item.key}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.05 }}
      >
        <Card
          variant='borderless'
          style={{
            borderRadius: 24,
            background: item.bg,
            border: "1px solid rgba(148,163,184,0.14)",
            boxShadow: "0 18px 34px rgba(15,23,42,0.05)",
          }}
          styles={{ body: { padding: 20 } }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              marginBottom: 16,
              color: item.color,
              background: "rgba(255,255,255,0.65)",
            }}
          >
            {item.icon}
          </div>
          <Statistic
            title={item.title}
            value={summary?.[item.key] || 0}
            formatter={item.formatter}
          />
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#64748b",
            }}
          >
            {item.note}
          </div>
        </Card>
      </MotionDiv>
    ))}
  </div>
);

export default ParentSummaryCards;
