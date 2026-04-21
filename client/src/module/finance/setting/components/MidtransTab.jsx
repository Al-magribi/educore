import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { Activity, CreditCard, ShieldCheck } from "lucide-react";
import { LinkOutlined, SettingOutlined } from "@ant-design/icons";
import { cardStyle, rupiahInputProps } from "../../fee/others/constants";

const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const MidtransTab = ({
  form,
  gatewayConfig,
  selectedHomebaseName,
  isSavingMidtrans,
  onSubmit,
}) => (
  <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
    <Card
      style={{
        ...cardStyle,
        background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
      }}
      styles={{ body: { padding: 24 } }}
    >
      <Space vertical size={16} style={{ width: "100%" }}>
        <div
          style={{
            padding: 20,
            borderRadius: 22,
            border: "1px solid rgba(59,130,246,0.14)",
            background:
              "linear-gradient(135deg, rgba(239,246,255,0.96), rgba(238,242,255,0.94))",
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
                  background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                  color: "#fff",
                  boxShadow: "0 18px 30px rgba(37, 99, 235, 0.2)",
                  flexShrink: 0,
                }}
              >
                <CreditCard size={22} />
              </div>
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  Konfigurasi Midtrans
                </Title>
                <Paragraph
                  type='secondary'
                  style={{ margin: "6px 0 0", maxWidth: 720 }}
                >
                  Atur kredensial payment gateway, biaya virtual account, dan
                  status operasional agar kanal pembayaran online tetap stabil.
                </Paragraph>
              </div>
            </Flex>
            <Tag
              color={gatewayConfig?.is_active ? "green" : "default"}
              style={{ borderRadius: 999, fontWeight: 700, paddingInline: 12 }}
            >
              {gatewayConfig?.is_active ? "Gateway Aktif" : "Gateway Nonaktif"}
            </Tag>
          </Flex>

          <Row gutter={[12, 12]} style={{ marginTop: 12 }}>
            {[
              {
                title: "Satuan aktif",
                value: selectedHomebaseName || "-",
                icon: <Activity size={15} />,
                tone: "rgba(239,246,255,0.92)",
              },
              {
                title: "Mode",
                value: gatewayConfig?.is_production ? "Production" : "Sandbox",
                icon: <ShieldCheck size={15} />,
                tone: "rgba(240,253,250,0.92)",
              },
            ].map((item) => (
              <Col xs={24} md={12} key={item.title}>
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.14)",
                    background: item.tone,
                  }}
                >
                  <Flex align='center' gap={8} style={{ color: "#475569" }}>
                    {item.icon}
                    <Text type='secondary'>{item.title}</Text>
                  </Flex>
                  <Title level={5} style={{ margin: "8px 0 0" }}>
                    {item.value}
                  </Title>
                </div>
              </Col>
            ))}
          </Row>
        </div>

        <Alert
          type='info'
          showIcon
          message={`Satuan: ${selectedHomebaseName || "-"}`}
          description='Client key dapat ditampilkan kembali. Server key tidak ditampilkan dan hanya diganti jika diisi ulang.'
          style={{ borderRadius: 16 }}
        />

        <Form form={form} layout='vertical' onFinish={onSubmit}>
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name='merchant_id'
                label='Merchant ID'
                rules={[{ required: true, message: "Merchant ID wajib diisi" }]}
              >
                <Input size='large' placeholder='G123456789' />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                name='client_key'
                label='Client Key'
                rules={[{ required: true, message: "Client key wajib diisi" }]}
              >
                <Input size='large' placeholder='SB-Mid-client-...' />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name='server_key'
            label='Server Key Baru'
            extra={
              gatewayConfig?.has_server_key
                ? "Kosongkan jika tidak ingin mengganti server key yang sudah tersimpan."
                : "Wajib diisi untuk konfigurasi awal."
            }
          >
            <Input.Password size='large' placeholder='SB-Mid-server-...' />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item
                name='va_fee_amount'
                label='Biaya VA'
                extra='Biaya tambahan Virtual Account per transaksi.'
              >
                <InputNumber
                  {...rupiahInputProps}
                  min={0}
                  size='large'
                  style={{ width: "100%" }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item
                name='is_production'
                label='Mode Production'
                valuePropName='checked'
              >
                <Card
                  size='small'
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.14)",
                    boxShadow: "none",
                  }}
                >
                  <Flex justify='space-between' align='center' gap={12}>
                    <div>
                      <Text strong>Production</Text>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Gunakan kredensial live
                      </div>
                    </div>
                    <Switch />
                  </Flex>
                </Card>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item name='is_active' label='Aktif' valuePropName='checked'>
                <Card
                  size='small'
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.14)",
                    boxShadow: "none",
                  }}
                >
                  <Flex justify='space-between' align='center' gap={12}>
                    <div>
                      <Text strong>Aktifkan gateway</Text>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Tampilkan sebagai kanal online
                      </div>
                    </div>
                    <Switch />
                  </Flex>
                </Card>
              </Form.Item>
            </Col>
            <Col xs={24} md={8}>
              <Form.Item
                name='snap_enabled'
                label='Snap Enabled'
                valuePropName='checked'
              >
                <Card
                  size='small'
                  style={{
                    borderRadius: 18,
                    border: "1px solid rgba(148,163,184,0.14)",
                    boxShadow: "none",
                  }}
                >
                  <Flex justify='space-between' align='center' gap={12}>
                    <div>
                      <Text strong>Gunakan Snap</Text>
                      <div style={{ fontSize: 12, color: "#64748b" }}>
                        Aktifkan checkout Midtrans Snap
                      </div>
                    </div>
                    <Switch />
                  </Flex>
                </Card>
              </Form.Item>
            </Col>
          </Row>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Button
              type='primary'
              htmlType='submit'
              loading={isSavingMidtrans}
              icon={<LinkOutlined />}
            >
              Simpan Midtrans
            </Button>
          </div>
        </Form>
      </Space>
    </Card>
  </MotionDiv>
);

export default MidtransTab;
