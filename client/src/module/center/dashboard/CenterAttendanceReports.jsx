import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Card,
  Col,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Input,
  Row,
  Select,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  BookOpenCheck,
  CalendarRange,
  RefreshCw,
  School,
  Search,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
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
};

const STUDENT_STATUS_OPTIONS = [
  { value: 'present', label: 'Present (Hadir)' },
  { value: 'late', label: 'Late (Telat)' },
  { value: 'absent', label: 'Absent (Absen)' },
  { value: 'excused', label: 'Excused (Sakit/Izin)' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'pending', label: 'Pending (Belum tap)' },
];

const TEACHER_STATUS_OPTIONS = [
  { value: 'present', label: 'Present (Hadir)' },
  { value: 'late', label: 'Late (Telat)' },
  { value: 'absent', label: 'Absent (Absen)' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'pending', label: 'Pending (Belum tap)' },
];

const surfaceCardStyle = {
  borderRadius: 24,
  border: '1px solid rgba(148, 163, 184, 0.16)',
  boxShadow: '0 16px 34px rgba(15, 23, 42, 0.06)',
};

const statCardStyle = {
  borderRadius: 18,
  border: '1px solid #e2ebf5',
  background: '#ffffff',
  height: '100%',
};

const formatDateTimeCell = (value) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YY HH:mm') : value;
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

const StudentAttendancePanel = ({ homebaseId, periodeId, pollingInterval = 0 }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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
    <Flex vertical gap={16}>
      <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
        <div>
          <Text strong style={{ color: '#0f172a', fontSize: 15 }}>
            Laporan Presensi Siswa
          </Text>
          <div>
            <Text type="secondary">Rekap kehadiran harian siswa berdasarkan data daily_attendance.</Text>
          </div>
        </div>
        <Select
          allowClear
          placeholder="Filter status"
          value={status}
          onChange={setStatus}
          options={STUDENT_STATUS_OPTIONS}
          style={{ minWidth: isMobile ? '100%' : 180 }}
        />
      </Flex>

      <Flex gap={12} wrap="wrap" vertical={isMobile}>
        <RangePicker value={range} onChange={(value) => setRange(value || [dayjs(), dayjs()])} format="YYYY-MM-DD" />
        <Input
          allowClear
          value={userName}
          onChange={(event) => setUserName(event.target.value)}
          placeholder="Cari nama siswa"
          prefix={<Search size={14} />}
          style={{ minWidth: isMobile ? '100%' : 220 }}
        />
        <a onClick={() => refetch()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} />
          Refresh
        </a>
      </Flex>

      <Row gutter={[12, 12]}>
        {statItems.map((item) => (
          <Col key={item.key} xs={12} md={6}>
            <Card style={statCardStyle} styles={{ body: { padding: 14 } }}>
              <Flex justify="space-between" align="center" gap={10}>
                <Statistic title={item.title} value={item.value} />
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    background: item.bg,
                    color: item.color,
                  }}>
                  {item.icon}
                </div>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      {rows.length === 0 && !isLoading && !isFetching ? (
        <Empty description="Belum ada data presensi siswa pada rentang ini." />
      ) : (
        <Table
          rowKey="id"
          size="small"
          loading={isLoading || (isFetching && rows.length > 0)}
          dataSource={rows}
          tableLayout="fixed"
          pagination={{
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (total, rangeValues) => `${rangeValues[0]}-${rangeValues[1]} dari ${total} catatan`,
            onChange: (_page, size) => setPageSize(size),
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
                    NIS {row.nis || '-'} · {row.grade_name || '-'} / {row.class_name || '-'}
                  </Text>
                </Flex>
              ),
            },
            {
              title: 'Tanggal',
              dataIndex: 'attendance_date',
              width: 120,
            },
            {
              title: 'Status',
              dataIndex: 'attendance_status',
              width: 110,
              render: (value) => <Tag color={STATUS_COLORS[value] || 'default'}>{value}</Tag>,
            },
            {
              title: 'Datang',
              dataIndex: 'checkin_at',
              width: 140,
              render: (value) => formatDateTimeCell(value),
            },
            {
              title: 'Pulang',
              dataIndex: 'checkout_at',
              width: 140,
              render: (value) => formatDateTimeCell(value),
            },
          ]}
        />
      )}
    </Flex>
  );
};

