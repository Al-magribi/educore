import React from "react";
import { Tabs } from "antd";
import ParentAccountManager from "./ParentAccountManager";
import StudentDatabaseManager from "./StudentDatabaseManager";

const DatabaseManager = ({ scope = "all", showParentTab = true }) => {
  const items = [
    {
      key: "database",
      label: "Database",
      children: <StudentDatabaseManager scope={scope} />,
    },
  ];

  if (showParentTab) {
    items.push({
      key: "parents",
      label: "Orang Tua",
      children: <ParentAccountManager scope={scope} />,
    });
  }

  return (
    <>
      <Tabs
        defaultActiveKey='database'
        style={{ paddingInline: 4 }}
        items={items}
      />
    </>
  );
};

export default DatabaseManager;
