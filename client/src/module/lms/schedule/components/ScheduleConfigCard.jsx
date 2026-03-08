import React, { useEffect, useMemo } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  TimePicker,
  Typography,
} from "antd";
import { CalendarClock, Plus, Save, Trash2 } from "lucide-react";

const { Title, Text } = Typography;

const DAY_OPTIONS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 7, label: "Minggu" },
];

const defaultDayRows = DAY_OPTIONS.filter((item) => item.value <= 6).map(
  (item) => ({
    day_of_week: item.value,
    is_school_day: true,
    start_time: dayjs("2000-01-01 07:00"),
    end_time: dayjs("2000-01-01 15:00"),
    breaks: [
      {
        label: "Istirahat 1",
        break_start: dayjs("2000-01-01 09:30"),
        break_end: dayjs("2000-01-01 10:00"),
      },
      {
        label: "Istirahat 2",
        break_start: dayjs("2000-01-01 14:30"),
        break_end: dayjs("2000-01-01 15:00"),
      },
    ],
  }),
);

const toDayjsTime = (value) => {
  if (!value) return null;
  const raw = String(value).slice(0, 5);
  return dayjs(`2000-01-01 ${raw}`);
};

const normalizeFormValues = (config, dayTemplates, breaks) => {
  if (!config || !dayTemplates?.length) {
    return {
      session_minutes: 40,
      max_sessions_per_meeting: 2,
      require_different_days_if_over_max: true,
      allow_same_day_multiple_meetings: true,
      minimum_gap_slots: 4,
      days: defaultDayRows,
    };
  }

  return {
    session_minutes: config.session_minutes || 40,
    max_sessions_per_meeting: config.max_sessions_per_meeting || 2,
    require_different_days_if_over_max:
      config.require_different_days_if_over_max ?? true,
    allow_same_day_multiple_meetings:
      config.allow_same_day_multiple_meetings ?? true,
    minimum_gap_slots: config.minimum_gap_slots ?? 4,
    days: dayTemplates.map((dayItem) => ({
      day_of_week: dayItem.day_of_week,
      is_school_day: dayItem.is_school_day,
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
    })),
  };
};

