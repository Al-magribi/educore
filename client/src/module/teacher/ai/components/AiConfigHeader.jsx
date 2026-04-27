import React from "react";
import { Card, Col, Flex, Row, Space, Tag, Typography } from "antd";
import { AudioLines, ShieldCheck, Wrench } from "lucide-react";

const { Title, Text } = Typography;

const capsuleStyle = {
  margin: 0,
  borderRadius: 999,
  padding: "6px 12px",
  background: "rgba(255,255,255,.14)",
  color: "#f8fafc",
};

const AiConfigHeader = ({ isMobile, userName, summaryCards }) => (
  <Card
    variant='borderless'
    style={{
      overflow: "hidden",
      borderRadius: 28,
      background:
        "linear-gradient(135deg, #0f172a 0%, #172554 50%, #0f766e 100%)",
      boxShadow: "0 28px 60px rgba(15, 23, 42, 0.18)",
    }}
    styles={{ body: { padding: isMobile ? 20 : 32 } }}
  >
    <Row gutter={[24, 24]} align='middle'>
      <Col xs={24} xl={15}>
        <Space orientation='vertical' size={14} style={{ width: "100%" }}>
          <Tag
            variant='filled'
            style={{
              alignSelf: "flex-start",
              margin: 0,
              color: "#dbeafe",
              background: "rgba(255,255,255,.12)",
              paddingInline: 12,
              paddingBlock: 6,
              borderRadius: 999,
              fontWeight: 600,
            }}
          >
            AI Workspace Guru
          </Tag>
          <Title
            level={isMobile ? 3 : 2}
            style={{ margin: 0, color: "#f8fafc", maxWidth: 680 }}
          >
            Atur satu API OpenAI untuk generator soal, koreksi essay, dan speech
            to text.
          </Title>
          <Text
            style={{
              color: "rgba(226, 232, 240, 0.92)",
              fontSize: 15,
              lineHeight: 1.75,
              maxWidth: 760,
            }}
          >
            Konfigurasi ini bersifat personal untuk {userName || "guru"}. API
            key disimpan di server dan tidak ditampilkan ulang ke halaman.
          </Text>
        </Space>
      </Col>

      <Col xs={24} xl={9}>
        <Row gutter={[14, 14]}>
          {summaryCards.map((item) => (
            <Col xs={12} key={item.key}>
              <div
                style={{
                  height: "100%",
                  borderRadius: 22,
                  padding: 18,
                  background: item.bg,
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,.65)",
                }}
              >
                <Flex align='center' justify='space-between' gap={12}>
                  <div style={{ color: item.color }}>{item.icon}</div>
                  <Text style={{ color: item.color, fontWeight: 700 }}>
                    {item.title}
                  </Text>
                </Flex>
                <div
                  style={{
                    marginTop: 18,
                    color: "#0f172a",
                    fontSize: item.fontSize,
                    fontWeight: 800,
                    lineHeight: 1.2,
                  }}
                >
                  {item.value}
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Col>
    </Row>
  </Card>
);

export default AiConfigHeader;
