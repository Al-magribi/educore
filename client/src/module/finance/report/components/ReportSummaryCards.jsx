import { Card, Col, Flex, Row, Statistic, Tooltip } from "antd";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  Layers3,
  Receipt,
  Scale,
  Users,
} from "lucide-react";
import { Info } from "lucide-react";

import { cardStyle, currencyFormatter } from "../constants";

const MotionDiv = motion.div;

const cards = [
  {
    key: "fee_income_total",
    title: "Pendapatan Fee",
    note: "Kas masuk SPP + pembayaran lainnya (confirmed/paid) sesuai filter.",
    icon: <Layers3 size={18} />,
    color: "#0f766e",
    bg: "linear-gradient(135deg, #ccfbf1, #f0fdfa)",
  },
  {
    key: "expense_grand_total",
    title: "Total Pengeluaran",
    note: "Pengeluaran operasional + honorarium terkunci. Draft honorarium tidak termasuk.",
    icon: <Receipt size={18} />,
    color: "#dc2626",
    bg: "linear-gradient(135deg, #fee2e2, #fff1f2)",
  },
  {
    key: "net_balance",
    title: "Saldo Bersih",
    note: "Pendapatan fee dikurangi total pengeluaran. Draft honorarium tidak mengurangi saldo.",
    icon: <Scale size={18} />,
    color: "#0f766e",
    bg: "linear-gradient(135deg, #ccfbf1, #f0fdfa)",
    signColored: true,
  },
  {
    key: "fee_remaining_total",
    title: "Sisa Tagihan",
    note: "Total kewajiban siswa yang belum lunas pada cakupan laporan.",
    icon: <AlertTriangle size={18} />,
    color: "#d97706",
    bg: "linear-gradient(135deg, #fef3c7, #fff7ed)",
  },
  {
    key: "unpaid_student_count",
    title: "Siswa Belum Lunas",
    note: "Jumlah siswa unik yang masih punya sisa tagihan.",
    icon: <Users size={18} />,
    color: "#b45309",
    bg: "linear-gradient(135deg, #ffedd5, #fff7ed)",
    isCount: true,
  },
];

const ReportSummaryCards = ({ summary = {} }) => (
  <Row gutter={[16, 16]}>
    {cards.map((item) => (
      <Col xs={24} sm={12} lg={8} xl={8} xxl={4} key={item.key}>
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
