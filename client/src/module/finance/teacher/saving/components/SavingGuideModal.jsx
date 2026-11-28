import { memo } from "react";
import { Button, Card, Grid, Modal, Space, Tag, Typography } from "antd";
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

import { museColors, museRadius, museShadow } from "../../../../../config/theme";
const { Text, Title } = Typography;
const MotionDiv = motion.div;

const guideSteps = [
  {
    key: "scope",
    icon: SlidersHorizontal,
    color: museColors.primary,
    background: "rgba(14, 165, 233, 0.12)",
    title: "Tentukan cakupan data",
    description:
      "Gunakan filter kelas, siswa, jenis transaksi, atau kata kunci untuk mempersempit daftar siswa yang sedang dikelola.",
  },
  {
    key: "verify",
    icon: UserRoundSearch,
    color: museColors.purple,
    background: "rgba(139, 92, 246, 0.12)",
    title: "Pilih siswa dan periksa saldo",
    description:
      "Buka kartu siswa untuk melihat saldo terkini. Tombol Detail menampilkan riwayat transaksi lengkap yang bisa difilter berdasarkan jenis maupun tanggal.",
  },
  {
    key: "deposit",
    icon: ArrowDownCircle,
    color: museColors.success,
    background: "rgba(5, 150, 105, 0.12)",
    title: "Catat setoran",
    description:
      "Klik tombol Setoran pada kartu siswa atau tombol Catat Tabungan, isi nominal, lalu simpan. Saldo siswa langsung bertambah setelah transaksi tersimpan.",
  },
  {
    key: "withdrawal",
    icon: ArrowUpCircle,
    color: museColors.accent,
    background: "rgba(217, 119, 6, 0.12)",
    title: "Catat penarikan",
    description:
      "Klik tombol Penarikan, isi nominal dan keterangan keperluan penarikan. Nominal tidak boleh melebihi saldo siswa yang tersedia.",
  },
  {
    key: "history",
    icon: History,
    color: museColors.primary,
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

const SavingGuideModal = ({ open, onClose }) => {
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.md;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={
        <Button
          type='primary'
          onClick={onClose}
          size='large'
          block={isMobile}
          style={{ borderRadius: 999, fontWeight: 600, paddingInline: 28 }}
        >
          Mengerti
        </Button>
      }
      width={isMobile ? "calc(100vw - 24px)" : "min(720px, calc(100vw - 24px))"}
      closable={false}
      centered
      title={null}
      styles={{
        body: {
          padding: 0,
          background: museColors.bgLayout,
          maxHeight: isMobile ? "calc(100vh - 140px)" : undefined,
          overflowY: isMobile ? "auto" : undefined,
        },
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: museRadius.card,
        },
        footer: {
          display: "flex",
          justifyContent: isMobile ? "stretch" : "flex-end",
          padding: isMobile ? "12px 16px 16px" : "12px 24px 20px",
          background: museColors.bgLayout,
          margin: 0,
        },
      }}
      modalRender={(node) => (
        <MotionDiv
          initial={{ opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{ borderRadius: museRadius.card, overflow: "hidden" }}
        >
          {node}
        </MotionDiv>
      )}
    >
      <div
        style={{
          padding: isMobile ? "20px 16px" : "28px 24px",
          background:
            museColors.success,
        }}
      >
        <Space orientation='vertical' size={8}>
          <Space align='center' size={10}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: museRadius.card,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(255,255,255,0.14)",
              }}
            >
              <BookOpen size={20} color={museColors.bgLayout} />
            </div>
            <Tag
              color='green'
              style={{ borderRadius: 999, paddingInline: 12, fontWeight: 600, margin: 0 }}
            >
              Panduan Operasional
            </Tag>
          </Space>
          <Title
            level={isMobile ? 5 : 4}
            style={{ margin: 0, color: museColors.bgLayout, lineHeight: 1.3 }}
          >
            Panduan Mencatat Tabungan Siswa
          </Title>
          <Text
            style={{
              color: "rgba(226,232,240,0.85)",
              fontSize: isMobile ? 13 : 14,
            }}
          >
            Ikuti alur berikut agar setoran dan penarikan tercatat rapi serta
            mudah dilacak lintas periode.
          </Text>
        </Space>
      </div>

      <div style={{ padding: isMobile ? "14px 16px 8px" : "20px 24px 8px" }}>
        <Space orientation='vertical' size={12} style={{ width: "100%" }}>
          {guideSteps.map((step, index) => {
            const Icon = step.icon;

            return (
              <Card
                key={step.key}
                variant='borderless'
                style={{
                  borderRadius: museRadius.card,
                  border: `1px solid ${museColors.divider}`,
                  boxShadow: museShadow.card,
                }}
                styles={{ body: { padding: isMobile ? 12 : 16 } }}
              >
                <Space align='start' size={14} style={{ width: "100%" }}>
                  <div
                    style={{
                      width: isMobile ? 40 : 44,
                      height: isMobile ? 40 : 44,
                      borderRadius: museRadius.card,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: step.background,
                      flexShrink: 0,
                    }}
                  >
                    <Icon size={20} color={step.color} />
                  </div>
                  <Space orientation='vertical' size={2} style={{ minWidth: 0 }}>
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
                    <Text strong style={{ fontSize: isMobile ? 14 : 15 }}>
                      {step.title}
                    </Text>
                    <Text type='secondary' style={{ fontSize: isMobile ? 12 : 14 }}>
                      {step.description}
                    </Text>
                  </Space>
                </Space>
              </Card>
            );
          })}

          <Card
            variant='borderless'
            style={{
              borderRadius: museRadius.card,
              background:
                museColors.primarySoft,
              border: "1px solid rgba(5, 150, 105, 0.18)",
            }}
            styles={{ body: { padding: isMobile ? 12 : 16 } }}
          >
            <Space orientation='vertical' size={10} style={{ width: "100%" }}>
              <Space align='center' size={8}>
                <ShieldCheck size={18} color={museColors.success} />
                <Text strong style={{ color: museColors.success }}>
                  Ketentuan Penting
                </Text>
              </Space>
              {guideRules.map((rule) => (
                <Space key={rule} align='start' size={8}>
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: museColors.success,
                      marginTop: 8,
                      flexShrink: 0,
                    }}
                  />
                  <Text style={{ color: museColors.textBody, fontSize: isMobile ? 13 : 14 }}>
                    {rule}
                  </Text>
                </Space>
              ))}
            </Space>
          </Card>
        </Space>
      </div>
    </Modal>
  );
};

export default memo(SavingGuideModal);
