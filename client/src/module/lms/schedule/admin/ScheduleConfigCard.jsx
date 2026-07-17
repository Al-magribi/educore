import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  Divider,
  Empty,
  Flex,
  Form,
  Grid,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  TimePicker,
  Typography,
} from "antd";
import { CalendarClock, Pencil, Plus, Trash2, UsersRound } from "lucide-react";
import {
  SCHEDULE_CARD_BODY,
  SCHEDULE_CARD_STYLE,
  SCHEDULE_INNER_CARD_BODY,
  SCHEDULE_INNER_CARD_STYLE,
  SCHEDULE_TAG_STYLE,
} from "./scheduleAdminStyles";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const DAY_OPTIONS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 7, label: "Minggu" },
];

const DEFAULT_CONFIG_RULES = {
  max_sessions_per_meeting: 2,
  require_different_days_if_over_max: true,
  allow_same_day_multiple_meetings: true,
  minimum_gap_slots: 4,
};

const toDayjsTime = (value) => {
  if (!value) return null;
  const raw = String(value).slice(0, 5);
  return dayjs(`2000-01-01 ${raw}`);
};

const formatTime = (value) => (value ? value.format("HH:mm") : "-");

const dayLabelMap = DAY_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const buildDefaultDay = () => ({
  day_of_week: undefined,
  slots: [
    {
      start_time: dayjs("2000-01-01 07:00"),
      end_time: dayjs("2000-01-01 07:40"),
    },
  ],
  breaks: [],
});

const normalizeDayRows = (dayTemplates, breaks, slots) =>
  (dayTemplates || [])
    .map((dayItem) => {
      const dayOfWeek = Number(dayItem.day_of_week);
      return {
        day_of_week: dayOfWeek,
        start_time: toDayjsTime(dayItem.start_time),
        end_time: toDayjsTime(dayItem.end_time),
        slots: (slots || [])
          .filter(
            (item) =>
              Number(item.day_of_week) === dayOfWeek && item.is_break !== true,
          )
          .sort((left, right) => Number(left.slot_no) - Number(right.slot_no))
          .map((item) => ({
            slot_no: Number(item.slot_no),
            start_time: toDayjsTime(item.start_time),
            end_time: toDayjsTime(item.end_time),
          })),
        breaks: (breaks || [])
          .filter((item) => Number(item.day_of_week) === dayOfWeek)
          .map((item) => ({
            label: item.label || "Istirahat",
            break_start: toDayjsTime(item.break_start),
            break_end: toDayjsTime(item.break_end),
          })),
      };
    })
    .sort((left, right) => left.day_of_week - right.day_of_week);

