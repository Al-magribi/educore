import React, { Suspense, lazy } from 'react';
import { Grid, Skeleton, Tabs } from 'antd';
import { motion } from 'framer-motion';
import { Briefcase, MapPinned, UsersRound } from 'lucide-react';
import PageHeader from '../../../components/ui/PageHeader';
import { MuseCard } from '../../../components/ui/muse';

const StudentSegmented = lazy(() => import('./StudentSegmented'));
const GeoDistribution = lazy(() => import('./GeoDistribution'));
const ParentJobs = lazy(() => import('./ParentJobs'));

const MotionDiv = motion.div;
const { useBreakpoint } = Grid;

const PanelFallback = ({ rows = 8 }) => (
  <MuseCard>
    <Skeleton active paragraph={{ rows }} />
  </MuseCard>
);

const CenterMarket = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const tabItems = [
    {
      key: 'geo-distribution',
      label: isMobile ? 'Wilayah' : 'Distribusi Geografis',
      icon: <MapPinned size={16} />,
      children: (
        <Suspense fallback={<PanelFallback />}>
          <GeoDistribution />
        </Suspense>
      ),
    },
    {
      key: 'parent-jobs',
      label: isMobile ? 'Profesi' : 'Profesi Orang Tua',
      icon: <Briefcase size={16} />,
      children: (
        <Suspense fallback={<PanelFallback />}>
          <ParentJobs />
        </Suspense>
      ),
    },
    {
      key: 'student-segmented',
      label: isMobile ? 'Segmentasi' : 'Segmentasi Siswa',
      icon: <UsersRound size={16} />,
      children: (
        <Suspense fallback={<PanelFallback rows={10} />}>
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
      style={{ display: 'grid', gap: isMobile ? 16 : 24, minWidth: 0 }}>
      <PageHeader
        title="Analisis Pasar & Demografi"
        description={
          isMobile
            ? 'Analisis realtime siswa aktif, profil keluarga, dan potensi saudara.'
            : 'Dianalisis realtime dari siswa aktif, profil keluarga, dan potensi saudara yang bisa menjadi target berikutnya.'
        }
      />

      <Tabs
        defaultActiveKey="geo-distribution"
        items={tabItems}
        size={isMobile ? 'small' : 'middle'}
        animated
        tabBarGutter={isMobile ? 12 : 28}
        style={{ width: '100%', minWidth: 0 }}
      />
    </MotionDiv>
  );
};

export default CenterMarket;
