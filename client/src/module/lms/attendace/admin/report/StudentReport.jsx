import { useState } from "react";
import dayjs from "dayjs";
import {
  Card,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
} from "antd";
import { motion } from "framer-motion";
import { BookOpenCheck, CalendarRange, School, Users } from "lucide-react";
import { useGetStudentAttendanceReportQuery } from "../../../../../service/lms/ApiAttendance";
import {
  useGetClassesQuery,
  useGetGradesQuery,
} from "../../../../../service/public/ApiPublic";

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const surfaceCardStyle = {
  borderRadius: 22,
  border: "1px solid #e5edf6",
  background: "linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)",
  boxShadow: "0 18px 36px rgba(15, 23, 42, 0.06)",
};

const statCardStyle = {
  borderRadius: 18,
  border: "1px solid #e2ebf5",
  background: "#ffffff",
  boxShadow: "0 12px 28px rgba(15, 23, 42, 0.05)",
};

const formatDateCell = (value) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY") : value;
};

const formatDateTimeCell = (value) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY HH:mm:ss") : value;
};

const StudentReport = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [range, setRange] = useState([dayjs().startOf("month"), dayjs().endOf("month")]);
  const [gradeId, setGradeId] = useState();
  const [classId, setClassId] = useState();
  const [status, setStatus] = useState();

  const { data: gradesRes } = useGetGradesQuery();
  const { data: classesRes } = useGetClassesQuery({ gradeId });
  const { data, isLoading, isFetching } = useGetStudentAttendanceReportQuery({
    startDate: range?.[0]?.format("YYYY-MM-DD"),
    endDate: range?.[1]?.format("YYYY-MM-DD"),
    gradeId,
    classId,
    status,
  });

  const summary = data?.data?.summary || {};
  const rows = data?.data?.rows || [];
  const gradeOptions = (Array.isArray(gradesRes) ? gradesRes : []).map((item) => ({
    value: Number(item.id),
    label: item.name,
  }));
  const classOptions = (Array.isArray(classesRes) ? classesRes : []).map((item) => ({
    value: Number(item.id),
    label: item.name,
  }));

  const statItems = [
    {
      key: "students",
      title: "Total Siswa",
      value: Number(summary.total_students || 0),
      icon: <Users size={18} />,
      color: "#0f766e",
      bg: "#ecfeff",
    },
    {
      key: "records",
      title: "Total Catatan",
      value: Number(summary.total_records || 0),
      icon: <BookOpenCheck size={18} />,
      color: "#1d4ed8",
      bg: "#eff6ff",
    },
    {
      key: "present",
      title: "Hadir/Telat",
      value: Number(summary.present_count || 0) + Number(summary.late_count || 0),
      icon: <CalendarRange size={18} />,
      color: "#166534",
      bg: "#f0fdf4",
    },
    {
      key: "absent",
      title: "Absen",
      value:
        Number(summary.absent_count || 0) +
        Number(summary.excused_count || 0) +
        Number(summary.incomplete_count || 0),
      icon: <School size={18} />,
      color: "#b91c1c",
      bg: "#fef2f2",
    },
  ];

  return (
    <Flex vertical gap={18}>
      <Card style={surfaceCardStyle} bordered={false}>
        <Flex vertical gap={16}>
          <Flex
            justify='space-between'
            align={isMobile ? "stretch" : "center"}
            vertical={isMobile}
            gap={12}
          >
            <div>
              <Text strong style={{ color: "#0f172a", fontSize: 16 }}>
                Laporan Presensi Siswa
              </Text>
              <div>
                <Text type='secondary'>
                  Rekap kehadiran harian siswa berdasarkan data `daily_attendance`.
                </Text>
              </div>
            </div>
          </Flex>

          <Flex gap={12} wrap='wrap'>
            <RangePicker
              value={range}
              onChange={(value) => setRange(value)}
              format='YYYY-MM-DD'
              style={{ minWidth: isMobile ? "100%" : 280 }}
            />
            <Select
              showSearch
              optionFilterProp='label'
              virtual={false}
              allowClear
              value={gradeId}
              onChange={(value) => {
                setGradeId(value);
                setClassId(undefined);
              }}
              placeholder='Filter tingkat'
              style={{ minWidth: isMobile ? "100%" : 180 }}
              options={gradeOptions}
            />
            <Select
              showSearch
              optionFilterProp='label'
              virtual={false}
              allowClear
              value={classId}
              onChange={setClassId}
              placeholder='Filter kelas'
              style={{ minWidth: isMobile ? "100%" : 220 }}
              options={classOptions}
            />
            <Select
              showSearch
              optionFilterProp='label'
              virtual={false}
              allowClear
              value={status}
              onChange={setStatus}
              placeholder='Filter status'
              style={{ minWidth: isMobile ? "100%" : 200 }}
              options={[
                { value: "present", label: "Present" },
                { value: "late", label: "Late" },
                { value: "absent", label: "Absent" },
                { value: "excused", label: "Excused" },
                { value: "incomplete", label: "Incomplete" },
              ]}
            />
          </Flex>
        </Flex>
      </Card>

      <Flex gap={12} wrap='wrap'>
        {statItems.map((item, index) => (
          <MotionDiv
            key={item.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.04 }}
            style={{ flex: "1 1 220px" }}
          >
            <Card bordered={false} style={statCardStyle}>
              <Flex justify='space-between' align='start' gap={10}>
                <Statistic title={item.title} value={item.value} />
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: "grid",
                    placeItems: "center",
                    background: item.bg,
                    color: item.color,
                    flexShrink: 0,
                  }}
                >
                  {item.icon}
                </span>
              </Flex>
            </Card>
          </MotionDiv>
        ))}
      </Flex>

      <Card style={surfaceCardStyle} bordered={false}>
        {rows.length === 0 && !isLoading && !isFetching ? (
          <Empty description='Belum ada data presensi siswa pada rentang ini.' />
        ) : (
          <Table
            rowKey='id'
            loading={isLoading || isFetching}
            dataSource={rows}
            scroll={{ x: 980 }}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: "Tanggal",
                dataIndex: "attendance_date",
                width: 120,
                render: (value) => formatDateCell(value),
              },
              {
                title: "Siswa",
                width: 220,
                render: (_, row) => (
                  <Flex vertical gap={2}>
                    <Text strong>{row.full_name}</Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      NIS {row.nis || "-"}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: "Kelas",
                width: 160,
                render: (_, row) => `${row.grade_name || "-"} / ${row.class_name || "-"}`,
              },
              {
                title: "Status",
                dataIndex: "attendance_status",
                width: 140,
                render: (value) => {
                  const colorMap = {
                    present: "green",
                    late: "gold",
                    absent: "red",
                    excused: "blue",
                    incomplete: "orange",
                  };
                  return <Tag color={colorMap[value] || "default"}>{value}</Tag>;
                },
              },
              {
                title: "Checkin",
                dataIndex: "checkin_at",
                width: 180,
                render: (value) => formatDateTimeCell(value),
              },
              {
                title: "Checkout",
                dataIndex: "checkout_at",
                width: 180,
                render: (value) => formatDateTimeCell(value),
              },
              {
                title: "Terlambat",
                dataIndex: "late_minutes",
                width: 120,
                render: (value) => `${Number(value || 0)} mnt`,
              },
            ]}
          />
        )}
      </Card>
    </Flex>
  );
};

export default StudentReport;
