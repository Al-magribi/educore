import React, { useEffect } from "react";
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Select,
  Space,
  Tabs,
  Typography,
} from "antd";

const { Text } = Typography;

const normalizeDateInput = (value) => {
  if (!value) return undefined;
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }
  return value;
};

const DbForm = ({ open, onCancel, onSubmit, loading, student }) => {
  const [form] = Form.useForm();
  const formId = "db-student-form";

  useEffect(() => {
    if (!open) return;

    if (!student) {
      form.resetFields();
      return;
    }

    form.setFieldsValue({
      full_name: student.full_name,
      gender: student.gender,
      nis: student.nis,
      nisn: student.nisn,
      birth_place: student.birth_place,
      birth_date: normalizeDateInput(student.birth_date),
      height: student.height,
      weight: student.weight,
      head_circumference: student.head_circumference,
      order_number: student.order_number,
      siblings_count: student.siblings_count,
      postal_code: student.postal_code,
      address: student.address,
      father_name: student.father_name,
      father_nik: student.father_nik,
      father_birth_place: student.father_birth_place,
      father_birth_date: normalizeDateInput(student.father_birth_date),
      father_phone: student.father_phone,
      mother_name: student.mother_name,
      mother_nik: student.mother_nik,
      mother_birth_place: student.mother_birth_place,
      mother_birth_date: normalizeDateInput(student.mother_birth_date),
      mother_phone: student.mother_phone,
      siblings: (student.siblings || []).map((item) => ({
        name: item.name,
        gender: item.gender,
        birth_date: normalizeDateInput(item.birth_date),
      })),
    });
  }, [form, open, student]);

  const handleFinish = (values) => {
    onSubmit({
      ...values,
      siblings: values.siblings || [],
    });
  };

  return (
    <Modal
      open={open}
      title="Perbarui Database Siswa"
      onCancel={onCancel}
      width={980}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          Batal
        </Button>,
        <Button
          key="submit"
          type="primary"
          htmlType="submit"
          form={formId}
          loading={loading}
        >
          Simpan Perubahan
        </Button>,
      ]}
      destroyOnHidden
      forceRender
      centered
      styles={{
        body: {
          maxHeight: "calc(100vh - 220px)",
          overflowY: "auto",
          overflowX: "hidden",
          paddingRight: 8,
        },
      }}
    >
      <Form id={formId} form={form} layout="vertical" onFinish={handleFinish}>
        <Space vertical size={12} style={{ width: "100%" }}>
          <Tabs
            items={[
              {
                key: "personal",
                label: "Informasi Pribadi",
                children: (
                  <Card title="Informasi Pribadi Siswa" size="small">
                    <Row gutter={[12, 8]}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Nama Lengkap" name="full_name">
                          <Input placeholder="Nama lengkap siswa" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="Jenis Kelamin" name="gender">
                          <Select
                            allowClear
                            placeholder="Pilih jenis kelamin"
                            options={[
                              { label: "Laki-laki", value: "Laki-laki" },
                              { label: "Perempuan", value: "Perempuan" },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="NIS" name="nis">
                          <Input placeholder="NIS" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="NISN" name="nisn">
                          <Input placeholder="NISN" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Tempat Lahir" name="birth_place">
                          <Input placeholder="Tempat lahir" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Tanggal Lahir" name="birth_date">
                          <Input type="date" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Tinggi" name="height">
                          <Input placeholder="Contoh: 160 cm" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Berat" name="weight">
                          <Input placeholder="Contoh: 52 kg" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Kepala" name="head_circumference">
                          <Input placeholder="Lingkar kepala" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Anak Ke-" name="order_number">
                          <InputNumber min={1} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Jumlah Saudara" name="siblings_count">
                          <InputNumber min={0} style={{ width: "100%" }} />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="Kode Pos" name="postal_code">
                          <Input placeholder="Kode pos" />
                        </Form.Item>
                      </Col>
                      <Col xs={24}>
                        <Form.Item label="Alamat Lengkap" name="address">
                          <Input.TextArea
                            rows={3}
                            placeholder="Alamat lengkap siswa"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ),
              },
              {
                key: "parents",
                label: "Informasi Orang Tua",
                children: (
                  <Card title="Informasi Orang Tua" size="small">
                    <Row gutter={[12, 8]}>
                      <Col xs={24} md={12}>
                        <Form.Item label="Nama Ayah" name="father_name">
                          <Input placeholder="Nama ayah" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="NIK Ayah" name="father_nik">
                          <Input placeholder="NIK ayah" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          label="Tempat Lahir Ayah"
                          name="father_birth_place"
                        >
                          <Input placeholder="Tempat lahir ayah" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          label="Tanggal Lahir Ayah"
                          name="father_birth_date"
                        >
                          <Input type="date" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="No Tlp Ayah" name="father_phone">
                          <Input placeholder="No telepon ayah" />
                        </Form.Item>
                      </Col>

                      <Col xs={24} md={12}>
                        <Form.Item label="Nama Ibu" name="mother_name">
                          <Input placeholder="Nama ibu" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={12}>
                        <Form.Item label="NIK Ibu" name="mother_nik">
                          <Input placeholder="NIK ibu" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          label="Tempat Lahir Ibu"
                          name="mother_birth_place"
                        >
                          <Input placeholder="Tempat lahir ibu" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item
                          label="Tanggal Lahir Ibu"
                          name="mother_birth_date"
                        >
                          <Input type="date" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} md={8}>
                        <Form.Item label="No Tlp Ibu" name="mother_phone">
                          <Input placeholder="No telepon ibu" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Card>
                ),
              },
              {
                key: "family",
                label: "Informasi Keluarga",
                children: (
                  <Card
                    title="Informasi Keluarga (Selain Orang Tua)"
                    size="small"
                  >
                    <Form.List name="siblings">
                      {(fields, { add, remove }) => (
                        <Space
                          direction="vertical"
                          size={8}
                          style={{ width: "100%" }}
                        >
                          {fields.map((field, index) => (
                            <Card
                              key={field.key}
                              size="small"
                              type="inner"
                              title={`Anggota Keluarga ${index + 1}`}
                              extra={
                                <Button
                                  type="link"
                                  danger
                                  onClick={() => remove(field.name)}
                                >
                                  Hapus
                                </Button>
                              }
                            >
                              <Row gutter={[12, 8]}>
                                <Col xs={24} md={10}>
                                  <Form.Item
                                    label="Nama"
                                    name={[field.name, "name"]}
                                    rules={[
                                      {
                                        required: true,
                                        message:
                                          "Nama anggota keluarga wajib diisi",
                                      },
                                    ]}
                                  >
                                    <Input placeholder="Nama anggota keluarga" />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={7}>
                                  <Form.Item
                                    label="Jenis Kelamin"
                                    name={[field.name, "gender"]}
                                  >
                                    <Select
                                      allowClear
                                      placeholder="Jenis kelamin"
                                      options={[
                                        {
                                          label: "Laki-laki",
                                          value: "Laki-laki",
                                        },
                                        {
                                          label: "Perempuan",
                                          value: "Perempuan",
                                        },
                                      ]}
                                    />
                                  </Form.Item>
                                </Col>
                                <Col xs={24} md={7}>
                                  <Form.Item
                                    label="Tanggal Lahir"
                                    name={[field.name, "birth_date"]}
                                  >
                                    <Input type="date" />
                                  </Form.Item>
                                </Col>
                              </Row>
                            </Card>
                          ))}

                          <Button type="dashed" onClick={() => add()}>
                            + Tambah Anggota Keluarga
                          </Button>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Untuk status lengkap, minimal isi 1 anggota
                            keluarga.
                          </Text>
                        </Space>
                      )}
                    </Form.List>
                  </Card>
                ),
              },
            ]}
          />
        </Space>
      </Form>
    </Modal>
  );
};

export default DbForm;
