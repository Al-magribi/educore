import React from "react";
import { Card, Col, Divider, Flex, Form, Row, Space, Switch, Tag, Typography } from "antd";

const { Title, Text } = Typography;

const AiFeaturePanel = ({ featureMeta, isMobile }) => (
  <Card
    variant='borderless'
    style={{
      borderRadius: 24,
      boxShadow: "0 18px 42px rgba(148, 163, 184, 0.16)",
    }}
    styles={{ body: { padding: isMobile ? 20 : 24 } }}
  >
    <Space orientation='vertical' size={16} style={{ width: "100%" }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>
          Fitur yang Diaktifkan
        </Title>
        <Text type='secondary'>
          Pilih modul mana saja yang boleh memakai API Anda.
        </Text>
      </div>

      <Row gutter={[16, 16]}>
        {featureMeta.map((feature) => (
          <Col xs={24} md={12} xl={8} key={feature.key}>
            <div
              style={{
                height: "100%",
                borderRadius: 22,
                padding: 18,
                background: feature.bg,
              }}
            >
              <Flex vertical gap={16} style={{ height: "100%" }}>
                <Flex justify='space-between' align='flex-start' gap={12}>
                  <Space align='start' size={12}>
                    <div style={{ color: feature.tone, marginTop: 2 }}>
                      {feature.icon}
                    </div>
                    <div>
                      <Tag
                        variant='filled'
                        style={{
                          margin: "0 0 8px",
                          borderRadius: 999,
                          padding: "4px 10px",
                          background:
                            feature.scopeType === "audio"
                              ? "rgba(154, 52, 18, 0.12)"
                              : "rgba(29, 78, 216, 0.12)",
                          color: feature.tone,
                          fontWeight: 600,
                        }}
                      >
                        {feature.scopeLabel}
                      </Tag>
                      <Text strong style={{ display: "block", color: "#0f172a" }}>
                        {feature.title}
                      </Text>
                    </div>
                  </Space>
                  <Form.Item
                    name={["features", feature.key]}
                    valuePropName='checked'
                    style={{ marginBottom: 0 }}
                  >
                    <Switch />
                  </Form.Item>
                </Flex>
                <Divider style={{ margin: 0, borderColor: "rgba(15, 23, 42, 0.08)" }} />
                <Text style={{ color: "#334155", lineHeight: 1.7 }}>
                  {feature.description}
                </Text>
              </Flex>
            </div>
          </Col>
        ))}
      </Row>
    </Space>
  </Card>
);

export default AiFeaturePanel;
