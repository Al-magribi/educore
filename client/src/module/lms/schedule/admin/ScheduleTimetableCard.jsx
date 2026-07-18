import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Empty,
  Form,
  Grid,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Tabs,
  Tag,
} from "antd";
import { Eraser, LayoutGrid, Plus, RefreshCcw } from "lucide-react";
import ScheduleTeacherMapelTable from "./ScheduleTeacherMapelTable";
import ScheduleTimetableBoard from "./ScheduleTimetableBoard";
import {
  formatTime,
} from "./scheduleTimetableUtils";
import {
  SCHEDULE_CARD_BODY,
  SCHEDULE_CARD_STYLE,
  SCHEDULE_INNER_CARD_BODY,
  SCHEDULE_INNER_CARD_STYLE,
  SCHEDULE_TAG_STYLE,
} from "./scheduleAdminStyles";

const DAY_OPTIONS = [
  { value: 1, label: "Senin" },
  { value: 2, label: "Selasa" },
  { value: 3, label: "Rabu" },
  { value: 4, label: "Kamis" },
  { value: 5, label: "Jumat" },
  { value: 6, label: "Sabtu" },
  { value: 7, label: "Minggu" },
];

const { useBreakpoint } = Grid;

const assignmentKey = (item) =>
  `${Number(item.teacher_id)}:${Number(item.subject_id)}:${Number(item.class_id)}`;

