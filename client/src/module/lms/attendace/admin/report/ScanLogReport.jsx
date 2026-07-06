import { useState } from 'react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import {
  Button,
  Card,
  DatePicker,
  Descriptions,
  Empty,
  Flex,
  Grid,
  Input,
  Modal,
  Select,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { AlertTriangle, BookOpen, ClipboardX, Download, RefreshCw, ScanLine, Search, Trash2 } from 'lucide-react';
import {
  useBulkDeleteAttendanceScanLogsMutation,
  useDeleteAttendanceScanLogMutation,
  useGetAttendanceScanLogReportQuery,
  useGetRfidDevicesQuery,
} from '../../../../../service/lms/ApiAttendance';

const { RangePicker } = DatePicker;
const { Text, Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;

const surfaceCardStyle = {
  borderRadius: 22,
  border: '1px solid #e5edf6',
  background: 'linear-gradient(180deg, #ffffff 0%, #fbfdff 100%)',
  boxShadow: '0 18px 36px rgba(15, 23, 42, 0.06)',
};

const statCardStyle = {
  borderRadius: 18,
  border: '1px solid #e2ebf5',
  background: '#ffffff',
  boxShadow: '0 12px 28px rgba(15, 23, 42, 0.05)',
};

const RESULT_STATUS_COLORS = {
  accepted: 'green',
  duplicate: 'gold',
  rejected: 'red',
  unregistered: 'red',
  out_of_window: 'volcano',
  card_inactive: 'orange',
  device_inactive: 'orange',
  user_inactive: 'magenta',
  policy_missing: 'purple',
  not_scheduled: 'blue',
};

const isUnregisteredScan = (row) =>
  row?.result_status === 'unregistered' ||
  (row?.result_status === 'rejected' && String(row?.rejection_reason || '').toLowerCase().includes('tidak terdaftar'));

const resolveResultStatus = (row) => (isUnregisteredScan(row) ? 'unregistered' : row?.result_status);

const formatScanTimeCell = (value) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YY HH:mm') : value;
};

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return value;
};

const formatRawPayload = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  return JSON.stringify(value, null, 2);
};

const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

const GUIDE_RESULT_ITEMS = [
  {
    status: 'accepted',
    label: 'Accepted (Diterima)',
    description:
      'Tap kartu lolos validasi (device, token, kartu, user, duplikat, jendela waktu). Scan dicatat dan diproses ke presensi harian atau sesi kelas. Kolom Result tetap accepted meskipun status presensi harian bisa present, late, atau not_scheduled.',
  },
  {
    status: 'duplicate',
    label: 'Duplicate (Duplikat)',
    description:
      'Tap ditolak karena sudah ada scan yang sama dalam rentang debounce (5 menit) atau check-in/check-out hari itu sudah tercatat. Contoh: tap datang dua kali, tap pulang terlalu cepat (< 15 menit setelah datang), atau tap ketiga setelah datang+pulang lengkap.',
  },
  {
    status: 'rejected',
    label: 'Rejected (Ditolak)',
    description:
      'Tap gagal validasi dasar: token device salah atau data request tidak valid. Perbaiki konfigurasi firmware (DEVICE_CODE, DEVICE_TOKEN).',
  },
  {
    status: 'unregistered',
    label: 'Unregistered (Kartu Tidak Terdaftar)',
    description:
      'UID kartu tidak terdaftar di sistem. Daftarkan kartu di admin RFID user agar tap dapat diproses.',
  },
  {
    status: 'out_of_window',
    label: 'Out of Window (Di Luar Jendela Waktu)',
    description:
      'Tap di luar jam check-in atau check-out yang diatur policy untuk hari tersebut. Scan tidak membentuk/mengubah presensi harian. Perluas jendela waktu di policy atau tap pada jam yang diizinkan.',
  },
  {
    status: 'card_inactive',
    label: 'Card Inactive (Kartu Nonaktif)',
    description:
      'UID kartu terdaftar tetapi status kartu RFID dinonaktifkan di admin. Aktifkan kartu di data RFID user.',
  },
  {
    status: 'device_inactive',
    label: 'Device Inactive (Device Nonaktif)',
    description:
      'Device dikenali tetapi statusnya nonaktif di tab Device RFID. Aktifkan device sebelum digunakan di lapangan.',
  },
  {
    status: 'user_inactive',
    label: 'User Inactive (User Nonaktif)',
    description: 'Pemilik kartu ada di sistem tetapi akun user dinonaktifkan. Aktifkan user terlebih dahulu.',
  },
  {
    status: 'policy_missing',
    label: 'Policy Missing (Policy Tidak Ditemukan)',
    description:
      'User tidak memiliki policy absensi yang aktif melalui assignment (user/kelas/grade/homebase). Petakan policy di tab Assignment agar tap bisa dievaluasi.',
  },
  {
    status: 'not_scheduled',
    label: 'Not Scheduled (Tidak Berjadwal)',
    description:
      'Status ini jarang muncul di kolom Result scan. Umumnya tap guru tanpa jadwal tetap accepted di log scan, sedangkan status not_scheduled tercatat di presensi harian (Laporan Presensi Guru).',
  },
];

