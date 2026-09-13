import React from "react";
import { Card, Col, Row, Space, Typography } from "antd";
import { motion } from "framer-motion";
import { BadgeCheck, Flag, ShieldAlert, Zap } from "lucide-react";

const { Text, Title } = Typography;

const statCardStyle = {
  height: "100%",
  borderRadius: 22,
  border: "1px solid #dbe7f3",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
};

const statConfig = [
  {
    key: "total_rules",
    label: "Total Rule",
    icon: Flag,
    color: "#0f766e",
    background: "#ccfbf1",
  },
  {
    key: "reward_points",
    label: "Total Poin Prestasi",
    icon: Zap,
    color: "#ca8a04",
    background: "#fef3c7",
  },
  {
    key: "punishment_points",
    label: "Total Poin Pelanggaran",
    icon: ShieldAlert,
    color: "#b91c1c",
    background: "#fee2e2",
  },
  {
    key: "active_rules",
    label: "Aktif",
    icon: BadgeCheck,
    color: "#2563eb",
    background: "#dbeafe",
  },
];

const PointRuleStats = ({ stats = {}, isMobile }) => (
  <Row gutter={[16, 16]}>
    {statConfig.map((item, index) => {
      const Icon = item.icon;

      return (
        <Col xs={24} sm={12} xl={6} key={item.key}>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: index * 0.04 }}
          >
            <Card style={statCardStyle} styles={{ body: { padding: 20 } }}>
              <Space align='start' size={14}>
                <span
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: 16,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: item.background,
                    color: item.color,
                  }}
                >
                  <Icon size={20} />
                </span>
                <div>
                  <Text style={{ color: "#64748b", fontSize: 13 }}>
                    {item.label}
                  </Text>
                  <Title
                    level={isMobile ? 4 : 3}
                    style={{ margin: "4px 0 0", color: "#0f172a" }}
                  >
                    {Number(stats?.[item.key] || 0)}
                  </Title>
                </div>
              </Space>
            </Card>
          </motion.div>
        </Col>
      );
    })}
  </Row>
);

export default PointRuleStats;
