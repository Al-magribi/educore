import React from "react";
import { Button, Col, Row, Space } from "antd";
import { ArrowLeft, ArrowRight, ChevronDown } from "lucide-react";

const ExamActions = ({
  isSmallScreen,
  onToggleDoubt,
  onPrev,
  onNext,
  canPrev,
  canNext,
  isDoubt,
  showFinish,
  onFinish,
}) =>
  isSmallScreen ? (
    <Row gutter={[8, 8]}>
      <Col span={12}>
        <Button
          block
          icon={<ChevronDown size={16} />}
          onClick={onToggleDoubt}
          style={
            isDoubt
              ? { background: "#f59e0b", borderColor: "#f59e0b", color: "#fff" }
              : undefined
          }
        >
          Ragu-ragu
        </Button>
      </Col>
      <Col span={12}>
        <Button
          block
          icon={<ArrowLeft size={16} />}
          onClick={onPrev}
          disabled={!canPrev}
        >
          Soal Sebelumnya
        </Button>
      </Col>
      <Col span={12}>
        <Button
          block
          type="primary"
          icon={<ArrowRight size={16} />}
          onClick={onNext}
          disabled={!canNext}
        >
          Soal Berikutnya
        </Button>
      </Col>
      {showFinish && (
        <Col span={24}>
          <Button block type="primary" danger onClick={onFinish}>
            Selesai
          </Button>
        </Col>
      )}
    </Row>
  ) : (
    <Space
      align="center"
      size={12}
      style={{ justifyContent: "space-between", width: "100%" }}
    >
      <Space size={8}>
        <Button
          icon={<ChevronDown size={16} />}
          onClick={onToggleDoubt}
          style={
            isDoubt
              ? { background: "#f59e0b", borderColor: "#f59e0b", color: "#fff" }
              : undefined
          }
        >
          Ragu-ragu
        </Button>
      </Space>
      <Space size={8}>
        <Button
          icon={<ArrowLeft size={16} />}
          onClick={onPrev}
          disabled={!canPrev}
        >
          Soal Sebelumnya
        </Button>
        <Button
          type="primary"
          icon={<ArrowRight size={16} />}
          onClick={onNext}
          disabled={!canNext}
        >
          Soal Berikutnya
        </Button>
        {showFinish && (
          <Button type="primary" danger onClick={onFinish}>
            Selesai
          </Button>
        )}
      </Space>
    </Space>
  );

export default ExamActions;
