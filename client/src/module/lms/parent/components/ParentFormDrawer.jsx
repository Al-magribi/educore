import React from "react";
import { Button, Drawer, Form, Input, Select, Space, Switch } from "antd";

const ParentFormDrawer = ({
  screens,
  open,
  editingParent,
  form,
  onClose,
  onSubmit,
  isSubmitting,
  studentOptions,
}) => {
  return (
    <Drawer
      title={editingParent ? "Edit Orang Tua" : "Tambah Orang Tua"}
      width={screens.xs ? "100%" : 560}
      open={open}
      onClose={onClose}
      destroyOnHidden
      extra={
        <Space>
          <Button onClick={onClose}>Batal</Button>
          <Button type="primary" loading={isSubmitting} onClick={onSubmit}>
            Simpan
          </Button>
        </Space>
      }
    >
      <Form form={form} layout="vertical" initialValues={{ is_active: true }}>
        <Form.Item
          label="Nama Lengkap"
          name="full_name"
          rules={[{ required: true, message: "Nama lengkap wajib diisi." }]}
        >
          <Input placeholder="Nama orang tua" />
        </Form.Item>

        <Form.Item
          label="Username"
          name="username"
          rules={[{ required: true, message: "Username wajib diisi." }]}
        >
          <Input placeholder="Username login orang tua" />
        </Form.Item>

        <Form.Item
          label={editingParent ? "Password Baru (Opsional)" : "Password"}
          name="password"
          rules={
            editingParent
              ? []
              : [{ required: true, message: "Password wajib diisi." }]
          }
        >
          <Input.Password placeholder="Masukkan password" />
        </Form.Item>

        <Form.Item label="Email" name="email">
          <Input placeholder="Email orang tua" />
        </Form.Item>

        <Form.Item label="No. HP" name="phone">
          <Input placeholder="Nomor telepon" />
        </Form.Item>

        <Form.Item
          label="Tambah Siswa Berdasarkan NIS"
          name="nis_list"
          rules={[
            {
              required: true,
              message: "Minimal 1 siswa wajib ditambahkan.",
            },
          ]}
          extra="Siswa yang sudah terhubung ke orang tua lain otomatis dinonaktifkan."
        >
          <Select
            mode="multiple"
            showSearch={{ optionFilterProp: "label" }}
            allowClear
            placeholder="Pilih NIS siswa"
            options={studentOptions}
            virtual={false}
          />
        </Form.Item>

        <Form.Item label="Status Akun" name="is_active" valuePropName="checked">
          <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
        </Form.Item>
      </Form>
    </Drawer>
  );
};

export default ParentFormDrawer;
