import React, { useEffect } from "react";
import {
  Button,
  DatePicker,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  Select,
  Space,
  Typography,
} from "antd";
import dayjs from "dayjs";
import { Save, UserRoundPen } from "lucide-react";

const { Text, Title } = Typography;
const { TextArea } = Input;

const TeacherPointEntryDrawer = ({
  open,
  onClose,
  onSubmit,
  students = [],
  rules = [],
  initialValues,
  submitting,
}) => {
  const [form] = Form.useForm();
  const isEdit = Boolean(initialValues?.id);

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      student_id: initialValues?.student_id || undefined,
      rule_id: initialValues?.rule_id || undefined,
      entry_date: initialValues?.entry_date
        ? dayjs(initialValues.entry_date)
        : dayjs(),
      description: initialValues?.description || "",
    });
  }, [form, initialValues, open]);

  const handleClose = () => {
    form.resetFields();
    onClose();
  };

  const handleFinish = async (values) => {
    await onSubmit({
      ...initialValues,
      ...values,
      student_id: Number(values.student_id),
      rule_id: Number(values.rule_id),
      entry_date: values.entry_date.format("YYYY-MM-DD"),
    });
    form.resetFields();
  };

  return (
    <Drawer
      title={null}
      placement='right'
      width={520}
      onClose={handleClose}
      open={open}
      destroyOnHidden
      styles={{ body: { padding: 0 } }}
    >
      <Flex vertical style={{ height: "100%" }}>
        <div
          style={{
            padding: 24,
            borderBottom: "1px solid #e5edf6",
            background:
              "linear-gradient(180deg, rgba(239,246,255,0.9) 0%, rgba(255,255,255,1) 100%)",
          }}
        >
          <Space align='start'>
            <span
              style={{
                width: 46,
                height: 46,
                borderRadius: 16,
                background: "#dbeafe",
                color: "#1d4ed8",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <UserRoundPen size={20} />
            </span>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {isEdit ? "Perbarui Poin Siswa" : "Tambah Poin Siswa"}
              </Title>
              <Text style={{ color: "#64748b" }}>
                Pilih siswa dan rule poin yang relevan, lalu simpan catatan bila
                diperlukan untuk kebutuhan tindak lanjut.
              </Text>
            </div>
          </Space>
        </div>

        <Form
          form={form}
          layout='vertical'
          onFinish={handleFinish}
          style={{ padding: 24, flex: 1, overflowY: "auto" }}
        >
          <Form.Item
            label='Siswa'
            name='student_id'
            rules={[{ required: true, message: "Siswa wajib dipilih." }]}
          >
            <Select
              showSearch
              optionFilterProp='label'
              placeholder='Pilih siswa'
              options={students.map((item) => ({
                value: item.student_id,
                label: `${item.student_name} - ${item.nis || "-"}`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label='Rule Poin'
            name='rule_id'
            rules={[{ required: true, message: "Rule poin wajib dipilih." }]}
          >
            <Select
              showSearch
              optionFilterProp='label'
              placeholder='Pilih rule poin'
              options={rules.map((item) => ({
                value: item.id,
                label: `${item.name} • ${item.point_type} • ${item.point_value} poin`,
              }))}
            />
          </Form.Item>

          <Form.Item
            label='Tanggal Kejadian'
            name='entry_date'
            rules={[{ required: true, message: "Tanggal wajib diisi." }]}
          >
            <DatePicker style={{ width: "100%" }} format='DD MMMM YYYY' />
          </Form.Item>

          <Form.Item label='Catatan' name='description'>
            <TextArea
              rows={4}
              maxLength={240}
              showCount
              placeholder='Tambahkan konteks kejadian atau tindak lanjut jika diperlukan.'
              style={{ borderRadius: 14 }}
            />
          </Form.Item>

          <Divider style={{ margin: "8px 0 0" }} />
        </Form>

        <div
          style={{
            padding: 20,
            borderTop: "1px solid #e5edf6",
            background: "#fff",
          }}
        >
          <Flex justify='end' gap={10}>
            <Button onClick={handleClose} style={{ borderRadius: 12 }}>
              Batal
            </Button>
            <Button
              type='primary'
              htmlType='submit'
              loading={submitting}
              icon={<Save size={16} />}
              onClick={() => form.submit()}
              style={{
                borderRadius: 12,
                background: "#0f172a",
                borderColor: "#0f172a",
                fontWeight: 700,
              }}
            >
              {isEdit ? "Simpan Perubahan" : "Simpan Poin"}
            </Button>
          </Flex>
        </div>
      </Flex>
    </Drawer>
  );
};

export default TeacherPointEntryDrawer;
