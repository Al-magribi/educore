import React from "react";
import dayjs from "dayjs";
import { Alert, Card, Col, Row, Space, Statistic, Typography } from "antd";

const { Title, Text } = Typography;

const AiOperationalSummary = ({ config }) => (
  <Card
    variant='borderless'
    style={{
      borderRadius: 24,
      boxShadow: "0 18px 42px rgba(148, 163, 184, 0.16)",
    }}
    styles={{ body: { padding: 22 } }}
  >
    <Space orientation='vertical' size={16} style={{ width: "100%" }}>
      <div>
        <Title level={4} style={{ margin: 0 }}>
          Ringkasan Operasional
        </Title>
        <Text type='secondary'>
          Ringkas, cepat dibaca, dan membantu validasi sebelum fitur AI dipakai di
          kelas.
        </Text>
      </div>

      <Row gutter={[12, 12]}>
        <Col span={12}>
          <Card
            variant='borderless'
            style={{ background: "#f8fafc", borderRadius: 18 }}
            styles={{ body: { padding: 18 } }}
          >
            <Statistic
              title='Durasi Maks'
              value={config?.max_audio_duration_seconds || 0}
              suffix='detik'
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card
            variant='borderless'
            style={{ background: "#f8fafc", borderRadius: 18 }}
            styles={{ body: { padding: 18 } }}
          >
            <Statistic
              title='Ukuran Maks'
              value={config?.max_audio_file_size_mb || 0}
              suffix='MB'
            />
          </Card>
        </Col>
      </Row>

      <Alert
        type={
          config?.last_test_status === "success"
            ? "success"
            : config?.last_test_status === "failed"
              ? "error"
              : "info"
        }
        showIcon
        title={
          config?.last_test_message ||
          "Belum ada pengujian koneksi. Jalankan test connection setelah menyimpan API key."
        }
        description={
          config?.last_test_at
            ? `Tes terakhir: ${dayjs(config.last_test_at).format("DD MMM YYYY HH:mm")}`
            : "Status akan diperbarui setelah pengujian koneksi dilakukan."
        }
      />
    </Space>
  </Card>
);

export default AiOperationalSummary;
