import React, { useMemo, useState } from 'react';
import { useGetDashboardSummaryQuery } from '../../../service/center/ApiCenterDash';
import { Alert, Col, Flex, Grid, List, Row, Select, Skeleton, Table, Tag, Typography } from 'antd';
import {
  BookOpenCheck,
  Building2,
  CalendarDays,
  GraduationCap,
  History,
  LayoutGrid,
  RefreshCw,
  UserCheck,
  UsersRound,
} from 'lucide-react';
import { CardTitle, MuseCard, PageTabs, StatCard } from '../../../components/ui/muse';
import { museColors } from '../../../config/theme';
import CenterAttendanceReports from './CenterAttendanceReports';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const DEFAULT_AUTO_REFRESH_MS = 300_000;

const AUTO_REFRESH_OPTIONS = [
  { value: 0, label: 'Update otomatis: Off' },
  { value: 60_000, label: 'Update otomatis: 1 menit' },
  { value: 300_000, label: 'Update otomatis: 5 menit' },
];

const formatDateTime = (value, short = false) =>
  value
    ? new Date(value).toLocaleString('id-ID', {
        day: '2-digit',
        month: 'short',
        year: short ? '2-digit' : 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '-';

const logColumns = [
  {
    title: 'WAKTU',
    dataIndex: 'created_at',
    key: 'created_at',
    width: 180,
    render: (value) => formatDateTime(value),
  },
  {
    title: 'USER',
    dataIndex: 'full_name',
    key: 'full_name',
    ellipsis: true,
    render: (text) => <Text strong>{text}</Text>,
  },
  {
    title: 'AKTIVITAS',
    dataIndex: 'action',
    key: 'action',
    width: 180,
    render: (text) => (
      <Tag color="blue" style={{ margin: 0 }}>
        {text}
      </Tag>
    ),
  },
];

const ActivityLogCard = ({ logs, isMobile }) => (
  <MuseCard
    flush
    title={
      <CardTitle
        icon={<History size={16} />}
        title="Aktivitas Sistem Terakhir"
        description="Log login dan perubahan data terbaru."
      />
    }>
    {isMobile ? (
      <List
        dataSource={logs}
        locale={{ emptyText: 'Belum ada aktivitas sistem terbaru.' }}
        renderItem={(item) => (
          <List.Item style={{ padding: '12px 16px' }}>
            <Flex vertical gap={4} style={{ width: '100%', minWidth: 0 }}>
              <Flex align="center" justify="space-between" gap={8} wrap>
                <Text strong ellipsis style={{ minWidth: 0, flex: 1 }}>
                  {item.full_name}
                </Text>
                <Tag color="blue" style={{ margin: 0 }}>
                  {item.action}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {formatDateTime(item.created_at, true)}
              </Text>
            </Flex>
          </List.Item>
        )}
      />
    ) : (
      <Table
        dataSource={logs}
        columns={logColumns}
        pagination={false}
        rowKey={(record) => `${record.created_at}-${record.full_name}-${record.action}`}
        scroll={{ x: 520 }}
        locale={{ emptyText: 'Belum ada aktivitas sistem terbaru.' }}
      />
    )}
  </MuseCard>
);

const DashSkeleton = () => (
  <Flex vertical gap={24}>
    <Skeleton active title paragraph={{ rows: 1 }} />
    <Row gutter={[24, 24]}>
      {[0, 1, 2].map((key) => (
        <Col key={key} xs={24} sm={12} xl={8}>
          <MuseCard>
            <Skeleton active paragraph={{ rows: 1 }} />
          </MuseCard>
        </Col>
      ))}
    </Row>
  </Flex>
);

const CenterDash = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.lg;
  const gutter = isMobile ? 16 : 24;
  const [homebaseId, setHomebaseId] = useState(null);
  const [periodeId, setPeriodeId] = useState(null);
  const [autoRefreshMs, setAutoRefreshMs] = useState(DEFAULT_AUTO_REFRESH_MS);

  const { data, isLoading, isFetching, isError, error } = useGetDashboardSummaryQuery(
    {
      homebase_id: homebaseId ?? undefined,
      periode_id: periodeId ?? undefined,
    },
    { pollingInterval: autoRefreshMs || 0 },
  );

  const selectedHomebaseId = homebaseId ?? data?.selected_homebase_id ?? undefined;
  const selectedPeriodeId = periodeId ?? data?.selected_periode_id ?? undefined;

  const homebases = useMemo(() => data?.homebases || [], [data?.homebases]);
  const periods = useMemo(() => data?.periods || [], [data?.periods]);
  const logs = useMemo(() => data?.logs || [], [data?.logs]);
  const stats = data?.stats || {};

  const selectedHomebaseName = homebases.find((h) => Number(h.id) === Number(selectedHomebaseId))?.name;
  const selectedPeriode = periods.find((p) => Number(p.id) === Number(selectedPeriodeId));

  if (isLoading) return <DashSkeleton />;

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        title="Gagal memuat data dashboard"
        description={error?.data?.message || 'Periksa koneksi lalu muat ulang halaman.'}
      />
    );
  }

  const selectStyle = { width: isCompact ? '100%' : 220, maxWidth: '100%' };

  const filters = (
    <Flex gap={8} wrap={!isCompact} vertical={isCompact} style={{ width: isCompact ? '100%' : 'auto' }}>
      <Select
        aria-label="Pilih satuan"
        style={selectStyle}
        value={selectedHomebaseId != null ? Number(selectedHomebaseId) : undefined}
        onChange={(value) => {
          setHomebaseId(value);
          setPeriodeId(null);
        }}
        placeholder="Pilih Satuan"
        loading={isFetching}
        prefix={<Building2 size={16} color={museColors.muted} />}
        options={homebases.map((h) => ({ value: Number(h.id), label: h.name }))}
        notFoundContent="Belum ada satuan"
      />
      <Select
        aria-label="Pilih periode"
        style={selectStyle}
        value={selectedPeriodeId != null ? Number(selectedPeriodeId) : undefined}
        onChange={setPeriodeId}
        placeholder="Pilih Periode"
        loading={isFetching}
        disabled={!selectedHomebaseId || periods.length === 0}
        prefix={<CalendarDays size={16} color={museColors.muted} />}
        options={periods.map((p) => ({
          value: Number(p.id),
          label: `${p.name}${p.is_active ? ' · Aktif' : ''}`,
        }))}
        notFoundContent="Belum ada periode"
      />
      <Select
        aria-label="Interval update otomatis"
        style={{ ...selectStyle, width: isCompact ? '100%' : 230 }}
        value={autoRefreshMs}
        onChange={setAutoRefreshMs}
        prefix={<RefreshCw size={16} color={museColors.muted} />}
        options={AUTO_REFRESH_OPTIONS}
        popupMatchSelectWidth={false}
      />
    </Flex>
  );

  const statCards = [
    {
      key: 'students',
      title: 'Total Siswa',
      value: stats.students || 0,
      note: 'Siswa aktif pada satuan & periode terpilih.',
      icon: <GraduationCap size={24} />,
      tone: 'primary',
    },
    {
      key: 'teachers',
      title: 'Total Guru',
      value: stats.teachers || 0,
      note: 'Pengajar aktif pada satuan terpilih.',
      icon: <UsersRound size={24} />,
      tone: 'accent',
    },
    {
      key: 'exams',
      title: 'Ujian Aktif (CBT)',
      value: stats.activeExams || 0,
      note: 'Sesi ujian aktif pada satuan terpilih.',
      icon: <BookOpenCheck size={24} />,
      tone: 'warning',
    },
  ];

  const reportProps = {
    homebaseId: selectedHomebaseId,
    periodeId: selectedPeriodeId,
    pollingInterval: autoRefreshMs,
  };

  const items = [
    {
      key: 'ringkasan',
      label: 'Ringkasan',
      icon: <LayoutGrid />,
      render: () => (
        <Flex vertical gap={gutter}>
          <Row gutter={[gutter, gutter]}>
            {statCards.map(({ key, ...item }) => (
              <Col key={key} xs={24} sm={12} xl={8}>
                <StatCard {...item} />
              </Col>
            ))}
          </Row>
          <ActivityLogCard logs={logs} isMobile={isMobile} />
        </Flex>
      ),
    },
    {
      key: 'presensi-siswa',
      label: 'Presensi Siswa',
      icon: <GraduationCap />,
      render: () => <CenterAttendanceReports type="students" {...reportProps} />,
    },
    {
      key: 'presensi-guru',
      label: 'Presensi Guru',
      icon: <UserCheck />,
      render: () => <CenterAttendanceReports type="teachers" {...reportProps} />,
    },
  ];

  const subtitle = [selectedHomebaseName, selectedPeriode?.name].filter(Boolean).join(' · ');

  return (
    <PageTabs
      title="Ringkasan Operasional"
      description={subtitle || 'Pilih satuan pendidikan dan periode untuk melihat ringkasan.'}
      extra={filters}
      items={items}
    />
  );
};

export default CenterDash;