const ScanLogGuideModal = ({ open, onClose, isMobile }) => (
  <Modal
    title="Panduan Log Scan RFID"
    open={open}
    onCancel={onClose}
    footer={null}
    centered
    width={isMobile ? '100%' : 760}>
    <Flex vertical gap={20}>
      <div>
        <Title level={5} style={{ marginTop: 0 }}>
          Apa yang ditampilkan di laporan ini?
        </Title>
        <Paragraph style={{ marginBottom: 0 }}>
          Laporan ini menampilkan <Text strong>semua percobaan tap kartu RFID</Text> dari device gate dan classroom —
          baik yang diterima maupun ditolak. Setiap baris adalah satu event scan mentah dari alat, berguna untuk audit,
          troubleshooting koneksi device, dan investigasi tap yang gagal.
        </Paragraph>
      </div>

      <div>
        <Title level={5} style={{ marginTop: 0 }}>
          Alur sistem saat kartu di-tap
        </Title>
        <Flex vertical gap={10}>
          {[
            'Device RFID (ESP32) mengirim UID kartu, kode device, token, dan scan_action ke server.',
            'Server memvalidasi device (aktif, token benar) dan kartu (terdaftar, aktif, user aktif).',
            'Untuk device gate dengan daily_gate: server menentukan otomatis tap datang atau pulang.',
            'Server mengecek duplikat dan jendela waktu policy (check-in / check-out).',
            'Jika lolos, scan disimpan dengan Result accepted dan diproses ke presensi harian atau sesi kelas.',
            'Jika gagal, scan tetap dicatat dengan Result sesuai penyebab penolakan beserta alasan di detail log.',
          ].map((step, index) => (
            <Flex key={step} gap={10} align="flex-start">
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: '50%',
                  background: '#eff6ff',
                  color: '#1d4ed8',
                  display: 'grid',
                  placeItems: 'center',
                  fontSize: 12,
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                {index + 1}
              </span>
              <Text>{step}</Text>
            </Flex>
          ))}
        </Flex>
      </div>

      <div>
        <Title level={5} style={{ marginTop: 0 }}>
          Perbedaan Result vs status presensi
        </Title>
        <Flex vertical gap={8}>
          <Paragraph style={{ marginBottom: 0 }}>
            <Text strong>Result (kolom di laporan ini)</Text> = hasil validasi <Text strong>scan RFID</Text> itu sendiri
            (diterima sistem atau ditolak).
          </Paragraph>
          <Paragraph style={{ marginBottom: 0 }}>
            <Text strong>Status presensi</Text> (present, late, not_scheduled, dll.) ada di{' '}
            <Text strong>Laporan Presensi Siswa/Guru</Text> — dievaluasi setelah scan accepted diproses sesuai policy.
          </Paragraph>
          <Paragraph style={{ marginBottom: 0 }}>
            Contoh: guru tap di hari libur → Result bisa <Tag color={RESULT_STATUS_COLORS.accepted}>accepted</Tag>,
            tetapi status harian di laporan guru = <Tag color={RESULT_STATUS_COLORS.not_scheduled}>not_scheduled</Tag>.
          </Paragraph>
        </Flex>
      </div>

      <div>
        <Title level={5} style={{ marginTop: 0 }}>
          Penjelasan setiap Result
        </Title>
        <Flex vertical gap={12}>
          {GUIDE_RESULT_ITEMS.map((item) => (
            <Flex key={item.status} gap={10} align="flex-start">
              <Tag color={RESULT_STATUS_COLORS[item.status] || 'default'} style={{ marginTop: 2 }}>
                {item.status}
              </Tag>
              <div>
                <Text strong>{item.label}</Text>
                <div>
                  <Text type="secondary">{item.description}</Text>
                </div>
              </div>
            </Flex>
          ))}
        </Flex>
      </div>

      <div>
        <Title level={5} style={{ marginTop: 0 }}>
          Hal lain yang perlu diketahui admin
        </Title>
        <Flex vertical gap={8}>
          <Text>
            • Kartu statistik <Text strong>Butuh Tindak Lanjut</Text> menjumlahkan rejected, unregistered,
            out_of_window, dan status terkait kartu/device/user/policy yang perlu perbaikan konfigurasi.
          </Text>
          <Text>
            • Filter <Text strong>device</Text> dan <Text strong>result status</Text> dapat menyembunyikan data.
            Kosongkan filter jika laporan tampak kosong padahal tap sudah dilakukan.
          </Text>
          <Text>
            • Rentang tanggal memakai zona waktu <Text strong>Asia/Jakarta (WIB)</Text> berdasarkan waktu scan di
            server.
          </Text>
          <Text>
            • Admin dapat <Text strong>Detail</Text> untuk melihat alasan penolakan dan raw payload, serta{' '}
            <Text strong>Hapus</Text> log untuk koreksi data (hati-hati: hapus log dapat memutus hubungan dengan
            presensi harian).
          </Text>
          <Text>
            • Untuk uji koneksi device baru, pastikan tap muncul di sini dulu sebelum mengecek Laporan Presensi
            Siswa/Guru.
          </Text>
        </Flex>
      </div>
    </Flex>
  </Modal>
);

