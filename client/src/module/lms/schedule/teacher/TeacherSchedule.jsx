import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Grid,
  Row,
  Segmented,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { CalendarRange, Clock3, Layers3, RefreshCw } from "lucide-react";
import { useGetScheduleBootstrapQuery } from "../../../../service/lms/ApiSchedule";
import { formatTime } from "../admin/scheduleTimetableUtils";
import TeacherScheduleBoard from "./TeacherScheduleBoard";

const { Text, Title } = Typography;
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

const dayNameByValue = DAY_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const getTodayScheduleKey = () => {
  const weekday = dayjs().day();
  return weekday === 0 ? 7 : weekday;
};

const normalizeSlotNos = (item) =>
  Array.isArray(item?.slot_nos) && item.slot_nos.length
    ? item.slot_nos.map((value) => Number(value)).filter(Boolean)
    : [];

const toTimeKey = (value) => String(value || "").slice(0, 5);

const timesOverlap = (entryStart, entryEnd, slotStart, slotEnd) => {
  const start = toTimeKey(entryStart);
  const end = toTimeKey(entryEnd);
  const slotStartKey = toTimeKey(slotStart);
  const slotEndKey = toTimeKey(slotEnd);
  if (!start || !end || !slotStartKey || !slotEndKey) return false;
  return start < slotEndKey && end > slotStartKey;
};

const entryMatchesSlot = (entry, slot) => {
  if (!entry || !slot) return false;
  if (
    entry.slot_start_id != null &&
    Number(entry.slot_start_id) === Number(slot.id)
  ) {
    return true;
  }
  const slotNos = normalizeSlotNos(entry);
  if (!slotNos.includes(Number(slot.slot_no))) return false;
  return timesOverlap(
    entry.start_time,
    entry.end_time,
    slot.start_time,
    slot.end_time,
  );
};

