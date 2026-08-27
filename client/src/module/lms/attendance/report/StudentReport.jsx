import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Flex,
  Input,
  Modal,
  Select,
  Table,
  Tag,
  message,
} from 'antd';
import { BookOpenCheck, CalendarRange, RefreshCw, School, Search, Trash2, Users } from 'lucide-react';
import {
  useBulkDeleteDailyAttendanceRecordsMutation,
  useDeleteDailyAttendanceRecordMutation,
  useGetStudentAttendanceReportQuery,
  useUpdateDailyAttendanceRecordMutation,
} from '../../../../service/lms/ApiAttendance';
import { useGetClassesQuery, useGetGradesQuery } from '../../../../service/public/ApiPublic';
import {
  BulkDeleteBar,
  FilterBar,
  ReportHeader,
  StackedCell,
  StatCardGrid,
  StatusTag,
  buildActionColumn,
  buildPagination,
  buildRowSelection,
  buildTableProps,
  detailColumnConfig,
  filterControlStyle,
  formatDateCell,
  formatDateTimeCell,
  formatDateTimeDetail,
  formatDetailValue,
  modalWidth,
  parseReportDateTime,
  sortByLatestTap,
  surfaceCardBodyStyles,
  surfaceCardStyle,
  tableShellStyle,
  toolbarButtonStyle,
  useResponsiveFlags,
} from './reportShared';

const { RangePicker } = DatePicker;

const STATUS_COLORS = {
  present: 'green',
  late: 'gold',
  absent: 'red',
  excused: 'blue',
  incomplete: 'orange',
  pending: 'default',
};

const STUDENT_STATUS_OPTIONS = [
  { value: 'present', label: 'Present (Hadir)' },
  { value: 'late', label: 'Late (Telat)' },
  { value: 'absent', label: 'Absent (Absen)' },
  { value: 'excused', label: 'Excused (Sakit/Izin)' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'pending', label: 'Pending (Belum tap)' },
];

