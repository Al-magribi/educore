import React, { useEffect, useMemo, useState } from "react";
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
  Divider,
  Row,
  Col,
  Statistic,
  Tooltip,
  Input,
  Grid,
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
  useGetClassesListQuery,
  useGetSubjectsListQuery,
  useUploadTeachersMutation,
} from "../../../../service/academic/ApiTeacher";
import {
  buildTeacherAllocationExample,
  downloadTeacherTemplate,
} from "./teacherImportTemplate";

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
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
  const phone = normalizeText(
    pickValue(row, ["No. Telepon", "Telepon", "phone", "No HP"]),
  );
  const email = normalizeText(pickValue(row, ["Email", "email"]));
  const homeroomClassName = normalizeText(
    pickValue(row, ["Wali Kelas", "Homeroom", "homeroom_class"]),
  );
  const allocationsInput = normalizeText(
    pickValue(row, ["Alokasi Mengajar", "allocations", "Mapel Ajar"]),
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
    password: password || "123456",
    full_name: fullName,
    nip,
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
  const screens = useBreakpoint();
  const [tableData, setTableData] = useState([]);
  const [fileList, setFileList] = useState([]);

  const { data: classesData = [], isLoading: classesLoading } =
    useGetClassesListQuery();
  const { data: subjectsData = [], isLoading: subjectsLoading } =
    useGetSubjectsListQuery();
  const [uploadTeachers, { isLoading: isUploading }] =
    useUploadTeachersMutation();

  const referencesReady =
    !classesLoading && !subjectsLoading && classesData.length > 0;

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

  const downloadTemplateFile = () => {
    downloadTeacherTemplate({
      classes: classesData,
      subjects: subjectsData,
    });
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
      const payload = validData.map(
        ({
          key,
          isValid,
          errors,
          allocation_preview,
          allocations_input,
          homeroom_class_name,
          ...rest
        }) => rest,
      );

      await uploadTeachers(payload).unwrap();

      message.success("Data guru berhasil diimpor ke server.");
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
          placeholder='123456'
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
            <CheckCircleOutlined style={{ color: "#52c41a", fontSize: 18 }} />
          </Tooltip>
        ) : (
          <Tooltip title={record.errors.join(", ")}>
            <WarningOutlined style={{ color: "#f5222d", fontSize: 18 }} />
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

  return (
    <Drawer
      title={
        <Space>
          <FileExcelOutlined />
          <span>Import Data Guru</span>
        </Space>
      }
      width={screens.md ? 1180 : "100%"}
      onClose={onClose}
      open={open}
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
            disabled={summary.validCount === 0}
          >
            Impor {summary.validCount > 0 ? `(${summary.validCount})` : ""}
          </Button>
        </Space>
      }
    >
      <div style={{ flexShrink: 0, marginBottom: 16 }}>
        <Collapse
          size='small'
          defaultActiveKey={["1"]}
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
                    message='Aturan Pengisian Data'
                    description={
                      <ul style={{ paddingLeft: 20, margin: 0 }}>
                        <li>
                          Kolom wajib: <strong>Username</strong> dan{" "}
                          <strong>Nama Lengkap</strong>.
                        </li>
                        <li>
                          <strong>Password</strong> opsional. Jika kosong akan
                          otomatis jadi <strong>123456</strong>.
                        </li>
                        <li>
                          <strong>Wali Kelas</strong> diisi dengan nama kelas
                          persis seperti referensi kelas.
                        </li>
                        <li>
                          <strong>Alokasi Mengajar</strong> pakai format{" "}
                          <strong>{buildTeacherAllocationExample()}</strong>.
                        </li>
                        <li>
                          Gunakan <strong>kode mapel</strong> dari sheet
                          referensi. Nama mapel persis sistem juga tetap
                          didukung.
                        </li>
                      </ul>
                    }
                    type='info'
                    showIcon
                    style={{ marginBottom: 12 }}
                  />
                </div>
              ),
            },
          ]}
        />
        {summary.totalData > 0 && (
          <>
            <Divider />
            <Row gutter={16} justify={screens.md ? "center" : "start"}>
              <Col xs={8} md={6}>
                <Statistic title='Total' value={summary.totalData} />
              </Col>
              <Col xs={8} md={6}>
                <Statistic title='Valid' value={summary.validCount} />
              </Col>
              <Col xs={8} md={6}>
                <Statistic
                  title='Error'
                  value={summary.errorCount}
                  valueStyle={{ color: "#cf1322" }}
                />
              </Col>
            </Row>
          </>
        )}
      </div>

      <div style={{ flex: 1, overflow: "hidden" }}>
        {summary.totalData === 0 ? (
          <Dragger
            accept='.xlsx, .xls'
            beforeUpload={handleFile}
            fileList={fileList}
            onChange={(info) => setFileList(info.fileList.slice(-1))}
            showUploadList={false}
            disabled={!referencesReady}
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              padding: 24,
            }}
          >
            <p className='ant-upload-drag-icon'>
              <InboxOutlined />
            </p>
            <Title level={5}>Klik atau tarik file Excel ke sini</Title>
            <Text type='secondary'>
              {referencesReady
                ? "Gunakan template upload guru terbaru."
                : "Menunggu referensi mapel dan kelas dimuat."}
            </Text>
          </Dragger>
        ) : (
          <>
            {summary.errorCount > 0 && (
              <Alert
                message={`Terdapat ${summary.errorCount} baris data belum valid. Periksa username, wali kelas, atau format alokasi mengajar.`}
                type='warning'
                showIcon
                style={{ marginBottom: 12 }}
              />
            )}
            <Table
              columns={columns}
              dataSource={tableData}
              rowKey='key'
              pagination={false}
              size='small'
              bordered
              scroll={{ x: 1300, y: "calc(100vh - 390px)" }}
            />
          </>
        )}
      </div>
    </Drawer>
  );
};

export default UploadTeacher;