const TeacherSchedule = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isNarrow = !screens.sm;
  const { user } = useSelector((state) => state.auth);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const { data, isLoading, isFetching, refetch } =
    useGetScheduleBootstrapQuery(
      {
        groupId: selectedGroupId || undefined,
      },
      {
        placeholderData: (previousData) => previousData,
      },
    );

  const payload = data?.data || {};
  const configGroups = payload.config_groups || [];
  const selectedConfig = payload.selected_config || payload.config || null;
  const selectedGroup =
    configGroups.find((item) => Number(item.id) === Number(selectedGroupId)) ||
    payload.selected_group ||
    null;
  const todayKey = getTodayScheduleKey();

  const teacherEntries = useMemo(() => {
    return (payload.entries || [])
      .filter((item) => Number(item.teacher_id) === Number(user?.id))
      .map((item) => {
        const slotNos = normalizeSlotNos(item);
        return {
          ...item,
          key: item.id,
          day_name: dayNameByValue[Number(item.day_of_week)] || "-",
          time_label: `${formatTime(item.start_time)} - ${formatTime(item.end_time)}`,
          slot_label: slotNos.length ? slotNos.join(", ") : "-",
        };
      })
      .sort((left, right) => {
        const dayCompare = Number(left.day_of_week) - Number(right.day_of_week);
        if (dayCompare !== 0) return dayCompare;
        return String(left.start_time || "").localeCompare(
          String(right.start_time || ""),
        );
      });
  }, [payload.entries, user?.id]);

  useEffect(() => {
    if (!configGroups.length) {
      if (selectedGroupId !== null) {
        setSelectedGroupId(null);
      }
      return;
    }

    const hasSelectedGroup = configGroups.some(
      (item) => Number(item.id) === Number(selectedGroupId),
    );
    if (hasSelectedGroup) return;

    const teacherGroupIds = new Set(
      teacherEntries
        .map((item) => Number(item.config_group_id))
        .filter(Boolean),
    );
    const preferredGroup =
      configGroups.find((item) => teacherGroupIds.has(Number(item.id))) ||
      configGroups.find(
        (item) => Number(item.id) === Number(payload.selected_group_id),
      ) ||
      configGroups[0];

    if (preferredGroup?.id) {
      setSelectedGroupId(Number(preferredGroup.id));
    }
  }, [
    configGroups,
    payload.selected_group_id,
    selectedGroupId,
    teacherEntries,
  ]);

  const teacherAssignments = useMemo(() => {
    return (payload.teacher_assignments || []).filter(
      (item) => Number(item.teacher_id) === Number(user?.id),
    );
  }, [payload.teacher_assignments, user?.id]);

  const selectedClassIds = useMemo(() => {
    return new Set(
      (payload.all_group_classes || payload.selected_group_classes || [])
        .filter(
          (item) =>
            !selectedGroupId ||
            Number(item.config_group_id) === Number(selectedGroupId),
        )
        .map((item) => Number(item.class_id))
        .filter(Boolean),
    );
  }, [
    payload.all_group_classes,
    payload.selected_group_classes,
    selectedGroupId,
  ]);

  const shiftSlots = useMemo(() => {
    const allSlots = payload.all_slots || [];
    if (selectedGroupId && allSlots.length) {
      return allSlots.filter(
        (slot) => Number(slot.config_group_id) === Number(selectedGroupId),
      );
    }
    if (
      selectedGroupId &&
      Number(payload.selected_group_id) === Number(selectedGroupId)
    ) {
      return payload.slots || [];
    }
    return [];
  }, [
    payload.all_slots,
    payload.selected_group_id,
    payload.slots,
    selectedGroupId,
  ]);

  const groupEntries = useMemo(() => {
    if (!selectedGroupId) return [];

    const shiftSlotIds = new Set(
      shiftSlots.map((slot) => Number(slot.id)).filter(Boolean),
    );
    const shiftLessonSlots = shiftSlots.filter((slot) => slot.is_break !== true);

    return teacherEntries.filter((item) => {
      if (item.config_group_id != null) {
        return Number(item.config_group_id) === Number(selectedGroupId);
      }

      if (
        item.slot_start_id != null &&
        shiftSlotIds.size > 0 &&
        shiftSlotIds.has(Number(item.slot_start_id))
      ) {
        return true;
      }

      if (shiftLessonSlots.length) {
        return shiftLessonSlots.some((slot) => entryMatchesSlot(item, slot));
      }

      return selectedClassIds.has(Number(item.class_id));
    });
  }, [selectedClassIds, selectedGroupId, shiftSlots, teacherEntries]);

  const shiftBreaks = useMemo(() => {
    const fromSlots = shiftSlots
      .filter((slot) => slot.is_break === true)
      .map((slot) => ({
        day_of_week: Number(slot.day_of_week),
        break_start: slot.start_time,
        break_end: slot.end_time,
        label: "Istirahat",
      }));
    if (fromSlots.length) return fromSlots;
    if (Number(payload.selected_group_id) === Number(selectedGroupId)) {
      return payload.breaks || [];
    }
    return [];
  }, [
    payload.breaks,
    payload.selected_group_id,
    selectedGroupId,
    shiftSlots,
  ]);

  const shiftActivities = useMemo(() => {
    const source = (payload.all_activities || []).length
      ? payload.all_activities
      : payload.activities || [];
    return source.filter((activity) => {
      if (activity?.is_active === false) return false;
      if (!selectedGroupId) return false;
      if (activity.config_group_id == null) {
        return Number(payload.selected_group_id) === Number(selectedGroupId);
      }
      return Number(activity.config_group_id) === Number(selectedGroupId);
    });
  }, [
    payload.all_activities,
    payload.activities,
    payload.selected_group_id,
    selectedGroupId,
  ]);

  const shiftActivityTargets = payload.all_activity_targets?.length
    ? payload.all_activity_targets
    : payload.activity_targets || [];

  const subjectCount = useMemo(() => {
    return new Set(
      teacherEntries.map((item) => Number(item.subject_id)).filter(Boolean),
    ).size;
  }, [teacherEntries]);

  const classCount = useMemo(() => {
    return new Set(
      teacherEntries.map((item) => Number(item.class_id)).filter(Boolean),
    ).size;
  }, [teacherEntries]);

  const totalSessions = useMemo(() => {
    return teacherEntries.reduce(
      (total, item) => total + Number(item.slot_count || 0),
      0,
    );
  }, [teacherEntries]);

  const todayEntries = useMemo(() => {
    return groupEntries.filter(
      (item) => Number(item.day_of_week) === Number(todayKey),
    );
  }, [groupEntries, todayKey]);

  const pendingAssignments = useMemo(() => {
    const allocatedByAssignment = teacherEntries.reduce((acc, item) => {
      const key = [item.teacher_id, item.subject_id, item.class_id].join(":");
      acc[key] = (acc[key] || 0) + Number(item.slot_count || 0);
      return acc;
    }, {});

    return teacherAssignments
      .map((item) => {
        const key = [item.teacher_id, item.subject_id, item.class_id].join(":");
        const allocatedSessions = allocatedByAssignment[key] || 0;
        const requiredSessions = Number(item.weekly_sessions || 0);
        return {
          key,
          subject_name: item.subject_name,
          class_name: item.class_name,
          required_sessions: requiredSessions,
          allocated_sessions: allocatedSessions,
          missing_sessions: Math.max(requiredSessions - allocatedSessions, 0),
        };
      })
      .filter(
        (item) => item.required_sessions > 0 && item.missing_sessions > 0,
      );
  }, [teacherAssignments, teacherEntries]);

  const activitiesBySlotId = useMemo(() => {
    const map = new Map();
    const teacherId = Number(user?.id);
    const targetsByActivityId = shiftActivityTargets.reduce((acc, item) => {
      const key = Number(item.activity_id);
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {});

    shiftActivities.forEach((activity) => {
      if (activity?.is_active === false) return;
      const slotIds = Array.isArray(activity.slot_ids)
        ? activity.slot_ids.map((item) => Number(item)).filter(Boolean)
        : [];
      if (!slotIds.length) return;

      const isAllClasses = activity.scope_type === "all_classes";
      const targetsTeacher = (
        targetsByActivityId[Number(activity.id)] || []
      ).some((item) => Number(item.teacher_id) === teacherId);
      if (!isAllClasses && !targetsTeacher) return;

      slotIds.forEach((slotId) => {
        if (!map.has(slotId)) map.set(slotId, []);
        map.get(slotId).push(activity);
      });
    });

    return map;
  }, [shiftActivities, shiftActivityTargets, user?.id]);

  const daySchedules = useMemo(() => {
    const slotsByDay = new Map();
    shiftSlots.forEach((slot) => {
      const day = Number(slot.day_of_week);
      if (!slotsByDay.has(day)) slotsByDay.set(day, []);
      slotsByDay.get(day).push(slot);
    });

    const breaksByDay = new Map();
    shiftBreaks.forEach((item) => {
      const day = Number(item.day_of_week);
      if (!breaksByDay.has(day)) breaksByDay.set(day, []);
      breaksByDay.get(day).push(item);
    });

    return DAY_OPTIONS.map((day) => {
      const daySlots = [...(slotsByDay.get(day.value) || [])].sort((left, right) =>
        String(left.start_time || "").localeCompare(String(right.start_time || "")),
      );
      const dayEntries = groupEntries.filter(
        (item) => Number(item.day_of_week) === Number(day.value),
      );

      const lessonRows = daySlots
        .filter((slot) => slot.is_break !== true)
        .map((slot) => {
          const matchingEntries = dayEntries.filter((entry) =>
            entryMatchesSlot(entry, slot),
          );
          const entry = matchingEntries[0] || null;
          return {
            key: `day-${day.value}-slot-${slot.id || slot.slot_no}`,
            sort_key: String(slot.start_time || ""),
            is_break: false,
            slot_no: Number(slot.slot_no),
            time_label: `${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`,
            entry,
            activities: activitiesBySlotId.get(Number(slot.id)) || [],
          };
        });

      const breakRows = (breaksByDay.get(day.value) || []).map((item, index) => ({
        key: `day-${day.value}-break-${index}`,
        sort_key: String(item.break_start || ""),
        is_break: true,
        break_label: item.label || "Istirahat",
        time_label: `${formatTime(item.break_start)} - ${formatTime(item.break_end)}`,
        entry: null,
        activities: [],
      }));

      // Fallback: if shift has no slot structure yet, list teaching entries by their real times.
      const fallbackRows =
        !lessonRows.length && dayEntries.length
          ? dayEntries.map((entry) => ({
              key: `day-${day.value}-entry-${entry.id}`,
              sort_key: String(entry.start_time || ""),
              is_break: false,
              slot_no: normalizeSlotNos(entry)[0] || "-",
              time_label: entry.time_label,
              entry,
              activities: [],
            }))
          : [];

      const rows = [...lessonRows, ...breakRows, ...fallbackRows].sort((left, right) =>
        String(left.sort_key || "").localeCompare(String(right.sort_key || "")),
      );

      // Collapse consecutive slots that belong to the same multi-jam entry.
      const collapsed = [];
      rows.forEach((row) => {
        const previous = collapsed[collapsed.length - 1];
        if (
          previous &&
          !previous.is_break &&
          !row.is_break &&
          previous.entry &&
          row.entry &&
          Number(previous.entry.id) === Number(row.entry.id)
        ) {
          previous.time_label = `${previous.time_label.split(" - ")[0]} - ${
            row.time_label.split(" - ")[1] || row.time_label
          }`;
          previous.slot_no = `${previous.slot_no}-${row.slot_no}`;
          return;
        }
        collapsed.push({ ...row });
      });

      return {
        ...day,
        items: dayEntries,
        session_count: dayEntries.reduce((total, entry) => {
          const fromCount = Number(entry.slot_count || 0);
          if (fromCount > 0) return total + fromCount;
          const fromSlots = normalizeSlotNos(entry).length;
          return total + Math.max(fromSlots, 1);
        }, 0),
        rows: collapsed,
      };
    }).filter((day) => day.rows.length > 0 || day.items.length > 0);
  }, [activitiesBySlotId, groupEntries, shiftBreaks, shiftSlots]);

  const groupOptions = useMemo(() => {
    const classesByGroup = (payload.all_group_classes || []).reduce(
      (acc, item) => {
        const key = Number(item.config_group_id);
        if (!acc[key]) acc[key] = [];
        if (item.class_name) acc[key].push(item.class_name);
        return acc;
      },
      {},
    );
    const classIdsByGroup = (payload.all_group_classes || []).reduce(
      (acc, item) => {
        const groupId = Number(item.config_group_id);
        const classId = Number(item.class_id);
        if (!Number.isFinite(groupId) || !Number.isFinite(classId)) return acc;
        if (!acc[groupId]) acc[groupId] = new Set();
        acc[groupId].add(classId);
        return acc;
      },
      {},
    );
    const entryCountByGroup = teacherEntries.reduce((acc, item) => {
      const groupId = Number(item.config_group_id);
      if (Number.isFinite(groupId) && groupId > 0) {
        acc[groupId] = (acc[groupId] || 0) + 1;
        return acc;
      }
      const classId = Number(item.class_id);
      Object.entries(classIdsByGroup).forEach(([key, classIds]) => {
        if (classIds.has(classId)) {
          acc[Number(key)] = (acc[Number(key)] || 0) + 1;
        }
      });
      return acc;
    }, {});

    return configGroups.map((item) => {
      const groupId = Number(item.id);
      const classNames = classesByGroup[groupId] || [];
      const lessonCount = entryCountByGroup[groupId] || 0;
      const classHint =
        classNames.length > 0
          ? classNames.slice(0, 3).join(", ") +
            (classNames.length > 3 ? "…" : "")
          : Number(item.class_count)
            ? `${item.class_count} kelas`
            : "";
      return {
        value: groupId,
        label: item.name,
        classHint,
        lessonCount,
      };
    });
  }, [configGroups, payload.all_group_classes, teacherEntries]);

  const handleSelectGroup = (value) => {
    const nextGroupId = Number(value);
    if (!Number.isFinite(nextGroupId) || nextGroupId <= 0) return;
    if (nextGroupId === Number(selectedGroupId)) return;
    setSelectedGroupId(nextGroupId);
  };

  const renderShiftPicker = (block = false) => {
    if (!groupOptions.length) return null;

    if (isNarrow || groupOptions.length > 4) {
      return (
        <Select
          value={selectedGroupId || undefined}
          style={{
            minWidth: block || isMobile ? "100%" : 220,
            width: block || isMobile ? "100%" : 220,
            maxWidth: "100%",
          }}
          placeholder='Pilih shift kelas'
          onChange={handleSelectGroup}
          options={groupOptions.map((item) => ({
            value: item.value,
            label: item.classHint
              ? `${item.label} · ${item.classHint}`
              : item.label,
          }))}
        />
      );
    }

    return (
      <Segmented
        block={block}
        value={selectedGroupId || undefined}
        onChange={handleSelectGroup}
        style={{ maxWidth: "100%" }}
        options={groupOptions.map((item) => ({
          value: item.value,
          label: item.lessonCount
            ? `${item.label} (${item.lessonCount})`
            : item.label,
        }))}
      />
    );
  };

  const selectedGroupClasses = useMemo(() => {
    return (payload.all_group_classes || [])
      .filter(
        (item) => Number(item.config_group_id) === Number(selectedGroupId),
      )
      .map((item) => item.class_name)
      .filter(Boolean);
  }, [payload.all_group_classes, selectedGroupId]);

  const todayColumns = useMemo(() => {
    if (isNarrow) {
      return [
        {
          title: "Jadwal",
          key: "mobile",
          render: (_, record) => (
            <Flex vertical gap={2} style={{ minWidth: 0 }}>
              <Text strong style={{ wordBreak: "break-word" }}>
                {record.subject_name || "-"}
              </Text>
              <Text type='secondary'>
                {record.class_name || "-"} · Jam {record.slot_label}
              </Text>
              <Text type='secondary'>{record.time_label}</Text>
            </Flex>
          ),
        },
      ];
    }

    return [
      {
        title: "Waktu",
        dataIndex: "time_label",
        width: isMobile ? 120 : 140,
      },
      {
        title: "Jam Ke",
        dataIndex: "slot_label",
        width: isMobile ? 90 : 110,
        render: (value) => <Tag>{value}</Tag>,
      },
      {
        title: "Kelas",
        dataIndex: "class_name",
        width: isMobile ? 90 : 130,
        render: (value) => <Text strong>{value || "-"}</Text>,
      },
      {
        title: "Mata Pelajaran",
        dataIndex: "subject_name",
        render: (value, record) => (
          <Space direction='vertical' size={0}>
            <Text strong>{value || "-"}</Text>
            <Text type='secondary'>{record.subject_code || "-"}</Text>
          </Space>
        ),
      },
    ];
  }, [isMobile, isNarrow]);

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  return (
    <Flex
      vertical
      gap={isMobile ? 12 : 16}
      style={{ width: "100%", maxWidth: "100%", minWidth: 0 }}
    >
      <Card
        style={{
          borderRadius: isMobile ? 16 : 20,
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
        }}
        styles={{ body: { padding: isMobile ? 14 : 20 } }}
      >
        <Flex
          justify='space-between'
          align={isMobile ? "stretch" : "center"}
          vertical={isMobile}
          wrap='wrap'
          gap={12}
          style={{ width: "100%" }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <Title
              level={isMobile ? 5 : 4}
              style={{ margin: 0, wordBreak: "break-word" }}
            >
              Jadwal Mengajar
            </Title>
            <Text type='secondary' style={{ display: "block" }}>
              Jadwal mengajar {user?.full_name || "guru"}
              {selectedConfig?.name ? ` pada ${selectedConfig.name}` : ""}.
            </Text>
          </div>

          <Flex
            gap={8}
            wrap='wrap'
            style={{
              width: isMobile ? "100%" : "auto",
              maxWidth: "100%",
            }}
          >
            <div style={{ flex: isMobile ? "1 1 160px" : "0 0 auto", minWidth: 0 }}>
              {renderShiftPicker(isMobile)}
            </div>
            <Button
              icon={<RefreshCw size={14} />}
              onClick={() => refetch()}
              loading={isFetching}
              style={{ flexShrink: 0 }}
              block={isNarrow}
            >
              {isNarrow ? "Muat Ulang" : "Muat Ulang"}
            </Button>
          </Flex>
        </Flex>
        {selectedGroupClasses.length ? (
          <Text
            type='secondary'
            style={{
              display: "block",
              marginTop: 8,
              fontSize: isMobile ? 12 : undefined,
              wordBreak: "break-word",
            }}
          >
            Kelas pada {selectedGroup?.name || "shift ini"}:{" "}
            {selectedGroupClasses.join(", ")}
          </Text>
        ) : null}
      </Card>

      <Flex vertical gap={isMobile ? 12 : 16} style={{ width: "100%", minWidth: 0 }}>
        <Row gutter={[12, 12]}>
          <Col xs={8} sm={8} md={8}>
            <Card
              size='small'
              bordered={false}
              style={{ background: "#f5f9ff", borderRadius: isMobile ? 14 : 18 }}
              styles={{ body: { padding: isMobile ? 10 : 16 } }}
            >
              <Space align='start' size={isMobile ? 6 : 8}>
                {!isNarrow ? <CalendarRange size={18} /> : null}
                <div style={{ minWidth: 0 }}>
                  <Text type='secondary' style={{ fontSize: isMobile ? 11 : undefined }}>
                    {isNarrow ? "Jadwal" : "Total Jadwal"}
                  </Text>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                    {teacherEntries.length}
                  </Title>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={8} sm={8} md={8}>
            <Card
              size='small'
              bordered={false}
              style={{ background: "#fff8f1", borderRadius: isMobile ? 14 : 18 }}
              styles={{ body: { padding: isMobile ? 10 : 16 } }}
            >
              <Space align='start' size={isMobile ? 6 : 8}>
                {!isNarrow ? <Clock3 size={18} /> : null}
                <div style={{ minWidth: 0 }}>
                  <Text type='secondary' style={{ fontSize: isMobile ? 11 : undefined }}>
                    {isNarrow ? "Sesi" : "Total Sesi"}
                  </Text>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                    {totalSessions}
                  </Title>
                </div>
              </Space>
            </Card>
          </Col>
          <Col xs={8} sm={8} md={8}>
            <Card
              size='small'
              bordered={false}
              style={{ background: "#f6fff7", borderRadius: isMobile ? 14 : 18 }}
              styles={{ body: { padding: isMobile ? 10 : 16 } }}
            >
              <Space align='start' size={isMobile ? 6 : 8}>
                {!isNarrow ? <Layers3 size={18} /> : null}
                <div style={{ minWidth: 0 }}>
                  <Text type='secondary' style={{ fontSize: isMobile ? 11 : undefined }}>
                    {isNarrow ? "K/M" : "Kelas / Mapel"}
                  </Text>
                  <Title level={isMobile ? 4 : 3} style={{ margin: 0 }}>
                    {classCount} / {subjectCount}
                  </Title>
                </div>
              </Space>
            </Card>
          </Col>
        </Row>

        {pendingAssignments.length ? (
          <Alert
            showIcon
            type='warning'
            message='Masih ada alokasi mengajar yang belum terpenuhi'
            description={
              isNarrow ? (
                <Flex vertical gap={4}>
                  {pendingAssignments.map((item) => (
                    <Text key={item.key} style={{ fontSize: 12 }}>
                      {item.subject_name} {item.class_name}:{" "}
                      {item.allocated_sessions}/{item.required_sessions} sesi
                    </Text>
                  ))}
                </Flex>
              ) : (
                pendingAssignments
                  .map(
                    (item) =>
                      `${item.subject_name} ${item.class_name}: ${item.allocated_sessions}/${item.required_sessions} sesi`,
                  )
                  .join(" | ")
              )
            }
          />
        ) : null}

        <Card
          title='Agenda Hari Ini'
          style={{
            borderRadius: isMobile ? 16 : 20,
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
          }}
          styles={{
            header: { paddingInline: isMobile ? 14 : 20 },
            body: { padding: isNarrow ? 12 : 0 },
          }}
        >
          {todayEntries.length ? (
            isNarrow ? (
              <Flex vertical gap={10}>
                {todayEntries.map((item) => (
                  <Card
                    key={item.key}
                    size='small'
                    style={{
                      borderRadius: 14,
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <Flex justify='space-between' align='start' gap={8}>
                      <div style={{ minWidth: 0 }}>
                        <Text strong style={{ display: "block" }}>
                          {item.subject_name || "-"}
                        </Text>
                        <Text type='secondary'>
                          {item.class_name || "-"} · {item.time_label}
                        </Text>
                      </div>
                      <Tag color='blue' style={{ marginInlineEnd: 0 }}>
                        Jam {item.slot_label}
                      </Tag>
                    </Flex>
                  </Card>
                ))}
              </Flex>
            ) : (
              <Table
                rowKey='key'
                columns={todayColumns}
                dataSource={todayEntries}
                pagination={false}
                size='small'
                scroll={{ x: isMobile ? 560 : 720 }}
                style={{ width: "100%" }}
              />
            )
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description='Tidak ada jadwal mengajar untuk hari ini.'
              style={{ padding: isNarrow ? 8 : 24 }}
            />
          )}
        </Card>

        {groupOptions.length > 1 &&
        selectedGroupId &&
        !groupEntries.length &&
        teacherEntries.length ? (
          <Alert
            showIcon
            type='info'
            message='Tidak ada jam mengajar pada shift ini. Pilih shift lain untuk melihat jadwal Anda.'
          />
        ) : null}

        <Card
          title={
            <span style={{ wordBreak: "break-word" }}>
              Jadwal Mingguan
              {selectedGroup?.name ? ` · ${selectedGroup.name}` : ""}
            </span>
          }
          extra={isMobile ? null : renderShiftPicker()}
          style={{
            borderRadius: isMobile ? 16 : 20,
            width: "100%",
            maxWidth: "100%",
            overflow: "hidden",
          }}
          styles={{
            header: {
              paddingInline: isMobile ? 14 : 20,
              flexWrap: "wrap",
              rowGap: 8,
            },
            body: { padding: 0 },
          }}
        >
          {configGroups.length && !selectedGroupId ? (
            <Skeleton active paragraph={{ rows: 8 }} style={{ padding: 16 }} />
          ) : daySchedules.length ? (
            <TeacherScheduleBoard
              key={selectedGroupId || "shift"}
              days={daySchedules}
              todayKey={todayKey}
            />
          ) : (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description='Belum ada jadwal mengajar yang tersedia.'
              style={{ padding: 24 }}
            />
          )}
        </Card>
      </Flex>
    </Flex>
  );
};

export default TeacherSchedule;
