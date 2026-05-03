import { useState } from "react";
import dayjs from "dayjs";
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Modal,
  Popconfirm,
  Select,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { motion } from "framer-motion";
import { BookOpenCheck, CalendarRange, Pencil, School, Trash2, Users } from "lucide-react";
import {
  useDeleteDailyAttendanceRecordMutation,
  useGetStudentAttendanceReportQuery,
  useUpdateDailyAttendanceRecordMutation,
} from "../../../../../service/lms/ApiAttendance";
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

const formatDateTimeCell = (value) => {
  if (!value) return "-";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD MMM YYYY HH:mm:ss") : value;
};

const StudentReport = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [range, setRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [gradeId, setGradeId] = useState();
  const [classId, setClassId] = useState();
  const [status, setStatus] = useState();
  const [editingRow, setEditingRow] = useState(null);
  const [editCheckin, setEditCheckin] = useState(null);
  const [editCheckout, setEditCheckout] = useState(null);

  const { data: gradesRes } = useGetGradesQuery();
  const { data: classesRes } = useGetClassesQuery({ gradeId });
  const [updateDailyAttendance, { isLoading: savingEdit }] =
    useUpdateDailyAttendanceRecordMutation();
  const [deleteDailyAttendance, { isLoading: deletingRow }] =
    useDeleteDailyAttendanceRecordMutation();
  const { data, isLoading, isFetching } = useGetStudentAttendanceReportQuery({
    startDate: range?.[0]?.format("YYYY-MM-DD"),
    endDate: range?.[1]?.format("YYYY-MM-DD"),
    gradeId,
    classId,
    status,
  });

  const summary = data?.data?.summary || {};
  const rows = data?.data?.rows || [];
  const gradeOptions = (Array.isArray(gradesRes) ? gradesRes : []).map(
    (item) => ({
      value: Number(item.id),
      label: item.name,
    }),
  );
  const classOptions = (Array.isArray(classesRes) ? classesRes : []).map(
    (item) => ({
      value: Number(item.id),
      label: item.name,
    }),
  );

  const openEditModal = (row) => {
    setEditingRow(row);
    setEditCheckin(row.checkin_at ? dayjs(row.checkin_at) : null);
    setEditCheckout(row.checkout_at ? dayjs(row.checkout_at) : null);
  };

  const closeEditModal = () => {
    setEditingRow(null);
    setEditCheckin(null);
    setEditCheckout(null);
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    try {
      await updateDailyAttendance({
        id: editingRow.id,
        checkin_at: editCheckin ? editCheckin.toISOString() : null,
        checkout_at: editCheckout ? editCheckout.toISOString() : null,
      }).unwrap();
      message.success("Data absensi siswa berhasil diperbarui.");
      closeEditModal();
    } catch (error) {
      message.error(error?.data?.message || "Gagal memperbarui absensi siswa.");
    }
  };

  const handleDeleteRow = async (id) => {
    try {
      await deleteDailyAttendance(id).unwrap();
      message.success("Data absensi siswa berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus absensi siswa.");
    }
  };

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
      value:
        Number(summary.present_count || 0) + Number(summary.late_count || 0),
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
                  Rekap kehadiran harian siswa berdasarkan data
                  `daily_attendance`.
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
            scroll={{ x: 840 }}
            pagination={{ pageSize: 10 }}
            columns={[
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
                render: (_, row) =>
                  `${row.grade_name || "-"} / ${row.class_name || "-"}`,
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
                  return (
                    <Tag color={colorMap[value] || "default"}>{value}</Tag>
                  );
                },
              },
              {
                title: "Checkin / Checkout",
                width: 280,
                render: (_, row) => (
                  <Flex vertical gap={6}>
                    <Tag color='green' style={{ marginInlineEnd: 0, width: "fit-content" }}>
                      Checkin: {formatDateTimeCell(row.checkin_at)}
                    </Tag>
                    <Tag color='red' style={{ marginInlineEnd: 0, width: "fit-content" }}>
                      Checkout: {formatDateTimeCell(row.checkout_at)}
                    </Tag>
                  </Flex>
                ),
              },
              {
                title: "Terlambat",
                dataIndex: "late_minutes",
                width: 120,
                render: (value) => `${Number(value || 0)} mnt`,
              },
              {
                title: "Aksi",
                width: 130,
                fixed: "right",
                render: (_, row) => (
                  <Flex gap={8}>
                    <Button
                      size='small'
                      icon={<Pencil size={14} />}
                      onClick={() => openEditModal(row)}
                    />
                    <Popconfirm
                      title='Hapus data absensi ini?'
                      onConfirm={() => handleDeleteRow(row.id)}
                      okButtonProps={{ loading: deletingRow }}
                    >
                      <Button size='small' danger icon={<Trash2 size={14} />} />
                    </Popconfirm>
                  </Flex>
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title='Edit Checkin / Checkout Siswa'
        open={!!editingRow}
        onCancel={closeEditModal}
        onOk={handleSaveEdit}
        confirmLoading={savingEdit}
      >
        <Flex vertical gap={12}>
          <DatePicker
            showTime
            value={editCheckin}
            onChange={setEditCheckin}
            style={{ width: "100%" }}
            placeholder='Checkin'
            format='YYYY-MM-DD HH:mm:ss'
          />
          <DatePicker
            showTime
            value={editCheckout}
            onChange={setEditCheckout}
            style={{ width: "100%" }}
            placeholder='Checkout'
            format='YYYY-MM-DD HH:mm:ss'
          />
        </Flex>
      </Modal>
    </Flex>
  );
};

export default StudentReport;
