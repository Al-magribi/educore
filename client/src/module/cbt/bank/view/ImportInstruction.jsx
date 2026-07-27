import React from "react";
import { motion } from "framer-motion";
import { Alert, Table, Typography, Card, Flex, Tag } from "antd";
import { Info, FileSpreadsheet, CheckCircle2 } from "lucide-react";

const { Text, Title } = Typography;
const MotionDiv = motion.div;

const TYPE_GUIDE = [
  {
    id: 1,
    tipe: "PG Jawaban Tunggal",
    key: "Satu huruf, contoh: A",
    note: "Isi option_a–option_e sesuai kebutuhan",
  },
  {
    id: 2,
    tipe: "PG Multi Jawaban",
    key: "Beberapa huruf, contoh: A,C,E",
    note: "Pisahkan huruf jawaban benar dengan koma",
  },
  {
    id: 3,
    tipe: "Uraian",
    key: "Kosongkan",
    note: "Tidak membutuhkan opsi maupun kunci",
  },
  {
    id: 4,
    tipe: "Isian Singkat",
    key: "Variasi dipisah koma",
    note: "Contoh: 0, Kosong",
  },
  {
    id: 5,
    tipe: "Benar / Salah",
    key: "Benar atau Salah",
    note: "Tulis tepat sesuai ejaan tersebut",
  },
  {
    id: 6,
    tipe: "Menjodohkan",
    key: "Kosongkan key",
    note: "Tiap option: Sisi Kiri | Sisi Kanan",
  },
];

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
        background:
          "linear-gradient(135deg, rgba(239,246,255,0.98), rgba(236,253,245,0.98))",
        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.05)",
      }}
      styles={{ body: { padding: 18 } }}
    >
      <Flex
        justify="space-between"
        align="center"
        gap={12}
        wrap="wrap"
        style={{ marginBottom: 14 }}
      >
        <div>
          <Title level={5} style={{ margin: 0 }}>
            Panduan Format Excel
          </Title>
          <Text type="secondary">
            Unduh template resmi — sheet Panduan berisi aturan lengkap yang
            sama dengan aplikasi.
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
        description="Kolom: type_id, bloom_level (opsional 1–6 / C1–C6), question_text, score_point, option_a–option_e, key. Isi data di sheet Template Soal; petunjuk lengkap ada di sheet Panduan."
        style={{ borderRadius: 16, marginBottom: 14 }}
      />

      <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <Table
          size="small"
          pagination={false}
          bordered
          scroll={{ x: 520 }}
          style={{ marginTop: 4, minWidth: "520px" }}
          rowKey="id"
          dataSource={TYPE_GUIDE}
          columns={[
            { title: "ID", dataIndex: "id", key: "id", width: 56 },
            {
              title: "Jenis",
              dataIndex: "tipe",
              key: "tipe",
              width: 170,
              render: (value) => (
                <Flex align="center" gap={8}>
                  <FileSpreadsheet size={14} color="#1d4ed8" />
                  <span>{value}</span>
                </Flex>
              ),
            },
            {
              title: "Isi Kolom Key",
              dataIndex: "key",
              key: "key",
              width: 180,
            },
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
