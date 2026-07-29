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
    <Flex align="center" gap={isMobile ? 6 : 10} style={{ minWidth: 0 }}>
      <span
        style={{
          width: isMobile ? 28 : 34,
          height: isMobile ? 28 : 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          background: "linear-gradient(135deg, #e0f2fe, #dcfce7)",
          color: "#0369a1",
          border: "1px solid rgba(148, 163, 184, 0.14)",
          flexShrink: 0,
          fontSize: isMobile ? 12 : undefined,
        }}
      >
        {icon}
      </span>
      <Flex vertical gap={0} style={{ minWidth: 0 }}>
        <span
          style={{
            fontWeight: 600,
            lineHeight: 1.2,
            fontSize: isMobile ? 12 : undefined,
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
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
      style={{
        display: "grid",
        gap: isMobile ? 12 : 18,
        paddingBottom: 24,
        width: "100%",
        minWidth: 0,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <Tag color="purple" style={{ borderRadius: 999, paddingInline: 12 }}>
          Database Workspace
        </Tag>
        <Title
          level={isMobile ? 4 : 3}
          style={{
            margin: "10px 0 0",
            color: "#0f172a",
            fontSize: isMobile ? 18 : undefined,
            wordBreak: "break-word",
          }}
        >
          {isMobile
            ? "Backup, restore & kelola tabel"
            : "Backup, restore, dan kelola tabel lintas schema dengan lebih aman."}
        </Title>
        {!isMobile && (
          <Text style={{ color: "#64748b", display: "block", marginTop: 6 }}>
            Gunakan tab berikut untuk membuat snapshot penuh database, memulihkan
            semua schema beserta assets, dan mengelola tabel per skema dengan
            kontrol yang lebih jelas.
          </Text>
        )}
      </div>

      <Card
        variant="borderless"
        style={{
          borderRadius: isMobile ? 18 : 22,
          width: "100%",
          minWidth: 0,
          overflow: "hidden",
        }}
        styles={{ body: { padding: isMobile ? 10 : 16 } }}
      >
        <Space orientation="vertical" size={isMobile ? 12 : 16} style={{ width: "100%" }}>
          <Tabs
            defaultActiveKey="backup"
            items={items}
            size={isMobile ? "small" : "large"}
            tabBarGutter={isMobile ? 8 : 12}
            style={{ width: "100%", minWidth: 0 }}
            tabBarStyle={{ marginBottom: isMobile ? 12 : 20, paddingBottom: 8 }}
          />
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default Database;
