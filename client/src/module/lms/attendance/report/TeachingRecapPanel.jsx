import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import {
  Button,
  Card,
  DatePicker,
  Empty,
  Flex,
  Grid,
  Select,
  Table,
  Typography,
  message,
} from 'antd';
import { Download, RefreshCw } from 'lucide-react';
import { useGetTeacherTeachingRecapQuery } from '../../../../service/lms/ApiAttendance';

const { Text } = Typography;
const { useBreakpoint } = Grid;

const surfaceCardStyle = {
  borderRadius: 22,
  border: '1px solid #e5edf6',
  background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
  boxShadow: '0 18px 36px rgba(15, 23, 42, 0.06)',
};

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
  const screens = useBreakpoint();
  const isMobile = !screens.md;
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
        ellipsis: true,
        render: (_, row) => (
          <Flex vertical gap={2}>
            <Text strong ellipsis>
              {row.teacher_name}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              RFID {row.card_uid || '-'} · NIP {row.nip || '-'}
            </Text>
          </Flex>
        ),
      },
      {
        title: 'Mengajar',
        ellipsis: true,
        render: (_, row) => (
          <Flex vertical gap={2}>
            <Text strong ellipsis>
              {row.subject_name || '-'}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
              Kelas {row.class_name || '-'}
            </Text>
          </Flex>
        ),
      },
      {
        title: 'Hadir (sesi)',
        dataIndex: 'attended_tap',
        width: 120,
      },
      {
        title: 'Seharusnya (sesi)',
        dataIndex: 'should_attend',
        width: 140,
      },
      {
        title: 'Belum tap (sesi)',
        dataIndex: 'belum_tap',
        width: 130,
      },
      {
        title: 'Persentase',
        dataIndex: 'attendance_rate',
        width: 110,
        render: (value) => `${Number(value || 0).toFixed(2)}%`,
      },
    ],
    [],
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
    <Flex vertical gap={16}>
      <Flex gap="middle" vertical={isMobile} wrap="wrap">
        <DatePicker
          picker="month"
          value={month}
          onChange={(value) => setMonth(value)}
          format="MMMM YYYY"
          style={{ width: isMobile ? '100%' : 200 }}
          allowClear={false}
        />
        <Select
          showSearch={{ optionFilterProp: 'label' }}
          virtual={false}
          allowClear
          value={classId}
          onChange={setClassId}
          placeholder="Filter kelas"
          options={classOptions}
          style={{ width: isMobile ? '100%' : 200 }}
        />
        <Button
          icon={<Download size={16} />}
          onClick={handleDownload}
          disabled={!byClass.length}
          style={{ width: isMobile ? '100%' : undefined }}>
          Download Rekap
        </Button>
        <Button
          icon={<RefreshCw size={16} />}
          loading={isFetching}
          onClick={() => refetch()}
          style={{ width: isMobile ? '100%' : undefined }}>
          Refresh
        </Button>
      </Flex>

      <Text type="secondary">
        Perhitungan per sesi (jam pelajaran) dari master jadwal aktif. Contoh: Bahasa Inggris 8C 4
        sesi/minggu → ±16 sesi/bulan. <Text strong>Seharusnya</Text> = jumlah sesi terjadwal pada
        bulan dipilih. <Text strong>Hadir</Text> = sesi dengan tap classroom berstatus{' '}
        <Text code>present</Text>/<Text code>late</Text> dalam rentang waktu jadwal. Satu blok
        multi-jam dihitung sesuai jumlah sesinya (mis. jam 6–7 = 2 sesi).
      </Text>

      <Card style={surfaceCardStyle} bordered={false}>
        {rows.length === 0 && !isLoading && !isFetching ? (
          <Empty description="Belum ada data rekapitulasi mengajar pada bulan ini." />
        ) : (
          <Table
            rowKey={(row) => `${row.class_id}-${row.teacher_id}-${row.subject_id || 'none'}`}
            loading={isLoading || (isFetching && rows.length > 0)}
            dataSource={rows}
            columns={columns}
            pagination={{
              pageSize,
              showSizeChanger: true,
              pageSizeOptions: ['10', '20', '50', '100'],
              showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} baris`,
              onChange: (_page, size) => setPageSize(size),
            }}
          />
        )}
      </Card>
    </Flex>
  );
};

export default TeachingRecapPanel;
