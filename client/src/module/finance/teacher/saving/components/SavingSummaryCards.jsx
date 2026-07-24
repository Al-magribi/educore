import { memo } from "react";
import { Card, Col, Row, Tooltip, Typography } from "antd";
import { Info, PiggyBank, Users, WalletCards } from "lucide-react";
import { motion } from "framer-motion";

import { cardStyle, currencyFormatter } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const items = [
  {
    key: "students",
    title: "Total Siswa",
    dataKey: "total_students",
    icon: Users,
    color: "#2563eb",
    tooltip: "Jumlah siswa yang masuk dalam cakupan filter aktif.",
    tone: "linear-gradient(135deg, rgba(59,130,246,0.14), rgba(14,165,233,0.08))",
  },
  {
    key: "active",
    title: "Sudah Menabung",
    dataKey: "active_students",
    icon: PiggyBank,
    color: "#059669",
    tooltip: "Siswa yang sudah memiliki minimal satu transaksi tabungan.",
    tone: "linear-gradient(135deg, rgba(16,185,129,0.14), rgba(52,211,153,0.08))",
  },
  {
    key: "balance",
    title: "Saldo",
    dataKey: "total_balance",
    icon: WalletCards,
    color: "#7c3aed",
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    tooltip: "Akumulasi saldo tabungan seluruh siswa pada cakupan aktif.",
    tone: "linear-gradient(135deg, rgba(124,58,237,0.14), rgba(168,85,247,0.08))",
  },
  {
    key: "deposit",
    title: "Total Setoran",
    dataKey: "total_deposit",
    icon: PiggyBank,
    color: "#16a34a",
    formatter: (value) => currencyFormatter.format(Number(value || 0)),
    tooltip: "Akumulasi seluruh setoran yang pernah tercatat.",
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
              styles={{ body: { padding: 16 } }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "rgba(255,255,255,0.78)",
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color={item.color} />
                </div>

                <div style={{ minWidth: 0 }}>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 6 }}
                  >
                    <Text
                      style={{
                        color: "#475569",
                        fontSize: 12,
                        fontWeight: 600,
                        letterSpacing: 0.3,
                        textTransform: "uppercase",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.title}
                    </Text>
                    <Tooltip title={item.tooltip}>
                      <Info
                        size={13}
                        color="#94a3b8"
                        style={{ cursor: "help", flexShrink: 0 }}
                      />
                    </Tooltip>
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 700,
                      color: item.color,
                      lineHeight: 1.3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.formatter ? item.formatter(value) : value}
                  </div>
                </div>
              </div>
            </Card>
          </MotionDiv>
        </Col>
      );
    })}
  </Row>
);

export default memo(SavingSummaryCards);