const ScheduleConfigCard = ({
  canManage,
  config,
  groups,
  selectedGroup,
  selectedGroupClasses,
  classes,
  dayTemplates,
  breaks,
  slots,
  scheduleCapacity,
  onSave,
  onSaveGroup,
  onDeleteGroup,
  onSelectGroup,
  loading,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [dayForm] = Form.useForm();
  const [groupForm] = Form.useForm();
  const [dayRows, setDayRows] = useState([]);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  const normalizedDays = useMemo(
    () => normalizeDayRows(dayTemplates, breaks, slots),
    [breaks, dayTemplates, slots],
  );

  useEffect(() => {
    setDayRows(normalizedDays);
  }, [normalizedDays]);

  const classOptions = useMemo(
    () =>
      (classes || []).map((item) => ({
        value: Number(item.id),
        label: item.grade_name
          ? `${item.grade_name} - ${item.name}`
          : item.name,
      })),
    [classes],
  );

  const groupOptions = useMemo(
    () =>
      (groups || []).map((item) => ({
        value: Number(item.id),
        label: item.name,
      })),
    [groups],
  );

  const hasActivityUsage =
    Number(scheduleCapacity?.total_activity_sessions || 0) > 0;

  const buildPayload = (rows) => ({
    config_group_id: selectedGroup?.id,
    max_sessions_per_meeting:
      config?.max_sessions_per_meeting ??
      DEFAULT_CONFIG_RULES.max_sessions_per_meeting,
    require_different_days_if_over_max:
      config?.require_different_days_if_over_max ??
      DEFAULT_CONFIG_RULES.require_different_days_if_over_max,
    allow_same_day_multiple_meetings:
      config?.allow_same_day_multiple_meetings ??
      DEFAULT_CONFIG_RULES.allow_same_day_multiple_meetings,
    minimum_gap_slots:
      config?.minimum_gap_slots ?? DEFAULT_CONFIG_RULES.minimum_gap_slots,
    days: rows.map((item) => ({
      day_of_week: item.day_of_week,
      is_school_day: true,
      start_time: item.slots?.[0]?.start_time?.format("HH:mm"),
      end_time: item.slots?.[item.slots.length - 1]?.end_time?.format("HH:mm"),
      slots: (item.slots || []).map((slot, index) => ({
        slot_no: index + 1,
        start_time: slot.start_time?.format("HH:mm"),
        end_time: slot.end_time?.format("HH:mm"),
      })),
      breaks: (item.breaks || []).map((rest) => ({
        label: rest.label || "Istirahat",
        break_start: rest.break_start?.format("HH:mm"),
        break_end: rest.break_end?.format("HH:mm"),
      })),
    })),
  });

  const openCreateDay = () => {
    setEditingDayIndex(null);
    dayForm.setFieldsValue(buildDefaultDay());
    setDayModalOpen(true);
  };

  const openEditDay = (record, index) => {
    setEditingDayIndex(index);
    dayForm.setFieldsValue({
      day_of_week: record.day_of_week,
      slots:
        record.slots?.length > 0
          ? record.slots
          : [
              {
                start_time: record.start_time,
                end_time: record.end_time,
              },
            ],
      breaks: record.breaks || [],
    });
    setDayModalOpen(true);
  };

  const closeDayModal = () => {
    setDayModalOpen(false);
    setEditingDayIndex(null);
    dayForm.resetFields();
  };

  const openCreateGroup = () => {
    setEditingGroup(null);
    groupForm.setFieldsValue({
      name:
        (groups || []).length === 0
          ? "Shift Pagi"
          : (groups || []).length === 1
            ? "Shift Siang"
            : "",
      description: "",
      class_ids: [],
    });
    setGroupModalOpen(true);
  };

  const openEditGroup = () => {
    if (!selectedGroup) return;
    setEditingGroup(selectedGroup);
    groupForm.setFieldsValue({
      name: selectedGroup.name,
      description: selectedGroup.description || "",
      class_ids: (selectedGroupClasses || []).map((item) =>
        Number(item.class_id),
      ),
    });
    setGroupModalOpen(true);
  };

  const handleSaveGroup = async () => {
    const values = await groupForm.validateFields();
    const success = await onSaveGroup({
      id: editingGroup?.id,
      name: values.name,
      description: values.description || null,
      class_ids: values.class_ids || [],
    });
    if (success) {
      setGroupModalOpen(false);
      setEditingGroup(null);
      groupForm.resetFields();
    }
  };

  const persistDayRows = async (nextRows) => {
    const sortedRows = [...nextRows].sort(
      (left, right) => left.day_of_week - right.day_of_week,
    );
    await onSave(buildPayload(sortedRows));
    setDayRows(sortedRows);
  };

  const handleSaveDay = async () => {
    const values = await dayForm.validateFields();
    const normalizedSlots = (values.slots || [])
      .filter((item) => item?.start_time && item?.end_time)
      .map((item) => ({
        start_time: item.start_time,
        end_time: item.end_time,
      }))
      .sort(
        (left, right) => left.start_time.valueOf() - right.start_time.valueOf(),
      );

    if (normalizedSlots.length === 0) {
      dayForm.setFields([
        {
          name: "slots",
          errors: ["Minimal satu jam pelajaran wajib diisi."],
        },
      ]);
      return;
    }

    for (let index = 0; index < normalizedSlots.length; index += 1) {
      const slot = normalizedSlots[index];
      if (!slot.end_time.isAfter(slot.start_time)) {
        dayForm.setFields([
          {
            name: ["slots", index, "end_time"],
            errors: ["Jam selesai harus lebih besar dari jam mulai."],
          },
        ]);
        return;
      }
      if (index > 0) {
        const previous = normalizedSlots[index - 1];
        if (slot.start_time.isBefore(previous.end_time)) {
          dayForm.setFields([
            {
              name: ["slots", index, "start_time"],
              errors: [`Bentrok dengan jam ke-${index}.`],
            },
          ]);
          return;
        }
      }
    }

    const normalizedBreaks = (values.breaks || [])
      .filter((item) => item?.break_start && item?.break_end)
      .map((item) => ({
        label: item.label || "Istirahat",
        break_start: item.break_start,
        break_end: item.break_end,
      }))
      .sort(
        (left, right) =>
          left.break_start.valueOf() - right.break_start.valueOf(),
      );

    const normalizedRow = {
      day_of_week: values.day_of_week,
      start_time: normalizedSlots[0].start_time,
      end_time: normalizedSlots[normalizedSlots.length - 1].end_time,
      slots: normalizedSlots.map((item, index) => ({
        ...item,
        slot_no: index + 1,
      })),
      breaks: normalizedBreaks,
    };

    const nextRows = [...dayRows];
    const duplicateIndex = nextRows.findIndex(
      (item, index) =>
        item.day_of_week === normalizedRow.day_of_week &&
        index !== editingDayIndex,
    );

    if (duplicateIndex >= 0) {
      nextRows.splice(duplicateIndex, 1);
    }

    if (editingDayIndex !== null) {
      nextRows[editingDayIndex] = normalizedRow;
    } else {
      nextRows.push(normalizedRow);
    }

    await persistDayRows(nextRows);
    closeDayModal();
  };

  const handleDeleteDay = async (index) => {
    const nextRows = dayRows.filter((_, rowIndex) => rowIndex !== index);
    await persistDayRows(nextRows);
  };

  const columns = [
    {
      title: "Hari",
      dataIndex: "day_of_week",
      key: "day_of_week",
      width: 120,
      render: (value) => <Text strong>{dayLabelMap[value] || "-"}</Text>,
    },
    {
      title: "Jam Pelajaran",
      key: "slots",
      render: (_, record) =>
        record.slots?.length ? (
          <Space size={[6, 6]} wrap>
            {record.slots.map((item) => (
              <Tag key={`${record.day_of_week}-${item.slot_no}`} color="blue">
                Jam {item.slot_no}: {formatTime(item.start_time)} -{" "}
                {formatTime(item.end_time)}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">Belum ada</Text>
        ),
    },
    {
      title: "Istirahat",
      key: "breaks",
      render: (_, record) =>
        record.breaks?.length ? (
          <Space size={[6, 6]} wrap>
            {record.breaks.map((item, index) => (
              <Tag key={`${record.day_of_week}-break-${index}`} color="gold">
                {(item.label || "Istirahat").trim()}:{" "}
                {formatTime(item.break_start)} - {formatTime(item.break_end)}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">Tidak ada</Text>
        ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 120,
      render: (_, record, index) =>
        canManage ? (
          <Space>
            <Button
              type="text"
              icon={<Pencil size={14} />}
              onClick={() => openEditDay(record, index)}
            />
            <Popconfirm
              title="Hapus hari ini?"
              description={
                hasActivityUsage
                  ? "Mengubah konfigurasi akan menghapus kegiatan yang memakai slot shift ini."
                  : undefined
              }
              onConfirm={() => handleDeleteDay(index)}
              okText="Hapus"
              cancelText="Batal"
              disabled={dayRows.length <= 1}
            >
              <Button
                type="text"
                danger
                loading={loading}
                disabled={dayRows.length <= 1}
                icon={<Trash2 size={14} />}
              />
            </Popconfirm>
          </Space>
        ) : null,
    },
  ];

  return (
    <Card
      style={{ ...SCHEDULE_CARD_STYLE, width: "100%", maxWidth: "100%" }}
      styles={{ body: SCHEDULE_CARD_BODY }}
      title={
        <Space>
          <CalendarClock size={18} />
          <span>Konfigurasi Jadwal</span>
        </Space>
      }
    >
      <Flex vertical gap={16}>
        <Card
          size="small"
          title="Shift Sekolah"
          extra={
            canManage ? (
              <Space wrap>
                <Button
                  type="primary"
                  icon={<Plus size={14} />}
                  onClick={openCreateGroup}
                >
                  Tambah Shift
                </Button>
                <Button
                  icon={<Pencil size={14} />}
                  onClick={openEditGroup}
                  disabled={!selectedGroup}
                >
                  Ubah Shift
                </Button>
                <Popconfirm
                  title="Hapus shift ini?"
                  description="Kelas pada shift ini akan dipindah ke shift lain jika masih ada."
                  onConfirm={() => onDeleteGroup?.(selectedGroup?.id)}
                  okText="Hapus"
                  cancelText="Batal"
                >
                  <Button
                    danger
                    icon={<Trash2 size={14} />}
                    disabled={!selectedGroup}
                  >
                    Hapus Shift
                  </Button>
                </Popconfirm>
              </Space>
            ) : null
          }
          style={SCHEDULE_INNER_CARD_STYLE}
          styles={{ body: SCHEDULE_INNER_CARD_BODY }}
        >
          <Flex vertical gap={12}>
            <Select
              placeholder="Pilih shift jadwal"
              options={groupOptions}
              value={selectedGroup ? Number(selectedGroup.id) : undefined}
              onChange={onSelectGroup}
              style={{ width: "100%", maxWidth: "100%" }}
            />

            {selectedGroup ? (
              <Flex vertical gap={8}>
                <Space wrap>
                  <Tag
                    color={selectedGroup.is_default ? "blue" : "orange"}
                    style={SCHEDULE_TAG_STYLE}
                  >
                    {selectedGroup.is_default ? "Utama" : "Tambahan"}
                  </Tag>
                  <Tag color="geekblue" style={SCHEDULE_TAG_STYLE}>
                    {selectedGroup.class_count ||
                      selectedGroupClasses.length ||
                      0}{" "}
                    kelas
                  </Tag>
                </Space>
                <Text strong>{selectedGroup.name}</Text>
                <Text type="secondary">
                  {selectedGroup.description || "Belum ada deskripsi shift."}
                </Text>
                {(selectedGroupClasses || []).length > 0 ? (
                  <Space size={[8, 8]} wrap>
                    {selectedGroupClasses.map((item) => (
                      <Tag key={item.class_id} icon={<UsersRound size={12} />}>
                        {item.grade_name
                          ? `${item.grade_name} - ${item.class_name}`
                          : item.class_name}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Alert
                    showIcon
                    type="warning"
                    title="Belum ada kelas di shift ini"
                    description="Tambahkan kelas ke shift ini agar penyusunan jadwal final punya ruang kerja yang jelas."
                  />
                )}
              </Flex>
            ) : (
              <Empty description="Belum ada shift jadwal." />
            )}
          </Flex>
        </Card>

        <Card
          size="small"
          title="Ringkasan Sesi Tersedia"
          style={SCHEDULE_INNER_CARD_STYLE}
          styles={{ body: SCHEDULE_INNER_CARD_BODY }}
        >
          <Space size={[8, 8]} wrap>
            <Tag color="blue" style={SCHEDULE_TAG_STYLE}>
              Slot group ini: {scheduleCapacity?.total_configured_slots || 0}
            </Tag>
            <Tag color="geekblue" style={SCHEDULE_TAG_STYLE}>
              Kelas aktif: {scheduleCapacity?.active_class_count || 0}
            </Tag>
            <Tag color="green" style={SCHEDULE_TAG_STYLE}>
              Total sesi tersedia:{" "}
              {scheduleCapacity?.total_available_sessions || 0}
            </Tag>
            <Tag color="gold" style={SCHEDULE_TAG_STYLE}>
              Dipakai kegiatan: {scheduleCapacity?.total_activity_sessions || 0}
            </Tag>
            <Tag
              style={SCHEDULE_TAG_STYLE}
              color={
                Number(scheduleCapacity?.remaining_sessions || 0) >= 0
                  ? "cyan"
                  : "red"
              }
            >
              Sisa sesi bersih: {scheduleCapacity?.remaining_sessions || 0}
            </Tag>
          </Space>
        </Card>

        <Card
          size="small"
          title={`Jadwal Per Hari${selectedGroup ? ` - ${selectedGroup.name}` : ""}`}
          extra={
            canManage ? (
              <Button
                type="primary"
                icon={<Plus size={14} />}
                onClick={openCreateDay}
                disabled={!selectedGroup}
                size="small"
              >
                Hari
              </Button>
            ) : null
          }
          style={SCHEDULE_INNER_CARD_STYLE}
        >
          {selectedGroup ? (
            dayRows.length > 0 ? (
              <Table
                rowKey={(record) => String(record.day_of_week)}
                size="small"
                columns={columns}
                dataSource={dayRows}
                pagination={false}
                scroll={{ x: isMobile ? 920 : 760 }}
              />
            ) : (
              <Empty description="Belum ada hari yang dikonfigurasi untuk shift ini." />
            )
          ) : (
            <Empty description="Pilih shift jadwal terlebih dahulu." />
          )}
        </Card>

        {!canManage ? (
          <Text type="secondary">
            Anda hanya dapat melihat konfigurasi. Hubungi admin satuan untuk
            perubahan.
          </Text>
        ) : null}
      </Flex>

      <Modal
        open={groupModalOpen}
        title={editingGroup ? "Ubah Shift Jadwal" : "Tambah Shift Jadwal"}
        onCancel={() => {
          setGroupModalOpen(false);
          setEditingGroup(null);
          groupForm.resetFields();
        }}
        onOk={handleSaveGroup}
        okText="Simpan"
        confirmLoading={loading}
        width={720}
      >
        <Form form={groupForm} layout="vertical">
          <Form.Item
            name="name"
            label="Nama Shift"
            rules={[{ required: true, message: "Nama shift wajib diisi." }]}
          >
            <Input placeholder="Contoh: Shift Pagi" />
          </Form.Item>
          <Form.Item name="description" label="Deskripsi">
            <Input.TextArea
              rows={3}
              placeholder="Contoh: Kelas yang belajar pada sesi pagi."
            />
          </Form.Item>
          <Form.Item
            name="class_ids"
            label="Kelas dalam Shift"
            rules={[{ required: true, message: "Pilih minimal satu kelas." }]}
          >
            <Select
              mode="multiple"
              options={classOptions}
              placeholder="Pilih kelas untuk shift ini"
              showSearch={{ optionFilterProp: "label" }}
              allowClear
              virtual={false}
            />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={dayModalOpen}
        title={
          editingDayIndex !== null ? "Ubah Jadwal Hari" : "Tambah Jadwal Hari"
        }
        onCancel={closeDayModal}
        onOk={handleSaveDay}
        okText="Simpan"
        confirmLoading={loading}
        width={820}
      >
        {hasActivityUsage ? (
          <Alert
            showIcon
            type="warning"
            style={{ marginBottom: 16 }}
            title="Simpan akan menghapus ulang slot"
            description="Kegiatan yang memakai slot shift ini akan dihapus. Jadwal final tidak ikut berubah jika masih ada."
          />
        ) : null}

        <Form form={dayForm} layout="vertical">
          <Form.Item
            name="day_of_week"
            label="Hari"
            rules={[{ required: true, message: "Hari wajib diisi." }]}
            style={{ maxWidth: 240 }}
          >
            <Select options={DAY_OPTIONS} />
          </Form.Item>

          <Divider style={{ margin: "8px 0 16px" }} />

          <Form.List name="slots">
            {(fields, { add, remove }) => (
              <Flex vertical gap={10}>
                <Flex justify="space-between" align="center">
                  <Text strong>Jam Pelajaran</Text>
                  <Button
                    type="dashed"
                    icon={<Plus size={14} />}
                    onClick={() => {
                      const currentSlots = dayForm.getFieldValue("slots") || [];
                      const lastSlot = currentSlots[currentSlots.length - 1];
                      const nextStart = lastSlot?.end_time || null;
                      add({
                        start_time: nextStart,
                        end_time: nextStart
                          ? nextStart.add(40, "minute")
                          : null,
                      });
                    }}
                  >
                    Tambah Jam
                  </Button>
                </Flex>

                {fields.length > 0 ? (
                  fields.map((field, index) => (
                    <Card
                      key={field.key}
                      size="small"
                      style={{ borderRadius: 10 }}
                    >
                      <Flex gap={8} wrap="wrap" align="end">
                        <Text style={{ minWidth: 72, paddingBottom: 8 }}>
                          Jam ke-{index + 1}
                        </Text>
                        <Form.Item
                          name={[field.name, "start_time"]}
                          label="Mulai"
                          rules={[
                            {
                              required: true,
                              message: "Jam mulai wajib diisi.",
                            },
                          ]}
                          style={{ flex: "1 1 150px", marginBottom: 0 }}
                        >
                          <TimePicker
                            format="HH:mm"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "end_time"]}
                          label="Selesai"
                          dependencies={[
                            ["slots", field.name, "start_time"],
                          ]}
                          rules={[
                            {
                              required: true,
                              message: "Jam selesai wajib diisi.",
                            },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                const startValue = getFieldValue([
                                  "slots",
                                  field.name,
                                  "start_time",
                                ]);
                                if (
                                  !startValue ||
                                  !value ||
                                  value.isAfter(startValue)
                                ) {
                                  return Promise.resolve();
                                }
                                return Promise.reject(
                                  new Error(
                                    "Jam selesai harus lebih besar dari jam mulai.",
                                  ),
                                );
                              },
                            }),
                          ]}
                          style={{ flex: "1 1 150px", marginBottom: 0 }}
                        >
                          <TimePicker
                            format="HH:mm"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <Button
                          type="text"
                          danger
                          icon={<Trash2 size={14} />}
                          disabled={fields.length <= 1}
                          onClick={() => remove(field.name)}
                        />
                      </Flex>
                    </Card>
                  ))
                ) : (
                  <Text type="secondary">Belum ada jam pelajaran.</Text>
                )}
              </Flex>
            )}
          </Form.List>

          <Divider style={{ margin: "16px 0" }} />

          <Form.List name="breaks">
            {(fields, { add, remove }) => (
              <Flex vertical gap={10}>
                <Flex justify="space-between" align="center">
                  <Text strong>Waktu Istirahat</Text>
                  <Button
                    type="dashed"
                    icon={<Plus size={14} />}
                    onClick={() => add({ label: "Istirahat" })}
                  >
                    Tambah Istirahat
                  </Button>
                </Flex>

                {fields.length > 0 ? (
                  fields.map((field) => (
                    <Card
                      key={field.key}
                      size="small"
                      style={{ borderRadius: 10 }}
                    >
                      <Flex gap={8} wrap="wrap" align="end">
                        <Form.Item
                          name={[field.name, "label"]}
                          label="Label"
                          style={{ flex: "1 1 180px", marginBottom: 0 }}
                        >
                          <Input placeholder="Contoh: Istirahat 1" />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "break_start"]}
                          label="Mulai"
                          dependencies={[["breaks", field.name, "break_end"]]}
                          rules={[
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                const endValue = getFieldValue([
                                  "breaks",
                                  field.name,
                                  "break_end",
                                ]);
                                if (!value && !endValue)
                                  return Promise.resolve();
                                if (!value || !endValue) {
                                  return Promise.reject(
                                    new Error(
                                      "Jam istirahat harus diisi berpasangan.",
                                    ),
                                  );
                                }
                                return Promise.resolve();
                              },
                            }),
                          ]}
                          style={{ flex: "1 1 150px", marginBottom: 0 }}
                        >
                          <TimePicker
                            format="HH:mm"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "break_end"]}
                          label="Selesai"
                          dependencies={[
                            ["breaks", field.name, "break_start"],
                          ]}
                          rules={[
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                const startValue = getFieldValue([
                                  "breaks",
                                  field.name,
                                  "break_start",
                                ]);
                                if (!value && !startValue)
                                  return Promise.resolve();
                                if (!value || !startValue) {
                                  return Promise.reject(
                                    new Error(
                                      "Jam istirahat harus diisi berpasangan.",
                                    ),
                                  );
                                }
                                if (!value.isAfter(startValue)) {
                                  return Promise.reject(
                                    new Error(
                                      "Jam selesai istirahat harus lebih besar dari jam mulai.",
                                    ),
                                  );
                                }
                                return Promise.resolve();
                              },
                            }),
                          ]}
                          style={{ flex: "1 1 150px", marginBottom: 0 }}
                        >
                          <TimePicker
                            format="HH:mm"
                            style={{ width: "100%" }}
                          />
                        </Form.Item>
                        <Button
                          type="text"
                          danger
                          icon={<Trash2 size={14} />}
                          onClick={() => remove(field.name)}
                        />
                      </Flex>
                    </Card>
                  ))
                ) : (
                  <Text type="secondary">Belum ada waktu istirahat.</Text>
                )}
              </Flex>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleConfigCard;
