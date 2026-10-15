import React, { useEffect, useState } from "react";
import { Form, Grid, Input, Modal, Select, Typography, Upload, message } from "antd";
import { FileUp } from "lucide-react";
import {
  useUpdateUploadedTeachingModuleMutation,
  useUploadTeachingModuleMutation,
} from "../../../service/lms/ApiTeachingModule";
import { formatFileSize } from "./moduleSchema";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const ACCEPTED_EXTENSIONS = [".pdf", ".doc", ".docx"];
const MAX_FILE_SIZE = 20 * 1024 * 1024;

const TeachingModuleUploadModal = ({
  open,
  module,
  subjectId,
  gradeOptions,
  defaultGradeId,
  onClose,
}) => {
  const screens = useBreakpoint();
  const [form] = Form.useForm();
  const [file, setFile] = useState(null);
  const isEdit = Boolean(module?.id);

  const [uploadModule, { isLoading: isUploading }] =
    useUploadTeachingModuleMutation();
  const [updateModule, { isLoading: isUpdating }] =
    useUpdateUploadedTeachingModuleMutation();

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      title: module?.title || "",
      grade_id: module?.grade_id || defaultGradeId || null,
    });
  }, [open, module, defaultGradeId, form]);

  const handleBeforeUpload = (selected) => {
    const extension = `.${String(selected.name).split(".").pop()}`.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      message.error("Format file harus PDF, DOC, atau DOCX.");
      return Upload.LIST_IGNORE;
    }
    if (selected.size > MAX_FILE_SIZE) {
      message.error("Ukuran file maksimal 20 MB.");
      return Upload.LIST_IGNORE;
    }
    setFile(selected);
    if (!form.getFieldValue("title")) {
      form.setFieldValue("title", selected.name.replace(/\.[^.]+$/, ""));
    }
    return false;
  };

  const handleSubmit = async () => {
    let values;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    if (!isEdit && !file) {
      message.error("Pilih file modul terlebih dahulu.");
      return;
    }

    const formData = new FormData();
    formData.append("title", values.title.trim());
    formData.append("grade_id", values.grade_id);
    if (file) formData.append("file", file);

    try {
      if (isEdit) {
        await updateModule({ id: module.id, formData }).unwrap();
        message.success("Modul ajar diperbarui.");
      } else {
        formData.append("subject_id", subjectId);
        await uploadModule(formData).unwrap();
        message.success("Modul ajar berhasil diupload.");
      }
      onClose();
    } catch (error) {
      message.error(error?.data?.message || "Gagal mengupload modul ajar.");
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      afterClose={() => setFile(null)}
      onOk={handleSubmit}
      okText={isEdit ? "Simpan" : "Upload"}
      confirmLoading={isUploading || isUpdating}
      title={isEdit ? "Edit Modul Ajar (File)" : "Upload Modul Ajar"}
      width={screens.md ? 560 : "calc(100vw - 24px)"}
      destroyOnHidden
      centered
    >
      <Form form={form} layout='vertical'>
        <Form.Item
          name='title'
          label='Judul Modul'
          rules={[
            { required: true, whitespace: true, message: "Judul wajib diisi." },
          ]}
        >
          <Input placeholder='Contoh: BAB IV Bersyukur dengan Akikah' />
        </Form.Item>
        <Form.Item
          name='grade_id'
          label='Tingkat'
          rules={[{ required: true, message: "Tingkat wajib dipilih." }]}
        >
          <Select options={gradeOptions} placeholder='Pilih tingkat' />
        </Form.Item>
        <Form.Item
          label={isEdit ? "Ganti File (opsional)" : "File Modul"}
          required={!isEdit}
        >
          <Upload.Dragger
            accept={ACCEPTED_EXTENSIONS.join(",")}
            maxCount={1}
            beforeUpload={handleBeforeUpload}
            onRemove={() => setFile(null)}
            fileList={file ? [{ uid: "selected", name: file.name }] : []}
          >
            <p className='ant-upload-drag-icon'>
              <FileUp size={32} color='#2563eb' />
            </p>
            <p className='ant-upload-text'>
              Klik atau seret file ke area ini
            </p>
            <p className='ant-upload-hint'>PDF, DOC, atau DOCX. Maksimal 20 MB.</p>
          </Upload.Dragger>
          {isEdit && !file ? (
            <Text type='secondary' style={{ display: "block", marginTop: 8 }}>
              File saat ini: {module.file_name} ({formatFileSize(module.file_size)})
            </Text>
          ) : null}
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default TeachingModuleUploadModal;
