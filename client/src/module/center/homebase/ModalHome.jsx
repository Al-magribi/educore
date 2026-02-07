import React, { useEffect } from "react";
import { Modal, Form, Input, message, Select } from "antd";
import {
  useAddHomebaseMutation,
  useUpdateHomebaseMutation,
} from "../../../service/center/ApiHomebase";

const { TextArea } = Input;
const { Option } = Select;

const ModalHome = ({ open, onCancel, onSuccess, initialData }) => {
  const [form] = Form.useForm();

  // API Hooks
  const [addHomebase, { isLoading: isAdding }] = useAddHomebaseMutation();
  const [updateHomebase, { isLoading: isUpdating }] =
    useUpdateHomebaseMutation();

  // Reset atau isi form saat modal dibuka/data berubah
  useEffect(() => {
    if (open) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
      }
    }
  }, [open, initialData, form]);

  const handleFinish = async (values) => {
    try {
      if (initialData) {
        // Mode Edit
        await updateHomebase({ id: initialData.id, ...values }).unwrap();
        message.success("Berhasil diperbarui");
      } else {
        // Mode Tambah
        await addHomebase(values).unwrap();
        message.success("Berhasil ditambahkan");
      }

      // Reset form dan panggil callback sukses ke parent
      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(error?.data?.message || "Terjadi kesalahan saat menyimpan");
    }
  };

  return (
    <Modal
      title={initialData ? "Edit Homebase" : "Tambah Homebase"}
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={isAdding || isUpdating}
      destroyOnHidden={true}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        preserve={false}
      >
        <Form.Item
          name="name"
          label="Nama Satuan Pendidikan"
          rules={[{ required: true, message: "Nama wajib diisi" }]}
        >
          <Input placeholder="Contoh: SMA Islam Terpadu" />
        </Form.Item>

        {/* 3. Tambahkan Input Select untuk Jenjang */}
        <Form.Item
          name="level"
          label="Jenjang / Level Satuan"
          rules={[{ required: true, message: "Silakan pilih jenjang satuan" }]}
        >
          <Select placeholder="Pilih Jenjang">
            <Option value="SD / MI">SD / MI</Option>
            <Option value="SMP / MTS">SMP / MTS</Option>
            <Option value="SMA / SMK / MA">SMA / SMK / MA</Option>
          </Select>
        </Form.Item>

        <Form.Item name="description" label="Deskripsi / Alamat Singkat">
          <TextArea rows={3} placeholder="Keterangan tambahan..." />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ModalHome;
