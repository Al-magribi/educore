import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Col,
  Collapse,
  Flex,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { CalendarRange, School, UploadCloud, X } from "lucide-react";
import * as XLSX from "xlsx";
import {
  useGetClassesQuery,
  useGetPeriodesQuery,
} from "../../../../../service/public/ApiPublic";
import { useUploadStudentsMutation } from "../../../../../service/main/ApiClass";
import { CardTitle, MuseCard } from "../../../../../components/ui/muse";
import { ImportDrawer, ImportStats, UploadDropzone } from "../../../../../components/ui/muse/ImportKit";
import { museColors } from "../../../../../config/theme";

const { Text } = Typography;
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
      {
        NIS: "123456",
        Nama: "Contoh Siswa",
        "L/P": "L",
        Kelas: "X-RPL-1",
        "No RFID": "RFID-SISWA-0001",
      },
      {
        NIS: "123457",
        Nama: "Siti Aminah",
        "L/P": "P",
        Kelas: "X-TKJ-2",
        "No RFID": "",
      },
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
          rfid_no: row["No RFID"] || row["RFID"] || row.rfid_no || row.rfid,
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
          rfid_no: item.rfid_no || null,
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
      title: "No RFID",
      dataIndex: "rfid_no",
      width: 170,
      render: (text) => <Text>{text || "-"}</Text>,
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
          <CheckCircleOutlined style={{ color: museColors.success, fontSize: 18 }} />
        ) : (
          <Tooltip title='Kelas tidak dikenali'>
            <WarningOutlined style={{ color: museColors.danger, fontSize: 18 }} />
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
    <ImportDrawer
      open={open}
      onClose={onClose}
      icon={<UploadCloud size={16} />}
      title="Import Data Siswa"
      description="Upload Excel, tinjau mapping kelas, lalu sinkronkan ke sistem."
      status={readinessLabel}
      statusColor={errorCount > 0 ? "warning" : "processing"}
      actions={
        <>
          <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
            Template
          </Button>
          <Button
            onClick={handleUploadSubmit}
            type="primary"
            loading={isUploading}
            disabled={validCount === 0 || !selectedPeriodeId}
          >
            Upload {validCount > 0 ? `(${validCount})` : ""}
          </Button>
        </>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <MuseCard style={{ height: "100%" }}>
            <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
              <CalendarRange size={16} color={museColors.primary} />
              <Text strong>Periode masuk / tahun ajaran</Text>
            </Flex>
            <Select
              aria-label="Pilih periode"
              style={{ width: "100%" }}
              placeholder="Pilih periode (wajib)"
              onChange={setSelectedPeriodeId}
              value={selectedPeriodeId}
              options={refPeriode?.map((p) => ({ label: p.name, value: p.id }))}
              allowClear
              virtual={false}
              status={tableData.length > 0 && !selectedPeriodeId ? "warning" : undefined}
            />
          </MuseCard>
        </Col>
        <Col xs={24} md={12}>
          <ImportStats
            items={[
              { label: "Data", value: totalData },
              { label: "Valid", value: validCount, color: museColors.success },
              { label: "Perlu cek", value: errorCount, color: museColors.danger },
            ]}
          />
        </Col>
      </Row>

      <Collapse
        size="small"
        style={{ background: "#fff" }}
        items={[
          {
            key: "1",
            label: (
              <Space>
                <InfoCircleOutlined />
                <span>Panduan format & template Excel</span>
              </Space>
            ),
            children: (
              <div>
                <Alert
                  title="Aturan pengisian data"
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
                        <b>Kelas:</b> Samakan nama kelas dengan data sistem, atau koreksi mapping
                        di tabel review.
                      </li>
                    </ul>
                  }
                  type="info"
                  showIcon
                  style={{ marginBottom: 12 }}
                />
                <Button icon={<DownloadOutlined />} onClick={downloadTemplate}>
                  Download Template (.xlsx)
                </Button>
              </div>
            ),
          },
        ]}
      />

      {tableData.length === 0 ? (
        <UploadDropzone
          beforeUpload={handleFile}
          fileList={fileList}
          hint="Sistem membaca file, mencocokkan nama kelas otomatis, lalu menampilkan hasil review sebelum upload."
          note="Format .xlsx / .xls"
        />
      ) : (
        <MuseCard
          flush
          title={
            <CardTitle
              title="Review & Mapping Data"
              description="Periksa kecocokan kelas sebelum data disinkronkan."
            />
          }
          extra={
            <Tag icon={<School size={12} style={{ marginRight: 4 }} />} style={{ margin: 0 }}>
              {classOptions.length} kelas tersedia
            </Tag>
          }
        >
          {errorCount > 0 && (
            <Alert
              title={`Ada ${errorCount} data dengan kelas yang belum dikenali.`}
              description="Perbaiki mapping pada kolom sistem sebelum menekan tombol upload."
              type="warning"
              showIcon
              style={{ margin: "0 24px 16px" }}
            />
          )}

          <Table
            dataSource={tableData}
            columns={columns}
            rowKey="key"
            pagination={false}
            size="small"
            scroll={{ y: "calc(100vh - 420px)", x: 980 }}
          />
        </MuseCard>
      )}
    </ImportDrawer>
  );
};

export default UploadStudent;
