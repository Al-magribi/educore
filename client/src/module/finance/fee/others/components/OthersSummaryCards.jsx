import { Card, Col, Row, Typography } from "antd";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  CreditCard,
  Wallet,
} from "lucide-react";

import { cardStyle, currencyFormatter } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const OthersSummaryCards = ({ summary }) => {
  const items = [
    {
      title: "Total Tagihan",
      value: summary.total_records || 0,
      formatter: (value) => value,
      note: "Seluruh tagihan non-SPP sesuai filter",
      icon: <CreditCard size={18} />,
      bg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
      color: "#2563eb",
    },
    {
      title: "Belum Bayar",
      value: summary.unpaid_count || 0,
      formatter: (value) => value,
      note: "Tagihan yang belum memiliki pembayaran",
      icon: <AlertTriangle size={18} />,
      bg: "linear-gradient(135deg, #fef3c7, #fff7ed)",
      color: "#d97706",
    },
    {
      title: "Masih Cicilan",
      value: summary.partial_count || 0,
      formatter: (value) => value,
      note: "Tagihan yang baru dibayar sebagian",
      icon: <Coins size={18} />,
      bg: "linear-gradient(135deg, #ede9fe, #f5f3ff)",
      color: "#7c3aed",
    },
    {
      title: "Sudah Lunas",
      value: summary.paid_count || 0,
      formatter: (value) => value,
      note: "Tagihan yang telah tertutup seluruhnya",
      icon: <CheckCircle2 size={18} />,
      bg: "linear-gradient(135deg, #dcfce7, #ecfdf5)",
      color: "#15803d",
    },
    {
      title: "Total Nominal",
      value: summary.total_due || 0,
      formatter: (value) => currencyFormatter.format(Number(value || 0)),
      note: "Akumulasi nominal yang ditagihkan",
      icon: <Wallet size={18} />,
      bg: "linear-gradient(135deg, #e0f2fe, #ecfeff)",
      color: "#0369a1",
    },
    {
      title: "Sudah Dibayar",
      value: summary.total_paid || 0,
      formatter: (value) => currencyFormatter.format(Number(value || 0)),
      note: "Total pembayaran yang sudah masuk",
      icon: <CircleDollarSign size={18} />,
      bg: "linear-gradient(135deg, #dcfce7, #f0fdf4)",
      color: "#16a34a",
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {items.map((item, index) => (
        <Col xs={24} md={12} xl={8} key={item.title}>
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            whileHover={{ y: -4 }}
          >
            <Card
              style={{
                ...cardStyle,
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
              }}
              styles={{ body: { padding: 22 } }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 16,
                  background: item.bg,
                  color: item.color,
                  marginBottom: 12,
                }}
              >
                {item.icon}
              </div>
              <Text type='secondary'>{item.title}</Text>
              <div
                style={{
                  marginTop: 8,
                  fontSize: 28,
                  fontWeight: 700,
                  color: "#0f172a",
                  lineHeight: 1.2,
                }}
              >
                {item.formatter(item.value)}
              </div>
              <Text type='secondary'>{item.note}</Text>
            </Card>
          </MotionDiv>
        </Col>
      ))}
    </Row>
  );
};

export default OthersSummaryCards;
