import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  InputNumber,
  Modal,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { LayoutGrid, RefreshCcw, Sparkles } from "lucide-react";

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

const HEADER_BG = "#e7c1a3";
const HEADER_SUB_BG = "#f3d8c2";
const SLOT_BG = "#f8f1c7";
const SURFACE_BG = "#fffdf8";
const BORDER_COLOR = "#d9c7b8";

const SUBJECT_COLOR_PALETTE = [
  { bg: "#fde68a", text: "#7c2d12", border: "#f59e0b" },
  { bg: "#bfdbfe", text: "#1e3a8a", border: "#60a5fa" },
  { bg: "#fecaca", text: "#991b1b", border: "#f87171" },
  { bg: "#c7f9cc", text: "#166534", border: "#4ade80" },
  { bg: "#e9d5ff", text: "#6b21a8", border: "#c084fc" },
  { bg: "#fed7aa", text: "#9a3412", border: "#fb923c" },
  { bg: "#ddd6fe", text: "#5b21b6", border: "#8b5cf6" },
  { bg: "#bae6fd", text: "#0c4a6e", border: "#38bdf8" },
  { bg: "#fbcfe8", text: "#9d174d", border: "#f472b6" },
  { bg: "#d9f99d", text: "#365314", border: "#84cc16" },
];

const formatTime = (value) => (value ? String(value).slice(0, 5) : "-");

const getSubjectColor = (code) => {
  const normalized = String(code || "-")
    .trim()
    .toUpperCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash =
      (hash * 31 + normalized.charCodeAt(index)) % SUBJECT_COLOR_PALETTE.length;
  }
  return SUBJECT_COLOR_PALETTE[hash];
};

