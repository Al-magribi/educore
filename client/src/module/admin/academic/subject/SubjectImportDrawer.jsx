import React, { useMemo, useState } from "react";
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
  Divider,
  Row,
  Col,
  Statistic,
  Tooltip,
  Grid,
  Flex,
  Card,
  Tag,
  Select,
} from "antd";
import {
  InboxOutlined,
  DeleteOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
} from "@ant-design/icons";
import {
  UploadCloud,
  X,
  Sparkles,
  BookOpen,
  GitBranch,
  Layers,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  useGetSubjectCategoriesQuery,
  useGetSubjectBranchesQuery,
  useUploadSubjectsMutation,
} from "../../../../service/academic/ApiSubject";

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

const normalizeText = (value) => value?.toString().trim() || "";
const normalizeKey = (value) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, " ");

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

const toKkmValue = (value) => {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
};

const buildCategoryMap = (categories) => {
  const map = new Map();
  categories.forEach((item) => {
    map.set(normalizeKey(item.name), item);
  });
  return map;
};

const buildBranchMap = (branches) => {
  const byCategory = new Map();

  branches.forEach((branch) => {
    const categoryId = branch.category_id;
    if (!byCategory.has(categoryId)) {
      byCategory.set(categoryId, new Map());
    }

    byCategory.get(categoryId).set(normalizeKey(branch.name), branch);
  });

  return byCategory;
};

const buildRow = ({ row, index, categories, branches }) => {
  const name = normalizeText(
    pickValue(row, [
      "Nama Mata Pelajaran",
      "Nama Mapel",
      "Nama",
      "name",
      "subject_name",
    ]),
  );
  const categoryName = normalizeText(
    pickValue(row, ["Kategori", "Kategori Mapel", "category", "category_name"]),
  );
  const branchName = normalizeText(
    pickValue(row, ["Cabang", "Cabang Mapel", "branch", "branch_name"]),
  );
  const code = normalizeText(
    pickValue(row, ["Kode Mapel", "Kode", "code", "subject_code"]),
  );
  const rawKkm = pickValue(row, ["Nilai KKM", "KKM", "kkm"]);
  const kkm = toKkmValue(rawKkm);

  const categoryMap = buildCategoryMap(categories);
  const branchMap = buildBranchMap(branches);
  const matchedCategory = categoryMap.get(normalizeKey(categoryName));
  const matchedBranch =
    matchedCategory && branchName
      ? branchMap
          .get(matchedCategory.id)
          ?.get(normalizeKey(branchName)) || null
      : null;

  const errors = [];

  if (!name) errors.push("Nama mata pelajaran wajib diisi");
  if (!categoryName) errors.push("Kategori wajib diisi");
  if (!matchedCategory && categoryName) {
    errors.push(`Kategori tidak ditemukan: "${categoryName}"`);
  }
  if (kkm === null) {
    errors.push("Nilai KKM wajib diisi");
  } else if (!Number.isFinite(kkm) || kkm < 0 || kkm > 100) {
    errors.push("Nilai KKM harus angka 0-100");
  }
  if (branchName && matchedCategory && !matchedBranch) {
    errors.push(`Cabang tidak ditemukan pada kategori "${categoryName}"`);
  }

  return {
    key: index,
    name,
    category_name: categoryName,
    branch_name: branchName,
    code,
    kkm,
    selectedCategoryId: matchedCategory?.id || null,
    selectedBranchId: matchedBranch?.id || null,
    errors,
  };
};

const recalculateRow = (row, categories, branches) => {
  const matchedCategory = categories.find(
    (item) => item.id === row.selectedCategoryId,
  );
  const matchedBranch = branches.find((item) => item.id === row.selectedBranchId);
  const errors = [];

  if (!normalizeText(row.name)) {
    errors.push("Nama mata pelajaran wajib diisi");
  }
  if (!row.selectedCategoryId) {
    errors.push("Kategori sistem belum dipilih");
  }
  if (row.kkm === null || row.kkm === undefined || Number.isNaN(row.kkm)) {
    errors.push("Nilai KKM wajib diisi");
  } else if (!Number.isFinite(Number(row.kkm)) || row.kkm < 0 || row.kkm > 100) {
    errors.push("Nilai KKM harus angka 0-100");
  }
  if (matchedBranch && matchedCategory && matchedBranch.category_id !== matchedCategory.id) {
    errors.push("Cabang tidak sesuai dengan kategori");
  }

  return {
    ...row,
    selectedBranchId:
      matchedBranch && matchedCategory && matchedBranch.category_id === matchedCategory.id
        ? matchedBranch.id
        : row.selectedBranchId,
    errors,
  };
};

