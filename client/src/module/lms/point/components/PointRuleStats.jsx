import React from "react";
import { Card, Col, Row, Space, Typography } from "antd";
import { motion } from "framer-motion";
import { BadgeCheck, Flag, ShieldAlert, Zap } from "lucide-react";

import { museColors, museRadius, museShadow } from "../../../../config/theme";
const { Text, Title } = Typography;

const statCardStyle = {
  height: "100%",
  borderRadius: museRadius.card,
  background: "#ffffff",
  boxShadow: museShadow.card,
};

const statConfig = [
  {
    key: "total_rules",
    label: "Total Rule",
    icon: Flag,
    color: museColors.cyan,
    background: "#ccfbf1",
  },
  {
    key: "reward_points",
    label: "Total Poin Penghargaan",
    icon: Zap,
    color: "#ca8a04",
    background: "#fef3c7",
  },
  {
    key: "punishment_points",
    label: "Total Poin Pelanggaran",
    icon: ShieldAlert,
    color: museColors.danger,
    background: "#fee2e2",
  },
  {
    key: "active_rules",
    label: "Aktif",
    icon: BadgeCheck,
    color: museColors.primary,
    background: museColors.primarySoft,
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
                    borderRadius: museRadius.card,
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
                  <Text style={{ color: museColors.muted, fontSize: 13 }}>
                    {item.label}
                  </Text>
                  <Title
                    level={isMobile ? 4 : 3}
                    style={{ margin: "4px 0 0", color: museColors.text }}
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
