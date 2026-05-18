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
import {
  BriefcaseBusiness,
  Clock3,
  Pencil,
  TimerReset,
  Trash2,
  UsersRound,
} from "lucide-react";
import {
  useDeleteDailyAttendanceRecordMutation,
  useGetTeacherAttendanceReportQuery,
  useUpdateDailyAttendanceRecordMutation,
} from "../../../../../service/lms/ApiAttendance";

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

const formatMinutesToHours = (value) => {
  const minutes = Number(value || 0);
  const hours = minutes / 60;

  return `${hours.toFixed(2)} jam`;
};

const TeacherReport = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [range, setRange] = useState([
    dayjs().startOf("month"),
    dayjs().endOf("month"),
  ]);
  const [status, setStatus] = useState();
  const [editingRow, setEditingRow] = useState(null);
  const [editCheckin, setEditCheckin] = useState(null);
  const [editCheckout, setEditCheckout] = useState(null);

  const [updateDailyAttendance, { isLoading: savingEdit }] =
    useUpdateDailyAttendanceRecordMutation();
  const [deleteDailyAttendance, { isLoading: deletingRow }] =
    useDeleteDailyAttendanceRecordMutation();
  const { data, isLoading, isFetching } = useGetTeacherAttendanceReportQuery({
    startDate: range?.[0]?.format("YYYY-MM-DD"),
    endDate: range?.[1]?.format("YYYY-MM-DD"),
    status,
  });

  const summary = data?.data?.summary || {};
  const sessionSummary = data?.data?.session_summary || {};
  const rows = data?.data?.rows || [];

  const statItems = [
    {
      key: "teachers",
      title: "Total Guru",
      value: Number(summary.total_teachers || 0),
      icon: <UsersRound size={18} />,
      color: "#1d4ed8",
      bg: "#eff6ff",
    },
    {
      key: "records",
      title: "Catatan Harian",
      value: Number(summary.total_records || 0),
      icon: <BriefcaseBusiness size={18} />,
      color: "#0f766e",
      bg: "#ecfeff",
    },
    {
      key: "sessions",
      title: "Sesi Mengajar",
      value: Number(sessionSummary.total_sessions || 0),
      icon: <Clock3 size={18} />,
      color: "#7c3aed",
      bg: "#f5f3ff",
    },
    {
      key: "issues",
      title: "Perlu Tindak Lanjut",
      value:
        Number(summary.absent_count || 0) +
        Number(summary.incomplete_count || 0) +
        Number(summary.insufficient_hours_count || 0),
      icon: <TimerReset size={18} />,
      color: "#b91c1c",
      bg: "#fef2f2",
    },
  ];

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
      message.success("Data absensi guru berhasil diperbarui.");
      closeEditModal();
    } catch (error) {
      message.error(error?.data?.message || "Gagal memperbarui absensi guru.");
    }
  };

  const handleDeleteRow = async (id) => {
    try {
      await deleteDailyAttendance(id).unwrap();
      message.success("Data absensi guru berhasil dihapus.");
    } catch (error) {
      message.error(error?.data?.message || "Gagal menghapus absensi guru.");
    }
  };

  return (
    <Flex vertical gap={18}>
      <Card style={surfaceCardStyle} bordered={false}>
        <Flex vertical gap={16}>
          <div>
            <Text strong style={{ color: "#0f172a", fontSize: 16 }}>
              Laporan Presensi Guru
            </Text>
            <div>
              <Text type='secondary'>
                Rekap kehadiran harian guru dan ringkasan sesi mengajar.
              </Text>
            </div>
          </div>

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
              value={status}
              onChange={setStatus}
              placeholder='Filter status'
              style={{ minWidth: isMobile ? "100%" : 220 }}
              options={[
                { value: "present", label: "Present" },
                { value: "late", label: "Late" },
                { value: "absent", label: "Absent" },
                { value: "incomplete", label: "Incomplete" },
                { value: "insufficient_hours", label: "Insufficient Hours" },
                { value: "not_scheduled", label: "Not Scheduled" },
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
          <Empty description='Belum ada data presensi guru pada rentang ini.' />
        ) : (
          <Table
            rowKey='id'
            loading={isLoading || isFetching}
            dataSource={rows}
            scroll={{ x: 840 }}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: "Guru",
                width: 240,
                render: (_, row) => (
                  <Flex vertical gap={2}>
                    <Text strong>{row.full_name}</Text>
                    <Text type='secondary' style={{ fontSize: 12 }}>
                      NIP {row.nip || "-"}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: "Status",
                dataIndex: "attendance_status",
                width: 150,
                render: (value) => {
                  const colorMap = {
                    present: "green",
                    late: "gold",
                    absent: "red",
                    incomplete: "orange",
                    insufficient_hours: "volcano",
                    not_scheduled: "blue",
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
                title: "Durasi Hadir",
                dataIndex: "presence_minutes",
                width: 130,
                render: (value) => formatMinutesToHours(value),
              },
              {
                title: "Min. Wajib",
                dataIndex: "minimum_required_minutes",
                width: 130,
                render: (value) => formatMinutesToHours(value),
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
        title='Edit Checkin / Checkout Guru'
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

export default TeacherReport;
