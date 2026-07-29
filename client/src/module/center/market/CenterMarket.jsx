import React, { Suspense, lazy } from 'react';
import { Grid, Skeleton, Space, Tabs, Tag, Typography } from 'antd';
import { motion } from 'framer-motion';

const StudentSegmented = lazy(() => import('./StudentSegmented'));
const GeoDistribution = lazy(() => import('./GeoDistribution'));
const ParentJobs = lazy(() => import('./ParentJobs'));

const { Title, Text } = Typography;
const MotionDiv = motion.div;

const fallbackStyle = {
  borderRadius: 24,
  border: '1px solid rgba(148, 163, 184, 0.14)',
  background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
  boxShadow: '0 20px 50px rgba(15, 23, 42, 0.06)',
  padding: 20,
  width: '100%',
  minWidth: 0,
};

const ChartFallback = () => (
  <div style={{ ...fallbackStyle, minHeight: 320, padding: 16 }}>
    <Skeleton active paragraph={{ rows: 8 }} />
  </div>
);

const StudentListFallback = () => (
  <div style={{ ...fallbackStyle, minHeight: 420, padding: 16 }}>
    <Skeleton active paragraph={{ rows: 10 }} />
  </div>
);

const CenterMarket = () => {
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.lg;

  const tabItems = [
    {
      key: 'geo-distribution',
      label: isMobile ? 'Wilayah' : 'Distribusi Geografis',
      children: (
        <Suspense fallback={<ChartFallback />}>
          <GeoDistribution />
        </Suspense>
      ),
    },
    {
      key: 'parent-jobs',
      label: isMobile ? 'Profesi' : 'Profesi Orang Tua',
      children: (
        <Suspense fallback={<ChartFallback />}>
          <ParentJobs />
        </Suspense>
      ),
    },
    {
      key: 'student-segmented',
      label: isMobile ? 'Segmentasi' : 'Segmentasi Siswa',
      children: (
        <Suspense fallback={<StudentListFallback />}>
          <StudentSegmented />
        </Suspense>
      ),
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        display: 'grid',
        gap: isMobile ? 12 : 18,
      }}>
      <div
        style={{
          borderRadius: isMobile ? 18 : 24,
          overflow: 'hidden',
          border: '1px solid rgba(148, 163, 184, 0.16)',
          background:
            'radial-gradient(circle at top left, rgba(14,165,233,0.14), transparent 30%), linear-gradient(135deg, #0f172a, #1e3a8a 58%, #0f766e)',
          boxShadow: '0 22px 50px rgba(15, 23, 42, 0.18)',
          padding: isMobile ? 14 : 20,
          width: '100%',
          minWidth: 0,
        }}>
        <Space orientation="vertical" size={isMobile ? 10 : 14} style={{ width: '100%' }}>
          <Tag
            style={{
              width: 'fit-content',
              margin: 0,
              borderRadius: 999,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.12)',
              color: '#e0f2fe',
              paddingInline: 12,
              fontWeight: 600,
            }}>
            Center Market
          </Tag>

          <div style={{ minWidth: 0 }}>
            <Title
              level={isMobile ? 4 : 2}
              style={{
                margin: 0,
                color: '#f8fafc',
                fontSize: isMobile ? 20 : isCompact ? 24 : 28,
                lineHeight: 1.25,
                wordBreak: 'break-word',
              }}>
              {isMobile
                ? 'Insight market siswa & keluarga'
                : 'Lihat insight market siswa dan keluarga dalam satu workspace.'}
            </Title>
            <Text
              style={{
                display: 'block',
                marginTop: 8,
                color: 'rgba(226, 232, 240, 0.9)',
                fontSize: isMobile ? 12 : 13,
                lineHeight: 1.65,
                maxWidth: isCompact ? '100%' : 760,
              }}>
              {isMobile
                ? 'Analisis realtime siswa aktif, profil keluarga, dan potensi saudara.'
                : 'Data ini dianalisis secara realtime berdasarkan siswa aktif, profil keluarga, dan potensi saudara yang dapat menjadi target berikutnya.'}
            </Text>
          </div>
        </Space>
      </div>

      <div
        style={{
          borderRadius: isMobile ? 18 : 24,
          border: '1px solid rgba(148, 163, 184, 0.14)',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
          boxShadow: '0 20px 50px rgba(15, 23, 42, 0.06)',
          padding: isMobile ? 10 : 16,
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
        }}>
        <Tabs
          defaultActiveKey="geo-distribution"
          items={tabItems}
          size={isMobile ? 'small' : 'middle'}
          animated
          destroyInactiveTabPane={false}
          tabBarGutter={isMobile ? 12 : 28}
          style={{ width: '100%', minWidth: 0 }}
          tabBarStyle={{ marginBottom: isMobile ? 12 : 16 }}
        />
      </div>
    </MotionDiv>
  );
};

export default CenterMarket;
