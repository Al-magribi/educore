import React from "react";
import { Card, Flex, Grid, Tabs, theme } from "antd";
import { Database, Users } from "lucide-react";
import ParentAccountManager from "./ParentAccountManager";
import StudentDatabaseManager from "./StudentDatabaseManager";

const { useBreakpoint } = Grid;

const DatabaseManager = ({ scope = "all", showParentTab = true }) => {
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
      key: "database",
      label: createTabLabel(
        "Database",
        <Database size={16} />,
        "Data induk siswa",
      ),
      children: <StudentDatabaseManager scope={scope} />,
    },
  ];

  if (showParentTab) {
    items.push({
      key: "parents",
      label: createTabLabel("Orang Tua", <Users size={16} />, "Akun orang tua"),
      children: <ParentAccountManager scope={scope} />,
    });
  }

  return (
    <Card
      bordered={false}
      style={{
        borderRadius: token.borderRadiusXL,
        boxShadow: token.boxShadowSecondary,
      }}
      styles={{ body: { padding: isMobile ? 12 : 16 } }}
    >
      <Tabs
        defaultActiveKey='database'
        items={items}
        size={isMobile ? "middle" : "large"}
        tabBarGutter={12}
        tabBarStyle={{ marginBottom: 20, paddingBottom: 8 }}
      />
    </Card>
  );
};

export default DatabaseManager;
