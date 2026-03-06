import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Drawer,
  Form,
  Input,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { Pencil, Plus, Trash2, UserRound } from "lucide-react";
import {
  useCreateMusyrifMutation,
  useDeleteMusyrifMutation,
  useGetHalaqohOptionsQuery,
  useGetMusyrifListQuery,
  useUpdateMusyrifMutation,
} from "../../../../service/tahfiz/ApiHalaqoh";

const { Title, Text } = Typography;

const Musyrif = () => {
  const [form] = Form.useForm();
  const [homebaseId, setHomebaseId] = useState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const optionsQuery = useGetHalaqohOptionsQuery({ homebase_id: homebaseId });
  const selectedHomebaseId = homebaseId ?? optionsQuery.data?.selected_homebase_id;

  const musyrifQuery = useGetMusyrifListQuery({
    homebase_id: selectedHomebaseId,
  });

  const [createMusyrif, { isLoading: creating }] = useCreateMusyrifMutation();
  const [updateMusyrif, { isLoading: updating }] = useUpdateMusyrifMutation();
  const [deleteMusyrif, { isLoading: deleting }] = useDeleteMusyrifMutation();

  const homebaseOptions = (optionsQuery.data?.homebases || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const isScopedHomebaseUser = homebaseOptions.length === 1;

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue({
      homebase_id: selectedHomebaseId ?? null,
      is_active: true,
    });
  };

  const openCreate = () => {
    setEditingData(null);
    resetForm();
    setDrawerOpen(true);
  };

  const openEdit = (record) => {
    setEditingData(record);
    form.setFieldsValue({
      homebase_id: record.homebase_id,
      full_name: record.full_name,
      phone: record.phone,
      gender: record.gender,
      notes: record.notes,
      is_active: record.is_active,
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    const payload = {
      homebase_id: values.homebase_id,
      full_name: values.full_name,
      phone: values.phone,
      gender: values.gender,
      notes: values.notes,
      is_active: values.is_active !== false,
    };

    try {
      if (editingData) {
        await updateMusyrif({ id: editingData.id, ...payload }).unwrap();
        message.success("Musyrif berhasil diperbarui.");
      } else {
        await createMusyrif(payload).unwrap();
        message.success("Musyrif berhasil ditambahkan.");
      }
      setDrawerOpen(false);
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan data musyrif.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteMusyrif(id).unwrap();
      message.success("Musyrif berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus musyrif.");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Nama Musyrif",
        dataIndex: "full_name",
        render: (value) => <Text strong>{value}</Text>,
      },
      {
        title: "Homebase",
        dataIndex: "homebase_name",
        render: (value) => value || "-",
      },
      {
        title: "Kontak",
        dataIndex: "phone",
        render: (value) => value || "-",
      },
      {
        title: "Gender",
        dataIndex: "gender",
        width: 120,
        render: (value) => value || "-",
      },
      {
        title: "Halaqoh",
        dataIndex: "halaqoh_count",
        width: 100,
        render: (value) => value || 0,
      },
      {
        title: "Status",
        dataIndex: "is_active",
        width: 120,
        render: (value) => (
          <Tag color={value ? "green" : "red"}>{value ? "Aktif" : "Nonaktif"}</Tag>
        ),
      },
      {
        title: "Aksi",
        key: "action",
        width: 120,
        render: (_, record) => (
          <Space>
            <Button
              icon={<Pencil size={16} />}
              onClick={() => openEdit(record)}
              type="text"
            />
            <Popconfirm
              title="Hapus musyrif ini?"
              okText="Hapus"
              cancelText="Batal"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button icon={<Trash2 size={16} />} danger type="text" loading={deleting} />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deleting],
  );

  return (
    <Card
      style={{ borderRadius: 16 }}
      styles={{ body: { padding: 20 } }}
      title={
        <Space>
          <UserRound size={18} />
          <span>Master Musyrif</span>
        </Space>
      }
      extra={
        <Space>
          <Select
            value={selectedHomebaseId}
            onChange={setHomebaseId}
            options={homebaseOptions}
            disabled={isScopedHomebaseUser}
            placeholder="Pilih Homebase"
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            Tambah Musyrif
          </Button>
        </Space>
      }
    >
      {musyrifQuery.error ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Gagal memuat data musyrif."
          description={musyrifQuery.error?.data?.message || "Silakan coba lagi."}
        />
      ) : null}

      <Table
        rowKey="id"
        loading={musyrifQuery.isFetching || optionsQuery.isFetching}
        columns={columns}
        dataSource={musyrifQuery.data || []}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        scroll={{ x: 900 }}
      />

      <Drawer
        title={editingData ? "Edit Musyrif" : "Tambah Musyrif"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        width={460}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Homebase"
            name="homebase_id"
            rules={[{ required: true, message: "Homebase wajib dipilih." }]}
          >
            <Select options={homebaseOptions} disabled={isScopedHomebaseUser} />
          </Form.Item>

          <Form.Item
            label="Nama Musyrif"
            name="full_name"
            rules={[{ required: true, message: "Nama musyrif wajib diisi." }]}
          >
            <Input placeholder="Nama lengkap musyrif" />
          </Form.Item>

          <Form.Item label="Nomor HP" name="phone">
            <Input placeholder="08xxxxxxxxxx" />
          </Form.Item>

          <Form.Item label="Gender" name="gender">
            <Select
              allowClear
              options={[
                { value: "L", label: "Laki-laki" },
                { value: "P", label: "Perempuan" },
              ]}
            />
          </Form.Item>

          <Form.Item label="Catatan" name="notes">
            <Input.TextArea rows={3} placeholder="Catatan tambahan (opsional)" />
          </Form.Item>

          <Form.Item label="Status Aktif" name="is_active" valuePropName="checked">
            <Switch />
          </Form.Item>

          <Space>
            <Button onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button type="primary" htmlType="submit" loading={creating || updating}>
              Simpan
            </Button>
          </Space>
        </Form>
      </Drawer>

      <Title level={5} style={{ marginTop: 20, marginBottom: 0 }}>
        Total Musyrif: {musyrifQuery.data?.length || 0}
      </Title>
    </Card>
  );
};

export default Musyrif;
