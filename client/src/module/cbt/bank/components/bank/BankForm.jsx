import { useEffect, useMemo, useState } from "react";
import {
  Form,
  Input,
  Select,
  Button,
  message,
  Alert,
  Grid,
  Row,
  Col,
} from "antd";
import { useSelector } from "react-redux"; // Import Redux
import { User } from "lucide-react";
import {
  useCreateBankMutation,
  useUpdateBankMutation,
  useGetSubjectsQuery,
  useGetTeachersQuery, // Pastikan ini sudah ada di ApiBank
} from "../../../../../service/cbt/ApiBank";

const { useBreakpoint } = Grid;

const normalizeSubjectIds = (teacher) => {
  if (!teacher) return [];

  let ids = teacher.subject_ids;

  if (typeof ids === "string") {
    try {
      ids = JSON.parse(ids);
    } catch {
      ids = [];
    }
  }

  if (!Array.isArray(ids) || ids.length === 0) {
    ids = Array.isArray(teacher.subjects)
      ? teacher.subjects.map((s) => s?.id ?? s?.subject_id)
      : [];
  }

  return ids
    .map((id) => Number(id))
    .filter((id) => Number.isInteger(id) && id > 0);
};

const BankForm = ({ initialValues, onClose, onSuccess }) => {
  const screens = useBreakpoint();

  const [form] = Form.useForm();
  const [selectedTeacherId, setSelectedTeacherId] = useState(null);

  // 1. Ambil Data User dari Redux
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

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

  const teacherSubjectIds = useMemo(() => {
    if (isAdmin) {
      const activeTeacher = teachers?.find(
        (t) => String(t.id) === String(selectedTeacherId),
      );
      return new Set(normalizeSubjectIds(activeTeacher));
    }

    return Array.isArray(user?.subjects)
      ? new Set(
          user.subjects
            .map((s) => s.subject_id ?? s.id)
            .filter((id) => id != null),
        )
      : new Set();
  }, [isAdmin, teachers, selectedTeacherId, user?.subjects]);

  const visibleSubjects = subjects?.filter((subj) =>
    teacherSubjectIds.has(Number(subj?.id ?? subj?.subject_id)),
  );

  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
      setSelectedTeacherId(initialValues.teacher_id ?? null);
    } else {
      form.resetFields();
      setSelectedTeacherId(null);
    }
  }, [initialValues, form]);

  const handleTeacherChange = (value) => {
    setSelectedTeacherId(value ?? null);
    form.setFieldsValue({ subject_id: undefined });
  };

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
          style={{ marginBottom: screens.xs ? 16 : 24 }}
        />
      )}

      {/* 1. Pilih Guru (Jika Admin) */}
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
            onChange={handleTeacherChange}
          >
            {teachers?.map((t) => (
              <Select.Option key={t.id} value={t.id}>
                {t.full_name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}

      <Row gutter={screens.xs ? 0 : 12}>
        {/* 2. Mata Pelajaran */}
        <Col xs={24}>
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
              disabled={isAdmin && !selectedTeacherId}
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
        </Col>
      </Row>

      {/* 3. Judul Bank Soal */}
      <Form.Item
        label='Judul Bank Soal'
        name='title'
        rules={[{ required: true, message: "Judul wajib diisi" }]}
      >
        <Input placeholder='Contoh: Ulangan Harian Biologi Bab 1' />
      </Form.Item>

      {/* 4. Tipe Ujian */}
      <Row gutter={screens.xs ? 0 : 12}>
        <Col xs={24} sm={12}>
          <Form.Item
            label='Tipe Ujian'
            name='type'
            rules={[{ required: true, message: "Pilih tipe ujian" }]}
          >
            <Select placeholder='Pilih tipe ujian'>
              <Select.Option value='UH'>Ulangan Harian</Select.Option>
              <Select.Option value='TS'>Tengah Semester</Select.Option>
              <Select.Option value='AS'>Akhir Semester</Select.Option>
              <Select.Option value='UAS'>Ujian Akhir Sekolah</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      {isAdmin && !selectedTeacherId && (
        <Form.Item
          style={{
            marginTop: -8,
            marginBottom: 8,
          }}
        >
          <Alert
            type='warning'
            showIcon
            message='Pilih guru terlebih dahulu untuk menampilkan mata pelajaran yang diampu.'
          />
        </Form.Item>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: screens.xs ? "column-reverse" : "row",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <Button
          onClick={onClose}
          disabled={isLoading}
          block={!!screens.xs}
          style={{ minWidth: screens.xs ? "100%" : 92 }}
        >
          Batal
        </Button>
        <Button
          type='primary'
          htmlType='submit'
          loading={isLoading}
          block={!!screens.xs}
          style={{ minWidth: screens.xs ? "100%" : 132 }}
        >
          {isEdit ? "Simpan Perubahan" : "Buat Bank Soal"}
        </Button>
      </div>
    </Form>
  );
};

export default BankForm;
