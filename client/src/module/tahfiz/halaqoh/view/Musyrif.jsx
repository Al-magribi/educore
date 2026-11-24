import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Col,
  Drawer,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  List,
  Row,
  Select,
  Switch,
  Table,
  Tag,
  Typography,
  theme,
} from "antd";
import { FileSpreadsheet, ShieldUser, UserRound } from "lucide-react";

import { CardTitle, MuseCard } from "../../../../components/ui/muse";
import { DataListCard, EditDeleteActions } from "../../../../components/ui/muse/DataSection";
import { museRadius } from "../../../../config/theme";
import {
  useCreateMusyrifMutation,
  useDeleteMusyrifMutation,
  useGetHalaqohOptionsQuery,
  useGetMusyrifListQuery,
  useUpdateMusyrifMutation,
} from "../../../../service/tahfiz/ApiHalaqoh";
import MusyrifImportDrawer from "./MusyrifImportDrawer";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const genderLabel = { L: "Laki-laki", P: "Perempuan" };

const Musyrif = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [form] = Form.useForm();
  const [homebaseId, setHomebaseId] = useState();
  const [search, setSearch] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const optionsQuery = useGetHalaqohOptionsQuery({ homebase_id: homebaseId });
  const musyrifQuery = useGetMusyrifListQuery({ homebase_id: homebaseId });

  const [createMusyrif, { isLoading: creating }] = useCreateMusyrifMutation();
  const [updateMusyrif, { isLoading: updating }] = useUpdateMusyrifMutation();
  const [deleteMusyrif, { isLoading: deleting }] = useDeleteMusyrifMutation();

  const homebaseOptions = (optionsQuery.data?.homebases || []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

  const isScopedHomebaseUser = homebaseOptions.length === 1;
  const defaultHomebaseId = isScopedHomebaseUser ? homebaseOptions[0]?.value : null;

  const resetForm = () => {
    form.resetFields();
    form.setFieldsValue({
      homebase_id: homebaseId ?? defaultHomebaseId ?? null,
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
        username: record.username,
        password: "",
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
      username: values.username,
      password: values.password || undefined,
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

  const musyrifList = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = musyrifQuery.data || [];
    if (!keyword) return rows;
    return rows.filter((item) =>
      [item.full_name, item.username, item.phone, item.homebase_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [musyrifQuery.data, search]);

  const renderStatus = (value) => (
    <Tag color={value ? "success" : "default"} style={{ marginInlineEnd: 0 }}>
      {value ? "Aktif" : "Nonaktif"}
    </Tag>
  );

  const renderActions = (record) => (
    <EditDeleteActions
      onEdit={() => openEdit(record)}
      onDelete={() => handleDelete(record.id)}
      deleteTitle={`Hapus musyrif ${record.full_name}?`}
      deleteDescription='Akun login musyrif ini juga tidak bisa dipakai lagi.'
      deleting={deleting}
    />
  );

  const columns = [
    {
      title: "NAMA MUSYRIF",
      dataIndex: "full_name",
      render: (value, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {value}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.username ? `@${record.username}` : "Belum punya akun"}
          </Text>
        </div>
      ),
    },
    {
      title: "HOMEBASE",
      dataIndex: "homebase_name",
      render: (value) => value || "-",
    },
    {
      title: "KONTAK",
      dataIndex: "phone",
      render: (value) => value || "-",
    },
    {
      title: "L/P",
      dataIndex: "gender",
      width: 120,
      render: (value) => genderLabel[value] || "-",
    },
    {
      title: "HALAQOH",
      dataIndex: "halaqoh_count",
      width: 120,
      align: "right",
      render: (value) => value || 0,
    },
    {
      title: "STATUS",
      dataIndex: "is_active",
      width: 120,
      render: renderStatus,
    },
    {
      title: "AKSI",
      key: "action",
      width: 110,
      align: "right",
      render: (_, record) => <Flex justify='flex-end'>{renderActions(record)}</Flex>,
    },
  ];

  const isListLoading = musyrifQuery.isFetching || optionsQuery.isFetching;
  const emptyNode = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        search
          ? "Tidak ada musyrif yang cocok dengan pencarian."
          : "Belum ada musyrif. Tambahkan musyrif atau impor dari Excel."
      }
    />
  );

  return (
    <>
      <DataListCard
        title='Master Musyrif'
        icon={<ShieldUser size={18} />}
        count={musyrifList.length}
        unit='musyrif'
        searchProps={{
          placeholder: "Cari nama / username",
          onChange: (event) => setSearch(event.target.value),
        }}
        extra={
          <>
            <Select
              aria-label='Filter homebase'
              value={homebaseId}
              onChange={setHomebaseId}
              options={homebaseOptions}
              disabled={isScopedHomebaseUser}
              allowClear
              placeholder='Semua homebase'
              style={{ width: isMobile ? "100%" : 200 }}
            />
            <Button icon={<FileSpreadsheet size={16} />} onClick={() => setImportOpen(true)}>
              Import Excel
            </Button>
          </>
        }
        onAdd={openCreate}
        addLabel='Tambah Musyrif'
      >
        {musyrifQuery.error ? (
          <div style={{ padding: 16 }}>
            <Alert
              type='error'
              showIcon
              title='Gagal memuat data musyrif'
              description={musyrifQuery.error?.data?.message || "Silakan coba lagi."}
            />
          </div>
        ) : null}

        {isMobile ? (
          <List
            loading={isListLoading}
            dataSource={musyrifList}
            locale={{ emptyText: emptyNode }}
            pagination={
              musyrifList.length > 10 ? { pageSize: 10, size: "small", align: "center" } : false
            }
            style={{ padding: 12 }}
            renderItem={(record) => (
              <div
                style={{
                  border: `1px solid ${token.colorBorderSecondary}`,
                  borderRadius: museRadius.item,
                  padding: 12,
                  marginBottom: 12,
                }}
              >
                <Flex justify='space-between' align='flex-start' gap={8}>
                  <div style={{ minWidth: 0 }}>
                    <Text strong style={{ display: "block" }}>
                      {record.full_name}
                    </Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {record.homebase_name || "-"} · {record.phone || "Tanpa kontak"}
                    </Text>
                  </div>
                  <Flex gap={4}>{renderActions(record)}</Flex>
                </Flex>
                <Flex gap={6} wrap style={{ marginTop: 8 }}>
                  {renderStatus(record.is_active)}
                  <Tag style={{ marginInlineEnd: 0 }}>{record.halaqoh_count || 0} halaqoh</Tag>
                </Flex>
              </div>
            )}
          />
        ) : (
          <Table
            rowKey='id'
            loading={isListLoading}
            columns={columns}
            dataSource={musyrifList}
            pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
            locale={{ emptyText: emptyNode }}
            scroll={{ x: true }}
          />
        )}
      </DataListCard>

      <Drawer
        title={
          <CardTitle
            icon={<UserRound size={18} />}
            title={editingData ? "Edit Musyrif" : "Tambah Musyrif"}
            description='Kelola profil musyrif, akun login, dan status keaktifan.'
          />
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        width={isMobile ? "100%" : 560}
        styles={{ body: { background: token.colorBgLayout, padding: isMobile ? 16 : 24 } }}
        footer={
          <Flex justify='flex-end' gap={8}>
            <Button onClick={() => setDrawerOpen(false)}>Batal</Button>
            <Button type='primary' onClick={form.submit} loading={creating || updating}>
              Simpan
            </Button>
          </Flex>
        }
      >
        <Form form={form} layout='vertical' onFinish={handleSubmit}>
          <Flex vertical gap={16}>
            <MuseCard title={<CardTitle title='Profil' />}>
              <Form.Item
                label='Homebase'
                name='homebase_id'
                rules={[{ required: true, message: "Homebase wajib dipilih." }]}
              >
                <Select
                  options={homebaseOptions}
                  disabled={isScopedHomebaseUser}
                  placeholder='Pilih homebase'
                />
              </Form.Item>

              <Form.Item
                label='Nama Musyrif'
                name='full_name'
                rules={[{ required: true, message: "Nama musyrif wajib diisi." }]}
              >
                <Input placeholder='Nama lengkap musyrif' />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} md={12}>
                  <Form.Item label='Nomor HP' name='phone'>
                    <Input placeholder='08xxxxxxxxxx' inputMode='tel' />
                  </Form.Item>
                </Col>
                <Col xs={24} md={12}>
                  <Form.Item label='Jenis Kelamin' name='gender'>
                    <Select
                      allowClear
                      options={[
                        { value: "L", label: "Laki-laki" },
                        { value: "P", label: "Perempuan" },
                      ]}
                      placeholder='Pilih jenis kelamin'
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label='Catatan' name='notes'>
                <Input.TextArea rows={3} placeholder='Catatan tambahan (opsional)' />
              </Form.Item>

              <Form.Item
                label='Status Aktif'
                name='is_active'
                valuePropName='checked'
                style={{ marginBottom: 0 }}
              >
                <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
              </Form.Item>
            </MuseCard>

            <MuseCard title={<CardTitle title='Akun Login' />}>
              <Form.Item
                label='Username'
                name='username'
                rules={[
                  { required: true, message: "Username wajib diisi." },
                  {
                    pattern: /^[a-zA-Z0-9._-]+$/,
                    message: "Username hanya boleh huruf, angka, titik, underscore, atau dash.",
                  },
                ]}
              >
                <Input placeholder='username.musyrif' autoComplete='off' />
              </Form.Item>

              <Form.Item
                label='Password'
                name='password'
                style={{ marginBottom: 0 }}
                rules={
                  editingData?.user_id
                    ? [{ min: 6, message: "Minimal 6 karakter jika mengubah password." }]
                    : [
                        { required: true, message: "Password wajib diisi." },
                        { min: 6, message: "Password minimal 6 karakter." },
                      ]
                }
                extra={
                  editingData?.user_id
                    ? "Kosongkan jika password tidak ingin diubah."
                    : "Wajib diisi untuk membuat akun login musyrif."
                }
              >
                <Input.Password
                  placeholder={
                    editingData?.user_id ? "Biarkan kosong jika tidak diubah" : "Minimal 6 karakter"
                  }
                  autoComplete='new-password'
                />
              </Form.Item>
            </MuseCard>
          </Flex>
        </Form>
      </Drawer>

      <MusyrifImportDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        homebaseOptions={homebaseOptions}
        selectedHomebaseId={homebaseId ?? defaultHomebaseId}
      />
    </>
  );
};

export default Musyrif;
