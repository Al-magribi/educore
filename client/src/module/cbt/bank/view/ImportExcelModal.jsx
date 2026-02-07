import React, { useState } from "react";
import {
  Modal,
  Upload,
  Button,
  message,
  Progress,
  Space,
  Typography,
} from "antd";
import {
  FileSpreadsheet,
  Download,
  UploadCloud,
  AlertCircle,
} from "lucide-react";
import * as XLSX from "xlsx";
import { downloadTemplate } from "./ExcelTemplateManager";
import ImportInstruction from "./ImportInstruction";
import { useBulkCreateQuestionMutation } from "../../../../service/cbt/ApiQuestion";

const { Dragger } = Upload;
const { Text } = Typography;

const ImportExcelModal = ({ visible, onCancel, bankId, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [bulkCreateQuestion] = useBulkCreateQuestionMutation();

  const handleParseAndUpload = (file) => {
    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = e.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);

        if (json.length === 0) {
          throw new Error("File Excel kosong atau format tidak sesuai.");
        }

        // Transformasi data untuk Bulk API
        const formattedQuestions = json.map((row) => {
          const q_type = parseInt(row.type_id);
          let options = [];

          // Mapping PG Tunggal (1) & Multi (2)
          if ([1, 2].includes(q_type)) {
            ["a", "b", "c", "d", "e"].forEach((l) => {
              if (row[`option_${l}`]) {
                options.push({
                  label: l.toUpperCase(),
                  content: row[`option_${l}`],
                  is_correct: row.key
                    ?.toString()
                    .toUpperCase()
                    .includes(l.toUpperCase()),
                });
              }
            });
          }
          // Mapping Isian Singkat (4)
          else if (q_type === 4) {
            options = (row.key?.toString().split(",") || []).map((v) => ({
              content: v.trim(),
              is_correct: true,
            }));
          }
          // Mapping Benar/Salah (5)
          else if (q_type === 5) {
            options = [
              {
                content: "Benar",
                is_correct: row.key?.toString().toLowerCase() === "benar",
              },
              {
                content: "Salah",
                is_correct: row.key?.toString().toLowerCase() === "salah",
              },
            ];
          }
          // Mapping Menjodohkan (6) - Format: Kiri | Kanan
          else if (q_type === 6) {
            ["a", "b", "c", "d", "e"].forEach((l) => {
              const val = row[`option_${l}`];
              if (val && val.includes("|")) {
                // Membagi teks menjadi Sisi Kiri (label) dan Sisi Ranan (content)
                const [left, right] = val.split("|").map((s) => s.trim());
                options.push({
                  label: left, // Teks kiri (premis)
                  content: right, // Teks kanan (jawaban)
                  is_correct: true,
                });
              }
            });
          }

          return {
            bank_soal_id: bankId,
            q_type: q_type,
            content: row.question_text,
            score_point: parseInt(row.score_point) || 1,
            options: options,
          };
        });

        // Kirim data secara Bulk (Satu Request)
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
    return false; // Mencegah upload otomatis AntD
  };

  return (
    <Modal
      centered
      title={
        <Space>
          <FileSpreadsheet size={20} color="#1890ff" />
          <span>Bulk Import Soal</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Batal
        </Button>,
        <Button
          key="dl"
          icon={<Download size={16} />}
          onClick={downloadTemplate}
          disabled={loading}
        >
          Unduh Template
        </Button>,
      ]}
    >
      <ImportInstruction />

      <div style={{ marginTop: 20 }}>
        <Dragger
          accept=".xlsx, .xls"
          beforeUpload={handleParseAndUpload}
          showUploadList={false}
          disabled={loading}
        >
          <p className="ant-upload-drag-icon">
            <UploadCloud size={48} color={loading ? "#d9d9d9" : "#40a9ff"} />
          </p>
          <p className="ant-upload-text">
            {loading
              ? "Sedang memproses data..."
              : "Klik atau seret file Excel ke sini"}
          </p>
          <p className="ant-upload-hint">
            Hanya mendukung file .xlsx atau .xls sesuai template sistem.
          </p>
        </Dragger>
      </div>

      {loading && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <Progress percent={99} status="active" strokeColor="#1890ff" />
          <Text type="secondary">Mengirim data ke server, mohon tunggu...</Text>
        </div>
      )}
    </Modal>
  );
};

export default ImportExcelModal;
