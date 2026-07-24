import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Flex,
  Grid,
  Skeleton,
  Space,
  Tag,
  Typography,
} from "antd";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarClock,
  ClipboardCheck,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";
import { useGetTeacherDutyBootstrapQuery } from "../../../service/lms/ApiDuty";
import TeacherDutyWorkspace from "./TeacherDutyWorkspace";

const { Text, Title } = Typography;
const { useBreakpoint } = Grid;

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

const heroStyle = {
  borderRadius: 28,
  overflow: "hidden",
  border: "1px solid rgba(186, 230, 253, 0.8)",
  background:
    "radial-gradient(circle at top right, rgba(103, 232, 249, 0.3), transparent 30%), linear-gradient(135deg, #082f49 0%, #0f766e 46%, #22c55e 100%)",
  boxShadow: "0 24px 60px rgba(8, 47, 73, 0.16)",
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

const TeacherDutyView = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const dateValue = selectedDate.format("YYYY-MM-DD");

  const firstQuery = useGetTeacherDutyBootstrapQuery({
    date: dateValue,
  });
  const firstPayload = firstQuery.data?.data || {};
  const assignedDates = useMemo(
    () => firstPayload.assigned_dates || [],
    [firstPayload.assigned_dates],
  );

  const assignmentDatesSet = useMemo(
    () =>
      new Set(
        assignedDates.map(
          (item) => item.date_key || dayjs(item.date).format("YYYY-MM-DD"),
        ),
      ),
    [assignedDates],
  );

  const fallbackDateValue =
    !firstPayload.assigned && assignedDates.length
      ? dayjs(assignedDates[0].date).format("YYYY-MM-DD")
      : null;

  const fallbackQuery = useGetTeacherDutyBootstrapQuery(
    { date: fallbackDateValue },
    { skip: !fallbackDateValue },
  );

  const data = fallbackDateValue ? fallbackQuery.data : firstQuery.data;
  const isLoading = fallbackDateValue
    ? fallbackQuery.isLoading
    : firstQuery.isLoading;
  const isFetching = fallbackDateValue
    ? fallbackQuery.isFetching
    : firstQuery.isFetching;
  const refetch = fallbackDateValue
    ? fallbackQuery.refetch
    : firstQuery.refetch;
  const payload = data?.data || firstPayload;

  const selectedDateLabel = selectedDate.format("DD MMMM YYYY");
  const activeAssignmentDateLabel = payload.assignment?.date
    ? dayjs(payload.assignment.date).format("DD MMMM YYYY")
    : fallbackDateValue
      ? dayjs(fallbackDateValue).format("DD MMMM YYYY")
      : selectedDateLabel;

  const statItems = [
    {
      key: "selected-date",
      title: "Tanggal Dipilih",
      value: selectedDate.format("DD MMM"),
      subtitle: selectedDate.format("YYYY"),
      icon: <CalendarClock size={20} />,
      background: "linear-gradient(135deg, #0f766e, #14b8a6)",
    },
    {
      key: "assigned-count",
      title: "Total Penugasan",
      value: assignedDates.length,
      subtitle: assignedDates.length
        ? "Tanggal siap dilaporkan"
        : "Belum ada jadwal",
      icon: <ClipboardCheck size={20} />,
      background: "linear-gradient(135deg, #2563eb, #38bdf8)",
    },
    {
      key: "status",
      title: "Status Hari Ini",
      value: payload.assigned ? "Aktif" : "Kosong",
      subtitle: payload.assigned
        ? activeAssignmentDateLabel
        : "Menunggu penugasan admin",
      icon: <ShieldCheck size={20} />,
      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
    },
  ];

  if (isLoading) {
    return (
      <Card
        style={{ ...surfaceCardStyle, borderRadius: isMobile ? 20 : 24 }}
        styles={{ body: { padding: isMobile ? 18 : 22 } }}
      >
        <Skeleton active paragraph={{ rows: 12 }} />
      </Card>
    );
  }

  return (
    <motion.div
      initial='hidden'
      animate='show'
      variants={containerVariants}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 20,
        padding: isMobile ? 0 : "0 4px 12px",
      }}
    >
      <motion.div variants={itemVariants}>
        <Card
          variant='borderless'
          style={{
            ...heroStyle,
            borderRadius: isMobile ? 22 : 28,
          }}
          styles={{ body: { padding: isMobile ? 20 : 28 } }}
        >
          <Flex
            vertical={isMobile}
            justify='space-between'
            align={isMobile ? "flex-start" : "center"}
            gap={18}
          >
            <Flex vertical gap={14} style={{ maxWidth: 720 }}>
              <Space size={[10, 10]} wrap>
                <Tag
                  style={{
                    margin: 0,
                    borderRadius: 999,
                    paddingInline: 12,
                    border: "1px solid rgba(255,255,255,0.18)",
                    background: "rgba(255,255,255,0.12)",
                    color: "#fff",
                  }}
                >
                  Duty Workspace
                </Tag>
                <Tag
                  style={{
                    margin: 0,
                    borderRadius: 999,
                    paddingInline: 12,
                    border: "1px solid rgba(255,255,255,0.14)",
                    background: "rgba(255,255,255,0.08)",
                    color: "#dcfce7",
                  }}
                >
                  {selectedDateLabel}
                </Tag>
              </Space>

              <div>
                <Title
                  level={isMobile ? 3 : 2}
                  style={{ margin: 0, color: "#fff", lineHeight: 1.15 }}
                >
                  Halaman Piket Guru.
                </Title>
                <Text
                  style={{
                    display: "block",
                    marginTop: 10,
                    color: "rgba(255,255,255,0.84)",
                    maxWidth: 640,
                    fontSize: isMobile ? 13 : 14,
                  }}
                >
                  Pilih tanggal penugasan, cek status jadwal, lalu isi laporan
                  harian dari satu tampilan yang nyaman dipakai di desktop
                  maupun mobile.
                </Text>
              </div>
            </Flex>

            <Card
              style={{
                width: isMobile ? "100%" : 340,
                borderRadius: 22,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.1)",
                boxShadow: "none",
              }}
              styles={{ body: { padding: 20 } }}
            >
              <Flex vertical gap={10}>
                <Text style={{ color: "rgba(255,255,255,0.72)" }}>
                  Ringkasan penugasan
                </Text>
                <Title level={4} style={{ margin: 0, color: "#fff" }}>
                  {payload.assigned
                    ? "Anda sedang bertugas"
                    : "Belum ada tugas aktif"}
                </Title>
                <Text style={{ color: "rgba(255,255,255,0.82)" }}>
                  {payload.assigned
                    ? `Laporan aktif untuk ${activeAssignmentDateLabel}. Pastikan seluruh catatan piket terisi sebelum selesai bertugas.`
                    : assignmentDatesSet.size
                      ? "Anda memiliki tanggal tugas lain. Pilih salah satu tanggal yang tersedia di daftar penugasan."
                      : "Admin belum menugaskan Anda sebagai guru piket."}
                </Text>
              </Flex>
            </Card>
          </Flex>
        </Card>
      </motion.div>

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
          <Flex vertical gap={20}>
            <Flex
              vertical={isMobile}
              justify='space-between'
              align={isMobile ? "stretch" : "center"}
              gap={14}
            >
              <div style={{ minWidth: 0 }}>
                <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
                  Kontrol Tugas Piket
                </Title>
                <Text type='secondary'>
                  Isi laporan hanya untuk tanggal yang memang ditugaskan kepada
                  Anda.
                </Text>
              </div>

              <Space
                wrap
                size={[10, 10]}
                style={{ width: isMobile ? "100%" : "auto" }}
              >
                <DatePicker
                  value={selectedDate}
                  onChange={(value) => setSelectedDate(value || dayjs())}
                  allowClear={false}
                  format='DD MMM YYYY'
                  style={{ width: isMobile ? "100%" : 180 }}
                />
                <Button
                  icon={<RefreshCcw size={14} />}
                  onClick={() => refetch()}
                  loading={isFetching}
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  Muat Ulang
                </Button>
              </Space>
            </Flex>

            <Card
              size='small'
              style={{
                borderRadius: 18,
                border: "1px solid #e6eef7",
                background: "#f8fbff",
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Flex vertical gap={10}>
                <Text strong style={{ color: "#0f172a" }}>
                  Daftar tanggal penugasan
                </Text>
                <Space wrap size={[8, 8]}>
                  {assignedDates.length === 0 ? (
                    <Tag
                      color='default'
                      style={{ margin: 0, borderRadius: 999 }}
                    >
                      Belum ada penugasan piket
                    </Tag>
                  ) : (
                    assignedDates.map((item) => {
                      const itemDateValue =
                        item.date_key || dayjs(item.date).format("YYYY-MM-DD");
                      const isActive = itemDateValue === dateValue;

                      return (
                        <Tag
                          key={item.id || itemDateValue}
                          color={isActive ? "blue" : "default"}
                          style={{
                            margin: 0,
                            borderRadius: 999,
                            paddingInline: 12,
                            paddingBlock: 5,
                            cursor: "pointer",
                            borderColor: isActive ? "#93c5fd" : undefined,
                          }}
                          onClick={() => setSelectedDate(dayjs(item.date))}
                        >
                          {dayjs(item.date).format("DD MMM YYYY")} |{" "}
                          {item.status}
                        </Tag>
                      );
                    })
                  )}
                </Space>
              </Flex>
            </Card>

            <AnimatePresence mode='wait'>
              {!payload.assigned ? (
                <motion.div
                  key='teacher-duty-alert'
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22 }}
                >
                  <Alert
                    showIcon
                    type='warning'
                    message='Tidak ada penugasan piket pada tanggal ini.'
                    description={
                      assignmentDatesSet.size
                        ? "Pilih tanggal yang termasuk dalam daftar penugasan Anda."
                        : "Admin belum menugaskan Anda sebagai guru piket."
                    }
                    style={{ borderRadius: 16 }}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key={`teacher-duty-workspace-${payload.assignment?.id || dateValue}`}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.22 }}
                >
                  <TeacherDutyWorkspace
                    key={`${payload.assignment?.id || "duty"}:${dateValue}`}
                    payload={payload}
                    dateValue={dateValue}
                    onRefresh={refetch}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </Flex>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default TeacherDutyView;
