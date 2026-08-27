import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { Button, Card, DatePicker, Empty, Flex, Select, Table, Typography, message } from 'antd';
import { Download, RefreshCw } from 'lucide-react';
import { useGetTeacherTeachingRecapQuery } from '../../../../service/lms/ApiAttendance';
import {
  FilterBar,
  StackedCell,
  buildPagination,
  buildTableProps,
  filterControlStyle,
  surfaceCardBodyStyles,
  surfaceCardStyle,
  tableShellStyle,
  toolbarButtonStyle,
  useResponsiveFlags,
} from './reportShared';

const { Text } = Typography;

const sanitizeSheetName = (name) => {
  const cleaned = String(name || 'Kelas')
    .replace(/[\\/?*[\]:]/g, ' ')
    .trim()
    .slice(0, 31);
  return cleaned || 'Kelas';
};

const TeachingRecapPanel = ({
  homebaseId,
  periodeId,
  classOptions = [],
  pollingInterval = 0,
}) => {
  const { isMobile } = useResponsiveFlags();
  const [month, setMonth] = useState(dayjs());
  const [classId, setClassId] = useState();
  const [pageSize, setPageSize] = useState(20);

  const monthValue = month?.format('YYYY-MM');
  const { data, isLoading, isFetching, refetch } = useGetTeacherTeachingRecapQuery(
    {
      month: monthValue,
      classId,
      homebaseId,
      periodeId,
    },
    {
      skip: !monthValue,
      pollingInterval: pollingInterval || 0,
    },
  );

  const rows = data?.data?.rows || [];
  const byClass = data?.data?.by_class || [];

  const columns = useMemo(
    () => [
      {
        title: 'Guru',
        key: 'teacher',
        width: isMobile ? 170 : 240,
        fixed: 'left',
        ellipsis: true,
        render: (_, row) => (
          <StackedCell
            primary={row.teacher_name}
            secondary={
              isMobile
                ? `NIP ${row.nip || '-'}`
                : `RFID ${row.card_uid || '-'} · NIP ${row.nip || '-'}`
            }
          />
        ),
      },
      {
        title: 'Mengajar',
        key: 'subject',
        width: isMobile ? 150 : 210,
        ellipsis: true,
        render: (_, row) => (
          <StackedCell primary={row.subject_name} secondary={`Kelas ${row.class_name || '-'}`} />
        ),
      },
      {
        title: isMobile ? 'Hadir' : 'Hadir (sesi)',
        dataIndex: 'attended_tap',
        width: isMobile ? 84 : 105,
        align: 'center',
        render: (value) => Number(value || 0),
      },
      {
        title: isMobile ? 'Seharusnya' : 'Seharusnya (sesi)',
        dataIndex: 'should_attend',
        width: isMobile ? 104 : 130,
        align: 'center',
        render: (value) => Number(value || 0),
      },
      {
        title: isMobile ? 'Belum Tap' : 'Belum tap (sesi)',
        dataIndex: 'belum_tap',
        width: isMobile ? 100 : 125,
        align: 'center',
        render: (value) => Number(value || 0),
      },
      {
        title: 'Persentase',
        dataIndex: 'attendance_rate',
        width: isMobile ? 100 : 120,
        align: 'center',
        render: (value) => {
          const rate = Number(value || 0);
          const color = rate >= 90 ? '#15803d' : rate >= 70 ? '#a16207' : '#b91c1c';
          return (
            <Text strong style={{ color, whiteSpace: 'nowrap' }}>
              {rate.toFixed(2)}%
            </Text>
          );
        },
      },
    ],
    [isMobile],
  );

  const handleDownload = () => {
    if (!byClass.length) {
      message.warning('Tidak ada data rekapitulasi untuk diunduh.');
      return;
    }

    const workbook = XLSX.utils.book_new();
    const usedNames = new Set();

    byClass.forEach((group) => {
      let sheetName = sanitizeSheetName(group.class_name);
      let suffix = 1;
      while (usedNames.has(sheetName)) {
        const base = sanitizeSheetName(group.class_name).slice(0, 28);
        sheetName = `${base}_${suffix}`;
        suffix += 1;
      }
      usedNames.add(sheetName);

      const exportRows = (group.rows || []).map((row, index) => ({
        No: index + 1,
        Guru: row.teacher_name,
        NIP: row.nip || '-',
        'No RFID': row.card_uid || '-',
        'Mata Pelajaran': row.subject_name || '-',
        Kelas: row.class_name,
        'Hadir (sesi present+late)': row.attended_tap,
        'Seharusnya (sesi)': row.should_attend,
        'Belum tap (sesi)': row.belum_tap,
        Excused: row.excused_count,
        Partial: row.partial_count,
        'Persentase (%)': row.attendance_rate,
      }));

      const worksheet = XLSX.utils.json_to_sheet(exportRows);
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    XLSX.writeFile(workbook, `Rekap_Mengajar_${monthValue || 'bulan'}.xlsx`);
  };

  return (
    <Flex vertical gap={16} style={{ width: '100%', minWidth: 0 }}>
      <FilterBar isMobile={isMobile}>
        <DatePicker
          picker="month"
          value={month}
          onChange={(value) => setMonth(value)}
          format="MMMM YYYY"
          allowClear={false}
          inputReadOnly={isMobile}
          style={filterControlStyle(isMobile, 200)}
        />
        <Select
          showSearch={{ optionFilterProp: 'label' }}
          virtual={false}
          allowClear
          popupMatchSelectWidth={false}
          value={classId}
          onChange={setClassId}
          placeholder="Filter kelas"
          options={classOptions}
          style={filterControlStyle(isMobile, 180)}
        />
        <Button
          icon={<Download size={16} />}
          onClick={handleDownload}
          disabled={!byClass.length}
          style={toolbarButtonStyle(isMobile)}>
          Download Rekap
        </Button>
        <Button
          icon={<RefreshCw size={16} />}
          loading={isFetching}
          onClick={() => refetch()}
          style={toolbarButtonStyle(isMobile)}>
          Refresh
        </Button>
      </FilterBar>

      <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13 }}>
        Perhitungan per sesi (jam pelajaran) dari master jadwal aktif. Contoh: Bahasa Inggris 8C 4
        sesi/minggu → ±16 sesi/bulan. <Text strong>Seharusnya</Text> = jumlah sesi terjadwal pada
        bulan dipilih. <Text strong>Hadir</Text> = sesi dengan tap classroom berstatus{' '}
        <Text code>present</Text>/<Text code>late</Text> dalam rentang waktu jadwal. Satu blok
        multi-jam dihitung sesuai jumlah sesinya (mis. jam 6–7 = 2 sesi).
      </Text>

      <Card variant="borderless" style={surfaceCardStyle} styles={surfaceCardBodyStyles(isMobile)}>
        {rows.length === 0 && !isLoading && !isFetching ? (
          <Empty description="Belum ada data rekapitulasi mengajar pada bulan ini." />
        ) : (
          <div style={tableShellStyle}>
            <Table
              rowKey={(row) => `${row.class_id}-${row.teacher_id}-${row.subject_id || 'none'}`}
              loading={isLoading || (isFetching && rows.length > 0)}
              dataSource={rows}
              columns={columns}
              {...buildTableProps({ isMobile, minWidth: isMobile ? 720 : 930 })}
              pagination={buildPagination({ pageSize, setPageSize, isMobile, unit: 'baris' })}
            />
          </div>
        )}
      </Card>
    </Flex>
  );
};

export default TeachingRecapPanel;
