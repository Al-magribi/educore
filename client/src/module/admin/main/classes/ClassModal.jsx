import React, { useEffect } from "react";
import { Form, Input, Select, message } from "antd";
import { GitBranch, GraduationCap, LayoutGrid, Pencil } from "lucide-react";
import {
  useAddClassMutation,
  useUpdateClassMutation,
} from "../../../../service/main/ApiClass";
import {
  useGetGradesQuery,
  useGetMajorsQuery,
} from "../../../../service/public/ApiPublic";
import { FormModal } from "../../../../components/ui/muse/DataSection";
import { museColors } from "../../../../config/theme";

const ClassModal = ({ open, mode, initialData, onCancel, onSuccess }) => {
  const [form] = Form.useForm();
  const [addClass, { isLoading: isAdding }] = useAddClassMutation();
  const [updateClass, { isLoading: isUpdating }] = useUpdateClassMutation();

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
      if (mode === "edit") {
        await updateClass(values).unwrap();
      } else {
        await addClass(values).unwrap();
      }
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

  const isEdit = mode === "edit";
  const modalTitle = isEdit ? "Edit Kelas" : "Tambah Kelas Baru";
  const modalDescription = isEdit
    ? "Perbarui detail kelas agar tetap sinkron dengan tingkat dan jurusan yang digunakan."
    : "Tambahkan kelas baru untuk menjaga struktur rombel belajar tetap rapi dan mudah dikelola.";
  const submitButtonLabel = isEdit ? "Simpan Perubahan" : "Buat Kelas";

  return (
    <FormModal
      open={open}
      onCancel={onCancel}
      onOk={handleSubmit}
      confirmLoading={isAdding || isUpdating}
      icon={isEdit ? <Pencil size={16} /> : <LayoutGrid size={16} />}
      title={modalTitle}
      description={modalDescription}
      okText={submitButtonLabel}
    >
      <Form form={form} layout='vertical'>
        <Form.Item name='id' hidden>
          <Input />
        </Form.Item>

        <Form.Item
          name='name'
          label='Nama Kelas'
          rules={[{ required: true, message: "Nama kelas wajib diisi" }]}
        >
          <Input
            prefix={<LayoutGrid size={16} color={museColors.muted} />}
            placeholder='Contoh: X MIPA 1'
          />
        </Form.Item>

        <Form.Item
          name='gradeId'
          label='Tingkat'
          rules={[{ required: true, message: "Pilih tingkat kelas" }]}
        >
          <Select
            placeholder='Pilih tingkat'
            options={gradeOptions}
            allowClear
            virtual={false}
            prefix={<GraduationCap size={16} color={museColors.muted} />}
          />
        </Form.Item>

        <Form.Item
          name='majorId'
          label='Jurusan (opsional)'
          extra='Pilih tingkat dan jurusan yang tepat agar pengelompokan siswa dan laporan kelas konsisten.'
        >
          <Select
            placeholder='Pilih jurusan'
            options={majorOptions}
            allowClear
            virtual={false}
            prefix={<GitBranch size={16} color={museColors.muted} />}
          />
        </Form.Item>
      </Form>
    </FormModal>
  );
};

export default ClassModal;
