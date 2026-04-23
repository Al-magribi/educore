import { useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import { BookOpen, Clock3, Sparkles, User, Users } from "lucide-react";
import { useSelector } from "react-redux";
import {
  useGetBanksForExamQuery,
  useCreateExamMutation,
  useUpdateExamMutation,
} from "../../../../service/cbt/ApiExam";
import { useGetTeachersQuery } from "../../../../service/cbt/ApiBank";
import {
  useGetGradesQuery,
  useGetClassesQuery,
} from "../../../../service/public/ApiPublic";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.34,
      staggerChildren: 0.07,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
  },
};

const summaryCardStyle = {
  borderRadius: 20,
  height: "100%",
  border: "1px solid rgba(148, 163, 184, 0.16)",
  boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
};

const ExamForm = ({ initialValues, onClose, onSuccess }) => {
  const screens = useBreakpoint();
  const [form] = Form.useForm();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === "admin";

  const gradeId = Form.useWatch("grade_id", form);
  const classIds = Form.useWatch("class_ids", form);
  const teacherIdField = Form.useWatch("teacher_id", form);
  const resolvedTeacherId = isAdmin ? teacherIdField : user?.id;

  const { data: teachers, isLoading: loadingTeachers } = useGetTeachersQuery(
    undefined,
    { skip: !isAdmin },
  );

  const { data: grades, isLoading: loadingGrades } = useGetGradesQuery();
  const { data: classes, isLoading: loadingClasses } = useGetClassesQuery(
    { gradeId },
    { skip: !gradeId },
  );

  const { data: banks, isLoading: loadingBanks } = useGetBanksForExamQuery(
    { teacher_id: resolvedTeacherId },
    { skip: !resolvedTeacherId },
  );

  const [createExam, { isLoading: isCreating }] = useCreateExamMutation();
  const [updateExam, { isLoading: isUpdating }] = useUpdateExamMutation();

  const isEdit = !!initialValues;
  const isLoading = isCreating || isUpdating;
  const previousTeacherRef = useRef(null);

  const classOptions = useMemo(
    () =>
      (classes || [])
        .filter((item) => item.is_active)
        .map((item) => ({ label: item.name, value: item.id })),
    [classes],
  );

  const summaryItems = [
    {
      key: "teacher",
      label: "Pengampu",
      value: isAdmin
        ? teacherIdField
          ? "Dipilih"
          : "Belum Dipilih"
        : user?.full_name || "-",
      icon: <User size={18} />,
      background: "linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)",
      color: "#1d4ed8",
    },
    {
      key: "bank",
      label: "Bank Soal",
      value: resolvedTeacherId ? banks?.length || 0 : 0,
      icon: <BookOpen size={18} />,
      background: "linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)",
      color: "#15803d",
    },
    {
      key: "classes",
      label: "Kelas Dipilih",
      value: Array.isArray(classIds) ? classIds.length : 0,
      icon: <Users size={18} />,
      background: "linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)",
      color: "#b45309",
    },
  ];

  useEffect(() => {
    if (isAdmin) {
      if (!teacherIdField && !isEdit) {
        form.setFieldValue("teacher_id", null);
      }
    } else {
      form.setFieldValue("teacher_id", user?.id || null);
    }
  }, [isAdmin, teacherIdField, user, form, isEdit]);

  useEffect(() => {
    if (!gradeId || !classOptions.length) return;
    if (!classIds || classIds.length === 0) {
      form.setFieldValue(
        "class_ids",
        classOptions.map((opt) => opt.value),
      );
    }
  }, [gradeId, classOptions, classIds, form]);

  useEffect(() => {
    if (isEdit && initialValues) {
      form.setFieldsValue({
        ...initialValues,
        class_ids: initialValues.classes?.map((c) => c.id) || [],
      });
    } else {
      form.resetFields();
      if (!isAdmin) {
        form.setFieldValue("teacher_id", user?.id || null);
      }
    }
  }, [initialValues, form, isEdit, isAdmin, user]);

  useEffect(() => {
    if (isAdmin && resolvedTeacherId) {
      if (
        previousTeacherRef.current &&
        previousTeacherRef.current !== resolvedTeacherId
      ) {
        form.setFieldValue("bank_id", null);
      }
      previousTeacherRef.current = resolvedTeacherId;
    }
  }, [resolvedTeacherId, isAdmin, form]);

  const handleSelectAllClasses = () => {
    if (classOptions.length === 0) return;
    form.setFieldValue(
      "class_ids",
      classOptions.map((opt) => opt.value),
    );
  };

  const onFinish = async (values) => {
    try {
      const payload = {
        ...values,
        class_ids: values.class_ids || [],
      };

      if (isEdit) {
        await updateExam({ id: initialValues.id, ...payload }).unwrap();
      } else {
        await createExam(payload).unwrap();
      }

      form.resetFields();
      if (onSuccess) onSuccess();
    } catch (error) {
      message.error(error?.data?.message || "Terjadi kesalahan sistem");
    }
  };

  return (
    <MotionDiv
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{ display: "flex", flexDirection: "column", gap: 18 }}
    >
      <MotionDiv variants={itemVariants}>
        <Card
          variant='borderless'
          style={{
            borderRadius: 26,
            overflow: "hidden",
            background:
              "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 26%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f766e 100%)",
            boxShadow: "0 24px 52px rgba(15, 23, 42, 0.16)",
          }}
          styles={{ body: { padding: screens.xs ? 18 : 24 } }}
        >
          <Flex
            justify='space-between'
            align={screens.xs ? "stretch" : "center"}
            gap={18}
            wrap='wrap'
            style={{ flexDirection: screens.xs ? "column" : "row" }}
          >
            <Space orientation='vertical' size={10} style={{ maxWidth: 720 }}>
              <Space wrap size={8}>
                <Text style={{ color: "rgba(255,255,255,0.74)" }}>
                  Form Jadwal Ujian
                </Text>
                <Tag
                  style={{
                    margin: 0,
                    borderRadius: 999,
                    paddingInline: 12,
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                    borderColor: "rgba(255,255,255,0.16)",
                  }}
                  icon={<Sparkles size={12} />}
                >
                  {isEdit ? "Edit Jadwal" : "Buat Jadwal Baru"}
                </Tag>
              </Space>
              <Title
                level={screens.xs ? 4 : 3}
                style={{ margin: 0, color: "#fff", lineHeight: 1.12 }}
              >
                Susun jadwal ujian dengan rapi dan terarah
              </Title>
              <Text style={{ color: "rgba(255,255,255,0.82)", maxWidth: 760 }}>
                Atur pengampu, bank soal, durasi, grade, serta cakupan kelas.
              </Text>
            </Space>
          </Flex>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: screens.xs
              ? "1fr"
              : "repeat(3, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {summaryItems.map((item) => (
            <Card
              key={item.key}
              variant='borderless'
              style={summaryCardStyle}
              styles={{ body: { padding: 18 } }}
            >
              <Flex align='center' justify='space-between' gap={16}>
                <Space orientation='vertical' size={4} style={{ minWidth: 0 }}>
                  <Text type='secondary'>{item.label}</Text>
                  <Title
                    level={screens.xs ? 5 : 4}
                    style={{ margin: 0, overflowWrap: "anywhere" }}
                  >
                    {item.value}
                  </Title>
                </Space>
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 16,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: item.background,
                    color: item.color,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </div>
              </Flex>
            </Card>
          ))}
        </div>
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Form
          form={form}
          layout='vertical'
          onFinish={onFinish}
          initialValues={{ is_active: true, is_shuffle: false }}
        >
          {!isEdit && (
            <Alert
              message={isAdmin ? "Mode Admin" : `Guru: ${user?.full_name}`}
              description={
                isAdmin
                  ? "Pilih guru terlebih dahulu. Bank soal dan jadwal akan mengikuti guru tersebut."
                  : "Guru otomatis terpilih sesuai akun Anda."
              }
              type='info'
              showIcon
              style={{ marginBottom: 16, borderRadius: 16 }}
            />
          )}

          <Card
            variant='borderless'
            style={{
              borderRadius: 24,
              boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
            }}
            styles={{ body: { padding: screens.xs ? 16 : 20 } }}
          >
            <Space orientation='vertical' size={18} style={{ width: "100%" }}>
              {isAdmin && (
                <Form.Item
                  label='Guru'
                  name='teacher_id'
                  rules={[
                    { required: true, message: "Admin wajib memilih guru" },
                  ]}
                >
                  <Select
                    placeholder='Cari nama guru'
                    loading={loadingTeachers}
                    showSearch
                    optionFilterProp='label'
                    allowClear
                    suffixIcon={<User size={14} />}
                    virtual={false}
                  >
                    {teachers?.map((t) => (
                      <Select.Option
                        key={t.id}
                        value={t.id}
                        label={t.full_name}
                      >
                        {t.full_name}
                      </Select.Option>
                    ))}
                  </Select>
                </Form.Item>
              )}

              <Form.Item
                label='Bank Soal'
                name='bank_id'
                rules={[{ required: true, message: "Pilih bank soal" }]}
              >
                <Select
                  placeholder={
                    resolvedTeacherId
                      ? "Pilih bank soal"
                      : "Pilih guru terlebih dahulu"
                  }
                  loading={loadingBanks}
                  showSearch
                  optionFilterProp='label'
                  disabled={!resolvedTeacherId}
                  suffixIcon={<BookOpen size={14} />}
                  options={(banks || []).map((bank) => ({
                    label: `${bank.title} (${bank.subject_name || "Mapel Umum"})`,
                    value: bank.id,
                  }))}
                  virtual={false}
                />
              </Form.Item>

              <Row gutter={screens.xs ? 0 : 12}>
                <Col xs={24} md={16}>
                  <Form.Item
                    label='Nama Jadwal Ujian'
                    name='name'
                    rules={[
                      { required: true, message: "Nama jadwal wajib diisi" },
                    ]}
                  >
                    <Input placeholder='Contoh: PTS Matematika Kelas X' />
                  </Form.Item>
                </Col>
                <Col xs={24} md={8}>
                  <Form.Item
                    label='Durasi (Menit)'
                    name='duration_minutes'
                    rules={[{ required: true, message: "Durasi wajib diisi" }]}
                  >
                    <InputNumber
                      min={10}
                      style={{ width: "100%" }}
                      placeholder='90'
                      prefix={<Clock3 size={14} />}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={screens.xs ? 0 : 12}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label='Tingkat'
                    name='grade_id'
                    rules={[{ required: true, message: "Pilih grade" }]}
                  >
                    <Select
                      placeholder='Pilih tingkat'
                      loading={loadingGrades}
                      showSearch
                      onChange={() => form.setFieldValue("class_ids", [])}
                      virtual={false}
                    >
                      {grades?.map((grade) => (
                        <Select.Option key={grade.id} value={grade.id}>
                          {grade.name}
                        </Select.Option>
                      ))}
                    </Select>
                  </Form.Item>
                </Col>

                <Col xs={24} sm={12}>
                  <Form.Item
                    label={
                      <Space size={6} align='center'>
                        <Users size={14} />
                        <span>Kelas</span>
                      </Space>
                    }
                    name='class_ids'
                    rules={[
                      { required: true, message: "Pilih minimal 1 kelas" },
                    ]}
                  >
                    <Select
                      mode='multiple'
                      placeholder={
                        gradeId ? "Pilih kelas" : "Pilih grade dahulu"
                      }
                      loading={loadingClasses}
                      options={classOptions}
                      disabled={!gradeId}
                      maxTagCount='responsive'
                      allowClear
                      showSearch={{ optionFilterProp: "label" }}
                      virtual={false}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Flex
                vertical={!!screens.xs}
                justify='space-between'
                align={screens.xs ? "stretch" : "center"}
                gap={screens.xs ? 8 : 12}
                style={{
                  marginTop: -8,
                  marginBottom: 8,
                  padding: "12px 14px",
                  borderRadius: 16,
                  background: "#f8fafc",
                  border: "1px solid rgba(148, 163, 184, 0.14)",
                }}
              >
                <Button
                  size='small'
                  onClick={handleSelectAllClasses}
                  style={{ width: screens.xs ? "100%" : "auto" }}
                >
                  Pilih Semua Kelas
                </Button>
                <Text type='secondary' style={{ fontSize: 12 }}>
                  Jika hanya pilih grade, semua kelas di grade tersebut otomatis
                  dipilih.
                </Text>
              </Flex>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: screens.xs
                    ? "1fr"
                    : "repeat(2, minmax(0, 1fr))",
                  gap: 16,
                }}
              >
                <Card
                  variant='borderless'
                  style={{ borderRadius: 18, background: "#f8fafc" }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Form.Item
                    label='Status Aktif'
                    name='is_active'
                    valuePropName='checked'
                    style={{ marginBottom: 0 }}
                  >
                    <Switch />
                  </Form.Item>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    Jadwal aktif langsung tersedia untuk peserta sesuai
                    konfigurasi.
                  </Text>
                </Card>

                <Card
                  variant='borderless'
                  style={{ borderRadius: 18, background: "#f8fafc" }}
                  styles={{ body: { padding: 16 } }}
                >
                  <Form.Item
                    label='Acak Soal'
                    name='is_shuffle'
                    valuePropName='checked'
                    style={{ marginBottom: 0 }}
                  >
                    <Switch />
                  </Form.Item>
                  <Text type='secondary' style={{ fontSize: 12 }}>
                    Soal akan diacak untuk membantu menjaga variasi urutan
                    peserta.
                  </Text>
                </Card>
              </div>
            </Space>
          </Card>

          <div
            style={{
              display: "flex",
              flexDirection: screens.xs ? "column-reverse" : "row",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 16,
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
              {isEdit ? "Simpan Perubahan" : "Buat Jadwal"}
            </Button>
          </div>
        </Form>
      </MotionDiv>
    </MotionDiv>
  );
};

export default ExamForm;
