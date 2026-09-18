import React, { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Drawer,
  Space,
  Table,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  InboxOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { useImportParentAccountsMutation } from "../../../service/database/ApiDatabase";
import { downloadParentTemplate } from "./parentImportTemplate";

const { Dragger } = Upload;
const { Text, Title } = Typography;

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
      } catch (error) {
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

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Import Akun Orang Tua"
      width={960}
      destroyOnHidden
      extra={
        <Space wrap>
          <Button
            icon={<DownloadOutlined />}
            onClick={() => downloadParentTemplate({ students: studentOptions })}
          >
            Template
          </Button>
          <Button onClick={handleReset}>Reset</Button>
          <Button
            type="primary"
            icon={<FileExcelOutlined />}
            loading={isImporting}
            onClick={handleSubmit}
          >
            Import {validCount > 0 ? `(${validCount})` : ""}
          </Button>
        </Space>
      }
    >
      <Space direction="vertical" size={16} style={{ width: "100%" }}>
        <Alert
          type="info"
          showIcon
          message="Import akan membuat atau memperbarui akun orang tua berdasarkan username."
          description="Kolom NIS Siswa dapat diisi lebih dari satu NIS dengan pemisah | atau koma."
        />

        <Dragger
          accept=".xlsx,.xls"
          beforeUpload={handleFile}
          showUploadList={false}
          maxCount={1}
          style={{ padding: 24 }}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <Title level={5} style={{ marginBottom: 8 }}>
            Tarik file Excel ke sini atau klik untuk memilih file
          </Title>
          <Text type="secondary">
            Gunakan template sistem agar format username dan daftar NIS sesuai.
          </Text>
        </Dragger>

        <Table
          rowKey="key"
          dataSource={rows}
          scroll={{ x: 980 }}
          pagination={{ pageSize: 8, hideOnSinglePage: true }}
          locale={{ emptyText: "Belum ada file import yang dipilih." }}
          columns={[
            {
              title: "Username",
              dataIndex: "username",
              key: "username",
              width: 180,
              render: (value, record) => (
                <Space direction="vertical" size={0}>
                  <Text strong>{value || "-"}</Text>
                  <Text type="secondary">{record.full_name || "-"}</Text>
                </Space>
              ),
            },
            {
              title: "Kontak",
              key: "contact",
              width: 220,
              render: (_, record) => (
                <Space direction="vertical" size={0}>
                  <Text>{record.phone || "-"}</Text>
                  <Text type="secondary">{record.email || "-"}</Text>
                </Space>
              ),
            },
            {
              title: "Siswa Terkait",
              key: "students",
              width: 280,
              render: (_, record) => (
                <Text>
                  {record.matchedStudents.length > 0
                    ? record.matchedStudents
                        .map((item) => `${item.full_name} (${item.nis || "-"})`)
                        .join(", ")
                    : "-"}
                </Text>
              ),
            },
            {
              title: "Status",
              key: "status",
              width: 220,
              render: (_, record) =>
                record.errors.length === 0 ? (
                  <Space>
                    <CheckCircleOutlined style={{ color: "#389e0d" }} />
                    <Text type="success">Siap diimport</Text>
                  </Space>
                ) : (
                  <Space direction="vertical" size={0}>
                    <Space>
                      <WarningOutlined style={{ color: "#d46b08" }} />
                      <Text type="warning">Perlu perbaikan</Text>
                    </Space>
                    <Text type="secondary">{record.errors.join("; ")}</Text>
                  </Space>
                ),
            },
            {
              title: "Aksi",
              key: "action",
              width: 80,
              align: "center",
              render: (_, record) => (
                <Button
                  type="text"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    setRows((current) => current.filter((item) => item.key !== record.key))
                  }
                />
              ),
            },
          ]}
        />
      </Space>
    </Drawer>
  );
};

export default ParentImportDrawer;
