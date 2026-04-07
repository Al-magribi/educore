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
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  TimePicker,
  Typography,
} from "antd";
import { CalendarClock, Pencil, Plus, Trash2, UsersRound } from "lucide-react";

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

const SESSION_DURATION_OPTIONS = [30, 35, 40, 45, 50, 60].map((value) => ({
  value,
  label: `${value} menit`,
}));

const DEFAULT_CONFIG_RULES = {
  max_sessions_per_meeting: 2,
  require_different_days_if_over_max: true,
  allow_same_day_multiple_meetings: true,
  minimum_gap_slots: 4,
};

const buildDefaultDay = () => ({
  day_of_week: undefined,
  start_time: dayjs("2000-01-01 07:00"),
  end_time: dayjs("2000-01-01 15:00"),
  session_minutes: 40,
  breaks: [
    {
      label: "Istirahat 1",
      break_start: dayjs("2000-01-01 09:30"),
      break_end: dayjs("2000-01-01 10:00"),
    },
  ],
});

const toDayjsTime = (value) => {
  if (!value) return null;
  const raw = String(value).slice(0, 5);
  return dayjs(`2000-01-01 ${raw}`);
};

const normalizeDayRows = (dayTemplates, breaks, config) =>
  (dayTemplates || [])
    .map((dayItem) => ({
      day_of_week: Number(dayItem.day_of_week),
      start_time: toDayjsTime(dayItem.start_time),
      end_time: toDayjsTime(dayItem.end_time),
      session_minutes:
        Number(dayItem.session_minutes) || Number(config?.session_minutes) || 40,
      breaks: (breaks || [])
        .filter(
          (item) => Number(item.day_of_week) === Number(dayItem.day_of_week),
        )
        .map((item) => ({
          label: item.label || "Istirahat",
          break_start: toDayjsTime(item.break_start),
          break_end: toDayjsTime(item.break_end),
        })),
    }))
    .sort((left, right) => left.day_of_week - right.day_of_week);

const formatTime = (value) => (value ? value.format("HH:mm") : "-");

