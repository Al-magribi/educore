import React from "react";
import { Card, Empty, Grid, Space, Tag, Typography } from "antd";
import { motion } from "framer-motion";
import { BookOpenCheck, FolderSearch, ListChecks, Sparkles } from "lucide-react";

const { Title, Text, Paragraph } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const QuestionsPicker = () => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;

  return (
    <MotionDiv initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
      <Space direction='vertical' size={16} style={{ width: "100%" }}>
        <Card
          variant='borderless'
          style={{
            borderRadius: 26,
            overflow: "hidden",
            background:
              "radial-gradient(circle at top left, rgba(56,189,248,0.22), transparent 26%), radial-gradient(circle at right center, rgba(255,255,255,0.12), transparent 18%), linear-gradient(135deg, #0f172a 0%, #1d4ed8 54%, #0f766e 100%)",
            boxShadow: "0 24px 52px rgba(15, 23, 42, 0.16)",
          }}
          styles={{ body: { padding: isMobile ? 18 : 24 } }}
        >
          <Space orientation='vertical' size={10}>
            <Tag
              style={{
                margin: 0,
                width: "fit-content",
                borderRadius: 999,
                paddingInline: 12,
                background: "rgba(255,255,255,0.12)",
                color: "#fff",
                borderColor: "rgba(255,255,255,0.16)",
              }}
              icon={<Sparkles size={12} />}
            >
              Picker Soal
            </Tag>
            <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: "#fff" }}>
              Workspace seleksi soal yang lebih siap dikembangkan
            </Title>
            <Paragraph style={{ marginBottom: 0, color: "rgba(255,255,255,0.82)" }}>
              Komponen ini disiapkan untuk pemilihan soal dari bank soal, preview jumlah,
              dan pengelompokan tipe soal dalam antarmuka yang lebih jelas.
            </Paragraph>
          </Space>
        </Card>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
            gap: 16,
          }}
        >
          {[
            {
              key: "bank",
              label: "Sumber Soal",
              note: "Ambil soal dari satu atau beberapa bank yang tersedia.",
              icon: <FolderSearch size={18} />,
              color: "#1d4ed8",
            },
            {
              key: "review",
              label: "Preview Seleksi",
              note: "Tampilkan ringkasan total soal yang sudah dipilih.",
              icon: <BookOpenCheck size={18} />,
              color: "#15803d",
            },
            {
              key: "composition",
              label: "Komposisi Soal",
              note: "Atur distribusi jenis soal agar ujian lebih seimbang.",
              icon: <ListChecks size={18} />,
              color: "#b45309",
            },
          ].map((item) => (
            <Card
              key={item.key}
              variant='borderless'
              style={{
                borderRadius: 20,
                boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
              }}
              styles={{ body: { padding: 18 } }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 16,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                  background: "#f8fafc",
                  color: item.color,
                }}
              >
                {item.icon}
              </div>
              <Title level={5} style={{ margin: 0 }}>
                {item.label}
              </Title>
              <Text type='secondary'>{item.note}</Text>
            </Card>
          ))}
        </div>

        <Card
          variant='borderless'
          style={{
            borderRadius: 24,
            boxShadow: "0 16px 32px rgba(15, 23, 42, 0.06)",
          }}
          styles={{ body: { padding: isMobile ? 24 : 32 } }}
        >
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Space orientation='vertical' size={4}>
                <Text strong style={{ fontSize: 16 }}>
                  Pemilih soal belum diintegrasikan
                </Text>
                <Text type='secondary'>
                  UI sudah siap untuk dihubungkan ke data bank soal dan mekanisme seleksi berikutnya.
                </Text>
              </Space>
            }
          />
        </Card>
      </Space>
    </MotionDiv>
  );
};

export default QuestionsPicker;
