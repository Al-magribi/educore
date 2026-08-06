import { useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Flex,
  Grid,
  Input,
  Modal,
  Select,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { motion } from 'framer-motion';
import { BookOpenCheck, CalendarRange, RefreshCw, School, Search, Trash2, Users } from 'lucide-react';
import {
  useBulkDeleteDailyAttendanceRecordsMutation,
  useDeleteDailyAttendanceRecordMutation,
  useGetStudentAttendanceReportQuery,
  useUpdateDailyAttendanceRecordMutation,
} from '../../../../service/lms/ApiAttendance';
import { useGetClassesQuery, useGetGradesQuery } from '../../../../service/public/ApiPublic';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const surfaceCardStyle = {
  borderRadius: 22,
  border: '1px solid #e5edf6',
  background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
  boxShadow: '0 18px 36px rgba(15, 23, 42, 0.06)',
};

const statCardStyle = {
  borderRadius: 18,
  border: '1px solid #e2ebf5',
  background: '#ffffff',
  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
};

const STATUS_COLORS = {
  present: 'green',
  late: 'gold',
  absent: 'red',
  excused: 'blue',
  incomplete: 'orange',
};

const formatDateTimeCell = (value) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YY HH:mm') : value;
};

const formatDateTimeDetail = (value) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YYYY HH:mm:ss') : value;
};

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return value;
};

