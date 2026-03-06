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
import { BookUser, Pencil, Plus, Trash2, Users } from "lucide-react";
import {
  useCreateHalaqohMutation,
  useDeleteHalaqohMutation,
  useGetHalaqohListQuery,
  useGetHalaqohOptionsQuery,
  useUpdateHalaqohMutation,
} from "../../../../service/tahfiz/ApiHalaqoh";

const { Text, Title } = Typography;

const Halaqoh = () => {
  const [form] = Form.useForm();
  const [homebaseId, setHomebaseId] = useState();
  const [periodeId, setPeriodeId] = useState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const optionsQuery = useGetHalaqohOptionsQuery({ homebase_id: homebaseId });
  const selectedHomebaseId = homebaseId ?? optionsQuery.data?.selected_homebase_id;

  const halaqohQuery = useGetHalaqohListQuery({
    homebase_id: selectedHomebaseId,
    periode_id: periodeId,
  });

  const [createHalaqoh, { isLoading: creating }] = useCreateHalaqohMutation();
  const [updateHalaqoh, { isLoading: updating }] = useUpdateHalaqohMutation();
  const [deleteHalaqoh, { isLoading: deleting }] = useDeleteHalaqohMutation();

  const homebaseOptions = (optionsQuery.data?.homebases || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const periodeOptions = (optionsQuery.data?.periodes || []).map((item) => ({
    value: item.id,
    label: `${item.name}${item.is_active ? " (Aktif)" : ""}`,
  }));

  const musyrifOptions = (optionsQuery.data?.musyrif || []).map((item) => ({
    value: item.id,
    label: `${item.full_name}${item.is_active ? "" : " (Nonaktif)"}`,
    disabled: !item.is_active,
  }));

  const studentOptions = (optionsQuery.data?.students || []).map((item) => ({
    value: item.id,
    label: `${item.full_name} (${item.nis || "-"}) - ${item.class_name || "-"}`,
  }));

  const isScopedHomebaseUser = homebaseOptions.length === 1;

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue({
      periode_id: periodeId ?? null,
      is_active: true,
      student_ids: [],
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
      periode_id: record.periode_id,
      name: record.name,
      musyrif_id: record.musyrif_id,
      is_active: record.is_active,
      student_ids: (record.students || []).map((item) => item.id),
    });
    setDrawerOpen(true);
  };

  const handleSubmit = async (values) => {
    const payload = {
      periode_id: values.periode_id,
      name: values.name,
      musyrif_id: values.musyrif_id,
      is_active: values.is_active !== false,
      student_ids: values.student_ids || [],
    };

    try {
      if (editingData) {
        await updateHalaqoh({ id: editingData.id, ...payload }).unwrap();
        message.success("Halaqoh berhasil diperbarui.");
      } else {
        await createHalaqoh(payload).unwrap();
        message.success("Halaqoh berhasil ditambahkan.");
      }
      setDrawerOpen(false);
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan data halaqoh.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteHalaqoh(id).unwrap();
      message.success("Halaqoh berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus halaqoh.");
    }
  };

  const columns = useMemo(
    () => [
      {
        title: "Nama Halaqoh",
        dataIndex: "name",
        render: (value) => <Text strong>{value}</Text>,
      },
      {
        title: "Periode",
        dataIndex: "periode_name",
        width: 210,
      },
      {
        title: "Musyrif",
        dataIndex: "musyrif_name",
        width: 220,
        render: (value) => value || "-",
      },
      {
        title: "Jumlah Siswa",
        dataIndex: "student_count",
        width: 130,
      },
      {
        title: "Status",
        dataIndex: "is_active",
        width: 110,
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
            <Button type="text" icon={<Pencil size={16} />} onClick={() => openEdit(record)} />
            <Popconfirm
              title="Hapus halaqoh ini?"
              okText="Hapus"
              cancelText="Batal"
              onConfirm={() => handleDelete(record.id)}
            >
              <Button type="text" danger icon={<Trash2 size={16} />} loading={deleting} />
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
          <BookUser size={18} />
          <span>Manajemen Halaqoh</span>
        </Space>
      }
      extra={
        <Space wrap>
          <Select
            value={selectedHomebaseId}
            onChange={(value) => {
              setHomebaseId(value);
              setPeriodeId(undefined);
            }}
            options={homebaseOptions}
            disabled={isScopedHomebaseUser}
            placeholder="Pilih Homebase"
            style={{ width: 220 }}
          />
          <Select
            value={periodeId}
            onChange={setPeriodeId}
            options={periodeOptions}
            allowClear
            placeholder="Filter Periode"
            style={{ width: 220 }}
          />
          <Button type="primary" icon={<Plus size={16} />} onClick={openCreate}>
            Tambah Halaqoh
          </Button>
        </Space>
      }
    >
      {halaqohQuery.error ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="Gagal memuat data halaqoh."
          description={halaqohQuery.error?.data?.message || "Silakan coba lagi."}
        />
      ) : null}

      <Table
        rowKey="id"
        loading={halaqohQuery.isFetching || optionsQuery.isFetching}
        columns={columns}
        dataSource={halaqohQuery.data || []}
        pagination={{ pageSize: 10, showSizeChanger: false }}
        expandable={{
          expandedRowRender: (record) => (
            <Space direction="vertical" size={4}>
              <Text type="secondary">Musyrif: {record.musyrif_name || "-"}</Text>
              <Space wrap>
                {(record.students || []).length ? (
                  record.students.map((student) => (
                    <Tag key={student.id} icon={<Users size={12} />}>
                      {student.full_name} ({student.nis || "-"})
                    </Tag>
                  ))
                ) : (
                  <Text type="secondary">Belum ada siswa di halaqoh ini.</Text>
                )}
              </Space>
            </Space>
          ),
        }}
        scroll={{ x: 1000 }}
      />

      <Drawer
        title={editingData ? "Edit Halaqoh" : "Tambah Halaqoh"}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnClose
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Periode"
            name="periode_id"
            rules={[{ required: true, message: "Periode wajib dipilih." }]}
          >
            <Select options={periodeOptions} placeholder="Pilih periode" />
          </Form.Item>

          <Form.Item
            label="Nama Halaqoh"
            name="name"
            rules={[{ required: true, message: "Nama halaqoh wajib diisi." }]}
          >
            <Input placeholder="Contoh: Halaqoh Al-Fatih" />
          </Form.Item>

          <Form.Item
            label="Musyrif"
            name="musyrif_id"
            rules={[{ required: true, message: "Musyrif wajib dipilih." }]}
          >
            <Select
              showSearch
              optionFilterProp="label"
              options={musyrifOptions}
              placeholder="Pilih musyrif"
            />
          </Form.Item>

          <Form.Item label="Anggota Siswa" name="student_ids">
            <Select
              mode="multiple"
              showSearch
              optionFilterProp="label"
              options={studentOptions}
              placeholder="Pilih siswa untuk halaqoh"
              maxTagCount="responsive"
            />
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
        Total Halaqoh: {halaqohQuery.data?.length || 0}
      </Title>
    </Card>
  );
};

export default Halaqoh;