const SubjectImportDrawer = ({ open, onClose }) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [tableData, setTableData] = useState([]);
  const [fileList, setFileList] = useState([]);

  const { data: categoriesData } = useGetSubjectCategoriesQuery();
  const { data: branchesData } = useGetSubjectBranchesQuery(null);
  const [uploadSubjects, { isLoading: isUploading }] =
    useUploadSubjectsMutation();

  const categories = useMemo(() => categoriesData?.data || [], [categoriesData]);
  const branches = useMemo(() => branchesData?.data || [], [branchesData]);

  const categoryOptions = useMemo(
    () =>
      categories.map((item) => ({
        label: item.name,
        value: item.id,
      })),
    [categories],
  );

  const branchOptionsByCategory = useMemo(() => {
    return branches.reduce((acc, item) => {
      if (!acc[item.category_id]) {
        acc[item.category_id] = [];
      }

      acc[item.category_id].push({
        label: item.name,
        value: item.id,
      });

      return acc;
    }, {});
  }, [branches]);

  const closeAndReset = () => {
    setTableData([]);
    setFileList([]);
    onClose();
  };

  const downloadTemplate = () => {
    const worksheet = XLSX.utils.json_to_sheet([
      {
        "Nama Mata Pelajaran": "Matematika Wajib",
        Kategori: "Umum",
        Cabang: "Sains",
        "Kode Mapel": "MTK-WJ",
        "Nilai KKM": 75,
      },
      {
        "Nama Mata Pelajaran": "Fikih Dasar",
        Kategori: "Diniyah",
        Cabang: "Fiqih",
        "Kode Mapel": "FKH-01",
        "Nilai KKM": 78,
      },
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    XLSX.writeFile(workbook, "Template_Import_Mata_Pelajaran.xlsx");
  };

  const handleFile = (file) => {
    if (categories.length === 0) {
      message.error("Referensi kategori belum siap. Coba lagi beberapa saat.");
      return false;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
      const formattedData = jsonData.map((row, index) =>
        buildRow({ row, index, categories, branches }),
      );

      setTableData(formattedData);
      setFileList([file]);
      message.success(`Berhasil memuat ${formattedData.length} baris data mapel.`);
    };

    reader.readAsArrayBuffer(file);
    return false;
  };

  const updateRow = (rowKey, updater) => {
    setTableData((prev) =>
      prev.map((item) => {
        if (item.key !== rowKey) return item;
        return recalculateRow(updater(item), categories, branches);
      }),
    );
  };

  const handleCategoryChange = (value, rowKey) => {
    updateRow(rowKey, (item) => ({
      ...item,
      selectedCategoryId: value,
      selectedBranchId: null,
    }));
  };

  const handleBranchChange = (value, rowKey) => {
    updateRow(rowKey, (item) => ({
      ...item,
      selectedBranchId: value || null,
    }));
  };

  const handleDeleteRow = (rowKey) => {
    setTableData((prev) => prev.filter((item) => item.key !== rowKey));
  };

  const handleUploadSubmit = async () => {
    const validData = tableData.filter((item) => item.errors.length === 0);

    if (validData.length === 0) {
      message.error("Tidak ada data valid untuk diimport.");
      return;
    }

    try {
      const result = await uploadSubjects(
        validData.map((item) => ({
          name: item.name,
          category_id: item.selectedCategoryId,
          branch_id: item.selectedBranchId,
          code: item.code || null,
          kkm: Number(item.kkm),
        })),
      ).unwrap();

      message.success(result?.message || "Import mata pelajaran berhasil.");
      closeAndReset();
    } catch (error) {
      message.error(error?.data?.message || "Gagal import mata pelajaran.");
    }
  };

  const totalData = tableData.length;
  const validCount = tableData.filter((item) => item.errors.length === 0).length;
  const errorCount = totalData - validCount;
  const readinessLabel =
    totalData === 0
      ? "Menunggu File"
      : errorCount === 0
        ? "Siap Diimport"
        : "Perlu Review";

  const columns = [
    {
      title: "Nama Mapel",
      dataIndex: "name",
      width: 220,
      render: (text) => <Text strong>{text || "-"}</Text>,
    },
    {
      title: "Kategori File",
      dataIndex: "category_name",
      width: 150,
      render: (text) => <Text type="secondary">{text || "-"}</Text>,
    },
    {
      title: "Kategori Sistem",
      dataIndex: "selectedCategoryId",
      width: 220,
      render: (value, record) => (
        <Select
          showSearch
          style={{ width: "100%" }}
          placeholder="Pilih kategori"
          value={value}
          onChange={(nextValue) => handleCategoryChange(nextValue, record.key)}
          options={categoryOptions}
          status={!value ? "error" : ""}
          virtual={false}
        />
      ),
    },
    {
      title: "Cabang File",
      dataIndex: "branch_name",
      width: 150,
      render: (text) => <Text type="secondary">{text || "-"}</Text>,
    },
    {
      title: "Cabang Sistem",
      dataIndex: "selectedBranchId",
      width: 220,
      render: (value, record) => (
        <Select
          allowClear
          showSearch
          style={{ width: "100%" }}
          placeholder={
            record.selectedCategoryId ? "Pilih cabang" : "Pilih kategori dulu"
          }
          value={value}
          onChange={(nextValue) => handleBranchChange(nextValue, record.key)}
          options={branchOptionsByCategory[record.selectedCategoryId] || []}
          disabled={!record.selectedCategoryId}
          virtual={false}
        />
      ),
    },
    {
      title: "Kode",
      dataIndex: "code",
      width: 120,
      render: (text) => <Text>{text || "-"}</Text>,
    },
    {
      title: "KKM",
      dataIndex: "kkm",
      width: 90,
      align: "center",
      render: (value) => <Text>{value ?? "-"}</Text>,
    },
    {
      title: "Status",
      key: "status",
      width: 110,
      align: "center",
      render: (_, record) =>
        record.errors.length === 0 ? (
          <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 18 }} />
        ) : (
          <Tooltip title={record.errors.join(", ")}>
            <WarningOutlined style={{ color: "#dc2626", fontSize: 18 }} />
          </Tooltip>
        ),
    },
    {
      title: "Aksi",
      key: "action",
      width: 60,
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
      width={isMobile ? "100%" : 1180}
      onClose={closeAndReset}
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
            padding: isMobile ? 20 : 24,
            background:
              "linear-gradient(135deg, rgba(240,253,244,1), rgba(239,246,255,0.98))",
            borderBottom: "1px solid rgba(148, 163, 184, 0.16)",
          }}
        >
          <Flex justify="space-between" align="flex-start" gap={16}>
            <Flex align="flex-start" gap={16}>
              <div
                style={{
                  width: isMobile ? 50 : 58,
                  height: isMobile ? 50 : 58,
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
                    Import Mata Pelajaran
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
                <Text type="secondary" style={{ display: "block", maxWidth: 680 }}>
                  Upload file Excel sesuai field form mapel, review hasil mapping
                  kategori dan cabang, lalu import data yang sudah valid ke sistem.
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
                onClick={closeAndReset}
                icon={<X size={16} />}
                style={{ borderRadius: 14 }}
              >
                Tutup
              </Button>
              <Button
                onClick={handleUploadSubmit}
                type="primary"
                loading={isUploading}
                disabled={validCount === 0}
                style={{
                  borderRadius: 14,
                  boxShadow: "0 12px 24px rgba(2, 132, 199, 0.20)",
                }}
              >
                Import {validCount > 0 ? `(${validCount})` : ""}
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
                  <Layers size={18} color="#0369a1" />
                  <Text strong>Format Field Import</Text>
                </Flex>
                <Space wrap size={[8, 8]}>
                  <Tag color="blue">Nama Mata Pelajaran</Tag>
                  <Tag color="cyan">Kategori</Tag>
                  <Tag color="geekblue">Cabang</Tag>
                  <Tag color="purple">Kode Mapel</Tag>
                  <Tag color="green">Nilai KKM</Tag>
                </Space>
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

        <div style={{ padding: isMobile ? 16 : 20, flex: 1, overflow: "auto" }}>
          <MotionDiv
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22, delay: 0.04 }}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 16,
              minHeight: "100%",
            }}
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
                              <b>Nama Mata Pelajaran:</b> wajib diisi sesuai nama
                              mapel.
                            </li>
                            <li>
                              <b>Kategori:</b> wajib dan harus sama dengan kategori
                              yang tersedia di sistem.
                            </li>
                            <li>
                              <b>Cabang:</b> opsional, tetapi jika diisi harus cocok
                              dengan kategori yang dipilih.
                            </li>
                            <li>
                              <b>Nilai KKM:</b> wajib angka 0-100.
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
                    padding: isMobile ? 24 : 40,
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
                    Sistem akan membaca field form mapel, melakukan pencocokan
                    kategori dan cabang, lalu menampilkan hasil review sebelum
                    import.
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
                        <span>Auto-match kategori dan cabang dari Excel</span>
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
                      Periksa kategori, cabang, kode, dan KKM sebelum data
                      disimpan ke server.
                    </Text>
                  </div>
                  <Space wrap size={[8, 8]}>
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
                        <Layers size={14} />
                        <span>{categories.length} kategori</span>
                      </Flex>
                    </Tag>
                    <Tag
                      bordered={false}
                      style={{
                        borderRadius: 999,
                        padding: "8px 14px",
                        fontWeight: 600,
                        color: "#1d4ed8",
                        background: "rgba(59, 130, 246, 0.10)",
                      }}
                    >
                      <Flex align="center" gap={8}>
                        <GitBranch size={14} />
                        <span>{branches.length} cabang</span>
                      </Flex>
                    </Tag>
                    <Tag
                      bordered={false}
                      style={{
                        borderRadius: 999,
                        padding: "8px 14px",
                        fontWeight: 600,
                        color: "#047857",
                        background: "rgba(16, 185, 129, 0.10)",
                      }}
                    >
                      <Flex align="center" gap={8}>
                        <BookOpen size={14} />
                        <span>{validCount} siap import</span>
                      </Flex>
                    </Tag>
                  </Space>
                </Flex>

                <Divider style={{ margin: "16px 0" }} />

                {errorCount > 0 && (
                  <Alert
                    title={`Terdapat ${errorCount} data yang perlu diperiksa.`}
                    description="Pilih kategori atau cabang yang benar, atau hapus baris yang tidak ingin diimport."
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
                  scroll={{ y: "calc(100vh - 360px)", x: 1350 }}
                />
              </Card>
            )}
          </MotionDiv>
        </div>
      </MotionDiv>
    </Drawer>
  );
};

export default SubjectImportDrawer;
