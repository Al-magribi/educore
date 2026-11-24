import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Collapse, Input, Space, Table, Tooltip, Upload, message } from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import {
  useGetClassesListQuery,
  useGetSubjectsListQuery,
  useLazyGetTeachersQuery,
  useUploadTeachersMutation,
} from "../../../../service/academic/ApiTeacher";
import {
  buildTeacherAllocationExample,
  downloadTeacherTemplate,
} from "./teacherImportTemplate";
import { CardTitle, MuseCard } from "../../../../components/ui/muse";
import { ImportDrawer, ImportStats, UploadDropzone } from "../../../../components/ui/muse/ImportKit";
import { museColors } from "../../../../config/theme";

const { TextArea } = Input;

const normalizeText = (value) => value?.toString().trim() || "";
const normalizeKey = (value) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, " ");

const splitList = (value, separators = ["|"]) => {
  let text = normalizeText(value);
  separators.forEach((separator) => {
    text = text.split(separator).join("|");
  });

  return text
    .split("|")
    .map((item) => item.trim())
    .filter(Boolean);
};

const pickValue = (row, keys) => {
  for (const key of keys) {
    if (
      row[key] !== undefined &&
      row[key] !== null &&
      `${row[key]}`.trim() !== ""
    ) {
      return row[key];
    }
  }

  return "";
};

const normalizeCellText = (value) => {
  if (Array.isArray(value)) return "";
  if (value && typeof value === "object") return "";
  return normalizeText(value);
};

const buildSubjectMaps = (subjects) => {
  const byCode = new Map();
  const byName = new Map();

  subjects.forEach((subject) => {
    const code = normalizeKey(subject.code);
    const name = normalizeKey(subject.name);

    if (code) byCode.set(code, subject);
    if (name) byName.set(name, subject);
  });

  return { byCode, byName };
};

const buildClassMap = (classes) => {
  const map = new Map();
  classes.forEach((item) => {
    map.set(normalizeKey(item.name), item);
  });
  return map;
};

