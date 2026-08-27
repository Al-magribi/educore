import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Alert, Card, Flex, Select, Tabs, Typography, theme } from 'antd';
import { motion } from 'framer-motion';
import { Building2, CalendarRange, GraduationCap, ScanLine, ScanSearch, TimerReset, UsersRound } from 'lucide-react';
import { useGetHomebaseQuery } from '../../../../service/center/ApiHomebase';
import { useGetPeriodesQuery } from '../../../../service/main/ApiPeriode';
import StudentReport from './StudentReport';
import TeacherReport from './TeacherReport';
import ScanLogReport from './ScanLogReport';
import { itemVariants } from '../config/configShared';
import { useResponsiveFlags } from './reportShared';

const { Text } = Typography;
const MotionDiv = motion.div;

const AUTO_REFRESH_OPTIONS = [
  { value: 0, label: 'Off' },
  { value: 60_000, label: '1 menit' },
  { value: 300_000, label: '5 menit' },
];

const AttendanceReport = () => {
  const { isMobile, isCompact } = useResponsiveFlags();
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
    <Flex align="center" gap={isMobile ? 8 : 10} style={{ minWidth: 0 }}>
      <span
        style={{
          width: isMobile ? 28 : 34,
          height: isMobile ? 28 : 34,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 10,
          background: 'linear-gradient(135deg, #e0f2fe, #dcfce7)',
          color: '#0f766e',
          border: '1px solid rgba(148, 163, 184, 0.14)',
          flexShrink: 0,
        }}>
        {icon}
      </span>
      <Flex vertical gap={0} style={{ minWidth: 0 }}>
        <span style={{ fontWeight: 600, lineHeight: 1.2, whiteSpace: 'nowrap' }}>{label}</span>
        {!isCompact && (
          <span
            style={{
              fontSize: 12,
              color: token.colorTextSecondary,
              lineHeight: 1.2,
              whiteSpace: 'nowrap',
            }}>
            {caption}
          </span>
        )}
      </Flex>
    </Flex>
  );

  const filterFieldStyle = (basis) => ({
    flex: isMobile ? '1 1 100%' : `1 1 ${basis}px`,
    minWidth: 0,
    maxWidth: '100%',
  });

  return (
    <MotionDiv variants={itemVariants} style={{ width: '100%', minWidth: 0 }}>
      <Flex vertical gap={isMobile ? 14 : 18} style={{ width: '100%', minWidth: 0 }}>
        <Flex
          justify="space-between"
          align={isCompact ? 'stretch' : 'flex-end'}
          vertical={isCompact}
          gap={12}
          style={{ width: '100%', minWidth: 0 }}>
          <Flex vertical gap={2} style={{ minWidth: 0, flex: 1 }}>
            <Flex align="center" gap={10} wrap="wrap">
              <ScanSearch size={18} color="#0f766e" />
              <Text strong style={{ color: '#0f172a', fontSize: isMobile ? 16 : 17 }}>
                Laporan Presensi
              </Text>
            </Flex>
            <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13 }}>
              Pantau log scan RFID mentah, rekap harian siswa, dan presensi guru.
            </Text>
          </Flex>

          <Flex
            gap={12}
            wrap="wrap"
            style={{
              width: isCompact ? '100%' : 'auto',
              minWidth: 0,
              justifyContent: isCompact ? 'flex-start' : 'flex-end',
            }}>
            <Flex vertical gap={4} style={filterFieldStyle(150)}>
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
                <Flex vertical gap={4} style={filterFieldStyle(240)}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Satuan
                  </Text>
                  <Select
                    showSearch={{ optionFilterProp: 'label' }}
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
                    popupMatchSelectWidth={false}
                    virtual={false}
                  />
                </Flex>
                <Flex vertical gap={4} style={filterFieldStyle(220)}>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Periode
                  </Text>
                  <Select
                    showSearch={{ optionFilterProp: 'label' }}
                    allowClear
                    placeholder={scopedHomebaseId ? 'Semua periode' : 'Pilih satuan dulu'}
                    loading={loadingPeriodes}
                    disabled={!scopedHomebaseId}
                    value={periodeId}
                    onChange={(value) => setPeriodeId(value)}
                    options={periodeOptions}
                    style={{ width: '100%' }}
                    suffixIcon={<CalendarRange size={14} />}
                    popupMatchSelectWidth={false}
                    virtual={false}
                  />
                </Flex>
              </>
            )}
          </Flex>
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
            tabBarGutter={isMobile ? 4 : 8}
            destroyOnHidden
            style={{ width: '100%', minWidth: 0 }}
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
