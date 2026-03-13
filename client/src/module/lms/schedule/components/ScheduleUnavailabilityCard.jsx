import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  Flex,
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
];

const toDayjsTime = (value) => {
  if (!value) return null;
  const raw = String(value).slice(0, 5);
  return dayjs(`2000-01-01 ${raw}`);
};

const buildEmptyEntry = () => ({
  day_of_week: undefined,
  start_time: null,
  end_time: null,
  reason: null,
  is_active: true,
});

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
    () =>
      (teachers || []).map((item) => ({
        value: item.id,
        label: item.full_name,
      })),
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

  const teacherRuleMap = useMemo(() => {
    return (rules || []).reduce((acc, item) => {
      const teacherId = item.teacher_id;
      if (!teacherId) return acc;
      if (!acc[teacherId]) {
        acc[teacherId] = [];
      }
      acc[teacherId].push(item);
      return acc;
    }, {});
  }, [rules]);

  const handleOpenCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      entries: [buildEmptyEntry()],
    });
    setOpenModal(true);
  };

  const handleOpenEdit = (record) => {
    const teacherRules = [
      ...(teacherRuleMap[record.teacher_id] || [record]),
    ].sort((left, right) => {
      const leftDay = left.day_of_week || 99;
      const rightDay = right.day_of_week || 99;
      if (leftDay !== rightDay) {
        return leftDay - rightDay;
      }
      return String(left.start_time || "").localeCompare(
        String(right.start_time || ""),
      );
    });

    setEditing({
      teacher_id: record.teacher_id,
      replace_ids: teacherRules.map((item) => item.id),
    });
    form.setFieldsValue({
      teacher_id: record.teacher_id,
      entries: teacherRules.map((item) => ({
        id: item.id,
        day_of_week: item.day_of_week,
        start_time: toDayjsTime(item.start_time),
        end_time: toDayjsTime(item.end_time),
        reason: item.reason,
        is_active: item.is_active,
      })),
    });
    setOpenModal(true);
  };

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSave({
      teacher_id: values.teacher_id,
      replace_ids: editing?.replace_ids || [],
      entries: (values.entries || []).map((item) => ({
        id: item.id,
        day_of_week: item.day_of_week,
        start_time: item.start_time ? item.start_time.format("HH:mm") : null,
        end_time: item.end_time ? item.end_time.format("HH:mm") : null,
        reason: item.reason || null,
        is_active: item.is_active ?? true,
      })),
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
      render: (value) => (
        <Tag color={value ? "green" : "default"}>
          {value ? "Aktif" : "Nonaktif"}
        </Tag>
      ),
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
            <Popconfirm
              title='Hapus ketentuan ini?'
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
          <Ban size={18} />
          <span>Ketentuan Guru Tidak Tersedia</span>
        </Space>
      }
      extra={
        canManage ? (
          <Button
            type='primary'
            icon={<Plus size={14} />}
            onClick={handleOpenCreate}
          >
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
        centered
        width={760}
        styles={{
          header: {
            position: "sticky",
            top: 0,
            zIndex: 2,
            background: "#fff",
            borderBottom: "1px solid #f0f0f0",
            paddingBottom: 16,
            marginBottom: 0,
          },
          body: {
            maxHeight: "70vh",
            overflowY: "auto",
            paddingTop: 20,
            paddingBottom: 20,
          },
          footer: {
            position: "sticky",
            bottom: 0,
            zIndex: 2,
            background: "#fff",
            borderTop: "1px solid #f0f0f0",
            paddingTop: 16,
            marginTop: 0,
          },
        }}
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            name='teacher_id'
            label='Guru'
            rules={[{ required: true }]}
          >
            <Select
              showSearch={{
                filterOption: (input, option) =>
                  String(option?.label || "")
                    .toLowerCase()
                    .includes(input.toLowerCase()),
              }}
              options={teacherOptions}
              virtual={false}
            />
          </Form.Item>
          <Form.List
            name='entries'
            rules={[
              {
                validator: async (_, value) => {
                  if (!value || value.length < 1) {
                    throw new Error("Minimal satu aturan hari wajib diisi.");
                  }
                },
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <Space
                direction='vertical'
                size='middle'
                style={{ width: "100%" }}
              >
                {fields.map((field, index) => (
                  <Card
                    key={field.key}
                    size='small'
                    title={`Hari ${index + 1}`}
                    extra={
                      fields.length > 1 ? (
                        <Button
                          type='text'
                          danger
                          icon={<Trash2 size={14} />}
                          onClick={() => remove(field.name)}
                        />
                      ) : null
                    }
                  >
                    <Form.Item name={[field.name, "id"]} hidden>
                      <Input />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "day_of_week"]}
                      label='Hari'
                      rules={[{ required: true, message: "Hari wajib diisi." }]}
                    >
                      <Select options={DAY_OPTIONS} />
                    </Form.Item>
                    <Flex gap='middle'>
                      <Form.Item
                        name={[field.name, "start_time"]}
                        label='Mulai'
                        style={{ width: "50%" }}
                      >
                        <TimePicker format='HH:mm' style={{ width: "100%" }} />
                      </Form.Item>
                      <Form.Item
                        name={[field.name, "end_time"]}
                        label='Selesai'
                        dependencies={[[field.name, "start_time"]]}
                        rules={[
                          ({ getFieldValue }) => ({
                            validator(_, value) {
                              const startValue = getFieldValue([
                                "entries",
                                field.name,
                                "start_time",
                              ]);

                              if (!startValue && !value) {
                                return Promise.resolve();
                              }

                              if (!startValue || !value) {
                                return Promise.reject(
                                  new Error(
                                    "Jam mulai dan selesai harus diisi berpasangan.",
                                  ),
                                );
                              }

                              if (
                                value.isSame(startValue) ||
                                value.isBefore(startValue)
                              ) {
                                return Promise.reject(
                                  new Error(
                                    "Jam selesai harus lebih besar dari jam mulai.",
                                  ),
                                );
                              }

                              return Promise.resolve();
                            },
                          }),
                        ]}
                        style={{ width: "50%" }}
                      >
                        <TimePicker format='HH:mm' style={{ width: "100%" }} />
                      </Form.Item>
                    </Flex>
                    <Form.Item name={[field.name, "reason"]} label='Alasan'>
                      <Input placeholder='Contoh: pembinaan / rapat / dll' />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "is_active"]}
                      valuePropName='checked'
                      initialValue={true}
                    >
                      <Switch
                        checkedChildren='Aktif'
                        unCheckedChildren='Nonaktif'
                      />
                    </Form.Item>
                  </Card>
                ))}

                <Button
                  type='dashed'
                  block
                  icon={<Plus size={14} />}
                  onClick={() => add(buildEmptyEntry())}
                >
                  Tambah Hari
                </Button>
                <Form.ErrorList errors={errors} />
              </Space>
            )}
          </Form.List>
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleUnavailabilityCard;
