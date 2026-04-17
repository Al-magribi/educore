import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
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

const formatTime = (value) => (value ? String(value).slice(0, 5) : "-");

const buildEmptyEntry = () => ({
  day_of_week: undefined,
  start_slot_no: undefined,
  end_slot_no: undefined,
  reason: null,
  is_active: true,
});

const getMatchedSlots = (daySlots, startTime, endTime) =>
  (daySlots || []).filter((slot) => {
    if (!startTime || !endTime) return false;
    const slotStart = formatTime(slot.start_time);
    const slotEnd = formatTime(slot.end_time);
    return slotStart >= formatTime(startTime) && slotEnd <= formatTime(endTime);
  });

const UnavailabilityEntryFields = ({
  field,
  index,
  fieldsLength,
  form,
  remove,
  slotByDay,
  availableDayOptions,
}) => {
  const selectedDay = Form.useWatch(
    ["entries", field.name, "day_of_week"],
    form,
  );
  const selectedStartSlot = Form.useWatch(
    ["entries", field.name, "start_slot_no"],
    form,
  );
  const daySlots = slotByDay.get(Number(selectedDay)) || [];
  const slotOptions = daySlots.map((slot) => ({
    value: Number(slot.slot_no),
    label: `Jam ${slot.slot_no} (${formatTime(slot.start_time)} - ${formatTime(slot.end_time)})`,
  }));

  return (
    <Card
      key={field.key}
      size='small'
      title={`Hari ${index + 1}`}
      extra={
        fieldsLength > 1 ? (
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
        <Select
          options={availableDayOptions}
          placeholder='Pilih hari yang sudah dikonfigurasi'
        />
      </Form.Item>
      <Flex gap='middle'>
        <Form.Item
          name={[field.name, "start_slot_no"]}
          label='Mulai jam ke'
          style={{ width: "50%" }}
        >
          <Select placeholder='Pilih jam mulai' options={slotOptions} />
        </Form.Item>
        <Form.Item
          name={[field.name, "end_slot_no"]}
          label='Selesai jam ke'
          dependencies={[
            ["entries", field.name, "day_of_week"],
            ["entries", field.name, "start_slot_no"],
          ]}
          rules={[
            ({ getFieldValue }) => ({
              validator(_, value) {
                const startValue = getFieldValue([
                  "entries",
                  field.name,
                  "start_slot_no",
                ]);

                if (!startValue && !value) {
                  return Promise.resolve();
                }

                if (!startValue || !value) {
                  return Promise.reject(
                    new Error("Jam mulai dan selesai harus diisi berpasangan."),
                  );
                }

                if (Number(value) < Number(startValue)) {
                  return Promise.reject(
                    new Error("Jam selesai harus sama atau setelah jam mulai."),
                  );
                }

                return Promise.resolve();
              },
            }),
          ]}
          style={{ width: "50%" }}
        >
          <Select
            placeholder='Pilih jam selesai'
            options={slotOptions.map((slot) => ({
              ...slot,
              disabled:
                Number(selectedStartSlot) > 0 &&
                Number(slot.value) < Number(selectedStartSlot),
            }))}
          />
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
        <Switch checkedChildren='Aktif' unCheckedChildren='Nonaktif' />
      </Form.Item>
    </Card>
  );
};

const ScheduleUnavailabilityCard = ({
  canManage,
  teachers,
  rules,
  slots,
  allSlots,
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
  const [shiftFilter, setShiftFilter] = useState("all");
  const [form] = Form.useForm();

  const teacherOptions = useMemo(
    () =>
      (teachers || []).map((item) => ({
        value: item.id,
        label: item.full_name,
      })),
    [teachers],
  );

  const shiftOptions = useMemo(
    () =>
      (groups || []).map((item) => ({
        value: Number(item.id),
        label: item.name,
      })),
    [groups],
  );

  const dayNameMap = useMemo(
    () =>
      DAY_OPTIONS.reduce((acc, item) => {
        acc[item.value] = item.label;
        return acc;
      }, {}),
    [],
  );

  const slotByDay = useMemo(() => {
    const grouped = new Map();
    (slots || [])
      .filter((item) => !item?.is_break)
      .forEach((slot) => {
        const day = Number(slot.day_of_week);
        if (!grouped.has(day)) grouped.set(day, []);
        grouped.get(day).push({
          ...slot,
          slot_no: Number(slot.slot_no),
        });
      });

    for (const rows of grouped.values()) {
      rows.sort((left, right) => Number(left.slot_no) - Number(right.slot_no));
    }

    return grouped;
  }, [slots]);

  const slotByGroupDay = useMemo(() => {
    const grouped = new Map();
    (allSlots || [])
      .filter((item) => !item?.is_break)
      .forEach((slot) => {
        const groupId = Number(slot.config_group_id);
        const day = Number(slot.day_of_week);
        const key = `${groupId}:${day}`;
        if (!grouped.has(key)) grouped.set(key, []);
        grouped.get(key).push({
          ...slot,
          config_group_id: groupId,
          slot_no: Number(slot.slot_no),
        });
      });

    for (const rows of grouped.values()) {
      rows.sort((left, right) => Number(left.slot_no) - Number(right.slot_no));
    }

    return grouped;
  }, [allSlots]);

  const availableDayOptions = useMemo(
    () =>
      DAY_OPTIONS.filter(
        (item) => (slotByDay.get(item.value) || []).length > 0,
      ),
    [slotByDay],
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

  const tableData = useMemo(
    () =>
      (rules || []).map((item) => {
        const matchedGroupIds = Array.isArray(item.matched_group_ids)
          ? item.matched_group_ids.map((value) => Number(value)).filter(Boolean)
          : [];
        const matchedGroupNames = Array.isArray(item.matched_group_names)
          ? item.matched_group_names.filter(Boolean)
          : [];

        return {
          ...item,
          matched_group_ids: matchedGroupIds,
          matched_group_names: matchedGroupNames,
          shift_label: matchedGroupNames.length
            ? matchedGroupNames.join(", ")
            : "Tidak terpetakan",
        };
      }),
    [rules],
  );

  const shiftFilterOptions = useMemo(() => {
    const fromGroups = (groups || []).map((item) => ({
      value: String(item.id),
      label: item.name,
    }));
    const extra = [];
    const knownValues = new Set(fromGroups.map((item) => item.value));

    for (const row of tableData) {
      row.matched_group_ids.forEach((groupId, index) => {
        const value = String(groupId);
        if (knownValues.has(value)) return;
        extra.push({
          value,
          label: row.matched_group_names[index] || `Shift ${groupId}`,
        });
        knownValues.add(value);
      });
    }

    return [{ value: "all", label: "Semua shift" }, ...fromGroups, ...extra];
  }, [groups, tableData]);

  const filteredTableData = useMemo(() => {
    if (shiftFilter === "all") return tableData;
    return tableData.filter((item) =>
      item.matched_group_ids.includes(Number(shiftFilter)),
    );
  }, [shiftFilter, tableData]);

  const resolveRecordSlotLabel = (record) => {
    const candidateGroupIds = Array.isArray(record.matched_group_ids)
      ? record.matched_group_ids
      : [];

    for (const groupId of candidateGroupIds) {
      const daySlots = slotByGroupDay.get(`${Number(groupId)}:${Number(record.day_of_week)}`) || [];
      const matchedSlots = getMatchedSlots(
        daySlots,
        record.start_time,
        record.end_time,
      );

      if (matchedSlots.length > 0) {
        const startNo = matchedSlots[0].slot_no;
        const endNo = matchedSlots[matchedSlots.length - 1].slot_no;
        return `Jam ${startNo}${startNo !== endNo ? ` - ${endNo}` : ""}`;
      }
    }

    return "-";
  };

  const handleOpenCreate = () => {
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      config_group_id: selectedGroup ? Number(selectedGroup.id) : undefined,
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
      config_group_id: Number(selectedGroup?.id || 0) || undefined,
      teacher_id: record.teacher_id,
      entries: teacherRules.map((item) => {
        const daySlots = slotByDay.get(Number(item.day_of_week)) || [];
        const matchedSlots = getMatchedSlots(
          daySlots,
          item.start_time,
          item.end_time,
        );

        const fallbackStartSlot = daySlots.find(
          (slot) => formatTime(slot.start_time) === formatTime(item.start_time),
        );
        const fallbackEndSlot = [...daySlots]
          .reverse()
          .find(
            (slot) => formatTime(slot.end_time) === formatTime(item.end_time),
          );

        return {
          id: item.id,
          day_of_week: item.day_of_week,
          start_slot_no:
            matchedSlots[0]?.slot_no ?? fallbackStartSlot?.slot_no ?? undefined,
          end_slot_no:
            matchedSlots[matchedSlots.length - 1]?.slot_no ??
            fallbackEndSlot?.slot_no ??
            undefined,
          reason: item.reason,
          is_active: item.is_active,
        };
      }),
    });
    setOpenModal(true);
  };

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
      entries: [buildEmptyEntry()],
    });
  }, [form, onSelectGroup, openModal, selectedGroup?.id, selectedShiftId]);

  const shiftLabel =
    shiftOptions.find((item) => Number(item.value) === Number(selectedShiftId))
      ?.label ||
    selectedGroup?.name ||
    "Shift aktif";

  const handleSubmit = async () => {
    const values = await form.validateFields();
    await onSave({
      teacher_id: values.teacher_id,
      replace_ids: editing?.replace_ids || [],
      entries: (values.entries || []).map((item) => {
        const daySlots = slotByDay.get(Number(item.day_of_week)) || [];
        const startSlot = daySlots.find(
          (slot) => Number(slot.slot_no) === Number(item.start_slot_no),
        );
        const endSlot = daySlots.find(
          (slot) => Number(slot.slot_no) === Number(item.end_slot_no),
        );

        return {
          id: item.id,
          day_of_week: item.day_of_week,
          start_time: startSlot ? formatTime(startSlot.start_time) : null,
          end_time: endSlot ? formatTime(endSlot.end_time) : null,
          reason: item.reason || null,
          is_active: item.is_active ?? true,
        };
      }),
    });
    setOpenModal(false);
  };

  const columns = [
    { title: "Guru", dataIndex: "teacher_name", width: 220 },
    {
      title: "Shift",
      dataIndex: "shift_label",
      width: 180,
      render: (_, record) => {
        if (!record.matched_group_names?.length) {
          return <Tag>Tidak terpetakan</Tag>;
        }

        return (
          <Space size={[4, 4]} wrap>
            {record.matched_group_names.map((name) => (
              <Tag key={`${record.id}-${name}`} color='blue'>
                {name}
              </Tag>
            ))}
          </Space>
        );
      },
    },
    {
      title: "Hari",
      dataIndex: "day_of_week",
      width: 110,
      render: (value) => dayNameMap[value] || "-",
    },
    {
      title: "Jam Ke",
      key: "slot_range",
      width: 220,
      render: (_, record) =>
        record.start_time && record.end_time
          ? resolveRecordSlotLabel(record)
          : "Semua slot",
    },
    {
      title: "Waktu",
      key: "time",
      width: 160,
      render: (_, record) =>
        record.start_time && record.end_time
          ? `${formatTime(record.start_time)} - ${formatTime(record.end_time)}`
          : "Semua waktu",
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
          <span>Ketidak Tersedian Guru</span>
        </Space>
      }
      extra={
        <Space>
          {canManage ? (
            <Button
              type='primary'
              icon={<Plus size={14} />}
              onClick={handleOpenCreate}
            >
              Tambah
            </Button>
          ) : null}

          <Select
            value={shiftFilter}
            onChange={setShiftFilter}
            options={shiftFilterOptions}
            style={{ width: 220 }}
            placeholder='Filter shift'
          />
        </Space>
      }
    >
      <Table
        rowKey='id'
        size='small'
        loading={loading}
        columns={columns}
        dataSource={filteredTableData}
        scroll={{ x: 1020 }}
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
          {groupCount > 1 ? (
            <Alert
              showIcon
              type='info'
              style={{ marginBottom: 16 }}
              message={`Form ketentuan guru untuk ${shiftLabel}`}
              description='Pilih shift terlebih dahulu agar opsi hari dan jam mengikuti slot pada shift tersebut.'
            />
          ) : null}
          {groupCount > 1 ? (
            <Form.Item
              name='config_group_id'
              label='Shift'
              rules={[{ required: true, message: "Shift wajib dipilih." }]}
            >
              <Select
                options={shiftOptions}
                placeholder='Pilih shift untuk mengisi jam'
              />
            </Form.Item>
          ) : null}
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
                  <UnavailabilityEntryFields
                    key={field.key}
                    field={field}
                    index={index}
                    fieldsLength={fields.length}
                    form={form}
                    remove={remove}
                    slotByDay={slotByDay}
                    availableDayOptions={availableDayOptions}
                  />
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
