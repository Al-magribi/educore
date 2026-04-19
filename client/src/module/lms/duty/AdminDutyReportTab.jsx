import React, { useMemo } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Popconfirm,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import {
  BookUser,
  CalendarCheck2,
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

const AdminDutyReportTab = ({ selectedDate, onChangeDate }) => {
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

  const studentColumns = [
    {
      title: "Siswa",
      dataIndex: "student_name",
      render: (_, record) => (
        <div>
          <Text strong>{record.student_name}</Text>
          <div style={{ color: "#667085", fontSize: 12 }}>
            {record.class_name || "-"} • NIS {record.nis || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Alasan",
      dataIndex: "reason",
    },
    {
      title: "Tindak Lanjut",
      dataIndex: "follow_up",
      render: (value) => value || <Text type="secondary">-</Text>,
    },
    {
      title: "Dilaporkan Oleh",
      dataIndex: "reporter_teacher_name",
      width: 220,
    },
  ];

  const teacherAbsenceColumns = [
    {
      title: "Guru",
      dataIndex: "teacher_name",
      render: (value) => <Text strong>{value}</Text>,
    },
    {
      title: "Alasan",
      dataIndex: "reason",
    },
    {
      title: "Tindak Lanjut",
      dataIndex: "follow_up",
      render: (value) => value || <Text type="secondary">-</Text>,
    },
    {
      title: "Dilaporkan Oleh",
      dataIndex: "reporter_teacher_name",
      width: 220,
    },
  ];

  const teacherSessionColumns = [
    {
      title: "Guru Masuk Kelas",
      dataIndex: "teacher_name",
      render: (_, record) => (
        <div>
          <Text strong>{record.teacher_name}</Text>
          <div style={{ color: "#667085", fontSize: 12 }}>
            {record.class_name || "-"} • {record.subject_name || "-"}
          </div>
        </div>
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
      render: (value) => value || <Text type="secondary">-</Text>,
    },
    {
      title: "Reporter",
      dataIndex: "reporter_teacher_name",
      width: 200,
      render: (value) => value || <Text type="secondary">-</Text>,
    },
  ];

  const dailyNoteColumns = [
    {
      title: "Guru Piket",
      dataIndex: "duty_teacher_name",
      render: (_, record) => (
        <div>
          <Text strong>{record.duty_teacher_name}</Text>
          <div style={{ color: "#667085", fontSize: 12 }}>
            NIP {record.duty_teacher_nip || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Catatan Admin",
      dataIndex: "admin_note",
      render: (value) => value || <Text type="secondary">-</Text>,
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
        <Tag color={value === "done" ? "green" : "blue"}>{value}</Tag>
      ),
    },
    {
      title: "Aksi",
      dataIndex: "action",
      width: 120,
      render: (_, record) => (
        <Popconfirm
          title="Hapus catatan harian ini?"
          okText="Ya"
          cancelText="Tidak"
          onConfirm={() => handleDeleteDailyNote(record.assignment_id)}
        >
          <Button
            danger
            size="small"
            icon={<Trash2 size={14} />}
            loading={deletingDailyNote}
          >
            Hapus
          </Button>
        </Popconfirm>
      ),
    },
  ];

  if (isLoading) {
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  const buildTableCard = (columns, dataSource, description, xScroll = 960) => (
    <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
      <div style={{ padding: 20, paddingBottom: 0 }}>
        <Text type="secondary">{description}</Text>
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
              description="Belum ada data laporan pada bagian ini."
            />
          ),
        }}
      />
    </Card>
  );

  return (
    <Flex vertical gap={16}>
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Title level={5} style={{ margin: 0 }}>
            Laporan Piket Harian
          </Title>

          <Space wrap>
            <DatePicker
              value={selectedDate}
              onChange={(value) => onChangeDate(value || dayjs())}
              allowClear={false}
              format="DD MMM YYYY"
            />
            <Button
              icon={<RefreshCcw size={14} />}
              onClick={() => refetch()}
              loading={isFetching}
            >
              Muat Ulang
            </Button>
          </Space>
        </Flex>

        <div style={{ marginTop: 8 }}>
          <Text type="secondary">
            Navigasi laporan siswa, guru, aktivitas masuk kelas, dan catatan
            harian untuk tanggal {dayjs(dateValue).format("DD MMMM YYYY")}.
          </Text>
        </div>
      </Card>

      <Tabs
        items={[
          {
            key: "student-absences",
            label: (
              <Space size={6}>
                <Users size={14} />
                Laporan Siswa
              </Space>
            ),
            children: buildTableCard(
              studentColumns,
              studentAbsences,
              "Daftar siswa tidak masuk yang dicatat guru piket.",
              960,
            ),
          },
          {
            key: "teacher-absences",
            label: (
              <Space size={6}>
                <UserRoundX size={14} />
                Laporan Guru
              </Space>
            ),
            children: buildTableCard(
              teacherAbsenceColumns,
              teacherAbsences,
              "Daftar guru yang tidak masuk beserta alasan dan tindak lanjut.",
              920,
            ),
          },
          {
            key: "teacher-sessions",
            label: (
              <Space size={6}>
                <BookUser size={14} />
                Guru Masuk Kelas
              </Space>
            ),
            children: buildTableCard(
              teacherSessionColumns,
              teacherSessions,
              "Aktivitas guru masuk kelas yang dicatat oleh guru piket.",
              1100,
            ),
          },
          {
            key: "daily-notes",
            label: (
              <Space size={6}>
                <FileText size={14} />
                Catatan Harian
              </Space>
            ),
            children: buildTableCard(
              dailyNoteColumns,
              dailyNotes,
              "Ringkasan catatan harian yang dikirim guru piket untuk admin.",
              1000,
            ),
          },
        ]}
      />
    </Flex>
  );
};

export default AdminDutyReportTab;
const handleDeleteDailyNote = async (assignmentId) => {
  try {
    await deleteDutyDailyNote(assignmentId).unwrap();
    message.success("Catatan harian berhasil dihapus.");
    refetch();
  } catch (error) {
    message.error(error?.data?.message || "Gagal menghapus catatan harian.");
  }
};
