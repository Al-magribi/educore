import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Drawer,
  Button,
  Upload,
  Table,
  message,
  Alert,
  Select,
  Tag,
  Space,
  Typography,
  Card,
  Statistic,
  Row,
  Col,
  Tooltip,
  Collapse,
  Divider,
  Flex,
} from "antd";
import {
  InboxOutlined,
  DeleteOutlined,
  FileExcelOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import { UploadCloud, X, Sparkles, School, CalendarRange } from "lucide-react";
import * as XLSX from "xlsx";
import {
  useGetClassesQuery,
  useGetPeriodesQuery,
} from "../../../../../service/public/ApiPublic";
import { useUploadStudentsMutation } from "../../../../../service/main/ApiClass";

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;
const MotionDiv = motion.div;

const UploadStudent = ({ open, onClose }) => {
  // --- STATE ---
  const [tableData, setTableData] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [selectedPeriodeId, setSelectedPeriodeId] = useState(null); // State untuk Periode

  // --- API ---
  const { data: refClasses } = useGetClassesQuery({ gradeId: "" });
  const { data: refPeriode } = useGetPeriodesQuery();
  const [uploadStudents, { isLoading: isUploading }] =
    useUploadStudentsMutation();

  // --- HELPER: Normalize Class Data ---
  const classOptions = useMemo(() => {
    if (!refClasses) return [];
    return Array.isArray(refClasses) ? refClasses : refClasses.classes || [];
  }, [refClasses]);

  // --- HELPER: Download Template ---
  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { NIS: "123456", Nama: "Contoh Siswa", "L/P": "L", Kelas: "X-RPL-1" },
      { NIS: "123457", Nama: "Siti Aminah", "L/P": "P", Kelas: "X-TKJ-2" },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Upload_Siswa.xlsx");
  };

  // --- HANDLER: Parse Excel ---
  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const formattedData = jsonData.map((row, index) => {
        const excelClassName = row["Kelas"] || row.className || "";

        // Auto-match logic (Case insensitive)
        const matchedClass = classOptions.find(
          (c) =>
            c.name?.trim().toLowerCase() ===
            excelClassName?.toString().trim().toLowerCase(),
        );

        return {
          key: index,
          nis: row["NIS"] || row.nis,
          name: row["Nama"] || row.name,
          gender: row["L/P"] || row.gender,
          excelClassName: excelClassName,
          selectedClassId: matchedClass ? matchedClass.id : null,
        };
      });

      setTableData(formattedData);
      message.success(`Berhasil memuat ${formattedData.length} baris data.`);
    };
    reader.readAsArrayBuffer(file);
    return false;
  };

  // --- HANDLER: Manual Class Correction ---
  const handleClassChange = (value, rowKey) => {
    const newData = [...tableData];
    const index = newData.findIndex((item) => item.key === rowKey);
    if (index > -1) {
      newData[index].selectedClassId = value;
      setTableData(newData);
    }
  };

  // --- HANDLER: Delete Row ---
  const handleDeleteRow = (key) => {
    setTableData(tableData.filter((item) => item.key !== key));
  };

  // --- HANDLER: Submit ---
  const handleUploadSubmit = async () => {
    // Validasi Periode
    if (!selectedPeriodeId) {
      return message.error("Harap pilih Periode Akademik terlebih dahulu!");
    }

    const validData = tableData.filter((item) => item.selectedClassId);
    if (validData.length === 0) {
      return message.error("Tidak ada data valid untuk diupload.");
    }

    try {
      const payload = {
        periodeId: selectedPeriodeId, // Kirim ID periode yang dipilih
        students: validData.map((item) => ({
          nis: item.nis,
          name: item.name,
          gender: item.gender,
          classId: item.selectedClassId,
        })),
      };

      // NOTE: Pastikan backend menerima object { periodeId, students }
      // atau sesuaikan jika backend mengharapkan array langsung.
      // Di bawah ini asumsi kita kirim array siswa dan periode via query/body terpisah,
      // namun praktik terbaik untuk bulk mutation adalah mengirim object wrapper.
      // Jika backend strictly array, Anda mungkin perlu passing periodeId via URL params.

      // Sesuai kode backend Anda (RouterClass.js), dia menerima Array `req.body`.
      // Kita perlu menyisipkan periodeId atau mengubah Backend sedikit.
      // Solusi Frontend-Only (Tanpa ubah backend structure array):
      // Kita kirim array, tapi periodeId mungkin harus via Query Param atau Header.
      // TAPI, saran terbaik adalah mengubah Backend sedikit.
      // *Lihat catatan di bawah kode ini*.

      await uploadStudents(payload).unwrap();

      message.success("Data siswa berhasil disinkronisasi ke server!");
      setTableData([]);
      setFileList([]);
      onClose();
    } catch (error) {
      console.error(error);
      message.error(error?.data?.message || "Gagal upload data.");
    }
  };

  // --- STATISTICS ---
  const totalData = tableData.length;
  const validCount = tableData.filter((i) => i.selectedClassId).length;
  const errorCount = totalData - validCount;
  const readinessLabel =
    totalData === 0
      ? "Menunggu File"
      : errorCount === 0
        ? "Siap Diunggah"
        : "Perlu Review";

  // --- TABLE COLUMNS ---
  const columns = [
    {
      title: "NIS",
      dataIndex: "nis",
      width: 120,
      render: (text) => <Text strong>{text}</Text>,
    },
    {
      title: "Nama Siswa",
      dataIndex: "name",
      width: 250,
      ellipsis: true,
    },
    {
      title: "L/P",
      dataIndex: "gender",
      width: 80,
      align: "center",
      render: (text) => (
        <Tag
          color={text === "L" ? "blue" : text === "P" ? "magenta" : "default"}
        >
          {text || "?"}
        </Tag>
      ),
    },
    {
      title: "Kelas (Excel)",
      dataIndex: "excelClassName",
      width: 150,
      render: (text) => <Text type='secondary'>{text || "-"}</Text>,
    },
    {
      title: "Mapping Sistem",
      dataIndex: "selectedClassId",
      width: 250,
      render: (value, record) => (
        <Select
          showSearch
          style={{ width: "100%" }}
          placeholder='Pilih Kelas...'
          value={value}
          onChange={(val) => handleClassChange(val, record.key)}
          status={!value ? "error" : ""}
          filteredOption={(input, option) =>
            (option?.children ?? "").toLowerCase().includes(input.toLowerCase())
          }
          virtual={false}
        >
          {classOptions.map((cls) => (
            <Option key={cls.id} value={cls.id}>
              {cls.name}
            </Option>
          ))}
        </Select>
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      align: "center",
      render: (_, record) => {
        return record.selectedClassId ? (
          <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 18 }} />
        ) : (
          <Tooltip title='Kelas tidak dikenali'>
            <WarningOutlined style={{ color: "#f5222d", fontSize: 18 }} />
          </Tooltip>
        );
      },
    },
    {
      title: "Aksi",
      key: "action",
      width: 60,
      align: "center",
      render: (_, record) => (
        <Button
          type='text'
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
        header: {
          display: "none",
        },
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
              "linear-gradient(135deg, rgba(240,253,244,1), rgba(239,246,255,0.98))",
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
                  background: "linear-gradient(135deg, #0f766e, #0284c7)",
                  color: "#fff",
                  boxShadow: "0 18px 32px rgba(2, 132, 199, 0.24)",
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
                        errorCount > 0
                          ? "rgba(245, 158, 11, 0.12)"
                          : "rgba(3, 105, 161, 0.10)",
                      color: errorCount > 0 ? "#b45309" : "#0369a1",
                      fontWeight: 600,
                    }}
                  >
                    {readinessLabel}
                  </Tag>
                </Flex>
                <Text type="secondary" style={{ display: "block", maxWidth: 620 }}>
                  Upload file Excel, tinjau hasil mapping kelas, lalu sinkronkan
                  siswa ke sistem dengan alur yang lebih jelas dan aman.
                </Text>
              </div>
            </Flex>

            <Flex gap={10} wrap="wrap" justify="flex-end">
              <Button
                icon={<DownloadOutlined />}
                onClick={downloadTemplate}
                style={{ borderRadius: 14 }}
              >
                Template
              </Button>
              <Button
                onClick={onClose}
                icon={<X size={16} />}
                style={{ borderRadius: 14 }}
              >
                Tutup
              </Button>
              <Button
                onClick={handleUploadSubmit}
                type="primary"
                loading={isUploading}
                disabled={validCount === 0 || !selectedPeriodeId}
                style={{
                  borderRadius: 14,
                  boxShadow: "0 12px 24px rgba(2, 132, 199, 0.20)",
                }}
              >
                Upload {validCount > 0 ? `(${validCount})` : ""}
              </Button>
            </Flex>
          </Flex>

          <Row gutter={[12, 12]} style={{ marginTop: 20 }}>
            <Col xs={24} md={12}>
              <Card
                size="small"
                style={{
                  borderRadius: 18,
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                  boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                }}
                styles={{ body: { padding: "14px 16px" } }}
              >
                <Flex align="center" gap={10} style={{ marginBottom: 10 }}>
                  <CalendarRange size={18} color="#0369a1" />
                  <Text strong>Pilih Periode Masuk / Tahun Ajaran</Text>
                </Flex>
                <Select
                  size="large"
                  style={{ width: "100%" }}
                  placeholder="Pilih Periode (Wajib)"
                  onChange={setSelectedPeriodeId}
                  value={selectedPeriodeId}
                  options={refPeriode?.map((p) => ({ label: p.name, value: p.id }))}
                  allowClear
                  virtual={false}
                />
              </Card>
            </Col>

            <Col xs={24} md={12}>
              <Row gutter={[12, 12]}>
                <Col xs={24} sm={8}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 18,
                      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                    }}
                    styles={{ body: { padding: "14px 16px" } }}
                  >
                    <Statistic title="Data" value={totalData} />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 18,
                      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                    }}
                    styles={{ body: { padding: "14px 16px" } }}
                  >
                    <Statistic
                      title="Valid"
                      value={validCount}
                      valueStyle={{ color: "#15803d" }}
                    />
                  </Card>
                </Col>
                <Col xs={24} sm={8}>
                  <Card
                    size="small"
                    style={{
                      borderRadius: 18,
                      boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
                    }}
                    styles={{ body: { padding: "14px 16px" } }}
                  >
                    <Statistic
                      title="Perlu Cek"
                      value={errorCount}
                      valueStyle={{ color: "#dc2626" }}
                    />
                  </Card>
                </Col>
              </Row>
            </Col>
          </Row>
        </div>

        <div style={{ padding: 20, flex: 1, overflow: "auto" }}>
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.04 }}
            style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: "100%" }}
          >
            <Collapse
              size="small"
              style={{
                borderRadius: 18,
                overflow: "hidden",
                boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
              }}
              items={[
                {
                  key: "1",
                  label: (
                    <Space>
                      <InfoCircleOutlined />
                      <span>Panduan Format & Template Excel</span>
                    </Space>
                  ),
                  children: (
                    <div>
                      <Alert
                        title="Aturan Pengisian Data"
                        description={
                          <ul style={{ paddingLeft: 20, margin: 0 }}>
                            <li>
                              <b>NIS:</b> Wajib diisi dan unik.
                            </li>
                            <li>
                              <b>Nama:</b> Gunakan nama lengkap siswa.
                            </li>
                            <li>
                              <b>L/P:</b> Isi dengan huruf `L` atau `P`.
                            </li>
                            <li>
                              <b>Kelas:</b> Samakan nama kelas dengan data sistem,
                              atau koreksi mapping di tabel review.
                            </li>
                          </ul>
                        }
                        type="info"
                        showIcon
                        style={{ marginBottom: 12 }}
                      />
                      <Flex gap={10} wrap="wrap">
                        <Button
                          icon={<DownloadOutlined />}
                          onClick={downloadTemplate}
                        >
                          Download Template
                        </Button>
                        <Tag
                          bordered={false}
                          color="processing"
                          style={{ borderRadius: 999, padding: "6px 12px" }}
                        >
                          Format .xlsx / .xls
                        </Tag>
                      </Flex>
                    </div>
                  ),
                },
              ]}
            />

            {tableData.length === 0 ? (
              <Card
                bordered={false}
                style={{
                  flex: 1,
                  borderRadius: 24,
                  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
                }}
                styles={{ body: { padding: 24, height: "100%" } }}
              >
                <Dragger
                  accept=".xlsx, .xls"
                  beforeUpload={handleFile}
                  fileList={fileList}
                  showUploadList={false}
                  style={{
                    minHeight: 360,
                    padding: 40,
                    border: "2px dashed #93c5fd",
                    borderRadius: 22,
                    background:
                      "linear-gradient(135deg, rgba(239,246,255,0.85), rgba(240,253,250,0.85))",
                  }}
                >
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined style={{ color: "#0284c7", fontSize: 52 }} />
                  </p>
                  <Title level={3}>Klik atau tarik file Excel ke sini</Title>
                  <Text type="secondary">
                    Sistem akan membaca file, melakukan auto-mapping kelas, lalu
                    menampilkan hasil review sebelum upload.
                  </Text>
                  <div style={{ marginTop: 20 }}>
                    <Tag
                      bordered={false}
                      style={{
                        borderRadius: 999,
                        padding: "8px 14px",
                        background: "rgba(14, 165, 233, 0.10)",
                        color: "#0369a1",
                        fontWeight: 600,
                      }}
                    >
                      <Flex align="center" gap={8}>
                        <Sparkles size={14} />
                        <span>Auto-match nama kelas dari file Excel</span>
                      </Flex>
                    </Tag>
                  </div>
                </Dragger>
              </Card>
            ) : (
              <Card
                bordered={false}
                style={{
                  borderRadius: 24,
                  boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)",
                }}
                styles={{ body: { padding: 18 } }}
              >
                <Flex justify="space-between" align="center" gap={12} wrap="wrap">
                  <div>
                    <Title level={4} style={{ margin: 0 }}>
                      Review & Mapping Data
                    </Title>
                    <Text type="secondary">
                      Periksa kecocokan kelas sebelum data disinkronkan ke server.
                    </Text>
                  </div>
                  <Tag
                    bordered={false}
                    style={{
                      borderRadius: 999,
                      padding: "8px 14px",
                      fontWeight: 600,
                      color: "#0369a1",
                      background: "rgba(3, 105, 161, 0.10)",
                    }}
                  >
                    <Flex align="center" gap={8}>
                      <School size={14} />
                      <span>{classOptions.length} kelas tersedia</span>
                    </Flex>
                  </Tag>
                </Flex>

                <Divider style={{ margin: "16px 0" }} />

                {errorCount > 0 && (
                  <Alert
                    title={`Terdapat ${errorCount} data dengan kelas yang belum dikenali.`}
                    description="Perbaiki mapping pada kolom sistem sebelum menekan tombol upload."
                    type="warning"
                    showIcon
                    style={{ marginBottom: 14, borderRadius: 16 }}
                  />
                )}

                <Table
                  dataSource={tableData}
                  columns={columns}
                  rowKey="key"
                  pagination={false}
                  size="small"
                  bordered
                  scroll={{ y: "calc(100vh - 360px)", x: 980 }}
                />
              </Card>
            )}
          </MotionDiv>
        </div>
      </MotionDiv>
    </Drawer>
  );
};

export default UploadStudent;
