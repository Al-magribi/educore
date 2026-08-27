import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
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
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd';
import {
  BookOpen,
  ChartColumn,
  DoorOpen,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  useBulkDeleteDailyAttendanceRecordsMutation,
  useBulkDeleteTeacherSessionRecordsMutation,
  useDeleteDailyAttendanceRecordMutation,
  useDeleteTeacherSessionRecordMutation,
  useGetTeacherAttendanceReportQuery,
  useUpdateDailyAttendanceRecordMutation,
  useUpdateTeacherSessionRecordMutation,
} from '../../../../service/lms/ApiAttendance';
import { useGetClassesQuery } from '../../../../service/public/ApiPublic';
import TeachingRecapPanel from './TeachingRecapPanel';
import {
  BulkDeleteBar,
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
  formatDateCell,
  formatDateTimeCell,
  formatDateTimeDetail,
  formatDetailValue,
  formatMinutesToHours,
  modalWidth,
  parseReportDateTime,
  sortByLatestTap,
  surfaceCardBodyStyles,
  surfaceCardStyle,
  tableShellStyle,
  toolbarButtonStyle,
  useResponsiveFlags,
} from './reportShared';

const { RangePicker } = DatePicker;
const { Text, Title, Paragraph } = Typography;

const STATUS_COLORS = {
  present: 'green',
  late: 'gold',
  absent: 'red',
  incomplete: 'orange',
  insufficient_hours: 'volcano',
  not_scheduled: 'blue',
  pending: 'default',
};

const SESSION_STATUS_COLORS = {
  pending: 'default',
  present: 'green',
  late: 'gold',
  missed: 'red',
  partial: 'orange',
  excused: 'blue',
};

const formatSlotRange = (row) => {
  const first = Number(row?.first_slot_no || 0);
  const last = Number(row?.last_slot_no || 0);
  if (!first) return '-';
  return first === last ? `Jam ${first}` : `Jam ${first}-${last}`;
};

const formatSlotTimeRange = (row) => {
  const start = row?.slot_start_time;
  const end = row?.slot_end_time;
  if (start && end) return `${start} - ${end}`;
  return '-';
};

/** Natural class order: 7A, 7B, …, 8A, 8B, …, 9A, … */
const compareClassName = (a, b) =>
  String(a || '').localeCompare(String(b || ''), 'id', {
    numeric: true,
    sensitivity: 'base',
  });

const TEACHER_STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'absent', label: 'Absent' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'insufficient_hours', label: 'Insufficient Hours' },
  { value: 'not_scheduled', label: 'Not Scheduled' },
  { value: 'pending', label: 'Pending' },
];

/** Pending is only reachable via manual edit, so it is not offered as a filter. */
const TEACHER_STATUS_FILTER_OPTIONS = TEACHER_STATUS_OPTIONS.filter(
  (option) => option.value !== 'pending',
);

