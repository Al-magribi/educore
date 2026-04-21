import React, { useEffect } from "react";
import { motion } from "framer-motion";
import {
  Modal,
  Form,
  Input,
  Select,
  message,
  Typography,
  Flex,
  Button,
} from "antd";
import {
  Plus,
  Pencil,
  LayoutGrid,
  GraduationCap,
  GitBranch,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  useAddClassMutation,
  useUpdateClassMutation,
} from "../../../../service/main/ApiClass";
import {
  useGetGradesQuery,
  useGetMajorsQuery,
} from "../../../../service/public/ApiPublic";

const { Title, Text } = Typography;
const MotionDiv = motion.div;

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
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      closable={false}
      centered
      width={640}
      styles={{
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: 28,
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
        },
        body: {
          padding: 0,
        },
      }}
      modalRender={(modalNode) => (
        <MotionDiv
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          {modalNode}
        </MotionDiv>
      )}
    >
      <Form form={form} layout='vertical'>
        <div
          style={{
            background:
              "linear-gradient(135deg, rgba(240,253,244,1), rgba(239,246,255,0.96))",
            padding: 28,
            borderBottom: "1px solid rgba(148, 163, 184, 0.18)",
          }}
        >
          <Flex align='flex-start' gap={16}>
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #0f766e, #0284c7)",
                color: "#fff",
                boxShadow: "0 16px 30px rgba(2, 132, 199, 0.28)",
                flexShrink: 0,
              }}
            >
              {isEdit ? <Pencil size={22} /> : <LayoutGrid size={22} />}
            </div>

            <div style={{ flex: 1 }}>
              <Flex justify='space-between' align='center' gap={10}>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {modalTitle}
                  </Title>
                  <Text
                    type='secondary'
                    style={{ display: "block", marginTop: 6 }}
                  >
                    {modalDescription}
                  </Text>
                </div>
                <div
                  style={{
                    borderRadius: 999,
                    padding: "6px 12px",
                    fontWeight: 600,
                    color: "#0369a1",
                    background: "rgba(3, 105, 161, 0.10)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {isEdit ? "Edit" : "Baru"}
                </div>
              </Flex>
            </div>
          </Flex>
        </div>

        <div style={{ padding: 28 }}>
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.05 }}
            style={{ display: "flex", flexDirection: "column", gap: 20 }}
          >
            <Form.Item name='id' hidden>
              <Input />
            </Form.Item>

            <div
              style={{
                borderRadius: 20,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                background: "#ffffff",
                padding: 18,
              }}
            >
              <Form.Item
                name='name'
                label='Nama Kelas'
                rules={[{ required: true, message: "Nama kelas wajib diisi" }]}
              >
                <Input
                  size='large'
                  prefix={<LayoutGrid size={16} color='#0284c7' />}
                  placeholder='Contoh: X MIPA 1'
                  style={{ borderRadius: 14, paddingBlock: 8 }}
                />
              </Form.Item>

              <Form.Item
                name='gradeId'
                label='Tingkat (Grade)'
                rules={[{ required: true, message: "Pilih tingkat kelas" }]}
              >
                <Select
                  size='large'
                  placeholder='Pilih Tingkat'
                  options={gradeOptions}
                  allowClear
                  virtual={false}
                  suffixIcon={<GraduationCap size={16} color='#0f766e' />}
                />
              </Form.Item>

              <Form.Item
                name='majorId'
                label='Jurusan (Opsional)'
                style={{ marginBottom: 0 }}
              >
                <Select
                  size='large'
                  placeholder='Pilih Jurusan'
                  options={majorOptions}
                  allowClear
                  virtual={false}
                  suffixIcon={<GitBranch size={16} color='#0f766e' />}
                />
              </Form.Item>
            </div>

            <div
              style={{
                borderRadius: 20,
                background: "linear-gradient(135deg, #ecfeff, #eff6ff)",
                border: "1px solid rgba(14, 165, 233, 0.16)",
                padding: 18,
              }}
            >
              <Flex align='flex-start' gap={12}>
                <CheckCircle
                  size={18}
                  color='#0284c7'
                  style={{ marginTop: 2 }}
                />
                <div>
                  <Text strong style={{ display: "block", marginBottom: 4 }}>
                    Tips pengisian
                  </Text>
                  <Text type='secondary'>
                    Pilih tingkat dan jurusan yang tepat agar pengelompokan
                    siswa dan pelaporan kelas tetap konsisten.
                  </Text>
                </div>
              </Flex>
            </div>

            <Flex justify='flex-end' gap={10} style={{ marginTop: 4 }}>
              <Button
                size='large'
                onClick={onCancel}
                style={{ borderRadius: 14, minWidth: 120 }}
              >
                Batal
              </Button>
              <Button
                type='primary'
                htmlType='button'
                size='large'
                onClick={handleSubmit}
                loading={isAdding || isUpdating}
                icon={
                  isAdding || isUpdating ? (
                    <Loader2 className='animate-spin' size={16} />
                  ) : isEdit ? (
                    <Pencil size={16} />
                  ) : (
                    <Plus size={16} />
                  )
                }
                style={{
                  borderRadius: 14,
                  minWidth: 190,
                  boxShadow: "0 12px 24px rgba(2, 132, 199, 0.22)",
                }}
              >
                {submitButtonLabel}
              </Button>
            </Flex>
          </MotionDiv>
        </div>
      </Form>
    </Modal>
  );
};

export default ClassModal;
