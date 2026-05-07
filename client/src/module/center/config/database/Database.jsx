import React from "react";
import {
  AppstoreOutlined,
  CloudSyncOutlined,
  DatabaseOutlined,
} from "@ant-design/icons";
import { Card, Flex, Grid, Space, Tabs, Tag, Typography, theme } from "antd";
import { motion } from "framer-motion";
import Backup from "./Backup";
import DbTables from "./DbTables";
import Restore from "./Restore";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const Database = () => {
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
      key: "backup",
      label: createTabLabel("Backup", <DatabaseOutlined />, "Snapshot data"),
      children: <Backup />,
    },
    {
      key: "restore",
      label: createTabLabel(
        "Restore",
        <CloudSyncOutlined />,
        "Pulihkan sistem",
      ),
      children: <Restore />,
    },
    {
      key: "tables",
      label: createTabLabel(
        "Tables",
        <AppstoreOutlined />,
        "Kelola data tabel",
      ),
      children: <DbTables />,
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ display: "grid", gap: 18, paddingBottom: 24 }}
    >
      <div>
        <Tag color='purple' style={{ borderRadius: 999, paddingInline: 12 }}>
          Database Workspace
        </Tag>
        <Title level={3} style={{ margin: "10px 0 0", color: "#0f172a" }}>
          Backup, restore, dan kelola tabel lintas schema dengan lebih aman.
        </Title>
        <Text style={{ color: "#64748b", display: "block", marginTop: 6 }}>
          Gunakan tab berikut untuk membuat snapshot penuh database, memulihkan
          semua schema beserta assets, dan mengelola tabel per skema dengan
          kontrol yang lebih jelas.
        </Text>
      </div>

      <Card
        variant='borderless'
        styles={{ body: { padding: isMobile ? 12 : 16 } }}
      >
        <Space vertical size={16} style={{ width: "100%" }}>
          <Tabs
            defaultActiveKey='backup'
            items={items}
            size={isMobile ? "middle" : "large"}
            tabBarGutter={12}
            tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
          />
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default Database;
