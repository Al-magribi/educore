import { memo } from "react";
import { Card, Col, Row, Space, Typography } from "antd";
import { PiggyBank, Users, WalletCards } from "lucide-react";
import { motion } from "framer-motion";

import { cardStyle, currencyFormatter } from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const items = [
  {
    key: "students",
    title: "Total Siswa",
    dataKey: "total_students",
    icon: Users,
    color: "#2563eb",
    note: "Siswa pada akses aktif",
    tone: "linear-gradient(135deg, rgba(59,130,246,0.14), rgba(14,165,233,0.08))",
  },
  {
    key: "active",
    title: "Siswa Aktif",
    dataKey: "active_students",
    icon: PiggyBank,
    color: "#059669",
    note: "Sudah memiliki transaksi",
    tone: "linear-gradient(135deg, rgba(16,185,129,0.14), rgba(52,211,153,0.08))",
  },
  {
    key: "balance",
    title: "Saldo",
    dataKey: "total_balance",
    icon: WalletCards,
    color: "#7c3aed",
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    note: "Akumulasi saldo tabungan",
    tone: "linear-gradient(135deg, rgba(124,58,237,0.14), rgba(168,85,247,0.08))",
  },
  {
    key: "deposit",
    title: "Total Setoran",
    dataKey: "total_deposit",
    icon: PiggyBank,
    color: "#16a34a",
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    note: "Setoran pada periode aktif",
    tone: "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(74,222,128,0.08))",
  },
];

const SavingSummaryCards = ({ summary }) => (
  <Row gutter={[16, 16]}>
    {items.map((item, index) => {
      const Icon = item.icon;
      const value = summary?.[item.dataKey] || 0;

      return (
        <Col xs={24} sm={12} xl={6} key={item.key}>
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
            whileHover={{ y: -4 }}
          >
            <Card
              variant="borderless"
              style={{ ...cardStyle, background: item.tone }}
              styles={{ body: { padding: 18 } }}
            >
              <Space orientation="vertical" size={10} style={{ width: "100%" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.72)",
                    color: item.color,
                  }}
                >
                  <Icon size={18} color={item.color} />
                </div>
                <Text style={{ color: "#475569", fontSize: 12 }}>
                  {item.title}
                </Text>
                <Title level={3} style={{ margin: 0, color: item.color }}>
                  {item.formatter ? item.formatter(value) : value}
                </Title>
                <Text type="secondary">{item.note}</Text>
              </Space>
            </Card>
          </MotionDiv>
        </Col>
      );
    })}
  </Row>
);

export default memo(SavingSummaryCards);
