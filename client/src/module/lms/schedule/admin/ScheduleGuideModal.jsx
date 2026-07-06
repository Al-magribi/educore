import React from "react";
import { Alert, Card, Divider, Modal, Space, Steps, Tag, Typography } from "antd";
import { BookOpenCheck } from "lucide-react";
import {
  SCHEDULE_INNER_CARD_BODY,
  SCHEDULE_INNER_CARD_STYLE,
  SCHEDULE_TAG_STYLE,
} from "./scheduleAdminStyles";

const { Paragraph, Text } = Typography;

const ScheduleGuideModal = ({ open, onClose }) => {
  return (
    <Modal
      open={open}
      title={
        <Space>
          <BookOpenCheck size={18} />
          <span>Panduan Pembuatan Jadwal</span>
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
        style={{ ...SCHEDULE_INNER_CARD_STYLE, marginBottom: 16 }}
        styles={{ body: SCHEDULE_INNER_CARD_BODY }}
      >
        <Space size={[8, 8]} wrap>
          <Tag color='blue' style={SCHEDULE_TAG_STYLE}>
            1. Master & Shift
          </Tag>
          <Tag color='cyan' style={SCHEDULE_TAG_STYLE}>
            2. Slot & Hari
          </Tag>
          <Tag color='gold' style={SCHEDULE_TAG_STYLE}>
            3. Kegiatan
          </Tag>
          <Tag color='green' style={SCHEDULE_TAG_STYLE}>
            4. Susun Final Manual
          </Tag>
        </Space>
      </Card>

      <Alert
        showIcon
        type='info'
        message='Urutan paling aman: Master Jadwal -> Konfigurasi Shift & Slot -> Kegiatan -> Susun Jadwal Final Manual.'
        style={{ marginBottom: 16 }}
      />

      <Steps
        direction='vertical'
        size='small'
        items={[
          {
            title: "1) Isi Konfigurasi Slot Jadwal",
            description: (
              <Space direction='vertical' size={4}>
                <Text>
                  Tentukan durasi sesi (mis. <Tag>40 menit</Tag>), jam sekolah
                  per hari, dan waktu istirahat.
                </Text>
                <Text>Istirahat bisa lebih dari satu kali dalam sehari.</Text>
              </Space>
            ),
          },
          {
            title: "2) Atur Kegiatan Sekolah (Opsional)",
            description: (
              <Space direction='vertical' size={4}>
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
            title: "3) Susun Jadwal Final",
            description: (
              <Space direction='vertical' size={4}>
                <Text>
                  Tambahkan jadwal manual berdasarkan alokasi guru, mapel, dan
                  kelas yang sudah terdaftar.
                </Text>
                <Text>
                  Sistem memvalidasi bentrok kelas, guru, dan kegiatan saat
                  penyimpanan.
                </Text>
              </Space>
            ),
          },
          {
            title: "4) Review Board dan Rapikan",
            description: (
              <Space direction='vertical' size={4}>
                <Text>
                  Admin bisa klik edit pada jadwal untuk memindahkan hari/slot.
                </Text>
                <Text>Validasi bentrok tetap berjalan saat ubah manual.</Text>
              </Space>
            ),
          },
        ]}
      />

      <Divider style={{ margin: "12px 0" }} />

      <Paragraph style={{ marginBottom: 8 }}>
        <Text strong>Tips cepat saat terjadi konflik:</Text>
      </Paragraph>
      <Space direction='vertical' size={2}>
        <Text>1. Pindahkan jadwal ke hari atau slot lain yang masih kosong.</Text>
        <Text>2. Periksa apakah slot sudah terblokir oleh kegiatan sekolah.</Text>
        <Text>
          3. Tambah jam sekolah atau kurangi istirahat jika kebijakan sekolah
          mengizinkan.
        </Text>
        <Text>4. Tambahkan atau pindahkan jadwal manual sampai alokasi terpenuhi.</Text>
      </Space>
    </Modal>
  );
};

export default ScheduleGuideModal;
