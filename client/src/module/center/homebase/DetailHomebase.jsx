import React, { useEffect, useMemo, useState } from 'react';
import {
  Breadcrumb,
  Button,
  Col,
  Empty,
  Flex,
  Grid,
  Input,
  Progress,
  Row,
  Select,
  Skeleton,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import {
  ArrowLeft,
  BookOpen,
  CalendarDays,
  GraduationCap,
  LayoutDashboard,
  Mars,
  School,
  Search,
  UsersRound,
  Venus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import PageHeader from '../../../components/ui/PageHeader';
import { CardTitle, IconBox, MuseCard, StatCard } from '../../../components/ui/muse';
import { museColors, museRadius } from '../../../config/theme';
import {
  useDetailHomebaseQuery,
  useGetHomebaseClassesQuery,
} from '../../../service/center/ApiHomebase';
import ModalClassStudents from './ModalClassStudents';
import HomebaseTeacherTab from './HomebaseTeacherTab';

const { Text } = Typography;
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
        icon: <UsersRound size={24} />,
        tone: 'warning',
      },
      {
        key: 'students',
        title: 'Total Siswa',
        value: Number(stats.students?.total || 0),
        icon: <GraduationCap size={24} />,
        tone: 'primary',
      },
      {
        key: 'classes',
        title: 'Total Kelas',
        value: Number(stats.classes?.total || 0),
        icon: <School size={24} />,
        tone: 'navy',
      },
      {
        key: 'subjects',
        title: 'Total Pelajaran',
        value: Number(stats.subjects?.total || 0),
        icon: <BookOpen size={24} />,
        tone: 'success',
      },
    ],
    [stats],
  );

  const classColumns = useMemo(
    () => [
      {
        title: 'KELAS',
        dataIndex: 'name',
        key: 'name',
        render: (value, record) => (
          <div>
            <Text strong style={{ display: 'block' }}>
              {value || '-'}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {[record.grade_name, record.major_name].filter(Boolean).join(' · ') || 'Tanpa tingkat/jurusan'}
            </Text>
          </div>
        ),
      },
      {
        title: 'WALI KELAS',
        dataIndex: 'homeroom_teacher',
        key: 'homeroom_teacher',
        render: (value) => value || '-',
      },
      {
        title: 'JUMLAH SISWA',
        dataIndex: 'students_count',
        key: 'students_count',
        width: 140,
        render: (value) => <Text strong>{Number(value || 0)} siswa</Text>,
      },
      {
        title: 'STATUS',
        dataIndex: 'is_active',
        key: 'is_active',
        width: 110,
        render: (value) => (
          <Tag color={value ? 'success' : 'default'} style={{ margin: 0 }}>
            {value ? 'Aktif' : 'Nonaktif'}
          </Tag>
        ),
      },
      {
        title: 'AKSI',
        key: 'action',
        width: 120,
        render: (_, record) => (
          <Button
            type="link"
            icon={<UsersRound size={16} />}
            onClick={() => {
              setSelectedClass(record);
              setIsStudentModalOpen(true);
            }}
            style={{ paddingInline: 0 }}>
            Siswa
          </Button>
        ),
      },
    ],
    [],
  );

  const periodSelect = (
    <Select
      aria-label="Pilih periode"
      style={{ width: isMobile ? '100%' : 240 }}
      value={detailSelectedPeriodeId ? Number(detailSelectedPeriodeId) : undefined}
      onChange={(val) => setPeriodeId(val)}
      placeholder="Pilih Periode"
      loading={isDetailFetching}
      prefix={<CalendarDays size={16} color={museColors.muted} />}
      options={periods.map((p) => ({
        value: p.id,
        label: `${p.name}${p.is_active ? ' · Aktif' : ''}`,
      }))}
    />
  );

  const genderTile = (icon, label, value, tone) => (
    <Flex align="center" gap={12}>
      <IconBox icon={icon} tone={tone} size={40} />
      <div>
        <Text type="secondary" style={{ display: 'block', fontSize: 12, fontWeight: 600 }}>
          {label}
        </Text>
        <Text strong style={{ fontSize: 20, fontWeight: 700 }}>
          {value}
        </Text>
      </div>
    </Flex>
  );

  const renderRingkasan = () => {
    if (isDetailLoading) {
      return (
        <Row gutter={[24, 24]}>
          {[0, 1, 2, 3].map((key) => (
            <Col xs={24} sm={12} lg={6} key={key}>
              <MuseCard>
                <Skeleton active paragraph={{ rows: 1 }} />
              </MuseCard>
            </Col>
          ))}
        </Row>
      );
    }

    return (
      <Flex vertical gap={24}>
        <Flex justify="space-between" align="center" gap={12} wrap>
          <Text type="secondary">Pilih periode untuk melihat ringkasan yang relevan.</Text>
          {periodSelect}
        </Flex>

        <Row gutter={[24, 24]}>
          {cards.map(({ key, ...item }) => (
            <Col xs={24} sm={12} lg={6} key={key}>
              <MotionDiv variants={itemVariants} style={{ height: '100%' }}>
                <StatCard {...item} />
              </MotionDiv>
            </Col>
          ))}
        </Row>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={16}>
            <MuseCard
              title={
                <CardTitle title="Komposisi Siswa per Kelas" description="Sebaran siswa laki-laki dan perempuan." />
              }>
              {composition.length === 0 ? (
                <Empty description="Belum ada kelas atau siswa pada periode ini" />
              ) : (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))',
                    gap: 16,
                    maxHeight: 460,
                    overflowY: 'auto',
                    paddingRight: 4,
                  }}>
                  {composition.map((cls, idx) => {
                    const total = Number(cls.total_students || 0);
                    const malePct = total ? Math.round((Number(cls.laki || 0) / total) * 100) : 0;
                    return (
                      <div
                        key={`${cls.class_name}-${idx}`}
                        style={{
                          borderRadius: museRadius.card,
                          border: `1px solid ${museColors.divider}`,
                          padding: 16,
                        }}>
                        <Flex justify="space-between" align="baseline" gap={8}>
                          <Text strong ellipsis style={{ fontSize: 15 }}>
                            {cls.class_name}
                          </Text>
                          <Text strong style={{ fontSize: 20, fontWeight: 700, whiteSpace: 'nowrap' }}>
                            {total}
                            <small
                              style={{ fontSize: 12, fontWeight: 600, color: museColors.muted, marginLeft: 4 }}>
                              siswa
                            </small>
                          </Text>
                        </Flex>
                        <Progress
                          percent={total ? 100 : 0}
                          success={{ percent: malePct, strokeColor: museColors.primary }}
                          strokeColor={museColors.female}
                          showInfo={false}
                          size={['100%', 6]}
                          style={{ margin: '8px 0' }}
                        />
                        <Flex justify="space-between" gap={8}>
                          <Flex align="center" gap={4}>
                            <Mars size={12} color={museColors.primary} />
                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                              Laki-laki {cls.laki}
                            </Text>
                          </Flex>
                          <Flex align="center" gap={4}>
                            <Venus size={12} color={museColors.female} />
                            <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                              Perempuan {cls.perempuan}
                            </Text>
                          </Flex>
                        </Flex>
                      </div>
                    );
                  })}
                </div>
              )}
            </MuseCard>
          </Col>

          <Col xs={24} lg={8}>
            <MuseCard
              style={{ height: '100%' }}
              title={<CardTitle title="Komposisi Guru" description="Berdasarkan jenis kelamin." />}>
              <Flex vertical gap={20}>
                {genderTile(<Mars size={20} />, 'Laki-laki', teacherMale, 'primary')}
                {genderTile(<Venus size={20} />, 'Perempuan', teacherFemale, 'female')}
                <div>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                    Proporsi guru laki-laki
                  </Text>
                  <Progress
                    percent={totalTeacherGender ? Math.round((teacherMale / totalTeacherGender) * 100) : 0}
                    size={['100%', 6]}
                  />
                </div>
              </Flex>
            </MuseCard>
          </Col>
        </Row>
      </Flex>
    );
  };

  const renderKelas = () => (
    <MuseCard
      flush
      title={<CardTitle title="Daftar Kelas" description={`${classesTotal} kelas terdaftar`} />}
      extra={
        <Flex gap={8} wrap style={{ padding: '8px 0' }}>
          <Input
            aria-label="Cari kelas"
            allowClear
            placeholder="Cari kelas..."
            prefix={<Search size={16} color={museColors.muted} />}
            value={classSearch}
            onChange={(e) => setClassSearch(e.target.value)}
            style={{ width: isMobile ? '100%' : 240 }}
          />
          <Select
            aria-label="Periode jumlah siswa"
            style={{ width: isMobile ? '100%' : 220 }}
            value={selectedClassPeriodeId ? Number(selectedClassPeriodeId) : undefined}
            onChange={(val) => {
              setClassPeriodeId(val);
              setClassPage(1);
            }}
            placeholder="Periode (jumlah siswa)"
            prefix={<CalendarDays size={16} color={museColors.muted} />}
            options={classPeriods.map((p) => ({
              value: p.id,
              label: `${p.name}${p.is_active ? ' · Aktif' : ''}`,
            }))}
          />
        </Flex>
      }>
      {isClassesLoading ? (
        <div style={{ padding: 24 }}>
          <Skeleton active paragraph={{ rows: 4 }} />
        </div>
      ) : classes.length === 0 ? (
        <Empty style={{ padding: 32 }} description="Belum ada data kelas pada satuan ini" />
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
            style: { paddingInline: 24 },
          }}
          scroll={{ x: 760 }}
        />
      )}
    </MuseCard>
  );

  const tabItems = [
    {
      key: 'ringkasan',
      label: 'Ringkasan',
      icon: <LayoutDashboard size={16} />,
      children: renderRingkasan(),
    },
    {
      key: 'guru',
      label: 'Guru',
      icon: <UsersRound size={16} />,
      children: <HomebaseTeacherTab homebaseId={homebaseId} />,
    },
    {
      key: 'kelas',
      label: 'Kelas',
      icon: <School size={16} />,
      children: renderKelas(),
    },
  ];

  const homebaseName = homebase?.name || `Satuan #${homebaseId}`;

  return (
    <>
      <MotionDiv initial="hidden" animate="show" variants={itemVariants} style={{ display: 'grid', gap: 16 }}>
        <Breadcrumb
          items={[
            {
              title: (
                <a href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>
                  Satuan Pendidikan
                </a>
              ),
            },
            { title: homebaseName },
          ]}
        />
        <PageHeader
          title={homebaseName}
          description="Ringkasan, daftar guru, dan kelas pada satuan pendidikan yang dipilih."
          extra={
            <Button icon={<ArrowLeft size={16} />} onClick={onBack}>
              Kembali
            </Button>
          }
        />

        <Tabs activeKey={activeTab} onChange={onTabChange} items={tabItems} destroyOnHidden />
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