const TeacherAttendancePanel = ({ homebaseId, periodeId, pollingInterval = 0 }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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
      color: '#15803d',
      bg: '#f0fdf4',
    },
    {
      key: 'absent',
      title: 'Absent',
      value: Number(summary.absent_teachers || 0),
      icon: <UserX size={18} />,
      color: '#b91c1c',
      bg: '#fef2f2',
    },
  ];

  return (
    <Flex vertical gap={16}>
      <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
        <div>
          <Text strong style={{ color: '#0f172a', fontSize: 15 }}>
            Laporan Presensi Guru
          </Text>
          <div>
            <Text type="secondary">Rekap kehadiran harian guru berdasarkan data daily_attendance.</Text>
          </div>
        </div>
        <Select
          allowClear
          placeholder="Filter status"
          value={status}
          onChange={setStatus}
          options={TEACHER_STATUS_OPTIONS}
          style={{ minWidth: isMobile ? '100%' : 180 }}
        />
      </Flex>

      <Flex gap={12} wrap="wrap" vertical={isMobile}>
        <RangePicker value={range} onChange={(value) => setRange(value || [dayjs(), dayjs()])} format="YYYY-MM-DD" />
        <Input
          allowClear
          value={userName}
          onChange={(event) => setUserName(event.target.value)}
          placeholder="Cari nama guru"
          prefix={<Search size={14} />}
          style={{ minWidth: isMobile ? '100%' : 220 }}
        />
        <a onClick={() => refetch()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={14} />
          Refresh
        </a>
      </Flex>

      <Row gutter={[12, 12]}>
        {statItems.map((item) => (
          <Col key={item.key} xs={12} md={12}>
            <Card style={statCardStyle} styles={{ body: { padding: 14 } }}>
              <Flex justify="space-between" align="center" gap={10}>
                <Statistic title={item.title} value={item.value} suffix="guru" />
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 12,
                    display: 'grid',
                    placeItems: 'center',
                    background: item.bg,
                    color: item.color,
                  }}>
                  {item.icon}
                </div>
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      {rows.length === 0 && !isLoading && !isFetching ? (
        <Empty description="Belum ada data presensi guru pada rentang ini." />
      ) : (
        <Table
          rowKey="id"
          size="small"
          loading={isLoading || (isFetching && rows.length > 0)}
          dataSource={rows}
          tableLayout="fixed"
          pagination={{
            pageSize,
            showSizeChanger: true,
            pageSizeOptions: PAGE_SIZE_OPTIONS,
            showTotal: (total, rangeValues) => `${rangeValues[0]}-${rangeValues[1]} dari ${total} catatan`,
            onChange: (_page, size) => setPageSize(size),
          }}
          columns={[
            {
              title: 'Guru',
              ellipsis: true,
              render: (_, row) => (
                <Flex vertical gap={2}>
                  <Text strong ellipsis>
                    {row.full_name}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                    RFID {row.card_uid || '-'} · NIP {row.nip || '-'}
                  </Text>
                </Flex>
              ),
            },
            {
              title: 'Tanggal',
              dataIndex: 'attendance_date',
              width: 120,
            },
            {
              title: 'Status',
              dataIndex: 'attendance_status',
              width: 110,
              render: (value) => <Tag color={STATUS_COLORS[value] || 'default'}>{value}</Tag>,
            },
            {
              title: 'Datang',
              dataIndex: 'checkin_at',
              width: 140,
              render: (value) => formatDateTimeCell(value),
            },
            {
              title: 'Pulang',
              dataIndex: 'checkout_at',
              width: 140,
              render: (value) => formatDateTimeCell(value),
            },
          ]}
        />
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
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const reportKey = `${homebaseId || 'none'}-${periodeId || 'all'}-${autoRefreshMs}`;

  return (
    <Card
      variant="borderless"
      style={surfaceCardStyle}
      styles={{ body: { padding: isMobile ? 16 : 20 } }}
      title={
        <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
          <div>
            <Text strong style={{ fontSize: 16 }}>
              Laporan Presensi
            </Text>
            <div>
              <Text type="secondary">Presensi harian siswa & guru (RFID / daily_attendance).</Text>
            </div>
          </div>
          <Flex vertical gap={4} style={{ minWidth: isMobile ? '100%' : 160 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              Update otomatis
            </Text>
            <Select
              value={autoRefreshMs}
              onChange={onAutoRefreshChange}
              options={[
                { value: 0, label: 'Off' },
                { value: 60_000, label: '1 menit' },
                { value: 300_000, label: '5 menit' },
              ]}
              style={{ width: '100%' }}
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
          items={[
            {
              key: 'students',
              label: 'Presensi Siswa',
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
              label: 'Presensi Guru',
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
    </Card>
  );
};

export default CenterAttendanceReports;
