import React from "react";
import { Button, Card, Flex, Space, Tag, Typography } from "antd";
import { ArrowLeft, ClipboardList, Download, Sparkles } from "lucide-react";

const { Text, Title } = Typography;

const StudentAnswersHero = ({
  isMobile,
  studentName,
  studentNis,
  studentClass,
  onBack,
  onExportPdf,
}) => (
  <Card
    variant='borderless'
    style={{
      borderRadius: 28,
      overflow: "hidden",
      background:
        "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 26%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f766e 100%)",
      boxShadow: "0 24px 52px rgba(15, 23, 42, 0.18)",
    }}
    styles={{ body: { padding: isMobile ? 20 : 28 } }}
  >
    <Flex
      align={isMobile ? "stretch" : "flex-start"}
      justify='space-between'
      gap={18}
      wrap='wrap'
      style={{ flexDirection: isMobile ? "column" : "row" }}
    >
      <Space vertical size={12} style={{ maxWidth: 760 }}>
        <Space wrap size={10}>
          <Button
            icon={<ArrowLeft size={16} />}
            onClick={onBack}
            style={{
              borderRadius: 14,
              background: "rgba(255,255,255,0.12)",
              borderColor: "rgba(255,255,255,0.16)",
              color: "#fff",
            }}
          >
            Kembali
          </Button>
          <Tag
            style={{
              margin: 0,
              borderRadius: 999,
              paddingInline: 12,
              background: "rgba(255,255,255,0.12)",
              color: "#fff",
              borderColor: "rgba(255,255,255,0.16)",
            }}
            icon={<Sparkles size={12} />}
          >
            Review Jawaban Siswa
          </Tag>
          <Button
            size='small'
            icon={<Download size={14} />}
            onClick={onExportPdf}
            block={isMobile}
          >
            Export PDF
          </Button>
        </Space>

        <Flex gap='small' align='center'>
          <ClipboardList size={isMobile ? 16 : 26} color='#fff' />
          <Flex gap='small' vertical>
            <Title level={2} style={{ margin: 0, color: "#fff" }}>
              {studentName}
            </Title>
            <Text style={{ color: "rgba(255,255,255,0.82)" }}>
              {studentNis} - {studentClass}
            </Text>
          </Flex>
        </Flex>
      </Space>
    </Flex>
  </Card>
);

export default StudentAnswersHero;
