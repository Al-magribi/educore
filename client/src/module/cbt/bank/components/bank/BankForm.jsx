import { useEffect, useState } from "react";
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
  Flex,
} from "antd";
import { useSelector } from "react-redux";
import { User, FileText, BookOpen } from "lucide-react";
import { museColors } from "../../../../../config/theme";
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
  const isAdmin = user?.role === "admin" || user?.can_manage_cbt === true;

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

  const teacherSubjectIds = (() => {
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
  })();

  const visibleSubjects = subjects?.filter((subj) =>
    teacherSubjectIds.has(Number(subj?.id ?? subj?.subject_id)),
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (initialValues) {
      form.setFieldsValue(initialValues);
      setSelectedTeacherId(initialValues.teacher_id ?? null);
    } else {
      form.resetFields();
      setSelectedTeacherId(null);
    }
  }, [initialValues, form]);
  /* eslint-enable react-hooks/set-state-in-effect */

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
      style={{ marginTop: 16 }}
    >
      {!isEdit && (
        <Alert
          type='info'
          showIcon
          title={isAdmin ? "Mode admin" : `Pemilik: ${user?.full_name || "Anda"}`}
          description={
            isAdmin
              ? "Pilih guru pemilik dulu agar daftar mata pelajaran sesuai dengan yang diampu."
              : "Bank soal ini otomatis terdaftar atas nama Anda."
          }
          style={{ marginBottom: 16 }}
        />
      )}

      {isAdmin && (
        <Form.Item
          label='Guru Pemilik Soal'
          name='teacher_id'
          rules={[{ required: true, message: "Guru pemilik wajib dipilih" }]}
        >
          <Select
            placeholder='Cari nama guru'
            loading={loadingTeachers}
            showSearch
            optionFilterProp='children'
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

      <Form.Item
        label='Mata Pelajaran'
        name='subject_id'
        rules={[{ required: true, message: "Mata pelajaran wajib dipilih" }]}
        extra={
          isAdmin && !selectedTeacherId
            ? "Pilih guru terlebih dahulu untuk menampilkan mata pelajaran."
            : undefined
        }
      >
        <Select
          placeholder='Pilih mata pelajaran'
          loading={loadingSubjects}
          showSearch
          optionFilterProp='children'
          virtual={false}
          allowClear
          disabled={isAdmin && !selectedTeacherId}
          suffixIcon={<BookOpen size={14} />}
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
        label='Judul Bank Soal'
        name='title'
        rules={[{ required: true, message: "Judul bank soal wajib diisi" }]}
        extra='Buat judul yang spesifik agar mudah dicari dan dikelompokkan.'
      >
        <Input
          placeholder='Contoh: Ulangan Harian Biologi Bab 1'
          prefix={<FileText size={16} color={museColors.muted} />}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            label='Tipe Ujian'
            name='type'
            rules={[{ required: true, message: "Tipe ujian wajib dipilih" }]}
          >
            <Select placeholder='Pilih tipe ujian' virtual={false}>
              <Select.Option value='UH'>Ulangan Harian</Select.Option>
              <Select.Option value='TS'>Tengah Semester</Select.Option>
              <Select.Option value='AS'>Akhir Semester</Select.Option>
              <Select.Option value='UAS'>Ujian Akhir Sekolah</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Flex
        justify='flex-end'
        gap={8}
        style={{ flexDirection: screens.xs ? "column-reverse" : "row" }}
      >
        <Button onClick={onClose} disabled={isLoading} block={!!screens.xs}>
          Batal
        </Button>
        <Button
          type='primary'
          htmlType='submit'
          loading={isLoading}
          block={!!screens.xs}
        >
          {isEdit ? "Simpan Perubahan" : "Buat Bank Soal"}
        </Button>
      </Flex>
    </Form>
  );
};

export default BankForm;
