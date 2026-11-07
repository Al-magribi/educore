import React, { useEffect } from "react";
import { Divider, Form, Input, Modal, Switch, Typography } from "antd";
import { hasFinanceStaffDesk } from "../../../finance/assignment/FinanceStaffSlot";

const { Text } = Typography;

const StaffForm = ({ open, onCancel, onSubmit, initialValues, loading }) => {
  const [form] = Form.useForm();
  const hasAccount = Boolean(initialValues?.user_id);

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
      account_username: initialValues?.account_username || "",
      account_password: "",
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
        <Form.Item name="rfid_no" label="No RFID (Opsional)">
          <Input placeholder="Nomor RFID kartu tendik" maxLength={100} />
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

        {hasFinanceStaffDesk ? (
          <>
            <Divider style={{ margin: "8px 0 12px" }}>Akun Login</Divider>
            <Text type="secondary" style={{ display: "block", marginBottom: 12 }}>
              Opsional. Akun hanya bisa dipakai login setelah tendik dicentang
              Keuangan di Penugasan Wewenang.
            </Text>
            <Form.Item
              name="account_username"
              label="Username"
              rules={[
                {
                  pattern: /^\S*$/,
                  message: "Username tidak boleh mengandung spasi",
                },
              ]}
            >
              <Input
                placeholder={hasAccount ? "Username akun" : "Kosongkan jika tanpa akun"}
                maxLength={100}
                autoComplete="off"
              />
            </Form.Item>
            <Form.Item
              name="account_password"
              label="Password"
              dependencies={["account_username"]}
              rules={[
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const username = String(getFieldValue("account_username") || "").trim();
                    const password = String(value || "").trim();
                    if (username && !hasAccount && !password) {
                      return Promise.reject(new Error("Password akun baru wajib diisi"));
                    }
                    if (password && password.length < 6) {
                      return Promise.reject(new Error("Password minimal 6 karakter"));
                    }
                    return Promise.resolve();
                  },
                }),
              ]}
            >
              <Input.Password
                placeholder={hasAccount ? "Kosongkan jika tidak diubah" : "Minimal 6 karakter"}
                autoComplete="new-password"
              />
            </Form.Item>
          </>
        ) : null}
      </Form>
    </Modal>
  );
};

export default StaffForm;
