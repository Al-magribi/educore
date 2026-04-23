import React from "react";
import { Card, Col, Empty, Form, Row, Space, Typography } from "antd";
import { motion } from "framer-motion";
import ConfigInput from "./ConfigInput";

const { Text } = Typography;
const MotionDiv = motion.div;

const formatLabel = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const ConfigCategoryPanel = ({ configs = [] }) => {
  if (configs.length === 0) {
    return <Empty description="Tidak ada konfigurasi untuk kategori ini." />;
  }

  return (
    <Row gutter={[18, 18]}>
      {configs.map((item) => (
        <Col span={24} lg={12} key={item.key}>
          <MotionDiv whileHover={{ y: -3 }} transition={{ duration: 0.2 }}>
            <Card
              variant="borderless"
              style={{
                height: "100%",
                borderRadius: 20,
                border: "1px solid rgba(148, 163, 184, 0.14)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
              }}
              styles={{ body: { padding: 18 } }}
            >
              <Space orientation="vertical" size={12} style={{ width: "100%" }}>
                <div>
                  <Text
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#64748b",
                      textTransform: "uppercase",
                      letterSpacing: 0.6,
                    }}
                  >
                    Konfigurasi
                  </Text>
                  <Text
                    strong
                    style={{
                      display: "block",
                      marginTop: 4,
                      fontSize: 16,
                      color: "#0f172a",
                    }}
                  >
                    {formatLabel(item.key)}
                  </Text>
                </div>

                <Form.Item
                  label={null}
                  name={item.key}
                  tooltip={item.description}
                  rules={[
                    { required: true, message: "Field ini tidak boleh kosong" },
                  ]}
                  style={{ marginBottom: 0 }}
                >
                  <ConfigInput type={item.type} placeholder={item.description} />
                </Form.Item>

                <Text
                  style={{
                    fontSize: 12,
                    color: "#64748b",
                    lineHeight: 1.65,
                  }}
                >
                  {item.description || "Tidak ada deskripsi tambahan."}
                </Text>
              </Space>
            </Card>
          </MotionDiv>
        </Col>
      ))}
    </Row>
  );
};

export default ConfigCategoryPanel;
