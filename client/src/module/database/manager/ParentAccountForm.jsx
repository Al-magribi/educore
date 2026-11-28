import React, { useEffect } from "react";
import { Alert, Col, Divider, Form, Grid, Input, Row, Select, Switch } from "antd";
import { KeyRound, Mail, Smartphone, UserRoundPlus, UserRoundPen } from "lucide-react";

import { FormModal } from "../../../components/ui/muse/DataSection";

const { useBreakpoint } = Grid;

const ParentAccountForm = ({ open, onCancel, onSubmit, loading, parentRecord, studentOptions = [] }) => {
  const [form] = Form.useForm();
  const screens = useBreakpoint();
  const isEdit = Boolean(parentRecord);

  useEffect(() => {
    if (!open) return;

    if (!parentRecord) {
      form.resetFields();
      form.setFieldsValue({ is_active: true, student_ids: [] });
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
    <FormModal
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={loading}
      width={screens.md ? 720 : "calc(100vw - 16px)"}
      icon={isEdit ? <UserRoundPen size={16} /> : <UserRoundPlus size={16} />}
      title={isEdit ? "Ubah Akun Orang Tua" : "Tambah Akun Orang Tua"}
      description='Atur data login dan siswa yang bisa dipantau akun ini.'
      okText={isEdit ? "Simpan Perubahan" : "Simpan Akun"}
      forceRender
      styles={{ body: { maxHeight: "calc(100vh - 220px)", overflowY: "auto", overflowX: "hidden" } }}
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={onSubmit}
        initialValues={{ is_active: true, student_ids: [] }}
        requiredMark={false}
      >
        <Row gutter={[16, 0]}>
          <Col xs={24} md={12}>
            <Form.Item
              label='Nama Lengkap'
              name='full_name'
              rules={[{ required: true, message: "Nama lengkap wajib diisi" }]}
            >
              <Input placeholder='Nama orang tua / wali' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label='Username Login'
              name='username'
              rules={[{ required: true, message: "Username wajib diisi" }]}
            >
              <Input placeholder='contoh: ayah.budi' autoComplete='off' />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item
              label={isEdit ? "Password Baru" : "Password"}
              name='password'
              rules={isEdit ? [] : [{ required: true, message: "Password wajib diisi" }]}
              extra={
                isEdit
                  ? "Kosongkan jika password tidak diubah."
                  : "Disarankan minimal 6 karakter."
              }
            >
              <Input.Password
                placeholder='Masukkan password'
                prefix={<KeyRound size={16} />}
                autoComplete='new-password'
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label='No. Telepon' name='phone'>
              <Input placeholder='08xxxxxxxxxx' prefix={<Smartphone size={16} />} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label='Email' name='email'>
              <Input placeholder='orangtua@email.com' prefix={<Mail size={16} />} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item label='Status Akun' name='is_active' valuePropName='checked'>
              <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
            </Form.Item>
          </Col>
        </Row>

        <Divider style={{ margin: "4px 0 16px" }} />

        <Form.Item
          label='Siswa Terhubung'
          name='student_ids'
          rules={[{ required: true, type: "array", min: 1, message: "Pilih minimal satu siswa" }]}
        >
          <Select
            mode='multiple'
            allowClear
            showSearch={{ optionFilterProp: "label" }}
            placeholder='Cari nama atau NIS siswa'
            options={studentOptions}
            maxTagCount='responsive'
          />
        </Form.Item>

        <Alert
          type='info'
          showIcon
          title='Satu akun bisa terhubung ke beberapa siswa'
          description='Pilih semua anak dari orang tua yang sama agar cukup memakai satu akun login.'
        />
      </Form>
    </FormModal>
  );
};

export default ParentAccountForm;