const TEACHER_SESSION_STATUS_OPTIONS = [
  { value: 'present', label: 'Present' },
  { value: 'late', label: 'Late' },
  { value: 'missed', label: 'Missed' },
  { value: 'partial', label: 'Partial' },
  { value: 'excused', label: 'Excused (Sakit/Izin)' },
  { value: 'pending', label: 'Pending (Belum tap)' },
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
    width={modalWidth(isMobile, 760)}
    styles={{ body: { maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 } }}>
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
            Checkout sebelum jam selesai atau ganti kelas sebelum jeda 2 menit tercatat di{' '}
            <Text strong>Laporan Scan RFID</Text> sebagai{' '}
            <Text code>too_early_checkout</Text> / <Text code>cooldown</Text>.
          </Text>
          <Text>
            • Kartu statistik <Text strong>Perlu Tindak Lanjut</Text> menjumlahkan status absent, incomplete, dan
            insufficient hours pada data yang tampil.
          </Text>
          <Text>
            • Admin satuan/pusat dapat <Text strong>Detail, Edit, Hapus</Text> per baris pada tab Kehadiran dan
            Mengajar, atau hapus banyak sekaligus lewat centang baris + tombol Hapus Terpilih. Edit manual
            dapat mengubah status, waktu datang/pulang (atau masuk/keluar sesi), dan catatan.
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

const TeacherReport = ({ homebaseId, periodeId, pollingInterval = 0 } = {}) => {
  const { isMobile, isCompact } = useResponsiveFlags();
  const [range, setRange] = useState([dayjs().startOf('day'), dayjs().endOf('day')]);
  const [status, setStatus] = useState();
  const [userName, setUserName] = useState('');
  const [sessionClassId, setSessionClassId] = useState();
  const [sessionCardUid, setSessionCardUid] = useState('');
  const [editingRow, setEditingRow] = useState(null);
  const [detailRow, setDetailRow] = useState(null);
  const [editCheckin, setEditCheckin] = useState(null);
  const [editCheckout, setEditCheckout] = useState(null);
  const [editStatus, setEditStatus] = useState();
  const [editNotes, setEditNotes] = useState('');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedSessionRowKeys, setSelectedSessionRowKeys] = useState([]);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pageSize, setPageSize] = useState(10);
  const [sessionPageSize, setSessionPageSize] = useState(10);
  const [activeTab, setActiveTab] = useState('kehadiran');
  const [detailSessionRow, setDetailSessionRow] = useState(null);
  const [editingSessionRow, setEditingSessionRow] = useState(null);
  const [editSessionCheckin, setEditSessionCheckin] = useState(null);
  const [editSessionCheckout, setEditSessionCheckout] = useState(null);
  const [editSessionStatus, setEditSessionStatus] = useState();
  const [editSessionNotes, setEditSessionNotes] = useState('');

  const { data: classesRes } = useGetClassesQuery({ homebaseId });
  const classOptions = (Array.isArray(classesRes) ? classesRes : []).map((item) => ({
    value: Number(item.id),
    label: item.name,
  }));

  const [updateDailyAttendance, { isLoading: savingEdit }] = useUpdateDailyAttendanceRecordMutation();
  const [deleteDailyAttendance, { isLoading: deletingRow }] = useDeleteDailyAttendanceRecordMutation();
  const [bulkDeleteDailyAttendance, { isLoading: bulkDeleting }] = useBulkDeleteDailyAttendanceRecordsMutation();
  const [updateTeacherSession, { isLoading: savingSessionEdit }] = useUpdateTeacherSessionRecordMutation();
  const [deleteTeacherSession, { isLoading: deletingSessionRow }] = useDeleteTeacherSessionRecordMutation();
  const [bulkDeleteTeacherSessions, { isLoading: bulkDeletingSessions }] =
    useBulkDeleteTeacherSessionRecordsMutation();
  const { data, isLoading, isFetching, refetch } = useGetTeacherAttendanceReportQuery(
    {
      startDate: range?.[0]?.format('YYYY-MM-DD'),
      endDate: range?.[1]?.format('YYYY-MM-DD'),
      status: activeTab === 'kehadiran' ? status : undefined,
      userName: userName.trim() || undefined,
      homebaseId,
      periodeId,
      classId: activeTab === 'mengajar' ? sessionClassId : undefined,
      cardUid: activeTab === 'mengajar' ? sessionCardUid.trim() || undefined : undefined,
    },
    {
      skip: activeTab === 'rekap',
      pollingInterval: activeTab === 'rekap' ? 0 : pollingInterval || 0,
    },
  );

  const summary = data?.data?.summary || {};
  const sessionSummary = data?.data?.session_summary || {};
  const rows = useMemo(() => sortByLatestTap(data?.data?.rows), [data?.data?.rows]);
  const sessionRows = useMemo(
    () =>
      [...(data?.data?.session_rows || [])].sort((a, b) => {
        const byClass = compareClassName(a.class_name, b.class_name);
        if (byClass !== 0) return byClass;

        const byDate = String(a.attendance_date || '').localeCompare(String(b.attendance_date || ''));
        if (byDate !== 0) return byDate;

        const bySlot = Number(a.first_slot_no || 0) - Number(b.first_slot_no || 0);
        if (bySlot !== 0) return bySlot;

        return String(a.full_name || '').localeCompare(String(b.full_name || ''), 'id', {
          sensitivity: 'base',
        });
      }),
    [data?.data?.session_rows],
  );

  const statItems =
    activeTab === 'kehadiran'
      ? [
          {
            key: 'hadir',
            title: 'Hadir',
            value: Number(summary.present_teachers || 0),
            suffix: 'guru',
            icon: <UserCheck size={isMobile ? 14 : 18} />,
            color: '#15803d',
            bg: '#f0fdf4',
          },
          {
            key: 'absent',
            title: 'Absent',
            value: Number(summary.absent_teachers || 0),
            suffix: 'guru',
            icon: <UserX size={isMobile ? 14 : 18} />,
            color: '#b91c1c',
            bg: '#fef2f2',
          },
        ]
      : activeTab === 'mengajar'
        ? [
            {
              key: 'hadir',
              title: 'Hadir',
              value: Number(sessionSummary.present_teachers || 0),
              suffix: 'guru',
              icon: <UserCheck size={isMobile ? 14 : 18} />,
              color: '#15803d',
              bg: '#f0fdf4',
            },
            {
              key: 'absent',
              title: 'Absent',
              value: Number(sessionSummary.absent_teachers || 0),
              suffix: 'guru',
              icon: <UserX size={isMobile ? 14 : 18} />,
              color: '#b91c1c',
              bg: '#fef2f2',
            },
          ]
        : [];

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
        homebaseId,
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
      await deleteDailyAttendance({ id, homebaseId }).unwrap();
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
          const result = await bulkDeleteDailyAttendance({
            ids: selectedRowKeys,
            homebaseId,
          }).unwrap();
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

  const openEditSessionModal = (row) => {
    setEditingSessionRow(row);
    setEditSessionCheckin(parseReportDateTime(row.actual_checkin_at));
    setEditSessionCheckout(parseReportDateTime(row.actual_checkout_at));
    setEditSessionStatus(row.session_status);
    setEditSessionNotes(row.notes || '');
  };

  const closeEditSessionModal = () => {
    setEditingSessionRow(null);
    setEditSessionCheckin(null);
    setEditSessionCheckout(null);
    setEditSessionStatus(undefined);
    setEditSessionNotes('');
  };

  const handleSaveSessionEdit = async () => {
    if (!editingSessionRow) return;
    try {
      await updateTeacherSession({
        id: editingSessionRow.id,
        homebaseId,
        actual_checkin_at: editSessionCheckin ? editSessionCheckin.toISOString() : null,
        actual_checkout_at: editSessionCheckout ? editSessionCheckout.toISOString() : null,
        session_status: editSessionStatus,
        notes: editSessionNotes,
      }).unwrap();
      message.success('Data sesi mengajar berhasil diperbarui.');
      closeEditSessionModal();
    } catch (error) {
      message.error(error?.data?.message || 'Gagal memperbarui sesi mengajar.');
      throw error;
    }
  };

  const handleDeleteSessionRow = async (id) => {
    try {
      await deleteTeacherSession({ id, homebaseId }).unwrap();
      message.success('Data sesi mengajar berhasil dihapus.');
      setSelectedSessionRowKeys((prev) => prev.filter((key) => String(key) !== String(id)));
      if (detailSessionRow?.id === id) {
        setDetailSessionRow(null);
      }
    } catch (error) {
      message.error(error?.data?.message || 'Gagal menghapus sesi mengajar.');
      throw error;
    }
  };

  const handleBulkDeleteSessions = () => {
    if (selectedSessionRowKeys.length === 0) return;

    Modal.confirm({
      title: `Hapus ${selectedSessionRowKeys.length} data sesi mengajar terpilih?`,
      content: 'Semua data sesi mengajar yang dipilih akan dihapus permanen dari sistem.',
      okText: 'Hapus',
      okType: 'danger',
      cancelText: 'Batal',
      okButtonProps: { loading: bulkDeletingSessions },
      onOk: async () => {
        try {
          const result = await bulkDeleteTeacherSessions({
            ids: selectedSessionRowKeys,
            homebaseId,
          }).unwrap();
          message.success(result?.message || 'Data sesi mengajar terpilih berhasil dihapus.');
          if (
            detailSessionRow &&
            selectedSessionRowKeys.some((key) => String(key) === String(detailSessionRow.id))
          ) {
            setDetailSessionRow(null);
          }
          setSelectedSessionRowKeys([]);
        } catch (error) {
          message.error(error?.data?.message || 'Gagal menghapus data sesi mengajar terpilih.');
          throw error;
        }
      },
    });
  };

  const handleSessionRowAction = (action, row) => {
    if (action === 'detail') {
      setDetailSessionRow(row);
      return;
    }

    if (action === 'edit') {
      openEditSessionModal(row);
      return;
    }

    if (action === 'delete') {
      Modal.confirm({
        title: 'Hapus data sesi mengajar ini?',
        content: 'Data sesi mengajar akan dihapus permanen dari sistem.',
        okText: 'Hapus',
        okType: 'danger',
        cancelText: 'Batal',
        okButtonProps: { loading: deletingSessionRow },
        onOk: () => handleDeleteSessionRow(row.id),
      });
    }
  };

  const dailyColumns = [
    {
      title: 'Guru',
      key: 'teacher',
      width: isMobile ? 170 : 250,
      fixed: 'left',
      ellipsis: true,
      render: (_, row) => (
        <StackedCell
          primary={row.full_name}
          secondary={
            isMobile ? `NIP ${row.nip || '-'}` : `RFID ${row.card_uid || '-'} · NIP ${row.nip || '-'}`
          }
        />
      ),
    },
    {
      title: 'Tanggal',
      dataIndex: 'attendance_date',
      width: isMobile ? 96 : 130,
      ellipsis: true,
      render: (value) => formatDateCell(value, isMobile),
    },
    {
      title: 'Status',
      dataIndex: 'attendance_status',
      width: isMobile ? 130 : 160,
      render: (value) => <StatusTag value={value} colorMap={STATUS_COLORS} />,
    },
    {
      title: 'Datang',
      dataIndex: 'checkin_at',
      width: isMobile ? 108 : 140,
      ellipsis: true,
      render: (value) => formatDateTimeCell(value, isMobile),
    },
    {
      title: 'Pulang',
      dataIndex: 'checkout_at',
      width: isMobile ? 108 : 140,
      ellipsis: true,
      render: (value) => formatDateTimeCell(value, isMobile),
    },
    buildActionColumn(handleRowAction),
  ];

  const sessionColumns = [
    {
      title: 'Tanggal',
      dataIndex: 'attendance_date',
      width: isMobile ? 92 : 120,
      fixed: 'left',
      ellipsis: true,
      render: (value) => formatDateCell(value, isMobile),
    },
    {
      title: 'Jam / Status',
      key: 'slot',
      width: isMobile ? 140 : 165,
      render: (_, row) => (
        <Flex vertical gap={4} style={{ minWidth: 0 }}>
          <StackedCell primary={formatSlotRange(row)} secondary={formatSlotTimeRange(row)} />
          <StatusTag value={row.session_status} colorMap={SESSION_STATUS_COLORS} />
        </Flex>
      ),
    },
    {
      title: 'Guru',
      key: 'teacher',
      width: isMobile ? 160 : 230,
      ellipsis: true,
      render: (_, row) => (
        <StackedCell
          primary={row.full_name}
          secondary={
            isMobile ? `NIP ${row.nip || '-'}` : `RFID ${row.card_uid || '-'} · NIP ${row.nip || '-'}`
          }
        />
      ),
    },
    {
      title: 'Kelas / Mapel',
      key: 'class',
      width: isMobile ? 140 : 190,
      ellipsis: true,
      render: (_, row) => <StackedCell primary={row.class_name} secondary={row.subject_name} />,
    },
    {
      title: 'Masuk',
      dataIndex: 'actual_checkin_at',
      width: isMobile ? 108 : 140,
      ellipsis: true,
      render: (value) => formatDateTimeCell(value, isMobile),
    },
    {
      title: 'Keluar',
      dataIndex: 'actual_checkout_at',
      width: isMobile ? 108 : 140,
      ellipsis: true,
      render: (value) => formatDateTimeCell(value, isMobile),
    },
    buildActionColumn(handleSessionRowAction),
  ];

  return (
    <Flex vertical gap={isMobile ? 12 : 18} style={{ width: '100%', minWidth: 0 }}>
      <Card variant="borderless" style={surfaceCardStyle} styles={surfaceCardBodyStyles(isMobile)}>
        <Flex vertical gap={16} style={{ minWidth: 0 }}>
          <ReportHeader
            title="Laporan Presensi Guru"
            description="Kehadiran harian dari tap gate, sesi mengajar per kelas, dan rekapitulasi bulanan."
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
                  icon={<RefreshCw size={16} />}
                  loading={isFetching}
                  onClick={() => refetch()}
                  disabled={activeTab === 'rekap'}
                  style={toolbarButtonStyle(isMobile)}>
                  Refresh
                </Button>
              </>
            }
          />

          {activeTab !== 'rekap' && (
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
                placeholder="Cari nama guru"
                prefix={<Search size={16} />}
                style={filterControlStyle(isMobile, 180)}
              />
              {activeTab === 'kehadiran' && (
                <Select
                  showSearch={{ optionFilterProp: 'label' }}
                  virtual={false}
                  allowClear
                  popupMatchSelectWidth={false}
                  value={status}
                  onChange={setStatus}
                  placeholder="Filter status"
                  options={TEACHER_STATUS_FILTER_OPTIONS}
                  style={filterControlStyle(isMobile, 180)}
                />
              )}
              {activeTab === 'mengajar' && (
                <>
                  <Input
                    allowClear
                    value={sessionCardUid}
                    onChange={(event) => setSessionCardUid(event.target.value)}
                    placeholder="Filter no RFID"
                    style={filterControlStyle(isMobile, 170)}
                  />
                  <Select
                    showSearch={{ optionFilterProp: 'label' }}
                    virtual={false}
                    allowClear
                    popupMatchSelectWidth={false}
                    value={sessionClassId}
                    onChange={setSessionClassId}
                    placeholder="Filter kelas"
                    options={classOptions}
                    style={filterControlStyle(isMobile, 170)}
                  />
                </>
              )}
            </FilterBar>
          )}
        </Flex>
      </Card>

      <StatCardGrid items={statItems} isMobile={isMobile} />

      <Card variant="borderless" style={surfaceCardStyle} styles={surfaceCardBodyStyles(isMobile)}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          size={isMobile ? 'small' : 'middle'}
          tabBarGutter={isMobile ? 12 : 24}
          items={[
            {
              key: 'kehadiran',
              label: (
                <Flex align="center" gap={8}>
                  <DoorOpen size={16} />
                  Kehadiran
                </Flex>
              ),
              children: (
                <>
                  {rows.length > 0 && (
                    <BulkDeleteBar
                      selectedCount={selectedRowKeys.length}
                      loading={bulkDeleting}
                      onDelete={handleBulkDelete}
                      label="data absensi"
                      isMobile={isMobile}
                      icon={<Trash2 size={16} />}
                    />
                  )}
                  {rows.length === 0 && !isLoading && !isFetching ? (
                    <Empty description="Belum ada data presensi guru pada rentang ini." />
                  ) : (
                    <div style={tableShellStyle}>
                      <Table
                        rowKey="id"
                        loading={isLoading || (isFetching && rows.length > 0)}
                        dataSource={rows}
                        columns={dailyColumns}
                        {...buildTableProps({ isMobile, minWidth: isMobile ? 720 : 930 })}
                        pagination={buildPagination({
                          pageSize,
                          setPageSize,
                          isMobile,
                          unit: 'catatan',
                        })}
                        rowSelection={buildRowSelection({
                          selectedRowKeys,
                          onChange: setSelectedRowKeys,
                          isMobile,
                        })}
                      />
                    </div>
                  )}
                </>
              ),
            },
            {
              key: 'mengajar',
              label: (
                <Flex align="center" gap={8}>
                  <BookOpen size={16} />
                  Mengajar
                </Flex>
              ),
              children: (
                <>
                  {sessionRows.length > 0 && (
                    <BulkDeleteBar
                      selectedCount={selectedSessionRowKeys.length}
                      loading={bulkDeletingSessions}
                      onDelete={handleBulkDeleteSessions}
                      label="data sesi mengajar"
                      isMobile={isMobile}
                      icon={<Trash2 size={16} />}
                    />
                  )}
                  {sessionRows.length === 0 && !isLoading && !isFetching ? (
                    <Empty description="Belum ada data sesi mengajar pada rentang ini." />
                  ) : (
                    <div style={tableShellStyle}>
                      <Table
                        rowKey="id"
                        loading={isLoading || (isFetching && sessionRows.length > 0)}
                        dataSource={sessionRows}
                        columns={sessionColumns}
                        {...buildTableProps({ isMobile, minWidth: isMobile ? 900 : 1140 })}
                        pagination={buildPagination({
                          pageSize: sessionPageSize,
                          setPageSize: setSessionPageSize,
                          isMobile,
                          unit: 'sesi',
                        })}
                        rowSelection={buildRowSelection({
                          selectedRowKeys: selectedSessionRowKeys,
                          onChange: setSelectedSessionRowKeys,
                          isMobile,
                        })}
                      />
                    </div>
                  )}
                </>
              ),
            },
            {
              key: 'rekap',
              label: (
                <Flex align="center" gap={8}>
                  <ChartColumn size={16} />
                  Rekapitulasi
                </Flex>
              ),
              children: (
                <TeachingRecapPanel
                  homebaseId={homebaseId}
                  periodeId={periodeId}
                  classOptions={classOptions}
                  pollingInterval={pollingInterval}
                />
              ),
            },
          ]}
        />
      </Card>

      <Modal
        title="Detail Sesi Mengajar"
        centered
        open={!!detailSessionRow}
        onCancel={() => setDetailSessionRow(null)}
        footer={null}
        width={modalWidth(isMobile)}
        styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}>
        {detailSessionRow && (
          <Descriptions
            bordered
            column={detailColumnConfig}
            size="small"
            styles={{
              label: { width: isMobile ? 130 : 170, whiteSpace: 'nowrap' },
              content: { wordBreak: 'break-word' },
            }}
            items={[
              { key: 'id', label: 'ID', children: formatDetailValue(detailSessionRow.id) },
              {
                key: 'status',
                label: 'Status',
                children: (
                  <Tag
                    color={SESSION_STATUS_COLORS[detailSessionRow.session_status] || 'default'}
                    style={{ margin: 0 }}>
                    {detailSessionRow.session_status}
                  </Tag>
                ),
              },
              {
                key: 'date',
                label: 'Tanggal',
                span: 2,
                children: formatDetailValue(detailSessionRow.attendance_date),
              },
              { key: 'name', label: 'Nama Guru', children: formatDetailValue(detailSessionRow.full_name) },
              { key: 'nip', label: 'NIP', children: formatDetailValue(detailSessionRow.nip) },
              { key: 'class', label: 'Kelas', children: formatDetailValue(detailSessionRow.class_name) },
              { key: 'card', label: 'No RFID', children: formatDetailValue(detailSessionRow.card_uid) },
              {
                key: 'subject',
                label: 'Mata Pelajaran',
                children: formatDetailValue(detailSessionRow.subject_name),
              },
              { key: 'slot', label: 'Jam Ke', children: formatSlotRange(detailSessionRow) },
              { key: 'schedule', label: 'Jadwal', children: formatSlotTimeRange(detailSessionRow) },
              {
                key: 'planned_start',
                label: 'Rencana Mulai',
                children: formatDateTimeDetail(detailSessionRow.planned_start_at),
              },
              {
                key: 'planned_end',
                label: 'Rencana Selesai',
                children: formatDateTimeDetail(detailSessionRow.planned_end_at),
              },
              {
                key: 'checkin',
                label: 'Masuk Kelas',
                children: formatDateTimeDetail(detailSessionRow.actual_checkin_at),
              },
              {
                key: 'checkout',
                label: 'Keluar Kelas',
                children: formatDateTimeDetail(detailSessionRow.actual_checkout_at),
              },
              {
                key: 'late',
                label: 'Terlambat (menit)',
                children: formatDetailValue(detailSessionRow.late_minutes),
              },
              {
                key: 'notes',
                label: 'Catatan',
                span: 2,
                children: formatDetailValue(detailSessionRow.notes),
              },
            ]}
          />
        )}
      </Modal>

      <Modal
        title="Detail Presensi Guru"
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
            styles={{
              label: { width: isMobile ? 130 : 170, whiteSpace: 'nowrap' },
              content: { wordBreak: 'break-word' },
            }}
            items={[
              { key: 'id', label: 'ID', children: formatDetailValue(detailRow.id) },
              {
                key: 'status',
                label: 'Status',
                children: (
                  <Tag
                    color={STATUS_COLORS[detailRow.attendance_status] || 'default'}
                    style={{ margin: 0 }}>
                    {detailRow.attendance_status}
                  </Tag>
                ),
              },
              {
                key: 'date',
                label: 'Tanggal',
                span: 2,
                children: formatDetailValue(detailRow.attendance_date),
              },
              { key: 'name', label: 'Nama Guru', children: formatDetailValue(detailRow.full_name) },
              { key: 'nip', label: 'NIP', children: formatDetailValue(detailRow.nip) },
              { key: 'card', label: 'No RFID', children: formatDetailValue(detailRow.card_uid) },
              {
                key: 'user_id',
                label: 'User ID',
                span: 2,
                children: formatDetailValue(detailRow.user_id),
              },
              { key: 'checkin', label: 'Datang', children: formatDateTimeDetail(detailRow.checkin_at) },
              { key: 'checkout', label: 'Pulang', children: formatDateTimeDetail(detailRow.checkout_at) },
              {
                key: 'late',
                label: 'Terlambat (menit)',
                children: formatDetailValue(detailRow.late_minutes),
              },
              {
                key: 'presence',
                label: 'Durasi Hadir',
                children: formatMinutesToHours(detailRow.presence_minutes),
              },
              {
                key: 'minimum',
                label: 'Min. Wajib',
                children: formatMinutesToHours(detailRow.minimum_required_minutes),
              },
              { key: 'notes', label: 'Catatan', span: 2, children: formatDetailValue(detailRow.notes) },
            ]}
          />
        )}
      </Modal>

      <Modal
        title="Edit Presensi Guru"
        centered
        open={!!editingRow}
        onCancel={closeEditModal}
        onOk={handleSaveEdit}
        confirmLoading={savingEdit}
        okText="Simpan"
        width={modalWidth(isMobile, 520)}>
        <Flex vertical gap={12} style={{ marginTop: 8 }}>
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            virtual={false}
            value={editStatus}
            onChange={setEditStatus}
            placeholder="Status"
            options={TEACHER_STATUS_OPTIONS}
            style={{ width: '100%' }}
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

      <Modal
        title="Edit Sesi Mengajar"
        centered
        open={!!editingSessionRow}
        onCancel={closeEditSessionModal}
        onOk={handleSaveSessionEdit}
        confirmLoading={savingSessionEdit}
        okText="Simpan"
        width={modalWidth(isMobile, 520)}>
        <Flex vertical gap={12} style={{ marginTop: 8 }}>
          <Select
            showSearch={{ optionFilterProp: 'label' }}
            virtual={false}
            value={editSessionStatus}
            onChange={setEditSessionStatus}
            placeholder="Status"
            options={TEACHER_SESSION_STATUS_OPTIONS}
            style={{ width: '100%' }}
          />
          <DatePicker
            showTime
            value={editSessionCheckin}
            onChange={setEditSessionCheckin}
            style={{ width: '100%' }}
            placeholder="Masuk kelas"
            format="YYYY-MM-DD HH:mm:ss"
          />
          <DatePicker
            showTime
            value={editSessionCheckout}
            onChange={setEditSessionCheckout}
            style={{ width: '100%' }}
            placeholder="Keluar kelas"
            format="YYYY-MM-DD HH:mm:ss"
          />
          <Input.TextArea
            value={editSessionNotes}
            onChange={(event) => setEditSessionNotes(event.target.value)}
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
