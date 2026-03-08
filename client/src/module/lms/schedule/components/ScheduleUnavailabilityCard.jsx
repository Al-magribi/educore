import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  TimePicker,
} from "antd";
import { Ban, Pencil, Plus, Trash2 } from "lucide-react";

const DAY_OPTIONS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 7, label: "Minggu" },
];

const toDayjsTime = (value) => {
  if (!value) return null;
  const raw = String(value).slice(0, 5);
  return dayjs(`2000-01-01 ${raw}`);
};

const ScheduleUnavailabilityCard = ({
  canManage,
  teachers,
  rules,
  loading,
  onSave,
  onDelete,
}) => {
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const teacherOptions = useMemo(
    () => (teachers || []).map((item) => ({ value: item.id, label: item.full_name })),
    [teachers],
  );

  const dayNameMap = useMemo(
    () =>
      DAY_OPTIONS.reduce((acc, item) => {
        acc[item.value] = item.label;
        return acc;
      }, {}),
    [],
  );

  const handleOpenCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true });
    setOpenModal(true);
  };

  const handleOpenEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      ...record,
      start_time: toDayjsTime(record.start_time),
      end_time: toDayjsTime(record.end_time),
    });
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSave({
      ...values,
      id: editing?.id,
      start_time: values.start_time ? values.start_time.format("HH:mm") : null,
      end_time: values.end_time ? values.end_time.format("HH:mm") : null,
    });
    setOpenModal(false);
  };

  const columns = [
    { title: "Guru", dataIndex: "teacher_name", width: 220 },
    {
      title: "Hari",
      dataIndex: "day_of_week",
      width: 110,
      render: (value) => dayNameMap[value] || "-",
    },
    {
      title: "Waktu",
      key: "time",
      width: 140,
      render: (_, record) =>
        record.start_time && record.end_time
          ? `${String(record.start_time).slice(0, 5)} - ${String(record.end_time).slice(0, 5)}`
          : "Seharian",
    },
    { title: "Alasan", dataIndex: "reason" },
    {
      title: "Status",
      dataIndex: "is_active",
      width: 100,
      render: (value) => <Tag color={value ? "green" : "default"}>{value ? "Aktif" : "Nonaktif"}</Tag>,
    },
    {
      title: "Aksi",
      key: "action",
      width: 120,
      render: (_, record) =>
        canManage ? (
          <Space>
            <Button
              type='text'
              icon={<Pencil size={14} />}
              onClick={() => handleOpenEdit(record)}
            />
            <Popconfirm title='Hapus ketentuan ini?' onConfirm={() => onDelete(record.id)}>
              <Button type='text' danger icon={<Trash2 size={14} />} />
            </Popconfirm>
          </Space>
        ) : null,
    },
  ];

  return (
    <Card
      style={{ borderRadius: 16 }}
      styles={{ body: { padding: 20 } }}
      title={
        <Space>
          <Ban size={18} />
          <span>Ketentuan Guru Tidak Tersedia</span>
        </Space>
      }
      extra={
        canManage ? (
          <Button type='primary' icon={<Plus size={14} />} onClick={handleOpenCreate}>
            Tambah
          </Button>
        ) : null
      }
    >
      <Table
        rowKey='id'
        size='small'
        loading={loading}
        columns={columns}
        dataSource={rules || []}
        scroll={{ x: 840 }}
        pagination={{ pageSize: 6 }}
      />

      <Modal
        open={openModal}
        title={editing ? "Ubah Ketentuan Guru" : "Tambah Ketentuan Guru"}
        onCancel={() => setOpenModal(false)}
        onOk={handleSubmit}
        okText='Simpan'
        confirmLoading={loading}
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='teacher_id' label='Guru' rules={[{ required: true }]}>
            <Select showSearch optionFilterProp='label' options={teacherOptions} />
          </Form.Item>
          <Form.Item name='day_of_week' label='Hari' rules={[{ required: true }]}>
            <Select options={DAY_OPTIONS} />
          </Form.Item>
          <Space style={{ width: "100%" }} size={8}>
            <Form.Item name='start_time' label='Mulai' style={{ width: "50%" }}>
              <TimePicker format='HH:mm' style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item name='end_time' label='Selesai' style={{ width: "50%" }}>
              <TimePicker format='HH:mm' style={{ width: "100%" }} />
            </Form.Item>
          </Space>
          <Form.Item name='reason' label='Alasan'>
            <Input placeholder='Contoh: pembinaan / rapat / dll' />
          </Form.Item>
          <Form.Item name='is_active' valuePropName='checked'>
            <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleUnavailabilityCard;