const parseAllocations = ({ value, subjects, classes }) => {
  const parsed = [];
  const errors = [];
  const source = normalizeText(value);

  if (!source) {
    return { parsed, errors };
  }

  const subjectMaps = buildSubjectMaps(subjects);
  const classMap = buildClassMap(classes);
  const chunks = source
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);

  chunks.forEach((chunk) => {
    const [subjectTokenRaw, classTokenRaw] = chunk.split(":");
    const subjectToken = normalizeText(subjectTokenRaw);
    const classToken = normalizeText(classTokenRaw);

    if (!subjectToken || !classToken) {
      errors.push(`Format alokasi tidak valid: "${chunk}"`);
      return;
    }

    const subject =
      subjectMaps.byCode.get(normalizeKey(subjectToken)) ||
      subjectMaps.byName.get(normalizeKey(subjectToken));

    if (!subject) {
      errors.push(`Mapel tidak ditemukan: "${subjectToken}"`);
      return;
    }

    const classNames = splitList(classToken, ["|", ","]);

    if (classNames.length === 0) {
      errors.push(`Kelas untuk mapel "${subjectToken}" kosong`);
      return;
    }

    classNames.forEach((className) => {
      const classItem = classMap.get(normalizeKey(className));

      if (!classItem) {
        errors.push(`Kelas tidak ditemukan: "${className}"`);
        return;
      }

      parsed.push({
        subject_id: subject.id,
        class_id: classItem.id,
        subject_label: subject.code
          ? `${subject.code} - ${subject.name}`
          : subject.name,
        class_label: classItem.name,
      });
    });
  });

  const unique = [];
  const seen = new Set();

  parsed.forEach((item) => {
    const key = `${item.subject_id}-${item.class_id}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  });

  return { parsed: unique, errors };
};

const buildRow = ({ row, index, classes, subjects }) => {
  const username = normalizeText(
    pickValue(row, ["Username", "username", "User Name"]),
  );
  const password = normalizeText(pickValue(row, ["Password", "password"]));
  const fullName = normalizeText(
    pickValue(row, ["Nama Lengkap", "Nama", "full_name", "name"]),
  );
  const nip = normalizeText(
    pickValue(row, ["NIP / NIY", "NIP", "NIY", "nip", "niy"]),
  );
  const rfidNo = normalizeText(
    pickValue(row, ["No RFID", "RFID", "rfid_no", "rfid"]),
  );
  const phone = normalizeText(
    pickValue(row, ["No. Telepon", "Telepon", "phone", "No HP"]),
  );
  const email = normalizeText(pickValue(row, ["Email", "email"]));
  const homeroomClassName = normalizeCellText(
    pickValue(row, [
      "homeroom_class_name",
      "Wali Kelas",
      "Homeroom",
      "homeroom_class",
    ]),
  );
  const allocationsInput = normalizeCellText(
    pickValue(row, [
      "allocations_input",
      "Alokasi Mengajar",
      "Mapel Ajar",
      "allocations",
    ]),
  );

  const classMap = buildClassMap(classes);
  const homeroomClass = homeroomClassName
    ? classMap.get(normalizeKey(homeroomClassName))
    : null;

  const allocationResult = parseAllocations({
    value: allocationsInput,
    subjects,
    classes,
  });

  const errors = [];
  if (!username) errors.push("Username wajib diisi");
  if (!fullName) errors.push("Nama lengkap wajib diisi");
  if (homeroomClassName && !homeroomClass) {
    errors.push(`Wali kelas tidak ditemukan: "${homeroomClassName}"`);
  }
  errors.push(...allocationResult.errors);

  return {
    key: index,
    username,
    password: password,
    full_name: fullName,
    nip,
    rfid_no: rfidNo,
    phone,
    email,
    homeroom_class_name: homeroomClassName,
    homeroom_class_id: homeroomClass?.id || null,
    allocations_input: allocationsInput,
    allocations: allocationResult.parsed.map(({ subject_id, class_id }) => ({
      subject_id,
      class_id,
    })),
    allocation_preview: allocationResult.parsed
      .map((item) => `${item.subject_label}: ${item.class_label}`)
      .join("; "),
    errors,
    isValid: errors.length === 0,
  };
};

const UploadTeacher = ({ open, onClose, onFinish }) => {
  const [tableData, setTableData] = useState([]);
  const [fileList, setFileList] = useState([]);

  const { data: classesData = [], isLoading: classesLoading } =
    useGetClassesListQuery();
  const { data: subjectsData = [], isLoading: subjectsLoading } =
    useGetSubjectsListQuery();
  const [fetchTeachersExport] = useLazyGetTeachersQuery();
  const [uploadTeachers, { isLoading: isUploading }] =
    useUploadTeachersMutation();
  const [isDownloadingTemplate, setIsDownloadingTemplate] = useState(false);

  const referencesReady =
    !classesLoading && !subjectsLoading && classesData.length > 0;

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!tableData.length || !referencesReady) {
      return;
    }

    setTableData((prev) =>
      prev.map((item) =>
        buildRow({
          row: item,
          index: item.key,
          classes: classesData,
          subjects: subjectsData,
        }),
      ),
    );
  }, [classesData, referencesReady, subjectsData, tableData.length]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const downloadTemplateFile = async () => {
    setIsDownloadingTemplate(true);
    try {
      const result = await fetchTeachersExport({
        page: 1,
        limit: 10000,
        search: "",
      }).unwrap();

      downloadTeacherTemplate({
        teachers: result?.data || [],
        classes: classesData,
        subjects: subjectsData,
      });
      message.success(
        (result?.data || []).length > 0
          ? `Template berisi ${(result?.data || []).length} data guru siap diedit.`
          : "Template contoh berhasil diunduh. Belum ada data guru tersimpan.",
      );
    } catch (error) {
      message.error(
        error?.data?.message || "Gagal mengunduh template data guru.",
      );
    } finally {
      setIsDownloadingTemplate(false);
    }
  };

  const updateRow = (rowKey, field, value) => {
    setTableData((prev) =>
      prev.map((item) => {
        if (item.key !== rowKey) return item;

        return buildRow({
          row: { ...item, [field]: value },
          index: item.key,
          classes: classesData,
          subjects: subjectsData,
        });
      }),
    );
  };

  const handleFile = (file) => {
    if (!referencesReady) {
      message.error(
        "Referensi mapel dan kelas belum siap. Coba beberapa saat lagi.",
      );
      return false;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        const formattedData = jsonData.map((row, index) =>
          buildRow({
            row,
            index,
            classes: classesData,
            subjects: subjectsData,
          }),
        );

        setTableData(formattedData);
        setFileList([{ uid: file.uid, name: file.name, status: "done" }]);
        message.success(`Berhasil memuat ${formattedData.length} baris data.`);
      } catch (error) {
        message.error(
          "Gagal memproses file. Pastikan format Excel sesuai template.",
        );
        console.error("File parsing error:", error);
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
      return message.error("Tidak ada data valid untuk diunggah.");
    }

    try {
      const payload = validData.map((item) => ({
        username: item.username,
        password: item.password,
        full_name: item.full_name,
        nip: item.nip,
        rfid_no: item.rfid_no,
        phone: item.phone,
        email: item.email,
        homeroom_class_id: item.homeroom_class_id,
        allocations: item.allocations,
      }));

      await uploadTeachers(payload).unwrap();

      message.success(
        "Data guru berhasil diimpor. Guru baru dibuat, data lama diperbarui jika username sudah ada.",
      );
      setTableData([]);
      setFileList([]);
      onClose();
      if (onFinish) onFinish();
    } catch (error) {
      console.error(error);
      message.error(error?.data?.message || "Gagal mengunggah data.");
    }
  };

  const summary = useMemo(() => {
    const totalData = tableData.length;
    const validCount = tableData.filter((item) => item.isValid).length;
    const errorCount = totalData - validCount;
    return { totalData, validCount, errorCount };
  }, [tableData]);

  const columns = [
    {
      title: "Username",
      dataIndex: "username",
      width: 160,
      render: (text, record) => (
        <Input
          value={text}
          placeholder='Username login'
          status={!record.username ? "error" : ""}
          onChange={(e) => updateRow(record.key, "username", e.target.value)}
        />
      ),
    },
    {
      title: "Password",
      dataIndex: "password",
      width: 120,
      render: (text, record) => (
        <Input
          value={text}
          placeholder='Kosong = tetap / 123456'
          onChange={(e) => updateRow(record.key, "password", e.target.value)}
        />
      ),
    },
    {
      title: "Nama Lengkap",
      dataIndex: "full_name",
      width: 220,
      render: (text, record) => (
        <Input
          value={text}
          placeholder='Nama lengkap'
          status={!record.full_name ? "error" : ""}
          onChange={(e) => updateRow(record.key, "full_name", e.target.value)}
        />
      ),
    },
    {
      title: "NIP / NIY",
      dataIndex: "nip",
      width: 160,
      render: (text, record) => (
        <Input
          value={text}
          placeholder='Opsional'
          onChange={(e) => updateRow(record.key, "nip", e.target.value)}
        />
      ),
    },
    {
      title: "No RFID",
      dataIndex: "rfid_no",
      width: 170,
      render: (text, record) => (
        <Input
          value={text}
          placeholder='Opsional'
          onChange={(e) => updateRow(record.key, "rfid_no", e.target.value)}
        />
      ),
    },
    {
      title: "Telepon",
      dataIndex: "phone",
      width: 150,
      render: (text, record) => (
        <Input
          value={text}
          placeholder='08xxxx'
          onChange={(e) => updateRow(record.key, "phone", e.target.value)}
        />
      ),
    },
    {
      title: "Email",
      dataIndex: "email",
      width: 220,
      render: (text, record) => (
        <Input
          value={text}
          placeholder='email@sekolah.sch.id'
          onChange={(e) => updateRow(record.key, "email", e.target.value)}
        />
      ),
    },
    {
      title: "Wali Kelas",
      dataIndex: "homeroom_class_name",
      width: 180,
      render: (text, record) => (
        <Input
          value={text}
          placeholder='Nama kelas'
          status={text && !record.homeroom_class_id ? "error" : ""}
          onChange={(e) =>
            updateRow(record.key, "homeroom_class_name", e.target.value)
          }
        />
      ),
    },
    {
      title: "Alokasi Mengajar",
      dataIndex: "allocations_input",
      width: 320,
      render: (text, record) => (
        <TextArea
          value={text}
          autoSize={{ minRows: 2, maxRows: 4 }}
          placeholder={buildTeacherAllocationExample()}
          status={
            record.allocations_input && !record.allocations.length
              ? "error"
              : ""
          }
          onChange={(e) =>
            updateRow(record.key, "allocations_input", e.target.value)
          }
        />
      ),
    },
    {
      title: "Status",
      key: "status",
      width: 90,
      align: "center",
      render: (_, record) =>
        record.isValid ? (
          <Tooltip title='Data valid'>
            <CheckCircleOutlined style={{ color: museColors.success, fontSize: 18 }} />
          </Tooltip>
        ) : (
          <Tooltip title={record.errors.join(", ")}>
            <WarningOutlined style={{ color: museColors.danger, fontSize: 18 }} />
          </Tooltip>
        ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 70,
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

  const statusLabel =
    summary.totalData === 0 ? "Menunggu file" : summary.errorCount > 0 ? "Perlu review" : "Siap impor";

  return (
    <ImportDrawer
      open={open}
      onClose={onClose}
      width={1180}
      icon={<UploadCloud size={16} />}
      title="Import Data Guru"
      description="Upload Excel guru, tinjau username, wali kelas, dan alokasi mengajar sebelum sinkronisasi."
      status={statusLabel}
      statusColor={summary.errorCount > 0 ? "warning" : summary.totalData > 0 ? "success" : "processing"}
      actions={
        <>
          <Button
            icon={<DownloadOutlined />}
            onClick={downloadTemplateFile}
            loading={isDownloadingTemplate}
          >
            Template
          </Button>
          <Button
            onClick={handleUploadSubmit}
            type="primary"
            loading={isUploading}
            disabled={summary.validCount === 0}
          >
            Impor {summary.validCount > 0 ? `(${summary.validCount})` : ""}
          </Button>
        </>
      }
    >
      {summary.totalData > 0 && (
        <ImportStats
          items={[
            { label: "Total", value: summary.totalData },
            { label: "Valid", value: summary.validCount, color: museColors.success },
            { label: "Perlu cek", value: summary.errorCount, color: museColors.danger },
          ]}
        />
      )}

      <Collapse
        size="small"
        defaultActiveKey={summary.totalData === 0 ? ["1"] : []}
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
              <Alert
                title="Aturan pengisian data"
                description={
                  <div>
                    <ol style={{ paddingLeft: 20, margin: "0 0 10px" }}>
                      <li>
                        Klik <strong>Template</strong> untuk unduh file terbaru. Jika sudah ada data
                        guru, file berisi data aktual siap diedit.
                      </li>
                      <li>
                        Isi/ubah data pada sheet <strong>Template Guru</strong> saja. Jangan ubah nama
                        kolom.
                      </li>
                      <li>
                        Cocokkan <strong>Wali Kelas</strong> dengan sheet{" "}
                        <strong>Referensi Kelas</strong>.
                      </li>
                      <li>
                        Isi <strong>Alokasi Mengajar</strong> dengan format{" "}
                        <strong>{buildTeacherAllocationExample()}</strong> dan gunakan kode mapel dari
                        sheet <strong>Referensi Mapel</strong>.
                      </li>
                      <li>
                        Upload file, lalu perbaiki baris berikon merah sebelum klik{" "}
                        <strong>Impor</strong>.
                      </li>
                    </ol>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      <li>
                        Kolom wajib: <strong>Username</strong> dan <strong>Nama Lengkap</strong>.
                      </li>
                      <li>
                        <strong>Username</strong> dipakai sebagai kunci update. Jika sudah ada, data
                        guru akan diperbarui.
                      </li>
                      <li>
                        <strong>Password</strong> opsional. Kosongkan saat update agar password lama
                        tetap. Untuk guru baru, jika kosong otomatis jadi <strong>123456</strong>.
                      </li>
                      <li>Nama mapel persis sistem juga didukung jika kode mapel belum tersedia.</li>
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

      {summary.totalData === 0 ? (
        <UploadDropzone
          beforeUpload={handleFile}
          fileList={fileList}
          onChange={(info) => setFileList(info.fileList.slice(-1))}
          disabled={!referencesReady}
          hint={
            referencesReady
              ? "Gunakan template upload guru terbaru. Alokasi mengajar divalidasi otomatis."
              : "Menunggu referensi mapel dan kelas dimuat..."
          }
          note="Format .xlsx / .xls"
        />
      ) : (
        <MuseCard
          flush
          title={
            <CardTitle
              title="Review Data Guru"
              description="Perbaiki baris berikon merah sebelum impor."
            />
          }
        >
          {summary.errorCount > 0 && (
            <Alert
              title={`Ada ${summary.errorCount} baris belum valid.`}
              description="Periksa username, wali kelas, atau format alokasi mengajar."
              type="warning"
              showIcon
              style={{ margin: "0 24px 16px" }}
            />
          )}
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="key"
            pagination={false}
            size="small"
            scroll={{ x: 1300, y: "calc(100vh - 420px)" }}
          />
        </MuseCard>
      )}
    </ImportDrawer>
  );
};

export default UploadTeacher;
