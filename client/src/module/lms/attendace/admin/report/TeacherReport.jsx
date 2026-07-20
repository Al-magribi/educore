import { useState } from 'react';
import dayjs from 'dayjs';
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
import { motion } from 'framer-motion';
import { BriefcaseBusiness, BookOpen, Clock3, RefreshCw, Search, TimerReset, Trash2, UsersRound } from 'lucide-react';
import {
  useBulkDeleteDailyAttendanceRecordsMutation,
  useDeleteDailyAttendanceRecordMutation,
  useGetTeacherAttendanceReportQuery,
  useUpdateDailyAttendanceRecordMutation,
} from '../../../../../service/lms/ApiAttendance';

const { RangePicker } = DatePicker;
const { Text, Title, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

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

const STATUS_COLORS = {
  present: 'green',
  late: 'gold',
  absent: 'red',
  incomplete: 'orange',
  insufficient_hours: 'volcano',
  not_scheduled: 'blue',
};

const formatDateTimeCell = (value) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YY HH:mm') : value;
};

const formatDateTimeDetail = (value) => {
  if (!value) return '-';
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format('DD MMM YYYY HH:mm:ss') : value;
};

const formatDetailValue = (value) => {
  if (value === null || value === undefined || value === '') return '-';
  return value;
};

const formatMinutesToHours = (value) => {
  const minutes = Number(value || 0);
  const hours = minutes / 60;
  return `${hours.toFixed(2)} jam`;
};

const parseReportDateTime = (value) => {
  if (!value) return null;
  const text = String(value).trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (match) {
    const parsed = dayjs(`${match[1]}T${match[2]}`);
    return parsed.isValid() ? parsed : null;
  }
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const PAGE_SIZE_OPTIONS = ['10', '20', '50', '100'];

const TEACHER_STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'insufficient_hours', label: 'Insufficient Hours' },
  { value: 'not_scheduled', label: 'Not Scheduled' },
  { value: 'pending', label: 'Pending' },
];

const GUIDE_STATUS_ITEMS = [
  {
    status: 'present',
    label: 'Present (Hadir)',
    description:
      'Guru tap kartu di gate pada hari yang ada jadwal mengajar, dan waktu tap masih dalam batas toleransi telat policy.',
  },
  {
    status: 'late',
    label: 'Late (Telat)',
    description:
      'Guru tap kartu di gate pada hari berjadwal, tetapi waktu tap melewati jam referensi check-in ditambah toleransi yang diatur di policy.',
  },
  {
    status: 'not_scheduled',
    label: 'Not Scheduled (Tidak Berjadwal)',
    description:
      'Guru tap kartu di gate, tetapi tidak ada jadwal mengajar pada master jadwal aktif untuk guru tersebut di hari tap — misalnya tap di hari Minggu atau Senin padahal guru tidak mengajar.',
  },
  {
    status: 'incomplete',
    label: 'Incomplete (Belum Lengkap)',
    description:
      'Ada tap pulang (checkout) di gate tanpa tap datang (check-in) di hari yang sama, atau data masuk/keluar belum lengkap.',
  },
  {
    status: 'insufficient_hours',
    label: 'Insufficient Hours (Durasi Kurang)',
    description:
      'Guru sudah check-in dan check-out, tetapi total durasi hadir di bawah minimum menit yang ditetapkan policy.',
  },
  {
    status: 'pending',
    label: 'Pending (Menunggu)',
    description: 'Data sudah terbentuk tetapi belum dievaluasi penuh. Biasanya sementara sebelum check-in/check-out lengkap.',
  },
  {
    status: 'absent',
    label: 'Absent (Tidak Hadir)',
    description:
      'Jarang muncul di laporan ini karena laporan hanya menampilkan guru yang pernah tap kartu gate. Status ini lebih sering dari koreksi manual admin.',
  },
];

