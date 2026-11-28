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
import { BookUser, FileSpreadsheet, Layers3, UserRound, Users } from "lucide-react";

import { CardTitle, MuseCard, PageTabs } from "../../../../components/ui/muse";
import { DataListCard, EditDeleteActions } from "../../../../components/ui/muse/DataSection";
import { museRadius } from "../../../../config/theme";
import {
  useCreateHalaqohMutation,
  useDeleteHalaqohMutation,
  useGetHalaqohListQuery,
  useGetHalaqohOptionsQuery,
  useUpdateHalaqohMutation,
} from "../../../../service/tahfiz/ApiHalaqoh";
import HalaqohImportDrawer from "./HalaqohImportDrawer";
import Musyrif from "./Musyrif";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const HalaqohManager = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const { message } = App.useApp();
  const { token } = theme.useToken();
  const [form] = Form.useForm();
  const [search, setSearch] = useState("");
  const [homebaseId, setHomebaseId] = useState();
  const [periodeId, setPeriodeId] = useState();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editingData, setEditingData] = useState(null);

  const optionsQuery = useGetHalaqohOptionsQuery({ homebase_id: homebaseId });
  const globalOptionsQuery = useGetHalaqohOptionsQuery({ include_all: true });

  const halaqohQuery = useGetHalaqohListQuery({
    homebase_id: homebaseId,
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
    searchTokens: [item.name],
  }));

  const musyrifOptions = (optionsQuery.data?.musyrif || []).map((item) => ({
    value: item.id,
    label: `${item.full_name}${item.is_active ? "" : " (Nonaktif)"}`,
    disabled: !item.is_active,
    searchTokens: [item.full_name, item.username].filter(Boolean),
  }));

  const studentOptions = (optionsQuery.data?.students || []).map((item) => ({
    value: item.id,
    label: `${item.full_name} (${item.nis || "-"}) - ${item.class_name || "-"}`,
    full_name: item.full_name,
    nis: item.nis,
  }));

  const importPeriodeOptions = (globalOptionsQuery.data?.periodes || []).map((item) => ({
    value: item.id,
    label: `${item.name} - ${item.homebase_name || "Tanpa Satuan"}${item.is_active ? " (Aktif)" : ""}`,
    searchTokens: [item.name, item.homebase_name].filter(Boolean),
    homebase_id: item.homebase_id,
    homebase_name: item.homebase_name,
  }));

  const importMusyrifOptions = (globalOptionsQuery.data?.musyrif || []).map((item) => ({
    value: item.id,
    label: `${item.full_name} - ${item.homebase_name || "Tanpa Satuan"}${item.is_active ? "" : " (Nonaktif)"}`,
    disabled: !item.is_active,
    searchTokens: [item.full_name, item.username, item.homebase_name].filter(Boolean),
    homebase_id: item.homebase_id,
    homebase_name: item.homebase_name,
  }));

  const importStudentOptions = (globalOptionsQuery.data?.students || []).map((item) => ({
    value: item.id,
    label: `${item.full_name} (${item.nis || "-"}) - ${item.class_name || "-"} - ${item.homebase_name || "Tanpa Satuan"}`,
    full_name: item.full_name,
    nis: item.nis,
    homebase_id: item.homebase_id,
    homebase_name: item.homebase_name,
    class_name: item.class_name,
  }));

  const importReference = globalOptionsQuery.data?.import_reference || {
    active_periodes: [],
    musyrif: [],
    students: [],
  };

  const isScopedHomebaseUser = homebaseOptions.length === 1;
  const displayedHomebaseId = isScopedHomebaseUser
    ? homebaseOptions[0]?.value
    : homebaseId;

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

  const openEdit = useCallback(
    (record) => {
      setEditingData(record);
      form.setFieldsValue({
        periode_id: record.periode_id,
        name: record.name,
        musyrif_id: record.musyrif_id,
        is_active: record.is_active,
        student_ids: (record.students || []).map((item) => item.id),
      });
      setDrawerOpen(true);
    },
    [form],
  );

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

  const handleDelete = useCallback(
    async (id) => {
      try {
        await deleteHalaqoh(id).unwrap();
        message.success("Halaqoh berhasil dihapus.");
      } catch (error) {
        message.error(error?.data?.message || "Gagal menghapus halaqoh.");
      }
    },
    [deleteHalaqoh, message],
  );


  const halaqohList = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    const rows = halaqohQuery.data || [];
    if (!keyword) return rows;
    return rows.filter((item) =>
      [item.name, item.musyrif_name, item.periode_name]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [halaqohQuery.data, search]);

  const renderStatus = (value) => (
    <Tag color={value ? "success" : "default"} style={{ marginInlineEnd: 0 }}>
      {value ? "Aktif" : "Nonaktif"}
    </Tag>
  );

  const renderActions = (record) => (
    <EditDeleteActions
      onEdit={() => openEdit(record)}
      onDelete={() => handleDelete(record.id)}
      deleteTitle={`Hapus ${record.name}?`}
      deleteDescription='Data halaqoh dan penempatan siswanya akan dihapus.'
      deleting={deleting}
    />
  );

  const renderStudents = (record) => (
    <Flex vertical gap={8}>
      <Text type='secondary'>Musyrif: {record.musyrif_name || "-"}</Text>
      <Flex gap={6} wrap>
        {(record.students || []).length ? (
          record.students.map((student) => (
            <Tag key={student.id} icon={<Users size={12} />} style={{ marginInlineEnd: 0 }}>
              {student.full_name} ({student.nis || "-"})
            </Tag>
          ))
        ) : (
          <Text type='secondary'>Belum ada siswa di halaqoh ini.</Text>
        )}
      </Flex>
    </Flex>
  );

  const columns = [
    {
      title: "NAMA HALAQOH",
      dataIndex: "name",
      render: (value, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {value}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.periode_name || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "MUSYRIF",
      dataIndex: "musyrif_name",
      render: (value) => value || "-",
    },
    {
      title: "JUMLAH SISWA",
      dataIndex: "student_count",
      align: "right",
      width: 150,
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

  const filterControls = (
    <>
      <Select
        aria-label='Pilih homebase'
        value={displayedHomebaseId}
        onChange={(value) => {
          setHomebaseId(value);
          setPeriodeId(undefined);
        }}
        options={homebaseOptions}
        disabled={isScopedHomebaseUser}
        placeholder='Pilih homebase'
        style={{ width: isMobile ? "100%" : 200 }}
      />
      <Select
        aria-label='Filter periode'
        value={periodeId}
        onChange={setPeriodeId}
        options={periodeOptions}
        allowClear
        placeholder='Semua periode'
        style={{ width: isMobile ? "100%" : 200 }}
      />
      <Button icon={<FileSpreadsheet size={16} />} onClick={() => setImportOpen(true)}>
        Import Excel
      </Button>
    </>
  );

  const isListLoading = halaqohQuery.isFetching || optionsQuery.isFetching;
  const emptyNode = (
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        search
          ? "Tidak ada halaqoh yang cocok dengan pencarian."
          : "Belum ada halaqoh. Tambahkan halaqoh atau impor dari Excel."
      }
    />
  );

  return (
    <>
      <DataListCard
        title='Daftar Halaqoh'
        icon={<BookUser size={18} />}
        count={halaqohList.length}
        unit='halaqoh'
        searchProps={{
          placeholder: "Cari halaqoh / musyrif",
          onChange: (event) => setSearch(event.target.value),
        }}
        extra={filterControls}
        onAdd={openCreate}
        addLabel='Tambah Halaqoh'
      >
        {halaqohQuery.error ? (
          <div style={{ padding: 16 }}>
            <Alert
              type='error'
              showIcon
              title='Gagal memuat data halaqoh'
              description={halaqohQuery.error?.data?.message || "Silakan coba lagi."}
            />
          </div>
        ) : null}

        {isMobile ? (
          <List
            loading={isListLoading}
            dataSource={halaqohList}
            locale={{ emptyText: emptyNode }}
            pagination={
              halaqohList.length > 10 ? { pageSize: 10, size: "small", align: "center" } : false
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
                      {record.name}
                    </Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      {record.periode_name || "-"} · {record.student_count || 0} siswa
                    </Text>
                  </div>
                  <Flex gap={4}>{renderActions(record)}</Flex>
                </Flex>
                <Flex gap={6} wrap style={{ marginTop: 8 }}>
                  {renderStatus(record.is_active)}
                  <Tag style={{ marginInlineEnd: 0 }}>
                    {record.musyrif_name || "Tanpa musyrif"}
                  </Tag>
                </Flex>
              </div>
            )}
          />
        ) : (
          <Table
            rowKey='id'
            loading={isListLoading}
            columns={columns}
            dataSource={halaqohList}
            pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
            expandable={{ expandedRowRender: renderStudents }}
            locale={{ emptyText: emptyNode }}
            scroll={{ x: true }}
          />
        )}
      </DataListCard>

      <Drawer
        title={
          <CardTitle
            icon={<Layers3 size={18} />}
            title={editingData ? "Edit Halaqoh" : "Tambah Halaqoh"}
            description='Atur data halaqoh, musyrif, dan anggota siswa.'
          />
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        destroyOnHidden
        width={isMobile ? "100%" : 640}
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
        <MuseCard>
          <Form form={form} layout='vertical' onFinish={handleSubmit}>
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Periode'
                  name='periode_id'
                  rules={[{ required: true, message: "Periode wajib dipilih." }]}
                >
                  <Select options={periodeOptions} placeholder='Pilih periode' />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label='Musyrif'
                  name='musyrif_id'
                  rules={[{ required: true, message: "Musyrif wajib dipilih." }]}
                >
                  <Select
                    showSearch
                    optionFilterProp='label'
                    options={musyrifOptions}
                    placeholder='Pilih musyrif'
                  />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label='Nama Halaqoh'
              name='name'
              rules={[{ required: true, message: "Nama halaqoh wajib diisi." }]}
            >
              <Input placeholder='Contoh: Halaqoh Al-Fatih' />
            </Form.Item>

            <Form.Item label='Anggota Siswa' name='student_ids'>
              <Select
                mode='multiple'
                showSearch
                optionFilterProp='label'
                virtual={false}
                options={studentOptions}
                placeholder='Pilih siswa untuk halaqoh'
                maxTagCount='responsive'
              />
            </Form.Item>

            <Form.Item
              label='Status Aktif'
              name='is_active'
              valuePropName='checked'
              style={{ marginBottom: 0 }}
            >
              <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
            </Form.Item>
          </Form>
        </MuseCard>
      </Drawer>

      <HalaqohImportDrawer
        open={importOpen}
        onClose={() => setImportOpen(false)}
        periodeOptions={importPeriodeOptions}
        musyrifOptions={importMusyrifOptions}
        studentOptions={importStudentOptions}
        selectedPeriodeId={undefined}
        importReference={importReference}
      />
    </>
  );
};

const Halaqoh = () => (
  <PageTabs
    title='Manajemen Halaqoh'
    description='Kelola musyrif, kelompok halaqoh, dan penempatan siswa.'
    items={[
      {
        key: "musyrif",
        label: "Musyrif",
        icon: <UserRound />,
        render: () => <Musyrif />,
      },
      {
        key: "halaqoh",
        label: "Halaqoh",
        icon: <BookUser />,
        render: () => <HalaqohManager />,
      },
    ]}
  />
);

export default Halaqoh;