const StudentReport = ({ homebaseId, periodeId, pollingInterval = 0 } = {}) => {
  const { isMobile, isCompact } = useResponsiveFlags();
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
  const rows = useMemo(() => sortByLatestTap(data?.data?.rows), [data?.data?.rows]);
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
      icon: <CalendarRange size={isMobile ? 14 : 18} />,
      color: '#166534',
      bg: '#f0fdf4',
    },
    {
      key: 'pending',
      title: 'Belum tap',
      value: Number(summary.pending_count || 0),
      icon: <Users size={isMobile ? 14 : 18} />,
      color: '#a16207',
      bg: '#fefce8',
    },
    {
      key: 'excused',
      title: 'Sakit/Izin',
      value: Number(summary.excused_count || 0),
      icon: <BookOpenCheck size={isMobile ? 14 : 18} />,
      color: '#1d4ed8',
      bg: '#eff6ff',
    },
    {
      key: 'absent',
      title: 'Absen',
      value: Number(summary.absent_count || 0),
      icon: <School size={isMobile ? 14 : 18} />,
      color: '#b91c1c',
      bg: '#fef2f2',
    },
  ];

  const columns = [
    {
      title: 'Siswa',
      key: 'student',
      width: isMobile ? 170 : 250,
      fixed: 'left',
      ellipsis: true,
      render: (_, row) => (
        <StackedCell
          primary={row.full_name}
          secondary={
            isMobile
              ? `${row.class_name || '-'} · NIS ${row.nis || '-'}`
              : `NIS ${row.nis || '-'} · ${row.grade_name || '-'} / ${row.class_name || '-'}`
          }
        />
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'attendance_date',
      width: isMobile ? 96 : 130,
      ellipsis: true,
      render: (value) => formatDateCell(value, isMobile),
    },
    {
      title: 'Status',
      dataIndex: 'attendance_status',
      width: isMobile ? 108 : 125,
      render: (value) => <StatusTag value={value} colorMap={STATUS_COLORS} />,
    },
    {
      title: 'Datang',
      dataIndex: 'checkin_at',
      width: isMobile ? 108 : 140,
      ellipsis: true,
      render: (value) => formatDateTimeCell(value, isMobile),
    },
    {
      title: 'Pulang',
      dataIndex: 'checkout_at',
      width: isMobile ? 108 : 140,
      ellipsis: true,
      render: (value) => formatDateTimeCell(value, isMobile),
    },
    buildActionColumn(handleRowAction),
  ];

  return (
    <Flex vertical gap={isMobile ? 12 : 18} style={{ width: '100%', minWidth: 0 }}>
      <Card variant="borderless" style={surfaceCardStyle} styles={surfaceCardBodyStyles(isMobile)}>
        <Flex vertical gap={16} style={{ minWidth: 0 }}>
          <ReportHeader
            title="Laporan Presensi Siswa"
            description="Rekap kehadiran harian siswa berdasarkan data daily_attendance."
            isMobile={isMobile}
            extra={
              <Button
                icon={<RefreshCw size={16} />}
                loading={isFetching}
                onClick={() => refetch()}
                style={toolbarButtonStyle(isMobile)}>
                Refresh
              </Button>
            }
          />

          <FilterBar isMobile={isMobile}>
            <RangePicker
              value={range}
              onChange={(value) => setRange(value)}
              format={isMobile ? 'DD/MM/YY' : 'YYYY-MM-DD'}
              placeholder={['Tanggal awal', 'Tanggal akhir']}
              inputReadOnly={isMobile}
              style={filterControlStyle(isCompact, 260)}
            />
            <Input
              allowClear
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Cari nama siswa"
              prefix={<Search size={16} />}
              style={filterControlStyle(isMobile, 180)}
            />
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              virtual={false}
              allowClear
              popupMatchSelectWidth={false}
              value={gradeId}
              onChange={(value) => {
                setGradeId(value);
                setClassId(undefined);
              }}
              placeholder="Filter tingkat"
              options={gradeOptions}
              style={filterControlStyle(isMobile, 160)}
            />
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              virtual={false}
              allowClear
              popupMatchSelectWidth={false}
              value={classId}
              onChange={setClassId}
              placeholder="Filter kelas"
              options={classOptions}
              style={filterControlStyle(isMobile, 160)}
            />
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              virtual={false}
              allowClear
              popupMatchSelectWidth={false}
              value={status}
              onChange={setStatus}
              placeholder="Filter status"
              options={STUDENT_STATUS_OPTIONS}
              style={filterControlStyle(isMobile, 180)}
            />
          </FilterBar>
        </Flex>
      </Card>

      <StatCardGrid items={statItems} isMobile={isMobile} />

      <Card variant="borderless" style={surfaceCardStyle} styles={surfaceCardBodyStyles(isMobile)}>
        {rows.length > 0 && (
          <BulkDeleteBar
            selectedCount={selectedRowKeys.length}
            loading={bulkDeleting}
            onDelete={handleBulkDelete}
            label="data absensi"
            isMobile={isMobile}
            icon={<Trash2 size={16} />}
          />
        )}
        {rows.length === 0 && !isLoading && !isFetching ? (
          <Empty description="Belum ada data presensi siswa pada rentang ini." />
        ) : (
          <div style={tableShellStyle}>
            <Table
              rowKey="id"
              loading={isLoading || (isFetching && rows.length > 0)}
              dataSource={rows}
              columns={columns}
              {...buildTableProps({ isMobile, minWidth: isMobile ? 700 : 900 })}
              pagination={buildPagination({ pageSize, setPageSize, isMobile, unit: 'catatan' })}
              rowSelection={buildRowSelection({
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                isMobile,
              })}
            />
          </div>
        )}
      </Card>

      <Modal
        title="Detail Presensi Siswa"
        centered
        open={!!detailRow}
        onCancel={() => setDetailRow(null)}
        footer={null}
        width={modalWidth(isMobile)}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
        {detailRow && (
          <Descriptions
            bordered
            column={detailColumnConfig}
            size="small"
            styles={{
              label: { width: isMobile ? 130 : 170, whiteSpace: 'nowrap' },
              content: { wordBreak: 'break-word' },
            }}
            items={[
              { key: 'id', label: 'ID', children: formatDetailValue(detailRow.id) },
              {
                key: 'status',
                label: 'Status',
                children: (
                  <Tag
                    color={STATUS_COLORS[detailRow.attendance_status] || 'default'}
                    style={{ margin: 0 }}>
                    {detailRow.attendance_status}
                  </Tag>
                ),
              },
              {
                key: 'date',
                label: 'Tanggal',
                span: 2,
                children: formatDetailValue(detailRow.attendance_date),
              },
              { key: 'name', label: 'Nama Siswa', children: formatDetailValue(detailRow.full_name) },
              { key: 'nis', label: 'NIS', children: formatDetailValue(detailRow.nis) },
              { key: 'grade', label: 'Tingkat', children: formatDetailValue(detailRow.grade_name) },
              { key: 'class', label: 'Kelas', children: formatDetailValue(detailRow.class_name) },
              { key: 'user_id', label: 'User ID', children: formatDetailValue(detailRow.user_id) },
              { key: 'class_id', label: 'Class ID', children: formatDetailValue(detailRow.class_id) },
              { key: 'checkin', label: 'Datang', children: formatDateTimeDetail(detailRow.checkin_at) },
              { key: 'checkout', label: 'Pulang', children: formatDateTimeDetail(detailRow.checkout_at) },
              {
                key: 'late',
                label: 'Terlambat (menit)',
                children: formatDetailValue(detailRow.late_minutes),
              },
              {
                key: 'presence',
                label: 'Durasi Hadir (menit)',
                children: formatDetailValue(detailRow.presence_minutes),
              },
              { key: 'notes', label: 'Catatan', span: 2, children: formatDetailValue(detailRow.notes) },
            ]}
          />
        )}
      </Modal>

      <Modal
        title="Edit Presensi Siswa"
        centered
        open={!!editingRow}
        onCancel={closeEditModal}
        onOk={handleSaveEdit}
        confirmLoading={savingEdit}
        okText="Simpan"
        width={modalWidth(isMobile, 520)}>
        <Flex vertical gap={12} style={{ marginTop: 8 }}>
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            virtual={false}
            value={editStatus}
            onChange={setEditStatus}
            placeholder="Status"
            options={STUDENT_STATUS_OPTIONS}
            style={{ width: '100%' }}
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
