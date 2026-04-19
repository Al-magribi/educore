import React, { useEffect, useMemo, useState } from "react";
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
  selectedConfig,
  groups,
  selectedGroup,
  groupCount = 0,
  loading,
  onSave,
  onDelete,
  onSelectGroup,
}) => {
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [tableShiftFilter, setTableShiftFilter] = useState("all");
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

  const availableDayOptions = useMemo(
    () =>
      DAY_OPTIONS.filter((day) => {
        const rows = slotByDay.get(Number(day.value)) || [];
        return rows.length > 0;
      }),
    [slotByDay],
  );

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

  const shiftOptions = useMemo(
    () =>
      (groups || []).map((item) => ({
        value: Number(item.id),
        label: item.name,
      })),
    [groups],
  );

  const shiftLabelById = useMemo(
    () =>
      (groups || []).reduce((acc, item) => {
        acc[Number(item.id)] = item.name;
        return acc;
      }, {}),
    [groups],
  );

  const openCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      config_group_id: selectedGroup ? Number(selectedGroup.id) : undefined,
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
      config_group_id:
        Number(record.config_group_id || selectedGroup?.id || 0) || undefined,
      name: record.name,
      day_of_week: Number(record.day_of_week),
      slot_start_id: Number(record.slot_start_id),
      slot_count: Number(record.slot_count) || 1,
      scope_type: record.scope_type || "all_classes",
      description: record.description || null,
      is_active: record.is_active ?? true,
      teaching_load_ids: (activityTargetsById[Number(record.id)] || []).map(
        (item) => Number(item.teaching_load_id),
      ),
    });
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    const payload = {
      ...values,
      id: editing?.id || values.id,
      config_group_id:
        Number(values.config_group_id || selectedGroup?.id || 0) || undefined,
      teaching_load_ids:
        values.scope_type === "teaching_load"
          ? values.teaching_load_ids || []
          : [],
    };
    await onSave(payload);
    closeModal();
  };

  const selectedDay = Form.useWatch("day_of_week", form);
  const selectedScope = Form.useWatch("scope_type", form);
  const selectedShiftId = Form.useWatch("config_group_id", form);

  useEffect(() => {
    if (
      !openModal ||
      !selectedShiftId ||
      Number(selectedShiftId) === Number(selectedGroup?.id)
    ) {
      return;
    }
    onSelectGroup?.(Number(selectedShiftId));
    form.setFieldsValue({
      day_of_week: undefined,
      slot_start_id: undefined,
      teaching_load_ids:
        selectedScope === "teaching_load"
          ? []
          : form.getFieldValue("teaching_load_ids"),
    });
  }, [
    form,
    onSelectGroup,
    openModal,
    selectedGroup?.id,
    selectedScope,
    selectedShiftId,
  ]);

  const slotOptions = useMemo(() => {
    const rows = slotByDay.get(Number(selectedDay)) || [];
    return rows.map((slot) => ({
      value: Number(slot.id),
      label: `Jam ${slot.slot_no} (${formatTime(slot.start_time)} - ${formatTime(slot.end_time)})`,
    }));
  }, [selectedDay, slotByDay]);

  const shiftLabel =
    shiftOptions.find((item) => Number(item.value) === Number(selectedShiftId))
      ?.label ||
    selectedGroup?.name ||
    "Shift aktif";

  const activityRows = useMemo(
    () =>
      (activities || []).map((item) => {
        const targets = activityTargetsById[Number(item.id)] || [];
        return {
          ...item,
          key: Number(item.id),
          shift_name:
            shiftLabelById[Number(item.config_group_id)] || "Tanpa shift",
          target_summary:
            item.scope_type === "all_classes"
              ? "Semua kelas"
              : targets
                  .map(
                    (target) =>
                      `${target.teacher_name} | ${target.subject_name} | ${target.class_name}`,
                  )
                  .join(" ; "),
        };
      }),
    [activities, activityTargetsById, shiftLabelById],
  );

  const filteredActivityRows = useMemo(
    () =>
      activityRows.filter((item) =>
        tableShiftFilter === "all"
          ? true
          : Number(item.config_group_id) === Number(tableShiftFilter),
      ),
    [activityRows, tableShiftFilter],
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
      title: "Shift",
      dataIndex: "shift_name",
      key: "shift_name",
      width: 160,
      render: (value) => <Tag color='geekblue'>{value || "-"}</Tag>,
    },
    {
      title: "Hari / Slot",
      key: "schedule",
      width: 220,
      render: (_, record) => (
        <Space direction='vertical' size={0}>
          <Text>
            {DAY_OPTIONS.find(
              (item) => item.value === Number(record.day_of_week),
            )?.label || "-"}
          </Text>
          <Text type='secondary'>
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
          <Tag color='blue'>Semua kelas</Tag>
        ) : (
          <Tag color='purple'>Beban ajar</Tag>
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
              type='text'
              icon={<Pencil size={14} />}
              onClick={() => openEdit(record)}
            />
            <Popconfirm
              title='Hapus kegiatan ini?'
              onConfirm={() => onDelete(record.id)}
            >
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
          <CalendarRange size={18} />
          <span>Jadwal Kegiatan</span>
        </Space>
      }
      extra={
        canManage ? (
          <Button type='primary' icon={<Plus size={14} />} onClick={openCreate}>
            Tambah Kegiatan
          </Button>
        ) : null
      }
    >
      <Card
        size='small'
        style={{ borderRadius: 12, marginBottom: 16 }}
        title='Ringkasan Okupansi Kegiatan'
      >
        <Space size={[8, 8]} wrap>
          <Tag color='geekblue'>
            Kelas aktif: {scheduleCapacity?.active_class_count || 0}
          </Tag>
          <Tag color='blue'>
            Sesi tersedia: {scheduleCapacity?.total_available_sessions || 0}
          </Tag>
          <Tag color='purple'>
            Dipakai kegiatan: {scheduleCapacity?.total_activity_sessions || 0}
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
        rowKey='key'
        size='small'
        loading={loading}
        columns={columns}
        title={() =>
          groupCount > 1 ? (
            <Space wrap>
              <Text strong>Filter Shift:</Text>
              <Select
                style={{ minWidth: 220 }}
                value={tableShiftFilter}
                onChange={setTableShiftFilter}
                options={[
                  { value: "all", label: "Semua shift" },
                  ...shiftOptions,
                ]}
              />
            </Space>
          ) : null
        }
        dataSource={filteredActivityRows}
        pagination={false}
        scroll={{ x: 1120 }}
        locale={{ emptyText: "Belum ada kegiatan jadwal." }}
      />

      <Modal
        open={openModal}
        title={editing ? "Ubah Kegiatan" : "Tambah Kegiatan"}
        onCancel={closeModal}
        onOk={handleSubmit}
        okText='Simpan'
        confirmLoading={loading}
        centered
        width={760}
        destroyOnClose
      >
        <Form form={form} layout='vertical'>
          <Alert
            showIcon
            type='info'
            style={{ marginBottom: 16 }}
            message={`Form kegiatan untuk ${shiftLabel}`}
            description='Hari dan slot yang dapat dipilih mengikuti konfigurasi jadwal pada shift ini.'
          />
          <Form.Item name='id' hidden>
            <Input />
          </Form.Item>
          {groupCount > 1 ? (
            <Form.Item
              name='config_group_id'
              label='Shift'
              rules={[{ required: true, message: "Shift wajib dipilih." }]}
            >
              <Select
                options={shiftOptions}
                placeholder='Pilih shift kegiatan'
              />
            </Form.Item>
          ) : null}
          <Form.Item
            name='name'
            label='Nama kegiatan'
            rules={[{ required: true, message: "Nama kegiatan wajib diisi." }]}
          >
            <Input placeholder='Contoh: Upacara / Stadium General / Tahfidz' />
          </Form.Item>
          <Form.Item
            name='scope_type'
            label='Tipe kegiatan'
            rules={[{ required: true }]}
          >
            <Select options={SCOPE_OPTIONS} />
          </Form.Item>
          <Space style={{ width: "100%" }} size={12} wrap>
            <Form.Item
              name='day_of_week'
              label='Hari'
              rules={[{ required: true }]}
              style={{ minWidth: 180, flex: 1 }}
            >
              <Select
                options={availableDayOptions}
                placeholder='Pilih hari sesuai shift'
              />
            </Form.Item>
            <Form.Item
              name='slot_start_id'
              label='Slot mulai'
              rules={[{ required: true }]}
              style={{ minWidth: 260, flex: 1 }}
            >
              <Select
                options={slotOptions}
                placeholder='Pilih slot dari shift aktif'
              />
            </Form.Item>
            <Form.Item
              name='slot_count'
              label='Jumlah slot'
              rules={[{ required: true }]}
              style={{ minWidth: 160 }}
            >
              <InputNumber min={1} max={8} style={{ width: "100%" }} />
            </Form.Item>
          </Space>

          {selectedScope === "teaching_load" ? (
            <Form.Item
              name='teaching_load_ids'
              label='Beban ajar yang digunakan'
              rules={[
                { required: true, message: "Pilih minimal satu beban ajar." },
              ]}
            >
              <Select
                mode='multiple'
                showSearch
                optionFilterProp='label'
                options={assignmentOptions}
                placeholder='Pilih guru / mapel / kelas dari shift aktif'
              />
            </Form.Item>
          ) : null}

          <Form.Item name='description' label='Keterangan'>
            <Input.TextArea rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleActivity;
