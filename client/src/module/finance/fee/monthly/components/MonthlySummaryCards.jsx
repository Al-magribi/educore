import { Card, Col, Flex, Grid, Row, Tooltip, Typography } from "antd";
import { motion } from "framer-motion";
import { Info } from "lucide-react";

import { cardStyle } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const formatValue = (item) => {
  const formatted = new Intl.NumberFormat("id-ID").format(item.value || 0);

  return item.prefix ? `${item.prefix}${formatted}` : formatted;
};

const MonthlySummaryCards = ({ items }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Row gutter={[12, 12]}>
      {items.map((item, index) => (
        <Col xs={24} sm={12} xl={6} key={item.key}>
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
                {item.icon ? (
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
                ) : null}
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
                    {formatValue(item)}
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

export default MonthlySummaryCards;
