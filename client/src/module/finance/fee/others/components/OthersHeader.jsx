import { Button, Card, Flex, Grid, Space, Tag, Typography } from 'antd';
import { motion } from 'framer-motion';
import { Plus, ReceiptText, Sparkles } from 'lucide-react';

import { cardStyle } from '../constants';

const { Title } = Typography;
const MotionDiv = motion.div;

const OthersHeader = ({ onOpenType }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Card
        style={{
          ...cardStyle,
          overflow: 'hidden',
          position: 'relative',
          background:
            'radial-gradient(circle at top left, rgba(56,189,248,0.24), transparent 28%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #0f766e 55%, #38bdf8 100%)',
          border: 'none',
          boxShadow: '0 24px 54px rgba(15, 23, 42, 0.18)',
        }}
        styles={{ body: { padding: isMobile ? 16 : 24 } }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06), transparent 42%)',
            pointerEvents: 'none',
          }}
        />
        <Flex
          justify="space-between"
          align={isMobile ? 'stretch' : 'center'}
          vertical={isMobile}
          wrap="wrap"
          gap={16}
          style={{ position: 'relative' }}>
          <Space direction="vertical" size={8} style={{ minWidth: 0, flex: 1 }}>
            <Flex align="center" gap={10} wrap="wrap">
              <Tag
                color="cyan"
                style={{
                  width: 'fit-content',
                  margin: 0,
                  borderRadius: 999,
                  paddingInline: 12,
                  fontWeight: 600,
                  fontSize: isMobile ? 12 : 14,
                }}>
                Finance / Pembayaran Lainnya
              </Tag>
              <Flex
                align="center"
                gap={6}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.12)',
                  border: '1px solid rgba(255,255,255,0.16)',
                  color: '#e0f2fe',
                  fontWeight: 600,
                  fontSize: isMobile ? 12 : 14,
                }}>
                <Sparkles size={14} />
                <span>Non-SPP billing workspace</span>
              </Flex>
            </Flex>
            <Flex align="center" gap={12}>
              <div
                style={{
                  width: isMobile ? 44 : 54,
                  height: isMobile ? 44 : 54,
                  display: 'grid',
                  placeItems: 'center',
                  borderRadius: 18,
                  background: 'rgba(255,255,255,0.14)',
                  color: '#fff',
                  flexShrink: 0,
                }}>
                <ReceiptText size={isMobile ? 20 : 24} />
              </div>
              <div style={{ minWidth: 0 }}>
                <Title
                  level={isMobile ? 4 : 3}
                  style={{ color: '#fff', margin: 0, lineHeight: 1.25 }}>
                  Pengelolaan Tagihan Non-SPP
                </Title>
              </div>
            </Flex>
          </Space>
          <Button
            type="primary"
            icon={<Plus size={16} />}
            onClick={onOpenType}
            size="large"
            block={isMobile}
            style={{
              borderRadius: 14,
              height: 46,
              background: '#fff',
              color: '#0f172a',
              border: 'none',
              fontWeight: 600,
              boxShadow: '0 12px 24px rgba(255,255,255,0.18)',
            }}>
            Atur Jenis Biaya
          </Button>
        </Flex>
      </Card>
    </MotionDiv>
  );
};

export default OthersHeader;
