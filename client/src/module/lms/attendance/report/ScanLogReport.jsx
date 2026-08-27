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
  Input,
  Modal,
  Select,
  Table,
  Tag,
  Typography,
  message,
} from 'antd';
import { AlertTriangle, BookOpen, ClipboardX, Download, RefreshCw, Search, Trash2 } from 'lucide-react';
import {
  useBulkDeleteAttendanceScanLogsMutation,
  useDeleteAttendanceScanLogMutation,
  useGetAttendanceScanLogReportQuery,
  useGetRfidDevicesQuery,
} from '../../../../service/lms/ApiAttendance';
import {
  BulkDeleteBar,
  DETAIL_ACTIONS,
  FilterBar,
  ReportHeader,
  StackedCell,
  StatCardGrid,
  StatusTag,
  buildActionColumn,
  buildPagination,
  buildRowSelection,
  buildTableProps,
  detailColumnConfig,
  filterControlStyle,
  formatDateTimeCell,
  formatDetailValue,
  modalWidth,
  surfaceCardBodyStyles,
  surfaceCardStyle,
  tableShellStyle,
  toolbarButtonStyle,
  useResponsiveFlags,
} from './reportShared';

const { RangePicker } = DatePicker;
const { Text, Title, Paragraph } = Typography;

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
  too_early_checkout: 'orange',
  cooldown: 'geekblue',
};

const isUnregisteredScan = (row) =>
  row?.result_status === 'unregistered' ||
  (row?.result_status === 'rejected' && String(row?.rejection_reason || '').toLowerCase().includes('tidak terdaftar'));

const resolveResultStatus = (row) => (isUnregisteredScan(row) ? 'unregistered' : row?.result_status);

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
      'Tap ditolak karena sudah ada scan yang sama dalam rentang debounce (5 menit, khusus gate/ekstra) atau check-in/check-out hari itu sudah tercatat / sesi mengajar sudah lengkap. Device classroom tidak memakai debounce 5 menit.',
  },
  {
    status: 'too_early_checkout',
    label: 'Too Early Checkout (Belum Waktunya Keluar)',
    description:
      'Khusus device classroom: guru sudah check-in sesi mengajar tetapi tap keluar sebelum jam selesai pelajaran (planned_end). LCD menampilkan "Belum waktunya keluar". Sesi tetap terbuka sampai checkout di/ setelah jam selesai.',
  },
  {
    status: 'cooldown',
    label: 'Cooldown (Tunggu Ganti Kelas)',
    description:
      'Khusus device classroom: guru yang sama baru checkout sesi sebelumnya dan mencoba check-in kelas/sesi berikutnya sebelum jeda 2 menit. Guru lain di device yang sama tidak terkena cooldown. LCD: "Tunggu 2 menit" (+ sisa detik bila ada).',
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
    width={modalWidth(isMobile, 760)}
    styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 } }}>
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
            'Server mengecek duplikat (gate/ekstra) atau aturan sesi classroom (checkout terlalu awal, cooldown ganti kelas).',
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

