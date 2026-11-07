import React, { useEffect, useMemo, useState } from "react";
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
import PageHeader from "../../../components/ui/PageHeader";
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

const toIsoDayOfWeek = (value) => {
  const day = dayjs(value).day();
  return day === 0 ? 7 : day;
};

const findNearestScheduleDate = (fromDate, scheduleDays) => {
  const days = (scheduleDays || []).map(Number).filter(Boolean);
  if (!days.length) return fromDate;

  for (let offset = 0; offset <= 14; offset += 1) {
    const forward = fromDate.add(offset, "day");
    if (days.includes(toIsoDayOfWeek(forward))) return forward;
  }

  for (let offset = 1; offset <= 14; offset += 1) {
    const backward = fromDate.subtract(offset, "day");
    if (days.includes(toIsoDayOfWeek(backward))) return backward;
  }

  return fromDate;
};

const TeacherDutyView = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [didAutoSnap, setDidAutoSnap] = useState(false);
  const dateValue = selectedDate.format("YYYY-MM-DD");

  const { data, isLoading, isFetching, refetch } =
    useGetTeacherDutyBootstrapQuery({
      date: dateValue,
    });
  const payload = data?.data || {};

  const scheduleDays = useMemo(
    () => (payload.schedule_days || []).map(Number),
    [payload.schedule_days],
  );

  const scheduleDayLabels = useMemo(() => {
    const labels = {
      1: "Senin",
      2: "Selasa",
      3: "Rabu",
      4: "Kamis",
      5: "Jumat",
    };
    return scheduleDays.map((day) => labels[Number(day)]).filter(Boolean);
  }, [scheduleDays]);

  useEffect(() => {
    if (didAutoSnap || isLoading || !scheduleDays.length) return;
    if (payload.assigned) {
      setDidAutoSnap(true);
      return;
    }

    const nearest = findNearestScheduleDate(dayjs(), scheduleDays);
    if (nearest.format("YYYY-MM-DD") !== dateValue) {
      setSelectedDate(nearest);
    }
    setDidAutoSnap(true);
  }, [didAutoSnap, isLoading, scheduleDays, payload.assigned, dateValue]);

  const isScheduleDate = (value) => {
    if (!scheduleDays.length) return false;
    return scheduleDays.includes(toIsoDayOfWeek(value));
  };

  const selectedDateLabel = selectedDate.format("DD MMMM YYYY");
  const activeAssignmentDateLabel = payload.assignment?.date
    ? dayjs(payload.assignment.date).format("DD MMMM YYYY")
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
      key: "schedule",
      title: "Jadwal Mingguan",
      value: scheduleDayLabels.length ? scheduleDayLabels.join(", ") : "-",
      subtitle: scheduleDayLabels.length
        ? "Berulang setiap minggu"
        : "Belum ada jadwal",
      icon: <ClipboardCheck size={20} />,
      background: "linear-gradient(135deg, #2563eb, #38bdf8)",
    },
    {
      key: "status",
      title: "Status Tanggal",
      value: payload.assigned ? "Aktif" : "Kosong",
      subtitle: payload.assigned
        ? activeAssignmentDateLabel
        : "Di luar jadwal piket Anda",
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
        <PageHeader
          title='Piket Guru'
          description='Catat kehadiran dan catatan harian sesuai jadwal piket Anda.'
          meta={<Tag>{selectedDateLabel}</Tag>}
        />
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
              </div>

              <Flex
                vertical={isMobile}
                wrap='wrap'
                gap={10}
                style={{ width: isMobile ? "100%" : "auto" }}
              >
                <DatePicker
                  value={selectedDate}
                  onChange={(value) => setSelectedDate(value || dayjs())}
                  allowClear={false}
                  format='DD MMM YYYY'
                  style={{ width: isMobile ? "100%" : 180 }}
                  disabledDate={(current) => {
                    if (!current) return false;
                    if (!scheduleDays.length) return true;
                    return !isScheduleDate(current);
                  }}
                />
                <Button
                  icon={<RefreshCcw size={14} />}
                  onClick={() => refetch()}
                  loading={isFetching}
                  style={{ width: isMobile ? "100%" : "auto" }}
                >
                  Muat Ulang
                </Button>
              </Flex>
            </Flex>

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
                      scheduleDays.length
                        ? `Pilih tanggal ${scheduleDayLabels.join("/")} lewat kalender. Jadwal berulang otomatis setiap minggu.`
                        : "Anda belum masuk jadwal piket mingguan (Senin–Jumat)."
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
