import React, { useMemo, useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
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

const AdminDutyAssignmentTab = ({ selectedDate, onChangeDate }) => {
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
    }),
    [assignments.length, teachers.length],
  );

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
      dataIndex: "note",
      render: (value) => value || <Text type="secondary">-</Text>,
    },
    {
      title: "Catatan Guru",
      dataIndex: "report_note",
      render: (value) => value || <Text type="secondary">Belum ada laporan</Text>,
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 120,
      render: (value) => (
        <Tag color={value === "done" ? "green" : "blue"}>
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
          title="Batalkan penugasan ini?"
          okText="Ya"
          cancelText="Tidak"
          onConfirm={() => handleDelete(record.id)}
        >
          <Button
            danger
            size="small"
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
    return <Skeleton active paragraph={{ rows: 10 }} />;
  }

  return (
    <Flex vertical gap={16}>
      <Flex gap={16} wrap="wrap">
        <Card style={{ flex: "1 1 220px", borderRadius: 16 }}>
          <Statistic
            title="Tanggal Dipilih"
            value={dayjs(dateValue).format("DD MMMM YYYY")}
            prefix={<CalendarDays size={16} />}
          />
        </Card>
        <Card style={{ flex: "1 1 220px", borderRadius: 16 }}>
          <Statistic
            title="Guru Ditugaskan"
            value={summary.totalAssignments}
            prefix={<CalendarCheck2 size={16} />}
          />
        </Card>
        <Card style={{ flex: "1 1 220px", borderRadius: 16 }}>
          <Statistic
            title="Guru Tersedia"
            value={summary.availableTeachers}
            prefix={<Users size={16} />}
          />
        </Card>
      </Flex>

      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Title level={5} style={{ margin: 0 }}>
            <Space>
              <ShieldCheck size={18} />
              Penugasan Piket Harian
            </Space>
          </Title>

          <Space wrap>
            <DatePicker
              value={selectedDate}
              onChange={(value) => {
                onChangeDate(value || dayjs());
                setSelectedTeacherIds([]);
              }}
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

        <Flex vertical gap={12} style={{ marginTop: 16 }}>
          <Select
            mode="multiple"
            size="large"
            value={selectedTeacherIds}
            onChange={setSelectedTeacherIds}
            placeholder="Pilih guru yang bertugas piket pada tanggal ini"
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
            maxTagCount="responsive"
          />

          <TextArea
            rows={3}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Catatan admin, misalnya fokus pemantauan hari ini atau instruksi singkat."
            maxLength={500}
            showCount
          />

          <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
            <Space wrap>
              <Tag color="blue">Total Guru: {summary.totalTeachers}</Tag>
              <Tag color="green">Sudah Ditugaskan: {summary.totalAssignments}</Tag>
            </Space>

            <Button
              type="primary"
              icon={<UserPlus size={14} />}
              onClick={handleSave}
              loading={saving}
            >
              Simpan Penugasan
            </Button>
          </Flex>
        </Flex>
      </Card>

      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={assignments}
          loading={isFetching}
          pagination={false}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Belum ada guru yang ditugaskan pada tanggal ini."
              />
            ),
          }}
          scroll={{ x: 960 }}
        />
      </Card>
    </Flex>
  );
};

export default AdminDutyAssignmentTab;
