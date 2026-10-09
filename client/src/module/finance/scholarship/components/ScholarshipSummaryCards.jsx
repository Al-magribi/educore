import { Card, Col, Flex, Grid, Row, Typography } from "antd";
import { motion } from "framer-motion";
import { Award, CheckCircle2, Gift, Users } from "lucide-react";

import { cardStyle, currencyFormatter } from "../constants";

const { Text } = Typography;
const MotionDiv = motion.div;

const ScholarshipSummaryCards = ({ summary = {} }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  const items = [
    {
      title: "Total Beasiswa",
      value: summary.total || 0,
      note: "Semua program beasiswa",
      icon: <Award size={18} />,
      bg: "linear-gradient(135deg, #dbeafe, #eff6ff)",
      color: "#2563eb",
      format: (v) => v,
    },
    {
      title: "Aktif",
      value: summary.active || 0,
      note: "Sedang berlaku untuk penerima",
      icon: <CheckCircle2 size={18} />,
      bg: "linear-gradient(135deg, #dcfce7, #ecfdf5)",
      color: "#15803d",
      format: (v) => v,
    },
    {
      title: "Total Penerima",
      value: summary.students || 0,
      note: "Siswa aktif di semua beasiswa",
      icon: <Users size={18} />,
      bg: "linear-gradient(135deg, #ede9fe, #f5f3ff)",
      color: "#7c3aed",
      format: (v) => v,
    },
    {
      title: "Total Cover",
      value: summary.total_cover || 0,
      note: `SPP ${currencyFormatter.format(Number(summary.spp_cover || 0))} · Lainnya ${currencyFormatter.format(Number(summary.other_cover || 0))}`,
      icon: <Gift size={18} />,
      bg: "linear-gradient(135deg, #dbeafe, #e0e7ff)",
      color: "#1d4ed8",
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

export default ScholarshipSummaryCards;
