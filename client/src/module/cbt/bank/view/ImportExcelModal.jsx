import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  Modal,
  Upload,
  Button,
  message,
  Progress,
  Typography,
  Grid,
  Flex,
  Card,
  Tag,
} from "antd";
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  Sparkles,
  X,
} from "lucide-react";
import { downloadTemplate } from "./ExcelTemplateManager";
import ImportInstruction from "./ImportInstruction";
import { useBulkCreateQuestionMutation } from "../../../../service/cbt/ApiQuestion";

const { Dragger } = Upload;
const { Text, Title } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const getRowValue = (row, keys = []) => {
  for (const key of keys) {
    const value = row?.[key];
    if (value !== undefined && value !== null && value !== "") {
      return value;
    }
  }
  return undefined;
};

const parseInteger = (value) => {
  const parsed = parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
};

const normalizeBloomLevel = (value) => {
  const parsed = parseInteger(value);
  if (!parsed || parsed < 1 || parsed > 6) {
    return null;
  }
  return parsed;
};

const ImportExcelModal = ({ visible, onCancel, bankId, onSuccess }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.sm;
  const [loading, setLoading] = useState(false);
  const [bulkCreateQuestion] = useBulkCreateQuestionMutation();

  const handleParseAndUpload = (file) => {
    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const XLSX = await import("xlsx");
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          throw new Error("File Excel kosong atau format tidak sesuai.");
        }

        const formattedQuestions = json.map((row, index) => {
          const q_type = parseInteger(
            getRowValue(row, ["type_id", "Jenis", "jenis"]),
          );
          const content = getRowValue(row, [
            "question_text",
            "Pertanyaan",
            "pertanyaan",
          ]);
          const scorePoint =
            parseInteger(getRowValue(row, ["score_point", "Poin", "poin"])) || 1;
          const answerKey = getRowValue(row, ["key", "Jawaban", "jawaban"]);
          const bloomLevel = normalizeBloomLevel(
            getRowValue(row, [
              "bloom_level",
              "Bloom Level",
              "BLOOM_LEVEL",
              "Bloom",
              "bloom",
            ]),
          );

          if (!q_type || q_type < 1 || q_type > 6) {
            throw new Error(
              `Tipe soal tidak valid pada baris ${index + 2}. Gunakan angka 1 sampai 6.`,
            );
          }

          if (!content) {
            throw new Error(`Pertanyaan wajib diisi pada baris ${index + 2}.`);
          }

          let options = [];

          if ([1, 2].includes(q_type)) {
            ["a", "b", "c", "d", "e"].forEach((l) => {
              const optionValue = getRowValue(row, [
                `option_${l}`,
                l.toUpperCase(),
                l,
              ]);
              if (optionValue) {
                options.push({
                  label: l.toUpperCase(),
                  content: optionValue,
                  is_correct: answerKey
                    ?.toString()
                    .toUpperCase()
                    .includes(l.toUpperCase()),
                });
              }
            });
          } else if (q_type === 4) {
            options = (answerKey?.toString().split(",") || []).map((v) => ({
              content: v.trim(),
              is_correct: true,
            }))
              .filter((item) => item.content);
          } else if (q_type === 5) {
            options = [
              {
                content: "Benar",
                is_correct: answerKey?.toString().toLowerCase() === "benar",
              },
              {
                content: "Salah",
                is_correct: answerKey?.toString().toLowerCase() === "salah",
              },
            ];
          } else if (q_type === 6) {
            ["a", "b", "c", "d", "e"].forEach((l) => {
              const val = getRowValue(row, [`option_${l}`, l.toUpperCase(), l]);
              if (val && val.includes("|")) {
                const [left, right] = val.split("|").map((s) => s.trim());
                if (left && right) {
                  options.push({
                    label: left,
                    content: right,
                    is_correct: true,
                  });
                }
              }
            });
          }

          return {
            bank_soal_id: bankId,
            q_type,
            bloom_level: bloomLevel,
            content,
            score_point: scorePoint,
            options,
          };
        });

        await bulkCreateQuestion(formattedQuestions).unwrap();

        message.success(`${json.length} soal berhasil diunggah.`);
        onSuccess();
      } catch (err) {
        console.error("Import Error:", err);
        message.error(
          err.data?.message || err.message || "Gagal memproses file.",
        );
      } finally {
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);
    return false;
  };

  return (
    <Modal
      centered
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnHidden
      closable={false}
      width={isMobile ? "calc(100vw - 24px)" : 760}
      styles={{
        content: {
          padding: 0,
          overflow: "hidden",
          borderRadius: 28,
          boxShadow: "0 28px 70px rgba(15, 23, 42, 0.18)",
        },
        body: { padding: 0 },
      }}
      modalRender={(modalNode) => (
        <MotionDiv
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.24, ease: "easeOut" }}
        >
          {modalNode}
        </MotionDiv>
      )}
    >
      <div
        style={{
          background:
            "linear-gradient(135deg, rgba(239,246,255,1), rgba(236,253,245,0.96))",
          padding: isMobile ? 20 : 28,
          borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
        }}
      >
        <Flex justify="space-between" align="flex-start" gap={16}>
          <Flex align="flex-start" gap={16}>
            <div
              style={{
                width: isMobile ? 48 : 56,
                height: isMobile ? 48 : 56,
                borderRadius: 18,
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg, #2563eb, #14b8a6)",
                color: "#fff",
                boxShadow: "0 16px 30px rgba(37, 99, 235, 0.28)",
                flexShrink: 0,
              }}
            >
              <FileSpreadsheet size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <Flex
                justify="space-between"
                align={isMobile ? "flex-start" : "center"}
                vertical={isMobile}
                gap={10}
              >
                <div>
                  <Title level={4} style={{ margin: 0 }}>
                    Bulk Import Soal
                  </Title>
                  <Text type="secondary" style={{ display: "block", marginTop: 6 }}>
                    Impor soal dari template Excel resmi untuk mempercepat pengisian bank soal.
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
                  Siap Produksi
                </Tag>
              </Flex>
            </div>
          </Flex>

          <Button
            onClick={onCancel}
            icon={<X size={16} />}
            style={{ borderRadius: 14, flexShrink: 0 }}
          >
            Tutup
          </Button>
        </Flex>
      </div>

      <div style={{ padding: isMobile ? 20 : 28 }}>
        <MotionDiv
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, delay: 0.05 }}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <ImportInstruction />

          <Card
            bordered={false}
            style={{
              borderRadius: 22,
              boxShadow: "0 16px 34px rgba(15, 23, 42, 0.06)",
            }}
            styles={{ body: { padding: 20 } }}
          >
            <Dragger
              accept=".xlsx, .xls"
              beforeUpload={handleParseAndUpload}
              showUploadList={false}
              disabled={loading}
              style={{
                padding: isMobile ? "18px" : "28px",
                border: "2px dashed #93c5fd",
                borderRadius: 20,
                background:
                  "linear-gradient(135deg, rgba(239,246,255,0.85), rgba(240,253,250,0.85))",
              }}
            >
              <p className="ant-upload-drag-icon">
                <UploadCloud size={52} color={loading ? "#cbd5e1" : "#2563eb"} />
              </p>
              <Title level={4} style={{ marginBottom: 8 }}>
                {loading ? "Sedang memproses data..." : "Klik atau seret file Excel ke sini"}
              </Title>
              <Text type="secondary" style={{ display: "block" }}>
                Sistem hanya menerima file `.xlsx` atau `.xls` yang mengikuti template resmi.
              </Text>
              <div style={{ marginTop: 18 }}>
                <Tag
                  bordered={false}
                  style={{
                    borderRadius: 999,
                    padding: "8px 14px",
                    background: "rgba(37, 99, 235, 0.10)",
                    color: "#1d4ed8",
                    fontWeight: 600,
                  }}
                >
                  <Flex align="center" gap={8}>
                    <Sparkles size={14} />
                    <span>Validasi struktur soal otomatis saat import</span>
                  </Flex>
                </Tag>
              </div>
            </Dragger>
          </Card>

          {loading && (
            <Card
              bordered={false}
              style={{
                borderRadius: 20,
                background: "linear-gradient(135deg, #eff6ff, #ecfeff)",
              }}
              styles={{ body: { padding: 18 } }}
            >
              <Flex vertical gap={10}>
                <Progress percent={99} status="active" strokeColor="#2563eb" />
                <Text type="secondary">
                  Data sedang diverifikasi dan dikirim ke server. Mohon tunggu hingga proses selesai.
                </Text>
              </Flex>
            </Card>
          )}

          <Flex
            justify="flex-end"
            gap={10}
            style={{ flexDirection: isMobile ? "column-reverse" : "row" }}
          >
            <Button
              onClick={onCancel}
              disabled={loading}
              block={isMobile}
              size="large"
              style={{ minWidth: isMobile ? "100%" : 92, borderRadius: 14 }}
            >
              Batal
            </Button>
            <Button
              icon={<Download size={16} />}
              onClick={downloadTemplate}
              disabled={loading}
              block={isMobile}
              size="large"
              style={{ minWidth: isMobile ? "100%" : 170, borderRadius: 14 }}
            >
              Unduh Template
            </Button>
          </Flex>
        </MotionDiv>
      </div>
    </Modal>
  );
};

export default ImportExcelModal;
