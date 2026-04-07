import React, { useEffect } from "react";
import {
  Alert,
  Button,
  Col,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Switch,
  Typography,
} from "antd";

const { Text } = Typography;

const ParentAccountForm = ({
  open,
  onCancel,
  onSubmit,
  loading,
  parentRecord,
  studentOptions = [],
}) => {
  const [form] = Form.useForm();
  const formId = "parent-account-form";

  useEffect(() => {
    if (!open) {
      form.resetFields();
      return;
    }

    if (!parentRecord) {
      form.setFieldsValue({
        is_active: true,
        student_ids: [],
      });
      return;
    }

    form.setFieldsValue({
      full_name: parentRecord.full_name,
      username: parentRecord.username,
      email: parentRecord.email,
      phone: parentRecord.phone,
      is_active: Boolean(parentRecord.is_active),
      student_ids: (parentRecord.students || []).map((item) => item.student_id),
      password: "",
    });
  }, [form, open, parentRecord]);

  return (
    <Modal
      open={open}
      title={parentRecord ? "Ubah Akun Orang Tua" : "Tambah Akun Orang Tua"}
      onCancel={onCancel}
      width={760}
      destroyOnHidden
      centered
      footer={[
        <Button key='cancel' onClick={onCancel}>
          Batal
        </Button>,
        <Button
          key='submit'
          type='primary'
          htmlType='submit'
          form={formId}
          loading={loading}
        >
          {parentRecord ? "Simpan Perubahan" : "Simpan Akun"}
        </Button>,
      ]}
      styles={{
        body: {
          maxHeight: "calc(100vh - 220px)",
          overflowY: "auto",
          paddingRight: 8,
        },
      }}
    >
      <Form
        id={formId}
        form={form}
        layout='vertical'
        onFinish={onSubmit}
        initialValues={{ is_active: true, student_ids: [] }}
      >
        <Alert
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
          message='Satu akun orang tua dapat dihubungkan ke lebih dari satu siswa.'
        />

        <Row gutter={[12, 8]}>
          <Col xs={24} md={12}>
            <Form.Item
              label='Nama Lengkap'
              name='full_name'
              rules={[{ required: true, message: "Nama lengkap wajib diisi." }]}
            >
              <Input placeholder='Nama akun orang tua' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label='Username Login'
              name='username'
              rules={[{ required: true, message: "Username wajib diisi." }]}
            >
              <Input placeholder='username.parent' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={parentRecord ? "Password Baru" : "Password"}
              name='password'
              rules={
                parentRecord
                  ? []
                  : [{ required: true, message: "Password wajib diisi." }]
              }
              extra={
                parentRecord
                  ? "Kosongkan jika password tidak diubah."
                  : "Gunakan minimal 6 karakter agar mudah dibagikan ke wali."
              }
            >
              <Input.Password placeholder='Masukkan password' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label='No. Telepon' name='phone'>
              <Input placeholder='08xxxxxxxxxx' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label='Email' name='email'>
              <Input placeholder='orangtua@email.com' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label='Status Akun'
              name='is_active'
              valuePropName='checked'
            >
              <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item
              label='Hubungkan Siswa'
              name='student_ids'
              rules={[
                {
                  required: true,
                  type: "array",
                  min: 1,
                  message: "Pilih minimal satu siswa.",
                },
              ]}
            >
              <Select
                mode='multiple'
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                placeholder='Pilih satu atau lebih siswa'
                options={studentOptions}
                maxTagCount='responsive'
                virtual={false}
              />
            </Form.Item>
          </Col>
        </Row>

        <Text type='secondary'>
          Gunakan username yang mudah diingat. Siswa yang dipilih akan tampil di
          akun orang tua yang sama.
        </Text>
      </Form>
    </Modal>
  );
};

export default ParentAccountForm;
