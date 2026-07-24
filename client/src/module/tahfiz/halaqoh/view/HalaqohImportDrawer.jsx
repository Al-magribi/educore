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
import { BookUser, CalendarRange, Sparkles, UploadCloud, Users, X } from "lucide-react";
import * as XLSX from "xlsx";
import { useImportHalaqohMutation } from "../../../../service/tahfiz/ApiHalaqoh";
import {
  downloadHalaqohImportTemplate,
  normalizeKey,
  normalizeText,
  parseBooleanValue,
  parseDelimitedValues,
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

const buildCandidateMap = (items, keys, mapper) => {
  const map = new Map();

  const register = (lookupValue, candidate) => {
    const normalized = normalizeKey(lookupValue);
    if (!normalized) return;
    if (!map.has(normalized)) {
      map.set(normalized, []);
    }
    map.get(normalized).push(candidate);
  };

  items.forEach((item) => {
    const candidate = mapper(item);
    keys.forEach((key) => {
      register(item?.[key], candidate);
    });
  });

  return map;
};

const mergeCandidateMaps = (...maps) => {
  const merged = new Map();

  maps.forEach((map) => {
    map.forEach((value, key) => {
      if (!merged.has(key)) {
        merged.set(key, []);
      }
      merged.set(key, [...merged.get(key), ...value]);
    });
  });

  return merged;
};

const pickScopedCandidate = (candidates, homebaseId) => {
  if (!Array.isArray(candidates) || candidates.length === 0) return null;
  const validCandidates = candidates.filter(
    (item) => item?.id !== null && item?.id !== undefined,
  );

  if (homebaseId) {
    return (
      validCandidates.find((item) => item.homebase_id === homebaseId) ||
      candidates.find((item) => item.homebase_id === homebaseId) ||
      validCandidates[0] ||
      candidates[0] ||
      null
    );
  }

  return validCandidates[0] || candidates[0] || null;
};

const readReferenceSheet = (workbook, sheetName) => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return [];
  return XLSX.utils.sheet_to_json(sheet);
};

const inferHomebaseId = ({
  periodeCandidates,
  musyrifCandidates,
  studentCandidatesList,
}) => {
  const scoreMap = new Map();

  const addScore = (homebaseId, score) => {
    if (!homebaseId) return;
    scoreMap.set(homebaseId, (scoreMap.get(homebaseId) || 0) + score);
  };

  periodeCandidates.forEach((item) => addScore(item.homebase_id, 3));
  musyrifCandidates.forEach((item) => addScore(item.homebase_id, 4));
  studentCandidatesList.forEach((candidates) => {
    candidates.forEach((item) => addScore(item.homebase_id, 1));
  });

  if (!scoreMap.size) return null;

  return [...scoreMap.entries()].sort((a, b) => b[1] - a[1])[0][0] || null;
};

