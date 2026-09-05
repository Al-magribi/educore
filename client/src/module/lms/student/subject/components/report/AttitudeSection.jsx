import React from "react";
import { Card, Col, Row, Space, Statistic, Tag, Typography } from "antd";
import { ShieldCheck } from "lucide-react";
import { round2 } from "./utils";

const { Title, Paragraph } = Typography;

const AttitudeSection = ({ attitude }) => {
  return (
    <Card style={{ borderRadius: 14 }} styles={{ body: { padding: 16 } }}>
      <Space align="center" size={10} style={{ marginBottom: 12 }}>
        <ShieldCheck size={16} color="#1677ff" />
        <Title level={5} style={{ margin: 0 }}>
          Sikap
        </Title>
        <Tag color="processing" style={{ marginRight: 0 }}>
          Entri: {attitude.total_entries || 0}
        </Tag>
      </Space>

      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Kinerja" value={round2(attitude?.score?.kinerja)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Kedisiplinan"
              value={round2(attitude?.score?.kedisiplinan)}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic title="Keaktifan" value={round2(attitude?.score?.keaktifan)} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card size="small">
            <Statistic
              title="Percaya Diri"
              value={round2(attitude?.score?.percaya_diri)}
            />
          </Card>
        </Col>
      </Row>

      {attitude?.teacher_note ? (
        <Paragraph type="secondary" style={{ marginTop: 12, marginBottom: 0 }}>
          Catatan Guru: {attitude.teacher_note}
        </Paragraph>
      ) : null}
    </Card>
  );
};

export default AttitudeSection;
