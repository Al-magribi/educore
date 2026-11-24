import React from "react";
import { motion } from "framer-motion";
import { Alert, Table, Typography, Card, Flex, Tag } from "antd";
import { Info, FileSpreadsheet, CheckCircle2 } from "lucide-react";
import { museColors, museRadius, museShadow } from "../../../../config/theme";

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
        borderRadius: museRadius.card,
        background: museColors.primarySoft,
        boxShadow: museShadow.card,
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
            color: museColors.primary,
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
        description="Kolom: group_code, group_title, stimulus, type_id, bloom_level, question_text, score_point, option_a–option_e, key. Soal mandiri mengosongkan tiga kolom grup. Soal yang berbagi bacaan memakai group_code yang sama, berurutan, minimal 2 baris, dan stimulus diisi di baris pertama. Petunjuk lengkap ada di sheet Panduan."
        style={{ borderRadius: museRadius.item, marginBottom: 14 }}
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
                  <FileSpreadsheet size={14} color={museColors.primary} />
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
                  <CheckCircle2 size={14} color={museColors.success} />
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
