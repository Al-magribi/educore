import React from "react";
import { Card, Col, Row, Statistic } from "antd";
import { BadgeCheck, ClipboardCheck, ShieldCheck } from "lucide-react";
import { round2 } from "./utils";

const ReportSummaryCards = ({ loading, attendance, attitude, formative, summative }) => {
  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} sm={12} lg={6}>
        <Card style={{ borderRadius: 12 }} loading={loading}>
          <Statistic
            title="Kehadiran"
            value={round2(attendance.percent_hadir || 0)}
            suffix="%"
            prefix={<BadgeCheck size={16} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card style={{ borderRadius: 12 }} loading={loading}>
          <Statistic
            title="Sikap"
            value={round2(attitude?.score?.average_score || 0)}
            prefix={<ShieldCheck size={16} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card style={{ borderRadius: 12 }} loading={loading}>
          <Statistic
            title="Formatif"
            value={round2(formative.average_score || 0)}
            prefix={<ClipboardCheck size={16} />}
          />
        </Card>
      </Col>
      <Col xs={24} sm={12} lg={6}>
        <Card style={{ borderRadius: 12 }} loading={loading}>
          <Statistic
            title="Sumatif"
            value={round2(summative.average_score || 0)}
            prefix={<ClipboardCheck size={16} />}
          />
        </Card>
      </Col>
    </Row>
  );
};

export default ReportSummaryCards;
