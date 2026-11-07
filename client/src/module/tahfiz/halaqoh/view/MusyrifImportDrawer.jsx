import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Alert,
  Button,
  Card,
  Divider,
  Drawer,
  Flex,
  Grid,
  Select,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  InboxOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { ShieldUser, UploadCloud, X, Sparkles, School } from "lucide-react";
import * as XLSX from "xlsx";
import { useImportMusyrifMutation } from "../../../../service/tahfiz/ApiHalaqoh";
import {
  downloadMusyrifImportTemplate,
  normalizeGenderValue,
  normalizeKey,
  normalizeText,
  parseBooleanValue,
} from "./importHelpers";

const { Dragger } = Upload;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;
const MotionDiv = motion.div;

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

const buildHomebaseMap = (homebaseOptions) =>
  new Map(homebaseOptions.map((item) => [normalizeKey(item.label), item]));

const buildRow = ({
  row,
  index,
  homebaseMap,
  defaultHomebaseId,
  defaultHomebaseLabel,
}) => {
  const homebaseName = normalizeText(
    pickValue(row, ["Homebase", "Nama Homebase", "homebase", "homebase_name"]),
  );
  const fullName = normalizeText(
    pickValue(row, ["Nama Musyrif", "Nama", "full_name", "name"]),
  );
  const username = normalizeText(pickValue(row, ["Username", "username"])).toLowerCase();
  const password = normalizeText(pickValue(row, ["Password", "password"]));
  const phone = normalizeText(pickValue(row, ["No HP", "Nomor HP", "phone"]));
  const gender = normalizeGenderValue(pickValue(row, ["L/P", "Gender", "gender"]));
  const notes = normalizeText(pickValue(row, ["Catatan", "notes"]));
  const isActive = parseBooleanValue(
    pickValue(row, ["Status Aktif", "Aktif", "is_active"]),
    true,
  );

  const matchedHomebase =
    homebaseMap.get(normalizeKey(homebaseName)) ||
    (defaultHomebaseId
      ? { value: defaultHomebaseId, label: defaultHomebaseLabel || "Homebase Aktif" }
      : null);

  const errors = [];

  if (!matchedHomebase?.value) errors.push("Homebase belum dipilih");
  if (!fullName) errors.push("Nama musyrif wajib diisi");
  if (!username) {
    errors.push("Username wajib diisi");
  } else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
    errors.push("Format username tidak valid");
  }
  if (!password) errors.push("Password wajib diisi");
  if (gender && !["L", "P"].includes(gender)) {
    errors.push("Gender hanya boleh L atau P");
  }

  return {
    key: index,
    homebase_name: homebaseName,
    selectedHomebaseId: matchedHomebase?.value || null,
    full_name: fullName,
    username,
    password,
    phone,
    gender,
    notes,
    is_active: isActive,
    errors,
  };
};

const recalculateRow = (row) => {
  const errors = [];

  if (!row.selectedHomebaseId) errors.push("Homebase belum dipilih");
  if (!normalizeText(row.full_name)) errors.push("Nama musyrif wajib diisi");
  if (!normalizeText(row.username)) {
    errors.push("Username wajib diisi");
  } else if (!/^[a-zA-Z0-9._-]+$/.test(normalizeText(row.username))) {
    errors.push("Format username tidak valid");
  }
  if (!normalizeText(row.password)) errors.push("Password wajib diisi");
  if (row.gender && !["L", "P"].includes(row.gender)) {
    errors.push("Gender hanya boleh L atau P");
  }

  return {
    ...row,
    username: normalizeText(row.username).toLowerCase(),
    full_name: normalizeText(row.full_name),
    password: normalizeText(row.password),
    phone: normalizeText(row.phone),
    notes: normalizeText(row.notes),
    errors,
  };
};

