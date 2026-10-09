import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Flex,
  Form,
  Grid,
  Input,
  Modal,
  Popconfirm,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import { CheckCircle2, Copy, FolderOpen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import {
  SCHEDULE_CARD_HEADER_STYLE,
  SCHEDULE_CARD_STYLE,
  SCHEDULE_TAG_STYLE,
  getScheduleCardBody,
  getScheduleModalWidth,
} from './scheduleAdminStyles';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const PAGE_SIZE_OPTIONS = ['10', '20', '50'];

const ScheduleMasterList = ({
  canManage,
  scheduleConfigs,
  configStats,
  activeConfigId,
  loading,
  activatingConfig,
  duplicatingConfig,
  onOpenConfig,
  onSaveConfig,
  onActivateConfig,
  onDuplicateConfig,
  onDeleteConfig,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isNarrow = !screens.sm;
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState(null);
  const [duplicateSource, setDuplicateSource] = useState(null);
  const [searchName, setSearchName] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10 });
  const [configForm] = Form.useForm();
  const [duplicateForm] = Form.useForm();

  const configs = (scheduleConfigs || []).filter((item) => item && item.id != null);

  const filteredConfigs = useMemo(() => {
    const keyword = searchName.trim().toLowerCase();
    if (!keyword) return configs;
    return configs.filter((item) =>
      String(item.name || '')
        .toLowerCase()
        .includes(keyword),
    );
  }, [configs, searchName]);

  const statsByConfigId = (configStats || []).reduce((acc, item) => {
    if (!item || item.config_id == null) return acc;
    acc[Number(item.config_id)] = item;
    return acc;
  }, {});

  useEffect(() => {
    if (!configModalOpen) {
      setEditingConfig(null);
      configForm.resetFields();
    }
  }, [configForm, configModalOpen]);

  const openCreateConfig = () => {
    setEditingConfig(null);
    configForm.setFieldsValue({ name: '', description: '' });
    setConfigModalOpen(true);
  };

  const openEditConfig = (record) => {
    setEditingConfig(record);
    configForm.setFieldsValue({
      name: record.name,
      description: record.description || '',
    });
    setConfigModalOpen(true);
  };

  const handleSaveConfigMeta = async () => {
    const values = await configForm.validateFields();
    const success = await onSaveConfig({
      id: editingConfig?.id,
      name: values.name,
      description: values.description || null,
      is_active: editingConfig ? editingConfig.is_active === true : configs.length === 0,
    });
    if (success) {
      setConfigModalOpen(false);
    }
  };

  const openDuplicate = (record) => {
    if (!record?.id) return;
    setDuplicateSource(record);
    duplicateForm.setFieldsValue({
      name: `${record.name || 'Versi Jadwal'} (Salinan)`,
    });
  };

  const handleDuplicate = async () => {
    if (!duplicateSource?.id) return;
    const values = await duplicateForm.validateFields();
    const success = await onDuplicateConfig(Number(duplicateSource.id), values.name);
    if (success) {
      setDuplicateSource(null);
      duplicateForm.resetFields();
    }
  };

  const columns = [
    {
      title: 'Versi Jadwal',
      dataIndex: 'name',
      key: 'name',
      render: (value, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{value}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.description || 'Belum ada deskripsi'}
          </Text>
        </Space>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      width: 110,
      render: (_, record) =>
        record.is_active === true ? (
          <Tag color="green" style={SCHEDULE_TAG_STYLE}>
            Aktif
          </Tag>
        ) : (
          <Tag style={SCHEDULE_TAG_STYLE}>Draft</Tag>
        ),
    },
    {
      title: 'Shift',
      key: 'group_count',
      width: 90,
      render: (_, record) => (
        <Tag color="cyan" style={SCHEDULE_TAG_STYLE}>
          {Number(statsByConfigId[Number(record?.id)]?.group_count || 0)} shift
        </Tag>
      ),
    },
    {
      title: 'Entri Final',
      key: 'entry_count',
      width: 110,
      render: (_, record) => (
        <Tag color="gold" style={SCHEDULE_TAG_STYLE}>
          {Number(statsByConfigId[Number(record?.id)]?.entry_count || 0)} entri
        </Tag>
      ),
    },
    {
      title: 'Aksi',
      key: 'action',
      width: isMobile ? 200 : 280,
      render: (_, record) => {
        if (!record?.id) return null;
        return (
          <Space wrap size={4}>
            <Button
              type="primary"
              size="small"
              icon={<FolderOpen size={14} />}
              onClick={() => onOpenConfig(Number(record.id))}>
              Buka
            </Button>
            {canManage ? (
              <>
                <Tooltip title="Duplikat versi ini beserta shift, struktur waktu, kegiatan, dan jadwal final">
                  <Button
                    size="small"
                    icon={<Copy size={14} />}
                    loading={duplicatingConfig && Number(duplicateSource?.id) === Number(record.id)}
                    onClick={() => openDuplicate(record)}>
                    Duplikat
                  </Button>
                </Tooltip>
                {record.is_active !== true ? (
                  <Popconfirm
                    title="Aktifkan versi jadwal ini?"
                    description="Versi ini akan menjadi jadwal operasional (dipakai absensi RFID). Versi aktif sebelumnya berubah menjadi draft."
                    onConfirm={() => onActivateConfig(Number(record.id))}
                    okText="Aktifkan"
                    cancelText="Batal">
                    <Button size="small" icon={<CheckCircle2 size={14} />} loading={activatingConfig}>
                      Aktifkan
                    </Button>
                  </Popconfirm>
                ) : null}
                <Button size="small" icon={<Pencil size={14} />} onClick={() => openEditConfig(record)} />
                <Popconfirm
                  title="Hapus versi jadwal ini?"
                  description="Versi yang aktif atau masih memiliki kegiatan/jadwal final tidak bisa dihapus."
                  onConfirm={() => onDeleteConfig(Number(record.id))}
                  okText="Hapus"
                  cancelText="Batal"
                  disabled={record.is_active === true}>
                  <Button size="small" danger icon={<Trash2 size={14} />} disabled={record.is_active === true} />
                </Popconfirm>
              </>
            ) : null}
          </Space>
        );
      },
    },
  ];

  return (
    <>
      <Card
        style={SCHEDULE_CARD_STYLE}
        styles={{
          header: SCHEDULE_CARD_HEADER_STYLE,
          body: getScheduleCardBody(isMobile),
        }}
        title="Versi Jadwal"
        extra={
          canManage ? (
            <Button
              type="primary"
              icon={<Plus size={14} />}
              onClick={openCreateConfig}
              block={isNarrow}
              style={isNarrow ? { width: '100%' } : undefined}>
              {isNarrow ? 'Tambah' : 'Tambah Versi'}
            </Button>
          ) : null
        }>
        <Flex vertical gap={12} style={{ width: '100%', minWidth: 0 }}>
          {configs.length > 0 ? (
            <>
              <Input
                allowClear
                value={searchName}
                onChange={(event) => {
                  setSearchName(event.target.value);
                  setPagination((prev) => ({ ...prev, current: 1 }));
                }}
                placeholder="Cari versi jadwal berdasarkan nama"
                prefix={<Search size={14} style={{ color: '#94a3b8' }} />}
                style={{ maxWidth: isMobile ? '100%' : 360 }}
              />

              <div style={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                <Table
                  rowKey={(record) => String(record.id)}
                  size="small"
                  columns={columns}
                  dataSource={filteredConfigs}
                  pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: filteredConfigs.length,
                    showSizeChanger: true,
                    pageSizeOptions: PAGE_SIZE_OPTIONS,
                    showTotal: (total, range) =>
                      `${range[0]}-${range[1]} dari ${total} versi`,
                    onChange: (page, pageSize) =>
                      setPagination({ current: page, pageSize }),
                  }}
                  scroll={{ x: isMobile ? 720 : 640 }}
                  locale={{
                    emptyText: searchName.trim()
                      ? `Tidak ada versi jadwal dengan nama "${searchName.trim()}".`
                      : 'Belum ada versi jadwal.',
                  }}
                  onRow={(record) => ({
                    style: {
                      background:
                        Number(record?.id) === Number(activeConfigId)
                          ? 'rgba(82, 196, 26, 0.05)'
                          : undefined,
                    },
                  })}
                />
              </div>
            </>
          ) : (
            <Alert
              showIcon
              type="warning"
              message="Belum ada versi jadwal"
              description="Buat versi jadwal pertama untuk mulai menyusun shift, struktur waktu, kegiatan, dan jadwal final."
              action={
                canManage ? (
                  <Button size="small" type="primary" icon={<Plus size={14} />} onClick={openCreateConfig}>
                    Tambah Versi
                  </Button>
                ) : null
              }
            />
          )}
        </Flex>
      </Card>

      <Modal
        open={configModalOpen}
        title={editingConfig ? 'Ubah Versi Jadwal' : 'Tambah Versi Jadwal'}
        onCancel={() => setConfigModalOpen(false)}
        onOk={handleSaveConfigMeta}
        okText="Simpan"
        confirmLoading={loading}
        width={getScheduleModalWidth(isMobile, 520)}
        centered
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
        <Form form={configForm} layout="vertical">
          <Form.Item name="name" label="Nama Versi" rules={[{ required: true, message: 'Nama versi wajib diisi.' }]}>
            <Input placeholder="Contoh: Jadwal Reguler" />
          </Form.Item>
          <Form.Item name="description" label="Deskripsi">
            <Input.TextArea rows={3} placeholder="Contoh: Jadwal operasional reguler semester genap." />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={Boolean(duplicateSource?.id)}
        title={`Duplikat "${duplicateSource?.name || ''}"`}
        destroyOnHidden
        onCancel={() => {
          setDuplicateSource(null);
          duplicateForm.resetFields();
        }}
        onOk={handleDuplicate}
        okText="Duplikat"
        confirmLoading={duplicatingConfig}
        width={getScheduleModalWidth(isMobile, 520)}
        centered
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
        <Flex vertical gap={12}>
          <Alert
            showIcon
            type="info"
            message="Seluruh isi versi ini akan disalin"
            description="Shift beserta kelasnya, struktur waktu (hari, jam, istirahat), kegiatan, dan entri jadwal final ikut tersalin. Salinan berstatus draft dan tidak memengaruhi jadwal yang sedang berjalan."
          />
          <Form form={duplicateForm} layout="vertical">
            <Form.Item
              name="name"
              label="Nama Versi Baru"
              rules={[{ required: true, message: 'Nama versi wajib diisi.' }]}>
              <Input placeholder="Contoh: Jadwal Ramadhan" />
            </Form.Item>
          </Form>
        </Flex>
      </Modal>
    </>
  );
};

export default ScheduleMasterList;
