import React from "react";
import { Col, Row, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import Backup from "./Backup";
import DbTables from "./DbTables";
import Restore from "./Restore";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const Database = () => {
  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ display: "grid", gap: 18, paddingBottom: 24 }}
    >
      <div>
        <Tag color="purple" style={{ borderRadius: 999, paddingInline: 12 }}>
          Database Workspace
        </Tag>
        <Title level={3} style={{ margin: "10px 0 0", color: "#0f172a" }}>
          Backup, restore, dan kelola data tabel dengan lebih aman.
        </Title>
        <Text style={{ color: "#64748b", display: "block", marginTop: 6 }}>
          Gunakan panel berikut untuk membuat snapshot database, memulihkan
          backup, dan mengosongkan tabel tertentu dengan kontrol yang lebih
          jelas.
        </Text>
      </div>

      <Row gutter={[18, 18]}>
        <Col xs={24} xl={14}>
          <Backup />
        </Col>
        <Col xs={24} xl={10}>
          <Restore />
        </Col>
        <Col span={24}>
          <DbTables />
        </Col>
      </Row>
    </MotionDiv>
  );
};

export default Database;
