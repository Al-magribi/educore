import React from "react";
import { Button, Card, Col, Progress, Row, Space, Typography } from "antd";
import { ChevronDown, ChevronUp, ClipboardList } from "lucide-react";

const { Text, Title } = Typography;

const ProgressPanel = ({
  open,
  onToggle,
  answeredCount,
  doubtCount,
  unansweredCount,
  progressPercent,
  glassCard,
  palette,
}) => (
  <Card
    title={
      <Space>
        <ClipboardList size={18} />
        <span>Progress Jawaban</span>
      </Space>
    }
    extra={
      <Button
        type="text"
        size="small"
        icon={open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        onClick={onToggle}
      />
    }
    style={glassCard}
    styles={{ body: { padding: "12px 16px" } }}
  >
    {open && (
      <Space vertical size={8} style={{ width: "100%" }}>
        <Row gutter={[8, 8]}>
          <Col span={8}>
            <Card
              style={{
                borderRadius: 12,
                background: "rgba(34, 197, 94, 0.12)",
              }}
              styles={{ body: { padding: 10 } }}
            >
              <Text style={{ color: palette.subtle }}>Terjawab</Text>
              <Title level={4} style={{ margin: 0 }}>
                {answeredCount}
              </Title>
            </Card>
          </Col>
          <Col span={8}>
            <Card
              style={{
                borderRadius: 12,
                background: "rgba(245, 158, 11, 0.14)",
              }}
              styles={{ body: { padding: 10 } }}
            >
              <Text style={{ color: palette.subtle }}>Ragu</Text>
              <Title level={4} style={{ margin: 0 }}>
                {doubtCount}
              </Title>
            </Card>
          </Col>
          <Col span={8}>
            <Card
              style={{
                borderRadius: 12,
                background: "rgba(148, 163, 184, 0.16)",
              }}
              styles={{ body: { padding: 10 } }}
            >
              <Text style={{ color: palette.subtle }}>Belum</Text>
              <Title level={5} style={{ margin: 0 }}>
                {unansweredCount}
              </Title>
            </Card>
          </Col>
        </Row>
        <Progress
          percent={progressPercent}
          strokeColor={{ "0%": palette.brand, "100%": palette.accent }}
          railColor="#eaf0fa"
          showInfo={false}
        />
      </Space>
    )}
  </Card>
);

export default ProgressPanel;
