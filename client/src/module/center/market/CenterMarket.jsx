import React, { Suspense, lazy } from "react";
import { Row, Col, Alert, Card, Skeleton } from "antd";

const StudentSegmented = lazy(() => import("./StudentSegmented"));
const GeoDistribution = lazy(() => import("./GeoDistribution"));
const ParentJobs = lazy(() => import("./ParentJobs"));

const ChartFallback = () => (
  <Card style={{ height: "100%" }}>
    <Skeleton active paragraph={{ rows: 8 }} />
  </Card>
);

const StudentListFallback = () => (
  <Card style={{ marginTop: 16 }}>
    <Skeleton active paragraph={{ rows: 10 }} />
  </Card>
);

const CenterMarket = () => {
  return (
    <>
      <div style={{ paddingBottom: 20 }}>
        <Alert
          title="Market Insight"
          description="Data ini dianalisis secara realtime berdasarkan database siswa aktif dan profil keluarga."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Suspense fallback={<ChartFallback />}>
              <GeoDistribution />
            </Suspense>
          </Col>
          <Col xs={24} lg={10}>
            <Suspense fallback={<ChartFallback />}>
              <ParentJobs />
            </Suspense>
          </Col>
        </Row>

        <Row style={{ marginTop: 16 }}>
          <Col span={24}>
            <Suspense fallback={<StudentListFallback />}>
              <StudentSegmented />
            </Suspense>
          </Col>
        </Row>
      </div>
    </>
  );
};

export default CenterMarket;
