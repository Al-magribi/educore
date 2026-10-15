import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { Button, Card, DatePicker, Flex, Input, Modal, Select, Tag } from 'antd';
import { AlertTriangle, CalendarRange, Clock3, RefreshCw, Search, UsersRound } from 'lucide-react';
import { useGetStaffAttendanceReportQuery } from '../../../../service/lms/ApiAttendance';
import {
  DETAIL_ACTIONS,
  FilterBar,
  ReportHeader,
  RowActionMenu,
  StatCardGrid,
  StatusTag,
  buildPagination,
  filterControlStyle,
  formatDateCell,
  formatDateTimeCell,
  formatDateTimeDetail,
  formatDetailValue,
  formatMinutesToHours,
  modalWidth,
  sortByLatestTap,
  surfaceCardBodyStyles,
  surfaceCardStyle,
  toolbarButtonStyle,
  useResponsiveFlags,
} from './reportShared';
import { CardGridView, ReportDetailGrid, ReportMetricGrid, ReportRecordCard } from './reportMobile';

const { RangePicker } = DatePicker;

const STATUS_COLORS = {
  present: 'green',
  late: 'gold',
  absent: 'red',
  excused: 'blue',
  incomplete: 'orange',
  insufficient_hours: 'volcano',
  pending: 'default',
};

const STAFF_STATUS_OPTIONS = [
  { value: 'present', label: 'Present (Hadir)' },
  { value: 'late', label: 'Late (Telat)' },
  { value: 'absent', label: 'Absent (Absen)' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'insufficient_hours', label: 'Jam kurang' },
];

const VIEW_ACTIONS = DETAIL_ACTIONS.filter((item) => item.key === 'detail');

const StaffReport = ({ homebaseId, periodeId, pollingInterval = 0 } = {}) => {
  const { isMobile, isCompact } = useResponsiveFlags();
  const [range, setRange] = useState([dayjs().startOf('day'), dayjs().endOf('day')]);
  const [status, setStatus] = useState();
  const [userName, setUserName] = useState('');
  const [detailRow, setDetailRow] = useState(null);
  const [pageSize, setPageSize] = useState(12);

  const { data, isLoading, isFetching, refetch } = useGetStaffAttendanceReportQuery(
    {
      startDate: range?.[0]?.format('YYYY-MM-DD'),
      endDate: range?.[1]?.format('YYYY-MM-DD'),
      status,
      userName: userName.trim() || undefined,
      homebaseId,
      periodeId,
    },
    { pollingInterval: pollingInterval || 0 },
  );

  const summary = data?.data?.summary || {};
  const rows = useMemo(() => sortByLatestTap(data?.data?.rows), [data?.data?.rows]);

  const statItems = [
    {
      key: 'staff',
      title: 'Tendik tercatat',
      value: Number(summary.total_staff || 0),
      icon: <UsersRound size={isMobile ? 14 : 18} />,
      color: '#0f766e',
      bg: '#f0fdfa',
    },
    {
      key: 'present',
      title: 'Hadir',
      value: Number(summary.present_count || 0),
      icon: <CalendarRange size={isMobile ? 14 : 18} />,
      color: '#166534',
      bg: '#f0fdf4',
    },
    {
      key: 'late',
      title: 'Telat',
      value: Number(summary.late_count || 0),
      icon: <Clock3 size={isMobile ? 14 : 18} />,
      color: '#a16207',
      bg: '#fefce8',
    },
    {
      key: 'follow-up',
      title: 'Belum lengkap',
      value: Number(summary.incomplete_count || 0) + Number(summary.insufficient_hours_count || 0),
      icon: <AlertTriangle size={isMobile ? 14 : 18} />,
      color: '#b91c1c',
      bg: '#fef2f2',
    },
  ];

  return (
    <Flex vertical gap={isMobile ? 12 : 18} style={{ width: '100%', minWidth: 0 }}>
      <Card variant="borderless" style={surfaceCardStyle} styles={surfaceCardBodyStyles(isMobile)}>
        <Flex vertical gap={16} style={{ minWidth: 0 }}>
          <ReportHeader
            title="Laporan Presensi Tendik"
            description="Kehadiran harian tenaga kependidikan dari tap kartu di device gerbang."
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
              placeholder="Cari nama tendik"
              prefix={<Search size={16} />}
              style={filterControlStyle(isMobile, 180)}
            />
            <Select
              allowClear
              virtual={false}
              popupMatchSelectWidth={false}
              value={status}
              onChange={setStatus}
              placeholder="Filter status"
              options={STAFF_STATUS_OPTIONS}
              style={filterControlStyle(isMobile, 180)}
            />
          </FilterBar>
        </Flex>
      </Card>

      <StatCardGrid items={statItems} isMobile={isMobile} />

      <Card variant="borderless" style={surfaceCardStyle} styles={surfaceCardBodyStyles(isMobile)}>
        <CardGridView
          loading={isLoading || (isFetching && rows.length > 0)}
          dataSource={rows}
          emptyText="Belum ada data presensi tendik pada rentang ini."
          pagination={buildPagination({ pageSize, setPageSize, isMobile, unit: 'catatan' })}
          renderCard={(row) => (
            <ReportRecordCard
              title={row.full_name}
              subtitle={`NIP ${row.nip || '-'}`}
              extra={<StatusTag value={row.attendance_status} colorMap={STATUS_COLORS} />}
              actions={<RowActionMenu actions={VIEW_ACTIONS} onSelect={() => setDetailRow(row)} />}>
              <ReportMetricGrid
                items={[
                  { key: 'date', label: 'Tanggal', value: formatDateCell(row.attendance_date, true) },
                  { key: 'policy', label: 'Policy', value: row.policy_name || '-' },
                  { key: 'checkin', label: 'Datang', value: formatDateTimeCell(row.checkin_at, true) },
                  { key: 'checkout', label: 'Pulang', value: formatDateTimeCell(row.checkout_at, true) },
                ]}
              />
            </ReportRecordCard>
          )}
        />
      </Card>

      <Modal
        title="Detail Presensi Tendik"
        centered
        open={!!detailRow}
        onCancel={() => setDetailRow(null)}
        footer={null}
        width={modalWidth(isMobile)}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
        {detailRow && (
          <ReportDetailGrid
            items={[
              { key: 'name', label: 'Nama Tendik', children: formatDetailValue(detailRow.full_name) },
              {
                key: 'status',
                label: 'Status',
                children: (
                  <Tag color={STATUS_COLORS[detailRow.attendance_status] || 'default'} style={{ margin: 0 }}>
                    {detailRow.attendance_status}
                  </Tag>
                ),
              },
              { key: 'nip', label: 'NIP', children: formatDetailValue(detailRow.nip) },
              { key: 'date', label: 'Tanggal', children: formatDetailValue(detailRow.attendance_date) },
              { key: 'checkin', label: 'Datang', children: formatDateTimeDetail(detailRow.checkin_at) },
              { key: 'checkout', label: 'Pulang', children: formatDateTimeDetail(detailRow.checkout_at) },
              { key: 'late', label: 'Terlambat (menit)', children: formatDetailValue(detailRow.late_minutes) },
              {
                key: 'presence',
                label: 'Durasi Hadir',
                children: detailRow.presence_minutes == null ? '-' : formatMinutesToHours(detailRow.presence_minutes),
              },
              { key: 'policy', label: 'Policy', span: 2, children: formatDetailValue(detailRow.policy_name) },
              { key: 'notes', label: 'Catatan', span: 2, children: formatDetailValue(detailRow.notes) },
            ]}
          />
        )}
      </Modal>
    </Flex>
  );
};

export default StaffReport;
