import { useEffect } from "react";
import { Form, Input, Select, Button, message, Alert } from "antd";
import { useSelector } from "react-redux"; // Import Redux
import { User } from "lucide-react";
import {
  useCreateBankMutation,
  useUpdateBankMutation,
  useGetSubjectsQuery,
  useGetTeachersQuery, // Pastikan ini sudah ada di ApiBank
} from "../../../../../service/cbt/ApiBank";

const BankForm = ({ initialValues, onClose, onSuccess }) => {
  const [form] = Form.useForm();

  // 1. Ambil Data User dari Redux
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";
  const isTeacher = user?.role === "teacher";

  // RTK Query hooks
  const { data: subjects, isLoading: loadingSubjects } = useGetSubjectsQuery();

  // 2. Fetch Guru HANYA jika Admin
  const { data: teachers, isLoading: loadingTeachers } = useGetTeachersQuery(
    undefined,
    {
      skip: !isAdmin,
    },
  );

  const [createBank, { isLoading: isCreating }] = useCreateBankMutation();
  const [updateBank, { isLoading: isUpdating }] = useUpdateBankMutation();

  const isEdit = !!initialValues;
  const isLoading = isCreating || isUpdating;

  const teacherSubjectIds = Array.isArray(user?.subjects)
    ? new Set(
        user.subjects
          .map((s) => s.subject_id ?? s.id)
          .filter((id) => id != null),
      )
    : new Set();

  const visibleSubjects = isAdmin
    ? subjects
    : subjects?.filter((subj) =>
        teacherSubjectIds.has(subj?.id ?? subj?.subject_id),
      );

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
    } else {
      form.resetFields();
    }
  }, [initialValues, form]);

  const onFinish = async (values) => {
    try {
      if (isEdit) {
        await updateBank({ id: initialValues.id, ...values }).unwrap();
        message.success("Bank soal berhasil diperbarui");
      } else {
        await createBank(values).unwrap();
        message.success("Bank soal berhasil dibuat");
      }
      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(error?.data?.message || "Terjadi kesalahan sistem");
    }
  };

  return (
    <Form
      form={form}
      layout='vertical'
      onFinish={onFinish}
      initialValues={{ type: "UH" }}
    >
      {/* Informasi Mode User */}
      {!isEdit && (
        <Alert
          title={isAdmin ? "Mode Admin" : `Guru: ${user?.full_name}`}
          description={
            isAdmin
              ? "Anda membuat soal untuk guru lain. Silakan pilih guru pemilik soal."
              : "Bank soal ini akan otomatis terdaftar atas nama Anda."
          }
          type='info'
          showIcon
          style={{ marginBottom: 24 }}
        />
      )}

      <Form.Item
        label='Judul Bank Soal'
        name='title'
        rules={[{ required: true, message: "Judul wajib diisi" }]}
      >
        <Input placeholder='Contoh: Ulangan Harian Biologi Bab 1' />
      </Form.Item>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Form.Item
          label='Mata Pelajaran'
          name='subject_id'
          rules={[{ required: true, message: "Pilih mata pelajaran" }]}
        >
          <Select
            placeholder='Pilih Mapel'
            loading={loadingSubjects}
            showSearch
            virtual={false}
            allowClear
          >
            {visibleSubjects?.map((subj) => {
              const subjectId = subj?.id ?? subj?.subject_id;
              return (
                <Select.Option key={subjectId} value={subjectId}>
                  {subj.name}
                </Select.Option>
              );
            })}
          </Select>
        </Form.Item>

        <Form.Item
          label='Tipe Ujian'
          name='type'
          rules={[{ required: true, message: "Pilih tipe ujian" }]}
        >
          <Select placeholder='Pilih tipe ujian'>
            <Select.Option value='UH'>Ulangan Harian</Select.Option>
            <Select.Option value='TS'>Tegah Semester</Select.Option>
            <Select.Option value='AS'>Akhir Semester</Select.Option>
            <Select.Option value='UAS'>Ujian Akhir Sekolah</Select.Option>
          </Select>
        </Form.Item>
      </div>

      {/* 3. Field Pilih Guru (Khusus Admin) */}
      {isAdmin && (
        <Form.Item
          label='Guru Pemilik Soal'
          name='teacher_id'
          rules={[{ required: true, message: "Admin wajib memilih guru" }]}
          style={{ background: "#f5f5f5", padding: 12, borderRadius: 8 }}
        >
          <Select
            placeholder='Cari nama guru...'
            loading={loadingTeachers}
            showSearch
            suffixIcon={<User size={14} />}
            virtual={false}
            allowClear
          >
            {teachers?.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                {t.full_name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <Button onClick={onClose} disabled={isLoading}>
          Batal
        </Button>
        <Button type='primary' htmlType='submit' loading={isLoading}>
          {isEdit ? "Simpan Perubahan" : "Buat Bank Soal"}
        </Button>
      </div>
    </Form>
  );
};

export default BankForm;
