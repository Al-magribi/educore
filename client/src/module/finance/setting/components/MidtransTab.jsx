import { Button, Card, Col, Form, Input, InputNumber, Row, Space, Switch, Tag, Alert } from "antd";
import { LinkOutlined, SettingOutlined } from "@ant-design/icons";
import { cardStyle, rupiahInputProps } from "../../fee/others/constants";

const MidtransTab = ({
  form,
  gatewayConfig,
  selectedHomebaseName,
  isSavingMidtrans,
  onSubmit,
}) => (
  <Card
    style={cardStyle}
    title={
      <Space>
        <SettingOutlined />
        <span>Konfigurasi Midtrans</span>
      </Space>
    }
    extra={
      <Tag color={gatewayConfig?.is_active ? "green" : "default"}>
        {gatewayConfig?.is_active ? "Aktif" : "Nonaktif"}
      </Tag>
    }
  >
    <Space vertical size={16} style={{ width: "100%" }}>
      <Alert
        type='info'
        showIcon
        title={`Satuan: ${selectedHomebaseName || "-"}`}
        description='Client key dapat ditampilkan kembali. Server key tidak ditampilkan dan hanya diganti jika diisi ulang.'
      />

      <Form form={form} layout='vertical' onFinish={onSubmit}>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name='merchant_id'
              label='Merchant ID'
              rules={[{ required: true, message: "Merchant ID wajib diisi" }]}
            >
              <Input placeholder='G123456789' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name='client_key'
              label='Client Key'
              rules={[{ required: true, message: "Client key wajib diisi" }]}
            >
              <Input placeholder='SB-Mid-client-...' />
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
          <Input.Password placeholder='SB-Mid-server-...' />
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
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item name='is_active' label='Aktif' valuePropName='checked'>
              <Switch />
            </Form.Item>
          </Col>
          <Col xs={24} md={8}>
            <Form.Item
              name='snap_enabled'
              label='Snap Enabled'
              valuePropName='checked'
            >
              <Switch />
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
);

export default MidtransTab;
