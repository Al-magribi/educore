import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Popconfirm,
  Skeleton,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  BookUser,
  CalendarDays,
  FileText,
  RefreshCcw,
  Trash2,
  UserRoundX,
  Users,
} from "lucide-react";
import {
  useDeleteDutyDailyNoteMutation,
  useGetDutyReportsQuery,
} from "../../../service/lms/ApiDuty";

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

const tableCardStyle = {
  borderRadius: 22,
  border: "1px solid #e7eef6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 14px 30px rgba(15, 23, 42, 0.05)",
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

const statusColorMap = {
  done: "green",
  assigned: "blue",
};

const AdminDutyReportTab = ({ selectedDate, onChangeDate }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [activeTab, setActiveTab] = useState("student-absences");

  const dateValue = selectedDate.format("YYYY-MM-DD");
  const { data, isLoading, isFetching, refetch } = useGetDutyReportsQuery({
    date: dateValue,
  });
  const [deleteDutyDailyNote, { isLoading: deletingDailyNote }] =
    useDeleteDutyDailyNoteMutation();

  const payload = data?.data || {};
  const summary = payload.summary || {};
  const studentAbsences = useMemo(
    () => payload.student_absences || [],
    [payload.student_absences],
  );
  const teacherAbsences = useMemo(
    () => payload.teacher_absences || [],
    [payload.teacher_absences],
  );
  const teacherSessions = useMemo(
    () => payload.teacher_sessions || [],
    [payload.teacher_sessions],
  );
  const dailyNotes = useMemo(
    () => payload.daily_notes || [],
    [payload.daily_notes],
  );

  const handleDeleteDailyNote = async (assignmentId) => {
    try {
      await deleteDutyDailyNote(assignmentId).unwrap();
      message.success("Catatan harian berhasil dihapus.");
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus catatan harian.");
    }
  };

  const statItems = [
    {
      key: "date",
      title: "Tanggal Laporan",
      value: selectedDate.format("DD MMM"),
      subtitle: selectedDate.format("YYYY"),
      icon: <CalendarDays size={20} />,
      background: "linear-gradient(135deg, #2563eb, #38bdf8)",
    },
    {
      key: "student-absences",
      title: "Laporan Siswa",
      value:
        summary.student_absence_count ??
        studentAbsences.length,
      subtitle: "Ketidakhadiran siswa",
      icon: <Users size={20} />,
      background: "linear-gradient(135deg, #0f766e, #2dd4bf)",
    },
    {
      key: "teacher-absences",
      title: "Laporan Guru",
      value:
        summary.teacher_absence_count ??
        teacherAbsences.length,
      subtitle: "Guru tidak hadir",
      icon: <UserRoundX size={20} />,
      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
    },
    {
      key: "daily-notes",
      title: "Catatan Harian",
      value:
        summary.daily_note_count ??
        dailyNotes.length,
      subtitle: "Ringkasan guru piket",
      icon: <FileText size={20} />,
      background: "linear-gradient(135deg, #ea580c, #fb923c)",
    },
  ];

  const studentColumns = [
    {
      title: "Siswa",
      dataIndex: "student_name",
      render: (_, record) => (
        <Flex vertical gap={2}>
          <Text strong style={{ color: "#0f172a" }}>
            {record.student_name}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.class_name || "-"} | NIS {record.nis || "-"}
          </Text>
        </Flex>
      ),
    },
    {
      title: "Alasan",
      dataIndex: "reason",
    },
    {
      title: "Tindak Lanjut",
      dataIndex: "follow_up",
      render: (value) => value || <Text type='secondary'>-</Text>,
    },
    {
      title: "Dilaporkan Oleh",
      dataIndex: "reporter_teacher_name",
      width: 220,
      render: (value) => value || <Text type='secondary'>-</Text>,
    },
  ];

  const teacherAbsenceColumns = [
    {
      title: "Guru",
      dataIndex: "teacher_name",
      render: (value) => <Text strong style={{ color: "#0f172a" }}>{value}</Text>,
    },
    {
      title: "Alasan",
      dataIndex: "reason",
    },
    {
      title: "Tindak Lanjut",
      dataIndex: "follow_up",
      render: (value) => value || <Text type='secondary'>-</Text>,
    },
    {
      title: "Dilaporkan Oleh",
      dataIndex: "reporter_teacher_name",
      width: 220,
      render: (value) => value || <Text type='secondary'>-</Text>,
    },
  ];

  const teacherSessionColumns = [
    {
      title: "Guru Masuk Kelas",
      dataIndex: "teacher_name",
      render: (_, record) => (
        <Flex vertical gap={2}>
          <Text strong style={{ color: "#0f172a" }}>
            {record.teacher_name}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.class_name || "-"} | {record.subject_name || "-"}
          </Text>
        </Flex>
      ),
    },
    {
      title: "Masuk",
      dataIndex: "checkin_at",
      width: 170,
      render: (value) =>
        value ? dayjs(value).format("DD MMM YYYY HH:mm") : "-",
    },
    {
      title: "Keluar",
      dataIndex: "checkout_at",
      width: 170,
      render: (value) =>
        value ? dayjs(value).format("DD MMM YYYY HH:mm") : "-",
    },
    {
      title: "Catatan",
      dataIndex: "note",
      render: (value) => value || <Text type='secondary'>-</Text>,
    },
    {
      title: "Reporter",
      dataIndex: "reporter_teacher_name",
      width: 200,
      render: (value) => value || <Text type='secondary'>-</Text>,
    },
  ];

  const dailyNoteColumns = [
    {
      title: "Guru Piket",
      dataIndex: "duty_teacher_name",
      render: (_, record) => (
        <Flex vertical gap={2}>
          <Text strong style={{ color: "#0f172a" }}>
            {record.duty_teacher_name}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            NIP {record.duty_teacher_nip || "-"}
          </Text>
        </Flex>
      ),
    },
    {
      title: "Catatan Admin",
      dataIndex: "admin_note",
      render: (value) => value || <Text type='secondary'>-</Text>,
    },
    {
      title: "Catatan Harian",
      dataIndex: "daily_note",
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (value) => (
        <Tag
          color={statusColorMap[value] || "blue"}
          style={{ margin: 0, borderRadius: 999, paddingInline: 12 }}
        >
          {value || "assigned"}
        </Tag>
      ),
    },
    {
      title: "Aksi",
      dataIndex: "action",
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title='Hapus catatan harian ini?'
          okText='Ya'
          cancelText='Tidak'
          onConfirm={() => handleDeleteDailyNote(record.assignment_id)}
        >
          <Button
            danger
            size='small'
            icon={<Trash2 size={14} />}
            loading={deletingDailyNote}
          >
            Hapus
          </Button>
        </Popconfirm>
      ),
    },
  ];

  const buildTableCard = (columns, dataSource, description, xScroll = 960) => (
    <Card style={tableCardStyle} styles={{ body: { padding: 0, overflow: "hidden" } }}>
      <div
        style={{
          padding: isMobile ? 16 : 20,
          borderBottom: "1px solid #edf2f7",
          background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
        }}
      >
        <Text type='secondary'>{description}</Text>
      </div>
      <Table
        rowKey={(record) => record.id || record.assignment_id}
        columns={columns}
        dataSource={dataSource}
        pagination={false}
        scroll={{ x: xScroll }}
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description='Belum ada data laporan pada bagian ini.'
            />
          ),
        }}
      />
    </Card>
  );

  const tabItems = [
    {
      key: "student-absences",
      label: (
        <Space size={8}>
          <Users size={15} />
          Laporan Siswa
        </Space>
      ),
      children: (
        <motion.div
          key='report-students'
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          {buildTableCard(
            studentColumns,
            studentAbsences,
            "Daftar siswa tidak masuk yang dicatat guru piket.",
            960,
          )}
        </motion.div>
      ),
    },
    {
      key: "teacher-absences",
      label: (
        <Space size={8}>
          <UserRoundX size={15} />
          Laporan Guru
        </Space>
      ),
      children: (
        <motion.div
          key='report-teachers'
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          {buildTableCard(
            teacherAbsenceColumns,
            teacherAbsences,
            "Daftar guru yang tidak masuk beserta alasan dan tindak lanjut.",
            920,
          )}
        </motion.div>
      ),
    },
    {
      key: "teacher-sessions",
      label: (
        <Space size={8}>
          <BookUser size={15} />
          Guru Masuk Kelas
        </Space>
      ),
      children: (
        <motion.div
          key='report-sessions'
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          {buildTableCard(
            teacherSessionColumns,
            teacherSessions,
            "Aktivitas guru masuk kelas yang dicatat oleh guru piket.",
            1100,
          )}
        </motion.div>
      ),
    },
    {
      key: "daily-notes",
      label: (
        <Space size={8}>
          <FileText size={15} />
          Catatan Harian
        </Space>
      ),
      children: (
        <motion.div
          key='report-daily-notes'
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24 }}
        >
          {buildTableCard(
            dailyNoteColumns,
            dailyNotes,
            "Ringkasan catatan harian yang dikirim guru piket untuk admin.",
            1000,
          )}
        </motion.div>
      ),
    },
  ];

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
                  <Title level={4} style={{ margin: "4px 0 0", color: "#0f172a" }}>
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
                  Laporan Piket Harian
                </Title>
                <Text type='secondary'>
                  Tinjau laporan siswa, guru, aktivitas masuk kelas, dan catatan
                  harian untuk tanggal {dayjs(dateValue).format("DD MMMM YYYY")}.
                </Text>
              </div>

              <Space wrap size={[10, 10]} style={{ width: isMobile ? "100%" : "auto" }}>
                <DatePicker
                  value={selectedDate}
                  onChange={(value) => onChangeDate(value || dayjs())}
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

            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabItems}
              size={isMobile ? "middle" : "large"}
              tabBarGutter={8}
              animated
            />
          </Flex>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default AdminDutyReportTab;
