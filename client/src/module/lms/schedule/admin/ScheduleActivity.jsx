import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { CalendarRange, Pencil, Plus, Trash2 } from "lucide-react";

const { Text } = Typography;

const DAY_OPTIONS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 7, label: "Minggu" },
];

const SCOPE_OPTIONS = [
  { value: "all_classes", label: "Kegiatan Umum Semua Kelas" },
  { value: "teaching_load", label: "Kegiatan dari Beban Ajar" },
];

const formatTime = (value) => (value ? String(value).slice(0, 5) : "-");

const ScheduleActivity = ({
  canManage,
  activities,
  activityTargets,
  slots,
  teacherAssignments,
  scheduleCapacity,
  loading,
  onSave,
  onDelete,
}) => {
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const activityTargetsById = useMemo(
    () =>
      (activityTargets || []).reduce((acc, item) => {
        const key = Number(item.activity_id);
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
      }, {}),
    [activityTargets],
  );

  const slotByDay = useMemo(() => {
    const map = new Map();
    (slots || [])
      .filter((item) => !item?.is_break)
      .forEach((slot) => {
        const day = Number(slot.day_of_week);
        if (!map.has(day)) map.set(day, []);
        map.get(day).push(slot);
      });
    for (const rows of map.values()) {
      rows.sort((a, b) => Number(a.slot_no) - Number(b.slot_no));
    }
    return map;
  }, [slots]);

  const assignmentOptions = useMemo(
    () =>
      (teacherAssignments || [])
        .filter((item) => item.teaching_load_id)
        .map((item) => ({
          value: Number(item.teaching_load_id),
          label: `${item.teacher_name} | ${item.subject_name} | ${item.class_name} | ${item.weekly_sessions || 0} sesi`,
        })),
    [teacherAssignments],
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      scope_type: "all_classes",
      slot_count: 1,
      is_active: true,
      teaching_load_ids: [],
    });
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
    setEditing(null);
    form.resetFields();
  };

  const openEdit = (record) => {
    setEditing(record);
    form.setFieldsValue({
      id: record.id,
      name: record.name,
      day_of_week: Number(record.day_of_week),
      slot_start_id: Number(record.slot_start_id),
      slot_count: Number(record.slot_count) || 1,
      scope_type: record.scope_type || "all_classes",
      description: record.description || null,
      is_active: record.is_active ?? true,
      teaching_load_ids: (activityTargetsById[Number(record.id)] || []).map((item) =>
        Number(item.teaching_load_id),
      ),
    });
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      id: editing?.id || values.id,
      teaching_load_ids:
        values.scope_type === "teaching_load" ? values.teaching_load_ids || [] : [],
    };
    await onSave(payload);
    closeModal();
  };

  const selectedDay = Form.useWatch("day_of_week", form);
  const selectedScope = Form.useWatch("scope_type", form);

  const slotOptions = useMemo(() => {
    const rows = slotByDay.get(Number(selectedDay)) || [];
    return rows.map((slot) => ({
      value: Number(slot.id),
      label: `Jam ${slot.slot_no} (${formatTime(slot.start_time)} - ${formatTime(slot.end_time)})`,
    }));
  }, [selectedDay, slotByDay]);

  const activityRows = useMemo(
    () =>
      (activities || []).map((item) => {
        const targets = activityTargetsById[Number(item.id)] || [];
        return {
          ...item,
          key: Number(item.id),
          target_summary:
            item.scope_type === "all_classes"
              ? "Semua kelas"
              : targets
                  .map((target) => `${target.teacher_name} | ${target.subject_name} | ${target.class_name}`)
                  .join(" ; "),
        };
      }),
    [activities, activityTargetsById],
  );

  const columns = [
    {
      title: "Kegiatan",
      dataIndex: "name",
      key: "name",
      width: 200,
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: "Hari / Slot",
      key: "schedule",
      width: 220,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text>{DAY_OPTIONS.find((item) => item.value === Number(record.day_of_week))?.label || "-"}</Text>
          <Text type="secondary">
            {formatTime(record.start_time)} - {formatTime(record.end_time)}
          </Text>
        </Space>
      ),
    },
    {
      title: "Tipe",
      dataIndex: "scope_type",
      key: "scope_type",
      width: 160,
      render: (value) =>
        value === "all_classes" ? (
          <Tag color="blue">Semua kelas</Tag>
        ) : (
          <Tag color="purple">Beban ajar</Tag>
        ),
    },
    {
      title: "Target",
      dataIndex: "target_summary",
      key: "target_summary",
      render: (value) => value || "-",
    },
    {
      title: "Aksi",
      key: "action",
      width: 120,
      render: (_, record) =>
        canManage ? (
          <Space>
            <Button
              type="text"
              icon={<Pencil size={14} />}
              onClick={() => openEdit(record)}
            />
            <Popconfirm
              title="Hapus kegiatan ini?"
              onConfirm={() => onDelete(record.id)}
            >
              <Button type="text" danger icon={<Trash2 size={14} />} />
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
          <CalendarRange size={18} />
          <span>Kegiatan Jadwal</span>
        </Space>
      }
      extra={
        canManage ? (
          <Button type="primary" icon={<Plus size={14} />} onClick={openCreate}>
            Tambah Kegiatan
          </Button>
        ) : null
      }
    >
      <Alert
        showIcon
        type="info"
        style={{ marginBottom: 16 }}
        message="Kegiatan akan memblok slot untuk generator"
        description="Kegiatan umum memblok semua kelas pada slot yang dipilih. Kegiatan berbasis beban ajar memblok kelas dan guru dari beban ajar yang dipilih."
      />

      <Card
        size="small"
        style={{ borderRadius: 12, marginBottom: 16 }}
        title="Ringkasan Okupansi Kegiatan"
      >
        <Space size={[8, 8]} wrap>
          <Tag color="geekblue">
            Kelas aktif: {scheduleCapacity?.active_class_count || 0}
          </Tag>
          <Tag color="blue">
            Sesi tersedia: {scheduleCapacity?.total_available_sessions || 0}
          </Tag>
          <Tag color="purple">
            Dipakai kegiatan:{" "}
            {scheduleCapacity?.total_activity_sessions || 0}
          </Tag>
          <Tag
            color={
              Number(scheduleCapacity?.remaining_sessions || 0) >= 0
                ? "green"
                : "red"
            }
          >
            Sisa sesi bersih: {scheduleCapacity?.remaining_sessions || 0}
          </Tag>
        </Space>
      </Card>

      <Table
        rowKey="key"
        size="small"
        loading={loading}
        columns={columns}
        dataSource={activityRows}
        pagination={false}
        scroll={{ x: 960 }}
        locale={{ emptyText: "Belum ada kegiatan jadwal." }}
      />

      <Modal
        open={openModal}
        title={editing ? "Ubah Kegiatan" : "Tambah Kegiatan"}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText="Simpan"
        confirmLoading={loading}
        centered
        width={760}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <Form.Item name="id" hidden>
            <Input />
          </Form.Item>
          <Form.Item
            name="name"
            label="Nama kegiatan"
            rules={[{ required: true, message: "Nama kegiatan wajib diisi." }]}
          >
            <Input placeholder="Contoh: Upacara / Stadium General / Tahfidz" />
          </Form.Item>
          <Form.Item
            name="scope_type"
            label="Tipe kegiatan"
            rules={[{ required: true }]}
          >
            <Select options={SCOPE_OPTIONS} />
          </Form.Item>
          <Space style={{ width: "100%" }} size={12} wrap>
            <Form.Item
              name="day_of_week"
              label="Hari"
              rules={[{ required: true }]}
              style={{ minWidth: 180, flex: 1 }}
            >
              <Select options={DAY_OPTIONS} />
            </Form.Item>
            <Form.Item
              name="slot_start_id"
              label="Slot mulai"
              rules={[{ required: true }]}
              style={{ minWidth: 260, flex: 1 }}
            >
              <Select options={slotOptions} />
            </Form.Item>
            <Form.Item
              name="slot_count"
              label="Jumlah slot"
              rules={[{ required: true }]}
              style={{ minWidth: 160 }}
            >
              <InputNumber min={1} max={8} style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          {selectedScope === "teaching_load" ? (
            <Form.Item
              name="teaching_load_ids"
              label="Beban ajar yang digunakan"
              rules={[{ required: true, message: "Pilih minimal satu beban ajar." }]}
            >
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                options={assignmentOptions}
                placeholder="Pilih guru / mapel / kelas"
              />
            </Form.Item>
          ) : null}

          <Form.Item name="description" label="Keterangan">
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleActivity;
