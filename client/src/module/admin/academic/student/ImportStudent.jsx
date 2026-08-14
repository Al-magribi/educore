import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Drawer,
  Button,
  Upload,
  Table,
  message,
  Alert,
  Space,
  Typography,
  Collapse,
  Row,
  Col,
  Statistic,
  Tooltip,
  Flex,
  Card,
  Tag,
} from "antd";
import {
  InboxOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  MinusCircleOutlined,
} from "@ant-design/icons";
import { UploadCloud, X, Sparkles } from "lucide-react";
import * as XLSX from "xlsx";
import {
  useLazyExportStudentsQuery,
  useImportStudentsMutation,
} from "../../../../service/academic/ApiStudent";
import {
  downloadStudentExcel,
  STUDENT_SHEET_NAME,
} from "./studentImportTemplate";

const { Dragger } = Upload;
const { Title, Text } = Typography;
const MotionDiv = motion.div;

const normalizeText = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return `${value}`.trim();
};

const normalizeKey = (value) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, " ");

const pickValue = (row, keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && `${row[key]}`.trim() !== "") {
      return row[key];
    }
  }
  return "";
};

const buildClassLookup = (classes = []) => {
  const byGradeAndName = new Map();
  const byName = new Map();

  classes.forEach((item) => {
    const tingkat = normalizeKey(item.tingkat || item.grade_name);
    const kelas = normalizeKey(item.kelas || item.class_name || item.name);
    if (!kelas) return;

    byGradeAndName.set(`${tingkat}||${kelas}`, item);
    if (!byName.has(kelas)) byName.set(kelas, []);
    byName.get(kelas).push(item);
  });

  return { byGradeAndName, byName };
};

const resolveClass = (lookup, tingkat, kelas) => {
  const classKey = normalizeKey(kelas);
  const gradeKey = normalizeKey(tingkat);
  if (!classKey) return null;

  if (gradeKey) {
    const exact = lookup.byGradeAndName.get(`${gradeKey}||${classKey}`);
    if (exact) return exact;
  }

  const matches = lookup.byName.get(classKey) || [];
  return matches.length === 1 ? matches[0] : null;
};

const buildRow = ({ row, index, classLookup, currentByNis }) => {
  const nis = normalizeText(pickValue(row, ["NIS", "nis"]));
  const nisn = normalizeText(pickValue(row, ["NISN", "nisn"]));
  const fullName = normalizeText(
    pickValue(row, ["Nama", "Nama Lengkap", "full_name", "name"]),
  );
  const tingkat = normalizeText(
    pickValue(row, ["Tingkat", "Grade", "tingkat", "current_grade"]),
  );
  const kelas = normalizeText(
    pickValue(row, ["Kelas", "Class", "kelas", "current_class"]),
  );
  const rfidNo = normalizeText(
    pickValue(row, ["RFID", "No RFID", "rfid_no", "rfid"]),
  ).toUpperCase();

  const matchedClass = resolveClass(classLookup, tingkat, kelas);
  const current = currentByNis.get(nis);
  const errors = [];

  if (!nis) errors.push("NIS wajib diisi");
  if (!fullName) errors.push("Nama wajib diisi");
  if (!kelas) errors.push("Kelas wajib diisi");
  if (kelas && !matchedClass) {
    errors.push(`Kelas tidak ditemukan: ${tingkat ? `${tingkat} - ${kelas}` : kelas}`);
  }
  if (nis && !current) errors.push("Siswa tidak ditemukan");

  const changes = [];
  if (current && errors.length === 0) {
    if (normalizeKey(current.full_name) !== normalizeKey(fullName)) changes.push("Nama");
    if (normalizeText(current.nisn) !== nisn) changes.push("NISN");
    if (normalizeKey(current.tingkat) !== normalizeKey(tingkat) ||
      normalizeKey(current.kelas) !== normalizeKey(kelas)) {
      changes.push("Kelas");
    }
    if (normalizeText(current.rfid_no).toUpperCase() !== rfidNo) changes.push("RFID");
  }

  return {
    key: index,
    nis,
    nisn,
    full_name: fullName,
    tingkat,
    kelas,
    rfid_no: rfidNo,
    errors,
    changes,
    isValid: errors.length === 0,
    willUpdate: errors.length === 0 && changes.length > 0,
    unchanged: errors.length === 0 && changes.length === 0,
  };
};

