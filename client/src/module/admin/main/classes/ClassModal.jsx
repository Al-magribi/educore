import React, { useEffect } from "react";
import { Modal, Form, Input, Select, message } from "antd";
import { useAddClassMutation } from "../../../../service/main/ApiClass";
import {
  useGetGradesQuery,
  useGetMajorsQuery,
} from "../../../../service/public/ApiPublic";

const ClassModal = ({ open, mode, initialData, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [addClass, { isLoading }] = useAddClassMutation();

  const { data: grades } = useGetGradesQuery();
  const { data: majors } = useGetMajorsQuery();

  // Reset form saat modal dibuka/ditutup
  useEffect(() => {
    if (open && mode === "edit" && initialData) {
      form.setFieldsValue({
        id: initialData.id,
        name: initialData.name,
        gradeId: initialData.grade_id,
        majorId: initialData.major_id,
      });
    } else {
      form.resetFields();
    }
  }, [open, mode, initialData, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      await addClass(values).unwrap();
      message.success(
        mode === "add" ? "Kelas berhasil dibuat" : "Kelas berhasil diperbarui",
      );
      onSuccess();
    } catch (error) {
      if (error?.data?.message) {
        message.error(error.data.message);
      }
    }
  };

  const gradeOptions = grades?.map((grade) => ({
    value: grade.id,
    label: grade.name,
  }));

  const majorOptions = majors?.map((major) => ({
    value: major.id,
    label: major.name,
  }));

  return (
    <Modal
      open={open}
      title={mode === "add" ? "Tambah Kelas Baru" : "Edit Kelas"}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={isLoading}
      okText='Simpan'
      cancelText='Batal'
    >
      <Form form={form} layout='vertical'>
        {/* Field ID tersembunyi untuk mode edit */}
        <Form.Item name='id' hidden>
          <Input />
        </Form.Item>

        <Form.Item
          name='name'
          label='Nama Kelas'
          rules={[{ required: true, message: "Nama kelas wajib diisi" }]}
        >
          <Input placeholder='Contoh: X MIPA 1' />
        </Form.Item>

        <Form.Item
          name='gradeId'
          label='Tingkat (Grade)'
          rules={[{ required: true, message: "Pilih tingkat kelas" }]}
        >
          <Select
            placeholder='Pilih Tingkat'
            options={gradeOptions}
            allowClear
            virtual={false}
          />
        </Form.Item>

        <Form.Item name='majorId' label='Jurusan (Opsional)'>
          <Select
            placeholder='Pilih Jurusan'
            options={majorOptions}
            allowClear
            virtual={false}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ClassModal;
