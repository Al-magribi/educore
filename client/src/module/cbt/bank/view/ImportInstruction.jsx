import React from "react";
import { motion } from "framer-motion";
import { Alert, Table, Typography, Card, Flex, Tag } from "antd";
import { Info, FileSpreadsheet, CheckCircle2 } from "lucide-react";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const ImportInstruction = () => (
  <MotionDiv
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.22, ease: "easeOut" }}
    style={{ marginBottom: 20 }}
  >
    <Card
      bordered={false}
      style={{
        borderRadius: 20,
        background: "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(236,253,245,0.98))",
        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.05)",
      }}
      styles={{ body: { padding: 18 } }}
    >
      <Flex justify="space-between" align="center" gap={12} wrap="wrap" style={{ marginBottom: 14 }}>
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Panduan Format Excel
          </Title>
          <Text type="secondary">
            Pastikan struktur data mengikuti template agar proses import berjalan stabil.
          </Text>
        </div>
        <Tag
          bordered={false}
          style={{
            marginInlineEnd: 0,
            borderRadius: 999,
            padding: "6px 12px",
            background: "rgba(37, 99, 235, 0.10)",
            color: "#1d4ed8",
            fontWeight: 600,
          }}
        >
          Template Wajib
        </Tag>
      </Flex>

      <Alert
        message="Aturan Pengisian Excel"
        type="info"
        showIcon
        icon={<Info size={18} />}
        description="Gunakan kolom sesuai format template. Untuk tipe tertentu, isi kolom key atau option mengikuti struktur yang ditetapkan sistem."
        style={{ borderRadius: 16, marginBottom: 14 }}
      />

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <Table
          size="small"
          pagination={false}
          bordered
          scroll={{ x: 420 }}
          style={{ marginTop: 4, minWidth: "420px" }}
          dataSource={[
            { id: 1, tipe: "PG", key: "Huruf jawaban benar (A/B/C)", note: "Isi option_a sampai option_e sesuai kebutuhan" },
            { id: 4, tipe: "Isian", key: "Daftar jawaban dipisahkan koma", note: "Contoh: 10, Sepuluh" },
            { id: 5, tipe: "B/S", key: "Tulis Benar atau Salah", note: "Gunakan penulisan yang konsisten" },
            { id: 6, tipe: "Menjodohkan", key: "Sisi Kiri | Sisi Kanan", note: "Format per option wajib dipisahkan karakter |" },
            { id: 3, tipe: "Uraian", key: "-", note: "Tidak membutuhkan opsi jawaban" },
          ]}
          columns={[
            { title: "ID", dataIndex: "id", key: "id", width: 60 },
            {
              title: "Jenis",
              dataIndex: "tipe",
              key: "tipe",
              width: 120,
              render: (value) => (
                <Flex align="center" gap={8}>
                  <FileSpreadsheet size={14} color="#1d4ed8" />
                  <span>{value}</span>
                </Flex>
              ),
            },
            { title: "Isi Kolom Key / Option", dataIndex: "key", key: "key", width: 200 },
            {
              title: "Catatan",
              dataIndex: "note",
              key: "note",
              render: (value) => (
                <Flex align="center" gap={8}>
                  <CheckCircle2 size={14} color="#16a34a" />
                  <span>{value}</span>
                </Flex>
              ),
            },
          ]}
        />
      </div>
    </Card>
  </MotionDiv>
);

export default ImportInstruction;
