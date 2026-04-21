import { Alert, Card, Col, Flex, Row, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { Building2, CreditCard, Wallet } from "lucide-react";
import { BankOutlined } from "@ant-design/icons";
import { cardStyle } from "../../fee/others/constants";

const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const PaymentMethodsCard = ({ paymentMethods }) => (
  <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <Card
      style={{
        ...cardStyle,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
      }}
      styles={{ body: { padding: 24 } }}
    >
      <Space vertical size={14} style={{ width: "100%" }}>
        <div
          style={{
            padding: 20,
            borderRadius: 22,
            border: "1px solid rgba(59,130,246,0.14)",
            background:
              "linear-gradient(135deg, rgba(239,246,255,0.96), rgba(240,253,250,0.94))",
          }}
        >
          <Flex justify='space-between' align='flex-start' wrap='wrap' gap={16}>
            <Flex align='flex-start' gap={14} style={{ flex: 1 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  display: "grid",
                  placeItems: "center",
                  borderRadius: 18,
                  background: "linear-gradient(135deg, #1d4ed8, #0f766e)",
                  color: "#fff",
                  flexShrink: 0,
                  boxShadow: "0 18px 30px rgba(29, 78, 216, 0.2)",
                }}
              >
                <Wallet size={22} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Ringkasan Metode Pembayaran
                </Title>
                <Paragraph
                  type='secondary'
                  style={{ margin: "6px 0 0", maxWidth: 720 }}
                >
                  Pantau kanal pembayaran yang tersedia untuk siswa dan pastikan
                  metode aktif sesuai dengan kebijakan operasional satuan.
                </Paragraph>
              </div>
            </Flex>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 18,
                background: "#ffffff",
                border: "1px solid rgba(148,163,184,0.16)",
                minWidth: 200,
              }}
            >
              <Text type='secondary'>Metode terdaftar</Text>
              <Title level={5} style={{ margin: "6px 0 0" }}>
                {(paymentMethods || []).length} kanal
              </Title>
            </div>
          </Flex>
        </div>

        <Row gutter={[14, 14]}>
          {(paymentMethods || []).map((item) => (
            <Col xs={24} md={12} xl={8} key={item.id}>
              <MotionDiv
                whileHover={{ y: -3 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Card
                  size='small'
                  style={{
                    height: "100%",
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.14)",
                    boxShadow: "0 12px 28px rgba(15,23,42,0.05)",
                    background: "#ffffff",
                  }}
                >
                  <Flex vertical gap={14}>
                    <Flex justify='space-between' align='flex-start' gap={12}>
                      <Flex align='center' gap={12}>
                        <div
                          style={{
                            width: 42,
                            height: 42,
                            display: "grid",
                            placeItems: "center",
                            borderRadius: 14,
                            background: "linear-gradient(135deg, #dbeafe, #dcfce7)",
                            color: "#0f766e",
                            flexShrink: 0,
                          }}
                        >
                          {(item.method_type || "")
                            .toLowerCase()
                            .includes("bank") ? (
                            <Building2 size={18} />
                          ) : (
                            <CreditCard size={18} />
                          )}
                        </div>
                        <div>
                          <Text strong>{item.name}</Text>
                          <div
                            style={{
                              fontSize: 12,
                              color: "#64748b",
                              marginTop: 2,
                            }}
                          >
                            {item.method_type}
                          </div>
                        </div>
                      </Flex>
                      <Tag
                        color={item.is_active ? "green" : "default"}
                        style={{ borderRadius: 999, fontWeight: 700 }}
                      >
                        {item.is_active ? "Aktif" : "Nonaktif"}
                      </Tag>
                    </Flex>
                    <Text type='secondary' style={{ fontSize: 13 }}>
                      Kanal ini akan muncul mengikuti konfigurasi gateway atau
                      rekening yang aktif pada satuan.
                    </Text>
                  </Flex>
                </Card>
              </MotionDiv>
            </Col>
          ))}
        </Row>

        {!paymentMethods.length ? (
          <Alert
            type='warning'
            showIcon
            message='Belum ada metode pembayaran aktif'
            description='Midtrans atau rekening bank akan otomatis membuat metode pembayaran saat disimpan.'
            style={{ borderRadius: 16 }}
          />
        ) : null}
      </Space>
    </Card>
  </MotionDiv>
);

export default PaymentMethodsCard;
