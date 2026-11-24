import React, { useMemo, useState } from 'react';
import { useGetDashboardSummaryQuery } from '../../../service/center/ApiCenterDash';
import { Alert, Col, Flex, Grid, Row, Select, Skeleton, Table, Tag, Typography } from 'antd';
import { motion } from 'framer-motion';
import { BookOpenCheck, Building2, CalendarDays, GraduationCap, History, UsersRound } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import { CardTitle, MuseCard, StatCard } from '../../../components/ui/muse';
import { museColors } from '../../../config/theme';
import CenterAttendanceReports from './CenterAttendanceReports';

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const DEFAULT_AUTO_REFRESH_MS = 300_000;

const containerVariants = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.36,
      staggerChildren: 0.08,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

const CenterDash = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.lg;
  const [homebaseId, setHomebaseId] = useState(null);
  const [periodeId, setPeriodeId] = useState(null);
  const [autoRefreshMs, setAutoRefreshMs] = useState(DEFAULT_AUTO_REFRESH_MS);

  const { data, isLoading, isFetching, isError } = useGetDashboardSummaryQuery(
    {
      homebase_id: homebaseId ?? undefined,
      periode_id: periodeId ?? undefined,
    },
    { pollingInterval: autoRefreshMs || 0 },
  );

  const selectedHomebaseId = homebaseId ?? data?.selected_homebase_id ?? undefined;
  const selectedPeriodeId = periodeId ?? data?.selected_periode_id ?? undefined;

  const homebases = data?.homebases || [];
  const periods = data?.periods || [];
  const logsSource = data?.logs;
  const statsSource = data?.stats;

  const logsData = useMemo(() => logsSource || [], [logsSource]);
  const stats = useMemo(() => statsSource || {}, [statsSource]);

  const selectedHomebaseName = useMemo(() => {
    const found = homebases.find((h) => Number(h.id) === Number(selectedHomebaseId));
    return found?.name || null;
  }, [homebases, selectedHomebaseId]);

  const selectedPeriodeName = useMemo(() => {
    const found = periods.find((p) => Number(p.id) === Number(selectedPeriodeId));
    return found?.name || null;
  }, [periods, selectedPeriodeId]);

  const handleHomebaseChange = (val) => {
    setHomebaseId(val);
    setPeriodeId(null);
  };

  const selectStyle = {
    width: isCompact ? '100%' : 220,
    maxWidth: '100%',
  };

  const statCards = [
    {
      key: 'students',
      title: 'Total Siswa',
      value: stats.students || 0,
      note: 'Peserta aktif pada satuan & periode terpilih.',
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

  const logColumns = [
    {
      title: 'Waktu',
      dataIndex: 'created_at',
      key: 'created_at',
      width: isMobile ? 140 : 180,
      ellipsis: true,
      render: (text) =>
        text
          ? new Date(text).toLocaleString('id-ID', {
              day: '2-digit',
              month: 'short',
              year: isMobile ? '2-digit' : 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
    },
    {
      title: 'User',
      dataIndex: 'full_name',
      key: 'full_name',
      ellipsis: true,
      width: isMobile ? 120 : 180,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: 'Aktivitas',
      dataIndex: 'action',
      key: 'action',
      ellipsis: true,
      width: isMobile ? 120 : 160,
      render: (text) => (
        <Tag color="blue" style={{ margin: 0, maxWidth: '100%' }}>
          {text}
        </Tag>
      ),
    },
  ];

  if (isLoading) {
    return (
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
  }

  if (isError) {
    return (
      <Alert
        type="error"
        showIcon
        title="Gagal memuat data dashboard"
        description="Periksa koneksi lalu muat ulang halaman."
      />
    );
  }

  const subtitle = [selectedHomebaseName, selectedPeriodeName].filter(Boolean).join(' · ');

  return (
    <MotionDiv
      initial="hidden"
      animate="show"
      variants={containerVariants}
      style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 16 : 24 }}>
      <MotionDiv variants={itemVariants}>
        <PageHeader
          title="Ringkasan Operasional"
          description={subtitle || 'Pilih satuan pendidikan dan periode untuk melihat ringkasan.'}
          extra={
            <Flex gap={12} vertical={isCompact} style={{ width: isCompact ? '100%' : 'auto' }}>
              <Select
                style={selectStyle}
                value={selectedHomebaseId != null ? Number(selectedHomebaseId) : undefined}
                onChange={handleHomebaseChange}
                placeholder="Pilih Satuan"
                loading={isFetching}
                prefix={<Building2 size={16} color={museColors.muted} />}
                options={homebases.map((h) => ({
                  value: Number(h.id),
                  label: h.name,
                }))}
                notFoundContent="Belum ada satuan"
              />
              <Select
                style={selectStyle}
                value={selectedPeriodeId != null ? Number(selectedPeriodeId) : undefined}
                onChange={(val) => setPeriodeId(val)}
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
            </Flex>
          }
        />
      </MotionDiv>

      <MotionDiv variants={itemVariants}>
        <Row gutter={[isMobile ? 16 : 24, isMobile ? 16 : 24]}>
          {statCards.map(({ key, ...item }) => (
            <Col key={key} xs={24} sm={12} xl={8}>
              <StatCard {...item} />
            </Col>
          ))}
        </Row>
      </MotionDiv>

      <MotionDiv variants={itemVariants} style={{ minWidth: 0 }}>
        <CenterAttendanceReports
          homebaseId={selectedHomebaseId}
          periodeId={selectedPeriodeId}
          pollingInterval={autoRefreshMs}
          autoRefreshMs={autoRefreshMs}
          onAutoRefreshChange={setAutoRefreshMs}
        />
      </MotionDiv>

      <MotionDiv variants={itemVariants} style={{ minWidth: 0 }}>
        <MuseCard
          flush
          title={
            <CardTitle
              icon={<History size={16} />}
              title="Aktivitas Sistem Terakhir"
              description="Log login dan perubahan data terbaru."
            />
          }>
          <Table
            dataSource={logsData}
            columns={logColumns}
            pagination={false}
            rowKey={(record) => `${record.created_at}-${record.full_name}-${record.action}`}
            scroll={{ x: 420 }}
            locale={{ emptyText: 'Belum ada aktivitas sistem terbaru.' }}
          />
        </MuseCard>
      </MotionDiv>
    </MotionDiv>
  );
};

export default CenterDash;
