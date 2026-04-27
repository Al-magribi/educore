import React from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import {
  BadgeCheck,
  BrainCircuit,
  FileCheck2,
  FileText,
  KeyRound,
  Languages,
  Mic2,
  Radio,
  Save,
  Sparkles,
} from "lucide-react";

const { Title, Text } = Typography;

const sectionCardStyle = {
  borderRadius: 20,
  border: "1px solid rgba(148, 163, 184, 0.18)",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
};

const AiConfigFormCard = ({
  config,
  isMobile,
  isSaving,
  isTesting,
  token,
  handleTestConnection,
  handleSubmit,
  audioModelOptions,
  textModelOptions,
  languageOptions,
}) => (
  <Card
    variant='borderless'
    style={{
      borderRadius: 24,
      boxShadow: "0 18px 42px rgba(148, 163, 184, 0.16)",
    }}
    styles={{ body: { padding: isMobile ? 20 : 28 } }}
  >
    <Flex
      justify='space-between'
      align={isMobile ? "flex-start" : "center"}
      vertical={isMobile}
      gap={16}
    >
      <div>
        <Title level={4} style={{ margin: 0 }}>
          Pengaturan Koneksi
        </Title>
        <Text type='secondary'>
          Tentukan model, mode default, dan keamanan akses untuk fitur AI Anda.
        </Text>
      </div>
      <Space wrap>
        <Button
          onClick={handleTestConnection}
          loading={isTesting}
          icon={<BadgeCheck size={16} />}
        >
          Test
        </Button>
        <Button
          type='primary'
          loading={isSaving}
          icon={<Save size={16} />}
          onClick={handleSubmit}
        >
          Simpan
        </Button>
      </Space>
    </Flex>

    <Divider style={{ marginBlock: 20 }} />

    <Space orientation='vertical' size={16} style={{ width: "100%" }}>
      <Card variant='borderless' style={sectionCardStyle} styles={{ body: { padding: 18 } }}>
        <Space orientation='vertical' size={14} style={{ width: "100%" }}>
          <div>
            <Space size={10}>
              <BrainCircuit size={16} />
              <Title level={5} style={{ margin: 0 }}>
                Koneksi Umum OpenAI
              </Title>
            </Space>
            <Text type='secondary'>
              Berlaku untuk seluruh fitur AI guru: generator soal, pemeriksaan
              essay, dan speech to text.
            </Text>
          </div>

          <Row gutter={[18, 10]}>
            <Col xs={24} md={12}>
              <Form.Item label='Provider' name='provider'>
                <Input disabled prefix={<BrainCircuit size={16} />} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label='API Key OpenAI'
                name='api_key'
                extra={
                  config?.has_api_key
                    ? `API key tersimpan: ${config.api_key_hint || "tersedia"}`
                    : "Belum ada API key tersimpan."
                }
              >
                <Input.Password
                  placeholder='Masukkan API key baru jika ingin mengganti'
                  prefix={<KeyRound size={16} />}
                />
              </Form.Item>
            </Col>
          </Row>
        </Space>
      </Card>

      <Card variant='borderless' style={sectionCardStyle} styles={{ body: { padding: 18 } }}>
        <Space orientation='vertical' size={14} style={{ width: "100%" }}>
          <div>
            <Space size={10}>
              <FileText size={16} />
              <FileCheck2 size={16} />
              <Title level={5} style={{ margin: 0 }}>
                Generator Soal dan Pemeriksaan Essay
              </Title>
            </Space>
            <Text type='secondary'>
              Pengaturan model teks untuk fitur pembuatan soal dan penilaian jawaban
              uraian.
            </Text>
          </div>

          <Row gutter={[18, 10]}>
            <Col xs={24} md={12}>
              <Form.Item label='Model Teks Default' name='default_model_text'>
                <Select
                  options={textModelOptions}
                  placeholder='Pilih model teks'
                  suffixIcon={<Sparkles size={16} />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label='Bahasa Default' name='default_language'>
                <Select
                  options={languageOptions}
                  placeholder='Pilih bahasa'
                  suffixIcon={<Languages size={16} />}
                />
              </Form.Item>
            </Col>
          </Row>
        </Space>
      </Card>

      <Card variant='borderless' style={sectionCardStyle} styles={{ body: { padding: 18 } }}>
        <Space orientation='vertical' size={14} style={{ width: "100%" }}>
          <div>
            <Space size={10}>
              <Mic2 size={16} />
              <Title level={5} style={{ margin: 0 }}>
                Speech to Text
              </Title>
            </Space>
            <Text type='secondary'>
              Pengaturan khusus untuk transkripsi audio, termasuk mode default dan
              batas file.
            </Text>
          </div>

          <Row gutter={[18, 10]}>
            <Col xs={24} md={12}>
              <Form.Item label='Model Audio Default' name='default_model_audio'>
                <Select
                  options={audioModelOptions}
                  placeholder='Pilih model audio'
                  suffixIcon={<Mic2 size={16} />}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item label='Mode Default STT' name='default_mode'>
                <Segmented
                  block
                  options={[
                    {
                      label: (
                        <Space size={8}>
                          <Radio size={14} />
                          Live
                        </Space>
                      ),
                      value: "live",
                    },
                    {
                      label: (
                        <Space size={8}>
                          <Sparkles size={14} />
                          AI
                        </Space>
                      ),
                      value: "ai",
                    },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label='Batas Durasi Audio (detik)'
                name='max_audio_duration_seconds'
              >
                <Space.Compact style={{ width: "100%" }}>
                  <InputNumber min={30} step={30} style={{ width: "100%" }} />
                  <Button disabled>detik</Button>
                </Space.Compact>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label='Batas Ukuran File Audio'
                name='max_audio_file_size_mb'
              >
                <Space.Compact style={{ width: "100%" }}>
                  <InputNumber min={1} max={25} style={{ width: "100%" }} />
                  <Button disabled>MB</Button>
                </Space.Compact>
              </Form.Item>
            </Col>
          </Row>
        </Space>
      </Card>
    </Space>

    <Card
      variant='borderless'
      style={{
        marginTop: 10,
        borderRadius: 20,
        background:
          "linear-gradient(180deg, rgba(248,250,252,1) 0%, rgba(241,245,249,1) 100%)",
        border: `1px solid ${token.colorBorderSecondary}`,
      }}
      styles={{ body: { padding: 18 } }}
    >
      <Flex
        justify='space-between'
        align={isMobile ? "flex-start" : "center"}
        vertical={isMobile}
        gap={12}
      >
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Status Integrasi
          </Title>
          <Text type='secondary'>
            Matikan sementara jika Anda tidak ingin fitur AI memakai kredensial
            ini.
          </Text>
        </div>
        <Form.Item
          name='is_active'
          valuePropName='checked'
          style={{ marginBottom: 0 }}
        >
          <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
        </Form.Item>
      </Flex>
    </Card>
  </Card>
);

export default AiConfigFormCard;