const ImportStudent = ({ open, onClose, onFinish }) => {
  const [tableData, setTableData] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [classRefs, setClassRefs] = useState([]);
  const [currentByNis, setCurrentByNis] = useState(new Map());
  const [refsReady, setRefsReady] = useState(false);
  const [fetchExport, { isFetching: isDownloading }] = useLazyExportStudentsQuery();
  const [importStudents, { isLoading: isUploading }] = useImportStudentsMutation();

  useEffect(() => {
    if (!open) {
      setTableData([]);
      setFileList([]);
      setRefsReady(false);
      return undefined;
    }

    let cancelled = false;
    setRefsReady(false);
    fetchExport()
      .unwrap()
      .then((result) => {
        if (cancelled) return;
        const students = result?.data || [];
        setCurrentByNis(
          new Map(students.map((item) => [normalizeText(item.nis), item])),
        );
        setClassRefs(result?.classes || []);
        setRefsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          message.error("Gagal memuat data siswa periode aktif.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, fetchExport]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!tableData.length || !refsReady) return;
    setTableData((prev) =>
      prev.map((item) =>
        buildRow({
          row: item,
          index: item.key,
          classLookup: buildClassLookup(classRefs),
          currentByNis,
        }),
      ),
    );
  }, [classRefs, currentByNis, refsReady, tableData.length]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDownload = async () => {
    try {
      const result = await fetchExport().unwrap();
      const students = result?.data || [];
      const classes = result?.classes || [];
      setClassRefs(classes);
      setCurrentByNis(
        new Map(students.map((item) => [normalizeText(item.nis), item])),
      );
      downloadStudentExcel({ students, classes });
      message.success(
        students.length > 0
          ? `File berisi ${students.length} data siswa periode aktif siap diedit.`
          : "Template berhasil diunduh. Belum ada data siswa di periode aktif.",
      );
    } catch (error) {
      message.error(error?.data?.message || "Gagal mengunduh data siswa.");
    }
  };

  const handleFile = (file) => {
    if (!refsReady) {
      message.error("Data referensi periode aktif belum siap. Coba beberapa saat lagi.");
      return false;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames.includes(STUDENT_SHEET_NAME)
          ? STUDENT_SHEET_NAME
          : workbook.SheetNames[0];
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          raw: false,
          defval: "",
        });
        const classLookup = buildClassLookup(classRefs);
        const formattedData = jsonData.map((row, index) =>
          buildRow({
            row,
            index,
            classLookup,
            currentByNis,
          }),
        );
        setTableData(formattedData);
        setFileList([{ uid: file.uid, name: file.name, status: "done" }]);
        message.success(`Berhasil memuat ${formattedData.length} baris data.`);
      } catch (error) {
        console.error(error);
        message.error("Gagal memproses file. Pastikan format Excel sesuai template.");
      }
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleDeleteRow = (key) => {
    setTableData((prev) => prev.filter((item) => item.key !== key));
  };

  const handleUploadSubmit = async () => {
    const validData = tableData.filter((item) => item.isValid);
    if (validData.length === 0) {
      return message.error("Tidak ada data valid untuk diimpor.");
    }

    try {
      const result = await importStudents({
        students: validData.map((item) => ({
          nis: item.nis,
          nisn: item.nisn,
          full_name: item.full_name,
          tingkat: item.tingkat,
          kelas: item.kelas,
          rfid_no: item.rfid_no,
        })),
      }).unwrap();

      const summary = result?.summary || {};
      message.success(
        result?.message ||
          `Import selesai. ${summary.updated || 0} diperbarui, ${summary.unchanged || 0} tidak berubah.`,
      );
      setTableData([]);
      setFileList([]);
      onClose();
      if (onFinish) onFinish();
    } catch (error) {
      message.error(error?.data?.message || "Gagal mengimpor data siswa.");
    }
  };

  const summary = useMemo(() => {
    const totalData = tableData.length;
    const validCount = tableData.filter((item) => item.isValid).length;
    const updateCount = tableData.filter((item) => item.willUpdate).length;
    const unchangedCount = tableData.filter((item) => item.unchanged).length;
    const errorCount = totalData - validCount;
    return { totalData, validCount, updateCount, unchangedCount, errorCount };
  }, [tableData]);

  const columns = [
    { title: "NIS", dataIndex: "nis", width: 140 },
    { title: "NISN", dataIndex: "nisn", width: 150 },
    { title: "Nama", dataIndex: "full_name", width: 220 },
    { title: "Tingkat", dataIndex: "tingkat", width: 110 },
    { title: "Kelas", dataIndex: "kelas", width: 160 },
    { title: "RFID", dataIndex: "rfid_no", width: 160 },
    {
      title: "Status",
      key: "status",
      width: 120,
      align: "center",
      render: (_, record) => {
        if (!record.isValid) {
          return (
            <Tooltip title={record.errors.join(", ")}>
              <Tag color="error" style={{ margin: 0, borderRadius: 999 }}>
                <WarningOutlined /> Error
              </Tag>
            </Tooltip>
          );
        }
        if (record.unchanged) {
          return (
            <Tooltip title="Data sama, tidak akan diperbarui">
              <Tag style={{ margin: 0, borderRadius: 999 }}>
                <MinusCircleOutlined /> Sama
              </Tag>
            </Tooltip>
          );
        }
        return (
          <Tooltip title={`Akan diperbarui: ${record.changes.join(", ")}`}>
            <Tag color="success" style={{ margin: 0, borderRadius: 999 }}>
              <CheckCircleOutlined /> Update
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Aksi",
      key: "action",
      width: 70,
      align: "center",
      render: (_, record) => (
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={() => handleDeleteRow(record.key)}
        />
      ),
    },
  ];

  return (
    <Drawer
      title={null}
      width={1100}
      onClose={onClose}
      open={open}
      closable={false}
      destroyOnHidden
      styles={{
        header: { display: "none" },
        body: {
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          padding: 0,
          background: "#f8fafc",
        },
      }}
    >
      <MotionDiv
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.24, ease: "easeOut" }}
        style={{ height: "100%", display: "flex", flexDirection: "column" }}
      >
        <div
          style={{
            padding: 24,
            background:
              "linear-gradient(135deg, rgba(239,246,255,1), rgba(236,253,245,0.98))",
            borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
          }}
        >
          <Flex justify="space-between" align="flex-start" gap={16}>
            <Flex align="flex-start" gap={16}>
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: 20,
                  display: "grid",
                  placeItems: "center",
                  background: "linear-gradient(135deg, #2563eb, #14b8a6)",
                  color: "#fff",
                  boxShadow: "0 18px 32px rgba(37, 99, 235, 0.24)",
                  flexShrink: 0,
                }}
              >
                <UploadCloud size={24} />
              </div>
              <div>
                <Flex align="center" gap={10} wrap="wrap" style={{ marginBottom: 6 }}>
                  <Title level={3} style={{ margin: 0 }}>
                    Import Data Siswa
                  </Title>
                  <Tag
                    bordered={false}
                    style={{
                      marginInlineEnd: 0,
                      borderRadius: 999,
                      padding: "6px 12px",
                      background:
                        summary.errorCount > 0
                          ? "rgba(245,158,11,.12)"
                          : "rgba(37,99,235,.10)",
                      color: summary.errorCount > 0 ? "#b45309" : "#1d4ed8",
                      fontWeight: 600,
                    }}
                  >
                    {summary.totalData === 0
                      ? "Menunggu File"
                      : summary.errorCount > 0
                        ? "Perlu Review"
                        : "Siap Impor"}
                  </Tag>
                </Flex>
                <Text type="secondary" style={{ display: "block", maxWidth: 620 }}>
                  Unggah file Excel hasil unduhan. Hanya data yang berbeda yang akan
                  diperbarui pada periode aktif.
                </Text>
              </div>
            </Flex>
            <Flex gap={10} wrap="wrap" justify="flex-end">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                loading={isDownloading}
                style={{ borderRadius: 14 }}
              >
                Download
              </Button>
              <Button onClick={onClose} icon={<X size={16} />} style={{ borderRadius: 14 }}>
                Tutup
              </Button>
              <Button
                onClick={handleUploadSubmit}
                type="primary"
                loading={isUploading}
                disabled={summary.validCount === 0}
                style={{
                  borderRadius: 14,
                  boxShadow: "0 12px 24px rgba(37,99,235,.20)",
                }}
              >
                Impor {summary.updateCount > 0 ? `(${summary.updateCount})` : ""}
              </Button>
            </Flex>
          </Flex>

          {summary.totalData > 0 && (
            <Row gutter={[12, 12]} style={{ marginTop: 18 }}>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ borderRadius: 18 }} styles={{ body: { padding: "14px 16px" } }}>
                  <Statistic title="Total" value={summary.totalData} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ borderRadius: 18 }} styles={{ body: { padding: "14px 16px" } }}>
                  <Statistic title="Akan Update" value={summary.updateCount} valueStyle={{ color: "#15803d" }} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ borderRadius: 18 }} styles={{ body: { padding: "14px 16px" } }}>
                  <Statistic title="Tidak Berubah" value={summary.unchangedCount} />
                </Card>
              </Col>
              <Col xs={12} sm={6}>
                <Card size="small" style={{ borderRadius: 18 }} styles={{ body: { padding: "14px 16px" } }}>
                  <Statistic title="Perlu Cek" value={summary.errorCount} valueStyle={{ color: "#dc2626" }} />
                </Card>
              </Col>
            </Row>
          )}
        </div>

        <div style={{ padding: 20, flex: 1, overflow: "auto" }}>
          <div style={{ flexShrink: 0, marginBottom: 16 }}>
            <Collapse
              size="small"
              defaultActiveKey={["1"]}
              items={[
                {
                  key: "1",
                  label: (
                    <Space>
                      <InfoCircleOutlined />
                      <span>Panduan Export & Import Excel</span>
                    </Space>
                  ),
                  children: (
                    <Alert
                      message="Aturan Pengisian Data"
                      description={
                        <div>
                          <ol style={{ paddingLeft: 20, margin: "0 0 10px" }}>
                            <li>
                              Klik <strong>Download</strong> untuk mengunduh data siswa
                              periode aktif: NIS, NISN, Nama, Tingkat, Kelas, RFID.
                            </li>
                            <li>
                              Edit sheet <strong>Data Siswa</strong> saja. Jangan ubah
                              nama kolom.
                            </li>
                            <li>
                              Cocokkan <strong>Tingkat</strong> dan <strong>Kelas</strong>{" "}
                              dengan sheet <strong>Referensi Kelas</strong>.
                            </li>
                            <li>
                              Unggah file, tinjau status baris, lalu klik{" "}
                              <strong>Impor</strong>.
                            </li>
                          </ol>
                          <ul style={{ paddingLeft: 20, margin: 0 }}>
                            <li>
                              <strong>NIS</strong> dipakai sebagai kunci pencarian siswa.
                            </li>
                            <li>
                              Jika data berbeda, baris akan diperbarui. Jika sama, dilewati.
                            </li>
                            <li>
                              Import tidak menambah siswa baru. NIS yang tidak ditemukan
                              ditandai error.
                            </li>
                          </ul>
                        </div>
                      }
                      type="info"
                      showIcon
                    />
                  ),
                },
              ]}
            />
          </div>

          {summary.totalData === 0 ? (
            <Card
              bordered={false}
              style={{ borderRadius: 24, boxShadow: "0 18px 40px rgba(15,23,42,.06)" }}
              styles={{ body: { padding: 24 } }}
            >
              <Dragger
                accept=".xlsx, .xls"
                beforeUpload={handleFile}
                fileList={fileList}
                onChange={(info) => setFileList(info.fileList.slice(-1))}
                showUploadList={false}
                disabled={!refsReady}
                style={{
                  minHeight: 320,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  alignItems: "center",
                  padding: 24,
                  border: "2px dashed #93c5fd",
                  borderRadius: 22,
                  background:
                    "linear-gradient(135deg, rgba(239,246,255,0.85), rgba(240,253,250,0.85))",
                }}
              >
                <p className="ant-upload-drag-icon">
                  <InboxOutlined style={{ color: "#2563eb", fontSize: 52 }} />
                </p>
                <Title level={3}>Klik atau tarik file Excel ke sini</Title>
                <Text type="secondary">
                  {refsReady
                    ? "Gunakan file hasil download data siswa periode aktif."
                    : "Menunggu data siswa dan referensi kelas periode aktif."}
                </Text>
                <div style={{ marginTop: 20 }}>
                  <Tag
                    bordered={false}
                    style={{
                      borderRadius: 999,
                      padding: "8px 14px",
                      background: "rgba(37,99,235,.10)",
                      color: "#1d4ed8",
                      fontWeight: 600,
                    }}
                  >
                    <Flex align="center" gap={8}>
                      <Sparkles size={14} />
                      <span>Update hanya jika data berbeda</span>
                    </Flex>
                  </Tag>
                </div>
              </Dragger>
            </Card>
          ) : (
            <>
              {summary.errorCount > 0 && (
                <Alert
                  message={`Terdapat ${summary.errorCount} baris belum valid. Periksa NIS, nama, atau kecocokan tingkat/kelas.`}
                  type="warning"
                  showIcon
                  style={{ marginBottom: 12 }}
                />
              )}
              <Table
                columns={columns}
                dataSource={tableData}
                rowKey="key"
                pagination={false}
                size="small"
                bordered
                scroll={{ x: 1100, y: "calc(100vh - 390px)" }}
              />
            </>
          )}
        </div>
      </MotionDiv>
    </Drawer>
  );
};

export default ImportStudent;
