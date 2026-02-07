import React, { useState, useMemo } from "react";
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
import * as XLSX from "xlsx";
import {
  useGetClassesQuery,
  useGetPeriodesQuery,
} from "../../../../../service/public/ApiPublic";
import { useUploadStudentsMutation } from "../../../../../service/main/ApiClass";

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { Option } = Select;

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
      title={
        <Space>
          <FileExcelOutlined />
          <span>Import Data Siswa</span>
        </Space>
      }
      size={1000}
      onClose={onClose}
      open={open}
      // TWEAK UI 1: Flex layout agar Table mengisi sisa ruang & scroll rapi
      styles={{
        body: {
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflow: "hidden",
          paddingBottom: 80,
        },
      }}
      extra={
        <Space>
          <Button onClick={onClose}>Batal</Button>
          <Button
            onClick={handleUploadSubmit}
            type='primary'
            loading={isUploading}
            disabled={validCount === 0 || !selectedPeriodeId}
          >
            Upload {validCount > 0 ? `(${validCount})` : ""}
          </Button>
        </Space>
      }
    >
      {/* SECTION 1: INSTRUKSI & PERIODE (Fixed at Top) */}
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <Collapse
          size='small'
          items={[
            {
              key: "1",
              label: (
                <Space>
                  <InfoCircleOutlined />{" "}
                  <span>Panduan Format & Template Excel</span>
                </Space>
              ),
              children: (
                <div>
                  <Alert
                    title='Aturan Pengisian Data'
                    description={
                      <ul style={{ paddingLeft: 20, margin: 0 }}>
                        <li>
                          <b>NIS:</b> Wajib diisi (unik).
                        </li>
                        <li>
                          <b>Nama:</b> Nama lengkap siswa.
                        </li>
                        <li>
                          <b>L/P:</b> Jenis kelamin, isi dengan huruf 'L' atau
                          'P'.
                        </li>
                        <li>
                          <b>Kelas:</b> Nama kelas (Misal: X IPA 1). Jika nama
                          di Excel beda dengan sistem, Anda bisa memperbaikinya
                          di tabel bawah.
                        </li>
                      </ul>
                    }
                    type='info'
                    showIcon
                    style={{ marginBottom: 12 }}
                  />
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={downloadTemplate}
                    size='small'
                  >
                    Download Template Kosong
                  </Button>
                </div>
              ),
            },
          ]}
        />

        <Divider style={{ margin: "12px 0" }} />

        <Row gutter={16} align='middle'>
          <Col span={12}>
            <Text strong>Pilih Periode Masuk / Tahun Ajaran:</Text>
            <Select
              style={{ width: "100%", marginTop: 4 }}
              placeholder='Pilih Periode (Wajib)'
              onChange={setSelectedPeriodeId}
              value={selectedPeriodeId}
              options={refPeriode?.map((p) => ({ label: p.name, value: p.id }))}
              allowClear
              virtual={false}
            />
          </Col>
          <Col span={12}>
            {/* Statistics Box */}
            {tableData.length > 0 && (
              <Space separator={<Divider vertical />}>
                <Statistic
                  title='Data'
                  value={totalData}
                  styles={{ content: { fontSize: 16 } }}
                />
                <Statistic
                  title='Valid'
                  value={validCount}
                  styles={{ content: { fontSize: 16, color: "#3f8600" } }}
                />
                <Statistic
                  title='Error'
                  value={errorCount}
                  styles={{ content: { fontSize: 16, color: "#cf1322" } }}
                />
              </Space>
            )}
          </Col>
        </Row>
      </div>

      {/* SECTION 2: UPLOAD AREA (Jika belum ada data) */}
      {tableData.length === 0 && (
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          <Dragger
            accept='.xlsx, .xls'
            beforeUpload={handleFile}
            fileList={fileList}
            showUploadList={false}
            style={{
              padding: 40,
              border: "2px dashed #d9d9d9",
              background: "#fafafa",
            }}
          >
            <p className='ant-upload-drag-icon'>
              <InboxOutlined style={{ color: "#1677ff", fontSize: 48 }} />
            </p>
            <Title level={4}>Klik atau tarik file Excel ke sini</Title>
            <Text type='secondary'>Format .xlsx atau .xls</Text>
          </Dragger>
        </div>
      )}

      {/* SECTION 3: TABLE AREA (Scrollable) */}
      {tableData.length > 0 && (
        <div
          style={{
            flex: 1,

            display: "flex",
            flexDirection: "column",
          }}
        >
          {errorCount > 0 && (
            <Alert
              title={`Terdapat ${errorCount} data dengan kelas yang tidak dikenali.`}
              type='warning'
              banner
              style={{ marginBottom: 8 }}
            />
          )}

          <Table
            dataSource={tableData}
            columns={columns}
            rowKey='key'
            pagination={false}
            size='small'
            bordered
            // TWEAK UI 2: Kalkulasi tinggi agar header tetap sticky dan body bisa discroll
            scroll={{ y: "calc(100vh - 290px)" }}
          />
        </div>
      )}
    </Drawer>
  );
};

export default UploadStudent;
