import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Segmented,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import { FolderPlus, PencilLine, Save, Trash2 } from "lucide-react";
import { POINT_TYPE_LABELS } from "../utils/pointCatalog";
import {
  useCreateAdminPointCategoryMutation,
  useDeleteAdminPointCategoryMutation,
  useUpdateAdminPointCategoryMutation,
} from "../../../../service/lms/ApiPoint";

const { Text, Title } = Typography;

const panelStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const typeOptions = [
  { label: "Penghargaan", value: "reward" },
  { label: "Pelanggaran", value: "punishment" },
];

const CategoryList = ({
  title,
  items,
  selectedId,
  onSelect,
  onDelete,
  isMobile,
}) => (
  <Card style={panelStyle} styles={{ body: { padding: 18 } }}>
    <Flex vertical gap={12}>
      <Title level={5} style={{ margin: 0 }}>
        {title}
      </Title>
      {items.length ? (
        items.map((item, index) => {
          const active = Number(selectedId) === Number(item.id);
          return (
            <Card
              key={item.id}
              hoverable
              onClick={() => onSelect(item)}
              style={{
                borderRadius: 16,
                border: active ? "1px solid #93c5fd" : "1px solid #e5edf6",
                background: active ? "#eff6ff" : "#fff",
                boxShadow: "none",
              }}
              styles={{ body: { padding: 14 } }}
            >
              <Flex justify='space-between' align='center' gap={10}>
                <div>
                  <Text strong>
                    {String.fromCharCode(65 + index)}. {item.name}
                  </Text>
                  <div>
                    <Text style={{ color: "#64748b", fontSize: 12 }}>
                      Urutan {item.sort_order} ·{" "}
                      {item.is_active ? "Aktif" : "Nonaktif"}
                    </Text>
                  </div>
                </div>
                <Popconfirm
                  title='Hapus kategori ini?'
                  description='Rule di dalamnya akan menjadi tanpa kategori.'
                  onConfirm={(event) => {
                    event?.stopPropagation?.();
                    onDelete(item);
                  }}
                  okText='Hapus'
                  cancelText='Batal'
                >
                  <Button
                    danger
                    size='small'
                    icon={<Trash2 size={14} />}
                    onClick={(event) => event.stopPropagation()}
                    style={{ borderRadius: 10 }}
                  />
                </Popconfirm>
              </Flex>
            </Card>
          );
        })
      ) : (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={`Belum ada kategori ${title.toLowerCase()}.`}
        />
      )}
    </Flex>
  </Card>
);

const PointCategoryPanel = ({
  categories = [],
  periodeId,
  isMobile = false,
}) => {
  const [form] = Form.useForm();
  const [selected, setSelected] = useState(null);
  const watchedType = Form.useWatch("point_type", form) || "punishment";

  const [createCategory, { isLoading: isCreating }] =
    useCreateAdminPointCategoryMutation();
  const [updateCategory, { isLoading: isUpdating }] =
    useUpdateAdminPointCategoryMutation();
  const [deleteCategory] = useDeleteAdminPointCategoryMutation();

  const grouped = useMemo(
    () => ({
      reward: categories.filter((item) => item.point_type === "reward"),
      punishment: categories.filter((item) => item.point_type === "punishment"),
    }),
    [categories],
  );

  useEffect(() => {
    form.setFieldsValue({
      name: selected?.name || "",
      point_type: selected?.point_type || "punishment",
      sort_order: selected?.sort_order || undefined,
      is_active: selected?.is_active ?? true,
    });
  }, [form, selected]);

  const handleReset = () => {
    setSelected(null);
    form.resetFields();
    form.setFieldsValue({
      point_type: "punishment",
      is_active: true,
    });
  };

  const handleSubmit = async (values) => {
    try {
      const payload = {
        periode_id: periodeId,
        name: values.name,
        point_type: values.point_type,
        sort_order: values.sort_order,
        is_active: values.is_active,
      };

      if (selected?.id) {
        const res = await updateCategory({ id: selected.id, ...payload }).unwrap();
        message.success(res?.message || "Kategori berhasil diperbarui.");
      } else {
        const res = await createCategory(payload).unwrap();
        message.success(res?.message || "Kategori berhasil ditambahkan.");
      }
      handleReset();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan kategori.");
    }
  };

  const handleDelete = async (item) => {
    try {
      const res = await deleteCategory(item.id).unwrap();
      message.success(res?.message || "Kategori berhasil dihapus.");
      if (Number(selected?.id) === Number(item.id)) handleReset();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus kategori.");
    }
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "1.1fr 0.9fr",
        gap: 16,
      }}
    >
      <Flex vertical gap={16}>
        <CategoryList
          title='Penghargaan'
          items={grouped.reward}
          selectedId={selected?.id}
          onSelect={setSelected}
          onDelete={handleDelete}
          isMobile={isMobile}
        />
        <CategoryList
          title='Pelanggaran'
          items={grouped.punishment}
          selectedId={selected?.id}
          onSelect={setSelected}
          onDelete={handleDelete}
          isMobile={isMobile}
        />
      </Flex>

      <Card style={panelStyle} styles={{ body: { padding: 20 } }}>
        <Flex vertical gap={16}>
          <Space align='start'>
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                background: "#eff6ff",
                color: "#2563eb",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {selected ? <PencilLine size={18} /> : <FolderPlus size={18} />}
            </span>
            <div>
              <Title level={4} style={{ margin: 0 }}>
                {selected ? "Perbarui Kategori" : "Tambah Kategori"}
              </Title>
              <Text style={{ color: "#64748b" }}>
                Kelompokkan rule seperti KEHADIRAN atau KEPRIBADIAN untuk{" "}
                {POINT_TYPE_LABELS[watchedType]?.toLowerCase() || "poin"}.
              </Text>
            </div>
          </Space>

          <Form
            form={form}
            layout='vertical'
            onFinish={handleSubmit}
            initialValues={{ point_type: "punishment", is_active: true }}
          >
            <Form.Item
              label='Nama Kategori'
              name='name'
              rules={[{ required: true, message: "Nama kategori wajib diisi." }]}
            >
              <Input
                placeholder='Contoh: Kehadiran, Kepribadian'
                style={{ borderRadius: 14, height: 44 }}
                maxLength={80}
              />
            </Form.Item>
            <Form.Item
              label='Tipe'
              name='point_type'
              rules={[{ required: true, message: "Tipe kategori wajib dipilih." }]}
            >
              <Segmented
                block
                options={typeOptions}
                disabled={Boolean(selected?.id)}
              />
            </Form.Item>
            <Form.Item
              label='Urutan'
              name='sort_order'
              extra='Kosongkan saat menambah agar urutan otomatis.'
            >
              <InputNumber min={1} precision={0} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              label='Status'
              name='is_active'
              valuePropName='checked'
            >
              <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
            </Form.Item>
            <Flex gap={10} justify='end'>
              {selected ? (
                <Button onClick={handleReset} style={{ borderRadius: 12 }}>
                  Batal
                </Button>
              ) : null}
              <Button
                type='primary'
                htmlType='submit'
                loading={isCreating || isUpdating}
                icon={<Save size={16} />}
                style={{
                  borderRadius: 12,
                  background: "#0f172a",
                  borderColor: "#0f172a",
                  fontWeight: 700,
                }}
              >
                {selected ? "Simpan Perubahan" : "Simpan Kategori"}
              </Button>
            </Flex>
          </Form>
        </Flex>
      </Card>
    </div>
  );
};

export default PointCategoryPanel;
