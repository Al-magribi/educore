import React from "react";
import { Card, Col, Empty, Form, Grid, Row, Space, Typography } from "antd";
import { motion } from "framer-motion";
import ConfigInput from "./ConfigInput";

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const formatLabel = (value) =>
  String(value || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());

const ConfigCategoryPanel = ({ configs = [] }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  if (configs.length === 0) {
    return <Empty description="Tidak ada konfigurasi untuk kategori ini." />;
  }

  return (
    <Row gutter={[isMobile ? 12 : 18, isMobile ? 12 : 18]} style={{ width: "100%", margin: 0 }}>
      {configs.map((item) => (
        <Col xs={24} lg={12} key={item.key} style={{ minWidth: 0 }}>
          <MotionDiv
            whileHover={isMobile ? undefined : { y: -3 }}
            transition={{ duration: 0.2 }}
            style={{ height: "100%", minWidth: 0 }}
          >
            <Card
              variant="borderless"
              style={{
                height: "100%",
                borderRadius: isMobile ? 16 : 20,
                border: "1px solid rgba(148, 163, 184, 0.14)",
                background:
                  "linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))",
                minWidth: 0,
                overflow: "hidden",
              }}
              styles={{ body: { padding: isMobile ? 14 : 18 } }}
            >
              <Space orientation="vertical" size={isMobile ? 10 : 12} style={{ width: "100%" }}>
                <div style={{ minWidth: 0 }}>
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
                    ellipsis={{ tooltip: formatLabel(item.key) }}
                    style={{
                      display: "block",
                      marginTop: 4,
                      fontSize: isMobile ? 15 : 16,
                      color: "#0f172a",
                      maxWidth: "100%",
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

                {item.description ? (
                  <Text
                    style={{
                      fontSize: 12,
                      color: "#64748b",
                      lineHeight: 1.65,
                      display: isMobile ? "-webkit-box" : "block",
                      WebkitLineClamp: isMobile ? 2 : undefined,
                      WebkitBoxOrient: isMobile ? "vertical" : undefined,
                      overflow: isMobile ? "hidden" : undefined,
                    }}
                  >
                    {item.description}
                  </Text>
                ) : null}
              </Space>
            </Card>
          </MotionDiv>
        </Col>
      ))}
    </Row>
  );
};

export default ConfigCategoryPanel;
