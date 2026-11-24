import React, { useEffect } from "react";
import { Alert, Modal, Form, Input, Select, message } from "antd";
import { Building2, Pencil, Plus } from "lucide-react";
import {
  useAddHomebaseMutation,
  useUpdateHomebaseMutation,
} from "../../../service/center/ApiHomebase";
import { CardTitle } from "../../../components/ui/muse";
import { museColors } from "../../../config/theme";

const { TextArea } = Input;

const ModalHome = ({ open, onCancel, onSuccess, initialData }) => {
  const [form] = Form.useForm();

  const [addHomebase, { isLoading: isAdding }] = useAddHomebaseMutation();
  const [updateHomebase, { isLoading: isUpdating }] =
    useUpdateHomebaseMutation();

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
        await updateHomebase({ id: initialData.id, ...values }).unwrap();
        message.success("Berhasil diperbarui");
      } else {
        await addHomebase(values).unwrap();
        message.success("Berhasil ditambahkan");
      }

      form.resetFields();
      onSuccess();
    } catch (error) {
      message.error(error?.data?.message || "Terjadi kesalahan saat menyimpan");
    }
  };

  return (
    <Modal
      title={
        <CardTitle
          icon={initialData ? <Pencil size={16} /> : <Plus size={16} />}
          title={initialData ? "Edit Satuan Pendidikan" : "Tambah Satuan Pendidikan"}
          description="Gunakan nama resmi agar pencarian data konsisten."
        />
      }
      open={open}
      onCancel={onCancel}
      onOk={form.submit}
      confirmLoading={isAdding || isUpdating}
      destroyOnHidden
      width={640}
      okText={initialData ? "Simpan Perubahan" : "Simpan Satuan"}
      cancelText='Batal'
      centered
    >
      <Form
        form={form}
        layout='vertical'
        onFinish={handleFinish}
        preserve={false}
        style={{ marginTop: 16 }}
      >
        <Form.Item
          name='name'
          label='Nama Satuan Pendidikan'
          rules={[{ required: true, message: "Nama wajib diisi" }]}
        >
          <Input
            prefix={<Building2 size={16} color={museColors.muted} />}
            placeholder='Contoh: SMA Islam Terpadu'
          />
        </Form.Item>

        <Form.Item
          name='level'
          label='Jenjang / Level Satuan'
          rules={[{ required: true, message: "Silakan pilih jenjang satuan" }]}
        >
          <Select
            placeholder='Pilih Jenjang'
            options={[
              { value: "SD / MI", label: "SD / MI" },
              { value: "SMP / MTS", label: "SMP / MTS" },
              { value: "SMA / SMK / MA", label: "SMA / SMK / MA" },
            ]}
          />
        </Form.Item>

        <Form.Item name='description' label='Deskripsi / Alamat Singkat'>
          <TextArea
            rows={4}
            placeholder='Tambahkan keterangan singkat, alamat, atau catatan pendukung...'
          />
        </Form.Item>

        <Alert
          type='info'
          showIcon
          title='Tips pengisian'
          description='Gunakan nama resmi satuan pendidikan dan deskripsi singkat yang mudah dikenali.'
        />
      </Form>
    </Modal>
  );
};

export default ModalHome;
