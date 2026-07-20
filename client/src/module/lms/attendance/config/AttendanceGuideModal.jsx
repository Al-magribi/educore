import { Alert, Card, Divider, Modal, Space, Steps, Tag, Typography } from "antd";
import { BookOpenCheck } from "lucide-react";
import { innerCardStyle } from "./configShared";

const { Paragraph, Text } = Typography;

const tagStyle = { borderRadius: 999, fontWeight: 600 };

const AttendanceGuideModal = ({ open, onClose }) => {
  return (
    <Modal
      open={open}
      title={
        <Space>
          <BookOpenCheck size={18} />
          <span>Panduan Presensi RFID</span>
        </Space>
      }
      onCancel={onClose}
      onOk={onClose}
      okText='Saya Mengerti'
      width={920}
      centered
    >
      <Card
        size='small'
        style={{ ...innerCardStyle, marginBottom: 16 }}
        styles={{ body: { padding: 14 } }}
      >
        <Space size={[8, 8]} wrap>
          <Tag color='blue' style={tagStyle}>
            1. Fitur
          </Tag>
          <Tag color='cyan' style={tagStyle}>
            2. Policy
          </Tag>
          <Tag color='gold' style={tagStyle}>
            3. Device RFID
          </Tag>
          <Tag color='purple' style={tagStyle}>
            4. Assignment
          </Tag>
          <Tag color='green' style={tagStyle}>
            5. Laporan
          </Tag>
        </Space>
      </Card>

      <Alert
        showIcon
        type='info'
        message='Urutan wajib: aktifkan Fitur → buat Policy → daftarkan Device RFID → petakan Assignment → pantau Laporan.'
        style={{ marginBottom: 16 }}
      />

      <Steps
        direction='vertical'
        size='small'
        items={[
          {
            title: "1) Aktifkan Fitur Presensi",
            description: (
              <Space direction='vertical' size={4}>
                <Text>
                  Buka tab <Tag>Fitur</Tag> dan nyalakan modul yang dibutuhkan
                  sekolah, lalu klik <Tag>Simpan Fitur</Tag>.
                </Text>
                <Text>
                  <Tag>Absensi Harian Siswa</Tag> — pencatatan hadir dari scan
                  gerbang.
                </Text>
                <Text>
                  <Tag>Log Checkout Siswa</Tag> — pencatatan scan pulang siswa.
                </Text>
                <Text>
                  <Tag>Absensi Harian Guru</Tag> — evaluasi kehadiran harian
                  guru.
                </Text>
                <Text>
                  <Tag>Absensi Sesi Kelas Guru</Tag> — pelacakan kepatuhan guru
                  per sesi mengajar.
                </Text>
              </Space>
            ),
          },
          {
            title: "2) Buat Policy Absensi",
            description: (
              <Space direction='vertical' size={4}>
                <Text>
                  Buka tab <Tag>Policy</Tag> dan tambahkan aturan per peran
                  (siswa/guru).
                </Text>
                <Text>
                  Untuk siswa: pilih tipe <Tag>Siswa - Fixed</Tag>, tentukan
                  hari aktif, jam check-in/check-out, toleransi terlambat, dan
                  durasi minimal kehadiran.
                </Text>
                <Text>
                  Untuk guru: pilih <Tag>Guru - Fixed Daily</Tag> atau{" "}
                  <Tag>Guru - Schedule Based</Tag> sesuai kebijakan sekolah.
                </Text>
                <Text>
                  Pastikan policy berstatus aktif sebelum digunakan di
                  assignment.
                </Text>
              </Space>
            ),
          },
          {
            title: "3) Daftarkan Device RFID",
            description: (
              <Space direction='vertical' size={4}>
                <Text>
                  Buka tab <Tag>Device RFID</Tag> dan tambahkan setiap reader
                  (gerbang, kelas, dll.).
                </Text>
                <Text>
                  Isi kode, nama, tipe device, lokasi, dan satu/lebih kelas
                  terkait untuk device classroom (mis. Device 1 untuk 7A–7D).
                  Untuk ekstrakurikuler, pilih tipe{" "}
                  <Tag>extracurricular</Tag> dan hubungkan ke policy kegiatan
                  (mis. Silat).
                </Text>
                <Text>
                  Salin <Tag>API Token</Tag> ke firmware reader agar perangkat
                  bisa mengirim data scan ke server.
                </Text>
                <Text>
                  Untuk device <Tag>gate</Tag>, set firmware ke{" "}
                  <Tag>daily_gate</Tag> agar server otomatis menentukan tap
                  datang/pulang — semua unit gate bisa memakai aksi yang sama.
                </Text>
                <Text>
                  Rotasi token jika perangkat diganti; pastikan status device{" "}
                  <Tag>aktif</Tag>.
                </Text>
              </Space>
            ),
          },
          {
            title: "4) Petakan Policy ke Pengguna",
            description: (
              <Space direction='vertical' size={4}>
                <Text>
                  Buka tab <Tag>Assignment</Tag> untuk menghubungkan policy ke
                  target yang tepat.
                </Text>
                <Text>
                  Pilih peran (<Tag>siswa</Tag> / <Tag>guru</Tag>), policy yang
                  sudah dibuat, dan cakupan: per pengguna, per kelas, atau per
                  tingkat.
                </Text>
                <Text>
                  Atur tanggal mulai/berakhir jika assignment bersifat
                  sementara.
                </Text>
                <Text>
                  Tanpa assignment, scan RFID tidak akan dievaluasi sesuai
                  aturan yang diinginkan.
                </Text>
              </Space>
            ),
          },
          {
            title: "5) Pantau Laporan Presensi",
            description: (
              <Space direction='vertical' size={4}>
                <Text>
                  Buka menu <Tag>Laporan Presensi</Tag> di sidebar untuk
                  memverifikasi sistem sudah berjalan.
                </Text>
                <Text>
                  <Tag>Log Scan</Tag> — cek semua scan RFID mentah dari device
                  (uji koneksi & token).
                </Text>
                <Text>
                  <Tag>Presensi Siswa</Tag> — rekap harian hadir, terlambat,
                  dan absen; koreksi manual jika diperlukan.
                </Text>
                <Text>
                  <Tag>Presensi Guru</Tag> — rekap kehadiran harian dan sesi
                  kelas guru.
                </Text>
              </Space>
            ),
          },
        ]}
      />

      <Divider style={{ margin: "12px 0" }} />

      <Paragraph style={{ marginBottom: 8 }}>
        <Text strong>Tips jika presensi tidak tercatat:</Text>
      </Paragraph>
      <Space direction='vertical' size={2}>
        <Text>1. Pastikan fitur terkait sudah diaktifkan di tab Fitur.</Text>
        <Text>
          2. Cek Log Scan — jika kosong, periksa koneksi device dan API Token.
        </Text>
        <Text>
          3. Pastikan siswa/guru sudah punya assignment policy yang aktif.
        </Text>
        <Text>
          4. Verifikasi jam check-in di policy sesuai waktu operasional
          sekolah.
        </Text>
        <Text>
          5. Untuk guru berbasis jadwal, pastikan jadwal kelas sudah terisi di
          modul Jadwal.
        </Text>
      </Space>
    </Modal>
  );
};

export default AttendanceGuideModal;