const ScheduleTimetableCard = ({
  canManage,
  entries,
  slots,
  breaks,
  classes,
  grades,
  teachers,
  teacherAssignments,
  sessionShortages,
  loading,
  onGenerate,
  onRefresh,
  onUpdateEntry,
}) => {
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form] = Form.useForm();

  const gradeGroups = useMemo(() => {
    const grouped = new Map();
    (grades || []).forEach((grade) => {
      grouped.set(Number(grade.id), {
        grade_id: Number(grade.id),
        grade_name: grade.name,
        classes: [],
      });
    });

    (classes || []).forEach((item) => {
      const gradeId = Number(item.grade_id);
      if (!grouped.has(gradeId)) {
        grouped.set(gradeId, {
          grade_id: gradeId,
          grade_name: item.grade_name || `Tingkat ${gradeId}`,
          classes: [],
        });
      }
      grouped.get(gradeId).classes.push(item);
    });

    return [...grouped.values()]
      .map((group) => ({
        ...group,
        classes: [...group.classes].sort((a, b) =>
          (a.name || "").localeCompare(b.name || ""),
        ),
      }))
      .filter((group) => group.classes.length > 0)
      .sort((a, b) =>
        String(a.grade_name || "").localeCompare(String(b.grade_name || "")),
      );
  }, [classes, grades]);

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

  const expandedEntries = useMemo(() => {
    const result = [];
    (entries || []).forEach((entry) => {
      const slotNos =
        Array.isArray(entry.slot_nos) && entry.slot_nos.length
          ? entry.slot_nos
          : [entry.meeting_no];
      slotNos.forEach((slotNo) => {
        result.push({
          ...entry,
          slot_no: Number(slotNo),
        });
      });
    });
    return result;
  }, [entries]);

  const entryMap = useMemo(() => {
    const map = new Map();
    expandedEntries.forEach((entry) => {
      const key = `${entry.day_of_week}:${entry.slot_no}:${entry.class_id}`;
      map.set(key, entry);
    });
    return map;
  }, [expandedEntries]);

  const timetableRows = useMemo(() => {
    const rows = [];
    DAY_OPTIONS.forEach((day) => {
      const daySlots = slotByDay.get(day.value) || [];
      const dayBreaks = (breaks || [])
        .filter((item) => Number(item.day_of_week) === day.value)
        .map((item, index) => ({
          key: `${day.value}-break-${index}`,
          day_of_week: day.value,
          day_name: day.label,
          sort_key: String(item.break_start || ""),
          is_break: true,
          break_label: item.label || "Istirahat",
          time_label: `${formatTime(item.break_start)} - ${formatTime(item.break_end)}`,
        }));

      const dayScheduleRows = daySlots.map((slot) => ({
        key: `${day.value}-${slot.slot_no}`,
        day_of_week: day.value,
        day_name: day.label,
        sort_key: String(slot.start_time || ""),
        is_break: false,
        slot_no: Number(slot.slot_no),
        slot_id: Number(slot.id),
        time_label: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
        cells: (classes || []).reduce((acc, item) => {
          const entryKey = `${day.value}:${slot.slot_no}:${item.id}`;
          acc[item.id] = entryMap.get(entryKey) || null;
          return acc;
        }, {}),
      }));

      const mergedRows = [...dayScheduleRows, ...dayBreaks].sort((a, b) =>
        String(a.sort_key || "").localeCompare(String(b.sort_key || "")),
      );

      mergedRows.forEach((item, index) => {
        rows.push({
          ...item,
          show_day: index === 0,
          day_rowspan: mergedRows.length,
        });
      });
    });
    return rows;
  }, [breaks, classes, entryMap, slotByDay]);

  const teacherSummaryRows = useMemo(() => {
    const grouped = new Map(
      (teachers || []).map((item) => [
        Number(item.id),
        {
          key: Number(item.id),
          teacher_name: item.full_name || "-",
          subject_names: [],
        },
      ]),
    );

    (teacherAssignments || []).forEach((item) => {
      const teacherId = Number(item.teacher_id);
      if (!grouped.has(teacherId)) {
        grouped.set(teacherId, {
          key: teacherId,
          teacher_name: item.teacher_name || "-",
          subject_names: [],
        });
      }
      const row = grouped.get(teacherId);
      if (!row.subject_names.includes(item.subject_name)) {
        row.subject_names.push(item.subject_name);
      }
    });

    (sessionShortages || []).forEach((item) => {
      const teacherId = Number(item.teacher_id);
      if (!grouped.has(teacherId)) {
        grouped.set(teacherId, {
          key: teacherId,
          teacher_name: item.teacher_name || "-",
          subject_names: [],
        });
      }
      const row = grouped.get(teacherId);
      if (!row.shortages) {
        row.shortages = [];
      }
      row.shortages.push(item);
    });

    return [...grouped.values()].sort((a, b) =>
      (a.teacher_name || "").localeCompare(b.teacher_name || ""),
    );
  }, [sessionShortages, teacherAssignments, teachers]);

  const openEditor = useCallback(
    (record) => {
      setEditing(record);
      form.setFieldsValue({
        day_of_week: Number(record.day_of_week),
        slot_count: Number(record.slot_count) || 1,
        slot_start_id: Number(record.slot_start_id) || null,
      });
      setOpenModal(true);
    },
    [form],
  );

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
      label: `Jam ${slot.slot_no} (${formatTime(slot.start_time)} - ${formatTime(slot.end_time)})`,
    }));
  }, [currentDay, slotByDay]);

  const flatClasses = useMemo(
    () =>
      gradeGroups.flatMap((group) =>
        group.classes.map((item, classIndex) => ({
          ...item,
          group_name: group.grade_name,
          absolute_index:
            gradeGroups
              .slice(
                0,
                gradeGroups.findIndex(
                  (candidate) => candidate.grade_id === group.grade_id,
                ),
              )
              .reduce(
                (total, candidate) => total + candidate.classes.length,
                0,
              ) + classIndex,
        })),
      ),
    [gradeGroups],
  );

  const timetableColumns = useMemo(() => {
    const totalClassCount = (classes || []).length;
    const renderEntryCell = (entry) => {
      if (!entry) {
        return <span style={{ color: "#bfbfbf" }}>-</span>;
      }

      const code = entry.subject_code || entry.subject_name || "-";
      const color = getSubjectColor(code);
      const content = (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minWidth: 44,
            minHeight: 28,
            padding: "2px 8px",
            borderRadius: 999,
            border: `1px solid ${color.border}`,
            background: color.bg,
            color: color.text,
            fontWeight: 800,
            fontSize: 12,
            letterSpacing: 0.3,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.35)",
          }}
        >
          {code}
        </span>
      );

      if (!canManage) {
        return (
          <Tooltip title={`${entry.subject_name} | ${entry.teacher_name}`}>
            {content}
          </Tooltip>
        );
      }

      return (
        <Tooltip title={`${entry.subject_name} | ${entry.teacher_name}`}>
          <Button
            type='text'
            style={{
              width: "100%",
              height: "auto",
              padding: 4,
              textAlign: "center",
              justifyContent: "center",
              fontWeight: 700,
              borderRadius: 10,
            }}
            onClick={() => openEditor(entry)}
          >
            {content}
          </Button>
        </Tooltip>
      );
    };

    const fixedColumns = [
      {
        title: "Hari",
        dataIndex: "day_name",
        key: "day_name",
        width: 72,
        align: "center",
        onCell: (record) => ({
          rowSpan: record.show_day ? record.day_rowspan : 0,
          style: {
            background: SLOT_BG,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 1,
          },
        }),
        onHeaderCell: () => ({
          style: {
            background: HEADER_BG,
            textAlign: "center",
            fontWeight: 700,
            borderColor: BORDER_COLOR,
          },
        }),
      },
      {
        title: "Alokasi Waktu",
        children: [
          {
            title: "Jam ke",
            dataIndex: "slot_no",
            key: "slot_no",
            width: 64,
            align: "center",
            render: (value, record) => (record.is_break ? "-" : value),
            onCell: () => ({
              style: {
                background: SLOT_BG,
                fontWeight: 700,
                borderColor: BORDER_COLOR,
              },
            }),
            onHeaderCell: () => ({
              style: {
                background: HEADER_SUB_BG,
                textAlign: "center",
                fontWeight: 700,
                borderColor: BORDER_COLOR,
              },
            }),
          },
          {
            title: "Waktu",
            dataIndex: "time_label",
            key: "time_label",
            width: 120,
            align: "center",
            onCell: () => ({
              style: {
                background: SLOT_BG,
                fontWeight: 700,
                borderColor: BORDER_COLOR,
              },
            }),
            onHeaderCell: () => ({
              style: {
                background: HEADER_SUB_BG,
                textAlign: "center",
                fontWeight: 700,
                borderColor: BORDER_COLOR,
              },
            }),
          },
        ],
        onHeaderCell: () => ({
          style: {
            background: HEADER_BG,
            textAlign: "center",
            fontWeight: 800,
            borderColor: BORDER_COLOR,
          },
        }),
      },
    ];

    const classColumns = gradeGroups.map((group) => {
      return {
        title: `Kelas ${group.grade_name}`,
        children: group.classes.map((item) => {
          const classMeta = flatClasses.find(
            (candidate) => candidate.id === item.id,
          );
          const absoluteClassIndex = classMeta?.absolute_index || 0;
          return {
            title: item.name,
            key: `class_${item.id}`,
            width: 72,
            align: "center",
            render: (_, record) => {
              if (record.is_break) {
                if (absoluteClassIndex === 0) {
                  return {
                    children: (
                      <span
                        style={{
                          display: "inline-block",
                          width: "100%",
                          fontWeight: 800,
                          color: "#8a4b08",
                          textTransform: "uppercase",
                          letterSpacing: 0.8,
                        }}
                      >
                        {record.break_label}
                      </span>
                    ),
                    props: {
                      colSpan: totalClassCount,
                    },
                  };
                }
                return { children: null, props: { colSpan: 0 } };
              }

              return renderEntryCell(record.cells[item.id]);
            },
            onCell: (_, record) => ({
              style: {
                textAlign: "center",
                padding: 6,
                background: record.is_break ? "#fff1bf" : SURFACE_BG,
                borderColor: BORDER_COLOR,
              },
            }),
            onHeaderCell: () => ({
              style: {
                background: HEADER_SUB_BG,
                textAlign: "center",
                fontWeight: 800,
                borderColor: BORDER_COLOR,
              },
            }),
          };
        }),
        onHeaderCell: () => ({
          style: {
            background: HEADER_BG,
            textAlign: "center",
            fontWeight: 800,
            borderColor: BORDER_COLOR,
          },
        }),
      };
    });

    return [...fixedColumns, ...classColumns];
  }, [canManage, classes, flatClasses, gradeGroups, openEditor]);

  const teacherColumns = [
    {
      title: "Nama Guru",
      dataIndex: "teacher_name",
      key: "teacher_name",
      width: 220,
      onHeaderCell: () => ({
        style: {
          background: HEADER_BG,
          textAlign: "center",
          fontWeight: 800,
          borderColor: BORDER_COLOR,
        },
      }),
      onCell: (_, index) => ({
        style: {
          padding: "10px 12px",
          fontWeight: 700,
          verticalAlign: "top",
          background: index % 2 === 0 ? "#fffaf4" : "#ffffff",
          borderColor: BORDER_COLOR,
        },
      }),
    },
    {
      title: "Mata Pelajaran",
      key: "subjects",
      render: (_, record) =>
        record.subject_names.length > 0 ? (
          <Space size={[4, 6]} wrap>
            {record.subject_names.map((subjectName) => {
              const color = getSubjectColor(subjectName);
              return (
                <span
                  key={`${record.key}-${subjectName}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "2px 8px",
                    borderRadius: 999,
                    background: color.bg,
                    color: color.text,
                    border: `1px solid ${color.border}`,
                    fontWeight: 700,
                    fontSize: 12,
                  }}
                >
                  {subjectName}
                </span>
              );
            })}
          </Space>
        ) : (
          "Belum ada mapel"
        ),
      onHeaderCell: () => ({
        style: {
          background: HEADER_BG,
          textAlign: "center",
          fontWeight: 800,
          borderColor: BORDER_COLOR,
        },
      }),
      onCell: (_, index) => ({
        style: {
          padding: "10px 12px",
          verticalAlign: "top",
          background: index % 2 === 0 ? "#fffaf4" : "#ffffff",
          borderColor: BORDER_COLOR,
        },
      }),
    },
    {
      title: "Catatan Alokasi",
      key: "shortages",
      width: 320,
      render: (_, record) =>
        record.shortages?.length ? (
          <Space direction='vertical' size={4}>
            {record.shortages.map((item) => (
              <div key={item.key}>
                <Text strong>{item.subject_name}</Text>{" "}
                <Text type='secondary'>{item.class_name}</Text>{" "}
                <Tag color='gold'>
                  {item.allocated_sessions}/{item.required_sessions} sesi
                </Tag>
                <Tag color='red'>Kurang {item.missing_sessions}</Tag>
              </div>
            ))}
          </Space>
        ) : (
          <Tag color='green'>Semua sesi terpenuhi</Tag>
        ),
      onHeaderCell: () => ({
        style: {
          background: HEADER_BG,
          textAlign: "center",
          fontWeight: 800,
          borderColor: BORDER_COLOR,
        },
      }),
      onCell: (_, index) => ({
        style: {
          padding: "10px 12px",
          verticalAlign: "top",
          background: index % 2 === 0 ? "#fffaf4" : "#ffffff",
          borderColor: BORDER_COLOR,
        },
      }),
    },
  ];

  return (
    <Card
      style={{
        borderRadius: 24,
        overflow: "hidden",
        border: "1px solid #ead9cc",
        background:
          "linear-gradient(180deg, rgba(255,250,244,0.96) 0%, rgba(255,255,255,1) 100%)",
      }}
      styles={{ body: { padding: 24 } }}
      title={
        <Space>
          <LayoutGrid size={18} />
          <span>Jadwal Final Cetak</span>
        </Space>
      }
      extra={
        <Space>
          <Button
            icon={<RefreshCcw size={14} />}
            onClick={onRefresh}
            loading={loading}
          >
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
      {(sessionShortages || []).length > 0 ? (
        <Alert
          showIcon
          type='warning'
          style={{
            marginBottom: 20,
            borderRadius: 14,
          }}
          message={`Ada ${(sessionShortages || []).length} beban ajar yang belum terpenuhi`}
          description={`${sessionShortages
            .slice(0, 4)
            .map(
              (item) =>
                `${item.teacher_name} - ${item.subject_name} ${item.class_name}: ${item.allocated_sessions}/${item.required_sessions} sesi`,
            )
            .join(" | ")}${sessionShortages.length > 4 ? " | ..." : ""}`}
        />
      ) : null}

      {!timetableRows.length ? (
        <Empty description='Belum ada jadwal untuk ditampilkan.' />
      ) : (
        <Space direction='vertical' size={20} style={{ width: "100%" }}>
          <Card
            size='small'
            title='Tabel Jadwal'
            style={{
              borderRadius: 18,
              borderColor: "#ead9cc",
              boxShadow: "0 10px 24px rgba(110, 84, 54, 0.08)",
            }}
            styles={{
              header: {
                background: "#fff8f0",
                borderBottom: "1px solid #efdfd0",
              },
              body: { padding: 0 },
            }}
          >
            <Table
              rowKey='key'
              bordered
              size='small'
              loading={loading}
              columns={timetableColumns}
              dataSource={timetableRows}
              pagination={false}
              scroll={{ x: "max-content", y: 760 }}
              locale={{ emptyText: "Belum ada data jadwal." }}
              sticky
            />
          </Card>

          <Card
            size='small'
            title='Guru dan Mapel'
            style={{
              borderRadius: 18,
              borderColor: "#ead9cc",
              boxShadow: "0 10px 24px rgba(110, 84, 54, 0.08)",
            }}
            styles={{
              header: {
                background: "#fff8f0",
                borderBottom: "1px solid #efdfd0",
              },
              body: { padding: 0 },
            }}
          >
            <Table
              rowKey='key'
              bordered
              size='small'
              loading={loading}
              columns={teacherColumns}
              dataSource={teacherSummaryRows}
              pagination={false}
              scroll={{ y: 520 }}
              locale={{ emptyText: "Belum ada data guru." }}
              sticky
            />
          </Card>
        </Space>
      )}

      <Modal
        open={openModal}
        title='Ubah Jadwal Manual'
        onCancel={() => setOpenModal(false)}
        onOk={handleSubmit}
        okText='Simpan'
        confirmLoading={loading}
      >
        <Form form={form} layout='vertical'>
          <Form.Item
            name='day_of_week'
            label='Hari'
            rules={[{ required: true }]}
          >
            <Select options={DAY_OPTIONS} />
          </Form.Item>
          <Form.Item
            name='slot_start_id'
            label='Slot mulai'
            rules={[{ required: true }]}
          >
            <Select options={slotStartOptions} />
          </Form.Item>
          <Form.Item
            name='slot_count'
            label='Jumlah sesi'
            rules={[{ required: true }]}
          >
            <InputNumber min={1} max={4} style={{ width: "100%" }} />
          </Form.Item>
          {editing ? (
            <Alert
              type='warning'
              showIcon
              message={`${editing.class_name} | ${editing.subject_name}`}
              description={`Guru: ${editing.teacher_name}. Hasil generate tetap bisa dipindah manual selama tidak bentrok.`}
            />
          ) : null}
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleTimetableCard;
