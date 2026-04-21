import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
  Typography,
  Flex,
  Card,
  Tag,
} from "antd";
import { useSelector } from "react-redux"; // Import Redux
import {
  User,
  FileText,
  BookOpen,
  ClipboardList,
  CheckCircle,
  Loader2,
} from "lucide-react";
import {
  useCreateBankMutation,
  useUpdateBankMutation,
  useGetSubjectsQuery,
  useGetTeachersQuery, // Pastikan ini sudah ada di ApiBank
} from "../../../../../service/cbt/ApiBank";

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

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
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(239,246,255,1), rgba(236,253,245,0.96))",
          padding: screens.xs ? 20 : 28,
          borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
        }}
      >
        <Flex align='flex-start' gap={16}>
          <div
            style={{
              width: screens.xs ? 48 : 56,
              height: screens.xs ? 48 : 56,
              borderRadius: 18,
              display: "grid",
              placeItems: "center",
              background: "linear-gradient(135deg, #2563eb, #14b8a6)",
              color: "#fff",
              boxShadow: "0 16px 30px rgba(37, 99, 235, 0.28)",
              flexShrink: 0,
            }}
          >
            {isEdit ? <FileText size={22} /> : <ClipboardList size={22} />}
          </div>
          <div style={{ flex: 1 }}>
            <Flex
              justify='space-between'
              align={screens.xs ? "flex-start" : "center"}
              vertical={!!screens.xs}
              gap={10}
            >
              <div>
                <Title level={4} style={{ margin: 0 }}>
                  {isEdit ? "Edit Bank Soal" : "Buat Bank Soal Baru"}
                </Title>
                <Text type='secondary' style={{ display: "block", marginTop: 6 }}>
                  Simpan bank soal dengan pemilik, mata pelajaran, judul, dan tipe ujian yang jelas untuk operasional CBT.
                </Text>
              </div>
              <Tag
                bordered={false}
                style={{
                  marginInlineEnd: 0,
                  borderRadius: 999,
                  padding: "6px 12px",
                  background: "rgba(37, 99, 235, 0.10)",
                  color: "#1d4ed8",
                  fontWeight: 600,
                }}
              >
                {isEdit ? "Mode Edit" : "Bank Baru"}
              </Tag>
            </Flex>
          </div>
        </Flex>
      </div>

      <div style={{ padding: screens.xs ? 20 : 28 }}>
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.05 }}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          {!isEdit && (
            <Alert
              title={isAdmin ? "Mode Admin" : `Guru: ${user?.full_name}`}
              description={
                isAdmin
                  ? "Anda sedang membuat bank soal untuk guru tertentu. Pilih guru pemilik agar filter mata pelajaran tampil sesuai."
                  : "Bank soal ini akan otomatis terdaftar atas nama Anda."
              }
              type='info'
              showIcon
              style={{ borderRadius: 16 }}
            />
          )}

          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              border: "1px solid rgba(148, 163, 184, 0.18)",
              background: "#fff",
            }}
            styles={{ body: { padding: screens.xs ? 16 : 18 } }}
          >
            {isAdmin && (
              <Form.Item
                label='Guru Pemilik Soal'
                name='teacher_id'
                rules={[{ required: true, message: "Admin wajib memilih guru" }]}
              >
                <Select
                  placeholder='Cari nama guru...'
                  loading={loadingTeachers}
                  showSearch
                  suffixIcon={<User size={14} />}
                  virtual={false}
                  allowClear
                  onChange={handleTeacherChange}
                  size='large'
                >
                  {teachers?.map((t) => (
                    <Select.Option key={t.id} value={t.id}>
                      {t.full_name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}

            <Row gutter={screens.xs ? 0 : 16}>
              <Col xs={24}>
                <Form.Item
                  label='Mata Pelajaran'
                  name='subject_id'
                  rules={[{ required: true, message: "Pilih mata pelajaran" }]}
                >
                  <Select
                    placeholder='Pilih mata pelajaran'
                    loading={loadingSubjects}
                    showSearch
                    virtual={false}
                    allowClear
                    disabled={isAdmin && !selectedTeacherId}
                    size='large'
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
              </Col>
            </Row>

            <Form.Item
              label='Judul Bank Soal'
              name='title'
              rules={[{ required: true, message: "Judul wajib diisi" }]}
            >
              <Input
                placeholder='Contoh: Ulangan Harian Biologi Bab 1'
                size='large'
                prefix={<FileText size={16} color='#94a3b8' />}
                style={{ borderRadius: 14, paddingBlock: 8 }}
              />
            </Form.Item>

            <Row gutter={screens.xs ? 0 : 16}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label='Tipe Ujian'
                  name='type'
                  rules={[{ required: true, message: "Pilih tipe ujian" }]}
                  style={{ marginBottom: 0 }}
                >
                  <Select placeholder='Pilih tipe ujian' size='large' virtual={false}>
                    <Select.Option value='UH'>Ulangan Harian</Select.Option>
                    <Select.Option value='TS'>Tengah Semester</Select.Option>
                    <Select.Option value='AS'>Akhir Semester</Select.Option>
                    <Select.Option value='UAS'>Ujian Akhir Sekolah</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {isAdmin && !selectedTeacherId && (
            <Alert
              type='warning'
              showIcon
              style={{ borderRadius: 16 }}
              message='Pilih guru terlebih dahulu untuk menampilkan mata pelajaran yang diampu.'
            />
          )}

          <Card
            bordered={false}
            style={{
              borderRadius: 20,
              background: "linear-gradient(135deg, #ecfeff, #eff6ff)",
              border: "1px solid rgba(14, 165, 233, 0.16)",
            }}
          >
            <Flex align='flex-start' gap={12}>
              <CheckCircle size={18} color='#0284c7' style={{ marginTop: 2 }} />
              <div>
                <Text strong style={{ display: "block", marginBottom: 4 }}>
                  Catatan penggunaan
                </Text>
                <Text type='secondary'>
                  Pastikan judul bank soal spesifik dan mudah dikenali agar proses penyusunan, pencarian, dan pengelompokan soal tetap efisien.
                </Text>
              </div>
            </Flex>
          </Card>

          <Flex
            justify='flex-end'
            gap={10}
            style={{ flexDirection: screens.xs ? "column-reverse" : "row" }}
          >
            <Button
              onClick={onClose}
              disabled={isLoading}
              block={!!screens.xs}
              size='large'
              style={{ minWidth: screens.xs ? "100%" : 92, borderRadius: 14 }}
            >
              Batal
            </Button>
            <Button
              type='primary'
              htmlType='submit'
              loading={isLoading}
              block={!!screens.xs}
              size='large'
              icon={
                isLoading ? (
                  <Loader2 className='animate-spin' size={16} />
                ) : (
                  <ClipboardList size={16} />
                )
              }
              style={{
                minWidth: screens.xs ? "100%" : 170,
                borderRadius: 14,
                boxShadow: "0 12px 24px rgba(37, 99, 235, 0.20)",
              }}
            >
              {isEdit ? "Simpan Perubahan" : "Buat Bank Soal"}
            </Button>
          </Flex>
        </MotionDiv>
      </div>
    </Form>
  );
};

export default BankForm;
