import React, { useEffect, useMemo } from "react";
import {
  Button,
  Divider,
  Drawer,
  Flex,
  Form,
  Input,
  InputNumber,
  Segmented,
  Select,
  Space,
  Switch,
  Typography,
} from "antd";
import { CircleAlert, Save } from "lucide-react";

const { Text, Title } = Typography;
const { TextArea } = Input;

const typeOptions = [
  { label: "Penghargaan", value: "reward" },
  { label: "Pelanggaran", value: "punishment" },
];

const PointRuleFormDrawer = ({
  open,
  onClose,
  onSubmit,
  initialValues,
  submitting,
  categories = [],
}) => {
  const [form] = Form.useForm();
  const isEdit = Boolean(initialValues?.id);
  const watchedType = Form.useWatch("point_type", form) || "reward";

  const categoryOptions = useMemo(
    () =>
      categories
        .filter((item) => item.point_type === watchedType && item.is_active)
        .map((item) => ({
          value: item.id,
          label: item.name,
        })),
    [categories, watchedType],
  );

  useEffect(() => {
    if (!open) return;
    form.setFieldsValue({
      name: initialValues?.name || "",
      point_type: initialValues?.point_type || "reward",
      category_id: initialValues?.category_id || null,
      point_value: initialValues?.point_value || 5,
      description: initialValues?.description || "",
      is_active: initialValues?.is_active ?? true,
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
      category_id: values.category_id || null,
      point_value: Number(values.point_value),
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
              <CircleAlert size={20} />
            </span>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {isEdit ? "Perbarui Rule Poin" : "Tambah Rule Poin"}
              </Title>
              <Text style={{ color: "#64748b" }}>
                Tentukan jenis, bobot, dan kategori penghargaan atau pelanggaran.
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
            label='Nama Rule'
            name='name'
            rules={[
              { required: true, message: "Nama rule wajib diisi." },
              { min: 3, message: "Nama rule minimal 3 karakter." },
            ]}
          >
            <Input
              placeholder='Contoh: Tepat waktu, Merokok, Membantu teman'
              style={{ borderRadius: 14, height: 44 }}
              maxLength={120}
            />
          </Form.Item>

          <Form.Item
            label='Tipe Poin'
            name='point_type'
            rules={[{ required: true, message: "Tipe poin wajib dipilih." }]}
          >
            <Segmented
              block
              options={typeOptions}
              onChange={() => form.setFieldValue("category_id", null)}
            />
          </Form.Item>

          <Form.Item
            label='Kategori'
            name='category_id'
            extra='Opsional. Rule lama boleh tanpa kategori sampai dikelompokkan.'
          >
            <Select
              allowClear
              virtual={false}
              placeholder='Pilih kategori'
              options={categoryOptions}
            />
          </Form.Item>

          <Form.Item
            label='Nilai Poin'
            name='point_value'
            rules={[{ required: true, message: "Nilai poin wajib diisi." }]}
            extra='Batas nilai poin per rule adalah 1 sampai 100.'
          >
            <InputNumber
              min={1}
              max={100}
              precision={0}
              style={{ width: "100%" }}
              controls
              size='large'
            />
          </Form.Item>

          <Form.Item label='Deskripsi Singkat' name='description'>
            <TextArea
              rows={4}
              maxLength={240}
              showCount
              placeholder='Tambahkan konteks penggunaan rule ini bila diperlukan.'
              style={{ borderRadius: 14 }}
            />
          </Form.Item>

          <Divider style={{ margin: "8px 0 20px" }} />

          <Form.Item
            label='Status Rule'
            name='is_active'
            valuePropName='checked'
          >
            <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
          </Form.Item>
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
              {isEdit ? "Simpan Perubahan" : "Simpan Rule"}
            </Button>
          </Flex>
        </div>
      </Flex>
    </Drawer>
  );
};

export default PointRuleFormDrawer;
