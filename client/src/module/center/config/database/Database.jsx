import React from "react";
import { Row, Col } from "antd";
import DbTables from "./DbTables";
import Backup from "./Backup";
import Restore from "./Restore";

const Database = () => {
  return (
    <div style={{ padding: "0 0 24px 0" }}>
      <Row gutter={[24, 24]}>
        {/* Baris Atas: Backup & Restore berdampingan */}
        <Col xs={24} lg={12}>
          <Backup />
        </Col>
        <Col xs={24} lg={12}>
          <Restore />
        </Col>

        {/* Baris Bawah: Manajemen Tabel full width */}
        <Col span={24}>
          <DbTables />
        </Col>
      </Row>
    </div>
  );
};

export default Database;
