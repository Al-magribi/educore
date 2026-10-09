import { Card, Col, Flex, Grid, Row, Typography } from "antd";
import { motion } from "framer-motion";
import { CalendarDays, CalendarRange } from "lucide-react";

import { cardStyle, currencyFormatter } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const ExpenseSummaryCards = ({ summary = {} }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const isNarrow = !screens.sm;

  const items = [
    {
      title: "Pengeluaran Harian",
      value: summary.daily_amount || 0,
      note: `${summary.daily_count || 0} transaksi hari ini`,
      icon: <CalendarDays size={isNarrow ? 16 : 18} />,
      bg: "linear-gradient(135deg, #ffedd5, #fff7ed)",
      color: "#c2410c",
    },
    {
      title: "Pengeluaran Bulanan",
      value: summary.monthly_amount || 0,
      note: `${summary.monthly_count || 0} transaksi bulan ini`,
      icon: <CalendarRange size={isNarrow ? 16 : 18} />,
      bg: "linear-gradient(135deg, #fee2e2, #fff1f2)",
      color: "#be123c",
    },
  ];

  return (
    <Row gutter={[isMobile ? 10 : 12, isMobile ? 10 : 12]}>
      {items.map((item, index) => (
        <Col xs={24} sm={12} key={item.title} style={{ display: "flex" }}>
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            style={{ width: "100%" }}
          >
            <Card
              style={{
                ...cardStyle,
                height: "100%",
                borderRadius: isMobile ? 16 : 24,
              }}
              styles={{
                body: {
                  padding: isNarrow ? 12 : isMobile ? 14 : 18,
                  height: "100%",
                },
              }}
            >
              <Flex align='flex-start' gap={isNarrow ? 10 : 12}>
                <div
                  style={{
                    width: isNarrow ? 36 : 42,
                    height: isNarrow ? 36 : 42,
                    borderRadius: isNarrow ? 12 : 14,
                    display: "grid",
                    placeItems: "center",
                    background: item.bg,
                    color: item.color,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <Text
                    type='secondary'
                    style={{
                      fontSize: isNarrow ? 11 : 12,
                      display: "block",
                    }}
                  >
                    {item.title}
                  </Text>
                  <div
                    style={{
                      fontSize: isNarrow ? 15 : isMobile ? 17 : 20,
                      fontWeight: 700,
                      color: "#0f172a",
                      lineHeight: 1.25,
                      marginTop: 2,
                      overflowWrap: "anywhere",
                      wordBreak: "break-word",
                    }}
                  >
                    {currencyFormatter.format(Number(item.value || 0))}
                  </div>
                  <Text
                    type='secondary'
                    style={{
                      fontSize: isNarrow ? 11 : 12,
                      display: "block",
                      marginTop: 2,
                    }}
                  >
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
