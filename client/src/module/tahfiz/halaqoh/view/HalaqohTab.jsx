import React from "react";
import { Card, Flex, Grid, Tabs, Typography } from "antd";
import { motion } from "framer-motion";
import { LayoutGrid } from "lucide-react";

const { Paragraph, Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const HalaqohTab = ({ items = [] }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const tabMeta = {
    halaqoh: "Manajemen kelompok halaqoh",
    musyrif: "Master data pembimbing",
  };

  const createTabLabel = (labelNode, caption) => (
    <Flex align='center' gap={10}>
      <span
        style={{
          width: 34,
          height: 34,
          display: "grid",
          placeItems: "center",
          borderRadius: 12,
          background: "linear-gradient(135deg, #dbeafe, #e0f2fe)",
          color: "#1d4ed8",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          flexShrink: 0,
        }}
      >
        {labelNode}
      </span>
      <Flex vertical gap={0}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{caption.title}</span>
        {!isMobile ? (
          <span style={{ fontSize: 12, color: "rgba(100, 116, 139, 0.95)" }}>
            {caption.text}
          </span>
        ) : null}
      </Flex>
    </Flex>
  );

  const tabItems = items.map((item) => {
    const titleText =
      item.key === "halaqoh"
        ? "Halaqoh"
        : item.key === "musyrif"
          ? "Musyrif"
          : String(item.key);

    return {
      ...item,
      label: createTabLabel(item.label, {
        title: titleText,
        text: tabMeta[item.key] || "Panel manajemen",
      }),
    };
  });

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
    >
      <Card
        style={{
          borderRadius: 24,
          border: "1px solid #e2e8f0",
          boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: isMobile ? 14 : 18 } }}
      >
        <Flex vertical gap={4} style={{ marginBottom: 14 }}>
          <Flex align='center' gap={8}>
            <LayoutGrid size={16} color='#1d4ed8' />
            <Title level={5} style={{ margin: 0 }}>
              Halaqoh Workspace
            </Title>
          </Flex>
          <Paragraph type='secondary' style={{ marginBottom: 0 }}>
            Kelola halaqoh, musyrif, dan penempatan siswa dalam satu panel kerja.
          </Paragraph>
        </Flex>

        <Tabs
          defaultActiveKey={items.find((item) => item.key === "halaqoh")?.key || items[0]?.key}
          items={tabItems}
          size={isMobile ? "middle" : "large"}
          tabBarGutter={12}
          tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
        />

        <Text type='secondary' style={{ fontSize: 12 }}>
          Gunakan tab untuk berpindah konteks manajemen tanpa keluar dari modul.
        </Text>
      </Card>
    </MotionDiv>
  );
};

export default HalaqohTab;
