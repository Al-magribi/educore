import React, { useEffect, useMemo, useRef, useState } from "react";
import dayjs from "dayjs";
import { useSelector } from "react-redux";
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import {
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  RefreshCcw,
  Users,
} from "lucide-react";
import { useGetClassesQuery } from "../../../../../service/lms/ApiLms";
import {
  useGetAttendanceStudentsQuery,
  useSubmitAttendanceMutation,
} from "../../../../../service/lms/ApiAttendance";

const { Title, Text } = Typography;

const STATUS_OPTIONS = [
  { value: "Hadir", label: "Hadir", color: "green" },
  { value: "Telat", label: "Telat", color: "gold" },
  { value: "Sakit", label: "Sakit", color: "cyan" },
  { value: "Izin", label: "Izin", color: "blue" },
  { value: "Alpa", label: "Alpa", color: "red" },
];

const normalizeStatus = (status) => {
  if (!status) return null;
  const lower = String(status).toLowerCase();
  if (lower === "alpha" || lower === "alpa") return "Alpa";
  if (lower === "telat") return "Telat";
  if (lower === "hadir") return "Hadir";
  if (lower === "sakit") return "Sakit";
  if (lower === "izin") return "Izin";
  return status;
};

const Attendance = ({ subjectId, subject }) => {
  const { user } = useSelector((state) => state.auth);
  const [selectedClassId, setSelectedClassId] = useState(null);
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [dirty, setDirty] = useState(false);
  const initialRowsRef = useRef([]);

  const { data: classRes, isLoading: classLoading } = useGetClassesQuery(
    { subjectId, gradeId: null },
    { skip: !subjectId },
  );

  const classes = classRes?.data || [];
  const classOptions = useMemo(
    () => classes.map((item) => ({ label: item.name, value: item.id })),
    [classes],
  );

  useEffect(() => {
    if (!selectedClassId && classOptions.length > 0) {
      setSelectedClassId(classOptions[0].value);
    }
  }, [classOptions, selectedClassId]);

  const dateValue = selectedDate ? selectedDate.format("YYYY-MM-DD") : null;
  const {
    data: attendanceRes,
    isFetching,
    refetch,
  } = useGetAttendanceStudentsQuery(
    {
      subjectId,
      classId: selectedClassId,
      date: dateValue,
    },
    { skip: !subjectId || !selectedClassId || !dateValue },
  );

  const students = attendanceRes?.data?.students || [];
  const meta = attendanceRes?.data?.meta || {};

  useEffect(() => {
    const nextRows = students.map((item) => ({
      key: item.student_id,
      student_id: item.student_id,
      full_name: item.full_name,
      nis: item.nis,
      nisn: item.nisn,
      class_name: item.class_name,
      status: normalizeStatus(item.status) || undefined,
    }));
    setRows(nextRows);
    initialRowsRef.current = nextRows.map((row) => ({ ...row }));
    setDirty(false);
  }, [students]);

  const [submitAttendance, { isLoading: isSaving }] =
    useSubmitAttendanceMutation();

  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const matchStatus =
        statusFilter === "all" ? true : row.status === statusFilter;
      const matchSearch = `${row.full_name} ${row.nis} ${row.nisn}`
        .toLowerCase()
        .includes(searchText.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [rows, searchText, statusFilter]);

  const statusSummary = useMemo(() => {
    const counts = STATUS_OPTIONS.reduce((acc, item) => {
      acc[item.value] = 0;
      return acc;
    }, {});
    rows.forEach((row) => {
      if (counts[row.status] !== undefined) {
        counts[row.status] += 1;
      }
    });
    return counts;
  }, [rows]);

  const handleStatusChange = (value, record) => {
    setRows((prev) =>
      prev.map((item) =>
        item.student_id === record.student_id
          ? { ...item, status: value }
          : item,
      ),
    );
    setDirty(true);
  };

  const handleSetAll = (value) => {
    if (!value) return;
    setRows((prev) => prev.map((item) => ({ ...item, status: value })));
    setDirty(true);
  };

  const handleReset = () => {
    const resetRows = initialRowsRef.current.map((row) => ({ ...row }));
    setRows(resetRows);
    setDirty(false);
  };

  const handleSave = async () => {
    if (!subjectId || !selectedClassId || !dateValue) return;
    if (rows.length === 0) {
      message.warning("Belum ada siswa di kelas ini.");
      return;
    }
    const invalid = rows.find((row) => !row.status);
    if (invalid) {
      message.error("Status kehadiran semua siswa wajib dipilih.");
      return;
    }
    const teacherId = Number(user?.id || 0) || null;
    if (!teacherId) {
      message.error("teacher_id tidak ditemukan. Silakan login ulang.");
      return;
    }

    try {
      await submitAttendance({
        subject_id: subjectId,
        class_id: selectedClassId,
        date: dateValue,
        teacher_id: teacherId,
        items: rows.map((row) => ({
          student_id: row.student_id,
          status: row.status,
          teacher_id: teacherId,
        })),
      }).unwrap();
      message.success("Absensi berhasil disimpan.");
      setDirty(false);
      refetch();
    } catch (error) {
      message.error(error?.data?.message || "Gagal menyimpan absensi.");
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
      title: "Siswa",
      dataIndex: "full_name",
      render: (_, record) => (
        <div>
          <Text strong>{record.full_name}</Text>
          <div style={{ color: "#667085", fontSize: 12 }}>
            NIS {record.nis || "-"}
          </div>
        </div>
      ),
    },
    {
      title: "Status",
      dataIndex: "status",
      width: 180,
      render: (_, record) => (
        <Select
          value={record.status}
          onChange={(value) => handleStatusChange(value, record)}
          style={{ width: "100%" }}
          placeholder="Pilih Status"
          options={STATUS_OPTIONS.map((item) => ({
            value: item.value,
            label: item.label,
          }))}
          optionRender={(option) => {
            const item = STATUS_OPTIONS.find(
              (opt) => opt.value === option.value,
            );
            return (
              <Tag color={item?.color} style={{ marginRight: 0 }}>
                {item?.label}
              </Tag>
            );
          }}
        />
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 20 } }}>
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Space wrap align="center">
            <Title level={5} style={{ margin: 0 }}>
              <Space>
                <ClipboardCheck size={18} />
                Absensi Kelas
              </Space>
            </Title>
            <Tag color="blue">
              {subject?.name || meta.subject_name || "Mata Pelajaran"}
            </Tag>
          </Space>

          <Space wrap>
            <Select
              placeholder="Pilih kelas"
              value={selectedClassId}
              onChange={(value) => {
                setSelectedClassId(value);
                setDirty(false);
              }}
              options={classOptions}
              loading={classLoading}
              style={{ minWidth: 200 }}
            />
            <DatePicker
              value={selectedDate}
              onChange={(value) => setSelectedDate(value)}
              format="DD MMM YYYY"
              allowClear={false}
              suffixIcon={<CalendarDays size={16} />}
            />
            <Input.Search
              placeholder="Cari nama / NIS"
              allowClear
              onSearch={(value) => setSearchText(value)}
              style={{ width: 220 }}
            />
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 170 }}
              options={[
                { value: "all", label: "Semua Status" },
                ...STATUS_OPTIONS.map((item) => ({
                  value: item.value,
                  label: item.label,
                })),
              ]}
            />
          </Space>
        </Flex>

        <Flex
          justify="space-between"
          align="center"
          wrap="wrap"
          gap={12}
          style={{ marginTop: 16 }}
        >
          <Space wrap>
            <Tag color="blue" icon={<Users size={12} />}>
              Total Siswa: {meta.total_students || rows.length}
            </Tag>
            {STATUS_OPTIONS.map((item) => (
              <Tag key={item.value} color={item.color}>
                {item.label}: {statusSummary[item.value] || 0}
              </Tag>
            ))}
          </Space>

          <Space wrap>
            <Select
              placeholder="Set semua status"
              style={{ width: 180 }}
              options={STATUS_OPTIONS.map((item) => ({
                value: item.value,
                label: item.label,
              }))}
              onChange={handleSetAll}
              allowClear
            />
            <Button
              icon={<RefreshCcw size={14} />}
              onClick={handleReset}
              disabled={!dirty}
            >
              Reset
            </Button>
            <Button
              type="primary"
              icon={<CheckCircle2 size={14} />}
              onClick={handleSave}
              loading={isSaving}
              disabled={!dirty || rows.length === 0}
            >
              Simpan Absensi
            </Button>
          </Space>
        </Flex>
      </Card>

      {!selectedClassId ? (
        <Alert
          type="info"
          showIcon
          title="Pilih kelas untuk mulai mengisi absensi."
        />
      ) : (
        <Card style={{ borderRadius: 16 }} styles={{ body: { padding: 0 } }}>
          <Table
            columns={columns}
            dataSource={filteredRows}
            pagination={false}
            loading={isFetching}
            rowKey="student_id"
            scroll={{ x: 720 }}
          />
        </Card>
      )}
    </Flex>
  );
};

export default Attendance;
