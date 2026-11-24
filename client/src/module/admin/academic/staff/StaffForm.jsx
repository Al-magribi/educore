import React, { useEffect } from "react";
import { Col, Form, Input, Row, Switch } from "antd";
import { Pencil, UserPlus } from "lucide-react";
import { FormModal } from "../../../../components/ui/muse/DataSection";

const StaffForm = ({ open, onCancel, onSubmit, initialValues, loading }) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      full_name: initialValues?.full_name || "",
      nip: initialValues?.nip || "",
      rfid_no: initialValues?.rfid_no || "",
      phone: initialValues?.phone || "",
      email: initialValues?.email || "",
      notes: initialValues?.notes || "",
      is_active: initialValues?.is_active !== false,
    });
  }, [form, initialValues, open]);

  return (
    <FormModal
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      confirmLoading={loading}
      width={640}
      icon={initialValues ? <Pencil size={16} /> : <UserPlus size={16} />}
      title={initialValues ? "Edit Tendik" : "Tambah Tendik"}
      description="Data induk tenaga kependidikan satuan ini."
      okText={initialValues ? "Simpan Perubahan" : "Tambah Tendik"}
    >
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        <Form.Item
          name="full_name"
          label="Nama Lengkap"
          rules={[{ required: true, message: "Nama wajib diisi" }]}
        >
          <Input placeholder="Nama tendik" maxLength={150} />
        </Form.Item>
        <Row gutter={16}>
          <Col xs={24} md={12}>
            <Form.Item name="nip" label="NIP">
              <Input placeholder="Opsional" maxLength={50} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="rfid_no" label="No RFID (opsional)">
              <Input placeholder="Nomor RFID kartu tendik" maxLength={100} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="phone" label="Telepon">
              <Input placeholder="Opsional" maxLength={30} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="email" label="Email">
              <Input placeholder="Opsional" maxLength={120} />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="notes" label="Catatan">
          <Input.TextArea rows={3} placeholder="Opsional" />
        </Form.Item>
        <Form.Item name="is_active" label="Status" valuePropName="checked">
          <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
        </Form.Item>
      </Form>
    </FormModal>
  );
};

export default StaffForm;
