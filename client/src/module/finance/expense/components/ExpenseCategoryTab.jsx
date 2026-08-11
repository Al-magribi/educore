import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import {
  Alert,
  Button,
  Flex,
  Form,
  Grid,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { LoadApp } from "../../../../components";
import { useFinanceScope } from "../../../center/finance/FinanceScopeContext";
import {
  useAddExpenseCategoryMutation,
  useDeleteExpenseCategoryMutation,
  useGetExpenseCategoriesQuery,
  useGetExpenseOptionsQuery,
  useUpdateExpenseCategoryMutation,
} from "../../../../service/finance/ApiExpense";
import { categoryColor, categoryLabel } from "../constants";

const { Text } = Typography;

const COLOR_OPTIONS = [
  "blue",
  "cyan",
  "purple",
  "orange",
  "magenta",
  "geekblue",
  "green",
  "gold",
  "red",
  "default",
];

const ExpenseCategoryTab = () => {
  const { user } = useSelector((state) => state.auth);
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;
  const financeScope = useFinanceScope();
  const lockHomebase =
    Boolean(user?.homebase_id) || Boolean(financeScope?.homebaseId);
  const effectiveHomebaseId = user?.homebase_id || financeScope?.homebaseId;

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [form] = Form.useForm();

  const optionsQuery = useGetExpenseOptionsQuery(
    lockHomebase ? { homebase_id: effectiveHomebaseId } : undefined,
  );
  const options = optionsQuery.data?.data || {};
  const homebases = options.homebases || [];
  const selectedHomebaseId =
    options.selected_homebase_id ||
    user?.homebase_id ||
    financeScope?.homebaseId ||
    homebases[0]?.id ||
    undefined;

  const {
    data: categoriesResponse,
    isLoading,
    isFetching,
    isError,
    error,
  } = useGetExpenseCategoriesQuery(
    selectedHomebaseId
      ? {
          homebase_id: selectedHomebaseId,
          include_inactive: includeInactive ? "true" : undefined,
        }
      : undefined,
    { skip: !selectedHomebaseId },
  );

  const categories = categoriesResponse?.data || [];
  const colorOptions =
    categoriesResponse?.meta?.color_options || COLOR_OPTIONS;

  const [addCategory, addState] = useAddExpenseCategoryMutation();
  const [updateCategory, updateState] = useUpdateExpenseCategoryMutation();
  const [deleteCategory, deleteState] = useDeleteExpenseCategoryMutation();

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      label: "",
      code: "",
      color: "blue",
      sort_order: 100,
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      label: record.label,
      code: record.code,
      color: record.color || "default",
      sort_order: Number(record.sort_order || 0),
      is_active: record.is_active !== false,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (values) => {
    try {
      if (editing) {
        await updateCategory({
          id: editing.id,
          homebase_id: selectedHomebaseId,
          label: values.label,
          code: editing.is_system ? undefined : values.code,
          color: values.color,
          sort_order: values.sort_order,
          is_active: values.is_active,
        }).unwrap();
        message.success("Kategori diperbarui");
      } else {
        await addCategory({
          homebase_id: selectedHomebaseId,
          label: values.label,
          code: values.code || undefined,
          color: values.color,
          sort_order: values.sort_order,
          is_active: values.is_active,
        }).unwrap();
        message.success("Kategori ditambahkan");
      }
      setModalOpen(false);
    } catch (err) {
      message.error(err?.data?.message || "Gagal menyimpan kategori");
    }
  };

  const handleDelete = async (record) => {
    try {
      const result = await deleteCategory({
        id: record.id,
        homebase_id: selectedHomebaseId,
      }).unwrap();
      message.success(result?.message || "Kategori dihapus/dinonaktifkan");
    } catch (err) {
      message.error(err?.data?.message || "Gagal menghapus kategori");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Kategori",
        key: "label",
        render: (_, record) => (
          <Space direction='vertical' size={2}>
            <Space size={8} wrap>
              <Tag
                color={
                  record.color ||
                  categoryColor[record.code] ||
                  "default"
                }
                style={{ borderRadius: 999, margin: 0 }}
              >
                {record.label || categoryLabel[record.code] || record.code}
              </Tag>
              {record.is_system ? (
                <Tag style={{ borderRadius: 999, margin: 0 }}>Sistem</Tag>
              ) : null}
              {record.is_active === false ? (
                <Tag color='red' style={{ borderRadius: 999, margin: 0 }}>
                  Nonaktif
                </Tag>
              ) : null}
            </Space>
            <Text type='secondary' style={{ fontSize: 12 }}>
              Kode: {record.code}
            </Text>
          </Space>
        ),
      },
      {
        title: "Urutan",
        dataIndex: "sort_order",
        key: "sort_order",
        width: 90,
        align: "right",
      },
      {
        title: "Dipakai",
        dataIndex: "usage_count",
        key: "usage_count",
        width: 100,
        align: "right",
        render: (value) => Number(value || 0).toLocaleString("id-ID"),
      },
      {
        title: "Aksi",
        key: "actions",
        width: isMobile ? 110 : 160,
        fixed: "right",
        render: (_, record) => (
          <Space size={4}>
            <Button
              type='link'
              size='small'
              icon={<Pencil size={14} />}
              onClick={() => openEdit(record)}
            >
              {!isMobile ? "Edit" : null}
            </Button>
            {Number(record.usage_count || 0) > 0 ? (
              <Tooltip title='Tidak bisa dihapus: masih dipakai transaksi. Nonaktifkan lewat Edit jika perlu.'>
                <Button
                  type='link'
                  size='small'
                  danger
                  icon={<Trash2 size={14} />}
                  disabled
                >
                  {!isMobile ? "Hapus" : null}
                </Button>
              </Tooltip>
            ) : (
              <Popconfirm
                title='Hapus kategori ini?'
                description='Kategori akan dihapus permanen dari satuan ini (termasuk pos RAPBS terkait).'
                okText='Hapus'
                cancelText='Batal'
                okButtonProps={{ danger: true }}
                onConfirm={() => handleDelete(record)}
              >
                <Button
                  type='link'
                  size='small'
                  danger
                  icon={<Trash2 size={14} />}
                  loading={deleteState.isLoading}
                >
                  {!isMobile ? "Hapus" : null}
                </Button>
              </Popconfirm>
            )}
          </Space>
        ),
      },
    ],
    [deleteState.isLoading, isMobile],
  );

  if (optionsQuery.isLoading) {
    return <LoadApp />;
  }

  if (!selectedHomebaseId) {
    return (
      <Alert
        type='warning'
        showIcon
        message='Pilih satuan pendidikan terlebih dahulu untuk mengelola kategori.'
      />
    );
  }

  return (
    <Space direction='vertical' size={14} style={{ width: "100%" }}>
      <Alert
        type='info'
        showIcon
        message='Kategori pengeluaran per satuan'
        description='Kategori ini dipakai pada pengeluaran harian dan menjadi pos pengeluaran di RAPBS. Hanya admin keuangan dan pusat yang dapat mengubah.'
      />

      <Flex justify='space-between' align='center' gap={12} wrap='wrap'>
        <Space wrap>
          <Text type='secondary'>Tampilkan nonaktif</Text>
          <Switch checked={includeInactive} onChange={setIncludeInactive} />
        </Space>
        <Button type='primary' icon={<Plus size={15} />} onClick={openCreate}>
          Tambah Kategori
        </Button>
      </Flex>

      {isError ? (
        <Alert
          type='error'
          showIcon
          message={error?.data?.message || "Gagal memuat kategori"}
        />
      ) : null}

      <Table
        rowKey='id'
        columns={columns}
        dataSource={categories}
        loading={isLoading || isFetching}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        scroll={{ x: 720 }}
        size={isMobile ? "small" : "middle"}
      />

      <Modal
        open={modalOpen}
        title={editing ? "Edit Kategori" : "Tambah Kategori"}
        onCancel={() => setModalOpen(false)}
        onOk={form.submit}
        okText={editing ? "Simpan" : "Tambah"}
        confirmLoading={addState.isLoading || updateState.isLoading}
        destroyOnClose
      >
        <Form form={form} layout='vertical' onFinish={handleSubmit}>
          <Form.Item
            name='label'
            label='Nama kategori'
            rules={[
              { required: true, message: "Nama wajib diisi" },
              { max: 100, message: "Maksimal 100 karakter" },
            ]}
          >
            <Input placeholder='Contoh: Pembangunan Gedung' />
          </Form.Item>

          <Form.Item
            name='code'
            label='Kode'
            extra={
              editing?.is_system
                ? "Kode kategori sistem tidak dapat diubah."
                : "Opsional. Jika kosong, dibuat otomatis dari nama."
            }
          >
            <Input
              placeholder='contoh: pembangunan'
              disabled={Boolean(editing?.is_system)}
            />
          </Form.Item>

          <Form.Item name='color' label='Warna' rules={[{ required: true }]}>
            <Select
              options={colorOptions.map((item) => ({
                value: item,
                label: (
                  <Space>
                    <Tag color={item} style={{ margin: 0 }}>
                      {item}
                    </Tag>
                  </Space>
                ),
              }))}
            />
          </Form.Item>

          <Form.Item name='sort_order' label='Urutan'>
            <InputNumber style={{ width: "100%" }} min={0} max={9999} />
          </Form.Item>

          <Form.Item
            name='is_active'
            label='Aktif'
            valuePropName='checked'
          >
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
};

export default ExpenseCategoryTab;