const MusyrifImportDrawer = ({
  open,
  onClose,
  homebaseOptions,
  selectedHomebaseId,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [tableData, setTableData] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [activeTab, setActiveTab] = useState("upload");
  const [importMusyrif, { isLoading: isImporting }] = useImportMusyrifMutation();

  const homebaseMap = useMemo(
    () => buildHomebaseMap(homebaseOptions || []),
    [homebaseOptions],
  );
  const homebaseLabelMap = useMemo(
    () => new Map((homebaseOptions || []).map((item) => [item.value, item.label])),
    [homebaseOptions],
  );

  const closeAndReset = () => {
    setTableData([]);
    setFileList([]);
    setActiveTab("upload");
    onClose();
  };

  const markDuplicateUsernames = (rows) => {
    const counts = rows.reduce((acc, item) => {
      const key = normalizeKey(item.username);
      if (!key) return acc;
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());

    return rows.map((item) => {
      const key = normalizeKey(item.username);
      const errors = [...item.errors];
      if (key && (counts.get(key) || 0) > 1) {
        errors.push("Username duplikat di file import");
      }
      return { ...item, errors: [...new Set(errors)] };
    });
  };

  const handleFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const rows = jsonData.map((row, index) =>
        buildRow({
          row,
          index,
          homebaseMap,
          defaultHomebaseId: selectedHomebaseId,
          defaultHomebaseLabel: homebaseLabelMap.get(selectedHomebaseId),
        }),
      );

      const normalizedRows = markDuplicateUsernames(rows);
      setTableData(normalizedRows);
      setFileList([file]);
      message.success(`Berhasil memuat ${normalizedRows.length} baris data musyrif.`);
    };

    reader.readAsArrayBuffer(file);
    return false;
  };

  const updateRow = (rowKey, updater) => {
    setTableData((prev) =>
      markDuplicateUsernames(
        prev.map((item) => {
          if (item.key !== rowKey) return item;
          return recalculateRow(updater(item));
        }),
      ),
    );
  };

  const handleHomebaseChange = (value, rowKey) => {
    updateRow(rowKey, (item) => ({ ...item, selectedHomebaseId: value }));
  };

  const handleDeleteRow = (rowKey) => {
    setTableData((prev) => markDuplicateUsernames(prev.filter((item) => item.key !== rowKey)));
  };

  const handleImport = async () => {
    const validRows = tableData.filter((item) => item.errors.length === 0);
    if (!validRows.length) {
      message.error("Tidak ada data musyrif yang valid untuk diimport.");
      return;
    }

    try {
      const result = await importMusyrif({
        musyrif: validRows.map((item) => ({
          homebase_id: item.selectedHomebaseId,
          full_name: item.full_name,
          username: item.username,
          password: item.password,
          phone: item.phone || null,
          gender: item.gender || null,
          notes: item.notes || null,
          is_active: item.is_active,
        })),
      }).unwrap();

      message.success(result?.message || "Import musyrif berhasil.");
      closeAndReset();
    } catch (error) {
      message.error(error?.data?.message || "Gagal import data musyrif.");
    }
  };

  const totalData = tableData.length;
  const validCount = tableData.filter((item) => item.errors.length === 0).length;
  const errorCount = totalData - validCount;
  const readinessLabel =
    totalData === 0 ? "Menunggu File" : errorCount === 0 ? "Siap Diimport" : "Perlu Review";

  const columns = [
    {
      title: "Homebase File",
      dataIndex: "homebase_name",
      width: 180,
      render: (value) => <Text type="secondary">{value || "-"}</Text>,
    },
    {
      title: "Homebase Sistem",
      dataIndex: "selectedHomebaseId",
      width: 220,
      render: (value, record) => (
        <Select
          showSearch
          virtual={false}
          value={value}
          options={homebaseOptions}
          onChange={(nextValue) => handleHomebaseChange(nextValue, record.key)}
          placeholder="Pilih homebase"
          status={!value ? "error" : ""}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Nama Musyrif",
      dataIndex: "full_name",
      width: 220,
      render: (value) => <Text strong>{value || "-"}</Text>,
    },
    {
      title: "Username",
      dataIndex: "username",
      width: 180,
    },
    {
      title: "No HP",
      dataIndex: "phone",
      width: 160,
      render: (value) => value || "-",
    },
    {
      title: "L/P",
      dataIndex: "gender",
      width: 80,
      align: "center",
      render: (value) => value || "-",
    },
    {
      title: "Status",
      key: "status",
      width: 100,
      align: "center",
      render: (_, record) =>
        record.errors.length === 0 ? (
          <CheckCircleOutlined style={{ color: "#16a34a", fontSize: 18 }} />
        ) : (
          <Space size={4}>
            <WarningOutlined style={{ color: "#dc2626", fontSize: 18 }} />
          </Space>
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

  const uploadContent = (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <RowSummary
        homebaseLabel={homebaseLabelMap.get(selectedHomebaseId)}
        totalData={totalData}
        validCount={validCount}
        errorCount={errorCount}
      />

      {tableData.length === 0 ? (
        <Card
          bordered={false}
          style={{ borderRadius: 24, boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)" }}
          styles={{ body: { padding: isMobile ? 18 : 24 } }}
        >
          <Dragger
            accept=".xlsx, .xls"
            beforeUpload={handleFile}
            fileList={fileList}
            showUploadList={false}
            style={{
              minHeight: 340,
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
              Sistem akan membaca template musyrif, menyesuaikan homebase, lalu
              menampilkan hasil review sebelum import.
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
                  <span>Auto-match homebase dari template Excel</span>
                </Flex>
              </Tag>
            </div>
          </Dragger>
        </Card>
      ) : (
        <Card
          bordered={false}
          style={{ borderRadius: 24, boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)" }}
          styles={{ body: { padding: 18 } }}
        >
          <Flex justify="space-between" align="center" gap={12} wrap="wrap">
            <div>
              <Title level={4} style={{ margin: 0 }}>
                Review Data Musyrif
              </Title>
              <Text type="secondary">
                Periksa homebase, username, dan status tiap baris sebelum import.
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
                <span>{homebaseOptions.length} homebase tersedia</span>
              </Flex>
            </Tag>
          </Flex>

          <Divider style={{ margin: "16px 0" }} />

          {errorCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 14, borderRadius: 16 }}
              message={`Terdapat ${errorCount} baris yang perlu diperiksa.`}
              description="Perbaiki mapping homebase atau hapus baris yang tidak ingin diimport."
            />
          ) : null}

          <Table
            dataSource={tableData}
            columns={columns}
            rowKey="key"
            pagination={false}
            size="small"
            bordered
            expandable={{
              expandedRowRender: (record) => (
                <Space direction="vertical" size={4}>
                  <Text>Password: {record.password || "-"}</Text>
                  <Text>Catatan: {record.notes || "-"}</Text>
                  <Text>Status Aktif: {record.is_active ? "Aktif" : "Nonaktif"}</Text>
                  {record.errors.length ? (
                    <Text type="danger">Catatan validasi: {record.errors.join(", ")}</Text>
                  ) : null}
                </Space>
              ),
            }}
            scroll={{ y: "calc(100vh - 380px)", x: 1200 }}
          />
        </Card>
      )}
    </MotionDiv>
  );

  const guideContent = (
    <Card
      bordered={false}
      style={{ borderRadius: 24, boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)" }}
      styles={{ body: { padding: isMobile ? 16 : 20 } }}
    >
      <Alert
        type="info"
        showIcon
        style={{ borderRadius: 16, marginBottom: 16 }}
        message="Aturan Pengisian Import Musyrif"
        description={
          <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
            <li>Gunakan sheet pertama bernama `Template` saat mengisi data.</li>
            <li>`Username` wajib unik dan akan dipakai sebagai akun login musyrif.</li>
            <li>`Password` wajib diisi untuk setiap baris import.</li>
            <li>Isi `L/P` dengan `L` atau `P` agar validasi otomatis berjalan baik.</li>
            <li>Kolom `Homebase` boleh dikosongkan jika Anda sedang bekerja dalam satu homebase tetap.</li>
          </ul>
        }
      />
      <Button icon={<DownloadOutlined />} onClick={downloadMusyrifImportTemplate}>
        Download Template Excel
      </Button>
    </Card>
  );

  return (
    <Drawer
      title={null}
      width={isMobile ? "100%" : 1120}
      onClose={closeAndReset}
      open={open}
      destroyOnHidden
      closable={false}
      styles={{
        header: { display: "none" },
        body: {
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
                    Import Data Musyrif
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
                <Text type="secondary" style={{ display: "block", maxWidth: 700 }}>
                  Upload file Excel, review hasil mapping homebase, lalu sinkronkan
                  data musyrif ke sistem dari satu panel yang lebih fokus.
                </Text>
              </div>
            </Flex>

            <Flex gap={10} wrap="wrap" justify="flex-end">
              <Button
                icon={<DownloadOutlined />}
                onClick={downloadMusyrifImportTemplate}
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
                onClick={handleImport}
                type="primary"
                loading={isImporting}
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
        </div>

        <div style={{ padding: isMobile ? 16 : 20, flex: 1, overflow: "auto" }}>
          <Card
            bordered={false}
            style={{ borderRadius: 24, boxShadow: "0 18px 40px rgba(15, 23, 42, 0.06)" }}
            styles={{ body: { padding: isMobile ? 14 : 18 } }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              type="card"
              size="large"
              items={[
                {
                  key: "upload",
                  label: (
                    <Flex align="center" gap={8}>
                      <ShieldUser size={16} />
                      <span>Upload & Review</span>
                    </Flex>
                  ),
                  children: uploadContent,
                },
                {
                  key: "guide",
                  label: (
                    <Flex align="center" gap={8}>
                      <InfoCircleOutlined />
                      <span>Panduan</span>
                    </Flex>
                  ),
                  children: guideContent,
                },
              ]}
            />
          </Card>
        </div>
      </MotionDiv>
    </Drawer>
  );
};

const RowSummary = ({ homebaseLabel, totalData, validCount, errorCount }) => (
  <Flex vertical gap={16}>
    <Card
      size="small"
      style={{
        borderRadius: 18,
        border: "1px solid rgba(148, 163, 184, 0.18)",
        boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
      }}
      styles={{ body: { padding: "14px 16px" } }}
    >
      <Flex align="center" gap={10}>
        <School size={18} color="#0369a1" />
        <div>
          <Text strong>Homebase Default</Text>
          <Text type="secondary" style={{ display: "block" }}>
            {homebaseLabel || "Pilih/mapping dari file Excel"}
          </Text>
        </div>
      </Flex>
    </Card>

    <Flex gap={12} wrap="wrap">
      <Card
        size="small"
        style={{ borderRadius: 18, minWidth: 140, boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)" }}
        styles={{ body: { padding: "14px 16px" } }}
      >
        <Statistic title="Data" value={totalData} />
      </Card>
      <Card
        size="small"
        style={{ borderRadius: 18, minWidth: 140, boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)" }}
        styles={{ body: { padding: "14px 16px" } }}
      >
        <Statistic title="Valid" value={validCount} valueStyle={{ color: "#15803d" }} />
      </Card>
      <Card
        size="small"
        style={{ borderRadius: 18, minWidth: 140, boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)" }}
        styles={{ body: { padding: "14px 16px" } }}
      >
        <Statistic title="Perlu Cek" value={errorCount} valueStyle={{ color: "#dc2626" }} />
      </Card>
    </Flex>
  </Flex>
);

export default MusyrifImportDrawer;
