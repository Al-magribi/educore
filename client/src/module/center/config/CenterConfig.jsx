import React from 'react';
import { Grid, Tabs } from 'antd';
import { Database as DatabaseIcon, SlidersHorizontal } from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../../../components/ui/PageHeader';
import Database from './database/Database';
import App from './app/App';

const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const CenterConfig = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const items = [
    {
      key: 'app',
      label: isMobile ? 'Aplikasi' : 'Pengaturan Aplikasi',
      icon: <SlidersHorizontal size={16} />,
      children: <App />,
    },
    {
      key: 'database',
      label: isMobile ? 'Database' : 'Pengaturan Database',
      icon: <DatabaseIcon size={16} />,
      children: <Database />,
    },
  ];

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{ display: 'grid', gap: isMobile ? 16 : 24, minWidth: 0 }}>
      <PageHeader
        title="Pengaturan Sistem"
        description={
          isMobile
            ? 'Atur aplikasi, backup, restore, dan tabel database.'
            : 'Atur identitas aplikasi, backup database, restore data, dan pengelolaan tabel lintas schema.'
        }
      />

      <Tabs
        defaultActiveKey="app"
        items={items}
        size={isMobile ? 'small' : 'middle'}
        tabBarGutter={isMobile ? 12 : 28}
        style={{ width: '100%', minWidth: 0 }}
      />
    </MotionDiv>
  );
};

export default CenterConfig;