const buildRow = ({
  row,
  index,
  periodeMap,
  musyrifMap,
  studentMap,
  defaultPeriodeId,
}) => {
  const homebaseName = normalizeText(
    pickValue(row, ["Satuan", "Nama Satuan", "Homebase", "homebase_name"]),
  );
  const periodeName = normalizeText(
    pickValue(row, ["Periode", "Nama Periode", "periode", "periode_name"]),
  );
  const name = normalizeText(
    pickValue(row, ["Nama Halaqoh", "Nama", "name", "halaqoh_name"]),
  );
  const musyrifIdentifier = normalizeText(
    pickValue(row, [
      "Username Musyrif",
      "Musyrif Username",
      "Musyrif",
      "Nama Musyrif",
      "musyrif",
      "musyrif_username",
    ]),
  );
  const studentIdentifierText = normalizeText(
    pickValue(row, [
      "Daftar NIS Siswa",
      "NIS Siswa",
      "Student NIS",
      "student_nis",
      "students",
    ]),
  );
  const isActive = parseBooleanValue(
    pickValue(row, ["Status Aktif", "Aktif", "is_active"]),
    true,
  );

  const scopedPeriodeKey = normalizeKey(
    homebaseName ? `${periodeName} - ${homebaseName}` : "",
  );
  const periodeCandidates =
    (scopedPeriodeKey ? periodeMap.get(scopedPeriodeKey) : null) ||
    periodeMap.get(normalizeKey(periodeName)) ||
    [];
  if (defaultPeriodeId && !periodeCandidates.length) {
    periodeCandidates.push({ value: defaultPeriodeId, homebase_id: null });
  }
  const musyrifCandidates = musyrifMap.get(normalizeKey(musyrifIdentifier)) || [];
  const studentTokens = parseDelimitedValues(studentIdentifierText);
  const studentCandidatesList = studentTokens.map(
    (token) => studentMap.get(normalizeKey(token)) || [],
  );
  const inferredHomebaseId = inferHomebaseId({
    periodeCandidates,
    musyrifCandidates,
    studentCandidatesList,
  });
  const hintedHomebaseId =
    periodeCandidates.find((item) => item.homebase_name && normalizeKey(item.homebase_name) === normalizeKey(homebaseName))
      ?.homebase_id || null;
  const matchedPeriode = pickScopedCandidate(periodeCandidates, inferredHomebaseId);
  const matchedMusyrif = pickScopedCandidate(
    musyrifCandidates,
    hintedHomebaseId || matchedPeriode?.homebase_id || inferredHomebaseId,
  );
  const resolvedHomebaseId =
    hintedHomebaseId ||
    matchedPeriode?.homebase_id ||
    matchedMusyrif?.homebase_id ||
    inferredHomebaseId ||
    null;

  const resolvedStudentIds = [];
  const unresolvedStudents = [];

  studentTokens.forEach((token, tokenIndex) => {
    const matchedStudent = pickScopedCandidate(
      studentCandidatesList[tokenIndex],
      resolvedHomebaseId,
    );
    if (matchedStudent) {
      resolvedStudentIds.push(matchedStudent.id);
    } else {
      unresolvedStudents.push(token);
    }
  });

  const errors = [];
  if (!matchedPeriode?.value) errors.push("Periode belum dipilih");
  if (!name) errors.push("Nama halaqoh wajib diisi");
  if (!matchedMusyrif?.id) errors.push("Musyrif belum cocok");
  if (unresolvedStudents.length) {
    errors.push(`NIS siswa tidak ditemukan: ${unresolvedStudents.join(", ")}`);
  }

  return {
    key: index,
    homebase_name: homebaseName,
    periode_name: periodeName,
    selectedPeriodeId: matchedPeriode?.value || null,
    inferred_homebase_id: resolvedHomebaseId,
    name,
    musyrif_identifier: musyrifIdentifier,
    selectedMusyrifId: matchedMusyrif?.id || null,
    student_identifier_text: studentIdentifierText,
    student_ids: [...new Set(resolvedStudentIds)],
    unresolved_students: unresolvedStudents,
    is_active: isActive,
    errors,
  };
};

const recalculateRow = (row) => {
  const errors = [];

  if (!row.selectedPeriodeId) errors.push("Periode belum dipilih");
  if (!normalizeText(row.name)) errors.push("Nama halaqoh wajib diisi");
  if (!row.selectedMusyrifId) errors.push("Musyrif belum cocok");
  if (row.unresolved_students.length) {
    errors.push(`NIS siswa tidak ditemukan: ${row.unresolved_students.join(", ")}`);
  }

  return {
    ...row,
    name: normalizeText(row.name),
    student_ids: [...new Set(row.student_ids)],
    errors,
  };
};

