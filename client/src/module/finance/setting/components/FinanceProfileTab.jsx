import { Button, Card, Col, Form, Image, Input, Row, Space, Upload, Alert } from "antd";
import { UploadOutlined, UserOutlined } from "@ant-design/icons";
import { cardStyle } from "../../fee/others/constants";

const FinanceProfileTab = ({
  form,
  selectedHomebaseName,
  isUploadingSignature,
  isSavingFinanceProfile,
  onUploadSignature,
  onSubmit,
}) => (
  <Card
    style={cardStyle}
    title={
      <Space>
        <UserOutlined />
        <span>Data Petugas Invoice</span>
      </Space>
    }
  >
    <Space vertical size={16} style={{ width: "100%" }}>
      <Alert
        type='info'
        showIcon
        title={`Satuan: ${selectedHomebaseName || "-"}`}
        description='Nama petugas dan tanda tangan ini akan dipakai pada invoice satuan.'
      />

      <Form form={form} layout='vertical'>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item
              name='officer_name'
              label='Nama Petugas Keuangan'
              rules={[{ required: true, message: "Nama petugas wajib diisi" }]}
            >
              <Input placeholder='Nama petugas yang tampil di invoice' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              name='officer_signature_url'
              label='Gambar Tanda Tangan'
              rules={[{ required: true, message: "Tanda tangan wajib diunggah" }]}
            >
              <Input
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
              <div style={{ marginBottom: 16 }}>
                <Image
                  src={getFieldValue("officer_signature_url")}
                  alt='Tanda tangan petugas'
                  width={220}
                  style={{
                    borderRadius: 12,
                    border: "1px solid rgba(148,163,184,0.2)",
                    padding: 8,
                    background: "#fff",
                  }}
                />
              </div>
            ) : null
          }
        </Form.Item>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Button
            type='primary'
            onClick={onSubmit}
            loading={isSavingFinanceProfile}
            icon={<UserOutlined />}
          >
            Simpan Data Petugas
          </Button>
        </div>
      </Form>
    </Space>
  </Card>
);

export default FinanceProfileTab;
