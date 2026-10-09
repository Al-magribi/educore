import { Card, Col, Flex, Grid, Row, Tooltip, Typography } from "antd";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDollarSign,
  Coins,
  CreditCard,
  Gift,
  Info,
  Wallet,
} from "lucide-react";

import { cardStyle, currencyFormatter } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const OthersSummaryCards = ({ summary }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

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
      title: "Total Netto",
      value: summary.total_due || 0,
      formatter: (value) => currencyFormatter.format(Number(value || 0)),
      note: `Bruto ${currencyFormatter.format(Number(summary.total_bruto || 0))}`,
      icon: <Wallet size={18} />,
      bg: "linear-gradient(135deg, #e0f2fe, #ecfeff)",
      color: "#0369a1",
    },
    {
      title: "Cover Beasiswa",
      value: summary.total_scholarship_cover || 0,
      formatter: (value) => currencyFormatter.format(Number(value || 0)),
      note: "Potongan beasiswa (bukan kas masuk)",
      icon: <Gift size={18} />,
      bg: "linear-gradient(135deg, #dbeafe, #e0e7ff)",
      color: "#1d4ed8",
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
    <Row gutter={[12, 12]}>
      {items.map((item, index) => (
        <Col xs={24} sm={12} xl={8} key={item.title}>
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.04 }}
            whileHover={isMobile ? undefined : { y: -4 }}
          >
            <Card
              style={{
                ...cardStyle,
                borderRadius: isMobile ? 18 : 24,
                background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
              }}
              styles={{ body: { padding: isMobile ? 14 : 20 } }}
            >
              <Flex align='center' gap={isMobile ? 10 : 14}>
                <div
                  style={{
                    width: isMobile ? 40 : 44,
                    height: isMobile ? 40 : 44,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 16,
                    background: item.bg,
                    color: item.color,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Flex align='center' gap={6}>
                    <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                      {item.title}
                    </Text>
                    <Tooltip title={item.note}>
                      <Info
                        size={14}
                        color='#94a3b8'
                        style={{ cursor: "help", flexShrink: 0 }}
                      />
                    </Tooltip>
                  </Flex>
                  <div
                    style={{
                      marginTop: 4,
                      fontSize: isMobile ? 20 : 26,
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1.2,
                      wordBreak: "break-word",
                    }}
                  >
                    {item.formatter(item.value)}
                  </div>
                </div>
              </Flex>
            </Card>
          </MotionDiv>
        </Col>
      ))}
    </Row>
  );
};

export default OthersSummaryCards;
