import React from "react";
import { Form, Input, Button, App } from "antd";
import { UserPlus } from "lucide-react";
import { useAddStudentMutation } from "../../../../../service/main/ApiClass";

// === FORM TAMBAH MANUAL ===
export const AddStudentForm = ({ classId, onSuccess }) => {
  const [form] = Form.useForm();
  const [addStudent, { isLoading }] = useAddStudentMutation();
  const { message } = App.useApp();

  const onFinish = async (values) => {
    try {
      await addStudent({ ...values, classid: classId }).unwrap();
      message.success("Siswa berhasil ditambahkan");
      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menambah siswa");
    }
  };

  return (
    <Form form={form} layout="vertical" onFinish={onFinish}>
      <Form.Item
        name="nis"
        label="NIS (Nomor Induk Siswa)"
        rules={[{ required: true, message: "NIS wajib diisi" }]}
        help="Pastikan siswa sudah terdaftar di database utama."
      >
        <Input placeholder="Masukkan NIS" />
      </Form.Item>
      <Button
        type="primary"
        htmlType="submit"
        loading={isLoading}
        block
        icon={<UserPlus size={16} />}
      >
        Tambahkan Siswa
      </Button>
    </Form>
  );
};