const TeacherAttendanceGuideModal = ({ open, onClose, isMobile }) => (
  <Modal
    title="Panduan Presensi Guru"
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
          Laporan ini menampilkan <Text strong>rekap kehadiran harian guru dari tap kartu di device gate</Text>{' '}
          (gerbang masuk/keluar). Hanya guru yang pernah berhasil tap kartu gate yang muncul di tabel. Guru yang
          tidak tap sama sekali tidak otomatis muncul di sini.
        </Paragraph>
      </div>

      <div>
        <Title level={5} style={{ marginTop: 0 }}>
          Alur sistem saat guru tap kartu di gate
        </Title>
        <Flex vertical gap={10}>
          {[
            'Guru men-tap kartu RFID di alat gate (boleh di gerbang manapun — masuk, keluar, atau parkir).',
            'Server menentukan otomatis apakah tap ini datang atau pulang berdasarkan presensi hari itu (tap pertama = datang, tap kedua = pulang).',
            'Sistem memvalidasi device, kartu, dan user. Scan duplikat di hari yang sama ditolak.',
            'Sistem mengecek policy absensi yang berlaku untuk guru tersebut (berdasarkan assignment: user, homebase, dll.).',
            'Untuk policy bertipe schedule-based: sistem mengecek apakah guru punya jadwal mengajar pada master jadwal aktif di hari tap.',
            'Sistem menentukan status harian dan menyimpan ke data presensi, lalu menghubungkannya dengan log scan.',
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
          Aturan penentuan status (policy schedule-based)
        </Title>
        <Flex vertical gap={8}>
          <Paragraph style={{ marginBottom: 0 }}>
            <Text strong>Tidak ada jadwal di hari tap</Text> → status{' '}
            <Tag color={STATUS_COLORS.not_scheduled}>not_scheduled</Tag>. Waktu tap tetap dicatat.
          </Paragraph>
          <Paragraph style={{ marginBottom: 0 }}>
            <Text strong>Ada jadwal + tap dalam batas waktu policy</Text> → status{' '}
            <Tag color={STATUS_COLORS.present}>present</Tag> atau{' '}
            <Tag color={STATUS_COLORS.late}>late</Tag> jika melewati toleransi telat.
          </Paragraph>
          <Paragraph style={{ marginBottom: 0 }}>
            <Text strong>Tap di luar jendela waktu policy</Text> → scan ditolak (muncul di Laporan Scan RFID sebagai{' '}
            <Text code>out_of_window</Text>), tidak membentuk baris baru di laporan ini.
          </Paragraph>
          <Paragraph style={{ marginBottom: 0 }}>
            <Text strong>Tidak tap kartu sama sekali</Text> → tidak otomatis dibuat status{' '}
            <Tag color={STATUS_COLORS.not_scheduled}>not_scheduled</Tag>. Tidak ada baris di laporan ini.
          </Paragraph>
        </Flex>
      </div>

      <div>
        <Title level={5} style={{ marginTop: 0 }}>
          Penjelasan setiap status
        </Title>
        <Flex vertical gap={12}>
          {GUIDE_STATUS_ITEMS.map((item) => (
            <Flex key={item.status} gap={10} align="flex-start">
              <Tag color={STATUS_COLORS[item.status] || 'default'} style={{ marginTop: 2 }}>
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
            • <Text strong>Laporan Scan RFID</Text> mencatat semua percobaan tap (diterima maupun ditolak). Laporan
            ini hanya menampilkan hasil akhir kehadiran harian dari tap gate yang berhasil diproses.
          </Text>
          <Text>
            • <Text strong>Device classroom</Text> dapat dipetakan ke banyak kelas. Saat guru
            tap, sistem mencocokkan jadwal pada <Text strong>master jadwal aktif</Text> (kelas, jam keberapa, jam mulai/selesai)
            lalu mencatat check-in/check-out sesi — bukan status harian gate di laporan ini.
          </Text>
          <Text>
            • Kartu statistik <Text strong>Perlu Tindak Lanjut</Text> menjumlahkan status absent, incomplete, dan
            insufficient hours pada data yang tampil.
          </Text>
          <Text>
            • Admin dapat <Text strong>Detail, Edit, Hapus</Text> per baris, atau hapus banyak sekaligus lewat centang
            baris + tombol Hapus Terpilih. Edit manual dapat mengubah status, waktu datang/pulang, dan catatan.
          </Text>
          <Text>
            • Pastikan guru sudah punya <Text strong>policy assignment</Text> aktif dan periode akademik aktif agar
            pengecekan jadwal berjalan benar.
          </Text>
        </Flex>
      </div>
    </Flex>
  </Modal>
);

const TeacherReport = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [range, setRange] = useState([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [status, setStatus] = useState();
  const [userName, setUserName] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [editCheckin, setEditCheckin] = useState(null);
  const [editCheckout, setEditCheckout] = useState(null);
  const [editStatus, setEditStatus] = useState();
  const [editNotes, setEditNotes] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  const [updateDailyAttendance, { isLoading: savingEdit }] = useUpdateDailyAttendanceRecordMutation();
  const [deleteDailyAttendance, { isLoading: deletingRow }] = useDeleteDailyAttendanceRecordMutation();
  const [bulkDeleteDailyAttendance, { isLoading: bulkDeleting }] = useBulkDeleteDailyAttendanceRecordsMutation();
  const { data, isLoading, isFetching, refetch } = useGetTeacherAttendanceReportQuery({
    startDate: range?.[0]?.format('YYYY-MM-DD'),
    endDate: range?.[1]?.format('YYYY-MM-DD'),
    status,
    userName: userName.trim() || undefined,
  });

  const summary = data?.data?.summary || {};
  const sessionSummary = data?.data?.session_summary || {};
  const rows = data?.data?.rows || [];

  const statItems = [
    {
      key: 'teachers',
      title: 'Total Guru',
      value: Number(summary.total_teachers || 0),
      icon: <UsersRound size={18} />,
      color: '#1d4ed8',
      bg: '#eff6ff',
    },
    {
      key: 'records',
      title: 'Catatan Harian',
      value: Number(summary.total_records || 0),
      icon: <BriefcaseBusiness size={18} />,
      color: '#0f766e',
      bg: '#ecfeff',
    },
    {
      key: 'sessions',
      title: 'Sesi Mengajar',
      value: Number(sessionSummary.total_sessions || 0),
      icon: <Clock3 size={18} />,
      color: '#7c3aed',
      bg: '#f5f3ff',
    },
    {
      key: 'issues',
      title: 'Perlu Tindak Lanjut',
      value:
        Number(summary.absent_count || 0) +
        Number(summary.incomplete_count || 0) +
        Number(summary.insufficient_hours_count || 0),
      icon: <TimerReset size={18} />,
      color: '#b91c1c',
      bg: '#fef2f2',
    },
  ];

  const openEditModal = (row) => {
    setEditingRow(row);
    setEditCheckin(parseReportDateTime(row.checkin_at));
    setEditCheckout(parseReportDateTime(row.checkout_at));
    setEditStatus(row.attendance_status);
    setEditNotes(row.notes || '');
  };

  const closeEditModal = () => {
    setEditingRow(null);
    setEditCheckin(null);
    setEditCheckout(null);
    setEditStatus(undefined);
    setEditNotes('');
  };

  const handleSaveEdit = async () => {
    if (!editingRow) return;
    try {
      await updateDailyAttendance({
        id: editingRow.id,
        checkin_at: editCheckin ? editCheckin.toISOString() : null,
        checkout_at: editCheckout ? editCheckout.toISOString() : null,
        attendance_status: editStatus,
        notes: editNotes,
      }).unwrap();
      message.success('Data absensi guru berhasil diperbarui.');
      closeEditModal();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal memperbarui absensi guru.');
      throw error;
    }
  };

  const handleDeleteRow = async (id) => {
    try {
      await deleteDailyAttendance(id).unwrap();
      message.success('Data absensi guru berhasil dihapus.');
      setSelectedRowKeys((prev) => prev.filter((key) => String(key) !== String(id)));
      if (detailRow?.id === id) {
        setDetailRow(null);
      }
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus absensi guru.');
      throw error;
    }
  };

  const handleBulkDelete = () => {
    if (selectedRowKeys.length === 0) return;

    Modal.confirm({
      title: `Hapus ${selectedRowKeys.length} data absensi terpilih?`,
      content: 'Semua data absensi guru yang dipilih akan dihapus permanen dari sistem.',
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      okButtonProps: { loading: bulkDeleting },
      onOk: async () => {
        try {
          const result = await bulkDeleteDailyAttendance(selectedRowKeys).unwrap();
          message.success(result?.message || 'Data absensi terpilih berhasil dihapus.');
          if (detailRow && selectedRowKeys.some((key) => String(key) === String(detailRow.id))) {
            setDetailRow(null);
          }
          setSelectedRowKeys([]);
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus data absensi terpilih.');
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

    if (action === 'edit') {
      openEditModal(row);
      return;
    }

    if (action === 'delete') {
      Modal.confirm({
        title: 'Hapus data absensi ini?',
        content: 'Data absensi guru akan dihapus permanen dari sistem.',
        okText: 'Hapus',
        okType: 'danger',
        cancelText: 'Batal',
        okButtonProps: { loading: deletingRow },
        onOk: () => handleDeleteRow(row.id),
      });
    }
  };

  return (
    <Flex vertical gap={18}>
      <Card style={surfaceCardStyle} bordered={false}>
        <Flex vertical gap={16}>
          <Flex justify="space-between" align={isMobile ? 'stretch' : 'flex-start'} vertical={isMobile} gap={12}>
            <Flex vertical gap={10}>
              <Text strong style={{ color: '#0f172a', fontSize: 16 }}>
                Laporan Presensi Guru
              </Text>
              <Button
                icon={<BookOpen size={16} />}
                onClick={() => setGuideOpen(true)}
                style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
                Panduan Presensi Guru
              </Button>
            </Flex>
            <Button
              icon={<RefreshCw size={16} />}
              loading={isFetching}
              onClick={() => refetch()}
              style={{ alignSelf: isMobile ? 'stretch' : 'flex-start' }}>
              Refresh
            </Button>
          </Flex>

          <Flex gap={'middle'} vertical={isMobile}>
            <RangePicker value={range} onChange={(value) => setRange(value)} format="YYYY-MM-DD" />
            <Input
              allowClear
              value={userName}
              onChange={(event) => setUserName(event.target.value)}
              placeholder="Cari nama guru"
              prefix={<Search size={16} />}
              style={{ width: isMobile ? '100%' : 180 }}
            />
            <Select
              showSearch={{ optionFilterProp: 'label' }}
              virtual={false}
              allowClear
              value={status}
              onChange={setStatus}
              placeholder="Filter status"
              options={[
                { value: 'present', label: 'Present' },
                { value: 'late', label: 'Late' },
                { value: 'absent', label: 'Absent' },
                { value: 'incomplete', label: 'Incomplete' },
                { value: 'insufficient_hours', label: 'Insufficient Hours' },
                { value: 'not_scheduled', label: 'Not Scheduled' },
              ]}
              style={{ width: isMobile ? '100%' : 180 }}
            />
          </Flex>
        </Flex>
      </Card>

      <Flex gap={12} wrap="wrap">
        {statItems.map((item, index) => (
          <MotionDiv
            key={item.key}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24, delay: index * 0.04 }}
            style={{ flex: '1 1 220px' }}>
            <Card bordered={false} style={statCardStyle}>
              <Flex justify="space-between" align="start" gap={10}>
                <Statistic title={item.title} value={item.value} />
                <span
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 14,
                    display: 'grid',
                    placeItems: 'center',
                    background: item.bg,
                    color: item.color,
                    flexShrink: 0,
                  }}>
                  {item.icon}
                </span>
              </Flex>
            </Card>
          </MotionDiv>
        ))}
      </Flex>

      <Card style={surfaceCardStyle} bordered={false}>
        {rows.length > 0 && (
          <Flex justify="space-between" align="center" wrap="wrap" gap={12} style={{ marginBottom: 16 }}>
            <Text type="secondary">
              {selectedRowKeys.length > 0
                ? `${selectedRowKeys.length} data absensi terpilih`
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
          <Empty description="Belum ada data presensi guru pada rentang ini." />
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
              showTotal: (total, range) => `${range[0]}-${range[1]} dari ${total} catatan`,
              onChange: (_page, size) => setPageSize(size),
            }}
            rowSelection={{
              selectedRowKeys,
              onChange: setSelectedRowKeys,
            }}
            columns={[
              {
                title: 'Guru',
                ellipsis: true,
                render: (_, row) => (
                  <Flex vertical gap={2}>
                    <Text strong ellipsis>
                      {row.full_name}
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }} ellipsis>
                      NIP {row.nip || '-'}
                    </Text>
                  </Flex>
                ),
              },
              {
                title: 'Tanggal',
                dataIndex: 'attendance_date',
                ellipsis: true,
              },
              {
                title: 'Status',
                dataIndex: 'attendance_status',
                render: (value) => <Tag color={STATUS_COLORS[value] || 'default'}>{value}</Tag>,
              },
              {
                title: 'Datang',
                dataIndex: 'checkin_at',
                ellipsis: true,
                render: (value) => formatDateTimeCell(value),
              },
              {
                title: 'Pulang',
                dataIndex: 'checkout_at',
                ellipsis: true,
                render: (value) => formatDateTimeCell(value),
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
                      { value: 'edit', label: 'Edit' },
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
        title="Detail Presensi Guru"
        centered
        open={!!detailRow}
        onCancel={() => setDetailRow(null)}
        footer={null}
        width={720}>
        {detailRow && (
          <Descriptions bordered column={isMobile ? 1 : 2} size="small">
            <Descriptions.Item label="ID">{detailRow.id}</Descriptions.Item>
            <Descriptions.Item label="Status">
              <Tag color={STATUS_COLORS[detailRow.attendance_status] || 'default'}>{detailRow.attendance_status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Tanggal" span={2}>
              {formatDetailValue(detailRow.attendance_date)}
            </Descriptions.Item>
            <Descriptions.Item label="Nama Guru">{formatDetailValue(detailRow.full_name)}</Descriptions.Item>
            <Descriptions.Item label="NIP">{formatDetailValue(detailRow.nip)}</Descriptions.Item>
            <Descriptions.Item label="User ID" span={2}>
              {formatDetailValue(detailRow.user_id)}
            </Descriptions.Item>
            <Descriptions.Item label="Datang">{formatDateTimeDetail(detailRow.checkin_at)}</Descriptions.Item>
            <Descriptions.Item label="Pulang">{formatDateTimeDetail(detailRow.checkout_at)}</Descriptions.Item>
            <Descriptions.Item label="Terlambat (menit)">{formatDetailValue(detailRow.late_minutes)}</Descriptions.Item>
            <Descriptions.Item label="Durasi Hadir">
              {formatMinutesToHours(detailRow.presence_minutes)}
            </Descriptions.Item>
            <Descriptions.Item label="Min. Wajib">
              {formatMinutesToHours(detailRow.minimum_required_minutes)}
            </Descriptions.Item>
            <Descriptions.Item label="Catatan" span={2}>
              {formatDetailValue(detailRow.notes)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="Edit Presensi Guru"
        open={!!editingRow}
        onCancel={closeEditModal}
        onOk={handleSaveEdit}
        confirmLoading={savingEdit}
        okText="Simpan">
        <Flex vertical gap={12}>
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            virtual={false}
            value={editStatus}
            onChange={setEditStatus}
            placeholder="Status"
            options={TEACHER_STATUS_OPTIONS}
          />
          <DatePicker
            showTime
            value={editCheckin}
            onChange={setEditCheckin}
            style={{ width: '100%' }}
            placeholder="Checkin"
            format="YYYY-MM-DD HH:mm:ss"
          />
          <DatePicker
            showTime
            value={editCheckout}
            onChange={setEditCheckout}
            style={{ width: '100%' }}
            placeholder="Checkout"
            format="YYYY-MM-DD HH:mm:ss"
          />
          <Input.TextArea
            value={editNotes}
            onChange={(event) => setEditNotes(event.target.value)}
            placeholder="Catatan"
            rows={3}
          />
        </Flex>
      </Modal>

      <TeacherAttendanceGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} isMobile={isMobile} />
    </Flex>
  );
};

export default TeacherReport;
