import {
  CheckCircleOutlined,
  DollarOutlined,
  TeamOutlined,
  UserSwitchOutlined,
} from "@ant-design/icons";
import { Card, Col, Row, Space, Typography } from "antd";
import { motion } from "framer-motion";

import { cardStyle, currencyFormatter } from "../constants";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const StudentContributionSummaryCards = ({ summary }) => {
  const items = [
    {
      title: "Saldo Kas",
      value: summary.balance || 0,
      color: "#0f766e",
      icon: <DollarOutlined />,
      currency: true,
      tone: "linear-gradient(135deg, rgba(16,185,129,0.14), rgba(13,148,136,0.08))",
    },
    {
      title: "Sudah Bayar",
      value: summary.paid_students || 0,
      color: "#166534",
      icon: <CheckCircleOutlined />,
      tone: "linear-gradient(135deg, rgba(34,197,94,0.14), rgba(74,222,128,0.08))",
    },
    {
      title: "Belum Bayar",
      value: summary.unpaid_students || 0,
      color: "#b45309",
      icon: <TeamOutlined />,
      tone: "linear-gradient(135deg, rgba(245,158,11,0.14), rgba(251,191,36,0.08))",
    },
    {
      title: "Petugas Aktif",
      value: summary.active_officers || 0,
      color: "#1d4ed8",
      icon: <UserSwitchOutlined />,
      tone: "linear-gradient(135deg, rgba(59,130,246,0.14), rgba(14,165,233,0.08))",
    },
  ];

  return (
    <Row gutter={[16, 16]}>
      {items.map((item, index) => (
        <Col xs={24} sm={12} xl={6} key={item.title}>
          <MotionDiv
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, delay: index * 0.04 }}
            whileHover={{ y: -4 }}
          >
            <Card
              variant="borderless"
              style={{
                ...cardStyle,
                background: item.tone,
              }}
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
                    fontSize: 18,
                  }}
                >
                  {item.icon}
                </div>
                <Text style={{ color: "#475569", fontSize: 12 }}>
                  {item.title}
                </Text>
                <Title level={3} style={{ margin: 0, color: item.color }}>
                  {item.currency
                    ? currencyFormatter.format(Number(item.value || 0))
                    : item.value}
                </Title>
              </Space>
            </Card>
          </MotionDiv>
        </Col>
      ))}
    </Row>
  );
};

export default StudentContributionSummaryCards;
