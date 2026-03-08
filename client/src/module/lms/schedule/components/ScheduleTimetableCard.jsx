import React, { useMemo, useState } from "react";
import {
  Button,
  Card,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
} from "antd";
import { LayoutGrid, Pencil, RefreshCcw, Sparkles } from "lucide-react";

const DAY_OPTIONS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 7, label: "Minggu" },
];

const timeLabel = (record) => {
  const start = record.start_time ? String(record.start_time).slice(0, 5) : "-";
  const end = record.end_time ? String(record.end_time).slice(0, 5) : "-";
  return `${start} - ${end}`;
};

const ScheduleTimetableCard = ({
  canManage,
  entries,
  slots,
  loading,
  onGenerate,
  onRefresh,
  onUpdateEntry,
}) => {
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const slotByDay = useMemo(() => {
    const map = new Map();
    (slots || []).forEach((slot) => {
      const day = Number(slot.day_of_week);
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(slot);
    });
    for (const rows of map.values()) {
      rows.sort((a, b) => Number(a.slot_no) - Number(b.slot_no));
    }
    return map;
  }, [slots]);

  const entriesByDay = useMemo(() => {
    const map = new Map();
    (entries || []).forEach((item) => {
      const day = Number(item.day_of_week);
      if (!map.has(day)) map.set(day, []);
      map.get(day).push(item);
    });
    for (const rows of map.values()) {
      rows.sort((a, b) => {
        const timeA = String(a.start_time || "");
        const timeB = String(b.start_time || "");
        return timeA.localeCompare(timeB);
      });
    }
    return map;
  }, [entries]);

  const openEditor = (record) => {
    setEditing(record);
    form.setFieldsValue({
      day_of_week: Number(record.day_of_week),
      slot_count: Number(record.slot_count) || 1,
      slot_start_id: null,
    });
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    if (!editing) return;
    const values = await form.validateFields();
    await onUpdateEntry({
      id: editing.id,
      day_of_week: values.day_of_week,
      slot_start_id: values.slot_start_id,
      slot_count: values.slot_count,
    });
    setOpenModal(false);
    setEditing(null);
  };

  const currentDay = Form.useWatch("day_of_week", form);
  const slotStartOptions = useMemo(() => {
    const rows = slotByDay.get(Number(currentDay)) || [];
    return rows.map((slot) => ({
      value: slot.id,
      label: `S${slot.slot_no} (${String(slot.start_time).slice(0, 5)} - ${String(slot.end_time).slice(0, 5)})`,
    }));
  }, [currentDay, slotByDay]);

  const columns = [
    {
      title: "Waktu",
      key: "time",
      width: 140,
      render: (_, record) => timeLabel(record),
    },
    { title: "Kelas", dataIndex: "class_name", width: 140 },
    { title: "Mapel", dataIndex: "subject_name", width: 160 },
    { title: "Guru", dataIndex: "teacher_name", width: 220 },
    {
      title: "Pertemuan",
      key: "meeting",
      width: 150,
      render: (_, record) => (
        <Space wrap size={4}>
          <Tag color='blue'>#{record.meeting_no}</Tag>
          <Tag>{record.slot_count} sesi</Tag>
          {record.is_manual_override ? <Tag color='purple'>Manual</Tag> : null}
        </Space>
      ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 100,
      render: (_, record) =>
        canManage ? (
          <Button type='text' icon={<Pencil size={14} />} onClick={() => openEditor(record)} />
        ) : null,
    },
  ];

  return (
    <Card
      style={{ borderRadius: 16 }}
      styles={{ body: { padding: 20 } }}
      title={
        <Space>
          <LayoutGrid size={18} />
          <span>Jadwal Final</span>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<RefreshCcw size={14} />} onClick={onRefresh} loading={loading}>
            Muat Ulang
          </Button>
          {canManage ? (
            <Button
              type='primary'
              icon={<Sparkles size={14} />}
              onClick={onGenerate}
              loading={loading}
            >
              Generate
            </Button>
          ) : null}
        </Space>
      }
    >
      <Tabs
        items={DAY_OPTIONS.map((day) => ({
          key: String(day.value),
          label: day.label,
          children: (
            <Table
              rowKey='id'
              size='small'
              columns={columns}
              loading={loading}
              dataSource={entriesByDay.get(day.value) || []}
              scroll={{ x: 920 }}
              pagination={{ pageSize: 8 }}
              locale={{ emptyText: `Belum ada jadwal ${day.label}` }}
            />
          ),
        }))}
      />

      <Modal
        open={openModal}
        title='Ubah Jadwal Manual'
        onCancel={() => setOpenModal(false)}
        onOk={handleSubmit}
        okText='Simpan'
        confirmLoading={loading}
      >
        <Form form={form} layout='vertical'>
          <Form.Item name='day_of_week' label='Hari' rules={[{ required: true }]}>
            <Select options={DAY_OPTIONS} />
          </Form.Item>
          <Form.Item name='slot_start_id' label='Slot mulai' rules={[{ required: true }]}>
            <Select options={slotStartOptions} />
          </Form.Item>
          <Form.Item name='slot_count' label='Jumlah sesi' rules={[{ required: true }]}>
            <InputNumber min={1} max={4} style={{ width: "100%" }} />
          </Form.Item>
          <Tag color='gold'>
            Perubahan manual tetap dicek bentrok kelas/guru dan ketentuan guru.
          </Tag>
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleTimetableCard;
