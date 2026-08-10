import { Card, Col, Flex, Row, Statistic, Tooltip } from "antd";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CircleDollarSign,
  Layers3,
  Receipt,
  Scale,
  Target,
  Wallet,
  WalletCards,
} from "lucide-react";
import { Info } from "lucide-react";

import { cardStyle, currencyFormatter } from "../constants";

const MotionDiv = motion.div;

const cards = [
  {
    key: "spp_collected",
    title: "Realisasi SPP",
    note: "Kas masuk SPP sesuai filter (confirmed/paid).",
    icon: <CircleDollarSign size={18} />,
    color: "#15803d",
    bg: "linear-gradient(135deg, #dcfce7, #ecfdf5)",
  },
  {
    key: "other_collected",
    title: "Realisasi Lainnya",
    note: "Kas masuk pembayaran lainnya sesuai filter.",
    icon: <Wallet size={18} />,
    color: "#1d4ed8",
    bg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
  },
  {
    key: "fee_income_total",
    title: "Total Pendapatan Fee",
    note: "Gabungan realisasi SPP dan pembayaran lainnya.",
    icon: <Layers3 size={18} />,
    color: "#0f766e",
    bg: "linear-gradient(135deg, #ccfbf1, #f0fdfa)",
  },
  {
    key: "fee_remaining_total",
    title: "Sisa Tagihan",
    note: "Total kewajiban yang belum lunas pada cakupan laporan.",
    icon: <AlertTriangle size={18} />,
    color: "#d97706",
    bg: "linear-gradient(135deg, #fef3c7, #fff7ed)",
  },
  {
    key: "fee_target_total",
    title: "Target Netto",
    note: "Target tagihan setelah beasiswa (bukan kas masuk).",
    icon: <Target size={18} />,
    color: "#2563eb",
    bg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
  },
  {
    key: "unpaid_student_count",
    title: "Siswa Belum Lunas",
    note: "Jumlah siswa unik yang masih punya sisa tagihan.",
    icon: <AlertTriangle size={18} />,
    color: "#b45309",
    bg: "linear-gradient(135deg, #ffedd5, #fff7ed)",
    isCount: true,
  },
  {
    key: "expense_total",
    title: "Pengeluaran Operasional",
    note: "Total pengeluaran harian (operasional, kegiatan, dll.) sesuai filter.",
    icon: <Receipt size={18} />,
    color: "#dc2626",
    bg: "linear-gradient(135deg, #fee2e2, #fff1f2)",
  },
  {
    key: "honorarium_total",
    title: "Honorarium (Terkunci)",
    note: "Total payroll honorarium berstatus terkunci sesuai filter.",
    icon: <WalletCards size={18} />,
    color: "#9333ea",
    bg: "linear-gradient(135deg, #f3e8ff, #faf5ff)",
  },
  {
    key: "honorarium_draft_total",
    title: "Honorarium Draft (Komitmen)",
    note: "Payroll yang masih draft: kewajiban belum final dan tidak mengurangi saldo bersih.",
    icon: <WalletCards size={18} />,
    color: "#a16207",
    bg: "linear-gradient(135deg, #fef9c3, #fefce8)",
  },
  {
    key: "net_balance",
    title: "Saldo Bersih",
    note: "Pendapatan fee dikurangi pengeluaran operasional dan honorarium terkunci. Draft honorarium tidak mengurangi saldo.",
    icon: <Scale size={18} />,
    color: "#0f766e",
    bg: "linear-gradient(135deg, #ccfbf1, #f0fdfa)",
    signColored: true,
  },
];

const ReportSummaryCards = ({ summary = {} }) => (
  <Row gutter={[16, 16]}>
    {cards.map((item) => (
      <Col xs={24} sm={12} xl={8} key={item.key}>
        <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.18 }}>
          <Card style={cardStyle} styles={{ body: { padding: 18 } }}>
            <Flex align='flex-start' gap={12}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  display: "grid",
                  placeItems: "center",
                  background: item.bg,
                  color: item.color,
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Statistic
                  title={
                    <Flex align='center' gap={6}>
                      <span>{item.title}</span>
                      <Tooltip title={item.note}>
                        <Info
                          size={13}
                          color='#94a3b8'
                          style={{ cursor: "help" }}
                        />
                      </Tooltip>
                    </Flex>
                  }
                  value={summary[item.key] || 0}
                  valueStyle={
                    item.signColored
                      ? {
                          color:
                            Number(summary[item.key] || 0) >= 0
                              ? "#15803d"
                              : "#dc2626",
                        }
                      : undefined
                  }
                  formatter={(value) =>
                    item.isCount
                      ? Number(value || 0).toLocaleString("id-ID")
                      : currencyFormatter.format(value)
                  }
                />
              </div>
            </Flex>
          </Card>
        </MotionDiv>
      </Col>
    ))}
  </Row>
);

export default ReportSummaryCards;
