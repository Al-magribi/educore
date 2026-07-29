import React, { useMemo, useState } from 'react';
import { useGetDashboardSummaryQuery } from '../../../service/center/ApiCenterDash';
import { Alert, Card, Col, Flex, Grid, Row, Select, Space, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { motion } from 'framer-motion';
import {
  BankOutlined,
  CalendarOutlined,
  FieldTimeOutlined,
  ReadOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Activity, BookOpenCheck, GraduationCap } from 'lucide-react';
import CenterAttendanceReports from './CenterAttendanceReports';

const { Title, Text } = Typography;
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

const statCardStyle = {
  borderRadius: 22,
  height: '100%',
  border: '1px solid rgba(148, 163, 184, 0.16)',
  boxShadow: '0 16px 34px rgba(15, 23, 42, 0.06)',
  background: '#ffffff',
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

  const filterTagStyle = {
    margin: 0,
    maxWidth: '100%',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.22)',
    color: '#e0f2fe',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const statCards = [
    {
      key: 'students',
      title: 'Total Siswa',
      value: stats.students || 0,
      prefix: <UserOutlined style={{ color: '#2563eb' }} />,
      note: 'Peserta aktif pada satuan & periode terpilih.',
      icon: <GraduationCap size={18} />,
      background: 'linear-gradient(135deg, #dbeafe 0%, #eff6ff 100%)',
      color: '#1d4ed8',
    },
    {
      key: 'teachers',
      title: 'Total Guru',
      value: stats.teachers || 0,
      prefix: <TeamOutlined style={{ color: '#16a34a' }} />,
      note: 'Pengajar aktif pada satuan terpilih.',
      icon: <Activity size={18} />,
      background: 'linear-gradient(135deg, #dcfce7 0%, #f0fdf4 100%)',
      color: '#15803d',
    },
    {
      key: 'exams',
      title: 'Ujian Aktif (CBT)',
      value: stats.activeExams || 0,
      prefix: <ReadOutlined style={{ color: '#d97706' }} />,
      note: 'Sesi ujian aktif pada satuan terpilih.',
      icon: <BookOpenCheck size={18} />,
      background: 'linear-gradient(135deg, #fef3c7 0%, #fffbeb 100%)',
      color: '#b45309',
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
        <Tag color="blue" style={{ borderRadius: 999, margin: 0, maxWidth: '100%' }}>
          {text}
        </Tag>
      ),
    },
  ];

  if (isLoading) {
    return (
      <Card variant="borderless" style={{ borderRadius: 24 }} styles={{ body: { padding: 48, textAlign: 'center' } }}>
        <Spin size="large" />
      </Card>
    );
  }

  if (isError) {
    return <Alert message="Gagal memuat data dashboard" type="error" showIcon />;
  }

  return (
    <MotionDiv
      initial="hidden"
      animate="show"
      variants={containerVariants}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? 14 : 18,
      }}>
      <MotionDiv variants={itemVariants} style={{ width: '100%', minWidth: 0, background: 'transparent' }}>
        <Card
          variant="borderless"
          style={{
            borderRadius: isMobile ? 22 : 28,
            overflow: 'hidden',
            background:
              'radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 26%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f766e 100%)',
            boxShadow: '0 24px 52px rgba(15, 23, 42, 0.16)',
          }}
          styles={{ body: { padding: isMobile ? 16 : 28, background: 'transparent' } }}>
          <Flex
            justify="space-between"
            align={isCompact ? 'stretch' : 'flex-start'}
            gap={isMobile ? 14 : 18}
            wrap="wrap"
            style={{ width: '100%' }}>
            <div style={{ flex: '1 1 260px', minWidth: 0, maxWidth: '100%' }}>
              <Text
                style={{
                  color: 'rgba(255,255,255,0.74)',
                  display: 'block',
                  marginBottom: 8,
                }}>
                Dashboard Center
              </Text>
              <Title
                level={isMobile ? 4 : 2}
                style={{
                  margin: 0,
                  color: '#fff',
                  lineHeight: 1.2,
                  wordBreak: 'break-word',
                }}>
                Ringkasan operasional
              </Title>

              {(selectedHomebaseName || selectedPeriodeName) && (
                <Space wrap size={[8, 8]} style={{ marginTop: 14, maxWidth: '100%' }}>
                  {selectedHomebaseName && (
                    <Tag icon={<BankOutlined />} style={filterTagStyle} title={selectedHomebaseName}>
                      {selectedHomebaseName}
                    </Tag>
                  )}
                  {selectedPeriodeName && (
                    <Tag icon={<CalendarOutlined />} style={filterTagStyle} title={selectedPeriodeName}>
                      {selectedPeriodeName}
                    </Tag>
                  )}
                </Space>
              )}
            </div>

            <Flex
              vertical={isCompact}
              gap={12}
              wrap={!isCompact ? 'wrap' : undefined}
              style={{
                flex: isCompact ? '1 1 100%' : '0 1 auto',
                width: isCompact ? '100%' : 'auto',
                minWidth: 0,
                maxWidth: '100%',
              }}>
              <Select
                style={selectStyle}
                value={selectedHomebaseId != null ? Number(selectedHomebaseId) : undefined}
                onChange={handleHomebaseChange}
                placeholder="Pilih Satuan"
                loading={isFetching}
                suffixIcon={<BankOutlined style={{ color: '#64748b' }} />}
                options={homebases.map((h) => ({
                  value: Number(h.id),
                  label: h.name,
                }))}
                notFoundContent="Belum ada satuan"
                popupMatchSelectWidth
              />
              <Select
                style={selectStyle}
                value={selectedPeriodeId != null ? Number(selectedPeriodeId) : undefined}
                onChange={(val) => setPeriodeId(val)}
                placeholder="Pilih Periode"
                loading={isFetching}
                disabled={!selectedHomebaseId || periods.length === 0}
                suffixIcon={<CalendarOutlined style={{ color: '#64748b' }} />}
                options={periods.map((p) => ({
                  value: Number(p.id),
                  label: `${p.name}${p.is_active ? ' · Aktif' : ''}`,
                }))}
                notFoundContent="Belum ada periode"
                popupMatchSelectWidth
              />
            </Flex>
          </Flex>
        </Card>
      </MotionDiv>

      <MotionDiv variants={itemVariants} style={{ width: '100%', minWidth: 0, background: 'transparent' }}>
        <Row gutter={[isMobile ? 12 : 16, isMobile ? 12 : 16]} style={{ background: 'transparent' }}>
          {statCards.map((item) => (
            <Col key={item.key} xs={24} sm={12} xl={8} style={{ background: 'transparent' }}>
              <Card
                variant="borderless"
                style={statCardStyle}
                styles={{ body: { padding: isMobile ? 14 : 18, background: 'transparent' } }}>
                <Flex justify="space-between" align="start" gap={12}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Statistic title={item.title} value={item.value} prefix={item.prefix} />
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                      {item.note}
                    </Text>
                  </div>
                  <div
                    style={{
                      width: isMobile ? 40 : 46,
                      height: isMobile ? 40 : 46,
                      borderRadius: 16,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: item.background,
                      color: item.color,
                      flexShrink: 0,
                    }}>
                    {item.icon}
                  </div>
                </Flex>
              </Card>
            </Col>
          ))}
        </Row>
      </MotionDiv>

      <MotionDiv variants={itemVariants} style={{ width: '100%', minWidth: 0, background: 'transparent' }}>
        <CenterAttendanceReports
          homebaseId={selectedHomebaseId}
          periodeId={selectedPeriodeId}
          pollingInterval={autoRefreshMs}
          autoRefreshMs={autoRefreshMs}
          onAutoRefreshChange={setAutoRefreshMs}
        />
      </MotionDiv>

      <MotionDiv variants={itemVariants} style={{ width: '100%', minWidth: 0, background: 'transparent' }}>
        <Card
          variant="borderless"
          title={
            <Space align="center" size={8} wrap>
              <FieldTimeOutlined />
              <span>Aktivitas Sistem Terakhir</span>
            </Space>
          }
          style={{
            borderRadius: isMobile ? 20 : 24,
            boxShadow: '0 16px 34px rgba(15, 23, 42, 0.06)',
            overflow: 'hidden',
            background: '#ffffff',
          }}
          styles={{
            header: { padding: isMobile ? '12px 14px' : undefined, background: 'transparent' },
            body: { padding: 0, background: 'transparent' },
          }}>
          <Table
            dataSource={logsData}
            columns={logColumns}
            pagination={false}
            rowKey={(record) => `${record.created_at}-${record.full_name}-${record.action}`}
            size="small"
            scroll={{ x: 420 }}
            locale={{ emptyText: 'Belum ada aktivitas sistem terbaru.' }}
          />
        </Card>
      </MotionDiv>
    </MotionDiv>
  );
};

export default CenterDash;
