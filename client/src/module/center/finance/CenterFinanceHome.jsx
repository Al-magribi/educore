import React, { useState } from 'react';
import {
  Card,
  Input,
  Typography,
  Grid,
  Row,
  Col,
  Tag,
  Empty,
  Spin,
} from 'antd';
import {
  ArrowRightOutlined,
  BankOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGetHomebaseQuery } from '../../../service/center/ApiHomebase';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.07 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
};

const CenterFinanceHome = () => {
  const screens = useBreakpoint();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = React.useRef(null);

  const { data, isLoading } = useGetHomebaseQuery({
    page: 1,
    limit: 100,
    search: debouncedSearch,
  });

  const homebases = data?.data || [];

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 350);
  };

  const handleSelect = (homebase) => {
    navigate(`/keuangan/${homebase.id}/pembayaran-spp`, {
      state: { homebaseName: homebase.name },
    });
  };

  const cols = screens.xl ? 6 : screens.lg ? 8 : screens.md ? 12 : 24;

  return (
    <div style={{ padding: screens.md ? 24 : 16 }}>
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, marginBottom: 4 }}>
          Keuangan — Pilih Satuan Pendidikan
        </Title>
        <Text type='secondary'>
          Pilih satuan untuk mengelola keuangan, pembayaran SPP, beasiswa, dan tabungan.
        </Text>
      </div>

      <div style={{ marginBottom: 20, maxWidth: 360 }}>
        <Input
          prefix={<SearchOutlined />}
          placeholder='Cari satuan pendidikan…'
          value={search}
          onChange={handleSearchChange}
          allowClear
        />
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size='large' />
        </div>
      ) : homebases.length === 0 ? (
        <Empty description='Tidak ada satuan ditemukan' style={{ marginTop: 48 }} />
      ) : (
        <MotionDiv
          variants={containerVariants}
          initial='hidden'
          animate='show'
        >
          <Row gutter={[16, 16]}>
            {homebases.map((hb) => (
              <Col key={hb.id} span={cols}>
                <MotionDiv variants={itemVariants}>
                  <Card
                    hoverable
                    onClick={() => handleSelect(hb)}
                    style={{ borderRadius: 10, cursor: 'pointer', height: '100%' }}
                    styles={{ body: { padding: 16 } }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          background: '#e6f4ff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <BankOutlined style={{ fontSize: 18, color: '#1677ff' }} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text
                          strong
                          ellipsis
                          style={{ fontSize: 14, display: 'block', marginBottom: 4 }}
                        >
                          {hb.name}
                        </Text>
                        {hb.type && (
                          <Tag color='blue' style={{ marginBottom: 4, fontSize: 11 }}>
                            {hb.type}
                          </Tag>
                        )}
                        {hb.address && (
                          <Text
                            type='secondary'
                            ellipsis
                            style={{ fontSize: 12, display: 'block' }}
                          >
                            {hb.address}
                          </Text>
                        )}
                      </div>

                      <ArrowRightOutlined style={{ color: '#1677ff', flexShrink: 0 }} />
                    </div>
                  </Card>
                </MotionDiv>
              </Col>
            ))}
          </Row>
        </MotionDiv>
      )}
    </div>
  );
};

export default CenterFinanceHome;