const ScanLogReport = ({ homebaseId, periodeId, pollingInterval = 0 } = {}) => {
  const { isMobile, isCompact } = useResponsiveFlags();
  const [range, setRange] = useState([dayjs().startOf('day'), dayjs().endOf('day')]);
  const [deviceId, setDeviceId] = useState();
  const [resultStatus, setResultStatus] = useState();
  const [userName, setUserName] = useState('');
  const [detailRow, setDetailRow] = useState(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  const { data: devicesRes } = useGetRfidDevicesQuery({ homebaseId });
  const { data, isLoading, isFetching, refetch } = useGetAttendanceScanLogReportQuery(
    {
      startDate: range?.[0]?.format('YYYY-MM-DD'),
      endDate: range?.[1]?.format('YYYY-MM-DD'),
      deviceId,
      resultStatus,
      userName: userName.trim() || undefined,
      homebaseId,
      periodeId,
    },
    { pollingInterval: pollingInterval || 0 },
  );
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
      await deleteScanLog({ id, homebaseId }).unwrap();
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
          const result = await bulkDeleteScanLogs({
            ids: selectedRowKeys,
            homebaseId,
          }).unwrap();
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
      'Waktu Scan': formatDateTimeCell(row.scanned_at),
      Device: row.device_name || '-',
      'Kode Device': row.device_code || '-',
      User: isUnregisteredScan(row) ? '-' : row.user_name || '-',
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

  const statItems = [
    {
      key: 'accepted',
      title: 'Accepted',
      value: Number(summary.accepted_count || 0),
      icon: <ClipboardX size={isMobile ? 14 : 18} />,
      color: '#166534',
      bg: '#f0fdf4',
    },
    {
      key: 'follow-up',
      title: 'Butuh Tindak Lanjut',
      value:
        Number(summary.rejected_count || 0) +
        Number(summary.unregistered_count || 0) +
        Number(summary.out_of_window_count || 0) +
        Number(summary.device_inactive_count || 0) +
        Number(summary.card_inactive_count || 0) +
        Number(summary.user_inactive_count || 0) +
        Number(summary.policy_missing_count || 0),
      icon: <AlertTriangle size={isMobile ? 14 : 18} />,
      color: '#b91c1c',
      bg: '#fef2f2',
    },
  ];

  const columns = [
    {
      title: 'Waktu Scan',
      dataIndex: 'scanned_at',
      width: isMobile ? 118 : 150,
      fixed: 'left',
      ellipsis: true,
      render: (value) => formatDateTimeCell(value, isMobile),
    },
    {
      title: 'Device',
      key: 'device',
      width: isMobile ? 150 : 200,
      ellipsis: true,
      render: (_, row) => <StackedCell primary={row.device_name} secondary={row.device_code} />,
    },
    {
      title: 'User',
      key: 'user',
      width: isMobile ? 160 : 230,
      ellipsis: true,
      render: (_, row) => (
        <StackedCell
          primary={isUnregisteredScan(row) ? '-' : row.user_name}
          secondary={`UID ${row.card_uid || '-'}`}
        />
      ),
    },
    {
      title: 'Result',
      dataIndex: 'result_status',
      width: isMobile ? 140 : 165,
      render: (_, row) => (
        <StatusTag value={resolveResultStatus(row)} colorMap={RESULT_STATUS_COLORS} />
      ),
    },
    buildActionColumn(handleRowAction, DETAIL_ACTIONS),
  ];

  return (
    <Flex vertical gap={isMobile ? 12 : 18} style={{ width: '100%', minWidth: 0 }}>
      <Card variant="borderless" style={surfaceCardStyle} styles={surfaceCardBodyStyles(isMobile)}>
        <Flex vertical gap={16} style={{ minWidth: 0 }}>
          <ReportHeader
            title="Laporan Scan RFID"
            description="Semua percobaan tap kartu dari device gate dan classroom, termasuk yang ditolak."
            isMobile={isMobile}
            extra={
              <>
                <Button
                  icon={<BookOpen size={16} />}
                  onClick={() => setGuideOpen(true)}
                  style={toolbarButtonStyle(isMobile)}>
                  Panduan
                </Button>
                <Button
                  icon={<Download size={16} />}
                  onClick={handleDownloadExcel}
                  disabled={rows.length === 0}
                  style={toolbarButtonStyle(isMobile)}>
                  Excel
                </Button>
                <Button
                  icon={<RefreshCw size={16} />}
                  loading={isFetching}
                  onClick={() => refetch()}
                  style={toolbarButtonStyle(isMobile)}>
                  Refresh
                </Button>
              </>
            }
          />

          <FilterBar isMobile={isMobile}>
            <RangePicker
              value={range}
              onChange={(value) => setRange(value)}
              format={isMobile ? 'DD/MM/YY' : 'YYYY-MM-DD'}
              placeholder={['Tanggal awal', 'Tanggal akhir']}
              inputReadOnly={isMobile}
              style={filterControlStyle(isCompact, 260)}
            />
            <Input
              allowClear
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Filter nama user"
              prefix={<Search size={16} />}
              style={filterControlStyle(isMobile, 190)}
            />
            <Select
              allowClear
              value={deviceId}
              onChange={setDeviceId}
              options={deviceOptions}
              placeholder="Filter device"
              showSearch={{ optionFilterProp: 'label' }}
              virtual={false}
              popupMatchSelectWidth={false}
              style={filterControlStyle(isMobile, 200)}
            />
            <Select
              allowClear
              value={resultStatus}
              onChange={setResultStatus}
              placeholder="Filter result status"
              virtual={false}
              popupMatchSelectWidth={false}
              style={filterControlStyle(isMobile, 190)}
              options={[
                { value: 'accepted', label: 'accepted' },
                { value: 'duplicate', label: 'duplicate' },
                { value: 'too_early_checkout', label: 'too_early_checkout' },
                { value: 'cooldown', label: 'cooldown' },
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
          </FilterBar>
        </Flex>
      </Card>

      <StatCardGrid items={statItems} isMobile={isMobile} />

      <Card variant="borderless" style={surfaceCardStyle} styles={surfaceCardBodyStyles(isMobile)}>
        {rows.length > 0 && (
          <BulkDeleteBar
            selectedCount={selectedRowKeys.length}
            loading={bulkDeleting}
            onDelete={handleBulkDelete}
            label="log scan"
            isMobile={isMobile}
            icon={<Trash2 size={16} />}
          />
        )}
        {rows.length === 0 && !isLoading && !isFetching ? (
          <Empty description="Belum ada log scan pada rentang ini." />
        ) : (
          <div style={tableShellStyle}>
            <Table
              rowKey="id"
              loading={isLoading || (isFetching && rows.length > 0)}
              dataSource={rows}
              columns={columns}
              {...buildTableProps({ isMobile, minWidth: isMobile ? 680 : 860 })}
              pagination={buildPagination({ pageSize, setPageSize, isMobile, unit: 'log' })}
              rowSelection={buildRowSelection({
                selectedRowKeys,
                onChange: setSelectedRowKeys,
                isMobile,
              })}
            />
          </div>
        )}
      </Card>

      <Modal
        title="Detail Log Scan"
        centered
        open={!!detailRow}
        onCancel={() => setDetailRow(null)}
        footer={null}
        width={modalWidth(isMobile)}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
        {detailRow && (
          <Descriptions
            bordered
            column={detailColumnConfig}
            size="small"
            styles={{ label: { width: isMobile ? 130 : 160, whiteSpace: 'nowrap' }, content: { wordBreak: 'break-word' } }}
            items={[
              { key: 'id', label: 'ID Log', children: formatDetailValue(detailRow.id) },
              {
                key: 'result',
                label: 'Result',
                children: (
                  <Tag
                    color={RESULT_STATUS_COLORS[resolveResultStatus(detailRow)] || 'default'}
                    style={{ margin: 0 }}>
                    {resolveResultStatus(detailRow)}
                  </Tag>
                ),
              },
              {
                key: 'scanned_at',
                label: 'Waktu Scan',
                span: 2,
                children: formatDetailValue(detailRow.scanned_at),
              },
              {
                key: 'device_time_at',
                label: 'Waktu Device',
                children: formatDetailValue(detailRow.device_time_at),
              },
              {
                key: 'server_received_at',
                label: 'Diterima Server',
                children: formatDetailValue(detailRow.server_received_at),
              },
              {
                key: 'device',
                label: 'Device',
                children: `${formatDetailValue(detailRow.device_name)} (${formatDetailValue(
                  detailRow.device_code,
                )})`,
              },
              { key: 'device_id', label: 'Device ID', children: formatDetailValue(detailRow.device_id) },
              {
                key: 'user',
                label: 'User',
                children: isUnregisteredScan(detailRow) ? '-' : formatDetailValue(detailRow.user_name),
              },
              {
                key: 'user_id',
                label: 'User ID',
                children: isUnregisteredScan(detailRow) ? '-' : formatDetailValue(detailRow.user_id),
              },
              {
                key: 'card_uid',
                label: 'UID Kartu',
                span: 2,
                children: formatDetailValue(detailRow.card_uid),
              },
              { key: 'source', label: 'Source', children: formatDetailValue(detailRow.scan_source) },
              { key: 'action', label: 'Action', children: formatDetailValue(detailRow.scan_action) },
              {
                key: 'attendance_id',
                label: 'Attendance ID',
                children: formatDetailValue(detailRow.attendance_id),
              },
              { key: 'created_at', label: 'Dibuat', children: formatDetailValue(detailRow.created_at) },
              {
                key: 'rejection_reason',
                label: 'Alasan Penolakan',
                span: 2,
                children: formatDetailValue(detailRow.rejection_reason),
              },
              {
                key: 'raw_payload',
                label: 'Raw Payload',
                span: 2,
                children: (
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
                ),
              },
            ]}
          />
        )}
      </Modal>

      <ScanLogGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} isMobile={isMobile} />
    </Flex>
  );
};

export default ScanLogReport;
