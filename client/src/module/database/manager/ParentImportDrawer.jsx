import React, { useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Collapse,
  Flex,
  Grid,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { DownloadOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { RotateCcw, Trash2, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import { useImportParentAccountsMutation } from "../../../service/database/ApiDatabase";
import { CardTitle, MuseCard } from "../../../components/ui/muse";
import { ImportDrawer, ImportStats, UploadDropzone } from "../../../components/ui/muse/ImportKit";
import { museColors } from "../../../config/theme";
import { downloadParentTemplate } from "./parentImportTemplate";

const { Text } = Typography;
const { useBreakpoint } = Grid;

const normalizeText = (value) => value?.toString().trim() || "";
const normalizeKey = (value) => normalizeText(value).toLowerCase();
const normalizeNisKey = (value) => {
  const digits = normalizeText(value).replace(/\D/g, "");
  return digits.replace(/^0+/, "") || digits;
};

const splitNisList = (value) =>
  normalizeText(value)
    .split(/[|,;]/)
    .map((item) => item.trim())
    .filter(Boolean);

const pickValue = (row, keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && `${row[key]}`.trim() !== "") {
      return row[key];
    }
  }

  return "";
};

const ParentImportDrawer = ({ open, onClose, studentOptions = [], scope = "all" }) => {
  const [rows, setRows] = useState([]);
  const { message } = App.useApp();
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [importParents, { isLoading: isImporting }] =
    useImportParentAccountsMutation();

  const studentNisMap = useMemo(() => {
    const map = new Map();
    studentOptions.forEach((item) => {
      if (item.nis) {
        map.set(normalizeKey(item.nis), item);
        map.set(normalizeNisKey(item.nis), item);
      }
    });
    return map;
  }, [studentOptions]);

  const handleReset = () => {
    setRows([]);
  };

  const handleFile = (file) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          raw: false,
          defval: "",
        });

        const parsedRows = jsonData.map((row, index) => {
          const username = normalizeText(pickValue(row, ["Username", "username"]));
          const password = normalizeText(pickValue(row, ["Password", "password"]));
          const fullName = normalizeText(
            pickValue(row, ["Nama Lengkap", "Nama", "full_name", "name"]),
          );
          const phone = normalizeText(
            pickValue(row, ["No. Telepon", "Telepon", "phone", "No HP"]),
          );
          const email = normalizeText(pickValue(row, ["Email", "email"]));
          const nisList = splitNisList(
            pickValue(row, ["NIS Siswa", "NIS", "Daftar Siswa"]),
          );

          const matchedStudents = [];
          const missingNis = [];

          nisList.forEach((nis) => {
            const student =
              studentNisMap.get(normalizeKey(nis)) ||
              studentNisMap.get(normalizeNisKey(nis));
            if (student) {
              matchedStudents.push(student);
            } else {
              missingNis.push(nis);
            }
          });

          const uniqueStudentIds = [...new Set(matchedStudents.map((item) => item.student_id))];
          const errors = [];

          if (!username) errors.push("Username wajib diisi");
          if (!fullName) errors.push("Nama lengkap wajib diisi");
          if (uniqueStudentIds.length === 0) {
            errors.push("Minimal satu siswa harus cocok dengan referensi");
          }
          if (missingNis.length > 0) {
            errors.push(`NIS tidak ditemukan: ${missingNis.join(", ")}`);
          }

          return {
            key: index,
            username,
            password,
            full_name: fullName,
            phone,
            email,
            matchedStudents,
            student_ids: uniqueStudentIds,
            errors,
          };
        });

        setRows(parsedRows);
        message.success(`Berhasil membaca ${parsedRows.length} baris data.`);
      } catch {
        message.error("File Excel gagal diproses.");
      }
    };

    reader.readAsArrayBuffer(file);
    return false;
  };

  const handleSubmit = async () => {
    const validRows = rows.filter((item) => item.errors.length === 0);

    if (validRows.length === 0) {
      message.error("Belum ada data valid untuk diimport.");
      return;
    }

    try {
      const result = await importParents({
        scope,
        parents: validRows.map((item) => ({
          username: item.username,
          password: item.password,
          full_name: item.full_name,
          phone: item.phone,
          email: item.email,
          student_ids: item.student_ids,
        })),
      }).unwrap();

      message.success(
        result?.message || `Import selesai. ${validRows.length} akun diproses.`,
      );
      handleReset();
      onClose();
    } catch (error) {
      message.error(error?.data?.message || "Import akun orang tua gagal.");
    }
  };

  const validCount = rows.filter((item) => item.errors.length === 0).length;
  const errorCount = rows.length - validCount;
  const statusLabel = rows.length === 0 ? "Menunggu file" : errorCount > 0 ? "Perlu review" : "Siap impor";

  const columns = [
    {
      title: "AKUN",
      dataIndex: "username",
      key: "username",
      render: (value, record) => (
        <div>
          <Text strong style={{ display: "block" }}>
            {record.full_name || "-"}
          </Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            @{value || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "KONTAK",
      key: "contact",
      render: (_, record) => (
        <div>
          <Text style={{ display: "block" }}>{record.phone || "-"}</Text>
          <Text type='secondary' style={{ fontSize: 12 }}>
            {record.email || "-"}
          </Text>
        </div>
      ),
    },
    {
      title: "SISWA TERKAIT",
      key: "students",
      render: (_, record) =>
        record.matchedStudents.length ? (
          <Flex gap={6} wrap style={{ maxWidth: 320 }}>
            {record.matchedStudents.map((item) => (
              <Tag key={item.student_id} color='blue' style={{ margin: 0 }}>
                {item.full_name} ({item.nis || "-"})
              </Tag>
            ))}
          </Flex>
        ) : (
          "-"
        ),
    },
    {
      title: "STATUS",
      key: "status",
      render: (_, record) =>
        record.errors.length === 0 ? (
          <Tag color='success' style={{ margin: 0 }}>
            Siap diimpor
          </Tag>
        ) : (
          <Flex vertical gap={4} align='flex-start'>
            <Tag color='error' style={{ margin: 0 }}>
              Perlu perbaikan
            </Tag>
            <Text type='danger' style={{ fontSize: 12, whiteSpace: "normal", maxWidth: 260, display: "block" }}>
              {record.errors.join("; ")}
            </Text>
          </Flex>
        ),
    },
    {
      title: "AKSI",
      key: "action",
      width: 70,
      align: "right",
      render: (_, record) => (
        <Tooltip title='Hapus baris'>
          <Button
            type='text'
            danger
            aria-label={`Hapus baris ${record.username || "-"}`}
            icon={<Trash2 size={16} />}
            onClick={() => setRows((current) => current.filter((item) => item.key !== record.key))}
          />
        </Tooltip>
      ),
    },
  ];

  return (
    <ImportDrawer
      open={open}
      onClose={onClose}
      width={1000}
      icon={<UploadCloud size={16} />}
      title='Import Akun Orang Tua'
      description='Buat atau perbarui akun orang tua berdasarkan username.'
      status={statusLabel}
      statusColor={errorCount > 0 ? "warning" : rows.length > 0 ? "success" : "processing"}
      actions={
        <>
          <Button icon={<DownloadOutlined />} onClick={() => downloadParentTemplate({ students: studentOptions })}>
            Template
          </Button>
          {rows.length > 0 ? (
            <Button icon={<RotateCcw size={16} />} onClick={handleReset}>
              Ganti File
            </Button>
          ) : null}
          <Button type='primary' loading={isImporting} disabled={validCount === 0} onClick={handleSubmit}>
            Impor {validCount > 0 ? `(${validCount})` : ""}
          </Button>
        </>
      }
    >
      {rows.length > 0 ? (
        <ImportStats
          items={[
            { label: "Total baris", value: rows.length },
            { label: "Siap impor", value: validCount, color: museColors.success },
            { label: "Perlu cek", value: errorCount, color: museColors.danger },
          ]}
        />
      ) : null}

      <Collapse
        size='small'
        defaultActiveKey={rows.length === 0 ? ["guide"] : []}
        style={{ background: "#fff" }}
        items={[
          {
            key: "guide",
            label: (
              <Flex gap={8} align='center'>
                <InfoCircleOutlined />
                <span>Panduan import Excel</span>
              </Flex>
            ),
            children: (
              <Alert
                type='info'
                showIcon
                title='Langkah pengisian'
                description={
                  <ol style={{ paddingLeft: 20, margin: 0 }}>
                    <li>
                      Klik <strong>Template</strong>, lalu isi sheet akun orang tua.
                    </li>
                    <li>
                      <strong>Username</strong> dipakai sebagai kunci: username yang sudah ada akan diperbarui.
                    </li>
                    <li>
                      Kolom <strong>NIS Siswa</strong> boleh berisi beberapa NIS, dipisah <code>|</code> atau koma.
                    </li>
                    <li>Unggah file, tinjau status tiap baris, lalu klik Impor.</li>
                  </ol>
                }
              />
            ),
          },
        ]}
      />

      {rows.length === 0 ? (
        <UploadDropzone
          beforeUpload={handleFile}
          maxCount={1}
          hint='Gunakan template sistem agar format username dan daftar NIS sesuai.'
          note='Satu akun bisa terhubung ke beberapa siswa'
        />
      ) : (
        <MuseCard
          flush
          title={<CardTitle title='Review Data' description='Hapus baris yang tidak ingin diimpor.' />}
        >
          <Table
            rowKey='key'
            dataSource={rows}
            columns={columns}
            size={isMobile ? "small" : "middle"}
            scroll={{ x: 900 }}
            pagination={{ pageSize: 8, hideOnSinglePage: true, style: { padding: "0 16px" } }}
          />
        </MuseCard>
      )}
    </ImportDrawer>
  );
};

export default ParentImportDrawer;
