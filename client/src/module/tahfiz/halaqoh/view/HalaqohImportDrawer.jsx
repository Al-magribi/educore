import { useMemo, useState } from "react";
import {
  Alert,
  App,
  Button,
  Collapse,
  Flex,
  Select,
  Table,
  Tooltip,
  Typography,
} from "antd";
import { AlertTriangle, CheckCircle2, Download, Info, Trash2, UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import { CardTitle, MuseCard } from "../../../../components/ui/muse";
import { ImportDrawer, ImportStats, UploadDropzone } from "../../../../components/ui/muse/ImportKit";
import { museCardStyle, museColors } from "../../../../config/theme";
import { useImportHalaqohMutation } from "../../../../service/tahfiz/ApiHalaqoh";
import {
  downloadHalaqohImportTemplate,
  normalizeKey,
  normalizeText,
  parseBooleanValue,
  parseDelimitedValues,
} from "./importHelpers";

const { Text } = Typography;

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
  const { message } = App.useApp();
  const [tableData, setTableData] = useState([]);
  const [fileList, setFileList] = useState([]);
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
    totalData === 0 ? "Menunggu file" : errorCount === 0 ? "Siap diimpor" : "Perlu ditinjau";
  const readinessColor = totalData === 0 ? "processing" : errorCount === 0 ? "success" : "warning";
  const handleDownloadTemplate = () => {
    downloadHalaqohImportTemplate(importReference);
  };

  const resetFile = () => {
    setTableData([]);
    setFileList([]);
  };

  const columns = [
    {
      title: "STATUS",
      key: "status",
      width: 90,
      align: "center",
      fixed: "left",
      render: (_, record) =>
        record.errors.length === 0 ? (
          <Tooltip title='Siap diimpor'>
            <CheckCircle2 size={18} color={museColors.success} aria-label='Valid' />
          </Tooltip>
        ) : (
          <Tooltip title={record.errors.join(", ")}>
            <AlertTriangle size={18} color={museColors.danger} aria-label='Perlu dicek' />
          </Tooltip>
        ),
    },
    {
      title: "PERIODE FILE",
      dataIndex: "periode_name",
      width: 200,
      render: (value) => <Text type='secondary'>{value || "-"}</Text>,
    },
    {
      title: "PERIODE SISTEM",
      dataIndex: "selectedPeriodeId",
      width: 220,
      render: (value, record) => (
        <Select
          showSearch
          optionFilterProp='label'
          virtual={false}
          value={value}
          options={periodeOptions}
          onChange={(nextValue) => handlePeriodeChange(nextValue, record.key)}
          placeholder='Pilih periode'
          status={!value ? "error" : ""}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "NAMA HALAQOH",
      dataIndex: "name",
      width: 220,
      render: (value) => <Text strong>{value || "-"}</Text>,
    },
    {
      title: "MUSYRIF FILE",
      dataIndex: "musyrif_identifier",
      width: 200,
      render: (value) => <Text type='secondary'>{value || "-"}</Text>,
    },
    {
      title: "MUSYRIF SISTEM",
      dataIndex: "selectedMusyrifId",
      width: 240,
      render: (value, record) => (
        <Select
          showSearch
          optionFilterProp='label'
          virtual={false}
          value={value}
          options={musyrifOptions}
          onChange={(nextValue) => handleMusyrifChange(nextValue, record.key)}
          placeholder='Pilih musyrif'
          status={!value ? "error" : ""}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "SISWA COCOK",
      dataIndex: "student_ids",
      width: 130,
      align: "center",
      render: (value) => value.length,
    },
    {
      title: "AKSI",
      key: "action",
      width: 70,
      align: "center",
      render: (_, record) => (
        <Tooltip title='Hapus baris'>
          <Button
            type='text'
            danger
            aria-label='Hapus baris'
            icon={<Trash2 size={16} />}
            onClick={() => handleDeleteRow(record.key)}
          />
        </Tooltip>
      ),
    },
  ];

  const defaultPeriodeLabel = periodeOptions.find(
    (item) => item.value === selectedPeriodeId,
  )?.label;

  return (
    <ImportDrawer
      open={open}
      onClose={closeAndReset}
      icon={<UploadCloud size={16} />}
      title='Import Data Halaqoh'
      description='Unggah Excel, cocokkan periode, musyrif, dan NIS siswa, lalu impor.'
      status={readinessLabel}
      statusColor={readinessColor}
      width={1160}
      actions={
        <>
          <Button icon={<Download size={16} />} onClick={handleDownloadTemplate}>
            Template
          </Button>
          <Button
            type='primary'
            onClick={handleImport}
            loading={isImporting}
            disabled={validCount === 0}
          >
            Impor {validCount > 0 ? `(${validCount})` : ""}
          </Button>
        </>
      }
    >
      {totalData > 0 ? (
        <ImportStats
          items={[
            { label: "Total", value: totalData },
            { label: "Valid", value: validCount, color: museColors.success },
            { label: "Perlu cek", value: errorCount, color: museColors.danger },
          ]}
        />
      ) : null}

      <Collapse
        size='small'
        defaultActiveKey={totalData === 0 ? ["guide"] : []}
        style={{ background: museCardStyle.background }}
        items={[
          {
            key: "guide",
            label: (
              <Flex align='center' gap={8}>
                <Info size={14} />
                <span>Panduan pengisian Excel</span>
              </Flex>
            ),
            children: (
              <Alert
                type='info'
                showIcon
                title='Aturan pengisian import halaqoh'
                description={
                  <ul style={{ paddingLeft: 18, margin: 0 }}>
                    <li>
                      Tulis nama periode sesuai yang tersedia
                      {defaultPeriodeLabel ? ` (default: ${defaultPeriodeLabel})` : ""}.
                    </li>
                    <li>
                      Pakai <strong>Username Musyrif</strong> agar pencocokan lebih akurat
                      dibanding nama.
                    </li>
                    <li>Daftar NIS siswa boleh dipisah koma, titik koma, atau baris baru.</li>
                    <li>Baris dengan NIS yang tidak dikenali ditandai perlu dicek.</li>
                    <li>
                      Template resmi menyertakan sheet <strong>Panduan</strong> dan data referensi.
                    </li>
                  </ul>
                }
              />
            ),
          },
        ]}
      />

      {totalData === 0 ? (
        <UploadDropzone
          beforeUpload={handleFile}
          fileList={fileList}
          hint='Sistem membaca periode, musyrif, dan daftar NIS siswa, lalu menampilkan hasil tinjauan sebelum impor.'
          note={`${periodeOptions.length} periode · ${musyrifOptions.length} musyrif · ${studentOptions.length} siswa referensi`}
        />
      ) : (
        <MuseCard
          flush
          title={
            <CardTitle
              title='Tinjau Data Halaqoh'
              description='Pastikan periode, musyrif, dan anggota siswa sudah sesuai.'
            />
          }
          extra={
            <Button type='text' onClick={resetFile}>
              Ganti file
            </Button>
          }
        >
          {errorCount > 0 ? (
            <Alert
              type='warning'
              showIcon
              style={{ margin: "0 24px 16px" }}
              title={`Ada ${errorCount} baris yang perlu diperiksa.`}
              description='Periksa periode, musyrif, atau NIS siswa yang belum dikenali.'
            />
          ) : null}

          <Table
            dataSource={tableData}
            columns={columns}
            rowKey='key'
            pagination={false}
            size='small'
            expandable={{
              expandedRowRender: (record) => (
                <Flex vertical gap={4}>
                  <Text>NIS dari file: {record.student_identifier_text || "-"}</Text>
                  <Text>Jumlah siswa cocok: {record.student_ids.length}</Text>
                  <Text>Status aktif: {record.is_active ? "Aktif" : "Nonaktif"}</Text>
                  {record.unresolved_students.length ? (
                    <Text type='danger'>
                      NIS belum dikenali: {record.unresolved_students.join(", ")}
                    </Text>
                  ) : null}
                  {record.errors.length ? (
                    <Text type='danger'>Perlu diperbaiki: {record.errors.join(", ")}</Text>
                  ) : null}
                </Flex>
              ),
            }}
            scroll={{ y: "calc(100vh - 420px)", x: 1320 }}
          />
        </MuseCard>
      )}
    </ImportDrawer>
  );
};

export default HalaqohImportDrawer;
