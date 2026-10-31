import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import dayjs from 'dayjs';
import {
  Button,
  Card,
  DatePicker,
  Flex,
  Input,
  Modal,
  Result,
  Select,
  Skeleton,
  Tag,
  message,
} from 'antd';
import {
  BookOpenCheck,
  CalendarRange,
  Download,
  Plus,
  RefreshCw,
  School,
  Search,
  UserCheck,
  Users,
} from 'lucide-react';
import {
  useDeleteClassAttendanceRecordMutation,
  useGetClassAttendanceRecordsQuery,
  useGetClassAttendanceWorkspaceQuery,
} from '../../../../service/lms/ApiAttendance';
import {
  FilterBar,
  ReportHeader,
  RowActionMenu,
  StatCardGrid,
  buildPagination,
  filterControlStyle,
  formatDateCell,
  surfaceCardBodyStyles,
  surfaceCardStyle,
  toolbarButtonStyle,
  useResponsiveFlags,
} from '../report/reportShared';
import { CardGridView, ReportMetricGrid, ReportRecordCard } from '../report/reportMobile';
import {
  CLASS_STATUS_META,
  CLASS_STATUS_OPTIONS,
  statusLabel,
  timeOnly,
} from './classAttendanceShared';
import { downloadClassAttendanceExcel } from './classAttendanceExport';
import OfficerAssignmentModal from './OfficerAssignmentModal';
import RecordFormModal from './RecordFormModal';

const { RangePicker } = DatePicker;

const buildRowActions = (row) => {
  const actions = [];
  if (row.can_edit) actions.push({ key: 'edit', label: 'Edit' });
  if (row.can_delete) actions.push({ key: 'delete', label: 'Hapus', danger: true });
  return actions;
};

