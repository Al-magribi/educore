import { memo } from "react";
import { Button, Card, Modal, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import {
  ArrowDownCircle,
  ArrowUpCircle,
  BookOpen,
  History,
  ShieldCheck,
  SlidersHorizontal,
  UserRoundSearch,
} from "lucide-react";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const guideSteps = [
  {
    key: "scope",
    icon: SlidersHorizontal,
    color: "#0ea5e9",
    background: "rgba(14, 165, 233, 0.12)",
    title: "Tentukan cakupan data",
    description:
      "Gunakan filter kelas, siswa, jenis transaksi, atau kata kunci untuk mempersempit daftar siswa yang sedang dikelola.",
  },
  {
    key: "verify",
    icon: UserRoundSearch,
    color: "#8b5cf6",
    background: "rgba(139, 92, 246, 0.12)",
    title: "Pilih siswa dan periksa saldo",
    description:
      "Buka kartu siswa untuk melihat saldo terkini. Tombol Detail menampilkan riwayat transaksi lengkap yang bisa difilter berdasarkan jenis maupun tanggal.",
  },
  {
    key: "deposit",
    icon: ArrowDownCircle,
    color: "#059669",
    background: "rgba(5, 150, 105, 0.12)",
    title: "Catat setoran",
    description:
      "Klik tombol Setoran pada kartu siswa atau tombol Catat Tabungan, isi nominal, lalu simpan. Saldo siswa langsung bertambah setelah transaksi tersimpan.",
  },
  {
    key: "withdrawal",
    icon: ArrowUpCircle,
    color: "#d97706",
    background: "rgba(217, 119, 6, 0.12)",
    title: "Catat penarikan",
    description:
      "Klik tombol Penarikan, isi nominal dan keterangan keperluan penarikan. Nominal tidak boleh melebihi saldo siswa yang tersedia.",
  },
  {
    key: "history",
    icon: History,
    color: "#2563eb",
    background: "rgba(37, 99, 235, 0.12)",
    title: "Tinjau dan lacak riwayat",
    description:
      "Buka tab Riwayat Transaksi untuk mengoreksi (edit/hapus) transaksi. Gunakan filter Periode Riwayat untuk melacak transaksi dari periode atau tingkat sebelumnya.",
  },
];

const guideRules = [
  "Transaksi baru selalu dicatat pada periode aktif yang sedang berjalan.",
  "Saldo tabungan terakumulasi lintas periode dan otomatis terbawa saat siswa naik tingkat.",
  "Keterangan wajib diisi untuk setiap penarikan agar mudah diaudit.",
  "Setiap perubahan transaksi langsung menghitung ulang saldo siswa.",
];

const SavingGuideModal = ({ open, onClose }) => (
  <Modal
    open={open}
    onCancel={onClose}
    footer={
      <Button
        type="primary"
        onClick={onClose}
        size="large"
        style={{ borderRadius: 999, fontWeight: 600, paddingInline: 28 }}
      >
        Mengerti
      </Button>
    }
    width="min(720px, calc(100vw - 24px))"
    closable={false}
    centered
    title={null}
    styles={{
      body: { padding: 0, background: "#f8fafc" },
      content: { padding: 0, overflow: "hidden", borderRadius: 24 },
      footer: {
        display: "flex",
        justifyContent: "flex-end",
        padding: "12px 24px 20px",
        background: "#f8fafc",
        margin: 0,
      },
    }}
    modalRender={(node) => (
      <MotionDiv
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        style={{ borderRadius: 24, overflow: "hidden" }}
      >
        {node}
      </MotionDiv>
    )}
  >
    <div
      style={{
        padding: "28px 24px",
        background:
          "radial-gradient(circle at top left, rgba(16,185,129,0.25), transparent 32%), linear-gradient(135deg, #0f172a, #166534 62%, #0f766e)",
      }}
    >
      <Space orientation="vertical" size={8}>
        <Space align="center" size={10}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(255,255,255,0.14)",
            }}
          >
            <BookOpen size={20} color="#f8fafc" />
          </div>
          <Tag
            color="green"
            style={{ borderRadius: 999, paddingInline: 12, fontWeight: 600 }}
          >
            Panduan Operasional
          </Tag>
        </Space>
        <Title level={4} style={{ margin: 0, color: "#f8fafc" }}>
          Panduan Mencatat Tabungan Siswa
        </Title>
        <Text style={{ color: "rgba(226,232,240,0.85)" }}>
          Ikuti alur berikut agar setoran dan penarikan tercatat rapi serta
          mudah dilacak lintas periode.
        </Text>
      </Space>
    </div>

    <div style={{ padding: "20px 24px 8px" }}>
      <Space orientation="vertical" size={12} style={{ width: "100%" }}>
        {guideSteps.map((step, index) => {
          const Icon = step.icon;

          return (
            <Card
              key={step.key}
              variant="borderless"
              style={{
                borderRadius: 18,
                border: "1px solid rgba(148, 163, 184, 0.18)",
                boxShadow: "0 6px 18px rgba(15, 23, 42, 0.04)",
              }}
              styles={{ body: { padding: 16 } }}
            >
              <Space align="start" size={14} style={{ width: "100%" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 14,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: step.background,
                    flexShrink: 0,
                  }}
                >
                  <Icon size={20} color={step.color} />
                </div>
                <Space orientation="vertical" size={2}>
                  <Space size={8} align="center">
                    <Text
                      strong
                      style={{
                        fontSize: 12,
                        color: step.color,
                        letterSpacing: 0.6,
                      }}
                    >
                      LANGKAH {index + 1}
                    </Text>
                  </Space>
                  <Text strong style={{ fontSize: 15 }}>
                    {step.title}
                  </Text>
                  <Text type="secondary">{step.description}</Text>
                </Space>
              </Space>
            </Card>
          );
        })}

        <Card
          variant="borderless"
          style={{
            borderRadius: 18,
            background:
              "linear-gradient(135deg, rgba(5,150,105,0.08), rgba(14,165,233,0.06))",
            border: "1px solid rgba(5, 150, 105, 0.18)",
          }}
          styles={{ body: { padding: 16 } }}
        >
          <Space orientation="vertical" size={10} style={{ width: "100%" }}>
            <Space align="center" size={8}>
              <ShieldCheck size={18} color="#059669" />
              <Text strong style={{ color: "#065f46" }}>
                Ketentuan Penting
              </Text>
            </Space>
            {guideRules.map((rule) => (
              <Space key={rule} align="start" size={8}>
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: "#059669",
                    marginTop: 8,
                    flexShrink: 0,
                  }}
                />
                <Text style={{ color: "#334155" }}>{rule}</Text>
              </Space>
            ))}
          </Space>
        </Card>
      </Space>
    </div>
  </Modal>
);

export default memo(SavingGuideModal);
