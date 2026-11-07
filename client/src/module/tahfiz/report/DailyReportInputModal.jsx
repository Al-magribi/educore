import React from "react";
import { CalendarOutlined, EditOutlined } from "@ant-design/icons";
import {
  Button,
  Col,
  DatePicker,
  Divider,
  Form,
  Modal,
  Row,
  Select,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";

const { Title, Text } = Typography;

const DailyReportInputModal = ({
  open,
  editingId,
  onCancel,
  form,
  onSubmit,
  students,
  activityTypes,
  surahs,
  maxStartAyat,
  maxEndAyat,
  startAyatOptions,
  endAyatOptions,
  loading,
}) => (
  <Modal
    open={open}
    onCancel={onCancel}
    title={null}
    footer={null}
    width={920}
    destroyOnHidden
    centered
  >
    <Space direction='vertical' size='middle' style={{ width: "100%" }}>
      <div style={{ padding: "4px 4px 0" }}>
        <Space align='start'>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, rgba(22,119,255,0.14), rgba(22,119,255,0.24))",
              color: "#1677ff",
            }}
          >
            {editingId ? <EditOutlined /> : <CalendarOutlined />}
          </div>
          <Space direction='vertical' size={2}>
            <Title level={4} style={{ margin: 0 }}>
              {editingId ? "Edit Setoran Hafalan" : "Input Setoran Hafalan"}
            </Title>
            <Text type='secondary'>
              Lengkapi data setoran dengan rentang ayat yang jelas dan mudah
              diverifikasi.
            </Text>
          </Space>
        </Space>
      </div>

      <Divider style={{ margin: "4px 0 0" }} />

      <Form
        form={form}
        layout='vertical'
        initialValues={{ date: dayjs() }}
        onFinish={onSubmit}
      >
        <Row gutter={[16, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              label='Siswa'
              name='student_id'
              rules={[{ required: true, message: "Siswa wajib dipilih." }]}
            >
              <Select
                size='large'
                options={students.map((item) => ({
                  value: item.student_id,
                  label: `${item.student_name} (${item.class_name || "-"})`,
                }))}
                placeholder='Pilih siswa'
                virtual={false}
                showSearch={{ optionFilterProp: "label" }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              label='Tanggal'
              name='date'
              rules={[{ required: true, message: "Tanggal wajib diisi." }]}
            >
              <DatePicker
                size='large'
                style={{ width: "100%" }}
                format='YYYY-MM-DD'
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              label='Jenis'
              name='type_id'
              rules={[{ required: true, message: "Jenis setoran wajib dipilih." }]}
            >
              <Select
                size='large'
                options={activityTypes.map((item) => ({
                  value: item.id,
                  label: item.name,
                }))}
                placeholder='Pilih jenis'
              />
            </Form.Item>
          </Col>
        </Row>

        <div
          style={{
            padding: 18,
            borderRadius: 14,
            background: "#fafafa",
            border: "1px solid #f0f0f0",
            marginBottom: 20,
          }}
        >
          <Text strong style={{ display: "block", marginBottom: 14 }}>
            Rentang Setoran
          </Text>
          <Row gutter={[16, 8]}>
            <Col xs={24} md={12}>
              <Form.Item
                label='Surah Awal'
                name='start_surah_id'
                rules={[{ required: true, message: "Surah awal wajib dipilih." }]}
              >
                <Select
                  size='large'
                  showSearch={{ optionFilterProp: "label" }}
                  virtual={false}
                  options={surahs.map((item) => ({
                    value: item.id,
                    label: `${item.number}. ${item.name_latin}`,
                  }))}
                  placeholder='Pilih surah awal'
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label='Surah Akhir'
                name='end_surah_id'
                rules={[{ required: true, message: "Surah akhir wajib dipilih." }]}
              >
                <Select
                  size='large'
                  showSearch={{ optionFilterProp: "label" }}
                  virtual={false}
                  options={surahs.map((item) => ({
                    value: item.id,
                    label: `${item.number}. ${item.name_latin}`,
                  }))}
                  placeholder='Pilih surah akhir'
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label='Ayat Awal'
                name='start_ayat'
                rules={[{ required: true, message: "Ayat awal wajib diisi." }]}
              >
                <Select
                  size='large'
                  placeholder={
                    maxStartAyat
                      ? "Pilih ayat awal"
                      : "Pilih surah awal terlebih dahulu"
                  }
                  disabled={!maxStartAyat}
                  options={startAyatOptions}
                  showSearch={{ optionFilterProp: "label" }}
                  virtual={false}
                />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label='Ayat Akhir'
                name='end_ayat'
                rules={[{ required: true, message: "Ayat akhir wajib diisi." }]}
              >
                <Select
                  size='large'
                  placeholder={
                    maxEndAyat
                      ? "Pilih ayat akhir"
                      : "Pilih surah akhir terlebih dahulu"
                  }
                  disabled={!maxEndAyat}
                  options={endAyatOptions}
                  showSearch={{ optionFilterProp: "label" }}
                  virtual={false}
                />
              </Form.Item>
            </Col>
          </Row>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <Button size='large' onClick={onCancel}>
            Batal
          </Button>
          <Button type='primary' size='large' htmlType='submit' loading={loading}>
            {editingId ? "Perbarui Setoran" : "Simpan Setoran"}
          </Button>
        </div>
      </Form>
    </Space>
  </Modal>
);

export default DailyReportInputModal;