const HalaqohImportDrawer = ({
  open,
  onClose,
  periodeOptions,
  musyrifOptions,
  studentOptions,
  selectedPeriodeId,
  importReference,
}) => {
  const screens = useBreakpoint();
  const isMobile = !screens.md;
  const [tableData, setTableData] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [activeTab, setActiveTab] = useState("upload");
  const [importHalaqoh, { isLoading: isImporting }] = useImportHalaqohMutation();

  const periodeMap = useMemo(() => {
    return buildCandidateMap(
      (periodeOptions || []).flatMap((item) => [
        { ...item, lookup_value: item.label },
        ...(item.searchTokens || []).map((token) => ({ ...item, lookup_value: token })),
      ]),
      ["lookup_value"],
      (item) => ({
        value: item.value || item.id,
        label: item.label,
        homebase_id: item.homebase_id,
        homebase_name: item.homebase_name,
      }),
    );
  }, [periodeOptions]);
  const musyrifMap = useMemo(() => {
    return mergeCandidateMaps(
      buildCandidateMap(
        importReference?.musyrif || [],
        ["username", "full_name"],
        (item) => ({
          id: item.musyrif_id,
          label: item.username || item.full_name,
          homebase_id: item.homebase_id,
          homebase_name: item.homebase_name,
        }),
      ),
      buildCandidateMap(
        (musyrifOptions || []).flatMap((item) => [
          { ...item, lookup_value: item.label },
          ...(item.searchTokens || []).map((token) => ({ ...item, lookup_value: token })),
        ]),
        ["lookup_value"],
        (item) => ({
          id: item.value || item.id,
          label: item.label,
          homebase_id: item.homebase_id,
          homebase_name: item.homebase_name,
        }),
      ),
    );
  }, [importReference?.musyrif, musyrifOptions]);
  const studentMap = useMemo(() => {
    return mergeCandidateMaps(
      buildCandidateMap(
        importReference?.students || [],
        ["nis", "full_name"],
        (item) => ({
          id: item.student_id,
          nis: item.nis,
          full_name: item.full_name,
          class_name: item.class_name,
          homebase_id: item.homebase_id,
          homebase_name: item.homebase_name,
        }),
      ),
      buildCandidateMap(
        studentOptions || [],
        ["nis", "full_name"],
        (item) => ({
          id: item.value || item.id,
          nis: item.nis,
          full_name: item.full_name,
          class_name: item.class_name,
          homebase_id: item.homebase_id,
          homebase_name: item.homebase_name,
        }),
      ),
    );
  }, [importReference?.students, studentOptions]);

  const closeAndReset = () => {
    setTableData([]);
    setFileList([]);
    setActiveTab("upload");
    onClose();
  };

  const markDuplicateRows = (rows) => {
    const counts = rows.reduce((acc, item) => {
      const key = `${item.selectedPeriodeId || "none"}::${normalizeKey(item.name)}`;
      if (!normalizeText(item.name)) return acc;
      acc.set(key, (acc.get(key) || 0) + 1);
      return acc;
    }, new Map());

    return rows.map((item) => {
      const key = `${item.selectedPeriodeId || "none"}::${normalizeKey(item.name)}`;
      const errors = [...item.errors];
      if (normalizeText(item.name) && (counts.get(key) || 0) > 1) {
        errors.push("Nama halaqoh duplikat pada periode yang sama di file import");
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
      const periodeSheetRows = readReferenceSheet(workbook, "Periode Aktif");
      const musyrifSheetRows = readReferenceSheet(workbook, "Referensi Musyrif");
      const studentSheetRows = readReferenceSheet(workbook, "Referensi Siswa");

      const filePeriodeMap = mergeCandidateMaps(
        periodeMap,
        buildCandidateMap(
          periodeSheetRows.map((item) => ({
            periode_name: item["Periode Aktif"],
            scoped_periode_name: `${normalizeText(item["Periode Aktif"])} - ${normalizeText(item["Nama Satuan"])}`,
            homebase_id: Number(item["ID Satuan"]),
            homebase_name: item["Nama Satuan"],
            periode_id: Number(item["ID Periode"]),
          })),
          ["periode_name", "scoped_periode_name"],
          (item) => ({
            value: Number.isFinite(item.periode_id) ? item.periode_id : null,
            label: `${normalizeText(item.periode_name)}${normalizeText(item.homebase_name) ? ` - ${normalizeText(item.homebase_name)}` : ""}`,
            homebase_id: Number.isFinite(item.homebase_id) ? item.homebase_id : null,
            homebase_name: normalizeText(item.homebase_name) || null,
          }),
        ),
      );

      const fileMusyrifMap = mergeCandidateMaps(
        musyrifMap,
        buildCandidateMap(
          musyrifSheetRows.map((item) => ({
            username: item.Username,
            full_name: item["Nama Musyrif"],
            homebase_id: Number(item["ID Satuan"]),
            homebase_name: item["Nama Satuan"],
            musyrif_id: null,
          })),
          ["username", "full_name"],
          (item) => ({
            id: null,
            label: item.username || item.full_name,
            homebase_id: Number.isFinite(item.homebase_id) ? item.homebase_id : null,
            homebase_name: item.homebase_name || null,
          }),
        ),
      );

      const fileStudentMap = mergeCandidateMaps(
        studentMap,
        buildCandidateMap(
          studentSheetRows.map((item) => ({
            nis: item.NIS,
            full_name: item["Nama Siswa"],
            class_name: item.Kelas,
            homebase_id: Number(item["ID Satuan"]),
            homebase_name: item["Nama Satuan"],
          })),
          ["nis", "full_name"],
          (item) => ({
            id: null,
            nis: item.nis,
            full_name: item.full_name,
            class_name: item.class_name,
            homebase_id: Number.isFinite(item.homebase_id) ? item.homebase_id : null,
            homebase_name: item.homebase_name || null,
          }),
        ),
      );

      const rows = jsonData.map((row, index) =>
        buildRow({
          row,
          index,
          periodeMap: filePeriodeMap,
          musyrifMap: fileMusyrifMap,
          studentMap: fileStudentMap,
          defaultPeriodeId: selectedPeriodeId,
        }),
      );

      const normalizedRows = markDuplicateRows(rows);
      setTableData(normalizedRows);
      setFileList([file]);
      message.success(`Berhasil memuat ${normalizedRows.length} baris data halaqoh.`);
    };

    reader.readAsArrayBuffer(file);
    return false;
  };

  const updateRow = (rowKey, updater) => {
    setTableData((prev) =>
      markDuplicateRows(
        prev.map((item) => {
          if (item.key !== rowKey) return item;
          return recalculateRow(updater(item));
        }),
      ),
    );
  };

  const handlePeriodeChange = (value, rowKey) => {
    updateRow(rowKey, (item) => ({ ...item, selectedPeriodeId: value }));
  };

  const handleMusyrifChange = (value, rowKey) => {
    updateRow(rowKey, (item) => ({ ...item, selectedMusyrifId: value }));
  };

  const handleDeleteRow = (rowKey) => {
    setTableData((prev) => markDuplicateRows(prev.filter((item) => item.key !== rowKey)));
  };

  const handleImport = async () => {
    const validRows = tableData.filter((item) => item.errors.length === 0);
    if (!validRows.length) {
      message.error("Tidak ada data halaqoh yang valid untuk diimport.");
      return;
    }

    try {
      const result = await importHalaqoh({
        halaqoh: validRows.map((item) => ({
          periode_id: item.selectedPeriodeId,
          name: item.name,
          musyrif_id: item.selectedMusyrifId,
          student_ids: item.student_ids,
          is_active: item.is_active,
        })),
      }).unwrap();

      message.success(result?.message || "Import halaqoh berhasil.");
      closeAndReset();
    } catch (error) {
      message.error(error?.data?.message || "Gagal import data halaqoh.");
    }
  };

  const totalData = tableData.length;
  const validCount = tableData.filter((item) => item.errors.length === 0).length;
  const errorCount = totalData - validCount;
  const readinessLabel =
    totalData === 0 ? "Menunggu File" : errorCount === 0 ? "Siap Diimport" : "Perlu Review";
  const handleDownloadTemplate = () => {
    downloadHalaqohImportTemplate(importReference);
  };

  const columns = [
    {
      title: "Periode File",
      dataIndex: "periode_name",
      width: 200,
      render: (value) => <Text type="secondary">{value || "-"}</Text>,
    },
    {
      title: "Periode Sistem",
      dataIndex: "selectedPeriodeId",
      width: 220,
      render: (value, record) => (
        <Select
          showSearch
          virtual={false}
          value={value}
          options={periodeOptions}
          onChange={(nextValue) => handlePeriodeChange(nextValue, record.key)}
          placeholder="Pilih periode"
          status={!value ? "error" : ""}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Nama Halaqoh",
      dataIndex: "name",
      width: 220,
      render: (value) => <Text strong>{value || "-"}</Text>,
    },
    {
      title: "Musyrif File",
      dataIndex: "musyrif_identifier",
      width: 220,
      render: (value) => <Text type="secondary">{value || "-"}</Text>,
    },
    {
      title: "Musyrif Sistem",
      dataIndex: "selectedMusyrifId",
      width: 240,
      render: (value, record) => (
        <Select
          showSearch
          optionFilterProp="label"
          virtual={false}
          value={value}
          options={musyrifOptions}
          onChange={(nextValue) => handleMusyrifChange(nextValue, record.key)}
          placeholder="Pilih musyrif"
          status={!value ? "error" : ""}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "Siswa Cocok",
      dataIndex: "student_ids",
      width: 120,
      align: "center",
      render: (value) => value.length,
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
          <WarningOutlined style={{ color: "#dc2626", fontSize: 18 }} />
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
      <Flex gap={12} wrap="wrap">
        <Card
          size="small"
          style={{
            borderRadius: 18,
            minWidth: 180,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
          }}
          styles={{ body: { padding: "14px 16px" } }}
        >
          <Flex align="center" gap={10}>
            <CalendarRange size={18} color="#0369a1" />
            <div>
              <Text strong>Periode Default</Text>
              <Text type="secondary" style={{ display: "block" }}>
                {periodeOptions.find((item) => item.value === selectedPeriodeId)?.label || "Mapping dari file"}
              </Text>
            </div>
          </Flex>
        </Card>
        <Card
          size="small"
          style={{
            borderRadius: 18,
            minWidth: 140,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
          }}
          styles={{ body: { padding: "14px 16px" } }}
        >
          <Statistic title="Data" value={totalData} />
        </Card>
        <Card
          size="small"
          style={{
            borderRadius: 18,
            minWidth: 140,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
          }}
          styles={{ body: { padding: "14px 16px" } }}
        >
          <Statistic title="Valid" value={validCount} valueStyle={{ color: "#15803d" }} />
        </Card>
        <Card
          size="small"
          style={{
            borderRadius: 18,
            minWidth: 140,
            boxShadow: "0 10px 24px rgba(15, 23, 42, 0.04)",
          }}
          styles={{ body: { padding: "14px 16px" } }}
        >
          <Statistic title="Perlu Cek" value={errorCount} valueStyle={{ color: "#dc2626" }} />
        </Card>
      </Flex>

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
              Sistem akan membaca periode, musyrif, dan daftar NIS siswa sebelum
              menampilkan hasil review import halaqoh.
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
                  <span>Auto-match periode, musyrif, dan NIS siswa</span>
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
                Review Data Halaqoh
              </Title>
              <Text type="secondary">
                Pastikan periode, musyrif, dan daftar anggota siswa sudah sesuai.
              </Text>
            </div>
            <Flex gap={8} wrap="wrap">
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
                {periodeOptions.length} periode
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
                {musyrifOptions.length} musyrif
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
                {studentOptions.length} siswa referensi
              </Tag>
            </Flex>
          </Flex>

          <Divider style={{ margin: "16px 0" }} />

          {errorCount > 0 ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 14, borderRadius: 16 }}
              message={`Terdapat ${errorCount} baris yang perlu diperiksa.`}
              description="Periksa mapping periode, musyrif, atau NIS siswa yang belum dikenali."
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
                  <Text>NIS dari file: {record.student_identifier_text || "-"}</Text>
                  <Text>Jumlah siswa cocok: {record.student_ids.length}</Text>
                  <Text>Status Aktif: {record.is_active ? "Aktif" : "Nonaktif"}</Text>
                  {record.unresolved_students.length ? (
                    <Text type="danger">
                      NIS belum dikenali: {record.unresolved_students.join(", ")}
                    </Text>
                  ) : null}
                  {record.errors.length ? (
                    <Text type="danger">Catatan validasi: {record.errors.join(", ")}</Text>
                  ) : null}
                </Space>
              ),
            }}
            scroll={{ y: "calc(100vh - 380px)", x: 1320 }}
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
        message="Aturan Pengisian Import Halaqoh"
        description={
          <ul style={{ paddingLeft: 18, marginBottom: 0 }}>
            <li>Gunakan nama periode sesuai yang tersedia pada homebase yang sedang dipilih.</li>
            <li>Gunakan `Username Musyrif` agar pencocokan lebih stabil dibanding nama bebas.</li>
            <li>Daftar NIS siswa boleh dipisah dengan koma, titik koma, atau baris baru.</li>
            <li>Jika ada NIS yang tidak dikenali, baris akan masuk status perlu review.</li>
            <li>Template resmi sudah menyertakan sheet `Panduan` untuk dibagikan ke operator lain.</li>
          </ul>
        }
      />
      <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
        Download Template Excel
      </Button>
    </Card>
  );

  return (
    <Drawer
      title={null}
      width={isMobile ? "100%" : 1160}
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
                    Import Data Halaqoh
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
                <Text type="secondary" style={{ display: "block", maxWidth: 720 }}>
                  Upload file Excel halaqoh, cek kecocokan periode, musyrif, dan
                  anggota siswa, lalu import dari panel yang lebih fokus.
                </Text>
              </div>
            </Flex>

            <Flex gap={10} wrap="wrap" justify="flex-end">
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownloadTemplate}
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
                      <BookUser size={16} />
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

export default HalaqohImportDrawer;
