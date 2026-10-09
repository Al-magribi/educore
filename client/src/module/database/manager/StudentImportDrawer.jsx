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
  FileExcelOutlined,
  InboxOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import * as XLSX from "xlsx";
import { useImportStudentDatabaseMutation } from "../../../service/database/ApiDatabase";

const { Dragger } = Upload;
const { Text, Title } = Typography;

const normalizeText = (value) => value?.toString().trim() || "";
const normalizeKey = (value) => normalizeText(value).toLowerCase();
const normalizeNisKey = (value) => {
  const digits = normalizeText(value).replace(/\D/g, "");
  return digits.replace(/^0+/, "") || digits;
};
const pad2 = (value) => String(value).padStart(2, "0");

const MONTH_MAP = {
  januari: 1,
  jan: 1,
  february: 2,
  februari: 2,
  feb: 2,
  maret: 3,
  march: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mei: 5,
  may: 5,
  juni: 6,
  june: 6,
  jun: 6,
  juli: 7,
  july: 7,
  jul: 7,
  agustus: 8,
  august: 8,
  agu: 8,
  agt: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  october: 10,
  okt: 10,
  oct: 10,
  november: 11,
  nov: 11,
  desember: 12,
  december: 12,
  des: 12,
  dec: 12,
};

const expandYear = (yearText) => {
  const year = normalizeText(yearText);
  if (!year) return null;
  if (year.length === 2) {
    const numeric = Number(year);
    return numeric > 50 ? 1900 + numeric : 2000 + numeric;
  }
  const numeric = Number(year);
  return Number.isFinite(numeric) ? numeric : null;
};

const toLocalYmd = (year, month, day) => {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (![y, m, d].every((item) => Number.isFinite(item))) return "";
  const date = new Date(y, m - 1, d);
  if (
    date.getFullYear() !== y ||
    date.getMonth() !== m - 1 ||
    date.getDate() !== d
  ) {
    return "";
  }
  return `${y}-${pad2(m)}-${pad2(d)}`;
};

const pickValue = (row, keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && `${row[key]}`.trim() !== "") {
      return row[key];
    }
  }

  return "";
};

const normalizeGender = (value) => {
  const text = normalizeKey(value);
  if (!text) return "";
  if (["l", "laki-laki", "laki", "laki laki", "male", "m"].includes(text)) {
    return "Laki-laki";
  }
  if (["p", "perempuan", "wanita", "female", "f"].includes(text)) {
    return "Perempuan";
  }
  return normalizeText(value);
};

const parseExcelDate = (value) => {
  const text = normalizeText(value);
  if (!text || text === "-") return "";

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

  const serial = Number(text);
  if (Number.isFinite(serial) && serial > 30000) {
    const parsed = XLSX.SSF.parse_date_code(serial);
    if (parsed) return toLocalYmd(parsed.y, parsed.m, parsed.d);
  }

  let match = text.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/);
  if (match) {
    return toLocalYmd(expandYear(match[3]), match[2], match[1]);
  }

  match = text.match(/^(\d{4})[/\-.](\d{1,2})[/\-.](\d{1,2})$/);
  if (match) {
    return toLocalYmd(match[1], match[2], match[3]);
  }

  match = text.match(
    /^(\d{1,2})[/\-\s]+([A-Za-zÀ-ÿ]+)\.?[/\-\s,]+(\d{2,4})$/i,
  );
  if (match) {
    const month = MONTH_MAP[match[2].toLowerCase()];
    if (month) return toLocalYmd(expandYear(match[3]), month, match[1]);
  }

  // Invalid / unparseable date must become empty, never raw text for DATE columns.
  return "";
};

const parseSiblings = (value) => {
  const text = normalizeText(value);
  if (!text || text === "-") return [];

  return text
    .split(";;")
    .map((part) => {
      const [name, gender, birth_date] = part
        .split("|")
        .map((item) => item.trim());
      if (!name || name === "-") return null;
      return {
        name,
        gender: normalizeGender(gender) || null,
        birth_date: parseExcelDate(birth_date) || null,
      };
    })
    .filter(Boolean);
};

