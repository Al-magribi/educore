import { useEffect, useMemo, useRef } from "react";
import {
  Alert,
  Button,
  Col,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Row,
  Select,
  Switch,
  Typography,
  message,
} from "antd";
import { BookOpen, Clock3, User } from "lucide-react";
import { useSelector } from "react-redux";
import { museColors, museRadius } from "../../../../config/theme";
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

const { Text } = Typography;
const { useBreakpoint } = Grid;

const SectionLabel = ({ children }) => (
  <div
    style={{
      fontSize: 12,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: 0.4,
      color: museColors.muted,
      margin: "4px 0 12px",
    }}
  >
    {children}
  </div>
);

const SwitchRow = ({ name, title, description, last }) => (
  <Flex
    align='center'
    justify='space-between'
    gap={16}
    style={{
      padding: "12px 16px",
      borderBottom: last ? 0 : `1px solid ${museColors.divider}`,
    }}
  >
    <div style={{ minWidth: 0 }}>
      <Text strong style={{ display: "block" }}>
        {title}
      </Text>
      <Text type='secondary' style={{ fontSize: 12 }}>
        {description}
      </Text>
    </div>
    <Form.Item name={name} valuePropName='checked' noStyle>
      <Switch aria-label={title} />
    </Form.Item>
  </Flex>
);

const ExamForm = ({ initialValues, onClose, onSuccess }) => {
  const screens = useBreakpoint();
  const [form] = Form.useForm();
  const { user } = useSelector((state) => state.auth);
  const isAdmin = user?.role === "admin" || user?.can_manage_cbt === true;

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
    if (isEdit && initialValues) {
      form.setFieldsValue({
        ...initialValues,
        class_ids: initialValues.classes?.map((c) => c.id) || [],
        violation_tolerance: initialValues.violation_tolerance ?? 3,
        violation_duration_seconds:
          initialValues.violation_duration_seconds ?? 5,
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
        message.success("Jadwal ujian berhasil diperbarui");
      } else {
        await createExam(payload).unwrap();
        message.success("Jadwal ujian berhasil dibuat");
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
      style={{ marginTop: 16 }}
      initialValues={{
        is_active: true,
        is_shuffle: false,
        violation_tolerance: 3,
        violation_duration_seconds: 5,
      }}
    >
      {!isEdit && (
        <Alert
          title={isAdmin ? "Mode admin" : `Pengampu: ${user?.full_name || "Anda"}`}
          description={
            isAdmin
              ? "Pilih guru terlebih dahulu. Daftar bank soal mengikuti guru yang dipilih."
              : "Pengampu otomatis terisi sesuai akun Anda."
          }
          type='info'
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <SectionLabel>Ujian</SectionLabel>

      {isAdmin && (
        <Form.Item
          label='Guru Pengampu'
          name='teacher_id'
          rules={[{ required: true, message: "Guru pengampu wajib dipilih" }]}
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
              <Select.Option key={t.id} value={t.id} label={t.full_name}>
                {t.full_name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>
      )}

      <Form.Item
        label='Bank Soal'
        name='bank_id'
        rules={[{ required: true, message: "Bank soal wajib dipilih" }]}
        extra={
          resolvedTeacherId && !loadingBanks && (banks || []).length === 0
            ? "Guru ini belum punya bank soal. Buat bank soal dulu di menu Bank Soal."
            : undefined
        }
      >
        <Select
          placeholder={
            resolvedTeacherId ? "Pilih bank soal" : "Pilih guru terlebih dahulu"
          }
          loading={loadingBanks}
          showSearch
          optionFilterProp='label'
          disabled={!resolvedTeacherId}
          suffixIcon={<BookOpen size={14} />}
          options={(banks || []).map((bank) => ({
            label: `${bank.title} (${bank.subject_name || "Mapel umum"})`,
            value: bank.id,
          }))}
          virtual={false}
        />
      </Form.Item>

      <Row gutter={16}>
        <Col xs={24} md={16}>
          <Form.Item
            label='Nama Jadwal Ujian'
            name='name'
            rules={[{ required: true, message: "Nama jadwal wajib diisi" }]}
          >
            <Input placeholder='Contoh: PTS Matematika Kelas X' />
          </Form.Item>
        </Col>
        <Col xs={24} md={8}>
          <Form.Item
            label='Durasi (menit)'
            name='duration_minutes'
            rules={[{ required: true, message: "Durasi wajib diisi" }]}
          >
            <InputNumber
              min={10}
              style={{ width: "100%" }}
              placeholder='90'
              prefix={<Clock3 size={14} color={museColors.muted} />}
            />
          </Form.Item>
        </Col>
      </Row>

      <SectionLabel>Peserta</SectionLabel>

      <Row gutter={16}>
        <Col xs={24} sm={12}>
          <Form.Item
            label='Tingkat'
            name='grade_id'
            rules={[{ required: true, message: "Tingkat wajib dipilih" }]}
          >
            <Select
              placeholder='Pilih tingkat'
              loading={loadingGrades}
              showSearch
              optionFilterProp='children'
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
              <Flex align='center' justify='space-between' gap={8} style={{ width: "100%" }}>
                <span>Kelas</span>
                <Button
                  type='link'
                  size='small'
                  onClick={handleSelectAllClasses}
                  disabled={!gradeId || classOptions.length === 0}
                  style={{ padding: 0, height: "auto" }}
                >
                  Pilih semua
                </Button>
              </Flex>
            }
            name='class_ids'
            rules={[{ required: true, message: "Pilih minimal 1 kelas" }]}
            extra={
              Array.isArray(classIds) && classIds.length > 0
                ? `${classIds.length} kelas dipilih`
                : undefined
            }
            styles={{ label: { width: "100%" } }}
          >
            <Select
              mode='multiple'
              placeholder={gradeId ? "Pilih kelas" : "Pilih tingkat dahulu"}
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

      <SectionLabel>Pengawasan</SectionLabel>

      <Row gutter={16}>
        <Col xs={24} md={12}>
          <Form.Item
            label='Toleransi Pelanggaran'
            name='violation_tolerance'
            rules={[{ required: true, message: "Toleransi pelanggaran wajib diisi" }]}
            extra='Jumlah pelanggaran sebelum siswa dikeluarkan dan perlu izin pengawas.'
          >
            <InputNumber min={1} precision={0} style={{ width: "100%" }} placeholder='3' />
          </Form.Item>
        </Col>
        <Col xs={24} md={12}>
          <Form.Item
            label='Batas Keluar Tab (detik)'
            name='violation_duration_seconds'
            rules={[{ required: true, message: "Batas keluar tab wajib diisi" }]}
            extra='Lama siswa boleh meninggalkan tab ujian sebelum satu pelanggaran tercatat.'
          >
            <InputNumber min={1} precision={0} style={{ width: "100%" }} placeholder='5' />
          </Form.Item>
        </Col>
      </Row>

      <Flex
        vertical
        style={{
          border: `1px solid ${museColors.divider}`,
          borderRadius: museRadius.item,
          marginBottom: 24,
        }}
      >
        <SwitchRow
          name='is_active'
          title='Jadwal aktif'
          description='Siswa di kelas terpilih bisa melihat dan mengikuti ujian ini.'
        />
        <SwitchRow
          name='is_shuffle'
          title='Acak urutan soal'
          description='Setiap siswa mendapat urutan soal yang berbeda.'
          last
        />
      </Flex>

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
          {isEdit ? "Simpan Perubahan" : "Buat Jadwal"}
        </Button>
      </Flex>
    </Form>
  );
};

export default ExamForm;
