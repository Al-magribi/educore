import React from "react";
import {
  Alert,
  Card,
  Divider,
  Grid,
  Modal,
  Space,
  Steps,
  Tag,
  Typography,
} from "antd";
import { BookOpenCheck } from "lucide-react";
import {
  SCHEDULE_INNER_CARD_STYLE,
  SCHEDULE_TAG_STYLE,
  getScheduleInnerCardBody,
  getScheduleModalWidth,
} from "./scheduleAdminStyles";

const { Paragraph, Text } = Typography;
const { useBreakpoint } = Grid;

const ScheduleGuideModal = ({ open, onClose }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Modal
      open={open}
      title={
        <Space wrap>
          <BookOpenCheck size={18} />
          <span>Panduan Pembuatan Jadwal</span>
        </Space>
      }
      onCancel={onClose}
      onOk={onClose}
      okText="Saya Mengerti"
      width={getScheduleModalWidth(isMobile, 920)}
      centered
      styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
    >
      <Card
        size="small"
        style={{ ...SCHEDULE_INNER_CARD_STYLE, marginBottom: 16 }}
        styles={{ body: getScheduleInnerCardBody(isMobile) }}
      >
        <Space size={[8, 8]} wrap>
          <Tag color="blue" style={SCHEDULE_TAG_STYLE}>
            Pilih Versi Jadwal
          </Tag>
          <Tag color="cyan" style={SCHEDULE_TAG_STYLE}>
            1. Shift & Kelas
          </Tag>
          <Tag color="geekblue" style={SCHEDULE_TAG_STYLE}>
            2. Struktur Waktu
          </Tag>
          <Tag color="gold" style={SCHEDULE_TAG_STYLE}>
            3. Kegiatan
          </Tag>
          <Tag color="green" style={SCHEDULE_TAG_STYLE}>
            4. Jadwal Final
          </Tag>
          <Tag color="purple" style={SCHEDULE_TAG_STYLE}>
            5. Review & Aktivasi
          </Tag>
        </Space>
      </Card>

      <Alert
        showIcon
        type="info"
        message="Satu periode bisa punya beberapa versi jadwal (misal Jadwal Reguler dan Jadwal Ramadhan), tetapi hanya satu yang aktif sebagai jadwal operasional."
        description='Mulai dari daftar Versi Jadwal: buat atau duplikat versi, tekan "Buka" untuk menyusun isinya langkah demi langkah, lalu aktifkan di langkah terakhir. Anda selalu bisa mundur ke langkah sebelumnya tanpa mengubah data.'
        style={{ marginBottom: 16 }}
      />

      <Steps
        direction="vertical"
        size="small"
        items={[
          {
            title: "Pilih atau Buat Versi Jadwal",
            description: (
              <Space direction="vertical" size={4}>
                <Text>
                  Di layar daftar, tambah versi baru atau duplikat versi yang
                  sudah ada. Duplikat menyalin seluruh isi versi (shift,
                  struktur waktu, kegiatan, dan jadwal final) sebagai draft.
                </Text>
                <Text>
                  Versi berstatus Draft aman diutak-atik karena tidak
                  memengaruhi jadwal operasional.
                </Text>
              </Space>
            ),
          },
          {
            title: "1) Atur Shift & Kelas",
            description: (
              <Space direction="vertical" size={4}>
                <Text>
                  Kelompokkan kelas ke dalam shift (misal Shift Pagi dan Shift
                  Siang). Sekolah satu sesi cukup memakai satu shift.
                </Text>
                <Text>
                  Pastikan semua kelas aktif yang dibutuhkan masuk ke salah
                  satu shift. Kelas yang tidak dipakai boleh dibiarkan belum
                  terpetakan.
                </Text>
              </Space>
            ),
          },
          {
            title: "2) Atur Struktur Waktu",
            description: (
              <Space direction="vertical" size={4}>
                <Text>
                  Untuk tiap shift, tentukan hari sekolah, jam pelajaran (jam
                  ke-1, ke-2, dst. dengan rentang waktu masing-masing), dan
                  waktu istirahat.
                </Text>
                <Text>Istirahat bisa lebih dari satu kali dalam sehari.</Text>
              </Space>
            ),
          },
          {
            title: "3) Atur Kegiatan Sekolah (Opsional)",
            description: (
              <Space direction="vertical" size={4}>
                <Text>
                  Blok slot untuk upacara, ekstrakurikuler, atau agenda khusus
                  lainnya.
                </Text>
                <Text>
                  Kegiatan bisa berlaku untuk semua kelas atau kelas tertentu.
                </Text>
              </Space>
            ),
          },
          {
            title: "4) Susun Jadwal Final",
            description: (
              <Space direction="vertical" size={4}>
                <Text>
                  Tambahkan jadwal manual berdasarkan alokasi guru, mapel, dan
                  kelas yang sudah terdaftar. Klik edit pada entri untuk
                  memindahkan hari/slot.
                </Text>
                <Text>
                  Sistem memvalidasi bentrok kelas, guru, dan kegiatan saat
                  penyimpanan.
                </Text>
              </Space>
            ),
          },
          {
            title: "5) Review & Aktivasi",
            description: (
              <Space direction="vertical" size={4}>
                <Text>
                  Periksa checklist validasi: shift tanpa kelas, kelas yang
                  belum terpetakan, shift tanpa struktur waktu, dan jumlah
                  entri final.
                </Text>
                <Text>
                  Tekan "Aktifkan Versi Ini" untuk menjadikannya jadwal
                  operasional. Entri final menjadi published dan dipakai
                  absensi RFID; versi aktif sebelumnya kembali menjadi draft.
                </Text>
              </Space>
            ),
          },
        ]}
      />

      <Divider style={{ margin: "12px 0" }} />

      <Paragraph style={{ marginBottom: 8 }}>
        <Text strong>
          Penyesuaian di tengah periode (misal jam dipendekkan saat Ramadhan):
        </Text>
      </Paragraph>
      <Space direction="vertical" size={2} style={{ marginBottom: 12 }}>
        <Text>
          1. Duplikat versi aktif dari daftar Versi Jadwal, beri nama baru
          (misal "Jadwal Ramadhan").
        </Text>
        <Text>
          2. Buka salinannya, sesuaikan jam pelajaran di langkah Struktur
          Waktu. Jadwal final ikut tersalin dan tetap valid karena terikat ke
          nomor jam, bukan jam absolut.
        </Text>
        <Text>3. Review lalu aktifkan versi baru tersebut.</Text>
        <Text>
          4. Setelah masa penyesuaian selesai, aktifkan kembali versi reguler
          dari daftar.
        </Text>
      </Space>

      <Paragraph style={{ marginBottom: 8 }}>
        <Text strong>Tips cepat saat terjadi konflik:</Text>
      </Paragraph>
      <Space direction="vertical" size={2}>
        <Text>1. Pindahkan jadwal ke hari atau slot lain yang masih kosong.</Text>
        <Text>2. Periksa apakah slot sudah terblokir oleh kegiatan sekolah.</Text>
        <Text>
          3. Tambah jam pelajaran manual atau sesuaikan istirahat jika
          kebijakan sekolah mengizinkan.
        </Text>
        <Text>
          4. Tambahkan atau pindahkan jadwal manual sampai alokasi terpenuhi.
        </Text>
      </Space>
    </Modal>
  );
};

export default ScheduleGuideModal;