const parseNumber = (value) => {
  const text = normalizeText(value);
  if (!text || text === "-") return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
};

const resolveDateField = (row, keys, label) => {
  const raw = normalizeText(pickValue(row, keys));
  if (!raw || raw === "-") {
    return { value: "", warning: null };
  }

  const parsed = parseExcelDate(raw);
  if (parsed) {
    return { value: parsed, warning: null };
  }

  return {
    value: "",
    warning: `${label} "${raw}" tidak dikenali dan dikosongkan`,
  };
};

const StudentImportDrawer = ({
  open,
  onClose,
  studentOptions = [],
  scope = "all",
}) => {
  const [rows, setRows] = useState([]);
  const [importStudents, { isLoading: isImporting }] =
    useImportStudentDatabaseMutation();

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
          const nis = normalizeText(pickValue(row, ["NIS", "nis"]));
          const student =
            studentNisMap.get(normalizeKey(nis)) ||
            studentNisMap.get(normalizeNisKey(nis));

          const birthDate = resolveDateField(
            row,
            ["Tanggal Lahir", "birth_date"],
            "Tanggal Lahir",
          );
          const fatherBirthDate = resolveDateField(
            row,
            ["Tanggal Lahir Ayah", "father_birth_date"],
            "Tanggal Lahir Ayah",
          );
          const motherBirthDate = resolveDateField(
            row,
            ["Tanggal Lahir Ibu", "mother_birth_date"],
            "Tanggal Lahir Ibu",
          );

          const payload = {
            nis,
            nisn: normalizeText(pickValue(row, ["NISN", "nisn"])),
            full_name: normalizeText(
              pickValue(row, ["Nama Lengkap", "Nama", "full_name"]),
            ),
            gender: normalizeGender(
              pickValue(row, ["Jenis Kelamin", "gender"]),
            ),
            birth_place: normalizeText(
              pickValue(row, ["Tempat Lahir", "birth_place"]),
            ),
            birth_date: birthDate.value,
            height: normalizeText(pickValue(row, ["Tinggi", "height"])),
            weight: normalizeText(pickValue(row, ["Berat", "weight"])),
            head_circumference: normalizeText(
              pickValue(row, ["Kepala", "head_circumference"]),
            ),
            order_number: parseNumber(pickValue(row, ["Anak Ke", "order_number"])),
            siblings_count: parseNumber(
              pickValue(row, ["Jumlah Saudara", "siblings_count"]),
            ),
            postal_code: normalizeText(
              pickValue(row, ["Kode Pos", "postal_code"]),
            ),
            address: normalizeText(
              pickValue(row, ["Alamat Lengkap", "Alamat", "address"]),
            ),
            father_name: normalizeText(
              pickValue(row, ["Nama Ayah", "father_name"]),
            ),
            father_nik: normalizeText(pickValue(row, ["NIK Ayah", "father_nik"])),
            father_birth_place: normalizeText(
              pickValue(row, ["Tempat Lahir Ayah", "father_birth_place"]),
            ),
            father_birth_date: fatherBirthDate.value,
            father_phone: normalizeText(
              pickValue(row, ["No Tlp Ayah", "father_phone"]),
            ),
            mother_name: normalizeText(
              pickValue(row, ["Nama Ibu", "mother_name"]),
            ),
            mother_nik: normalizeText(pickValue(row, ["NIK Ibu", "mother_nik"])),
            mother_birth_place: normalizeText(
              pickValue(row, ["Tempat Lahir Ibu", "mother_birth_place"]),
            ),
            mother_birth_date: motherBirthDate.value,
            mother_phone: normalizeText(
              pickValue(row, ["No Tlp Ibu", "mother_phone"]),
            ),
            siblings: parseSiblings(
              pickValue(row, ["Data Saudara", "Saudara", "siblings"]),
            ),
          };

          const errors = [];
          const warnings = [
            birthDate.warning,
            fatherBirthDate.warning,
            motherBirthDate.warning,
          ].filter(Boolean);

          if (!nis) errors.push("NIS wajib diisi");
          if (!student) {
            errors.push(
              scope === "homeroom"
                ? `NIS ${nis || "-"} tidak ditemukan di kelas wali`
                : `NIS ${nis || "-"} tidak ditemukan di referensi`,
            );
          }

          return {
            key: index,
            ...payload,
            matchedStudent: student || null,
            errors,
            warnings,
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
      const result = await importStudents({
        scope,
        students: validRows.map((item) => ({
          nis: item.nis,
          nisn: item.nisn || null,
          full_name: item.full_name || null,
          gender: item.gender || null,
          birth_place: item.birth_place || null,
          birth_date: item.birth_date || null,
          height: item.height || null,
          weight: item.weight || null,
          head_circumference: item.head_circumference || null,
          order_number: item.order_number ?? null,
          siblings_count: item.siblings_count ?? null,
          postal_code: item.postal_code || null,
          address: item.address || null,
          father_name: item.father_name || null,
          father_nik: item.father_nik || null,
          father_birth_place: item.father_birth_place || null,
          father_birth_date: item.father_birth_date || null,
          father_phone: item.father_phone || null,
          mother_name: item.mother_name || null,
          mother_nik: item.mother_nik || null,
          mother_birth_place: item.mother_birth_place || null,
          mother_birth_date: item.mother_birth_date || null,
          mother_phone: item.mother_phone || null,
          siblings: item.siblings || [],
        })),
      }).unwrap();

      const failedCount = result?.data?.failed?.length || 0;
      const successMessage =
        result?.message ||
        `Import selesai. ${validRows.length} siswa diproses.`;
      if (failedCount > 0) {
        message.warning(successMessage);
      } else {
        message.success(successMessage);
      }
      handleReset();
      onClose();
    } catch (error) {
      message.error(error?.data?.message || "Import database siswa gagal.");
    }
  };

  const validCount = rows.filter((item) => item.errors.length === 0).length;

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="Import Database Siswa"
      width={960}
      destroyOnHidden
      extra={
        <Space wrap>
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
          message="Import memperbarui profil siswa berdasarkan NIS."
          description={
            scope === "homeroom"
              ? "Gunakan file hasil Export Excel, edit data, lalu unggah kembali. Wali kelas hanya dapat mengimpor siswa di kelas wali aktif."
              : "Gunakan file hasil Export Excel, edit data, lalu unggah kembali. Admin dapat mengimpor seluruh siswa pada periode aktif."
          }
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
            Unggah file hasil Export Excel. Pastikan kolom NIS tidak diubah.
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
              title: "NIS",
              dataIndex: "nis",
              key: "nis",
              width: 120,
              render: (value, record) => (
                <Space direction="vertical" size={0}>
                  <Text strong>{value || "-"}</Text>
                  <Text type="secondary">{record.full_name || "-"}</Text>
                </Space>
              ),
            },
            {
              title: "Kelas",
              key: "class",
              width: 160,
              render: (_, record) => (
                <Text>
                  {record.matchedStudent?.class_name ||
                    record.matchedStudent?.grade_name ||
                    "-"}
                </Text>
              ),
            },
            {
              title: "Orang Tua",
              key: "parents",
              width: 220,
              render: (_, record) => (
                <Space direction="vertical" size={0}>
                  <Text>Ayah: {record.father_name || "-"}</Text>
                  <Text type="secondary">Ibu: {record.mother_name || "-"}</Text>
                </Space>
              ),
            },
            {
              title: "Saudara",
              key: "siblings",
              width: 100,
              align: "center",
              render: (_, record) => <Text>{record.siblings?.length || 0}</Text>,
            },
            {
              title: "Status",
              key: "status",
              width: 260,
              render: (_, record) =>
                record.errors.length === 0 ? (
                  <Space direction="vertical" size={0}>
                    <Space>
                      <CheckCircleOutlined style={{ color: "#389e0d" }} />
                      <Text type="success">Siap diimport</Text>
                    </Space>
                    {(record.warnings || []).length > 0 && (
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {record.warnings.join("; ")}
                      </Text>
                    )}
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
                    setRows((current) =>
                      current.filter((item) => item.key !== record.key),
                    )
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

export default StudentImportDrawer;
