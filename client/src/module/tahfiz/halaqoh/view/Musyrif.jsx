import React, { useCallback, useMemo, useState } from "react";
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
  Flex,
  Grid,
} from "antd";
import { motion } from "framer-motion";
import { Pencil, Plus, Trash2, UserRound, X, ShieldUser } from "lucide-react";
import {
  useCreateMusyrifMutation,
  useDeleteMusyrifMutation,
  useGetHalaqohOptionsQuery,
  useGetMusyrifListQuery,
  useUpdateMusyrifMutation,
} from "../../../../service/tahfiz/ApiHalaqoh";

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const Musyrif = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [form] = Form.useForm();
  const [homebaseId, setHomebaseId] = useState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const optionsQuery = useGetHalaqohOptionsQuery({ homebase_id: homebaseId });
  const selectedHomebaseId =
    homebaseId ?? optionsQuery.data?.selected_homebase_id;

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

  const openEdit = useCallback(
    (record) => {
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
    },
    [form],
  );

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

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteMusyrif(id).unwrap();
        message.success("Musyrif berhasil dihapus.");
      } catch (error) {
        message.error(error?.data?.message || "Gagal menghapus musyrif.");
      }
    },
    [deleteMusyrif],
  );

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
        title: "L/P",
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
          <Tag color={value ? "green" : "red"}>
            {value ? "Aktif" : "Nonaktif"}
          </Tag>
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
              type='text'
            />
            <Popconfirm
              title='Hapus musyrif ini?'
              okText='Hapus'
              cancelText='Batal'
              onConfirm={() => handleDelete(record.id)}
            >
              <Button
                icon={<Trash2 size={16} />}
                danger
                type='text'
                loading={deleting}
              />
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [deleting, handleDelete, openEdit],
  );

  return (
    <>
      <Card
        style={{
          borderRadius: 22,
          border: "1px solid #e2e8f0",
          boxShadow: "0 12px 30px rgba(15, 23, 42, 0.06)",
        }}
        styles={{ body: { padding: isMobile ? 14 : 18 } }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          gap={10}
          style={{ marginBottom: 14 }}
        >
          <Space>
            <ShieldUser size={18} color='#1d4ed8' />
            <Text strong>Master Musyrif</Text>
          </Space>

          <Space>
            <Select
              value={selectedHomebaseId}
              onChange={setHomebaseId}
              options={homebaseOptions}
              disabled={isScopedHomebaseUser}
              placeholder='Pilih Homebase'
              style={{ width: 220 }}
            />
            <Button
              type='primary'
              icon={<Plus size={16} />}
              onClick={openCreate}
            >
              Tambah Musyrif
            </Button>
          </Space>
        </Flex>

        {musyrifQuery.error ? (
          <Alert
            type='error'
            showIcon
            style={{ marginBottom: 16 }}
            message='Gagal memuat data musyrif.'
            description={
              musyrifQuery.error?.data?.message || "Silakan coba lagi."
            }
          />
        ) : null}

        <Table
          rowKey='id'
          loading={musyrifQuery.isFetching || optionsQuery.isFetching}
          columns={columns}
          dataSource={musyrifQuery.data || []}
          pagination={{ pageSize: 10, showSizeChanger: false }}
          scroll={{ x: 900 }}
        />

        <Title level={5} style={{ marginTop: 20, marginBottom: 0 }}>
          Total Musyrif: {musyrifQuery.data?.length || 0}
        </Title>
      </Card>

      <Drawer
        title={null}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        width={isMobile ? "100%" : 560}
        closable={false}
        styles={{
          body: { padding: 0, background: "#f8fafc" },
          header: { display: "none" },
        }}
      >
        <MotionDiv
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
          <div
            style={{
              padding: isMobile ? 18 : 22,
              background:
                "linear-gradient(135deg, rgba(239,246,255,1), rgba(224,242,254,0.98))",
              borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
            }}
          >
            <Flex justify='space-between' align='flex-start' gap={12}>
              <Flex align='flex-start' gap={12}>
                <div
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: 16,
                    display: "grid",
                    placeItems: "center",
                    color: "#fff",
                    background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)",
                    boxShadow: "0 14px 28px rgba(29, 78, 216, 0.28)",
                  }}
                >
                  <UserRound size={22} />
                </div>
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    {editingData ? "Edit Musyrif" : "Tambah Musyrif"}
                  </Title>
                  <Text type='secondary'>
                    Kelola profil musyrif dan status keaktifan.
                  </Text>
                </div>
              </Flex>
              <Button
                onClick={() => setDrawerOpen(false)}
                icon={<X size={16} />}
              >
                Tutup
              </Button>
            </Flex>
          </div>

          <div
            style={{ padding: isMobile ? 14 : 18, overflow: "auto", flex: 1 }}
          >
            <Card bordered={false} style={{ borderRadius: 20 }}>
              <Form form={form} layout='vertical' onFinish={handleSubmit}>
                <Form.Item
                  label='Homebase'
                  name='homebase_id'
                  rules={[
                    { required: true, message: "Homebase wajib dipilih." },
                  ]}
                >
                  <Select
                    options={homebaseOptions}
                    disabled={isScopedHomebaseUser}
                  />
                </Form.Item>

                <Form.Item
                  label='Nama Musyrif'
                  name='full_name'
                  rules={[
                    { required: true, message: "Nama musyrif wajib diisi." },
                  ]}
                >
                  <Input placeholder='Nama lengkap musyrif' />
                </Form.Item>

                <Form.Item label='Nomor HP' name='phone'>
                  <Input placeholder='08xxxxxxxxxx' />
                </Form.Item>

                <Form.Item label='L/P' name='gender'>
                  <Select
                    allowClear
                    options={[
                      { value: "L", label: "Laki-laki" },
                      { value: "P", label: "Perempuan" },
                    ]}
                    placeholder='Pilih jenis kelamin'
                  />
                </Form.Item>

                <Form.Item label='Catatan' name='notes'>
                  <Input.TextArea
                    rows={3}
                    placeholder='Catatan tambahan (opsional)'
                  />
                </Form.Item>

                <Form.Item
                  label='Status Aktif'
                  name='is_active'
                  valuePropName='checked'
                >
                  <Switch />
                </Form.Item>

                <Space>
                  <Button onClick={() => setDrawerOpen(false)}>Batal</Button>
                  <Button
                    type='primary'
                    htmlType='submit'
                    loading={creating || updating}
                  >
                    Simpan
                  </Button>
                </Space>
              </Form>
            </Card>
          </div>
        </MotionDiv>
      </Drawer>
    </>
  );
};

export default Musyrif;
