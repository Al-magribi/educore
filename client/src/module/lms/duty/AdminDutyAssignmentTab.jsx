import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Grid,
  Input,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  CalendarDays,
  RefreshCcw,
  Save,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import {
  useDeleteDutyScheduleMutation,
  useGetDutyBootstrapQuery,
  useSaveDutyScheduleMutation,
} from "../../../service/lms/ApiDuty";

const { Text, Title } = Typography;
const { TextArea } = Input;
const { useBreakpoint } = Grid;

const WEEKDAYS = [
  { day_of_week: 1, day_label: "Senin" },
  { day_of_week: 2, day_label: "Selasa" },
  { day_of_week: 3, day_label: "Rabu" },
  { day_of_week: 4, day_label: "Kamis" },
  { day_of_week: 5, day_label: "Jumat" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const statCardStyle = {
  height: "100%",
  borderRadius: 22,
  border: "1px solid #dbe7f3",
  background: "linear-gradient(180deg, #ffffff 0%, #f8fbff 100%)",
  boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
};

const surfaceCardStyle = {
  borderRadius: 24,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const dayCardStyle = {
  borderRadius: 20,
  border: "1px solid #e8eef5",
  background: "#f8fbff",
  height: "100%",
};

const iconWrapStyle = (background) => ({
  width: 46,
  height: 46,
  borderRadius: 16,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background,
  color: "#fff",
  flexShrink: 0,
});

const buildEmptyDraft = () =>
  WEEKDAYS.reduce((acc, day) => {
    acc[day.day_of_week] = {
      day_of_week: day.day_of_week,
      day_label: day.day_label,
      teacher_ids: [],
      note: "",
    };
    return acc;
  }, {});

const AdminDutyAssignmentTab = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [draftByDay, setDraftByDay] = useState(buildEmptyDraft);

  const { data, isLoading, isFetching, refetch } = useGetDutyBootstrapQuery();
  const [saveDutySchedule, { isLoading: saving }] =
    useSaveDutyScheduleMutation();
  const [deleteDutySchedule, { isLoading: deleting }] =
    useDeleteDutyScheduleMutation();

  const payload = data?.data || {};
  const teachers = useMemo(() => payload.teachers || [], [payload.teachers]);
  const scheduleByDay = useMemo(
    () => payload.schedule_by_day || [],
    [payload.schedule_by_day],
  );
  const todayAssignments = useMemo(
    () => payload.today_assignments || [],
    [payload.today_assignments],
  );

  useEffect(() => {
    const nextDraft = buildEmptyDraft();
    for (const day of scheduleByDay) {
      const dayKey = Number(day.day_of_week);
      if (!nextDraft[dayKey]) continue;
      nextDraft[dayKey] = {
        day_of_week: dayKey,
        day_label: day.day_label || WEEKDAYS.find((item) => item.day_of_week === dayKey)?.day_label,
        teacher_ids: (day.teachers || []).map((item) => Number(item.duty_teacher_id)),
        note: day.note || "",
      };
    }
    setDraftByDay(nextDraft);
  }, [scheduleByDay]);

  const teacherOptions = useMemo(
    () =>
      teachers.map((item) => ({
        value: item.id,
        label: item.full_name,
        searchText: `${item.full_name} ${item.nip || ""}`.toLowerCase(),
      })),
    [teachers],
  );

  const summary = useMemo(() => {
    const assignedTeacherIds = new Set();
    let filledDays = 0;
    let totalSlots = 0;

    for (const day of Object.values(draftByDay)) {
      if (day.teacher_ids.length) {
        filledDays += 1;
        totalSlots += day.teacher_ids.length;
        day.teacher_ids.forEach((id) => assignedTeacherIds.add(Number(id)));
      }
    }

    return {
      filledDays,
      totalSlots,
      uniqueTeachers: assignedTeacherIds.size,
      todayCount: todayAssignments.length,
    };
  }, [draftByDay, todayAssignments.length]);

  const statItems = [
    {
      key: "days",
      title: "Hari Terisi",
      value: `${summary.filledDays}/5`,
      subtitle: "Senin sampai Jumat",
      icon: <CalendarDays size={20} />,
      background: "linear-gradient(135deg, #2563eb, #38bdf8)",
    },
    {
      key: "slots",
      title: "Slot Piket",
      value: summary.totalSlots,
      subtitle: `${summary.uniqueTeachers} guru unik`,
      icon: <Users size={20} />,
      background: "linear-gradient(135deg, #0f766e, #2dd4bf)",
    },
    {
      key: "today",
      title: "Piket Hari Ini",
      value: summary.todayCount,
      subtitle: payload.today || "-",
      icon: <ShieldCheck size={20} />,
      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
    },
  ];

  const updateDay = (dayOfWeek, patch) => {
    setDraftByDay((prev) => ({
      ...prev,
      [dayOfWeek]: {
        ...prev[dayOfWeek],
        ...patch,
      },
    }));
  };

  const handleSave = async () => {
    try {
      await saveDutySchedule({
        days: WEEKDAYS.map((day) => ({
          day_of_week: day.day_of_week,
          teacher_ids: draftByDay[day.day_of_week]?.teacher_ids || [],
          note: draftByDay[day.day_of_week]?.note || "",
        })),
      }).unwrap();
      message.success("Jadwal piket mingguan berhasil disimpan.");
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan jadwal piket.");
    }
  };

  const handleRemoveTeacher = async (scheduleId) => {
    try {
      await deleteDutySchedule(scheduleId).unwrap();
      message.success("Guru dihapus dari jadwal.");
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus dari jadwal.");
    }
  };

  if (isLoading) {
    return (
      <Card
        style={{ ...surfaceCardStyle, borderRadius: isMobile ? 20 : 24 }}
        styles={{ body: { padding: isMobile ? 18 : 22 } }}
      >
        <Skeleton active paragraph={{ rows: 10 }} />
      </Card>
    );
  }

  return (
    <motion.div
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <motion.div variants={itemVariants}>
        <Flex gap={16} wrap='wrap'>
          {statItems.map((item) => (
            <Card
              key={item.key}
              style={{
                ...statCardStyle,
                flex: "1 1 220px",
                minWidth: isMobile ? "100%" : 220,
              }}
              styles={{ body: { padding: 20 } }}
            >
              <Flex align='center' gap={14}>
                <div style={iconWrapStyle(item.background)}>{item.icon}</div>
                <div style={{ minWidth: 0 }}>
                  <Text type='secondary'>{item.title}</Text>
                  <Title
                    level={4}
                    style={{ margin: "4px 0 0", color: "#0f172a" }}
                  >
                    {item.value}
                  </Title>
                  <Text style={{ color: "#64748b" }}>{item.subtitle}</Text>
                </div>
              </Flex>
            </Card>
          ))}
        </Flex>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          style={surfaceCardStyle}
          styles={{ body: { padding: isMobile ? 16 : 20 } }}
        >
          <Flex vertical gap={18}>
            <Flex
              vertical={isMobile}
              justify='space-between'
              align={isMobile ? "stretch" : "center"}
              gap={14}
            >
              <div style={{ minWidth: 0 }}>
                <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
                  Jadwal Piket Mingguan
                </Title>
                <Text type='secondary'>
                  Atur sekali untuk Senin–Jumat. Jadwal yang sama berlaku setiap
                  minggu dan bisa diubah kapan saja.
                </Text>
              </div>

              <Space
                wrap
                size={[10, 10]}
                style={{ width: isMobile ? "100%" : "auto" }}
              >
                <Button
                  icon={<RefreshCcw size={14} />}
                  onClick={() => refetch()}
                  loading={isFetching}
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  Muat Ulang
                </Button>
                <Button
                  type='primary'
                  icon={<Save size={14} />}
                  onClick={handleSave}
                  loading={saving}
                  size='large'
                  style={{
                    width: isMobile ? "100%" : "auto",
                    borderRadius: 14,
                    boxShadow: "0 12px 28px rgba(37, 99, 235, 0.18)",
                  }}
                >
                  Simpan Jadwal
                </Button>
              </Space>
            </Flex>

            <Flex gap={16} wrap='wrap'>
              {WEEKDAYS.map((day) => {
                const draft = draftByDay[day.day_of_week] || {
                  teacher_ids: [],
                  note: "",
                };
                const savedTeachers =
                  scheduleByDay.find(
                    (item) => Number(item.day_of_week) === day.day_of_week,
                  )?.teachers || [];

                return (
                  <Card
                    key={day.day_of_week}
                    style={{
                      ...dayCardStyle,
                      flex: "1 1 280px",
                      minWidth: isMobile ? "100%" : 280,
                    }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Flex vertical gap={14}>
                      <Flex justify='space-between' align='center' gap={8}>
                        <div>
                          <Text
                            strong
                            style={{ color: "#0f172a", display: "block" }}
                          >
                            {day.day_label}
                          </Text>
                          <Text type='secondary' style={{ fontSize: 12 }}>
                            {draft.teacher_ids.length} guru ditugaskan
                          </Text>
                        </div>
                        <Tag
                          color={draft.teacher_ids.length ? "blue" : "default"}
                          style={{ margin: 0, borderRadius: 999 }}
                        >
                          Hari {day.day_of_week}
                        </Tag>
                      </Flex>

                      <Select
                        mode='multiple'
                        value={draft.teacher_ids}
                        onChange={(value) =>
                          updateDay(day.day_of_week, { teacher_ids: value })
                        }
                        placeholder={`Pilih guru piket ${day.day_label}`}
                        filterOption={(input, option) =>
                          String(option?.searchText || "")
                            .toLowerCase()
                            .includes(input.toLowerCase())
                        }
                        options={teacherOptions}
                        style={{ width: "100%" }}
                        maxTagCount='responsive'
                        virtual={false}
                      />

                      <TextArea
                        rows={2}
                        value={draft.note}
                        onChange={(event) =>
                          updateDay(day.day_of_week, {
                            note: event.target.value,
                          })
                        }
                        placeholder='Catatan opsional untuk hari ini'
                        maxLength={300}
                        style={{ borderRadius: 12, resize: "none" }}
                      />

                      {savedTeachers.length > 0 ? (
                        <Space wrap size={[6, 6]}>
                          {savedTeachers.map((teacher) => (
                            <Tag
                              key={teacher.id}
                              style={{
                                margin: 0,
                                borderRadius: 999,
                                paddingInline: 10,
                              }}
                            >
                              <Space size={6}>
                                <span>{teacher.duty_teacher_name}</span>
                                <Popconfirm
                                  title={`Hapus ${teacher.duty_teacher_name} dari ${day.day_label}?`}
                                  okText='Ya'
                                  cancelText='Tidak'
                                  onConfirm={() =>
                                    handleRemoveTeacher(teacher.id)
                                  }
                                >
                                  <Button
                                    type='text'
                                    size='small'
                                    danger
                                    icon={<Trash2 size={12} />}
                                    loading={deleting}
                                    style={{
                                      width: 20,
                                      height: 20,
                                      padding: 0,
                                    }}
                                  />
                                </Popconfirm>
                              </Space>
                            </Tag>
                          ))}
                        </Space>
                      ) : (
                        <Empty
                          image={Empty.PRESENTED_IMAGE_SIMPLE}
                          description='Belum ada guru'
                          style={{ margin: 0 }}
                        />
                      )}
                    </Flex>
                  </Card>
                );
              })}
            </Flex>
          </Flex>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          style={surfaceCardStyle}
          styles={{ body: { padding: isMobile ? 16 : 20 } }}
        >
          <Flex vertical gap={12}>
            <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
              Piket Hari Ini
            </Title>
            <Text type='secondary'>
              Dihasilkan otomatis dari jadwal mingguan untuk tanggal{" "}
              {payload.today || "-"}.
            </Text>
            <Space wrap size={[8, 8]}>
              {todayAssignments.length === 0 ? (
                <Tag style={{ margin: 0, borderRadius: 999 }}>
                  Tidak ada guru piket hari ini
                </Tag>
              ) : (
                todayAssignments.map((item) => (
                  <Tag
                    key={item.id}
                    color='blue'
                    style={{ margin: 0, borderRadius: 999, paddingInline: 12 }}
                  >
                    {item.duty_teacher_name}
                  </Tag>
                ))
              )}
            </Space>
          </Flex>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default AdminDutyAssignmentTab;
