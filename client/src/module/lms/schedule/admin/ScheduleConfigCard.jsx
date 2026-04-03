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
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  TimePicker,
  Typography,
} from "antd";
import { CalendarClock, Pencil, Plus, Save, Trash2 } from "lucide-react";

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

const normalizeDayRows = (dayTemplates, breaks) =>
  (dayTemplates || [])
    .map((dayItem) => ({
      day_of_week: Number(dayItem.day_of_week),
      start_time: toDayjsTime(dayItem.start_time),
      end_time: toDayjsTime(dayItem.end_time),
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
  dayTemplates,
  breaks,
  scheduleCapacity,
  sessionShortages,
  onSave,
  loading,
}) => {
  const [sessionForm] = Form.useForm();
  const [dayForm] = Form.useForm();
  const [dayRows, setDayRows] = useState([]);
  const [dayModalOpen, setDayModalOpen] = useState(false);
  const [editingDayIndex, setEditingDayIndex] = useState(null);

  const normalizedDays = useMemo(
    () => normalizeDayRows(dayTemplates, breaks),
    [dayTemplates, breaks],
  );

  useEffect(() => {
    sessionForm.setFieldsValue({
      session_minutes: config?.session_minutes || 40,
    });
    setDayRows(normalizedDays);
  }, [config?.session_minutes, normalizedDays, sessionForm]);

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

  const handleSaveDay = async () => {
    const values = await dayForm.validateFields();
    const normalizedRow = {
      day_of_week: values.day_of_week,
      start_time: values.start_time,
      end_time: values.end_time,
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

    setDayRows((prev) => {
      const nextRows = [...prev];
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

      return nextRows.sort(
        (left, right) => left.day_of_week - right.day_of_week,
      );
    });

    closeDayModal();
  };

  const handleDeleteDay = (index) => {
    setDayRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSubmit = async () => {
    if (!canManage) return;
    const values = await sessionForm.validateFields();
    const payload = {
      session_minutes: values.session_minutes,
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
      days: dayRows.map((item) => ({
        day_of_week: item.day_of_week,
        is_school_day: true,
        start_time: item.start_time?.format("HH:mm"),
        end_time: item.end_time?.format("HH:mm"),
        breaks: (item.breaks || []).map((rest) => ({
          label: rest.label || "Istirahat",
          break_start: rest.break_start?.format("HH:mm"),
          break_end: rest.break_end?.format("HH:mm"),
        })),
      })),
    };
    await onSave(payload);
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
      extra={
        <Tag color="blue">
          Durasi sesi: {config?.session_minutes || 40} menit
        </Tag>
      }
    >
      <Flex vertical gap={16}>
        <Form form={sessionForm} layout="vertical">
          <Form.Item
            label="Durasi sesi (menit)"
            name="session_minutes"
            rules={[{ required: true, message: "Durasi sesi wajib diisi." }]}
            style={{ maxWidth: 260, marginBottom: 0 }}
          >
            <InputNumber min={20} max={120} style={{ width: "100%" }} />
          </Form.Item>
        </Form>

        <Text type="secondary">
          Buat jadwal per hari. Setiap hari dapat memiliki jam mulai, jam
          selesai, dan beberapa waktu istirahat.
        </Text>

        <Card
          size="small"
          title="Ringkasan Sesi Tersedia"
          style={{ borderRadius: 12 }}
        >
          <Space size={[8, 8]} wrap>
            <Tag color="blue">
              Slot aktif per minggu:{" "}
              {scheduleCapacity?.total_configured_slots || 0}
            </Tag>
            <Tag color="geekblue">
              Total kelas: {scheduleCapacity?.total_classes || 0}
            </Tag>
            <Tag color="green">
              Total sesi tersedia:{" "}
              {scheduleCapacity?.total_available_sessions || 0}
            </Tag>
          </Space>
        </Card>

        {(sessionShortages || []).length > 0 ? (
          <Alert
            showIcon
            type="warning"
            message={`Masih ada ${(sessionShortages || []).length} beban ajar yang kekurangan sesi`}
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
          title="Jadwal Per Hari"
          extra={
            canManage ? (
              <Button
                type="primary"
                icon={<Plus size={14} />}
                onClick={openCreateDay}
              >
                Tambah Hari
              </Button>
            ) : null
          }
          style={{ borderRadius: 12 }}
        >
          {dayRows.length > 0 ? (
            <Table
              rowKey={(record) => String(record.day_of_week)}
              size="small"
              columns={columns}
              dataSource={dayRows}
              pagination={false}
              scroll={{ x: 720 }}
            />
          ) : (
            <Empty description="Belum ada hari yang dikonfigurasi." />
          )}
        </Card>

        {!canManage ? (
          <Text type="secondary">
            Anda hanya dapat melihat konfigurasi. Hubungi admin satuan untuk
            perubahan.
          </Text>
        ) : (
          <Button
            type="primary"
            loading={loading}
            icon={<Save size={14} />}
            onClick={handleSubmit}
            disabled={dayRows.length === 0}
          >
            Simpan Konfigurasi
          </Button>
        )}
      </Flex>

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
                      new Error(
                        "Jam selesai harus lebih besar dari jam mulai.",
                      ),
                    );
                  },
                }),
              ]}
              style={{ flex: "1 1 180px" }}
            >
              <TimePicker format="HH:mm" style={{ width: "100%" }} />
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
                          dependencies={[["breaks", field.name, "break_start"]]}
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
