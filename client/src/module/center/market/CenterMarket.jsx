import React from "react";
import { AppLayout } from "../../../components";
import { Row, Col, Alert } from "antd";
import StudentSegmented from "./StudentSegmented";
import GeoDistribution from "./GeoDistribution";
import ParentJobs from "./ParentJobs";

const CenterMarket = () => {
  return (
    <AppLayout title={"Analisis Pasar & Demografi"}>
      <div style={{ paddingBottom: 20 }}>
        {/* Info Banner */}
        <Alert
          title="Market Insight"
          description="Data ini dianalisis secara realtime berdasarkan database siswa aktif dan profil keluarga."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        {/* Baris Atas: Charts */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            {/* Chart Wilayah (Lebih lebar karena bar chart horizontal) */}
            <GeoDistribution />
          </Col>
          <Col xs={24} lg={10}>
            {/* Chart Pekerjaan */}
            <ParentJobs />
          </Col>
        </Row>

        {/* Baris Bawah: Detail Siswa */}
        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <StudentSegmented />
          </Col>
        </Row>
      </div>
    </AppLayout>
  );
};

export default CenterMarket;