const ScheduleConfigCard = ({
  canManage,
  config,
  dayTemplates,
  breaks,
  onSave,
  loading,
}) => {
  const [form] = Form.useForm();

  const initialValues = useMemo(
    () => normalizeFormValues(config, dayTemplates, breaks),
    [config, dayTemplates, breaks],
  );

  useEffect(() => {
    form.setFieldsValue(initialValues);
  }, [form, initialValues]);

  const handleSubmit = async (values) => {
    if (!canManage) return;
    const payload = {
      session_minutes: values.session_minutes,
      max_sessions_per_meeting: values.max_sessions_per_meeting,
      require_different_days_if_over_max:
        values.require_different_days_if_over_max,
      allow_same_day_multiple_meetings: values.allow_same_day_multiple_meetings,
      minimum_gap_slots: values.minimum_gap_slots,
      days: (values.days || [])
        .filter(
          (item) => item?.day_of_week && item?.start_time && item?.end_time,
        )
        .map((item) => ({
          day_of_week: item.day_of_week,
          is_school_day: item.is_school_day !== false,
          start_time: item.start_time?.format("HH:mm"),
          end_time: item.end_time?.format("HH:mm"),
          breaks: (item.breaks || [])
            .filter((rest) => rest.break_start && rest.break_end)
            .map((rest) => ({
              label: rest.label || "Istirahat",
              break_start: rest.break_start?.format("HH:mm"),
              break_end: rest.break_end?.format("HH:mm"),
            })),
        })),
    };
    await onSave(payload);
  };

  return (
    <Card
      style={{ borderRadius: 16 }}
      styles={{ body: { padding: 20 } }}
      title={
        <Space>
          <CalendarClock size={18} />
          <span>Konfigurasi Slot Jadwal</span>
        </Space>
      }
      extra={
        <Tag color='blue'>
          Durasi sesi:{" "}
          {config?.session_minutes || initialValues.session_minutes} menit
        </Tag>
      }
    >
      <Form form={form} layout='vertical' onFinish={handleSubmit}>
        <Row gutter={12}>
          <Col xs={24} md={6}>
            <Form.Item
              label='Durasi sesi (menit)'
              name='session_minutes'
              rules={[{ required: true }]}
            >
              <InputNumber min={20} max={120} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              label='Maks sesi/pertemuan'
              name='max_sessions_per_meeting'
              rules={[{ required: true }]}
            >
              <InputNumber min={1} max={4} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Form.Item
              label='Minimal jeda antar pertemuan'
              name='minimum_gap_slots'
            >
              <InputNumber min={0} max={10} style={{ width: "100%" }} />
            </Form.Item>
          </Col>
          <Col xs={24} md={6}>
            <Flex vertical gap={8} style={{ marginTop: 30 }}>
              <Form.Item
                name='require_different_days_if_over_max'
                valuePropName='checked'
                noStyle
              >
                <Switch
                  checkedChildren='Pisah Hari'
                  unCheckedChildren='Boleh Sama Hari'
                />
              </Form.Item>
              <Form.Item
                name='allow_same_day_multiple_meetings'
                valuePropName='checked'
                noStyle
              >
                <Switch
                  checkedChildren='Aktif Gap Hari Sama'
                  unCheckedChildren='Gap Nonaktif'
                />
              </Form.Item>
            </Flex>
          </Col>
        </Row>

        <Divider style={{ margin: "10px 0 16px" }} />

        <Form.List name='days'>
          {(dayFields, { add, remove }) => (
            <Flex vertical gap={12}>
              {dayFields.map((dayField) => (
                <Card
                  key={dayField.key}
                  size='small'
                  style={{ borderRadius: 12, border: "1px solid #f0f0f0" }}
                  title={
                    <Space wrap>
                      <Form.Item
                        name={[dayField.name, "day_of_week"]}
                        rules={[{ required: true }]}
                        style={{ marginBottom: 0, minWidth: 140 }}
                      >
                        <Select options={DAY_OPTIONS} />
                      </Form.Item>
                      <Form.Item
                        name={[dayField.name, "is_school_day"]}
                        valuePropName='checked'
                        style={{ marginBottom: 0 }}
                      >
                        <Switch
                          checkedChildren='Aktif'
                          unCheckedChildren='Libur'
                        />
                      </Form.Item>
                    </Space>
                  }
                  extra={
                    canManage ? (
                      <Button
                        type='text'
                        danger
                        icon={<Trash2 size={14} />}
                        onClick={() => remove(dayField.name)}
                      />
                    ) : null
                  }
                >
                  <Row gutter={12}>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label='Jam mulai'
                        name={[dayField.name, "start_time"]}
                        rules={[{ required: true }]}
                      >
                        <TimePicker format='HH:mm' style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label='Jam selesai'
                        name={[dayField.name, "end_time"]}
                        rules={[{ required: true }]}
                      >
                        <TimePicker format='HH:mm' style={{ width: "100%" }} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.List name={[dayField.name, "breaks"]}>
                    {(breakFields, breakOp) => (
                      <Flex vertical gap={8}>
                        {breakFields.map((breakField) => (
                          <Row gutter={8} key={breakField.key} align='middle'>
                            <Col xs={24} md={8}>
                              <Form.Item
                                name={[breakField.name, "label"]}
                                style={{ marginBottom: 0 }}
                              >
                                <Input placeholder='Label istirahat' />
                              </Form.Item>
                            </Col>
                            <Col xs={12} md={7}>
                              <Form.Item
                                name={[breakField.name, "break_start"]}
                                style={{ marginBottom: 0 }}
                              >
                                <TimePicker
                                  format='HH:mm'
                                  style={{ width: "100%" }}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={12} md={7}>
                              <Form.Item
                                name={[breakField.name, "break_end"]}
                                style={{ marginBottom: 0 }}
                              >
                                <TimePicker
                                  format='HH:mm'
                                  style={{ width: "100%" }}
                                />
                              </Form.Item>
                            </Col>
                            <Col xs={24} md={2}>
                              <Button
                                type='text'
                                danger
                                icon={<Trash2 size={14} />}
                                onClick={() => breakOp.remove(breakField.name)}
                              />
                            </Col>
                          </Row>
                        ))}
                        {canManage ? (
                          <Button
                            type='dashed'
                            block
                            icon={<Plus size={14} />}
                            onClick={() => breakOp.add({ label: "Istirahat" })}
                          >
                            Tambah Istirahat
                          </Button>
                        ) : null}
                      </Flex>
                    )}
                  </Form.List>
                </Card>
              ))}

              {canManage ? (
                <Button
                  type='dashed'
                  icon={<Plus size={14} />}
                  onClick={() => add(defaultDayRows[0])}
                >
                  Tambah Hari
                </Button>
              ) : null}
            </Flex>
          )}
        </Form.List>

        <Divider />

        {!canManage ? (
          <Text type='secondary'>
            Anda hanya dapat melihat konfigurasi. Hubungi admin satuan untuk
            perubahan.
          </Text>
        ) : (
          <Button
            type='primary'
            htmlType='submit'
            loading={loading}
            icon={<Save size={14} />}
          >
            Simpan Konfigurasi
          </Button>
        )}
      </Form>
    </Card>
  );
};

export default ScheduleConfigCard;
