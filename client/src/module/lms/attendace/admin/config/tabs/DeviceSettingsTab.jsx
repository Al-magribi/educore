import { useState } from "react";
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Switch,
  Table,
  Tag,
  message,
} from "antd";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { useGetClassesQuery } from "../../../../../../service/public/ApiPublic";
import {
  useGetRfidDevicesQuery,
  useSaveRfidDeviceMutation,
} from "../../../../../../service/lms/ApiAttendance";
import { innerCardStyle, itemVariants } from "../configShared";

const MotionDiv = motion.div;

const DeviceSettingsTab = ({ fallbackDevices = [], loadingFallback = false }) => {
  const [deviceForm] = Form.useForm();
  const [deviceModalOpen, setDeviceModalOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  const { data: devicesRes, isFetching: fetchingDevices } = useGetRfidDevicesQuery();
  const { data: classesRes } = useGetClassesQuery();
  const [saveRfidDevice, { isLoading: savingDevice }] = useSaveRfidDeviceMutation();

  const deviceRows = devicesRes?.data || fallbackDevices;
  const classOptions = (classesRes?.data || []).map((item) => ({
    label: item.name,
    value: Number(item.id),
  }));

  const openCreateDeviceModal = () => {
    setEditingDevice(null);
    deviceForm.setFieldsValue({
      code: "",
      name: "",
      device_type: "gate",
      class_id: null,
      location_group: "",
      location_detail: "",
      ip_address: "",
      mac_address: "",
      firmware_version: "",
      api_token: "",
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
      location_group: record.location_group || "",
      location_detail: record.location_detail || "",
      ip_address: record.ip_address || "",
      mac_address: record.mac_address || "",
      firmware_version: record.firmware_version || "",
      api_token: "",
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
      message.success("Device RFID berhasil disimpan.");
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error?.data?.message || "Gagal menyimpan device RFID.");
    }
  };

  return (
    <>
      <Card
        title='Manajemen Device RFID'
        style={innerCardStyle}
        extra={
          <Button type='primary' icon={<Plus size={14} />} onClick={openCreateDeviceModal}>
            Tambah Device
          </Button>
        }
      >
        <MotionDiv variants={itemVariants} initial='hidden' animate='show'>
          <Table
            rowKey='id'
            loading={fetchingDevices || loadingFallback}
            dataSource={deviceRows}
            pagination={{ pageSize: 8 }}
            scroll={{ x: 860 }}
            columns={[
              { title: "Code", dataIndex: "code", width: 170 },
              { title: "Nama", dataIndex: "name", width: 220 },
              {
                title: "Tipe",
                dataIndex: "device_type",
                width: 130,
                render: (value) => (
                  <Tag color={value === "classroom" ? "purple" : "cyan"}>{value}</Tag>
                ),
              },
              { title: "Kelas", dataIndex: "class_name", width: 180, render: (value) => value || "-" },
              { title: "Lokasi", dataIndex: "location_group", width: 180, render: (value) => value || "-" },
              {
                title: "Status",
                dataIndex: "is_active",
                width: 110,
                render: (value) => (
                  <Tag color={value ? "success" : "default"}>
                    {value ? "Aktif" : "Nonaktif"}
                  </Tag>
                ),
              },
              {
                title: "Aksi",
                width: 100,
                render: (_, record) => (
                  <Button size='small' onClick={() => openEditDeviceModal(record)}>
                    Edit
                  </Button>
                ),
              },
            ]}
          />
        </MotionDiv>
      </Card>

      <Modal
        title={editingDevice ? "Edit Device RFID" : "Tambah Device RFID"}
        open={deviceModalOpen}
        width={760}
        onCancel={() => setDeviceModalOpen(false)}
        onOk={handleSaveDevice}
        confirmLoading={savingDevice}
      >
        <Form form={deviceForm} layout='vertical'>
          <Form.Item name='id' hidden>
            <Input />
          </Form.Item>
          <Flex gap={12} wrap='wrap'>
            <Form.Item
              style={{ minWidth: 200, flex: 1 }}
              name='code'
              label='Code Device'
              rules={[{ required: true, message: "Code wajib diisi." }]}
            >
              <Input placeholder='gate-utama-01' />
            </Form.Item>
            <Form.Item
              style={{ minWidth: 240, flex: 1 }}
              name='name'
              label='Nama Device'
              rules={[{ required: true, message: "Nama wajib diisi." }]}
            >
              <Input placeholder='Gerbang Utama 01' />
            </Form.Item>
          </Flex>
          <Flex gap={12} wrap='wrap'>
            <Form.Item
              style={{ minWidth: 220 }}
              name='device_type'
              label='Tipe Device'
              rules={[{ required: true, message: "Tipe wajib diisi." }]}
            >
              <Select
                options={[
                  { label: "Gate", value: "gate" },
                  { label: "Classroom", value: "classroom" },
                ]}
              />
            </Form.Item>
            <Form.Item
              style={{ minWidth: 260 }}
              shouldUpdate={(prev, next) => prev.device_type !== next.device_type}
              noStyle
            >
              {() => {
                const currentType = deviceForm.getFieldValue("device_type");
                return (
                  <Form.Item name='class_id' label='Kelas'>
                    <Select
                      allowClear
                      disabled={currentType !== "classroom"}
                      options={classOptions}
                      placeholder='Pilih kelas jika device classroom'
                    />
                  </Form.Item>
                );
              }}
            </Form.Item>
            <Form.Item name='is_active' label='Status' valuePropName='checked'>
              <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
            </Form.Item>
          </Flex>
          <Form.Item name='location_group' label='Grup Lokasi'>
            <Input placeholder='Gedung A / Lantai 1 / Gerbang Timur' />
          </Form.Item>
          <Form.Item name='location_detail' label='Detail Lokasi'>
            <Input.TextArea rows={2} placeholder='Dekat pos satpam, sisi kanan pintu masuk' />
          </Form.Item>
          <Flex gap={12} wrap='wrap'>
            <Form.Item style={{ minWidth: 220, flex: 1 }} name='ip_address' label='IP Address'>
              <Input placeholder='192.168.1.20' />
            </Form.Item>
            <Form.Item style={{ minWidth: 220, flex: 1 }} name='mac_address' label='MAC Address'>
              <Input placeholder='AA:BB:CC:DD:EE:FF' />
            </Form.Item>
            <Form.Item
              style={{ minWidth: 220, flex: 1 }}
              name='firmware_version'
              label='Versi Firmware'
            >
              <Input placeholder='v1.0.0' />
            </Form.Item>
          </Flex>
          <Form.Item name='api_token' label='API Token (opsional saat update)'>
            <Input.Password placeholder='Kosongkan untuk generate otomatis saat create' />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default DeviceSettingsTab;
