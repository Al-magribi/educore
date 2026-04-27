import React from "react";
import { Card, Col, Flex, Row, Space, Tag, Typography } from "antd";

const { Title, Text } = Typography;

const AiNotesCard = ({ isFetching, isMobile }) => (
  <Card
    variant='borderless'
    style={{
      borderRadius: 24,
      boxShadow: "0 18px 42px rgba(148, 163, 184, 0.16)",
    }}
    styles={{ body: { padding: 22 } }}
  >
    <Row gutter={[16, 16]} align='middle'>
      <Col xs={24}>
        <Space orientation='vertical' size={8}>
          <Title level={4} style={{ margin: 0 }}>
            Catatan Penting
          </Title>
          <Text type='secondary'>
            Simpan API key hanya dari akun OpenAI yang memang ingin Anda gunakan
            untuk kegiatan mengajar. Untuk speech-to-text OpenAI, ukuran file audio
            yang aman sebaiknya tetap di bawah 25 MB.
          </Text>
        </Space>
      </Col>
      <Col xs={24}>
        <Flex justify={isMobile ? "flex-start" : "flex-end"} gap={12} wrap='wrap'>
          <Tag
            variant='filled'
            style={{
              margin: 0,
              padding: "8px 12px",
              borderRadius: 999,
              background: "#eff6ff",
              color: "#1d4ed8",
            }}
          >
            RTK Query Connected
          </Tag>
          <Tag
            variant='filled'
            style={{
              margin: 0,
              padding: "8px 12px",
              borderRadius: 999,
              background: "#ecfdf5",
              color: "#047857",
            }}
          >
            {isFetching ? "Syncing..." : "Backend Synced"}
          </Tag>
        </Flex>
      </Col>
    </Row>
  </Card>
);

export default AiNotesCard;
