import { useEffect, useMemo, useRef } from "react";
import {
  Flex,
  Form,
  Input,
  Select,
  InputNumber,
  Switch,
  Button,
  Alert,
  Space,
  Typography,
  message,
} from "antd";
import { useSelector } from "react-redux";
import { User, BookOpen, Users, Timer } from "lucide-react";
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

const ExamForm = ({ initialValues, onClose, onSuccess }) => {
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
    () => (classes || []).map((item) => ({ label: item.name, value: item.id })),
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
    <Form
      form={form}
      layout="vertical"
      onFinish={onFinish}
      initialValues={{ is_active: true, is_shuffle: false }}
    >
      {!isEdit && (
        <Alert
          title={isAdmin ? "Mode Admin" : `Guru: ${user?.full_name}`}
          description={
            isAdmin
              ? "Pilih guru terlebih dahulu. Bank soal dan jadwal akan mengikuti guru tersebut."
              : "Guru otomatis terpilih sesuai akun Anda."
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {isAdmin && (
        <Form.Item
          label="Guru"
          name="teacher_id"
          rules={[{ required: true, message: "Admin wajib memilih guru" }]}
        >
          <Select
            placeholder="Cari nama guru"
            loading={loadingTeachers}
            showSearch={{ optionFilterProp: ["label"] }}
            allowClear
            suffixIcon={<User size={14} />}
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
        label="Bank Soal"
        name="bank_id"
        rules={[{ required: true, message: "Pilih bank soal" }]}
      >
        <Select
          placeholder={
            resolvedTeacherId ? "Pilih bank soal" : "Pilih guru terlebih dahulu"
          }
          loading={loadingBanks}
          showSearch
          optionFilterProp="label"
          disabled={!resolvedTeacherId}
          suffixIcon={<BookOpen size={14} />}
          options={(banks || []).map((bank) => ({
            label: `${bank.title} (${bank.subject_name || "Mapel Umum"})`,
            value: bank.id,
          }))}
        />
      </Form.Item>

      <div
        style={{ display: "grid", gridTemplateColumns: "1.4fr 0.6fr", gap: 12 }}
      >
        <Form.Item
          label="Nama Jadwal Ujian"
          name="name"
          rules={[{ required: true, message: "Nama jadwal wajib diisi" }]}
        >
          <Input placeholder="Contoh: PTS Matematika Kelas X" />
        </Form.Item>
        <Form.Item
          label="Durasi (Menit)"
          name="duration_minutes"
          rules={[{ required: true, message: "Durasi wajib diisi" }]}
        >
          <InputNumber
            min={10}
            style={{ width: "100%" }}
            placeholder="90"
            prefix={<Timer size={14} />}
          />
        </Form.Item>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Form.Item
          label="Grade"
          name="grade_id"
          rules={[{ required: true, message: "Pilih grade" }]}
        >
          <Select
            placeholder="Pilih grade"
            loading={loadingGrades}
            showSearch
            onChange={() => form.setFieldValue("class_ids", [])}
          >
            {grades?.map((grade) => (
              <Select.Option key={grade.id} value={grade.id}>
                {grade.name}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item
          label={
            <Space size={6} align="center">
              <Users size={14} />
              <span>Kelas</span>
            </Space>
          }
          name="class_ids"
          rules={[{ required: true, message: "Pilih minimal 1 kelas" }]}
        >
          <Select
            mode="multiple"
            placeholder={gradeId ? "Pilih kelas" : "Pilih grade dahulu"}
            loading={loadingClasses}
            options={classOptions}
            disabled={!gradeId}
            maxTagCount="responsive"
            allowClear
            showSearch
            optionFilterProp="label"
          />
        </Form.Item>
      </div>

      <Flex
        justify="space-between"
        align="center"
        style={{ marginTop: -8, marginBottom: 12 }}
      >
        <Button size="small" onClick={handleSelectAllClasses}>
          Pilih Semua Kelas
        </Button>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Jika hanya pilih grade, semua kelas di grade tersebut otomatis
          dipilih.
        </Text>
      </Flex>

      <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
        <Form.Item
          label="Status Aktif"
          name="is_active"
          valuePropName="checked"
          style={{ marginBottom: 0 }}
        >
          <Switch />
        </Form.Item>
        <Form.Item
          label="Acak Soal"
          name="is_shuffle"
          valuePropName="checked"
          style={{ marginBottom: 0 }}
        >
          <Switch />
        </Form.Item>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          marginTop: 16,
          paddingTop: 12,
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <Button onClick={onClose} disabled={isLoading}>
          Batal
        </Button>
        <Button type="primary" htmlType="submit" loading={isLoading}>
          {isEdit ? "Simpan Perubahan" : "Buat Jadwal"}
        </Button>
      </div>
    </Form>
  );
};

export default ExamForm;
