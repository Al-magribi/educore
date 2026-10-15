import { useMemo, useState } from 'react';
import { Button, Card, Flex, Form, Input, Modal, Select, Space, Switch, Tag, Tooltip, Typography, message } from 'antd';
import { motion } from 'framer-motion';
import { Copy, KeyRound, Pencil, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import {
  useBulkDeleteRfidDevicesMutation,
  useGetAttendancePoliciesQuery,
  useGetRfidDevicesQuery,
  useRotateRfidDeviceTokenMutation,
  useSaveRfidDeviceMutation,
} from '../../../../../service/lms/ApiAttendance';
import { innerCardStyle, itemVariants } from '../configShared';
import { CardGridView, ReportMetricGrid, ReportRecordCard } from '../../report/reportMobile';

const { Text } = Typography;

const MotionDiv = motion.div;

const PAGE_SIZE_OPTIONS = ['9', '18', '36', '60'];

const DEVICE_TYPE_META = {
  gate: { color: 'cyan', label: 'Gerbang' },
  classroom: { color: 'purple', label: 'Kelas' },
  extracurricular: { color: 'magenta', label: 'Ekstrakurikuler' },
};

const copyText = async (value, successMessage = 'Disalin ke clipboard.') => {
  const text = String(value || '').trim();
  if (!text) {
    message.warning('Tidak ada nilai untuk disalin.');
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
    message.success(successMessage);
  } catch {
    message.error('Gagal menyalin ke clipboard.');
  }
};

const DeviceApiTokenCell = ({ token }) => {
  if (!token) return <Text type="secondary">-</Text>;

  return (
    <Space.Compact style={{ width: '100%', minWidth: 0 }}>
      <Input.Password
        readOnly
        value={token}
        visibilityToggle
        style={{ fontFamily: 'monospace', fontSize: 12, minWidth: 0 }}
      />
      <Button
        icon={<Copy size={14} />}
        onClick={() => copyText(token, 'API Token disalin.')}
        title="Salin API Token"
      />
    </Space.Compact>
  );
};

const DeviceCard = ({ record, selection, onAction }) => {
  const typeMeta = DEVICE_TYPE_META[record.device_type] || {
    color: 'default',
    label: record.device_type || '-',
  };
  const scopeItem =
    record.device_type === 'classroom'
      ? { key: 'scope', label: 'Kelas', value: record.class_name || '-' }
      : record.device_type === 'extracurricular'
        ? { key: 'scope', label: 'Policy', value: record.policy_name || '-' }
        : { key: 'scope', label: 'Pengguna', value: 'Siswa, guru & tendik' };

  return (
    <ReportRecordCard
      {...selection}
      title={record.name}
      subtitle={
        <Text code style={{ fontSize: 12, margin: 0 }}>
          {record.code || '-'}
        </Text>
      }
      extra={
        <Tag color={record.is_active ? 'success' : 'default'} style={{ marginInlineEnd: 0 }}>
          {record.is_active ? 'Aktif' : 'Nonaktif'}
        </Tag>
      }>
      <Flex gap={6} wrap="wrap">
        <Tag color={typeMeta.color} style={{ marginInlineEnd: 0 }}>
          {typeMeta.label}
        </Tag>
      </Flex>
      <ReportMetricGrid
        items={[scopeItem, { key: 'location', label: 'Lokasi', value: record.location_group || '-' }]}
      />
      <DeviceApiTokenCell token={record.api_token} />
      <Flex gap={8} justify="flex-end" wrap="wrap">
        <Button size="small" icon={<Pencil size={13} />} onClick={() => onAction('edit', record)}>
          Edit
        </Button>
        <Tooltip title="Lihat token">
          <Button size="small" icon={<KeyRound size={13} />} onClick={() => onAction('view_token', record)} />
        </Tooltip>
        <Tooltip title="Rotasi token">
          <Button size="small" icon={<RefreshCw size={13} />} onClick={() => onAction('rotate_token', record)} />
        </Tooltip>
      </Flex>
    </ReportRecordCard>
  );
};

const DeviceSettingsTab = ({
  fallbackDevices = [],
  classRows = [],
  loadingFallback = false,
}) => {
  const [deviceForm] = Form.useForm();
  const deviceType = Form.useWatch('device_type', deviceForm);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [tokenModal, setTokenModal] = useState({ open: false, record: null });
  const [nameFilter, setNameFilter] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 9 });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { data: devicesRes, isFetching: fetchingDevices } = useGetRfidDevicesQuery();
  const { data: policiesRes } = useGetAttendancePoliciesQuery();
  const [saveRfidDevice, { isLoading: savingDevice }] = useSaveRfidDeviceMutation();
  const [rotateDeviceToken, { isLoading: rotatingToken }] = useRotateRfidDeviceTokenMutation();
  const [bulkDeleteRfidDevices, { isLoading: bulkDeleting }] = useBulkDeleteRfidDevicesMutation();

  const deviceRows = devicesRes?.data || fallbackDevices;
  const activityPolicyOptions = useMemo(() => {
    const rows = policiesRes?.data || [];
    return rows
      .filter((item) => item.policy_type === 'activity_fixed' && item.is_active !== false)
      .map((item) => ({
        value: Number(item.id),
        label: `${item.name} (${item.code})`,
      }));
  }, [policiesRes]);
  const filteredDeviceRows = useMemo(() => {
    const keyword = nameFilter.trim().toLowerCase();
    if (!keyword) return deviceRows;
    return deviceRows.filter((item) =>
      String(item.name || '')
        .toLowerCase()
        .includes(keyword),
    );
  }, [deviceRows, nameFilter]);
  const classOptions = (Array.isArray(classRows) ? classRows : []).map((item) => ({
    label: item.name,
    value: Number(item.id),
  }));

  const openCreateDeviceModal = () => {
    setEditingDevice(null);
    deviceForm.setFieldsValue({
      code: '',
      name: '',
      device_type: 'gate',
      class_ids: [],
      policy_ids: [],
      location_group: '',
      location_detail: '',
      ip_address: '',
      mac_address: '',
      firmware_version: '',
      api_token: '',
      is_active: true,
    });
    setDeviceModalOpen(true);
  };

  const openEditDeviceModal = (record) => {
    setEditingDevice(record);
    const classIds = Array.isArray(record.class_ids)
      ? record.class_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : record.class_id
        ? [Number(record.class_id)]
        : [];
    const policyIds = Array.isArray(record.policy_ids)
      ? record.policy_ids.map((id) => Number(id)).filter((id) => Number.isFinite(id))
      : record.policy_id
        ? [Number(record.policy_id)]
        : [];
    deviceForm.setFieldsValue({
      id: record.id,
      code: record.code,
      name: record.name,
      device_type: record.device_type,
      class_ids: classIds,
      policy_ids: policyIds,
      location_group: record.location_group || '',
      location_detail: record.location_detail || '',
      ip_address: record.ip_address || '',
      mac_address: record.mac_address || '',
      firmware_version: record.firmware_version || '',
      api_token: record.api_token || '',
      is_active: record.is_active === true,
    });
    setDeviceModalOpen(true);
  };

  const handleSaveDevice = async () => {
    try {
      const values = await deviceForm.validateFields();
      const payload = {
        ...values,
        class_ids: values.device_type === 'classroom' ? values.class_ids || [] : [],
        class_id:
          values.device_type === 'classroom' && Array.isArray(values.class_ids) && values.class_ids.length
            ? values.class_ids[0]
            : null,
        policy_ids:
          values.device_type === 'extracurricular' ? values.policy_ids || [] : [],
        policy_id:
          values.device_type === 'extracurricular' &&
          Array.isArray(values.policy_ids) &&
          values.policy_ids.length
            ? values.policy_ids[0]
            : null,
        api_token: editingDevice ? undefined : values.api_token || undefined,
      };
      await saveRfidDevice(payload).unwrap();
      setDeviceModalOpen(false);
      setEditingDevice(null);
      message.success('Device RFID berhasil disimpan.');
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.data?.message || 'Gagal menyimpan device RFID.');
    }
  };

  const handleRowAction = (action, record) => {
    if (action === 'edit') {
      openEditDeviceModal(record);
      return;
    }

    if (action === 'view_token') {
      setTokenModal({ open: true, record });
      return;
    }

    if (action === 'rotate_token') {
      handleRotateToken(record);
    }
  };

  const handleRotateToken = async (record) => {
    Modal.confirm({
      title: `Rotasi token device ${record.name}?`,
      content:
        'Token lama akan diganti. Firmware device harus diupdate dengan token baru agar scan tetap diterima.',
      okText: 'Rotasi',
      cancelText: 'Batal',
      okButtonProps: { loading: rotatingToken },
      onOk: async () => {
        try {
          const response = await rotateDeviceToken(record.id).unwrap();
          const token = response?.data?.api_token;
          setTokenModal({
            open: true,
            record: { ...record, api_token: token },
          });
          message.success('Token device berhasil dirotasi.');
        } catch (error) {
          message.error(error?.data?.message || 'Gagal merotasi token device.');
          throw error;
        }
      },
    });
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: `Hapus ${selectedRowKeys.length} device RFID terpilih?`,
      content:
        'Device yang dipilih akan dihapus permanen. Log scan terkait tetap tersimpan, namun referensi device akan dikosongkan.',
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      okButtonProps: { loading: bulkDeleting },
      onOk: async () => {
        try {
          const result = await bulkDeleteRfidDevices(selectedRowKeys).unwrap();
          message.success(result?.message || 'Device terpilih berhasil dihapus.');
          setSelectedRowKeys([]);
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus device terpilih.');
          throw error;
        }
      },
    });
  };

  return (
    <>
      <Card
        title="Manajemen Device RFID"
        style={innerCardStyle}
        extra={
          <Button type="primary" icon={<Plus size={14} />} onClick={openCreateDeviceModal}>
            Tambah Device
          </Button>
        }>
        <MotionDiv variants={itemVariants} initial="hidden" animate="show">
          <Flex gap={12} wrap="wrap" justify="space-between" align="center" style={{ marginBottom: 16 }}>
            <Input
              allowClear
              value={nameFilter}
              onChange={(event) => {
                setNameFilter(event.target.value);
                setPagination((prev) => ({ ...prev, current: 1 }));
              }}
              prefix={<Search size={16} />}
              placeholder="Filter nama device"
              style={{ width: 280, maxWidth: '100%' }}
            />
            {selectedRowKeys.length > 0 && (
              <Button danger icon={<Trash2 size={16} />} loading={bulkDeleting} onClick={handleBulkDelete}>
                Hapus {selectedRowKeys.length} terpilih
              </Button>
            )}
          </Flex>
          <CardGridView
            loading={fetchingDevices || loadingFallback}
            dataSource={filteredDeviceRows}
            emptyText="Belum ada device RFID."
            rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} device`,
              onChange: (page, pageSize) => {
                setPagination({ current: page, pageSize });
              },
            }}
            renderCard={(record, selection) => (
              <DeviceCard record={record} selection={selection} onAction={handleRowAction} />
            )}
          />
        </MotionDiv>
      </Card>

      <Modal
        title={editingDevice ? 'Edit Device RFID' : 'Tambah Device RFID'}
        open={deviceModalOpen}
        width={760}
        onCancel={() => setDeviceModalOpen(false)}
        onOk={handleSaveDevice}
        confirmLoading={savingDevice}
        centered>
        <Form form={deviceForm} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Flex gap={12} wrap="wrap">
            <Form.Item
              style={{ minWidth: 200, flex: 1 }}
              name="code"
              label="Code Device"
              rules={[{ required: true, message: 'Code wajib diisi.' }]}>
              <Input placeholder="gate-utama-01" />
            </Form.Item>
            <Form.Item
              style={{ minWidth: 240, flex: 1 }}
              name="name"
              label="Nama Device"
              rules={[{ required: true, message: 'Nama wajib diisi.' }]}>
              <Input placeholder="Gerbang Utama 01" />
            </Form.Item>
          </Flex>
          <Flex gap={12} wrap="wrap">
            <Form.Item
              style={{ minWidth: 220 }}
              name="device_type"
              label="Tipe Device"
              rules={[{ required: true, message: 'Tipe wajib diisi.' }]}>
              <Select
                options={[
                  { label: 'Gate', value: 'gate' },
                  { label: 'Classroom', value: 'classroom' },
                  { label: 'Ekstrakurikuler', value: 'extracurricular' },
                ]}
                onChange={(value) => {
                  if (value !== 'classroom') {
                    deviceForm.setFieldValue('class_ids', []);
                  }
                  if (value !== 'extracurricular') {
                    deviceForm.setFieldValue('policy_ids', []);
                  }
                }}
              />
            </Form.Item>
            <Form.Item
              style={{ minWidth: 220, flex: 1 }}
              name="class_ids"
              label="Kelas"
              rules={[
                {
                  validator: (_, value) => {
                    if (deviceType === 'classroom' && (!Array.isArray(value) || value.length === 0)) {
                      return Promise.reject(new Error('Minimal satu kelas wajib dipilih untuk device classroom.'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}>
              <Select
                mode="multiple"
                allowClear
                showSearch={{ optionFilterProp: 'label' }}
                virtual={false}
                disabled={deviceType !== 'classroom'}
                options={classOptions}
                placeholder={
                  deviceType === 'classroom'
                    ? 'Pilih satu atau lebih kelas'
                    : 'Hanya untuk device classroom'
                }
                maxTagCount="responsive"
              />
            </Form.Item>
            <Form.Item name="is_active" label="Status" valuePropName="checked">
              <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
            </Form.Item>
          </Flex>
          <Form.Item
            name="policy_ids"
            label="Policy Kegiatan"
            rules={[
              {
                validator: (_, value) => {
                  if (
                    deviceType === 'extracurricular' &&
                    (!Array.isArray(value) || value.length === 0)
                  ) {
                    return Promise.reject(
                      new Error(
                        'Minimal satu policy kegiatan wajib dipilih untuk device ekstrakurikuler.',
                      ),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}>
            <Select
              mode="multiple"
              allowClear
              showSearch={{ optionFilterProp: 'label' }}
              virtual={false}
              disabled={deviceType !== 'extracurricular'}
              options={activityPolicyOptions}
              placeholder={
                deviceType === 'extracurricular'
                  ? activityPolicyOptions.length
                    ? 'Pilih satu atau lebih policy (mis. Silat, Tari)'
                    : 'Buat policy Kegiatan Ekstra dulu'
                  : 'Hanya untuk device ekstrakurikuler'
              }
              maxTagCount="responsive"
            />
          </Form.Item>
          <Form.Item name="location_group" label="Grup Lokasi">
            <Input placeholder="Gedung A / Lantai 1 / Gerbang Timur" />
          </Form.Item>
          <Form.Item name="location_detail" label="Detail Lokasi">
            <Input.TextArea rows={2} placeholder="Dekat pos satpam, sisi kanan pintu masuk" />
          </Form.Item>
          <Flex gap={12} wrap="wrap">
            <Form.Item style={{ minWidth: 220, flex: 1 }} name="ip_address" label="IP Address">
              <Input placeholder="192.168.1.20" />
            </Form.Item>
            <Form.Item style={{ minWidth: 220, flex: 1 }} name="mac_address" label="MAC Address">
              <Input placeholder="AA:BB:CC:DD:EE:FF" />
            </Form.Item>
            <Form.Item style={{ minWidth: 220, flex: 1 }} name="firmware_version" label="Versi Firmware">
              <Input placeholder="v1.0.0" />
            </Form.Item>
          </Flex>
          {editingDevice ? (
            <Form.Item label="API Token">
              <Space.Compact style={{ width: '100%' }}>
                <Input.Password
                  readOnly
                  value={editingDevice.api_token || deviceForm.getFieldValue('api_token') || ''}
                  visibilityToggle
                  style={{ fontFamily: 'monospace' }}
                />
                <Button
                  icon={<Copy size={14} />}
                  onClick={() =>
                    copyText(
                      editingDevice.api_token || deviceForm.getFieldValue('api_token'),
                      'API Token disalin.',
                    )
                  }
                />
              </Space.Compact>
              <Text type="secondary" style={{ display: 'block', marginTop: 6, fontSize: 12 }}>
                Gunakan tombol rotasi token di kartu device jika ingin mengganti token.
              </Text>
            </Form.Item>
          ) : (
            <Form.Item name="api_token" label="API Token (opsional)">
              <Input.Password placeholder="Kosongkan untuk generate otomatis saat create" />
            </Form.Item>
          )}
        </Form>
      </Modal>

      <Modal
        title={tokenModal.record ? `API Token — ${tokenModal.record.name}` : 'API Token'}
        open={tokenModal.open}
        onCancel={() => setTokenModal({ open: false, record: null })}
        footer={[
          <Button
            key="copy"
            type="primary"
            icon={<Copy size={14} />}
            onClick={() => copyText(tokenModal.record?.api_token, 'API Token disalin.')}>
            Salin Token
          </Button>,
          <Button key="close" onClick={() => setTokenModal({ open: false, record: null })}>
            Tutup
          </Button>,
        ]}
        centered
        width={560}>
        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
          Salin token ini ke firmware ESP32 (`DEVICE_TOKEN`).
        </Text>
        <Input.Password
          readOnly
          value={tokenModal.record?.api_token || ''}
          visibilityToggle
          style={{ fontFamily: 'monospace' }}
        />
        {tokenModal.record?.code ? (
          <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
            Code device: <Text code>{tokenModal.record.code}</Text>
          </Text>
        ) : null}
      </Modal>
    </>
  );
};

export default DeviceSettingsTab;