const ClassAttendance = () => {
  const { isMobile, isCompact } = useResponsiveFlags();
  const currentUserId = useSelector((state) => state.auth.user?.id);
  const [range, setRange] = useState([dayjs(), dayjs()]);
  const [status, setStatus] = useState();
  const [keyword, setKeyword] = useState('');
  const [pageSize, setPageSize] = useState(12);
  const [formState, setFormState] = useState({ open: false, record: null });
  const [assignOpen, setAssignOpen] = useState(false);

  const {
    data: workspace,
    isLoading: workspaceLoading,
    error: workspaceError,
  } = useGetClassAttendanceWorkspaceQuery();
  const startDate = range?.[0]?.format('YYYY-MM-DD');
  const endDate = range?.[1]?.format('YYYY-MM-DD');
  const {
    data: records = [],
    isFetching,
    refetch,
  } = useGetClassAttendanceRecordsQuery(
    { startDate, endDate },
    { skip: !workspace || !startDate || !endDate },
  );
  const [deleteRecord, { isLoading: deleting }] = useDeleteClassAttendanceRecordMutation();

  const access = workspace?.access;
  const classInfo = workspace?.class;
  const students = useMemo(() => workspace?.students || [], [workspace?.students]);
  const formStudents = useMemo(
    () =>
      access?.role === 'officer'
        ? students.filter((item) => Number(item.user_id) !== Number(currentUserId))
        : students,
    [access?.role, currentUserId, students],
  );

  const rows = useMemo(() => {
    const term = keyword.trim().toLowerCase();
    return records.filter(
      (row) =>
        (!status || row.attendance_status === status) &&
        (!term || `${row.full_name} ${row.nis || ''}`.toLowerCase().includes(term)),
    );
  }, [keyword, records, status]);

  const countByStatus = (...statuses) =>
    rows.filter((row) => statuses.includes(row.attendance_status)).length;

  const statItems = [
    {
      key: 'present',
      title: 'Hadir/Telat',
      value: countByStatus('present', 'late', 'insufficient_hours'),
      icon: <CalendarRange size={isMobile ? 14 : 18} />,
      color: '#166534',
      bg: '#f0fdf4',
    },
    {
      key: 'pending',
      title: 'Belum tap',
      value: countByStatus('pending', 'incomplete'),
      icon: <Users size={isMobile ? 14 : 18} />,
      color: '#a16207',
      bg: '#fefce8',
    },
    {
      key: 'excused',
      title: 'Sakit/Izin',
      value: countByStatus('excused'),
      icon: <BookOpenCheck size={isMobile ? 14 : 18} />,
      color: '#1d4ed8',
      bg: '#eff6ff',
    },
    {
      key: 'absent',
      title: 'Absen',
      value: countByStatus('absent'),
      icon: <School size={isMobile ? 14 : 18} />,
      color: '#b91c1c',
      bg: '#fef2f2',
    },
  ];

  const handleDelete = (row) => {
    Modal.confirm({
      title: 'Hapus data presensi ini?',
      content: row.has_machine_tap
        ? `Presensi ${row.full_name} beserta log tap mesin akan dihapus permanen.`
        : `Presensi ${row.full_name} akan dihapus permanen.`,
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      okButtonProps: { loading: deleting },
      onOk: async () => {
        try {
          const result = await deleteRecord(row.id).unwrap();
          message.success(result?.message || 'Data presensi berhasil dihapus.');
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus data presensi.');
        }
      },
    });
  };

  const handleRowAction = (action, row) => {
    if (action === 'edit') setFormState({ open: true, record: row });
    if (action === 'delete') handleDelete(row);
  };

  const handleExport = () => {
    downloadClassAttendanceExcel({
      className: classInfo?.name,
      startDate,
      endDate,
      students,
      rows: records,
      detailRows: rows,
    });
  };

  if (workspaceLoading) {
    return (
      <Card variant="borderless" style={surfaceCardStyle}>
        <Skeleton active />
      </Card>
    );
  }

  if (workspaceError || !workspace) {
    return (
      <Result
        status={workspaceError?.status === 403 ? '403' : 'error'}
        title="Presensi kelas tidak tersedia"
        subTitle={workspaceError?.data?.message || 'Data kelas gagal dimuat.'}
      />
    );
  }

  return (
    <Flex vertical gap={isMobile ? 12 : 18} style={{ width: '100%', minWidth: 0 }}>
      <Card variant="borderless" style={surfaceCardStyle} styles={surfaceCardBodyStyles(isMobile)}>
        <Flex vertical gap={16} style={{ minWidth: 0 }}>
          <ReportHeader
            title={`Presensi Kelas ${classInfo.name}`}
            description="Data berasal dari tap mesin absen dan dapat dilengkapi secara manual."
            isMobile={isMobile}
            extra={
              <>
                <Button
                  icon={<RefreshCw size={16} />}
                  loading={isFetching}
                  onClick={() => refetch()}
                  style={toolbarButtonStyle(isMobile)}>
                  Refresh
                </Button>
                {access.can_assign && (
                  <Button
                    icon={<UserCheck size={16} />}
                    onClick={() => setAssignOpen(true)}
                    style={toolbarButtonStyle(isMobile)}>
                    Penugasan
                  </Button>
                )}
                {access.can_export && (
                  <Button
                    icon={<Download size={16} />}
                    disabled={!startDate || !endDate}
                    onClick={handleExport}
                    style={toolbarButtonStyle(isMobile)}>
                    Excel
                  </Button>
                )}
                <Button
                  type="primary"
                  icon={<Plus size={16} />}
                  onClick={() => setFormState({ open: true, record: null })}
                  style={toolbarButtonStyle(isMobile)}>
                  Tambah
                </Button>
              </>
            }
          />

          <FilterBar isMobile={isMobile}>
            <RangePicker
              value={range}
              onChange={setRange}
              allowClear={false}
              format={isMobile ? 'DD/MM/YY' : 'YYYY-MM-DD'}
              placeholder={['Tanggal awal', 'Tanggal akhir']}
              inputReadOnly={isMobile}
              style={filterControlStyle(isCompact, 260)}
            />
            <Input
              allowClear
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="Cari nama atau NIS"
              prefix={<Search size={16} />}
              style={filterControlStyle(isMobile, 180)}
            />
            <Select
              virtual={false}
              allowClear
              popupMatchSelectWidth={false}
              value={status}
              onChange={setStatus}
              placeholder="Filter status"
              options={CLASS_STATUS_OPTIONS}
              style={filterControlStyle(isMobile, 180)}
            />
          </FilterBar>
        </Flex>
      </Card>

      <StatCardGrid items={statItems} isMobile={isMobile} />

      <Card variant="borderless" style={surfaceCardStyle} styles={surfaceCardBodyStyles(isMobile)}>
        <CardGridView
          loading={isFetching}
          dataSource={rows}
          emptyText="Belum ada data presensi pada rentang ini."
          pagination={buildPagination({ pageSize, setPageSize, isMobile, unit: 'catatan' })}
          renderCard={(row) => {
            const actions = buildRowActions(row);
            return (
              <ReportRecordCard
                title={row.full_name}
                subtitle={`NIS ${row.nis || '-'} · ${formatDateCell(row.attendance_date, isMobile)}`}
                extra={
                  <Tag
                    color={CLASS_STATUS_META[row.attendance_status]?.color || 'default'}
                    style={{ margin: 0 }}>
                    {statusLabel(row.attendance_status)}
                  </Tag>
                }
                actions={
                  actions.length > 0 ? (
                    <RowActionMenu
                      actions={actions}
                      onSelect={(key) => handleRowAction(key, row)}
                    />
                  ) : null
                }>
                <ReportMetricGrid
                  items={[
                    { key: 'checkin', label: 'Datang', value: timeOnly(row.checkin_at) || '-' },
                    { key: 'checkout', label: 'Pulang', value: timeOnly(row.checkout_at) || '-' },
                    row.notes ? { key: 'notes', label: 'Catatan', value: row.notes } : null,
                  ]}
                />
              </ReportRecordCard>
            );
          }}
        />
      </Card>

      <RecordFormModal
        open={formState.open}
        record={formState.record}
        students={formStudents}
        onClose={() => setFormState({ open: false, record: null })}
        isMobile={isMobile}
      />

      {access.can_assign && assignOpen && (
        <OfficerAssignmentModal
          onClose={() => setAssignOpen(false)}
          className={classInfo.name}
          students={students}
          isMobile={isMobile}
        />
      )}
    </Flex>
  );
};

export default ClassAttendance;