const parseReportDateTime = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (match) {
    const parsed = dayjs(`${match[1]}T${match[2]}`);
    return parsed.isValid() ? parsed : null;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

const STUDENT_STATUS_OPTIONS = [
  { value: 'present', label: 'Present (Hadir)' },
  { value: 'late', label: 'Late (Telat)' },
  { value: 'absent', label: 'Absent (Absen)' },
  { value: 'excused', label: 'Excused (Sakit/Izin)' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'pending', label: 'Pending (Belum tap)' },
];

const StudentReport = ({ homebaseId, periodeId, pollingInterval = 0 } = {}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [range, setRange] = useState([dayjs().startOf('day'), dayjs().endOf('day')]);
  const [gradeId, setGradeId] = useState();
  const [classId, setClassId] = useState();
  const [status, setStatus] = useState();
  const [userName, setUserName] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [editCheckin, setEditCheckin] = useState(null);
  const [editCheckout, setEditCheckout] = useState(null);
  const [editStatus, setEditStatus] = useState();
  const [editNotes, setEditNotes] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [pageSize, setPageSize] = useState(10);

  const { data: gradesRes } = useGetGradesQuery({ homebaseId });
  const { data: classesRes } = useGetClassesQuery({ gradeId, homebaseId });
  const [updateDailyAttendance, { isLoading: savingEdit }] = useUpdateDailyAttendanceRecordMutation();
  const [deleteDailyAttendance, { isLoading: deletingRow }] = useDeleteDailyAttendanceRecordMutation();
  const [bulkDeleteDailyAttendance, { isLoading: bulkDeleting }] =
    useBulkDeleteDailyAttendanceRecordsMutation();
  const { data, isLoading, isFetching, refetch } = useGetStudentAttendanceReportQuery(
    {
      startDate: range?.[0]?.format('YYYY-MM-DD'),
      endDate: range?.[1]?.format('YYYY-MM-DD'),
      gradeId,
      classId,
      status,
      userName: userName.trim() || undefined,
      homebaseId,
      periodeId,
    },
    { pollingInterval: pollingInterval || 0 },
  );

  const summary = data?.data?.summary || {};
  const rows = [...(data?.data?.rows || [])].sort((a, b) => {
    const aTap = Math.max(
      parseReportDateTime(a.checkin_at)?.valueOf() || 0,
      parseReportDateTime(a.checkout_at)?.valueOf() || 0,
    );
    const bTap = Math.max(
      parseReportDateTime(b.checkin_at)?.valueOf() || 0,
      parseReportDateTime(b.checkout_at)?.valueOf() || 0,
    );
    return bTap - aTap;
  });
  const gradeOptions = (Array.isArray(gradesRes) ? gradesRes : []).map((item) => ({
    value: Number(item.id),
    label: item.name,
  }));
  const classOptions = (Array.isArray(classesRes) ? classesRes : []).map((item) => ({
    value: Number(item.id),
    label: item.name,
  }));

  const openEditModal = (row) => {
    setEditingRow(row);
    setEditCheckin(parseReportDateTime(row.checkin_at));
    setEditCheckout(parseReportDateTime(row.checkout_at));
    setEditStatus(row.attendance_status);
    setEditNotes(row.notes || '');
  };

  const closeEditModal = () => {
    setEditingRow(null);
    setEditCheckin(null);
    setEditCheckout(null);
    setEditStatus(undefined);
    setEditNotes('');
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    try {
      await updateDailyAttendance({
        id: editingRow.id,
        homebaseId,
        checkin_at: editCheckin ? editCheckin.toISOString() : null,
        checkout_at: editCheckout ? editCheckout.toISOString() : null,
        attendance_status: editStatus,
        notes: editNotes,
      }).unwrap();
      message.success('Data absensi siswa berhasil diperbarui.');
      closeEditModal();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal memperbarui absensi siswa.');
      throw error;
    }
  };

  const handleDeleteRow = async (id) => {
    try {
      await deleteDailyAttendance({ id, homebaseId }).unwrap();
      message.success('Data absensi siswa berhasil dihapus.');
      setSelectedRowKeys((prev) => prev.filter((key) => String(key) !== String(id)));
      if (detailRow?.id === id) {
        setDetailRow(null);
      }
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus absensi siswa.');
      throw error;
    }
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: `Hapus ${selectedRowKeys.length} data absensi terpilih?`,
      content: 'Semua data absensi siswa yang dipilih akan dihapus permanen dari sistem.',
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      okButtonProps: { loading: bulkDeleting },
      onOk: async () => {
        try {
          const result = await bulkDeleteDailyAttendance({
            ids: selectedRowKeys,
            homebaseId,
          }).unwrap();
          message.success(result?.message || 'Data absensi terpilih berhasil dihapus.');
          if (detailRow && selectedRowKeys.some((key) => String(key) === String(detailRow.id))) {
            setDetailRow(null);
          }
          setSelectedRowKeys([]);
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus data absensi terpilih.');
          throw error;
        }
      },
    });
  };

  const handleRowAction = (action, row) => {
    if (action === 'detail') {
      setDetailRow(row);
      return;
    }

    if (action === 'edit') {
      openEditModal(row);
      return;
    }

    if (action === 'delete') {
      Modal.confirm({
        title: 'Hapus data absensi ini?',
        content: 'Data absensi siswa akan dihapus permanen dari sistem.',
        okText: 'Hapus',
        okType: 'danger',
        cancelText: 'Batal',
        okButtonProps: { loading: deletingRow },
        onOk: () => handleDeleteRow(row.id),
      });
    }
  };

  const statItems = [
    {
      key: 'present',
      title: 'Hadir/Telat',
      value: Number(summary.present_count || 0) + Number(summary.late_count || 0),
      icon: <CalendarRange size={18} />,
      color: '#166534',
      bg: '#f0fdf4',
    },
    {
      key: 'pending',
      title: 'Belum tap',
      value: Number(summary.pending_count || 0),
      icon: <Users size={18} />,
      color: '#a16207',
      bg: '#fefce8',
    },
    {
      key: 'excused',
      title: 'Sakit/Izin',
      value: Number(summary.excused_count || 0),
      icon: <BookOpenCheck size={18} />,
      color: '#1d4ed8',
      bg: '#eff6ff',
    },
    {
      key: 'absent',
      title: 'Absen',
      value: Number(summary.absent_count || 0),
      icon: <School size={18} />,
      color: '#b91c1c',
      bg: '#fef2f2',
    },
  ];

  return (
    <Flex vertical gap={18}>
      <Card style={surfaceCardStyle} bordered={false}>
        <Flex vertical gap={16}>
          <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
            <div>
              <Text strong style={{ color: '#0f172a', fontSize: 16 }}>
                Laporan Presensi Siswa
              </Text>
              <div>
                <Text type="secondary">Rekap kehadiran harian siswa berdasarkan data `daily_attendance`.</Text>
              </div>
            </div>
            <Button
              icon={<RefreshCw size={16} />}
              loading={isFetching}
              onClick={() => refetch()}
              style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
              Refresh
            </Button>
          </Flex>

          <Flex gap={'middle'} vertical={isMobile}>
            <RangePicker value={range} onChange={(value) => setRange(value)} format="YYYY-MM-DD" />
            <Input
              allowClear
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Cari nama siswa"
              prefix={<Search size={16} />}
              style={{ width: isMobile ? '100%' : 180 }}
            />
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              virtual={false}
              allowClear
              value={gradeId}
              onChange={(value) => {
                setGradeId(value);
                setClassId(undefined);
              }}
              placeholder="Filter tingkat"
              options={gradeOptions}
            />
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              virtual={false}
              allowClear
              value={classId}
              onChange={setClassId}
              placeholder="Filter kelas"
              options={classOptions}
            />
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              virtual={false}
              allowClear
              value={status}
              onChange={setStatus}
              placeholder="Filter status"
              options={[
                { value: 'present', label: 'Present (Hadir)' },
                { value: 'late', label: 'Late (Telat)' },
                { value: 'absent', label: 'Absent (Absen)' },
                { value: 'excused', label: 'Excused (Sakit/Izin)' },
                { value: 'incomplete', label: 'Incomplete' },
                { value: 'pending', label: 'Pending (Belum tap)' },
              ]}
            />
          </Flex>
        </Flex>
      </Card>

      <Flex gap={12} wrap="wrap">
        {statItems.map((item, index) => (
          <MotionDiv
            key={item.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.04 }}
            style={{ flex: '1 1 220px' }}>
            <Card bordered={false} style={statCardStyle}>
              <Flex justify="space-between" align="start" gap={10}>
                <Statistic title={item.title} value={item.value} />
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: item.bg,
                    color: item.color,
                    flexShrink: 0,
                  }}>
                  {item.icon}
                </span>
              </Flex>
            </Card>
          </MotionDiv>
        ))}
      </Flex>

      <Card style={surfaceCardStyle} bordered={false}>
        {rows.length > 0 && (
          <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedRowKeys.length > 0
                ? `${selectedRowKeys.length} data absensi terpilih`
                : 'Centang baris untuk hapus bulk'}
            </Text>
            <Button
              danger
              icon={<Trash2 size={16} />}
              disabled={selectedRowKeys.length === 0}
              loading={bulkDeleting}
              onClick={handleBulkDelete}>
              Hapus Terpilih
            </Button>
          </Flex>
        )}
        {rows.length === 0 && !isLoading && !isFetching ? (
          <Empty description="Belum ada data presensi siswa pada rentang ini." />
        ) : (
          <Table
            rowKey="id"
            loading={isLoading || (isFetching && rows.length > 0)}
            dataSource={rows}
            tableLayout="fixed"
            pagination={{
              pageSize,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} catatan`,
              onChange: (_page, size) => setPageSize(size),
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={[
              {
                title: 'Siswa',
                ellipsis: true,
                render: (_, row) => (
                  <Flex vertical gap={2}>
                    <Text strong ellipsis>
                      {row.full_name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      NIS {row.nis || '-'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      {row.grade_name || '-'} / {row.class_name || '-'}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: 'Tanggal',
                dataIndex: 'attendance_date',
                ellipsis: true,
              },
              {
                title: 'Status',
                dataIndex: 'attendance_status',
                render: (value) => <Tag color={STATUS_COLORS[value] || 'default'}>{value}</Tag>,
              },
              {
                title: 'Datang',
                dataIndex: 'checkin_at',
                ellipsis: true,
                render: (value) => formatDateTimeCell(value),
              },
              {
                title: 'Pulang',
                dataIndex: 'checkout_at',
                ellipsis: true,
                render: (value) => formatDateTimeCell(value),
              },
              {
                title: 'Aksi',
                width: 110,
                render: (_, row) => (
                  <Select
                    placeholder="Aksi"
                    value={null}
                    virtual={false}
                    style={{ width: '100%', maxWidth: 110 }}
                    options={[
                      { value: 'detail', label: 'Detail' },
                      { value: 'edit', label: 'Edit' },
                      { value: 'delete', label: 'Hapus' },
                    ]}
                    onChange={(value) => handleRowAction(value, row)}
                  />
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title="Detail Presensi Siswa"
        centered
        open={!!detailRow}
        onCancel={() => setDetailRow(null)}
        footer={null}
        width={720}>
        {detailRow && (
          <Descriptions bordered column={isMobile ? 1 : 2} size="small">
            <Descriptions.Item label="ID">{detailRow.id}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLORS[detailRow.attendance_status] || 'default'}>{detailRow.attendance_status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tanggal" span={2}>
              {formatDetailValue(detailRow.attendance_date)}
            </Descriptions.Item>
            <Descriptions.Item label="Nama Siswa">{formatDetailValue(detailRow.full_name)}</Descriptions.Item>
            <Descriptions.Item label="NIS">{formatDetailValue(detailRow.nis)}</Descriptions.Item>
            <Descriptions.Item label="Tingkat">{formatDetailValue(detailRow.grade_name)}</Descriptions.Item>
            <Descriptions.Item label="Kelas">{formatDetailValue(detailRow.class_name)}</Descriptions.Item>
            <Descriptions.Item label="User ID">{formatDetailValue(detailRow.user_id)}</Descriptions.Item>
            <Descriptions.Item label="Class ID">{formatDetailValue(detailRow.class_id)}</Descriptions.Item>
            <Descriptions.Item label="Datang">{formatDateTimeDetail(detailRow.checkin_at)}</Descriptions.Item>
            <Descriptions.Item label="Pulang">{formatDateTimeDetail(detailRow.checkout_at)}</Descriptions.Item>
            <Descriptions.Item label="Terlambat (menit)">{formatDetailValue(detailRow.late_minutes)}</Descriptions.Item>
            <Descriptions.Item label="Durasi Hadir (menit)">
              {formatDetailValue(detailRow.presence_minutes)}
            </Descriptions.Item>
            <Descriptions.Item label="Catatan" span={2}>
              {formatDetailValue(detailRow.notes)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="Edit Presensi Siswa"
        open={!!editingRow}
        onCancel={closeEditModal}
        onOk={handleSaveEdit}
        confirmLoading={savingEdit}
        okText="Simpan">
        <Flex vertical gap={12}>
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            virtual={false}
            value={editStatus}
            onChange={setEditStatus}
            placeholder="Status"
            options={STUDENT_STATUS_OPTIONS}
          />
          <DatePicker
            showTime
            value={editCheckin}
            onChange={setEditCheckin}
            style={{ width: '100%' }}
            placeholder="Checkin"
            format="YYYY-MM-DD HH:mm:ss"
          />
          <DatePicker
            showTime
            value={editCheckout}
            onChange={setEditCheckout}
            style={{ width: '100%' }}
            placeholder="Checkout"
            format="YYYY-MM-DD HH:mm:ss"
          />
          <Input.TextArea
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
            placeholder="Catatan"
            rows={3}
          />
        </Flex>
      </Modal>
    </Flex>
  );
};

export default StudentReport;
