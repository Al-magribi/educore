import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Card, Flex, Grid, Select, Space, Tabs, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { Building2, CalendarRange, GraduationCap, ScanLine, ScanSearch, TimerReset, UsersRound } from 'lucide-react';
import { useGetHomebaseQuery } from '../../../../service/center/ApiHomebase';
import { useGetPeriodesQuery } from '../../../../service/main/ApiPeriode';
import StudentReport from './StudentReport';
import TeacherReport from './TeacherReport';
import ScanLogReport from './ScanLogReport';
import { itemVariants } from '../config/configShared';

const { Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const AUTO_REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 60_000, label: '1 menit' },
  { value: 300_000, label: '5 menit' },
];

const AttendanceReport = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const { token } = theme.useToken();
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

  const createTabLabel = (label, icon, caption) => (
    <Flex align="center" gap={10}>
      <span
        style={{
          width: 34,
          height: 34,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 12,
          background: 'linear-gradient(135deg, #e0f2fe, #dcfce7)',
          color: '#0f766e',
          border: '1px solid rgba(148, 163, 184, 0.14)',
          flexShrink: 0,
        }}>
        {icon}
      </span>
      <Flex vertical gap={0}>
        <span style={{ fontWeight: 600, lineHeight: 1.2 }}>{label}</span>
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

  return (
    <MotionDiv variants={itemVariants}>
      <Flex vertical gap={18}>
        <Flex justify="space-between" align={isMobile ? 'stretch' : 'center'} vertical={isMobile} gap={12}>
          <div>
            <Flex align="center" gap={10} wrap="wrap">
              <ScanSearch size={18} color="#0f766e" />
              <Text strong style={{ color: '#0f172a', fontSize: 17 }}>
                Laporan Presensi
              </Text>
            </Flex>
            <Text type="secondary">Pantau log scan RFID mentah, rekap harian siswa, dan presensi guru.</Text>
          </div>

          <Space
            wrap
            size={12}
            style={{ width: isMobile ? '100%' : 'auto', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
            <Flex vertical gap={4} style={{ minWidth: isMobile ? '100%' : 160 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                Update otomatis
              </Text>
              <Select
                value={autoRefreshMs}
                onChange={setAutoRefreshMs}
                options={AUTO_REFRESH_OPTIONS}
                style={{ width: '100%' }}
                suffixIcon={<TimerReset size={14} />}
                virtual={false}
              />
            </Flex>

            {isPusat && (
              <>
                <Flex vertical gap={4} style={{ minWidth: isMobile ? '100%' : 260 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Satuan
                  </Text>
                  <Select
                    showSearch
                    optionFilterProp="label"
                    placeholder="Pilih satuan"
                    loading={loadingHomebases}
                    value={homebaseId}
                    onChange={(value) => {
                      setHomebaseId(value);
                      setPeriodeId(undefined);
                    }}
                    options={homebaseOptions}
                    style={{ width: '100%' }}
                    suffixIcon={<Building2 size={14} />}
                    virtual={false}
                  />
                </Flex>
                <Flex vertical gap={4} style={{ minWidth: isMobile ? '100%' : 240 }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Periode
                  </Text>
                  <Select
                    showSearch
                    allowClear
                    optionFilterProp="label"
                    placeholder={scopedHomebaseId ? 'Semua periode' : 'Pilih satuan dulu'}
                    loading={loadingPeriodes}
                    disabled={!scopedHomebaseId}
                    value={periodeId}
                    onChange={(value) => setPeriodeId(value)}
                    options={periodeOptions}
                    style={{ width: '100%' }}
                    suffixIcon={<CalendarRange size={14} />}
                    virtual={false}
                  />
                </Flex>
              </>
            )}
          </Space>
        </Flex>

        {waitingHomebase ? (
          <Card>
            <Alert
              type="info"
              showIcon
              message="Pilih satuan terlebih dahulu"
              description="Admin pusat perlu memilih satuan (dan opsional periode) untuk melihat laporan presensi."
            />
          </Card>
        ) : (
          <Tabs
            defaultActiveKey="scan-logs"
            size={isMobile ? 'middle' : 'large'}
            tabBarGutter={8}
            destroyOnHidden
            items={[
              {
                key: 'scan-logs',
                label: createTabLabel('Log Scan', <ScanLine size={16} />, 'Semua scan RFID'),
                children: (
                  <ScanLogReport
                    key={reportKey}
                    homebaseId={scopedHomebaseId}
                    periodeId={isPusat ? periodeId : undefined}
                    pollingInterval={autoRefreshMs}
                  />
                ),
              },
              {
                key: 'students',
                label: createTabLabel('Presensi Siswa', <GraduationCap size={16} />, 'Harian siswa'),
                children: (
                  <StudentReport
                    key={reportKey}
                    homebaseId={scopedHomebaseId}
                    periodeId={isPusat ? periodeId : undefined}
                    pollingInterval={autoRefreshMs}
                  />
                ),
              },
              {
                key: 'teachers',
                label: createTabLabel('Presensi Guru', <UsersRound size={16} />, 'Harian & sesi'),
                children: (
                  <TeacherReport
                    key={reportKey}
                    homebaseId={scopedHomebaseId}
                    periodeId={isPusat ? periodeId : undefined}
                    pollingInterval={autoRefreshMs}
                  />
                ),
              },
            ]}
          />
        )}
      </Flex>
    </MotionDiv>
  );
};

export default AttendanceReport;
