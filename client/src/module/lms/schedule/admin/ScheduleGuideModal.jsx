import React from "react";
import { Alert, Divider, Modal, Space, Steps, Tag, Typography } from "antd";
import { BookOpenCheck } from "lucide-react";

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
      <Alert
        showIcon
        type='info'
        message='Urutan paling aman: Konfigurasi Slot -> Beban Ajar -> Ketentuan Guru -> Generate -> Cek & Edit Manual.'
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
            title: "4) Klik Generate Jadwal",
            description: (
              <Space direction='vertical' size={4}>
                <Text>
                  Sistem otomatis cek bentrok kelas, bentrok guru, slot
                  istirahat, dan ketentuan guru.
                </Text>
                <Text>
                  Jika ada yang gagal, sistem menampilkan jumlah item konflik.
                </Text>
              </Space>
            ),
          },
          {
            title: "5) Cek Hasil dan Ubah Manual",
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
        <Text>4. Generate ulang, lalu rapikan dengan edit manual.</Text>
      </Space>
    </Modal>
  );
};

export default ScheduleGuideModal;