const ScheduleTimetableCard = ({
  canManage,
  configs,
  groups,
  entries,
  activities,
  activityTargets,
  slots,
  breaks,
  classes,
  grades,
  teachers,
  teacherAssignments,
  selectedConfig,
  selectedGroup,
  groupCount = 0,
  loading,
  onSelectConfig,
  onSelectGroup,
  onCreateEntry,
  onDeleteEntry,
  onClearEntries,
  onRefresh,
  onUpdateEntry,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalMode, setModalMode] = useState("edit");
  const [form] = Form.useForm();

  const configOptions = useMemo(
    () =>
      (configs || []).map((item) => ({
        value: Number(item.id),
        label: item.name,
      })),
    [configs],
  );
  const groupOptions = useMemo(
    () =>
      (groups || []).map((item) => ({
        value: Number(item.id),
        label: item.name,
      })),
    [groups],
  );

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

    return [...grouped.values()].sort((a, b) =>
      (a.teacher_name || "").localeCompare(b.teacher_name || ""),
    );
  }, [teacherAssignments, teachers]);

  const assignmentMap = useMemo(
    () =>
      new Map(
        (teacherAssignments || []).map((item) => [
          assignmentKey(item),
          item,
        ]),
      ),
    [teacherAssignments],
  );

  const manualEntryOptions = useMemo(
    () =>
      (teacherAssignments || [])
        .map((item) => ({
          value: assignmentKey(item),
          label: `${item.teacher_name} | ${item.subject_name} | ${item.class_name}`,
        }))
        .sort((left, right) => left.label.localeCompare(right.label)),
    [teacherAssignments],
  );

  const openEditor = useCallback(
    (record) => {
      setModalMode("edit");
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

  const openCreateManualDialog = useCallback(() => {
    setModalMode("create");
    setEditing(null);
    form.resetFields();
    form.setFieldsValue({
      assignment_key: undefined,
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
      const assignment = assignmentMap.get(values.assignment_key);
      if (!assignment) return;
      await onCreateEntry({
        teacher_id: assignment.teacher_id,
        subject_id: assignment.subject_id,
        class_id: assignment.class_id,
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

  const currentDay = Form.useWatch("day_of_week", form);
  const currentAssignmentKey = Form.useWatch("assignment_key", form);
  const currentSlotCount = Form.useWatch("slot_count", form);
  const currentAssignment = useMemo(() => {
    if (modalMode === "create") {
      return assignmentMap.get(currentAssignmentKey) || null;
    }
    if (!editing) return null;
    return {
      teacher_id: editing.teacher_id,
      class_id: editing.class_id,
      subject_id: editing.subject_id,
      teacher_name: editing.teacher_name,
      subject_name: editing.subject_name,
      class_name: editing.class_name,
    };
  }, [assignmentMap, currentAssignmentKey, editing, modalMode]);

  const manualSlotCountLimit = useMemo(() => {
    const daySlots = slotByDay.get(Number(currentDay)) || [];
    return Math.max(1, daySlots.length || 1);
  }, [currentDay, slotByDay]);

  const slotStartOptions = useMemo(() => {
    const rows = slotByDay.get(Number(currentDay)) || [];
    const selectedSlotCount = Math.max(
      1,
      Math.min(Number(currentSlotCount || 1), manualSlotCountLimit),
    );
    const activeAssignment =
      modalMode === "create"
        ? currentAssignment
        : editing
          ? {
              teacher_id: editing.teacher_id,
              class_id: editing.class_id,
            }
          : null;

    if (!rows.length || !activeAssignment) {
      return rows.map((slot) => ({
        value: slot.id,
        label: `Jam ${slot.slot_no} (${formatTime(slot.start_time)} - ${formatTime(slot.end_time)})`,
      }));
    }

    const day = Number(currentDay);
    const classId = Number(activeAssignment.class_id);
    const teacherId = Number(activeAssignment.teacher_id);
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
    editing,
    expandedEntries,
    form,
    manualSlotCountLimit,
    modalMode,
    slotByDay,
    currentAssignment,
  ]);

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

  const manualEntryCount = useMemo(
    () =>
      (entries || []).filter(
        (item) =>
          item.source_type === "manual" || Boolean(item.is_manual_override),
      ).length,
    [entries],
  );
  const totalActivityCount = useMemo(
    () => (activities || []).filter((item) => item?.is_active !== false).length,
    [activities],
  );

  const handleClearEntries = async () => {
    if (!onClearEntries) return;
    await onClearEntries();
  };

  return (
    <Card
      style={{ ...SCHEDULE_CARD_STYLE, width: "100%", maxWidth: "100%" }}
      styles={{ body: SCHEDULE_CARD_BODY }}
      title={
        <Space>
          <LayoutGrid size={18} />
          <span>Jadwal Final</span>
        </Space>
      }
      extra={
        <Space wrap style={{ width: "100%", justifyContent: "flex-end" }}>
          {(configs || []).length > 1 ? (
            <Select
              value={selectedConfig ? Number(selectedConfig.id) : undefined}
              onChange={onSelectConfig}
              options={configOptions}
              placeholder='Pilih konfigurasi jadwal'
              style={{ width: isMobile ? "100%" : 240, maxWidth: "100%" }}
              loading={loading}
            />
          ) : null}
          {groupCount > 1 ? (
            <Select
              value={selectedGroup ? Number(selectedGroup.id) : undefined}
              onChange={onSelectGroup}
              options={groupOptions}
              placeholder='Pilih shift jadwal'
              style={{ width: isMobile ? "100%" : 200, maxWidth: "100%" }}
              loading={loading}
            />
          ) : null}
          <Button
            icon={<RefreshCcw size={14} />}
            onClick={onRefresh}
            loading={loading}
          >
            Muat Ulang
          </Button>
          {canManage && (entries || []).length > 0 ? (
            <Popconfirm
              title='Kosongkan jadwal final?'
              description={
                selectedGroup
                  ? `Semua entri pada shift "${selectedGroup.name}" untuk master yang dipilih akan dihapus.`
                  : "Semua entri jadwal final pada master yang dipilih akan dihapus."
              }
              okText='Kosongkan'
              cancelText='Batal'
              okButtonProps={{ danger: true }}
              onConfirm={handleClearEntries}
            >
              <Button danger icon={<Eraser size={14} />} loading={loading}>
                Kosongkan Jadwal
              </Button>
            </Popconfirm>
          ) : null}
          {canManage ? (
            <Button
              type='primary'
              icon={<Plus size={14} />}
              onClick={openCreateManualDialog}
            >
              Tambah Jadwal Manual
            </Button>
          ) : null}
        </Space>
      }
    >
      <Space direction='vertical' size={16} style={{ width: "100%" }}>
        <Card
          size='small'
          style={SCHEDULE_INNER_CARD_STYLE}
          styles={{ body: SCHEDULE_INNER_CARD_BODY }}
        >
          <Space size={[8, 8]} wrap>
            <Tag color='blue' style={SCHEDULE_TAG_STYLE}>
              Entri jadwal: {(entries || []).length}
            </Tag>
            <Tag color='geekblue' style={SCHEDULE_TAG_STYLE}>
              Jadwal manual: {manualEntryCount}
            </Tag>
            <Tag color='purple' style={SCHEDULE_TAG_STYLE}>
              Kegiatan aktif: {totalActivityCount}
            </Tag>
            <Tag color='gold' style={SCHEDULE_TAG_STYLE}>
              Guru aktif: {teacherSummaryRows.length}
            </Tag>
          </Space>
        </Card>

        <Alert
          showIcon
          type='info'
          message='Penyusunan jadwal dilakukan manual'
          description='Gunakan tombol Tambah Jadwal Manual untuk menempatkan sesi, lalu klik kotak pelajaran di board untuk mengubah hari, slot, atau jumlah sesi. Validasi bentrok kelas, guru, dan kegiatan tetap berjalan.'
        />

        {!timetableRows.length ? (
          <Card
            size='small'
            style={SCHEDULE_INNER_CARD_STYLE}
            styles={{ body: { ...SCHEDULE_INNER_CARD_BODY, paddingBlock: 32 } }}
          >
            <Empty description='Belum ada jadwal untuk ditampilkan.' />
          </Card>
        ) : (
          <Card
            size='small'
            style={SCHEDULE_INNER_CARD_STYLE}
            styles={{
              header: {
                background: "#f8fbff",
                borderBottom: "1px solid #e2e8f0",
              },
              body: { padding: 0 },
            }}
          >
            <Tabs
              defaultActiveKey='timetable'
              style={{ padding: "0 16px 16px", maxWidth: "100%" }}
              items={[
                {
                  key: "timetable",
                  label: "Board Jadwal",
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
      </Space>

      <Modal
        open={openModal}
        title={
          modalMode === "create" ? "Tambah Jadwal Manual" : "Ubah Jadwal Manual"
        }
        onCancel={closeEntryModal}
        onOk={handleSubmit}
        okText='Simpan'
        confirmLoading={loading}
        footer={[
          isManualEditing ? (
            <Popconfirm
              key='delete'
              title='Hapus jadwal manual ini?'
              onConfirm={handleDeleteCurrentEntry}
            >
              <Button danger>Hapus</Button>
            </Popconfirm>
          ) : null,
          <Button key='cancel' onClick={closeEntryModal}>
            Batal
          </Button>,
          <Button
            key='submit'
            type='primary'
            loading={loading}
            onClick={handleSubmit}
          >
            Simpan
          </Button>,
        ]}
      >
        <Form form={form} layout='vertical'>
          {modalMode === "create" ? (
            <Form.Item
              name='assignment_key'
              label='Guru / Mapel / Kelas'
              rules={[
                { required: true, message: "Alokasi mengajar wajib dipilih." },
              ]}
            >
              <Select
                showSearch
                optionFilterProp='label'
                options={manualEntryOptions}
                placeholder='Pilih guru / mapel / kelas'
              />
            </Form.Item>
          ) : null}
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
                        `Jumlah sesi maksimal ${manualSlotCountLimit} sesuai slot tersedia pada hari tersebut.`,
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
          {editing ? (
            <Alert
              type='warning'
              showIcon
              message={`${editing.class_name} | ${editing.subject_name}`}
              description={`Guru: ${editing.teacher_name}. Perubahan pada jadwal ini akan dicatat sebagai penyesuaian manual.`}
            />
          ) : modalMode === "create" ? (
            <Alert
              type='info'
              showIcon
              message='Tambahkan jadwal final secara manual'
              description='Pilih guru, mapel, dan kelas dari alokasi mengajar, lalu tentukan hari, slot mulai, dan jumlah sesi.'
            />
          ) : null}
        </Form>
      </Modal>
    </Card>
  );
};

export default ScheduleTimetableCard;