const dayLabelMap = DAY_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const ScheduleConfigCard = ({
  canManage,
  config,
  groups,
  selectedGroup,
  selectedGroupClasses,
  classes,
  dayTemplates,
  breaks,
  scheduleCapacity,
  sessionShortages,
  onSave,
  onSaveGroup,
  onSelectGroup,
  loading,
}) => {
  const [dayForm] = Form.useForm();
  const [groupForm] = Form.useForm();
  const [dayRows, setDayRows] = useState([]);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  const normalizedDays = useMemo(
    () => normalizeDayRows(dayTemplates, breaks, config),
    [breaks, config, dayTemplates],
  );

  useEffect(() => {
    setDayRows(normalizedDays);
  }, [normalizedDays]);

  const classOptions = useMemo(
    () =>
      (classes || []).map((item) => ({
        value: Number(item.id),
        label: item.grade_name ? `${item.grade_name} - ${item.name}` : item.name,
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

  const buildPayload = (rows) => ({
    config_group_id: selectedGroup?.id,
    session_minutes:
      Number(rows?.[0]?.session_minutes) ||
      Number(config?.session_minutes) ||
      40,
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
      start_time: item.start_time?.format("HH:mm"),
      end_time: item.end_time?.format("HH:mm"),
      session_minutes: Number(item.session_minutes) || 40,
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
      start_time: record.start_time,
      end_time: record.end_time,
      session_minutes: record.session_minutes || 40,
      breaks:
        record.breaks?.length > 0
          ? record.breaks
          : [
              {
                label: "Istirahat",
                break_start: null,
                break_end: null,
              },
            ],
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
      name: "",
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
      class_ids: (selectedGroupClasses || []).map((item) => Number(item.class_id)),
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

  const handleSaveDay = async () => {
    const values = await dayForm.validateFields();
    const normalizedRow = {
      day_of_week: values.day_of_week,
      start_time: values.start_time,
      end_time: values.end_time,
      session_minutes: Number(values.session_minutes) || 40,
      breaks: (values.breaks || [])
        .filter((item) => item?.break_start && item?.break_end)
        .map((item) => ({
          label: item.label || "Istirahat",
          break_start: item.break_start,
          break_end: item.break_end,
        }))
        .sort(
          (left, right) =>
            left.break_start.valueOf() - right.break_start.valueOf(),
        ),
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

    const sortedRows = nextRows.sort(
      (left, right) => left.day_of_week - right.day_of_week,
    );

    await onSave(buildPayload(sortedRows));
    setDayRows(sortedRows);
    closeDayModal();
  };

  const handleDeleteDay = async (index) => {
    const nextRows = dayRows.filter((_, rowIndex) => rowIndex !== index);
    await onSave(buildPayload(nextRows));
    setDayRows(nextRows);
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
      title: "Durasi Sesi",
      dataIndex: "session_minutes",
      key: "session_minutes",
      width: 130,
      render: (value) => `${value || 0} menit`,
    },
    {
      title: "Jam Belajar",
      key: "study_time",
      width: 180,
      render: (_, record) =>
        `${formatTime(record.start_time)} - ${formatTime(record.end_time)}`,
    },
    {
      title: "Istirahat",
      key: "breaks",
      render: (_, record) =>
        record.breaks?.length ? (
          <Space size={[6, 6]} wrap>
            {record.breaks.map((item, index) => (
              <Tag key={`${record.day_of_week}-${index}`} color="gold">
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
            <Button
              type="text"
              danger
              loading={loading}
              disabled={dayRows.length <= 1}
              icon={<Trash2 size={14} />}
              onClick={() => handleDeleteDay(index)}
            />
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
          <CalendarClock size={18} />
          <span>Konfigurasi Jadwal</span>
        </Space>
      }
    >
      <Flex vertical gap={16}>
        <Text type="secondary">
          Setiap jadwal dapat memiliki beberapa group kelas. Setiap group
          mempunyai pola hari, jam belajar, durasi sesi, dan istirahat yang
          berbeda.
        </Text>

        <Card
          size="small"
          title="Group Waktu"
          extra={
            canManage ? (
              <Space>
                <Button icon={<Pencil size={14} />} onClick={openEditGroup} disabled={!selectedGroup}>
                  Ubah Group
                </Button>
                <Button type="primary" icon={<Plus size={14} />} onClick={openCreateGroup}>
                  Tambah Group
                </Button>
              </Space>
            ) : null
          }
          style={{ borderRadius: 12 }}
        >
          <Flex vertical gap={12}>
            <Select
              placeholder="Pilih group jadwal"
              options={groupOptions}
              value={selectedGroup ? Number(selectedGroup.id) : undefined}
              onChange={onSelectGroup}
            />

            {selectedGroup ? (
              <Flex vertical gap={8}>
                <Space wrap>
                  <Tag color={selectedGroup.is_default ? "blue" : "purple"}>
                    {selectedGroup.is_default ? "Default" : "Custom"}
                  </Tag>
                  <Tag color="geekblue">
                    {selectedGroup.class_count || selectedGroupClasses.length || 0} kelas
                  </Tag>
                </Space>
                <Text strong>{selectedGroup.name}</Text>
                <Text type="secondary">
                  {selectedGroup.description || "Belum ada deskripsi group."}
                </Text>
                {(selectedGroupClasses || []).length > 0 ? (
                  <Space size={[8, 8]} wrap>
                    {selectedGroupClasses.map((item) => (
                      <Tag key={item.class_id} icon={<UsersRound size={12} />}>
                        {item.grade_name ? `${item.grade_name} - ${item.class_name}` : item.class_name}
                      </Tag>
                    ))}
                  </Space>
                ) : (
                  <Alert
                    showIcon
                    type="warning"
                    message="Belum ada kelas di group ini"
                    description="Tambahkan kelas ke group agar nantinya bisa dipakai pada generator group-aware."
                  />
                )}
              </Flex>
            ) : (
              <Empty description="Belum ada group jadwal." />
            )}
          </Flex>
        </Card>

        <Card
          size="small"
          title="Ringkasan Sesi Tersedia"
          style={{ borderRadius: 12 }}
        >
          <Space size={[8, 8]} wrap>
            <Tag color="blue">
              Slot group ini: {scheduleCapacity?.total_configured_slots || 0}
            </Tag>
            <Tag color="geekblue">
              Kelas aktif: {scheduleCapacity?.active_class_count || 0}
            </Tag>
            <Tag color="green">
              Total sesi tersedia: {scheduleCapacity?.total_available_sessions || 0}
            </Tag>
            <Tag color="gold">
              Dipakai kegiatan: {scheduleCapacity?.total_activity_sessions || 0}
            </Tag>
            <Tag
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

        {(sessionShortages || []).length > 0 ? (
          <Alert
            showIcon
            type="warning"
            title={`Masih ada ${(sessionShortages || []).length} beban ajar yang kekurangan sesi`}
            description={`${sessionShortages
              .slice(0, 2)
              .map(
                (item) =>
                  `${item.teacher_name} - ${item.subject_name} ${item.class_name}: kurang ${item.missing_sessions} sesi`,
              )
              .join(" | ")}${
              sessionShortages.length > 2
                ? " | Cek tab Beban Ajar/Jadwal Final untuk detail."
                : ""
            }`}
          />
        ) : null}

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
              >
                Tambah Hari
              </Button>
            ) : null
          }
          style={{ borderRadius: 12 }}
        >
          {selectedGroup ? (
            dayRows.length > 0 ? (
              <Table
                rowKey={(record) => String(record.day_of_week)}
                size="small"
                columns={columns}
                dataSource={dayRows}
                pagination={false}
                scroll={{ x: 760 }}
              />
            ) : (
              <Empty description="Belum ada hari yang dikonfigurasi untuk group ini." />
            )
          ) : (
            <Empty description="Pilih group jadwal terlebih dahulu." />
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
        title={editingGroup ? "Ubah Group Jadwal" : "Tambah Group Jadwal"}
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
            label="Nama Group"
            rules={[{ required: true, message: "Nama group wajib diisi." }]}
          >
            <Input placeholder="Contoh: Shift Pagi Kelas 7-8" />
          </Form.Item>
          <Form.Item name="description" label="Deskripsi">
            <Input.TextArea
              rows={3}
              placeholder="Contoh: Senin-Rabu pagi, Kamis-Sabtu siang."
            />
          </Form.Item>
          <Form.Item
            name="class_ids"
            label="Kelas dalam Group"
            rules={[{ required: true, message: "Pilih minimal satu kelas." }]}
          >
            <Select
              mode="multiple"
              options={classOptions}
              placeholder="Pilih kelas untuk group ini"
              optionFilterProp="label"
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
        width={760}
      >
        <Form form={dayForm} layout="vertical">
          <Flex gap={12} wrap="wrap">
            <Form.Item
              name="day_of_week"
              label="Hari"
              rules={[{ required: true, message: "Hari wajib diisi." }]}
              style={{ flex: "1 1 180px" }}
            >
              <Select options={DAY_OPTIONS} />
            </Form.Item>
            <Form.Item
              name="start_time"
              label="Jam mulai"
              rules={[{ required: true, message: "Jam mulai wajib diisi." }]}
              style={{ flex: "1 1 180px" }}
            >
              <TimePicker format="HH:mm" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="end_time"
              label="Jam selesai"
              rules={[
                { required: true, message: "Jam selesai wajib diisi." },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    const startValue = getFieldValue("start_time");
                    if (!startValue || !value || value.isAfter(startValue)) {
                      return Promise.resolve();
                    }
                    return Promise.reject(
                      new Error("Jam selesai harus lebih besar dari jam mulai."),
                    );
                  },
                }),
              ]}
              style={{ flex: "1 1 180px" }}
            >
              <TimePicker format="HH:mm" style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              name="session_minutes"
              label="Durasi per sesi (menit)"
              rules={[{ required: true, message: "Durasi sesi wajib diisi." }]}
              style={{ flex: "1 1 180px" }}
            >
              <Select options={SESSION_DURATION_OPTIONS} />
            </Form.Item>
          </Flex>

          <Divider style={{ margin: "8px 0 16px" }} />

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
                                if (!value && !endValue) return Promise.resolve();
                                if (!value || !endValue) {
                                  return Promise.reject(
                                    new Error("Jam istirahat harus diisi berpasangan."),
                                  );
                                }
                                return Promise.resolve();
                              },
                            }),
                          ]}
                          style={{ flex: "1 1 150px", marginBottom: 0 }}
                        >
                          <TimePicker format="HH:mm" style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item
                          name={[field.name, "break_end"]}
                          label="Selesai"
                          dependencies={[["breaks", field.name, "break_start"]]}
                          rules={[
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                const startValue = getFieldValue([
                                  "breaks",
                                  field.name,
                                  "break_start",
                                ]);
                                if (!value && !startValue) return Promise.resolve();
                                if (!value || !startValue) {
                                  return Promise.reject(
                                    new Error("Jam istirahat harus diisi berpasangan."),
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
                          <TimePicker format="HH:mm" style={{ width: "100%" }} />
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
