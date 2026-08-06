import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Grid,
  Image,
  Input,
  Row,
  Space,
  Typography,
  Upload,
} from "antd";
import { motion } from "framer-motion";
import { FileSignature, ShieldCheck } from "lucide-react";
import { UploadOutlined, UserOutlined } from "@ant-design/icons";
import { cardStyle } from "../../fee/others/constants";

const { Paragraph, Text, Title } = Typography;
const MotionDiv = motion.div;

const FinanceProfileTab = ({
  form,
  selectedHomebaseName,
  isUploadingSignature,
  isSavingFinanceProfile,
  onUploadSignature,
  onSubmit,
}) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <MotionDiv initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        style={{
          ...cardStyle,
          borderRadius: isMobile ? 18 : undefined,
          background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
          overflow: "hidden",
        }}
        styles={{ body: { padding: isMobile ? 14 : 24 } }}
      >
        <Space vertical size={16} style={{ width: "100%" }}>
          <div
            style={{
              padding: isMobile ? 14 : 20,
              borderRadius: isMobile ? 16 : 22,
              border: "1px solid rgba(59,130,246,0.14)",
              background:
                "linear-gradient(135deg, rgba(239,246,255,0.96), rgba(240,253,250,0.95))",
            }}
          >
            <Flex justify='space-between' align='flex-start' wrap='wrap' gap={16}>
              <Flex align='flex-start' gap={14} style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    width: isMobile ? 44 : 52,
                    height: isMobile ? 44 : 52,
                    display: "grid",
                    placeItems: "center",
                    borderRadius: 18,
                    background: "linear-gradient(135deg, #2563eb, #0f766e)",
                    color: "#fff",
                    flexShrink: 0,
                    boxShadow: "0 18px 30px rgba(37, 99, 235, 0.2)",
                  }}
                >
                  <FileSignature size={isMobile ? 18 : 22} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <Title
                    level={isMobile ? 5 : 4}
                    style={{ margin: 0, lineHeight: 1.3 }}
                  >
                    Profil Petugas Invoice
                  </Title>
                  {!isMobile ? (
                    <Paragraph
                      type='secondary'
                      style={{ margin: "6px 0 0", maxWidth: 720 }}
                    >
                      Tentukan nama petugas keuangan dan tanda tangan resmi yang akan
                      muncul pada invoice agar dokumen pembayaran tetap konsisten dan
                      siap dipakai di produksi.
                    </Paragraph>
                  ) : null}
                </div>
              </Flex>
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 18,
                  background: "#ffffff",
                  border: "1px solid rgba(148,163,184,0.16)",
                  minWidth: isMobile ? "100%" : 220,
                  width: isMobile ? "100%" : undefined,
                }}
              >
                <Text type='secondary'>Satuan aktif</Text>
                <Title
                  level={5}
                  style={{ margin: "6px 0 0", wordBreak: "break-word" }}
                >
                  {selectedHomebaseName || "-"}
                </Title>
              </div>
            </Flex>
          </div>

          <Alert
            type='info'
            showIcon
            message={`Satuan: ${selectedHomebaseName || "-"}`}
            description='Nama petugas dan tanda tangan ini akan dipakai pada invoice satuan.'
            style={{ borderRadius: 16 }}
          />

          <Form form={form} layout='vertical'>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  name='officer_name'
                  label='Nama Petugas Keuangan'
                  rules={[{ required: true, message: "Nama petugas wajib diisi" }]}
                >
                  <Input
                    size='large'
                    placeholder='Nama petugas yang tampil di invoice'
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  name='officer_signature_url'
                  label='Gambar Tanda Tangan'
                  rules={[
                    { required: true, message: "Tanda tangan wajib diunggah" },
                  ]}
                >
                  <Input
                    size='large'
                    placeholder='URL tanda tangan'
                    readOnly
                    addonAfter={
                      <Upload
                        accept='image/*'
                        showUploadList={false}
                        customRequest={onUploadSignature}
                      >
                        <Button
                          type='link'
                          icon={<UploadOutlined />}
                          loading={isUploadingSignature}
                          style={{ paddingInline: 0 }}
                        >
                          Upload
                        </Button>
                      </Upload>
                    }
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              noStyle
              shouldUpdate={(prevValues, currentValues) =>
                prevValues.officer_signature_url !==
                currentValues.officer_signature_url
              }
            >
              {({ getFieldValue }) =>
                getFieldValue("officer_signature_url") ? (
                  <MotionDiv
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{ marginBottom: 16 }}
                  >
                    <Card
                      size='small'
                      style={{
                        borderRadius: 20,
                        border: "1px solid rgba(148,163,184,0.16)",
                        background: "#ffffff",
                      }}
                      styles={{ body: { padding: isMobile ? 14 : 18 } }}
                    >
                      <Flex
                        justify='space-between'
                        align='center'
                        wrap='wrap'
                        gap={14}
                      >
                        <div style={{ minWidth: 0 }}>
                          <Text strong>Pratinjau tanda tangan</Text>
                          <div
                            style={{
                              marginTop: 4,
                              color: "#64748b",
                              fontSize: 13,
                            }}
                          >
                            File ini akan ditampilkan pada invoice resmi.
                          </div>
                        </div>
                        <Flex
                          align='center'
                          gap={8}
                          style={{
                            padding: "8px 12px",
                            borderRadius: 999,
                            background: "rgba(240,253,244,0.9)",
                            border: "1px solid rgba(34,197,94,0.14)",
                            color: "#166534",
                          }}
                        >
                          <ShieldCheck size={14} />
                          <span>Siap digunakan</span>
                        </Flex>
                      </Flex>
                      <div style={{ marginTop: 16 }}>
                        <Image
                          src={getFieldValue("officer_signature_url")}
                          alt='Tanda tangan petugas'
                          width={isMobile ? "100%" : 220}
                          style={{
                            borderRadius: 12,
                            border: "1px solid rgba(148,163,184,0.2)",
                            padding: 8,
                            background: "#fff",
                            maxWidth: isMobile ? 220 : undefined,
                          }}
                        />
                      </div>
                    </Card>
                  </MotionDiv>
                ) : null
              }
            </Form.Item>

            <Flex justify={isMobile ? "stretch" : "flex-end"}>
              <Button
                type='primary'
                onClick={onSubmit}
                loading={isSavingFinanceProfile}
                icon={<UserOutlined />}
                block={isMobile}
                size='large'
              >
                Simpan Data Petugas
              </Button>
            </Flex>
          </Form>
        </Space>
      </Card>
    </MotionDiv>
  );
};

export default FinanceProfileTab;
