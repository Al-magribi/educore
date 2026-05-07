import React from "react";
import { AppleOutlined, DatabaseOutlined } from "@ant-design/icons";
import { Card, Flex, Grid, Space, Tabs, Tag, Typography, theme } from "antd";
import { motion } from "framer-motion";
import Database from "./database/Database";
import App from "./app/App";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const CenterConfig = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();

  const createTabLabel = (label, icon, caption) => (
    <Flex align='center' gap={10}>
      <span
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          background: "linear-gradient(135deg, #e0f2fe, #dcfce7)",
          color: "#0369a1",
          border: "1px solid rgba(148, 163, 184, 0.14)",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <Flex vertical gap={0}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
        {!isMobile && (
          <span
            style={{
              fontSize: 12,
              color: token.colorTextSecondary,
              lineHeight: 1.2,
            }}
          >
            {caption}
          </span>
        )}
      </Flex>
    </Flex>
  );

  const items = [
    {
      label: createTabLabel(
        "Pengaturan Aplikasi",
        <AppleOutlined />,
        "Identitas & preferensi",
      ),
      key: "app",
      children: <App />,
    },
    {
      label: createTabLabel(
        "Pengaturan Database",
        <DatabaseOutlined />,
        "Backup, restore, dan tables",
      ),
      key: "database",
      children: <Database />,
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      style={{ display: "grid", gap: 18 }}
    >
      <Card
        variant="borderless"
        style={{
          borderRadius: 22,
          overflow: "hidden",
          border: "1px solid rgba(148, 163, 184, 0.16)",
          background:
            "radial-gradient(circle at top left, rgba(14,165,233,0.14), transparent 30%), linear-gradient(135deg, #0f172a, #1e3a8a 58%, #0f766e)",
          boxShadow: "0 22px 50px rgba(15, 23, 42, 0.18)",
        }}
        styles={{ body: { padding: 20 } }}
      >
        <Space orientation="vertical" size={14} style={{ width: "100%" }}>
          <Tag
            style={{
              width: "fit-content",
              margin: 0,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.2)",
              background: "rgba(255,255,255,0.12)",
              color: "#e0f2fe",
              paddingInline: 12,
              fontWeight: 600,
            }}
          >
            Center Config
          </Tag>

          <div>
            <Title
              level={2}
              style={{
                margin: 0,
                color: "#f8fafc",
                fontSize: 28,
                lineHeight: 1.2,
              }}
            >
              Kelola pengaturan sistem dari satu workspace yang lebih rapi.
            </Title>
            <Text
              style={{
                display: "block",
                marginTop: 8,
                color: "rgba(226, 232, 240, 0.9)",
                fontSize: 13,
                lineHeight: 1.7,
                maxWidth: 720,
              }}
            >
              Atur konfigurasi aplikasi, backup database, restore data, dan
              pengelolaan tabel lintas schema dengan tampilan yang lebih nyaman
              untuk dipakai harian.
            </Text>
          </div>
        </Space>
      </Card>

      <Card
        variant="borderless"
        style={{
          borderRadius: token.borderRadiusXL,
          border: "1px solid rgba(148, 163, 184, 0.14)",
          boxShadow: token.boxShadowSecondary,
        }}
        styles={{ body: { padding: isMobile ? 12 : 16 } }}
      >
        <Tabs
          defaultActiveKey='app'
          items={items}
          size={isMobile ? "middle" : "large"}
          tabBarGutter={12}
          tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
        />
      </Card>
    </MotionDiv>
  );
};

export default CenterConfig;
