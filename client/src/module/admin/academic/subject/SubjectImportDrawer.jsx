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
import { Layers, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import {
  useGetSubjectCategoriesQuery,
  useGetSubjectBranchesQuery,
  useUploadSubjectsMutation,
} from "../../../../service/academic/ApiSubject";
import { CardTitle, MuseCard } from "../../../../components/ui/muse";
import { ImportDrawer, ImportStats, UploadDropzone } from "../../../../components/ui/muse/ImportKit";
import { museColors } from "../../../../config/theme";

const { Text } = Typography;

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
          <CheckCircleOutlined style={{ color: museColors.success, fontSize: 18 }} />
        ) : (
          <Tooltip title={record.errors.join(", ")}>
            <WarningOutlined style={{ color: museColors.danger, fontSize: 18 }} />
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
    <ImportDrawer
      open={open}
      onClose={closeAndReset}
      width={1180}
      icon={<UploadCloud size={16} />}
      title="Import Mata Pelajaran"
      description="Upload Excel, review mapping kategori & cabang, lalu import data yang valid."
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
            disabled={validCount === 0}
          >
            Import {validCount > 0 ? `(${validCount})` : ""}
          </Button>
        </>
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <MuseCard style={{ height: "100%" }}>
            <Flex align="center" gap={8} style={{ marginBottom: 8 }}>
              <Layers size={16} color={museColors.primary} />
              <Text strong>Kolom yang dibaca dari Excel</Text>
            </Flex>
            <Space wrap size={[8, 8]}>
              <Tag style={{ margin: 0 }}>Nama Mata Pelajaran</Tag>
              <Tag style={{ margin: 0 }}>Kategori</Tag>
              <Tag style={{ margin: 0 }}>Cabang</Tag>
              <Tag style={{ margin: 0 }}>Kode Mapel</Tag>
              <Tag style={{ margin: 0 }}>Nilai KKM</Tag>
            </Space>
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
                        <b>Nama Mata Pelajaran:</b> wajib diisi sesuai nama mapel.
                      </li>
                      <li>
                        <b>Kategori:</b> wajib dan harus sama dengan kategori di sistem.
                      </li>
                      <li>
                        <b>Cabang:</b> opsional, tetapi jika diisi harus cocok dengan kategorinya.
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
          hint="Sistem membaca kolom form mapel, mencocokkan kategori dan cabang, lalu menampilkan review sebelum import."
          note="Format .xlsx / .xls"
        />
      ) : (
        <MuseCard
          flush
          title={
            <CardTitle
              title="Review & Mapping Data"
              description="Periksa kategori, cabang, kode, dan KKM sebelum disimpan."
            />
          }
          extra={
            <Space wrap size={[6, 6]}>
              <Tag style={{ margin: 0 }}>{categories.length} kategori</Tag>
              <Tag style={{ margin: 0 }}>{branches.length} cabang</Tag>
              <Tag color="success" style={{ margin: 0 }}>
                {validCount} siap import
              </Tag>
            </Space>
          }
        >
          {errorCount > 0 && (
            <Alert
              title={`Ada ${errorCount} data yang perlu diperiksa.`}
              description="Pilih kategori atau cabang yang benar, atau hapus baris yang tidak ingin diimport."
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
            scroll={{ y: "calc(100vh - 420px)", x: 1350 }}
          />
        </MuseCard>
      )}
    </ImportDrawer>
  );
};

export default SubjectImportDrawer;
