import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tabs,
  Typography,
} from "antd";
import { LayoutGrid, RefreshCcw, Sparkles } from "lucide-react";
import ScheduleTeacherMapelTable from "./ScheduleTeacherMapelTable";
import ScheduleTimetableBoard from "./ScheduleTimetableBoard";
import { BORDER_COLOR, HEADER_BG, formatTime } from "./scheduleTimetableUtils";

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

const GENERATE_ACTION_OPTIONS = [
  {
    value: "generate_new",
    label: "Generate Baru",
    description: "Hanya untuk periode yang belum memiliki jadwal sama sekali.",
  },
  {
    value: "regenerate_generated",
    label: "Regenerate Otomatis",
    description:
      "Hapus hasil generate lama, pertahankan manual override dan lock.",
  },
  {
    value: "reset_generated",
    label: "Reset Jadwal Otomatis",
    description: "Bersihkan jadwal hasil generate tanpa membuat jadwal baru.",
  },
];

const ScheduleTimetableCard = ({
  canManage,
  entries,
  activities,
  activityTargets,
  slots,
  breaks,
  classes,
  grades,
  teachers,
  teacherAssignments,
  sessionShortages,
  loading,
  onCreateEntry,
  onDeleteEntry,
  onGenerate,
  onRefresh,
  onUpdateEntry,
}) => {
  const [openModal, setOpenModal] = useState(false);
  const [openGenerateModal, setOpenGenerateModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalMode, setModalMode] = useState("edit");
  const [lastGenerateResult, setLastGenerateResult] = useState(null);
  const [form] = Form.useForm();
  const [generateForm] = Form.useForm();

  const activeClasses = useMemo(
    () => (classes || []).filter((item) => item.is_active === true),
    [classes],
  );

  const gradeGroups = useMemo(() => {
    const grouped = new Map();
    (grades || []).forEach((grade) => {
      grouped.set(Number(grade.id), {
        grade_id: Number(grade.id),
        grade_name: grade.name,
        classes: [],
      });
    });

    activeClasses.forEach((item) => {
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
  }, [activeClasses, grades]);

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

  const activityMap = useMemo(() => {
    const activeClassIdList = activeClasses.map((item) => Number(item.id));
    const targetsByActivityId = (activityTargets || []).reduce((acc, item) => {
      const key = Number(item.activity_id);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});
    const map = new Map();

    (activities || []).forEach((activity) => {
      if (activity?.is_active === false) return;

      const dayOfWeek = Number(activity.day_of_week);
      const slotIds = Array.isArray(activity.slot_ids)
        ? activity.slot_ids.map((item) => Number(item)).filter(Boolean)
        : [];

      if (!dayOfWeek || !slotIds.length) return;

      if (activity.scope_type === "all_classes") {
        activeClassIdList.forEach((classId) => {
          slotIds.forEach((slotId) => {
            const key = `${dayOfWeek}:${slotId}:${classId}`;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(activity);
          });
        });
        return;
      }

      (targetsByActivityId[Number(activity.id)] || []).forEach((target) => {
        const classId = Number(target.class_id);
        if (!activeClassIdList.includes(classId)) return;
        slotIds.forEach((slotId) => {
          const key = `${dayOfWeek}:${slotId}:${classId}`;
          if (!map.has(key)) map.set(key, []);
          map.get(key).push(activity);
        });
      });
    });

    for (const [key, rows] of map.entries()) {
      const uniqueRows = rows.filter(
        (item, index, array) =>
          array.findIndex(
            (candidate) => Number(candidate.id) === Number(item.id),
          ) === index,
      );
      map.set(key, uniqueRows);
    }

    return map;
  }, [activeClasses, activities, activityTargets]);

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
        cells: activeClasses.reduce((acc, item) => {
          const entryKey = `${day.value}:${slot.slot_no}:${item.id}`;
          const activityKey = `${day.value}:${slot.id}:${item.id}`;
          acc[item.id] = {
            entry: entryMap.get(entryKey) || null,
            activities: activityMap.get(activityKey) || [],
          };
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
          is_day_end: index === mergedRows.length - 1,
        });
      });
    });
    return rows;
  }, [activeClasses, activityMap, breaks, entryMap, slotByDay]);

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

  const displayGenerateResult = useMemo(() => {
    if (!lastGenerateResult) return null;

    const assignmentMap = new Map(
      (teacherAssignments || []).map((item) => [
        `${item.teacher_id}:${item.subject_id}:${item.class_id}`,
        item,
      ]),
    );

    return {
      ...lastGenerateResult,
      failed_items: (lastGenerateResult.failed_items || []).map(
        (item, index) => {
          const assignment =
            assignmentMap.get(
              `${item.teacher_id}:${item.subject_id}:${item.class_id}`,
            ) || {};
          return {
            key: `${item.teacher_id}:${item.subject_id}:${item.class_id}:${item.meeting_no || index}`,
            ...item,
            teacher_name: assignment.teacher_name,
            subject_name: assignment.subject_name,
            class_name: assignment.class_name,
          };
        },
      ),
    };
  }, [lastGenerateResult, teacherAssignments]);

  const teachingLoadMap = useMemo(
    () =>
      new Map(
        (teacherAssignments || [])
          .filter((item) => item.teaching_load_id)
          .map((item) => [Number(item.teaching_load_id), item]),
      ),
    [teacherAssignments],
  );

  const manualEntryOptions = useMemo(() => {
    const scheduledSessionsByLoad = (entries || []).reduce((acc, item) => {
      const key = Number(item.teaching_load_id);
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + Number(item.slot_count || 0);
      return acc;
    }, {});

    const activityLoadIds = new Set(
      (activityTargets || [])
        .map((item) => Number(item.teaching_load_id))
        .filter(Boolean),
    );

    return (teacherAssignments || [])
      .filter((item) => {
        const teachingLoadId = Number(item.teaching_load_id);
        if (!teachingLoadId) return false;
        if (activityLoadIds.has(teachingLoadId)) return false;

        const allocatedSessions = Number(
          scheduledSessionsByLoad[teachingLoadId] || 0,
        );
        const weeklySessions = Number(item.weekly_sessions || 0);
        return allocatedSessions < weeklySessions;
      })
      .map((item) => {
        const teachingLoadId = Number(item.teaching_load_id);
        const allocatedSessions = Number(
          scheduledSessionsByLoad[teachingLoadId] || 0,
        );
        const remainingSessions = Math.max(
          Number(item.weekly_sessions || 0) - allocatedSessions,
          0,
        );

        return {
          value: teachingLoadId,
          label: `${item.teacher_name} | ${item.subject_name} | ${item.class_name} | sisa ${remainingSessions} sesi`,
        };
      })
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [activityTargets, entries, teacherAssignments]);

  const openEditor = useCallback(
    (record) => {
      setModalMode("edit");
      setEditing(record);
      form.setFieldsValue({
        teaching_load_id: Number(record.teaching_load_id) || undefined,
        day_of_week: Number(record.day_of_week),
        slot_count: Number(record.slot_count) || 1,
        slot_start_id: Number(record.slot_start_id) || null,
      });
      setOpenModal(true);
    },
    [form],
  );

  const openCreateManualDialog = useCallback(() => {
    setModalMode("create");
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      teaching_load_id: undefined,
      day_of_week: undefined,
      slot_start_id: undefined,
      slot_count: 1,
    });
    setOpenModal(true);
  }, [form]);

  const closeEntryModal = useCallback(() => {
    setOpenModal(false);
    setEditing(null);
    setModalMode("edit");
    form.resetFields();
  }, [form]);

  const handleSubmit = async () => {
    const values = await form.validateFields();
    if (modalMode === "create") {
      await onCreateEntry({
        teaching_load_id: values.teaching_load_id,
        day_of_week: values.day_of_week,
        slot_start_id: values.slot_start_id,
        slot_count: values.slot_count,
      });
      closeEntryModal();
      return;
    }
    if (!editing) return;
    await onUpdateEntry({
      id: editing.id,
      day_of_week: values.day_of_week,
      slot_start_id: values.slot_start_id,
      slot_count: values.slot_count,
    });
    closeEntryModal();
  };

  const handleDeleteCurrentEntry = useCallback(async () => {
    if (!editing?.id) return;
    await onDeleteEntry(editing.id);
    closeEntryModal();
  }, [closeEntryModal, editing?.id, onDeleteEntry]);

  const openGenerateDialog = useCallback(() => {
    generateForm.setFieldsValue({
      action: "regenerate_generated",
      dry_run: false,
    });
    setOpenGenerateModal(true);
  }, [generateForm]);

  const handleGenerateSubmit = useCallback(async () => {
    const values = await generateForm.validateFields();
    const response = await onGenerate(values);
    setLastGenerateResult(response?.data || null);
    setOpenGenerateModal(false);
  }, [generateForm, onGenerate]);

  const currentDay = Form.useWatch("day_of_week", form);
  const currentTeachingLoadId = Form.useWatch("teaching_load_id", form);
  const currentSlotCount = Form.useWatch("slot_count", form);
  const currentManualLoad = useMemo(() => {
    if (modalMode === "create") {
      return teachingLoadMap.get(Number(currentTeachingLoadId)) || null;
    }
    if (!editing?.teaching_load_id) return null;
    return teachingLoadMap.get(Number(editing.teaching_load_id)) || null;
  }, [currentTeachingLoadId, editing, modalMode, teachingLoadMap]);

  const currentAllocatedSessions = useMemo(() => {
    if (!currentManualLoad?.teaching_load_id) return 0;
    return (entries || []).reduce((acc, item) => {
      if (
        Number(item.teaching_load_id) !==
        Number(currentManualLoad.teaching_load_id)
      ) {
        return acc;
      }
      if (editing?.id && Number(item.id) === Number(editing.id)) {
        return acc;
      }
      return acc + Number(item.slot_count || 0);
    }, 0);
  }, [currentManualLoad, editing, entries]);

  const manualSlotCountLimit = useMemo(() => {
    if (!currentManualLoad) return 1;
    const weeklySessions = Number(currentManualLoad.weekly_sessions || 0);
    const maxSessionsPerMeeting = Math.max(
      1,
      Number(currentManualLoad.max_sessions_per_meeting || 1),
    );
    const remainingSessions = Math.max(
      weeklySessions - Number(currentAllocatedSessions || 0),
      0,
    );
    return Math.max(1, Math.min(remainingSessions || 1, maxSessionsPerMeeting));
  }, [currentAllocatedSessions, currentManualLoad]);
  const slotStartOptions = useMemo(() => {
    const rows = slotByDay.get(Number(currentDay)) || [];
    const selectedSlotCount = Math.max(
      1,
      Math.min(Number(currentSlotCount || 1), manualSlotCountLimit),
    );
    const activeLoad =
      modalMode === "create"
        ? currentManualLoad
        : editing
          ? {
              teacher_id: editing.teacher_id,
              class_id: editing.class_id,
            }
          : null;

    if (!rows.length || !activeLoad) {
      return rows.map((slot) => ({
        value: slot.id,
        label: `Jam ${slot.slot_no} (${formatTime(slot.start_time)} - ${formatTime(slot.end_time)})`,
      }));
    }

    const day = Number(currentDay);
    const classId = Number(activeLoad.class_id);
    const teacherId = Number(activeLoad.teacher_id);
    const occupiedSlotNos = new Set();

    expandedEntries.forEach((entry) => {
      if (Number(entry.day_of_week) !== day) return;
      if (editing?.id && Number(entry.id) === Number(editing.id)) return;
      if (
        Number(entry.class_id) === classId ||
        Number(entry.teacher_id) === teacherId
      ) {
        occupiedSlotNos.add(Number(entry.slot_no));
      }
    });

    (activities || []).forEach((activity) => {
      if (activity?.is_active === false) return;
      if (Number(activity.day_of_week) !== day) return;

      const slotIds = Array.isArray(activity.slot_ids)
        ? activity.slot_ids.map((item) => Number(item))
        : [];
      if (!slotIds.length) return;

      let matchesTarget = activity.scope_type === "all_classes";
      if (!matchesTarget) {
        matchesTarget = (activityTargets || []).some(
          (target) =>
            Number(target.activity_id) === Number(activity.id) &&
            (Number(target.class_id) === classId ||
              Number(target.teacher_id) === teacherId),
        );
      }
      if (!matchesTarget) return;

      rows.forEach((slot) => {
        if (slotIds.includes(Number(slot.id))) {
          occupiedSlotNos.add(Number(slot.slot_no));
        }
      });
    });

    return rows
      .map((slot, index) => {
        const segment = rows.slice(index, index + selectedSlotCount);
        const isEnough = segment.length === selectedSlotCount;
        const isContiguous = segment.every((item, segmentIndex) =>
          segmentIndex === 0
            ? true
            : Number(item.slot_no) ===
              Number(segment[segmentIndex - 1].slot_no) + 1,
        );
        const hasConflict = segment.some((item) =>
          occupiedSlotNos.has(Number(item.slot_no)),
        );
        return {
          value: slot.id,
          label: `Jam ${slot.slot_no} (${formatTime(slot.start_time)} - ${formatTime(slot.end_time)})`,
          disabled: !isEnough || !isContiguous || hasConflict,
        };
      })
      .filter(
        (item) =>
          !item.disabled ||
          Number(item.value) === Number(form.getFieldValue("slot_start_id")),
      );
  }, [
    activities,
    activityTargets,
    currentDay,
    currentSlotCount,
    currentTeachingLoadId,
    editing,
    expandedEntries,
    form,
    modalMode,
    slotByDay,
    teacherAssignments,
    teachingLoadMap,
    currentManualLoad,
    manualSlotCountLimit,
  ]);

  const selectedLoadHelper = useMemo(() => {
    if (!currentManualLoad) return null;
    const weeklySessions = Number(currentManualLoad.weekly_sessions || 0);
    const maxSessionsPerMeeting = Number(
      currentManualLoad.max_sessions_per_meeting || 1,
    );
    const remainingSessions = Math.max(
      weeklySessions - Number(currentAllocatedSessions || 0),
      0,
    );
    return {
      weeklySessions,
      maxSessionsPerMeeting,
      remainingSessions,
    };
  }, [currentAllocatedSessions, currentManualLoad]);

  const isManualEditing = Boolean(
    editing &&
    (editing.source_type === "manual" || Boolean(editing.is_manual_override)),
  );

  const flatClasses = useMemo(
    () =>
      gradeGroups.flatMap((group) =>
        group.classes.map((item, classIndex) => ({
          ...item,
          group_name: group.grade_name,
          is_group_first: classIndex === 0,
          is_group_last: classIndex === group.classes.length - 1,
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

  const generateAction = Form.useWatch("action", generateForm);
  const generatePreview = Form.useWatch("dry_run", generateForm);

  const failedColumns = [
    {
      title: "Guru / Mapel / Kelas",
      key: "assignment",
      onHeaderCell: () => ({
        style: {
          background: HEADER_BG,
          textAlign: "center",
          fontWeight: 800,
          borderColor: BORDER_COLOR,
        },
      }),
      render: (_, record) => (
        <Space orientation="vertical" size={0}>
          <Text strong>
            {record.teacher_name || `Guru #${record.teacher_id}`}
          </Text>
          <Text type="secondary">
            {record.subject_name || `Mapel #${record.subject_id}`} |{" "}
            {record.class_name || `Kelas #${record.class_id}`}
          </Text>
        </Space>
      ),
    },
    {
      title: "Pertemuan",
      key: "meeting",
      width: 120,
      onHeaderCell: () => ({
        style: {
          background: HEADER_BG,
          textAlign: "center",
          fontWeight: 800,
          borderColor: BORDER_COLOR,
        },
      }),
      render: (_, record) => (
        <Tag color="gold">
          #{record.meeting_no} / {record.chunk_size} sesi
        </Tag>
      ),
    },
    {
      title: "Alasan Utama",
      dataIndex: "failure_reason",
      key: "failure_reason",
      width: 260,
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
              type="primary"
              icon={<Sparkles size={14} />}
              onClick={openGenerateDialog}
              loading={loading}
            >
              Generate
            </Button>
          ) : null}
          {canManage ? (
            <Button onClick={openCreateManualDialog}>
              Tambah Jadwal Manual
            </Button>
          ) : null}
        </Space>
      }
    >
      {/* {(sessionShortages || []).length > 0 ? (
        <Alert
          showIcon
          type='warning'
          style={{
            marginBottom: 20,
            borderRadius: 14,
          }}
          title={`Ada ${(sessionShortages || []).length} beban ajar yang belum terpenuhi`}
          description={`${sessionShortages
            .slice(0, 4)
            .map(
              (item) =>
                `${item.teacher_name} - ${item.subject_name} ${item.class_name}: ${item.allocated_sessions}/${item.required_sessions} sesi`,
            )
            .join(" | ")}${sessionShortages.length > 4 ? " | ..." : ""}`}
        />
      ) : null} */}

      {displayGenerateResult ? (
        <Card
          size="small"
          style={{
            marginBottom: 20,
            borderRadius: 18,
            borderColor: "#ead9cc",
            background: "#fffaf4",
          }}
          title="Ringkasan Generate Terakhir"
        >
          <Space orientation="vertical" size={12} style={{ width: "100%" }}>
            <Alert
              showIcon
              type={
                displayGenerateResult.dry_run
                  ? "info"
                  : (displayGenerateResult.failed_items || []).length > 0
                    ? "warning"
                    : "success"
              }
              title={
                displayGenerateResult.dry_run
                  ? "Mode simulasi"
                  : displayGenerateResult.operation === "reset_generated"
                    ? "Reset jadwal otomatis"
                    : "Generate jadwal"
              }
              description={`Aksi: ${GENERATE_ACTION_OPTIONS.find((item) => item.value === displayGenerateResult.action)?.label || displayGenerateResult.action}. Generated: ${displayGenerateResult.summary?.generated_entries || 0}. Konflik: ${displayGenerateResult.summary?.failed_count || 0}. Generated lama yang dibersihkan: ${displayGenerateResult.summary?.deleted_generated_entries || 0}.`}
            />

            <Space wrap>
              <Tag color="blue">
                Load: {displayGenerateResult.summary?.total_loads || 0}
              </Tag>
              <Tag color="geekblue">
                Slot: {displayGenerateResult.summary?.total_slots || 0}
              </Tag>
              <Tag color="purple">
                Rule guru: {displayGenerateResult.summary?.weekly_rules || 0}
              </Tag>
              <Tag color="gold">
                Manual tersimpan:{" "}
                {displayGenerateResult.summary?.existing_entries
                  ?.manual_entries || 0}
              </Tag>
              <Tag color="red">
                Locked tersimpan:{" "}
                {displayGenerateResult.summary?.existing_entries
                  ?.locked_entries || 0}
              </Tag>
            </Space>

            {(displayGenerateResult.failed_summary || []).length > 0 ? (
              <Space wrap>
                {displayGenerateResult.failed_summary.map((item) => (
                  <Tag key={item.code} color="orange">
                    {item.label}: {item.count}
                  </Tag>
                ))}
              </Space>
            ) : null}

            {(displayGenerateResult.failed_items || []).length > 0 ? (
              <Table
                rowKey="key"
                size="small"
                columns={failedColumns}
                dataSource={displayGenerateResult.failed_items.slice(0, 10)}
                pagination={false}
                scroll={{ x: 720 }}
              />
            ) : null}
          </Space>
        </Card>
      ) : null}

      {!timetableRows.length ? (
        <Empty description="Belum ada jadwal untuk ditampilkan." />
      ) : (
        <Card
          size="small"
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
          <Tabs
            defaultActiveKey="timetable"
            style={{ padding: "0 16px 16px" }}
            items={[
              {
                key: "timetable",
                label: "Jadwal",
                children: (
                  <ScheduleTimetableBoard
                    canManage={canManage}
                    flatClasses={flatClasses}
                    gradeGroups={gradeGroups}
                    loading={loading}
                    onEditEntry={openEditor}
                    rows={timetableRows}
                  />
                ),
              },
              {
                key: "teacher-subject",
                label: "Guru dan Mapel",
                children: (
                  <ScheduleTeacherMapelTable
                    loading={loading}
                    rows={teacherSummaryRows}
                  />
                ),
              },
            ]}
          />
        </Card>
      )}

      <Modal
        open={openGenerateModal}
        title="Generate Jadwal"
        onCancel={() => setOpenGenerateModal(false)}
        onOk={handleGenerateSubmit}
        okText={generatePreview ? "Jalankan Simulasi" : "Jalankan"}
        confirmLoading={loading}
      >
        <Form form={generateForm} layout="vertical">
          <Form.Item name="action" label="Aksi" rules={[{ required: true }]}>
            <Select
              options={GENERATE_ACTION_OPTIONS.map((item) => ({
                value: item.value,
                label: item.label,
              }))}
            />
          </Form.Item>
          <Alert
            showIcon
            type="info"
            style={{ marginBottom: 16 }}
            title={
              GENERATE_ACTION_OPTIONS.find(
                (item) => item.value === generateAction,
              )?.label || "Generate"
            }
            description={
              GENERATE_ACTION_OPTIONS.find(
                (item) => item.value === generateAction,
              )?.description || "-"
            }
          />
          <Form.Item
            name="dry_run"
            label="Simulasi terlebih dahulu"
            valuePropName="checked"
          >
            <Switch checkedChildren="Simulasi" unCheckedChildren="Eksekusi" />
          </Form.Item>
          <Alert
            showIcon
            type={generatePreview ? "warning" : "success"}
            title={
              generatePreview
                ? "Tidak ada data yang diubah"
                : "Perubahan akan diterapkan"
            }
            description={
              generatePreview
                ? "Sistem hanya menghitung hasil, konflik, dan jumlah entri yang bisa dibuat."
                : generateAction === "reset_generated"
                  ? "Semua jadwal otomatis yang tidak dikunci dan bukan manual override akan dibersihkan."
                  : "Sistem akan menulis hasil generate sesuai aksi yang dipilih."
            }
          />
        </Form>
      </Modal>

      <Modal
        open={openModal}
        title={
          modalMode === "create" ? "Tambah Jadwal Manual" : "Ubah Jadwal Manual"
        }
        onCancel={closeEntryModal}
        onOk={handleSubmit}
        okText="Simpan"
        confirmLoading={loading}
        footer={[
          isManualEditing ? (
            <Popconfirm
              key="delete"
              title="Hapus jadwal manual ini?"
              onConfirm={handleDeleteCurrentEntry}
            >
              <Button danger>Hapus</Button>
            </Popconfirm>
          ) : null,
          <Button key="cancel" onClick={closeEntryModal}>
            Batal
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleSubmit}
          >
            Simpan
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical">
          {modalMode === "create" ? (
            <Form.Item
              name="teaching_load_id"
              label="Beban ajar"
              rules={[{ required: true, message: "Beban ajar wajib dipilih." }]}
            >
              <Select
                showSearch
                optionFilterProp="label"
                options={manualEntryOptions}
                placeholder="Pilih guru / mapel / kelas"
              />
            </Form.Item>
          ) : null}
          <Form.Item
            name="day_of_week"
            label="Hari"
            rules={[{ required: true }]}
          >
            <Select options={DAY_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="slot_start_id"
            label="Slot mulai"
            rules={[{ required: true }]}
          >
            <Select options={slotStartOptions} />
          </Form.Item>
          <Form.Item
            name="slot_count"
            label="Jumlah sesi"
            rules={[
              { required: true, message: "Jumlah sesi wajib diisi." },
              {
                validator: (_, value) => {
                  const numericValue = Number(value || 0);
                  if (numericValue <= 0) {
                    return Promise.reject(
                      new Error("Jumlah sesi harus lebih dari 0."),
                    );
                  }
                  if (numericValue > manualSlotCountLimit) {
                    return Promise.reject(
                      new Error(
                        `Jumlah sesi maksimal ${manualSlotCountLimit} sesuai sisa beban dan batas per pertemuan.`,
                      ),
                    );
                  }
                  return Promise.resolve();
                },
              },
            ]}
          >
            <InputNumber
              min={1}
              max={manualSlotCountLimit}
              style={{ width: "100%" }}
            />
          </Form.Item>
          {selectedLoadHelper ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              title="Batas sesi manual"
              description={`Sisa beban: ${selectedLoadHelper.remainingSessions} sesi. Maks sesi per pertemuan: ${selectedLoadHelper.maxSessionsPerMeeting} sesi. Input yang diizinkan maksimal ${manualSlotCountLimit} sesi.`}
            />
          ) : null}
          {editing ? (
            <Alert
              type="warning"
              showIcon
              title={`${editing.class_name} | ${editing.subject_name}`}
              description={`Guru: ${editing.teacher_name}. Hasil generate tidak akan menimpa perubahan manual ini selama tidak bentrok.`}
            />
          ) : modalMode === "create" ? (
            <Alert
              type="info"
              showIcon
              title="Jadwal manual akan dipertahankan saat generate"
              description="Pilih beban ajar yang valid, lalu tentukan hari, slot mulai, dan jumlah sesi."
            />
          ) : null}
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleTimetableCard;
