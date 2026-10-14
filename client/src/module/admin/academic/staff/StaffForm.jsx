import React, { useEffect } from "react";
import { Form, Input, Modal, Switch } from "antd";

const StaffForm = ({ open, onCancel, onSubmit, initialValues, loading }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      full_name: initialValues?.full_name || "",
      nip: initialValues?.nip || "",
      phone: initialValues?.phone || "",
      email: initialValues?.email || "",
      notes: initialValues?.notes || "",
      is_active: initialValues?.is_active !== false,
    });
  }, [form, initialValues, open]);

  return (
    <Modal
      title={initialValues ? "Edit Tendik" : "Tambah Tendik"}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={initialValues ? "Simpan" : "Tambah"}
      cancelText="Batal"
      confirmLoading={loading}
      destroyOnClose
      centered
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={onSubmit}
        style={{ marginTop: 12 }}
      >
        <Form.Item
          name="full_name"
          label="Nama Lengkap"
          rules={[{ required: true, message: "Nama wajib diisi" }]}
        >
          <Input placeholder="Nama tendik" maxLength={150} />
        </Form.Item>
        <Form.Item name="nip" label="NIP">
          <Input placeholder="Opsional" maxLength={50} />
        </Form.Item>
        <Form.Item name="phone" label="Telepon">
          <Input placeholder="Opsional" maxLength={30} />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input placeholder="Opsional" maxLength={120} />
        </Form.Item>
        <Form.Item name="notes" label="Catatan">
          <Input.TextArea rows={3} placeholder="Opsional" />
        </Form.Item>
        <Form.Item name="is_active" label="Status" valuePropName="checked">
          <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default StaffForm;