const ScanLogReport = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [range, setRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [deviceId, setDeviceId] = useState();
  const [resultStatus, setResultStatus] = useState();
  const [userName, setUserName] = useState('');
  const [detailRow, setDetailRow] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  const { data: devicesRes } = useGetRfidDevicesQuery();
  const { data, isLoading, isFetching, refetch } = useGetAttendanceScanLogReportQuery({
    startDate: range?.[0]?.format('YYYY-MM-DD'),
    endDate: range?.[1]?.format('YYYY-MM-DD'),
    deviceId,
    resultStatus,
    userName: userName.trim() || undefined,
  });
  const [deleteScanLog, { isLoading: deletingRow }] = useDeleteAttendanceScanLogMutation();
  const [bulkDeleteScanLogs, { isLoading: bulkDeleting }] = useBulkDeleteAttendanceScanLogsMutation();

  const rows = data?.data?.rows || [];
  const summary = data?.data?.summary || {};
  const deviceOptions = (devicesRes?.data || []).map((item) => ({
    label: `${item.code} - ${item.name}`,
    value: Number(item.id),
  }));

  const handleDeleteRow = async (id) => {
    try {
      await deleteScanLog(id).unwrap();
      message.success('Log scan berhasil dihapus.');
      setSelectedRowKeys((prev) => prev.filter((key) => String(key) !== String(id)));
      if (detailRow?.id === id) {
        setDetailRow(null);
      }
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus log scan.');
      throw error;
    }
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: `Hapus ${selectedRowKeys.length} log scan terpilih?`,
      content: 'Semua log scan yang dipilih akan dihapus permanen dari sistem.',
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      okButtonProps: { loading: bulkDeleting },
      onOk: async () => {
        try {
          const result = await bulkDeleteScanLogs(selectedRowKeys).unwrap();
          message.success(result?.message || 'Log scan terpilih berhasil dihapus.');
          if (detailRow && selectedRowKeys.some((key) => String(key) === String(detailRow.id))) {
            setDetailRow(null);
          }
          setSelectedRowKeys([]);
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus log scan terpilih.');
          throw error;
        }
      },
    });
  };

  const handleRowAction = (action, row) => {
    if (action === 'detail') {
      setDetailRow(row);
      return;
    }

    if (action === 'delete') {
      Modal.confirm({
        title: 'Hapus log scan ini?',
        content: 'Data log scan akan dihapus permanen dari sistem.',
        okText: 'Hapus',
        okType: 'danger',
        cancelText: 'Batal',
        okButtonProps: { loading: deletingRow },
        onOk: () => handleDeleteRow(row.id),
      });
    }
  };

  const handleDownloadExcel = () => {
    if (!rows.length) {
      message.warning('Tidak ada data log scan untuk diunduh.');
      return;
    }

    const exportRows = rows.map((row, index) => ({
      No: index + 1,
      'Waktu Scan': formatScanTimeCell(row.scanned_at),
      Device: row.device_name || '-',
      'Kode Device': row.device_code || '-',
      User: row.user_name || '-',
      'UID Kartu': row.card_uid || '-',
      Result: resolveResultStatus(row) || '-',
      'Alasan Penolakan': row.rejection_reason || '-',
      Source: row.scan_source || '-',
      Action: row.scan_action || '-',
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Log Scan RFID');

    const startLabel = range?.[0]?.format('YYYYMMDD') || 'awal';
    const endLabel = range?.[1]?.format('YYYYMMDD') || 'akhir';
    XLSX.writeFile(workbook, `Laporan_Scan_RFID_${startLabel}_${endLabel}.xlsx`);
  };

  return (
    <Flex vertical gap={18}>
      <Card style={surfaceCardStyle} bordered={false}>
        <Flex vertical gap={16}>
          <Flex justify="space-between" align={isMobile ? 'stretch' : 'flex-start'} vertical={isMobile} gap={12}>
            <Flex vertical gap={10}>
              <Text strong style={{ color: '#0f172a', fontSize: 16 }}>
                Laporan Scan RFID
              </Text>
              <Button
                icon={<BookOpen size={16} />}
                onClick={() => setGuideOpen(true)}
                style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
                Panduan Log Scan
              </Button>
            </Flex>
            <Flex gap={8} wrap="wrap" style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
              <Button
                icon={<Download size={16} />}
                onClick={handleDownloadExcel}
                disabled={rows.length === 0}
                style={{ flex: isMobile ? '1 1 100%' : undefined }}>
                Download Excel
              </Button>
              <Button
                icon={<RefreshCw size={16} />}
                loading={isFetching}
                onClick={() => refetch()}
                style={{ flex: isMobile ? '1 1 100%' : undefined }}>
                Refresh
              </Button>
            </Flex>
          </Flex>

          <Flex
            gap={12}
            align="center"
            wrap={isMobile ? 'wrap' : 'nowrap'}
            style={isMobile ? undefined : { overflowX: 'auto' }}>
            <RangePicker
              value={range}
              onChange={(value) => setRange(value)}
              format="YYYY-MM-DD"
              style={{ flex: isMobile ? '1 1 100%' : '0 0 260px' }}
            />
            <Input
              allowClear
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Filter nama user"
              prefix={<Search size={16} />}
              style={{ flex: isMobile ? '1 1 100%' : '1 1 200px', minWidth: 160 }}
            />
            <Select
              allowClear
              value={deviceId}
              onChange={setDeviceId}
              options={deviceOptions}
              placeholder="Filter device"
              showSearch
              optionFilterProp="label"
              virtual={false}
              style={{ flex: isMobile ? '1 1 100%' : '1 1 220px', minWidth: 180 }}
            />
            <Select
              allowClear
              value={resultStatus}
              onChange={setResultStatus}
              placeholder="Filter result status"
              virtual={false}
              style={{ flex: isMobile ? '1 1 100%' : '0 0 200px' }}
              options={[
                { value: 'accepted', label: 'accepted' },
                { value: 'duplicate', label: 'duplicate' },
                { value: 'rejected', label: 'rejected' },
                { value: 'unregistered', label: 'unregistered' },
                { value: 'out_of_window', label: 'out_of_window' },
                { value: 'card_inactive', label: 'card_inactive' },
                { value: 'device_inactive', label: 'device_inactive' },
                { value: 'user_inactive', label: 'user_inactive' },
                { value: 'policy_missing', label: 'policy_missing' },
                { value: 'not_scheduled', label: 'not_scheduled' },
              ]}
            />
          </Flex>
        </Flex>
      </Card>

      <Flex gap={12} wrap="wrap">
        <Card bordered={false} style={{ ...statCardStyle, flex: '1 1 220px' }}>
          <Flex justify="space-between" align="start">
            <Statistic title="Total Log" value={Number(summary.total_records || 0)} />
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: '#eff6ff',
                color: '#1d4ed8',
              }}>
              <ScanLine size={18} />
            </span>
          </Flex>
        </Card>
        <Card bordered={false} style={{ ...statCardStyle, flex: '1 1 220px' }}>
          <Flex justify="space-between" align="start">
            <Statistic title="Accepted" value={Number(summary.accepted_count || 0)} />
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: '#f0fdf4',
                color: '#166534',
              }}>
              <ClipboardX size={18} />
            </span>
          </Flex>
        </Card>
        <Card bordered={false} style={{ ...statCardStyle, flex: '1 1 220px' }}>
          <Flex justify="space-between" align="start">
            <Statistic
              title="Butuh Tindak Lanjut"
              value={
                Number(summary.rejected_count || 0) +
                Number(summary.unregistered_count || 0) +
                Number(summary.out_of_window_count || 0) +
                Number(summary.device_inactive_count || 0) +
                Number(summary.card_inactive_count || 0) +
                Number(summary.user_inactive_count || 0) +
                Number(summary.policy_missing_count || 0)
              }
            />
            <span
              style={{
                width: 42,
                height: 42,
                borderRadius: 14,
                display: 'grid',
                placeItems: 'center',
                background: '#fef2f2',
                color: '#b91c1c',
              }}>
              <AlertTriangle size={18} />
            </span>
          </Flex>
        </Card>
      </Flex>

      <Card style={surfaceCardStyle} bordered={false}>
        {rows.length > 0 && (
          <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedRowKeys.length > 0
                ? `${selectedRowKeys.length} log scan terpilih`
                : 'Centang baris untuk hapus bulk'}
            </Text>
            <Button
              danger
              icon={<Trash2 size={16} />}
              disabled={selectedRowKeys.length === 0}
              loading={bulkDeleting}
              onClick={handleBulkDelete}>
              Hapus Terpilih
            </Button>
          </Flex>
        )}
        {rows.length === 0 && !isLoading && !isFetching ? (
          <Empty description="Belum ada log scan pada rentang ini." />
        ) : (
          <Table
            rowKey="id"
            loading={isLoading || (isFetching && rows.length > 0)}
            dataSource={rows}
            tableLayout="fixed"
            pagination={{
              pageSize,
              showSizeChanger: true,
              pageSizeOptions: PAGE_SIZE_OPTIONS,
              showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} log`,
              onChange: (_page, size) => setPageSize(size),
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={[
              {
                title: 'Waktu Scan',
                dataIndex: 'scanned_at',
                ellipsis: true,
                render: (value) => formatScanTimeCell(value),
              },
              {
                title: 'Device',
                ellipsis: true,
                render: (_, row) => (
                  <Flex vertical gap={2}>
                    <Text strong ellipsis>
                      {row.device_name || '-'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      {row.device_code || '-'}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: 'User',
                ellipsis: true,
                render: (_, row) => (
                  <Flex vertical gap={2}>
                    <Text strong ellipsis>
                      {row.user_name || '-'}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      UID {row.card_uid || '-'}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: 'Result',
                dataIndex: 'result_status',
                render: (_, row) => {
                  const status = resolveResultStatus(row);
                  return <Tag color={RESULT_STATUS_COLORS[status] || 'default'}>{status}</Tag>;
                },
              },
              {
                title: 'Aksi',
                width: 110,
                render: (_, row) => (
                  <Select
                    placeholder="Aksi"
                    value={null}
                    virtual={false}
                    style={{ width: '100%', maxWidth: 110 }}
                    options={[
                      { value: 'detail', label: 'Detail' },
                      { value: 'delete', label: 'Hapus' },
                    ]}
                    onChange={(value) => handleRowAction(value, row)}
                  />
                ),
              },
            ]}
          />
        )}
      </Card>

      <Modal
        title="Detail Log Scan"
        centered
        open={!!detailRow}
        onCancel={() => setDetailRow(null)}
        footer={null}
        width={720}>
        {detailRow && (
          <Descriptions bordered column={isMobile ? 1 : 2} size="small">
            <Descriptions.Item label="ID Log">{detailRow.id}</Descriptions.Item>
            <Descriptions.Item label="Result">
              <Tag color={RESULT_STATUS_COLORS[resolveResultStatus(detailRow)] || 'default'}>
                {resolveResultStatus(detailRow)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Waktu Scan" span={2}>
              {formatDetailValue(detailRow.scanned_at)}
            </Descriptions.Item>
            <Descriptions.Item label="Waktu Device">{formatDetailValue(detailRow.device_time_at)}</Descriptions.Item>
            <Descriptions.Item label="Diterima Server">
              {formatDetailValue(detailRow.server_received_at)}
            </Descriptions.Item>
            <Descriptions.Item label="Device">
              {formatDetailValue(detailRow.device_name)} ({formatDetailValue(detailRow.device_code)})
            </Descriptions.Item>
            <Descriptions.Item label="Device ID">{formatDetailValue(detailRow.device_id)}</Descriptions.Item>
            <Descriptions.Item label="User">{formatDetailValue(detailRow.user_name)}</Descriptions.Item>
            <Descriptions.Item label="User ID">{formatDetailValue(detailRow.user_id)}</Descriptions.Item>
            <Descriptions.Item label="UID Kartu" span={2}>
              {formatDetailValue(detailRow.card_uid)}
            </Descriptions.Item>
            <Descriptions.Item label="Source">{formatDetailValue(detailRow.scan_source)}</Descriptions.Item>
            <Descriptions.Item label="Action">{formatDetailValue(detailRow.scan_action)}</Descriptions.Item>
            <Descriptions.Item label="Attendance ID">{formatDetailValue(detailRow.attendance_id)}</Descriptions.Item>
            <Descriptions.Item label="Dibuat">{formatDetailValue(detailRow.created_at)}</Descriptions.Item>
            <Descriptions.Item label="Alasan Penolakan" span={2}>
              {formatDetailValue(detailRow.rejection_reason)}
            </Descriptions.Item>
            <Descriptions.Item label="Raw Payload" span={2}>
              <pre
                style={{
                  margin: 0,
                  maxHeight: 220,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontSize: 12,
                }}>
                {formatRawPayload(detailRow.raw_payload)}
              </pre>
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <ScanLogGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} isMobile={isMobile} />
    </Flex>
  );
};

export default ScanLogReport;
