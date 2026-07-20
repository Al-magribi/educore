import React, { useEffect, useMemo, useState } from 'react';
import {
  Row,
  Col,
  Card,
  Statistic,
  Select,
  Tag,
  Spin,
  Empty,
  Space,
  Typography,
  Grid,
  Progress,
  Tabs,
  Button,
  Input,
  Table,
} from 'antd';
import {
  UserOutlined,
  TeamOutlined,
  ReadOutlined,
  BankOutlined,
  ManOutlined,
  WomanOutlined,
  CalendarOutlined,
  ApartmentOutlined,
  ArrowLeftOutlined,
  SearchOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { motion } from 'framer-motion';
import {
  useDetailHomebaseQuery,
  useGetHomebaseClassesQuery,
} from '../../../service/center/ApiHomebase';
import ModalClassStudents from './ModalClassStudents';
import HomebaseTeacherTab from './HomebaseTeacherTab';

const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.28, ease: 'easeOut' },
  },
};

const DetailHomebase = ({ homebaseId, activeTab = 'ringkasan', onTabChange, onBack }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  const [periodeId, setPeriodeId] = useState(null);
  const [classSearch, setClassSearch] = useState('');
  const [classPage, setClassPage] = useState(1);
  const [classPeriodeId, setClassPeriodeId] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [debouncedClassSearch, setDebouncedClassSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClassSearch(classSearch.trim());
      setClassPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [classSearch]);

  const selectedPeriodeId = periodeId ?? undefined;

  const {
    data: apiData,
    isFetching: isDetailFetching,
    isLoading: isDetailLoading,
  } = useDetailHomebaseQuery(
    { id: homebaseId, periode_id: selectedPeriodeId },
    { skip: !homebaseId },
  );

  const {
    data: classesData,
    isFetching: isClassesFetching,
    isLoading: isClassesLoading,
  } = useGetHomebaseClassesQuery(
    {
      id: homebaseId,
      page: classPage,
      limit: 10,
      search: debouncedClassSearch,
      periode_id: classPeriodeId ?? undefined,
    },
    { skip: !homebaseId || activeTab !== 'kelas' },
  );

  const detailPayload = apiData?.data || {};
  const stats = useMemo(() => detailPayload?.stats || {}, [detailPayload?.stats]);
  const composition = detailPayload?.class_composition || [];
  const periods = detailPayload?.periods || [];
  const homebase = detailPayload?.homebase;
  const detailSelectedPeriodeId = periodeId ?? detailPayload?.selected_periode_id ?? undefined;

  const teacherMale = Number(stats.teachers?.laki || 0);
  const teacherFemale = Number(stats.teachers?.perempuan || 0);
  const totalTeacherGender = teacherMale + teacherFemale;

  const classes = classesData?.data || [];
  const classesTotal = classesData?.total || 0;
  const classPeriods = classesData?.periods || [];
  const selectedClassPeriodeId = classPeriodeId ?? classesData?.selected_periode_id ?? undefined;

  const cards = useMemo(
    () => [
      {
        key: 'teachers',
        title: 'Total Guru',
        value: Number(stats.teachers?.total || 0),
        icon: <UserOutlined />,
        color: '#b45309',
        bg: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(251,191,36,0.1))',
      },
      {
        key: 'students',
        title: 'Total Siswa',
        value: Number(stats.students?.total || 0),
        icon: <TeamOutlined />,
        color: '#1d4ed8',
        bg: 'linear-gradient(135deg, rgba(59,130,246,0.16), rgba(14,165,233,0.1))',
      },
      {
        key: 'classes',
        title: 'Total Kelas',
        value: Number(stats.classes?.total || 0),
        icon: <BankOutlined />,
        color: '#be123c',
        bg: 'linear-gradient(135deg, rgba(244,63,94,0.16), rgba(251,113,133,0.1))',
      },
      {
        key: 'subjects',
        title: 'Total Pelajaran',
        value: Number(stats.subjects?.total || 0),
        icon: <ReadOutlined />,
        color: '#15803d',
        bg: 'linear-gradient(135deg, rgba(34,197,94,0.16), rgba(16,185,129,0.1))',
      },
    ],
    [stats],
  );

  const classColumns = useMemo(
    () => [
      {
        title: 'Kelas',
        dataIndex: 'name',
        key: 'name',
        render: (value, record) => (
          <Space orientation="vertical" size={2}>
            <Text strong>{value || '-'}</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {[record.grade_name, record.major_name].filter(Boolean).join(' · ') || 'Tanpa tingkat/jurusan'}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Wali Kelas',
        dataIndex: 'homeroom_teacher',
        key: 'homeroom_teacher',
        render: (value) => value || '-',
      },
      {
        title: 'Jumlah Siswa',
        dataIndex: 'students_count',
        key: 'students_count',
        width: 130,
        render: (value) => <Tag style={{ borderRadius: 999 }}>{Number(value || 0)} siswa</Tag>,
      },
      {
        title: 'Status',
        dataIndex: 'is_active',
        key: 'is_active',
        width: 110,
        render: (value) => (
          <Tag color={value ? 'success' : 'default'} style={{ borderRadius: 999 }}>
            {value ? 'Aktif' : 'Nonaktif'}
          </Tag>
        ),
      },
      {
        title: 'Aksi',
        key: 'action',
        width: 130,
        render: (_, record) => (
          <Button
            type="link"
            icon={<TeamOutlined />}
            onClick={() => {
              setSelectedClass(record);
              setIsStudentModalOpen(true);
            }}
            style={{ fontWeight: 600, paddingInline: 0 }}>
            Siswa
          </Button>
        ),
      },
    ],
    [],
  );

  const renderRingkasan = () => {
    if (isDetailLoading) {
      return (
        <Card variant="borderless" style={{ borderRadius: 24, minHeight: 300 }}>
          <div style={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
            <Spin size="large" />
          </div>
        </Card>
      );
    }

    return (
      <Space orientation="vertical" size={16} style={{ width: '100%' }}>
        <Card
          variant="borderless"
          style={{
            borderRadius: 22,
            border: '1px solid rgba(148, 163, 184, 0.14)',
          }}
          styles={{ body: { padding: 16 } }}>
          <Space wrap size={[12, 12]} style={{ width: '100%', justifyContent: 'space-between' }}>
            <Text type="secondary">Pilih periode untuk melihat ringkasan yang relevan.</Text>
            <Select
              style={{ width: isMobile ? '100%' : 260 }}
              value={detailSelectedPeriodeId ? Number(detailSelectedPeriodeId) : undefined}
              onChange={(val) => setPeriodeId(val)}
              placeholder="Pilih Periode"
              loading={isDetailFetching}
              suffixIcon={<CalendarOutlined style={{ color: '#64748b' }} />}
              options={periods.map((p) => ({
                value: p.id,
                label: `${p.name}${p.is_active ? ' - Aktif' : ''}`,
              }))}
            />
          </Space>
        </Card>

        <Row gutter={[16, 16]}>
          {cards.map((item) => (
            <Col xs={24} sm={12} lg={6} key={item.key}>
              <MotionDiv variants={itemVariants} whileHover={{ y: -4 }} transition={{ duration: 0.2 }}>
                <Card
                  variant="borderless"
                  style={{
                    borderRadius: 22,
                    background: item.bg,
                    border: '1px solid rgba(148, 163, 184, 0.14)',
                  }}
                  styles={{ body: { padding: 18 } }}>
                  <Statistic
                    title={<Text style={{ color: '#475569', fontSize: 13 }}>{item.title}</Text>}
                    value={item.value}
                    prefix={
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 14,
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginRight: 10,
                          background: 'rgba(255,255,255,0.72)',
                          color: item.color,
                        }}>
                        {item.icon}
                      </div>
                    }
                    valueStyle={{ color: '#0f172a', fontSize: 28 }}
                  />
                </Card>
              </MotionDiv>
            </Col>
          ))}
        </Row>

        <Row gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Card
              title="Komposisi Siswa per Kelas"
              variant="borderless"
              style={{
                borderRadius: 24,
                border: '1px solid rgba(148, 163, 184, 0.14)',
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.06)',
              }}
              styles={{ body: { padding: 20 } }}>
              {composition.length === 0 ? (
                <Empty description="Belum ada kelas atau siswa pada periode ini" />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: 14,
                    maxHeight: 460,
                    overflowY: 'auto',
                    paddingRight: 4,
                  }}>
                  {composition.map((cls, idx) => (
                    <MotionDiv
                      key={`${cls.class_name}-${idx}`}
                      whileHover={{ y: -3 }}
                      transition={{ duration: 0.2 }}>
                      <Card
                        variant="borderless"
                        style={{
                          borderRadius: 20,
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,250,252,0.96))',
                          border: '1px solid rgba(148, 163, 184, 0.16)',
                        }}
                        styles={{ body: { padding: 18 } }}>
                        <Space orientation="vertical" size={14} style={{ width: '100%' }}>
                          <div>
                            <Text style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Kelas</Text>
                            <Title level={5} style={{ margin: '4px 0 0', color: '#0f172a' }}>
                              {cls.class_name}
                            </Title>
                          </div>

                          <div
                            style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                              gap: 12,
                            }}>
                            <div
                              style={{
                                borderRadius: 16,
                                padding: 14,
                                background: 'rgba(59,130,246,0.08)',
                              }}>
                              <Space align="center" size={10}>
                                <ManOutlined style={{ color: '#2563eb', fontSize: 18 }} />
                                <div>
                                  <Text style={{ fontSize: 12, color: '#64748b' }}>Laki Laki</Text>
                                  <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                                    {cls.laki}
                                  </Title>
                                </div>
                              </Space>
                            </div>

                            <div
                              style={{
                                borderRadius: 16,
                                padding: 14,
                                background: 'rgba(236,72,153,0.08)',
                              }}>
                              <Space align="center" size={10}>
                                <WomanOutlined style={{ color: '#db2777', fontSize: 18 }} />
                                <div>
                                  <Text style={{ fontSize: 12, color: '#64748b' }}>Perempuan</Text>
                                  <Title level={4} style={{ margin: 0, color: '#0f172a' }}>
                                    {cls.perempuan}
                                  </Title>
                                </div>
                              </Space>
                            </div>
                          </div>

                          <div
                            style={{
                              borderRadius: 14,
                              padding: '10px 12px',
                              background: '#f8fafc',
                              border: '1px solid #e2e8f0',
                            }}>
                            <Text style={{ color: '#475569', fontSize: 12 }}>Total siswa</Text>
                            <Title level={4} style={{ margin: '2px 0 0', color: '#0f172a' }}>
                              {cls.total_students}
                            </Title>
                          </div>
                        </Space>
                      </Card>
                    </MotionDiv>
                  ))}
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={8}>
            <Card
              title="Komposisi Guru"
              variant="borderless"
              style={{
                borderRadius: 24,
                border: '1px solid rgba(148, 163, 184, 0.14)',
                boxShadow: '0 20px 50px rgba(15, 23, 42, 0.06)',
              }}
              styles={{ body: { padding: 20 } }}>
              <Space orientation="vertical" size={14} style={{ width: '100%' }}>
                <div
                  style={{
                    borderRadius: 20,
                    padding: 18,
                    background: 'linear-gradient(135deg, rgba(245,158,11,0.16), rgba(251,191,36,0.08))',
                  }}>
                  <Space align="center" size={14}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.75)',
                        color: '#d97706',
                        fontSize: 20,
                      }}>
                      <ManOutlined />
                    </div>
                    <div>
                      <Text style={{ color: '#92400e', fontSize: 12 }}>
                        Laki Laki
                      </Text>
                      <Title level={3} style={{ margin: 0, color: '#78350f' }}>
                        {teacherMale}
                      </Title>
                    </div>
                  </Space>
                </div>

                <div
                  style={{
                    borderRadius: 20,
                    padding: 18,
                    background: 'linear-gradient(135deg, rgba(236,72,153,0.16), rgba(244,114,182,0.08))',
                  }}>
                  <Space align="center" size={14}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.75)',
                        color: '#db2777',
                        fontSize: 20,
                      }}>
                      <WomanOutlined />
                    </div>
                    <div>
                      <Text style={{ color: '#9d174d', fontSize: 12 }}>
                        Perempuan
                      </Text>
                      <Title level={3} style={{ margin: 0, color: '#831843' }}>
                        {teacherFemale}
                      </Title>
                    </div>
                  </Space>
                </div>

                <div>
                  <Text style={{ color: '#64748b', fontSize: 12 }}>Proporsi guru laki-laki</Text>
                  <Progress
                    percent={
                      totalTeacherGender ? Math.round((teacherMale / totalTeacherGender) * 100) : 0
                    }
                    strokeColor="#f59e0b"
                    trailColor="#f1f5f9"
                    showInfo
                  />
                </div>
              </Space>
            </Card>
          </Col>
        </Row>
      </Space>
    );
  };

  const renderKelas = () => (
    <Card
      variant="borderless"
      style={{
        borderRadius: 24,
        border: '1px solid rgba(148, 163, 184, 0.14)',
      }}
      styles={{ body: { padding: 16 } }}>
      <Space orientation="vertical" size={14} style={{ width: '100%' }}>
        <Space wrap size={[10, 10]} style={{ width: '100%' }}>
          <Input
            allowClear
            placeholder="Cari kelas..."
            prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
            value={classSearch}
            onChange={(e) => setClassSearch(e.target.value)}
            style={{ width: isMobile ? '100%' : 280 }}
          />
          <Select
            style={{ width: isMobile ? '100%' : 240 }}
            value={selectedClassPeriodeId ? Number(selectedClassPeriodeId) : undefined}
            onChange={(val) => {
              setClassPeriodeId(val);
              setClassPage(1);
            }}
            placeholder="Periode (jumlah siswa)"
            suffixIcon={<CalendarOutlined style={{ color: '#64748b' }} />}
            options={classPeriods.map((p) => ({
              value: p.id,
              label: `${p.name}${p.is_active ? ' - Aktif' : ''}`,
            }))}
          />
        </Space>

        {isClassesLoading ? (
          <div style={{ minHeight: 220, display: 'grid', placeItems: 'center' }}>
            <Spin size="large" />
          </div>
        ) : classes.length === 0 ? (
          <Empty description="Belum ada data kelas pada homebase ini" />
        ) : (
          <Table
            rowKey="id"
            columns={classColumns}
            dataSource={classes}
            loading={isClassesFetching}
            pagination={{
              current: classPage,
              pageSize: 10,
              total: classesTotal,
              onChange: (nextPage) => setClassPage(nextPage),
              showSizeChanger: false,
              showTotal: (value) => `${value} kelas`,
            }}
            scroll={{ x: 760 }}
          />
        )}
      </Space>
    </Card>
  );

  const tabItems = [
    {
      key: 'ringkasan',
      label: (
        <Space size={6}>
          <InfoCircleOutlined />
          <span>Ringkasan</span>
        </Space>
      ),
      children: renderRingkasan(),
    },
    {
      key: 'guru',
      label: (
        <Space size={6}>
          <UserOutlined />
          <span>Guru</span>
        </Space>
      ),
      children: <HomebaseTeacherTab homebaseId={homebaseId} />,
    },
    {
      key: 'kelas',
      label: (
        <Space size={6}>
          <BankOutlined />
          <span>Kelas</span>
        </Space>
      ),
      children: renderKelas(),
    },
  ];

  return (
    <>
      <MotionDiv initial="hidden" animate="show" variants={itemVariants} style={{ display: 'grid', gap: 16 }}>
        <Card
          variant="borderless"
          style={{
            borderRadius: 24,
            background:
              'radial-gradient(circle at top left, rgba(14,165,233,0.18), transparent 28%), linear-gradient(135deg, #0f172a, #1d4ed8 58%, #0f766e)',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.18)',
          }}
          styles={{ body: { padding: isMobile ? 18 : 24 } }}>
          <Space orientation="vertical" size={14} style={{ width: '100%' }}>
            <Space wrap size={[10, 10]} style={{ width: '100%', justifyContent: 'space-between' }}>
              <Tag
                icon={<ApartmentOutlined />}
                style={{
                  width: 'fit-content',
                  margin: 0,
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.12)',
                  borderColor: 'rgba(255,255,255,0.2)',
                  color: '#e0f2fe',
                  paddingInline: 12,
                }}>
                Detail Satuan Pendidikan
              </Tag>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={onBack}
                style={{
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.92)',
                  borderColor: 'transparent',
                  fontWeight: 600,
                }}>
                Kembali
              </Button>
            </Space>

            <div>
              <Title
                level={3}
                style={{
                  margin: 0,
                  color: '#f8fafc',
                  fontSize: isMobile ? 22 : 28,
                }}>
                {homebase?.name || `Homebase #${homebaseId}`}
              </Title>
              <Text
                style={{
                  display: 'block',
                  marginTop: 8,
                  color: 'rgba(226, 232, 240, 0.92)',
                  maxWidth: 760,
                  lineHeight: 1.75,
                }}>
                Lihat ringkasan, daftar guru, dan kelas pada satuan pendidikan yang dipilih.
              </Text>
            </div>
          </Space>
        </Card>

        <Tabs
          activeKey={activeTab}
          onChange={onTabChange}
          items={tabItems}
          destroyOnHidden
        />
      </MotionDiv>

      <ModalClassStudents
        open={isStudentModalOpen}
        homebaseId={homebaseId}
        classData={selectedClass}
        onCancel={() => {
          setIsStudentModalOpen(false);
          setSelectedClass(null);
        }}
      />
    </>
  );
};

export default DetailHomebase;
