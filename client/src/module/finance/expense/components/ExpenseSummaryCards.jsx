import { Card, Col, Flex, Grid, Row, Typography } from "antd";
import { motion } from "framer-motion";
import { Banknote, Hash, Layers, Wallet } from "lucide-react";

import { cardStyle, categoryLabel, currencyFormatter } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const ExpenseSummaryCards = ({ summary = {} }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const topCategory = summary.by_category?.[0];

  const items = [
    {
      title: "Total Transaksi",
      value: summary.total_count || 0,
      note: "Semua pengeluaran terfilter",
      icon: <Hash size={18} />,
      bg: "linear-gradient(135deg, #ffedd5, #fff7ed)",
      color: "#c2410c",
      format: (v) => v,
    },
    {
      title: "Total Nominal",
      value: summary.total_amount || 0,
      note: "Jumlah pengeluaran periode filter",
      icon: <Wallet size={18} />,
      bg: "linear-gradient(135deg, #fee2e2, #fff1f2)",
      color: "#be123c",
      format: (v) => currencyFormatter.format(Number(v || 0)),
    },
    {
      title: "Kategori Terpakai",
      value: summary.by_category?.length || 0,
      note: "Jenis kategori dalam filter",
      icon: <Layers size={18} />,
      bg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
      color: "#1d4ed8",
      format: (v) => v,
    },
    {
      title: "Tertinggi",
      value: topCategory?.amount || 0,
      note: topCategory
        ? `${categoryLabel[topCategory.category] || topCategory.category} · ${topCategory.count} transaksi`
        : "Belum ada data",
      icon: <Banknote size={18} />,
      bg: "linear-gradient(135deg, #fef3c7, #fffbeb)",
      color: "#b45309",
      format: (v) => currencyFormatter.format(Number(v || 0)),
    },
  ];

  return (
    <Row gutter={[12, 12]}>
      {items.map((item, index) => (
        <Col xs={24} sm={12} lg={6} key={item.title}>
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              style={{ ...cardStyle, borderRadius: isMobile ? 18 : 24 }}
              styles={{ body: { padding: isMobile ? 14 : 18 } }}
            >
              <Flex align="center" gap={12}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: item.bg,
                    color: item.color,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.title}
                  </Text>
                  <div
                    style={{
                      fontSize: isMobile ? 18 : 20,
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1.2,
                    }}
                  >
                    {item.format(item.value)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {item.note}
                  </Text>
                </div>
              </Flex>
            </Card>
          </MotionDiv>
        </Col>
      ))}
    </Row>
  );
};

export default ExpenseSummaryCards;
