import React from 'react';
import { AppleOutlined, DatabaseOutlined } from '@ant-design/icons';
import { Card, Flex, Grid, Space, Tabs, Tag, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import Database from './database/Database';
import App from './app/App';

const { useBreakpoint } = Grid;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const CenterConfig = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const isCompact = !screens.lg;
  const { token } = theme.useToken();

  const createTabLabel = (label, shortLabel, icon, caption) => (
    <Flex align="center" gap={isMobile ? 8 : 10} style={{ minWidth: 0 }}>
      <span
        style={{
          width: isMobile ? 30 : 34,
          height: isMobile ? 30 : 34,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 12,
          background: 'linear-gradient(135deg, #e0f2fe, #dcfce7)',
          color: '#0369a1',
          border: '1px solid rgba(148, 163, 184, 0.14)',
          flexShrink: 0,
        }}>
        {icon}
      </span>
      <Flex vertical gap={0} style={{ minWidth: 0 }}>
        <span
          style={{
            fontWeight: 600,
            lineHeight: 1.2,
            fontSize: isMobile ? 13 : undefined,
            whiteSpace: 'nowrap',
          }}>
          {isMobile ? shortLabel : label}
        </span>
        {!isMobile && (
          <span
            style={{
              fontSize: 12,
              color: token.colorTextSecondary,
              lineHeight: 1.2,
            }}>
            {caption}
          </span>
        )}
      </Flex>
    </Flex>
  );

  const items = [
    {
      label: createTabLabel('Pengaturan Aplikasi', 'Aplikasi', <AppleOutlined />, 'Identitas & preferensi'),
      key: 'app',
      children: <App />,
    },
    {
      label: createTabLabel('Pengaturan Database', 'Database', <DatabaseOutlined />, 'Backup, restore, dan tables'),
      key: 'database',
      children: <Database />,
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
      <Card
        variant="borderless"
        style={{
          borderRadius: isMobile ? 18 : 22,
          overflow: 'hidden',
          border: '1px solid rgba(148, 163, 184, 0.16)',
          background:
            'radial-gradient(circle at top left, rgba(14,165,233,0.14), transparent 30%), linear-gradient(135deg, #0f172a, #1e3a8a 58%, #0f766e)',
          boxShadow: '0 22px 50px rgba(15, 23, 42, 0.18)',
          width: '100%',
          minWidth: 0,
        }}
        styles={{ body: { padding: isMobile ? 14 : 20 } }}>
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
            Center Config
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
              {isMobile ? 'Kelola pengaturan sistem' : 'Kelola pengaturan sistem dari satu workspace yang lebih rapi.'}
            </Title>
            <Text
              style={{
                display: 'block',
                marginTop: 8,
                color: 'rgba(226, 232, 240, 0.9)',
                fontSize: isMobile ? 12 : 13,
                lineHeight: 1.65,
                maxWidth: isCompact ? '100%' : 720,
              }}>
              {isMobile
                ? 'Atur aplikasi, backup, restore, dan tabel database.'
                : 'Atur konfigurasi aplikasi, backup database, restore data, dan pengelolaan tabel lintas schema dengan tampilan yang lebih nyaman untuk dipakai harian.'}
            </Text>
          </div>
        </Space>
      </Card>

      <Card
        variant="borderless"
        style={{
          borderRadius: isMobile ? 18 : 22,
          width: '100%',
          minWidth: 0,
          overflow: 'hidden',
        }}
        styles={{ body: { padding: isMobile ? 10 : 16 } }}>
        <Tabs
          defaultActiveKey="app"
          items={items}
          size={isMobile ? 'small' : 'large'}
          tabBarGutter={isMobile ? 8 : 12}
          style={{ width: '100%', minWidth: 0 }}
          tabBarStyle={{ marginBottom: isMobile ? 12 : 20, paddingBottom: 8 }}
        />
      </Card>
    </MotionDiv>
  );
};

export default CenterConfig;
