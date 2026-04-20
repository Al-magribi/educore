import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Input,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import {
  CalendarCheck2,
  CalendarDays,
  RefreshCcw,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import {
  useDeleteDutyAssignmentMutation,
  useGetDutyBootstrapQuery,
  useSaveDutyAssignmentsMutation,
} from "../../../service/lms/ApiDuty";

const { Text, Title } = Typography;
const { TextArea } = Input;
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

const softPanelStyle = {
  borderRadius: 20,
  border: "1px solid #e8eef5",
  background: "#f8fbff",
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

const AdminDutyAssignmentTab = ({ selectedDate, onChangeDate }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [selectedTeacherIds, setSelectedTeacherIds] = useState([]);
  const [note, setNote] = useState("");

  const dateValue = selectedDate.format("YYYY-MM-DD");
  const { data, isLoading, isFetching, refetch } = useGetDutyBootstrapQuery({
    date: dateValue,
  });
  const [saveDutyAssignments, { isLoading: saving }] =
    useSaveDutyAssignmentsMutation();
  const [deleteDutyAssignment, { isLoading: deleting }] =
    useDeleteDutyAssignmentMutation();

  const payload = data?.data || {};
  const assignments = useMemo(
    () => payload.assignments || [],
    [payload.assignments],
  );
  const teachers = useMemo(() => payload.teachers || [], [payload.teachers]);

  const teacherOptions = useMemo(
    () =>
      teachers.map((item) => ({
        value: item.id,
        label: item.full_name,
        searchText: `${item.full_name} ${item.nip || ""}`.toLowerCase(),
      })),
    [teachers],
  );

  const assignedTeacherIds = useMemo(
    () => new Set(assignments.map((item) => Number(item.duty_teacher_id))),
    [assignments],
  );

  const summary = useMemo(
    () => ({
      totalAssignments: assignments.length,
      totalTeachers: teachers.length,
      availableTeachers: Math.max(teachers.length - assignments.length, 0),
      completedAssignments: assignments.filter((item) => item.status === "done")
        .length,
    }),
    [assignments, teachers.length],
  );

  const statItems = [
    {
      key: "date",
      title: "Tanggal Dipilih",
      value: selectedDate.format("DD MMM"),
      subtitle: selectedDate.format("YYYY"),
      icon: <CalendarDays size={20} />,
      background: "linear-gradient(135deg, #2563eb, #38bdf8)",
    },
    {
      key: "assigned",
      title: "Guru Ditugaskan",
      value: summary.totalAssignments,
      subtitle: `${summary.completedAssignments} laporan selesai`,
      icon: <CalendarCheck2 size={20} />,
      background: "linear-gradient(135deg, #0f766e, #2dd4bf)",
    },
    {
      key: "available",
      title: "Guru Tersedia",
      value: summary.availableTeachers,
      subtitle: `Dari ${summary.totalTeachers} guru`,
      icon: <Users size={20} />,
      background: "linear-gradient(135deg, #7c3aed, #a855f7)",
    },
  ];

  const handleSave = async () => {
    if (!selectedTeacherIds.length) {
      message.warning("Pilih minimal satu guru untuk ditugaskan.");
      return;
    }

    try {
      await saveDutyAssignments({
        date: dateValue,
        teacher_ids: selectedTeacherIds,
        note: note.trim(),
      }).unwrap();
      message.success("Penugasan piket berhasil disimpan.");
      setSelectedTeacherIds([]);
      setNote("");
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan penugasan piket.");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteDutyAssignment(id).unwrap();
      message.success("Penugasan piket dibatalkan.");
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal membatalkan penugasan.");
    }
  };

  const columns = [
    {
      title: "No",
      dataIndex: "no",
      width: 60,
      render: (_, __, index) => index + 1,
    },
    {
      title: "Guru Piket",
      dataIndex: "duty_teacher_name",
      width: 220,
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
      dataIndex: "note",
      render: (value) => value || <Text type='secondary'>-</Text>,
    },
    {
      title: "Catatan Guru",
      dataIndex: "report_note",
      render: (value) =>
        value || <Text type='secondary'>Belum ada laporan</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 140,
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
          title='Batalkan penugasan ini?'
          okText='Ya'
          cancelText='Tidak'
          onConfirm={() => handleDelete(record.id)}
        >
          <Button
            danger
            size='small'
            icon={<Trash2 size={14} />}
            loading={deleting}
          >
            Hapus
          </Button>
        </Popconfirm>
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
                  Penugasan Piket Harian
                </Title>
                <Text type='secondary'>
                  Atur guru piket untuk tanggal{" "}
                  {dayjs(dateValue).format("DD MMMM YYYY")}.
                </Text>
              </div>

              <Space
                wrap
                size={[10, 10]}
                style={{ width: isMobile ? "100%" : "auto" }}
              >
                <DatePicker
                  value={selectedDate}
                  onChange={(value) => {
                    onChangeDate(value || dayjs());
                    setSelectedTeacherIds([]);
                  }}
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

            <Card style={softPanelStyle} styles={{ body: { padding: 16 } }}>
              <Flex vertical gap={"large"}>
                <Flex
                  vertical={isMobile}
                  justify='space-between'
                  align={isMobile ? "stretch" : "center"}
                  gap={"middle"}
                >
                  <div>
                    <Space size={8} align='center'>
                      <div
                        style={iconWrapStyle(
                          "linear-gradient(135deg, #0f4c81, #2563eb)",
                        )}
                      >
                        <ShieldCheck size={18} />
                      </div>
                      <div>
                        <Text
                          strong
                          style={{ color: "#0f172a", display: "block" }}
                        >
                          Form Penugasan
                        </Text>
                        <Text type='secondary' style={{ fontSize: 12 }}>
                          Pilih satu atau beberapa guru untuk bertugas di hari
                          ini.
                        </Text>
                      </div>
                    </Space>
                  </div>

                  <Space wrap size={[8, 8]}>
                    <Tag color='blue' style={{ margin: 0, borderRadius: 999 }}>
                      Total Guru: {summary.totalTeachers}
                    </Tag>
                    <Tag color='green' style={{ margin: 0, borderRadius: 999 }}>
                      Sudah Ditugaskan: {summary.totalAssignments}
                    </Tag>
                  </Space>
                </Flex>

                <Select
                  mode='multiple'
                  size='large'
                  value={selectedTeacherIds}
                  onChange={setSelectedTeacherIds}
                  placeholder='Pilih guru yang bertugas piket pada tanggal ini'
                  filterOption={(input, option) =>
                    String(option?.searchText || "")
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={teacherOptions.map((item) => ({
                    ...item,
                    disabled:
                      assignedTeacherIds.has(Number(item.value)) &&
                      !selectedTeacherIds.includes(item.value),
                  }))}
                  style={{ width: "100%" }}
                  maxTagCount='responsive'
                  virtual={false}
                />

                <TextArea
                  rows={isMobile ? 4 : 3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder='Catatan admin, misalnya fokus pemantauan hari ini atau instruksi singkat.'
                  maxLength={500}
                  showCount
                  style={{
                    borderRadius: 14,
                    resize: "vertical",
                  }}
                />

                <Flex
                  vertical={isMobile}
                  justify='space-between'
                  align={isMobile ? "stretch" : "center"}
                  gap={"middle"}
                >
                  <Text type='secondary'>
                    Guru yang sudah pernah ditugaskan pada tanggal ini akan
                    otomatis dinonaktifkan dari pilihan.
                  </Text>

                  <Button
                    type='primary'
                    icon={<UserPlus size={14} />}
                    onClick={handleSave}
                    loading={saving}
                    size='large'
                    style={{
                      width: isMobile ? "100%" : "auto",
                      borderRadius: 14,
                      boxShadow: "0 12px 28px rgba(37, 99, 235, 0.18)",
                    }}
                  >
                    Simpan Penugasan
                  </Button>
                </Flex>
              </Flex>
            </Card>
          </Flex>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Card
          style={surfaceCardStyle}
          styles={{ body: { padding: 0, overflow: "hidden" } }}
        >
          <div
            style={{
              padding: isMobile ? 16 : 20,
              borderBottom: "1px solid #edf2f7",
              background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
            }}
          >
            <Flex
              vertical={isMobile}
              justify='space-between'
              align={isMobile ? "stretch" : "center"}
              gap={10}
            >
              <div>
                <Title level={5} style={{ margin: 0, color: "#0f172a" }}>
                  Daftar Guru Piket
                </Title>
                <Text type='secondary'>
                  Ringkasan guru yang sudah ditugaskan pada tanggal aktif.
                </Text>
              </div>

              <Tag
                color='blue'
                style={{
                  margin: 0,
                  borderRadius: 999,
                  paddingInline: 12,
                  width: isMobile ? "fit-content" : "auto",
                }}
              >
                {summary.totalAssignments} penugasan
              </Tag>
            </Flex>
          </div>

          <Table
            rowKey='id'
            columns={columns}
            dataSource={assignments}
            loading={isFetching}
            pagination={false}
            locale={{
              emptyText: (
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description='Belum ada guru yang ditugaskan pada tanggal ini.'
                />
              ),
            }}
            scroll={{ x: 960 }}
          />
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default AdminDutyAssignmentTab;
