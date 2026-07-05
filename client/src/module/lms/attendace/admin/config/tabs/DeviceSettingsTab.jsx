import { useMemo, useState } from 'react';
import { Button, Card, Flex, Form, Input, Modal, Select, Switch, Table, Tag, Typography, message } from 'antd';
import { motion } from 'framer-motion';
import { Plus, Search, Trash2 } from 'lucide-react';
import {
  useBulkDeleteRfidDevicesMutation,
  useGetRfidDevicesQuery,
  useRotateRfidDeviceTokenMutation,
  useSaveRfidDeviceMutation,
} from '../../../../../../service/lms/ApiAttendance';
import { innerCardStyle, itemVariants } from '../configShared';

const { Text } = Typography;

const MotionDiv = motion.div;

const PAGE_SIZE_OPTIONS = ['8', '10', '20', '50'];

const DeviceSettingsTab = ({
  fallbackDevices = [],
  classRows = [],
  loadingFallback = false,
}) => {
  const [deviceForm] = Form.useForm();
  const deviceType = Form.useWatch('device_type', deviceForm);
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [nameFilter, setNameFilter] = useState('');
  const [pagination, setPagination] = useState({ current: 1, pageSize: 8 });
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);

  const { data: devicesRes, isFetching: fetchingDevices } = useGetRfidDevicesQuery();
  const [saveRfidDevice, { isLoading: savingDevice }] = useSaveRfidDeviceMutation();
  const [rotateDeviceToken] = useRotateRfidDeviceTokenMutation();
  const [bulkDeleteRfidDevices, { isLoading: bulkDeleting }] = useBulkDeleteRfidDevicesMutation();

  const deviceRows = devicesRes?.data || fallbackDevices;
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
      class_id: null,
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
    deviceForm.setFieldsValue({
      id: record.id,
      code: record.code,
      name: record.name,
      device_type: record.device_type,
      class_id: record.class_id ? Number(record.class_id) : null,
      location_group: record.location_group || '',
      location_detail: record.location_detail || '',
      ip_address: record.ip_address || '',
      mac_address: record.mac_address || '',
      firmware_version: record.firmware_version || '',
      api_token: '',
      is_active: record.is_active === true,
    });
    setDeviceModalOpen(true);
  };

  const handleSaveDevice = async () => {
    try {
      const values = await deviceForm.validateFields();
      await saveRfidDevice(values).unwrap();
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

    if (action === 'rotate_token') {
      handleRotateToken(record);
    }
  };

  const handleRotateToken = async (record) => {
    try {
      const response = await rotateDeviceToken(record.id).unwrap();
      const token = response?.data?.api_token;
      Modal.info({
        title: 'Token Baru Device',
        content: (
          <div>
            <p>Token berhasil dirotasi untuk device {record.name}.</p>
            <Input.Password readOnly value={token || ''} visibilityToggle style={{ marginTop: 8 }} />
          </div>
        ),
        width: 560,
      });
      message.success('Token device berhasil dirotasi.');
    } catch (error) {
      message.error(error?.data?.message || 'Gagal merotasi token device.');
    }
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
          <Flex gap={12} wrap="wrap" style={{ marginBottom: 16 }}>
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
          </Flex>
          {filteredDeviceRows.length > 0 && (
            <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
              <Text type="secondary">
                {selectedRowKeys.length > 0
                  ? `${selectedRowKeys.length} device terpilih`
                  : 'Centang baris untuk hapus bulk'}
              </Text>
              <Button
                danger
                icon={<Trash2 size={16} />}
                disabled={selectedRowKeys.length === 0}
                loading={bulkDeleting}
                onClick={handleBulkDelete}>
                Hapus Terpilih
              </Button>
            </Flex>
          )}
          <Table
            rowKey="id"
            loading={fetchingDevices || loadingFallback}
            dataSource={filteredDeviceRows}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
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
            scroll={{ x: 860 }}
            columns={[
              { title: 'Code', dataIndex: 'code', width: 170 },
              { title: 'Nama', dataIndex: 'name', width: 220 },
              {
                title: 'Tipe',
                dataIndex: 'device_type',
                width: 130,
                render: (value) => <Tag color={value === 'classroom' ? 'purple' : 'cyan'}>{value}</Tag>,
              },
              { title: 'Kelas', dataIndex: 'class_name', width: 180, render: (value) => value || '-' },
              { title: 'Lokasi', dataIndex: 'location_group', width: 180, render: (value) => value || '-' },
              {
                title: 'Status',
                dataIndex: 'is_active',
                width: 110,
                render: (value) => <Tag color={value ? 'success' : 'default'}>{value ? 'Aktif' : 'Nonaktif'}</Tag>,
              },
              {
                title: 'Aksi',
                width: 150,
                render: (_, record) => (
                  <Select
                    placeholder="Aksi"
                    value={null}
                    virtual={false}
                    style={{ width: '100%', maxWidth: 150 }}
                    options={[
                      { value: 'edit', label: 'Edit' },
                      { value: 'rotate_token', label: 'Rotate Token' },
                    ]}
                    onChange={(value) => handleRowAction(value, record)}
                  />
                ),
              },
            ]}
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
                ]}
                onChange={(value) => {
                  if (value !== 'classroom') {
                    deviceForm.setFieldValue('class_id', null);
                  }
                }}
              />
            </Form.Item>
            <Form.Item
              style={{ minWidth: 260, flex: 1 }}
              name="class_id"
              label="Kelas"
              rules={[
                {
                  validator: (_, value) => {
                    if (deviceType === 'classroom' && !value) {
                      return Promise.reject(new Error('Kelas wajib dipilih untuk device classroom.'));
                    }
                    return Promise.resolve();
                  },
                },
              ]}>
              <Select
                allowClear
                showSearch={{ optionFilterProp: 'label' }}
                virtual={false}
                disabled={deviceType !== 'classroom'}
                options={classOptions}
                placeholder={deviceType === 'classroom' ? 'Pilih kelas' : 'Hanya untuk device classroom'}
              />
            </Form.Item>
            <Form.Item name="is_active" label="Status" valuePropName="checked">
              <Switch checkedChildren="Aktif" unCheckedChildren="Nonaktif" />
            </Form.Item>
          </Flex>
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
          <Form.Item name="api_token" label="API Token (opsional saat update)">
            <Input.Password placeholder="Kosongkan untuk generate otomatis saat create" />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DeviceSettingsTab;
