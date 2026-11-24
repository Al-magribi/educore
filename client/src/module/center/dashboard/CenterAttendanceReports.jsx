import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Alert,
  Button,
  Col,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Select,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
} from 'antd';
import {
  BookOpenCheck,
  CalendarRange,
  Info,
  RefreshCw,
  School,
  Search,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { CardTitle, MuseCard, StatCard } from '../../../components/ui/muse';
import { museColors } from '../../../config/theme';
import {
  useGetCenterStudentAttendanceReportQuery,
  useGetCenterTeacherAttendanceReportQuery,
} from '../../../service/center/ApiCenterAttendance';

const { RangePicker } = DatePicker;
const { Text } = Typography;
const { useBreakpoint } = Grid;

const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

const STATUS_COLORS = {
  present: 'green',
  late: 'gold',
  absent: 'red',
  excused: 'blue',
  incomplete: 'orange',
  pending: 'default',
  not_scheduled: 'purple',
};

const STATUS_LABELS = {
  present: 'Hadir',
  late: 'Telat',
  absent: 'Absen',
  excused: 'Sakit/Izin',
  incomplete: 'Incomplete',
  pending: 'Belum tap',
  not_scheduled: 'Libur',
};

const STUDENT_STATUS_OPTIONS = [
  { value: 'present', label: 'Present (Hadir)' },
  { value: 'late', label: 'Late (Telat)' },
  { value: 'absent', label: 'Absent (Absen)' },
  { value: 'excused', label: 'Excused (Sakit/Izin)' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'pending', label: 'Pending (Belum tap)' },
  { value: 'not_scheduled', label: 'Libur' },
];

const TEACHER_STATUS_OPTIONS = [
  { value: 'present', label: 'Present (Hadir)' },
  { value: 'late', label: 'Late (Telat)' },
  { value: 'absent', label: 'Absent (Absen)' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'pending', label: 'Pending (Belum tap)' },
  { value: 'not_scheduled', label: 'Libur' },
];

const OffDayNotice = ({ count, subject }) => {
  const n = Number(count || 0);
  if (n <= 0) return null;
  return (
    <Alert
      type="info"
      showIcon
      title={`${n} ${subject} tidak dihitung belum tap karena libur akhir pekan atau hari libur.`}
    />
  );
};

const formatDateTimeCell = (value, compact = false) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  if (!parsed.isValid()) return value;
  return compact ? parsed.format('DD/MM HH:mm') : parsed.format('DD MMM YY HH:mm');
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

const sortByLatestTap = (rows) =>
  [...(rows || [])].sort((a, b) => {
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

const useResponsiveFlags = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.lg;
  return { screens, isMobile, isCompact };
};

const PanelHeader = ({ title, description, filter, isMobile }) => (
  <Flex
    justify="space-between"
    align={isMobile ? 'stretch' : 'flex-start'}
    vertical={isMobile}
    gap={12}
    style={{ width: '100%', minWidth: 0 }}>
    <Flex align="center" gap={6} style={{ minWidth: 0, flex: 1 }}>
      <Text strong style={{ color: museColors.text, fontSize: isMobile ? 14 : 16 }}>
        {title}
      </Text>
      <Tooltip title={description} placement="right">
        <Info size={14} aria-label="Keterangan" style={{ color: museColors.muted, cursor: 'default', flexShrink: 0 }} />
      </Tooltip>
    </Flex>
    {filter}
  </Flex>
);

const FilterBar = ({
  range,
  onRangeChange,
  userName,
  onUserNameChange,
  searchPlaceholder,
  onRefresh,
  isMobile,
  isCompact,
}) => (
  <Flex
    gap={10}
    wrap="wrap"
    vertical={isMobile}
    align={isMobile ? 'stretch' : 'center'}
    style={{ width: '100%', minWidth: 0 }}>
    <RangePicker
      value={range}
      onChange={(value) => onRangeChange(value || [dayjs(), dayjs()])}
      format={isMobile ? 'DD/MM/YY' : 'YYYY-MM-DD'}
      allowEmpty={[false, false]}
      inputReadOnly={isMobile}
      style={{
        width: isCompact ? '100%' : 280,
        maxWidth: '100%',
      }}
    />
    <Input
      allowClear
      value={userName}
      onChange={(event) => onUserNameChange(event.target.value)}
      placeholder={searchPlaceholder}
      prefix={<Search size={14} />}
      style={{
        width: isCompact ? '100%' : 220,
        maxWidth: '100%',
        flex: isCompact ? undefined : '1 1 180px',
      }}
    />
    <Button
      onClick={onRefresh}
      icon={<RefreshCw size={14} />}
      style={{ alignSelf: isMobile ? 'stretch' : 'center' }}>
      Muat ulang
    </Button>
  </Flex>
);

const SummaryStatCard = ({ item, suffix }) => (
  <StatCard
    compact
    title={item.title}
    value={item.value}
    suffix={suffix}
    icon={item.icon}
    tone={item.tone}
  />
);

const buildPagination = (pageSize, setPageSize, isMobile) => ({
  pageSize,
  showSizeChanger: !isMobile,
  pageSizeOptions: PAGE_SIZE_OPTIONS,
  showTotal: isMobile
    ? undefined
    : (total, rangeValues) => `${rangeValues[0]}-${rangeValues[1]} dari ${total} catatan`,
  simple: isMobile,
  size: isMobile ? 'small' : 'default',
  onChange: (_page, size) => setPageSize(size),
});

const StudentAttendancePanel = ({ homebaseId, periodeId, pollingInterval = 0 }) => {
  const { isMobile, isCompact } = useResponsiveFlags();
  const [range, setRange] = useState([dayjs(), dayjs()]);
  const [status, setStatus] = useState();
  const [userName, setUserName] = useState('');
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isFetching, refetch } = useGetCenterStudentAttendanceReportQuery(
    {
      startDate: range?.[0]?.format('YYYY-MM-DD'),
      endDate: range?.[1]?.format('YYYY-MM-DD'),
      status,
      userName: userName.trim() || undefined,
      homebaseId,
      periodeId,
    },
    {
      skip: !homebaseId,
      pollingInterval: pollingInterval || 0,
    },
  );

  const summary = data?.data?.summary || {};
  const rows = useMemo(() => sortByLatestTap(data?.data?.rows), [data?.data?.rows]);

  const statItems = [
    {
      key: 'present',
      title: 'Hadir/Telat',
      value:
        Number(summary.present_count || 0) +
        Number(summary.late_count || 0) +
        Number(summary.incomplete_count || 0),
      icon: <CalendarRange size={18} />,
      tone: 'success',
    },
    {
      key: 'pending',
      title: 'Belum tap',
      value: Number(summary.pending_count || 0),
      icon: <Users size={18} />,
      tone: 'warning',
    },
    {
      key: 'excused',
      title: 'Sakit/Izin',
      value: Number(summary.excused_count || 0),
      icon: <BookOpenCheck size={18} />,
      tone: 'primary',
    },
    {
      key: 'absent',
      title: 'Absen',
      value: Number(summary.absent_count || 0),
      icon: <School size={18} />,
      tone: 'danger',
    },
  ];

  const columns = [
    {
      title: 'Siswa',
      ellipsis: true,
      fixed: isMobile ? 'left' : undefined,
      width: isMobile ? 150 : 220,
      render: (_, row) => (
        <Flex vertical gap={2} style={{ minWidth: 0, maxWidth: '100%' }}>
          <Text strong ellipsis style={{ maxWidth: '100%' }}>
            {row.full_name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
            {isMobile
              ? `${row.class_name || '-'} · ${row.nis || '-'}`
              : `NIS ${row.nis || '-'} · ${row.grade_name || '-'} / ${row.class_name || '-'}`}
          </Text>
        </Flex>
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'attendance_date',
      width: isMobile ? 96 : 120,
      render: (value) =>
        value && dayjs(value).isValid()
          ? dayjs(value).format(isMobile ? 'DD/MM/YY' : 'YYYY-MM-DD')
          : value || '-',
    },
    {
      title: 'Status',
      dataIndex: 'attendance_status',
      width: isMobile ? 96 : 110,
      render: (value) => (
        <Tag color={STATUS_COLORS[value] || 'default'} style={{ margin: 0, maxWidth: '100%' }}>
          {STATUS_LABELS[value] || value}
        </Tag>
      ),
    },
    {
      title: 'Datang',
      dataIndex: 'checkin_at',
      width: isMobile ? 108 : 140,
      render: (value) => formatDateTimeCell(value, isMobile),
    },
    {
      title: 'Pulang',
      dataIndex: 'checkout_at',
      width: isMobile ? 108 : 140,
      render: (value) => formatDateTimeCell(value, isMobile),
    },
  ];

  return (
    <Flex vertical gap={isMobile ? 12 : 16} style={{ width: '100%', minWidth: 0 }}>
      <PanelHeader
        title="Laporan Presensi Siswa"
        description="Rekap seluruh siswa aktif pada satuan & periode. Hadir hanya dari tap gerbang; yang belum tap tetap dihitung."
        isMobile={isMobile}
        filter={
          <Select
            allowClear
            placeholder="Filter status"
            value={status}
            onChange={setStatus}
            options={STUDENT_STATUS_OPTIONS}
            style={{ width: isMobile ? '100%' : 180, maxWidth: '100%', flexShrink: 0 }}
            popupMatchSelectWidth={false}
          />
        }
      />

      <FilterBar
        range={range}
        onRangeChange={setRange}
        userName={userName}
        onUserNameChange={setUserName}
        searchPlaceholder="Cari nama siswa"
        onRefresh={() => refetch()}
        isMobile={isMobile}
        isCompact={isCompact}
      />

      <Row gutter={[isMobile ? 8 : 12, isMobile ? 8 : 12]} style={{ margin: 0 }}>
        {statItems.map((item) => (
          <Col key={item.key} xs={12} sm={12} md={6} style={{ minWidth: 0 }}>
            <SummaryStatCard item={item} />
          </Col>
        ))}
      </Row>

      <OffDayNotice count={summary.not_scheduled_count} subject="siswa" />

      {rows.length === 0 && !isLoading && !isFetching ? (
        <Empty
          description={
            Number(summary.not_scheduled_count || 0) > 0
              ? 'Libur sesuai konfigurasi akhir pekan / hari libur. Tidak ada yang wajib tap.'
              : 'Tidak ada siswa pada satuan & periode terpilih.'
          }
        />
      ) : (
        <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
          <Table
            rowKey="id"
            size="small"
            loading={isLoading || (isFetching && rows.length > 0)}
            dataSource={rows}
            columns={columns}
            scroll={{ x: isMobile ? 660 : 720 }}
            pagination={buildPagination(pageSize, setPageSize, isMobile)}
          />
        </div>
      )}
    </Flex>
  );
};

const TeacherAttendancePanel = ({ homebaseId, periodeId, pollingInterval = 0 }) => {
  const { isMobile, isCompact } = useResponsiveFlags();
  const [range, setRange] = useState([dayjs(), dayjs()]);
  const [status, setStatus] = useState();
  const [userName, setUserName] = useState('');
  const [pageSize, setPageSize] = useState(10);

  const { data, isLoading, isFetching, refetch } = useGetCenterTeacherAttendanceReportQuery(
    {
      startDate: range?.[0]?.format('YYYY-MM-DD'),
      endDate: range?.[1]?.format('YYYY-MM-DD'),
      status,
      userName: userName.trim() || undefined,
      homebaseId,
      periodeId,
    },
    {
      skip: !homebaseId,
      pollingInterval: pollingInterval || 0,
    },
  );

  const summary = data?.data?.summary || {};
  const rows = useMemo(() => sortByLatestTap(data?.data?.rows), [data?.data?.rows]);

  const statItems = [
    {
      key: 'hadir',
      title: 'Hadir',
      value: Number(summary.present_teachers || 0),
      icon: <UserCheck size={18} />,
      tone: 'success',
    },
    {
      key: 'absent',
      title: 'Belum hadir',
      value: Number(summary.absent_teachers || 0),
      icon: <UserX size={18} />,
      tone: 'danger',
    },
  ];

  const columns = [
    {
      title: 'Guru',
      ellipsis: true,
      fixed: isMobile ? 'left' : undefined,
      width: isMobile ? 150 : 220,
      render: (_, row) => (
        <Flex vertical gap={2} style={{ minWidth: 0, maxWidth: '100%' }}>
          <Text strong ellipsis style={{ maxWidth: '100%' }}>
            {row.full_name}
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
            {isMobile
              ? `NIP ${row.nip || '-'}`
              : `RFID ${row.card_uid || '-'} · NIP ${row.nip || '-'}`}
          </Text>
        </Flex>
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'attendance_date',
      width: isMobile ? 96 : 120,
      render: (value) =>
        value && dayjs(value).isValid()
          ? dayjs(value).format(isMobile ? 'DD/MM/YY' : 'YYYY-MM-DD')
          : value || '-',
    },
    {
      title: 'Status',
      dataIndex: 'attendance_status',
      width: isMobile ? 96 : 110,
      render: (value) => (
        <Tag color={STATUS_COLORS[value] || 'default'} style={{ margin: 0, maxWidth: '100%' }}>
          {STATUS_LABELS[value] || value}
        </Tag>
      ),
    },
    {
      title: 'Datang',
      dataIndex: 'checkin_at',
      width: isMobile ? 108 : 140,
      render: (value) => formatDateTimeCell(value, isMobile),
    },
    {
      title: 'Pulang',
      dataIndex: 'checkout_at',
      width: isMobile ? 108 : 140,
      render: (value) => formatDateTimeCell(value, isMobile),
    },
  ];

  return (
    <Flex vertical gap={isMobile ? 12 : 16} style={{ width: '100%', minWidth: 0 }}>
      <PanelHeader
        title="Laporan Presensi Guru"
        description="Rekap seluruh guru aktif pada satuan. Hadir hanya dari tap gerbang; yang belum tap tetap dihitung."
        isMobile={isMobile}
        filter={
          <Select
            allowClear
            placeholder="Filter status"
            value={status}
            onChange={setStatus}
            options={TEACHER_STATUS_OPTIONS}
            style={{ width: isMobile ? '100%' : 180, maxWidth: '100%', flexShrink: 0 }}
            popupMatchSelectWidth={false}
          />
        }
      />

      <FilterBar
        range={range}
        onRangeChange={setRange}
        userName={userName}
        onUserNameChange={setUserName}
        searchPlaceholder="Cari nama guru"
        onRefresh={() => refetch()}
        isMobile={isMobile}
        isCompact={isCompact}
      />

      <Row gutter={[isMobile ? 8 : 12, isMobile ? 8 : 12]}>
        {statItems.map((item) => (
          <Col key={item.key} xs={12} sm={12} md={12} style={{ minWidth: 0 }}>
            <SummaryStatCard item={item} suffix="guru" />
          </Col>
        ))}
      </Row>

      <OffDayNotice count={summary.not_scheduled_count} subject="guru" />

      {rows.length === 0 && !isLoading && !isFetching ? (
        <Empty
          description={
            Number(summary.not_scheduled_count || 0) > 0
              ? 'Libur sesuai konfigurasi akhir pekan / hari libur. Tidak ada yang wajib tap.'
              : 'Tidak ada guru pada satuan terpilih.'
          }
        />
      ) : (
        <div style={{ width: '100%', minWidth: 0, overflow: 'hidden' }}>
          <Table
            rowKey="id"
            size="small"
            loading={isLoading || (isFetching && rows.length > 0)}
            dataSource={rows}
            columns={columns}
            scroll={{ x: isMobile ? 660 : 720 }}
            pagination={buildPagination(pageSize, setPageSize, isMobile)}
          />
        </div>
      )}
    </Flex>
  );
};

const CenterAttendanceReports = ({
  homebaseId,
  periodeId,
  pollingInterval = 300_000,
  autoRefreshMs,
  onAutoRefreshChange,
}) => {
  const { isMobile, isCompact } = useResponsiveFlags();
  const reportKey = `${homebaseId || 'none'}-${periodeId || 'all'}-${autoRefreshMs}`;

  return (
    <MuseCard
      styles={{
        header: { padding: isMobile ? '12px 16px' : '16px 24px' },
        body: { padding: isMobile ? 16 : 24, paddingTop: 0 },
      }}
      title={
        <Flex
          justify="space-between"
          align={isCompact ? 'stretch' : 'center'}
          vertical={isCompact}
          gap={12}
          style={{ width: '100%', minWidth: 0 }}>
          <CardTitle
            icon={<CalendarRange size={16} />}
            title="Laporan Presensi"
            description={
              isMobile
                ? 'Presensi harian seluruh siswa & guru.'
                : 'Presensi harian seluruh siswa & guru aktif (tap gerbang RFID).'
            }
          />
          <Flex
            align="center"
            gap={8}
            style={{ width: isCompact ? '100%' : 'auto', flexShrink: 0 }}>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
              Update otomatis
            </Text>
            <Select
              aria-label="Interval update otomatis"
              value={autoRefreshMs}
              onChange={onAutoRefreshChange}
              options={[
                { value: 0, label: 'Off' },
                { value: 60_000, label: '1 menit' },
                { value: 300_000, label: '5 menit' },
              ]}
              style={{ width: isCompact ? '100%' : 120 }}
            />
          </Flex>
        </Flex>
      }>
      {!homebaseId ? (
        <Empty description="Pilih satuan terlebih dahulu untuk melihat laporan presensi." />
      ) : (
        <Tabs
          key={reportKey}
          defaultActiveKey="students"
          size={isMobile ? 'small' : 'middle'}
          tabBarGutter={isMobile ? 12 : 24}
          style={{ width: '100%', minWidth: 0 }}
          items={[
            {
              key: 'students',
              label: isMobile ? 'Siswa' : 'Presensi Siswa',
              children: (
                <StudentAttendancePanel
                  homebaseId={homebaseId}
                  periodeId={periodeId}
                  pollingInterval={pollingInterval}
                />
              ),
            },
            {
              key: 'teachers',
              label: isMobile ? 'Guru' : 'Presensi Guru',
              children: (
                <TeacherAttendancePanel
                  homebaseId={homebaseId}
                  periodeId={periodeId}
                  pollingInterval={pollingInterval}
                />
              ),
            },
          ]}
        />
      )}
    </MuseCard>
  );
};

export default CenterAttendanceReports;
