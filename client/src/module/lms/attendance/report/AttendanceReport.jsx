import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Flex, Select } from 'antd';
import {
  Briefcase,
  Building2,
  CalendarRange,
  GraduationCap,
  ScanLine,
  TimerReset,
  UsersRound,
} from 'lucide-react';
import { useGetHomebaseQuery } from '../../../../service/center/ApiHomebase';
import { useGetPeriodesQuery } from '../../../../service/main/ApiPeriode';
import StudentReport from './StudentReport';
import TeacherReport from './TeacherReport';
import StaffReport from './StaffReport';
import ScanLogReport from './ScanLogReport';
import { useResponsiveFlags } from './reportShared';

import PageHeader from '../../../../components/ui/PageHeader';
import { MuseCard, PageTabs } from '../../../../components/ui/muse';

const PAGE_TITLE = 'Laporan Presensi';
const PAGE_DESCRIPTION =
  'Pantau log scan RFID mentah, rekap harian siswa, presensi guru, dan presensi tendik.';

const AUTO_REFRESH_OPTIONS = [
  { value: 0, label: 'Update otomatis: mati' },
  { value: 60_000, label: 'Update tiap 1 menit' },
  { value: 300_000, label: 'Update tiap 5 menit' },
];

const AttendanceReport = () => {
  const { isMobile } = useResponsiveFlags();
  const user = useSelector((state) => state.auth.user);
  const isPusat = user?.role === 'admin' && user?.level === 'pusat';
  const [homebaseId, setHomebaseId] = useState();
  const [periodeId, setPeriodeId] = useState();
  const [autoRefreshMs, setAutoRefreshMs] = useState(0);

  const { data: homebaseRes, isLoading: loadingHomebases } = useGetHomebaseQuery(
    { page: 1, limit: 200, search: '' },
    { skip: !isPusat },
  );

  const scopedHomebaseId = isPusat ? homebaseId : undefined;

  const { data: periodeRes, isLoading: loadingPeriodes } = useGetPeriodesQuery(
    {
      page: 1,
      limit: 100,
      search: '',
      homebase_id: scopedHomebaseId,
    },
    { skip: !isPusat || !scopedHomebaseId },
  );

  const homebaseOptions = useMemo(
    () =>
      (homebaseRes?.data || []).map((item) => ({
        value: Number(item.id),
        label: item.name,
      })),
    [homebaseRes],
  );

  const periodeOptions = useMemo(
    () =>
      (periodeRes?.data || []).map((item) => ({
        value: Number(item.id),
        label: item.is_active ? `${item.name} (Aktif)` : item.name,
      })),
    [periodeRes],
  );

  useEffect(() => {
    if (!isPusat || homebaseId || homebaseOptions.length === 0) return;
    setHomebaseId(homebaseOptions[0].value);
  }, [isPusat, homebaseId, homebaseOptions]);

  useEffect(() => {
    if (!isPusat || !scopedHomebaseId) return;
    const rows = periodeRes?.data || [];
    if (rows.length === 0) {
      setPeriodeId(undefined);
      return;
    }
    const active = rows.find((item) => item.is_active);
    setPeriodeId(active ? Number(active.id) : Number(rows[0].id));
  }, [isPusat, scopedHomebaseId, periodeRes]);

  const waitingHomebase = isPusat && !scopedHomebaseId;
  const reportKey = `${scopedHomebaseId || 'local'}-${periodeId || 'all'}`;

  const scopeProps = {
    homebaseId: scopedHomebaseId,
    periodeId: isPusat ? periodeId : undefined,
    pollingInterval: autoRefreshMs,
  };

  const filters = (
    <>
      <Select
        aria-label='Update otomatis'
        value={autoRefreshMs}
        onChange={setAutoRefreshMs}
        options={AUTO_REFRESH_OPTIONS}
        style={{ width: isMobile ? '100%' : 200 }}
        suffixIcon={<TimerReset size={14} />}
        virtual={false}
      />
      {isPusat && (
        <>
          <Select
            aria-label='Satuan'
            showSearch={{ optionFilterProp: 'label' }}
            placeholder='Pilih satuan'
            loading={loadingHomebases}
            value={homebaseId}
            onChange={(value) => {
              setHomebaseId(value);
              setPeriodeId(undefined);
            }}
            options={homebaseOptions}
            style={{ width: isMobile ? '100%' : 240 }}
            suffixIcon={<Building2 size={14} />}
            popupMatchSelectWidth={false}
            virtual={false}
          />
          <Select
            aria-label='Periode'
            showSearch={{ optionFilterProp: 'label' }}
            allowClear
            placeholder={scopedHomebaseId ? 'Semua periode' : 'Pilih satuan dulu'}
            loading={loadingPeriodes}
            disabled={!scopedHomebaseId}
            value={periodeId}
            onChange={(value) => setPeriodeId(value)}
            options={periodeOptions}
            style={{ width: isMobile ? '100%' : 220 }}
            suffixIcon={<CalendarRange size={14} />}
            popupMatchSelectWidth={false}
            virtual={false}
          />
        </>
      )}
    </>
  );

  if (waitingHomebase) {
    return (
      <Flex vertical gap={24} style={{ width: '100%', minWidth: 0 }}>
        <PageHeader title={PAGE_TITLE} description={PAGE_DESCRIPTION} extra={filters} />
        <MuseCard>
          <Alert
            type='info'
            showIcon
            title='Pilih satuan terlebih dahulu'
            description='Admin pusat perlu memilih satuan (dan opsional periode) untuk melihat laporan presensi.'
          />
        </MuseCard>
      </Flex>
    );
  }

  return (
    <PageTabs
      title={PAGE_TITLE}
      description={PAGE_DESCRIPTION}
      extra={filters}
      items={[
        {
          key: 'scan-logs',
          label: 'Log Scan',
          icon: <ScanLine />,
          description: 'Semua scan RFID mentah dari perangkat.',
          render: () => <ScanLogReport key={reportKey} {...scopeProps} />,
        },
        {
          key: 'students',
          label: 'Presensi Siswa',
          icon: <GraduationCap />,
          description: 'Rekap kehadiran harian siswa.',
          render: () => <StudentReport key={reportKey} {...scopeProps} />,
        },
        {
          key: 'teachers',
          label: 'Presensi Guru',
          icon: <UsersRound />,
          description: 'Kehadiran harian dan per sesi kelas guru.',
          render: () => <TeacherReport key={reportKey} {...scopeProps} />,
        },
        {
          key: 'staff',
          label: 'Presensi Tendik',
          icon: <Briefcase />,
          description: 'Kehadiran harian tenaga kependidikan.',
          render: () => <StaffReport key={reportKey} {...scopeProps} />,
        },
      ]}
    />
  );
};

export default AttendanceReport;
