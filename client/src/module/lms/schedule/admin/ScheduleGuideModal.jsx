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
            3. Beban & Ketentuan
          </Tag>
          <Tag color='green' style={SCHEDULE_TAG_STYLE}>
            4. Susun Final Manual
          </Tag>
        </Space>
      </Card>

      <Alert
        showIcon
        type='info'
        message='Urutan paling aman: Master Jadwal -> Konfigurasi Shift & Slot -> Beban Ajar -> Ketentuan Guru -> Susun Jadwal Final Manual.'
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
            title: "2) Isi Beban Ajar Per Kelas",
            description: (
              <Space direction='vertical' size={4}>
                <Text>
                  Pilih kelas, mapel, guru, lalu isi jumlah sesi per minggu.
                </Text>
                <Text>
                  Contoh: Inggris 7A = <Tag>4 sesi</Tag>, maka sistem akan cari{" "}
                  <Tag>2 + 2</Tag>.
                </Text>
                <Text>
                  Jika 3 sesi, sistem akan cari <Tag>2 + 1</Tag>.
                </Text>
              </Space>
            ),
          },
          {
            title: "3) Isi Ketentuan Guru (Tidak Tersedia)",
            description: (
              <Space direction='vertical' size={4}>
                <Text>Tambahkan hari/jam yang tidak bisa diambil guru.</Text>
                <Text>
                  Contoh: tidak bisa Jumat, atau tidak bisa 08:00 - 10:00.
                </Text>
              </Space>
            ),
          },
          {
            title: "4) Susun Jadwal Final",
            description: (
              <Space direction='vertical' size={4}>
                <Text>
                  Tambahkan jadwal manual berdasarkan beban ajar yang masih
                  tersedia pada shift aktif.
                </Text>
                <Text>
                  Sistem tetap memvalidasi bentrok kelas, guru, slot
                  istirahat, dan ketentuan guru saat penyimpanan.
                </Text>
              </Space>
            ),
          },
          {
            title: "5) Review Board dan Rapikan",
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
        <Text>
          1. Kurangi beban sesi mapel yang terlalu padat di hari tertentu.
        </Text>
        <Text>
          2. Longgarkan ketentuan guru yang terlalu sempit (jika memungkinkan).
        </Text>
        <Text>
          3. Tambah jam sekolah atau kurangi istirahat jika kebijakan sekolah
          mengizinkan.
        </Text>
        <Text>4. Tambahkan atau pindahkan jadwal manual sampai alokasi sesi terpenuhi.</Text>
      </Space>
    </Modal>
  );
};

export default ScheduleGuideModal;
