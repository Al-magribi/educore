import React from "react";
import { AppleOutlined, DatabaseOutlined } from "@ant-design/icons";
import { Tabs } from "antd";
import Database from "./database/Database";
import App from "./app/App";

const CenterConfig = () => {
  const items = [
    {
      label: "Pengaturan Aplikasi",
      icon: <AppleOutlined />,
      key: "app",
      children: <App />,
    },
    {
      label: "Pengaturan Database",
      icon: <DatabaseOutlined />,
      key: "database",
      children: <Database />,
    },
  ];
  return (
    <>
      <Tabs defaultActiveKey="app" items={items} />
    </>
  );
};

export default CenterConfig;

