import { Card, Row, Col, Space, Button, Divider, Flex, Typography } from "antd";
import {
  ArrowLeft,
  FileText,
  FileUp,
  Plus,
  Trash2,
  AlertCircle,
} from "lucide-react";

const { Text, Title } = Typography;

const QuestionHeader = ({
  bankName,
  totalCount,
  totalScore,
  onBack,
  onImport,
  onAdd,
  onDeleteAll,
}) => {
  const isOverScore = totalScore > 100;

  return (
    <Card
      hoverable
      styles={{ body: { padding: "16px" } }} // Padding lebih kecil di mobile
    >
      <Row gutter={[16, 16]} align="middle">
        <Col xs={24} lg={12}>
          <Space size="middle" align="start">
            <Button
              icon={<ArrowLeft size={18} />}
              type="text"
              shape="circle"
              onClick={onBack}
              style={{ background: "#f5f5f5", flexShrink: 0 }}
            />
            <div>
              <Title
                level={4}
                style={{ margin: 0, fontSize: "clamp(16px, 4vw, 20px)" }}
              >
                {bankName?.replaceAll("-", " ")}
              </Title>
              <Flex gap={8} wrap="wrap" style={{ marginTop: 4 }}>
                <Flex align="center" gap={4}>
                  <FileText size={14} style={{ color: "#8c8c8c" }} />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {totalCount} Soal
                  </Text>
                </Flex>
                <Divider orientation="vertical" />
                <Flex align="center" gap={4}>
                  {isOverScore && <AlertCircle size={14} color="#ff4d4f" />}
                  <Text
                    type={isOverScore ? "danger" : "secondary"}
                    strong={isOverScore}
                    style={{ fontSize: 12 }}
                  >
                    Bobot: {totalScore}/100
                  </Text>
                </Flex>
              </Flex>
            </div>
          </Space>
        </Col>

        <Col xs={24} lg={12}>
          <Flex gap={8} wrap="wrap" justify="end">
            <Button
              danger
              variant="text"
              icon={<Trash2 size={16} />}
              onClick={onDeleteAll}
              disabled={totalCount === 0}
              className="res-btn-full"
            >
              Kosongkan
            </Button>
            <Button
              icon={<FileUp size={16} />}
              onClick={onImport}
              className="res-btn-full"
            >
              Import
            </Button>
            <Button
              type="primary"
              icon={<Plus size={16} />}
              onClick={onAdd}
              style={{ boxShadow: "0 2px 4px rgba(24, 144, 255, 0.3)" }}
              className="res-btn-full"
            >
              Tambah Soal
            </Button>
          </Flex>
        </Col>
      </Row>
      <style>{`
        @media (max-width: 576px) {
          .res-btn-full { flex: 1; justify-content: center; }
        }
      `}</style>
    </Card>
  );
};

export default QuestionHeader;
