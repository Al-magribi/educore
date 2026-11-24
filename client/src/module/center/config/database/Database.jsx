import React from "react";
import { Grid, Tabs } from "antd";
import { ArchiveRestore, DatabaseBackup, Table2 } from "lucide-react";
import { motion } from "framer-motion";
import Backup from "./Backup";
import DbTables from "./DbTables";
import Restore from "./Restore";

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const Database = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const items = [
    {
      key: "backup",
      label: "Backup",
      icon: <DatabaseBackup size={16} />,
      children: <Backup />,
    },
    {
      key: "restore",
      label: "Restore",
      icon: <ArchiveRestore size={16} />,
      children: <Restore />,
    },
    {
      key: "tables",
      label: isMobile ? "Tabel" : "Kelola Tabel",
      icon: <Table2 size={16} />,
      children: <DbTables />,
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ minWidth: 0 }}
    >
      <Tabs
        type="card"
        defaultActiveKey="backup"
        items={items}
        size={isMobile ? "small" : "middle"}
        style={{ width: "100%", minWidth: 0 }}
      />
    </MotionDiv>
  );
};

export default Database;
