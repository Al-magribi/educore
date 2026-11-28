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
import { useImportMusyrifMutation } from "../../../../service/tahfiz/ApiHalaqoh";
import {
  downloadMusyrifImportTemplate,
  normalizeGenderValue,
  normalizeKey,
  normalizeText,
  parseBooleanValue,
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
  const { message } = App.useApp();
  const [tableData, setTableData] = useState([]);
  const [fileList, setFileList] = useState([]);
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
    onClose();
  };

  const selectedHomebaseLabel = homebaseLabelMap.get(selectedHomebaseId);

  const resetFile = () => {
    setTableData([]);
    setFileList([]);
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
    totalData === 0 ? "Menunggu file" : errorCount === 0 ? "Siap diimpor" : "Perlu ditinjau";
  const readinessColor = totalData === 0 ? "processing" : errorCount === 0 ? "success" : "warning";

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
      title: "HOMEBASE FILE",
      dataIndex: "homebase_name",
      width: 180,
      render: (value) => <Text type='secondary'>{value || "-"}</Text>,
    },
    {
      title: "HOMEBASE SISTEM",
      dataIndex: "selectedHomebaseId",
      width: 220,
      render: (value, record) => (
        <Select
          showSearch
          optionFilterProp='label'
          virtual={false}
          value={value}
          options={homebaseOptions}
          onChange={(nextValue) => handleHomebaseChange(nextValue, record.key)}
          placeholder='Pilih homebase'
          status={!value ? "error" : ""}
          style={{ width: "100%" }}
        />
      ),
    },
    {
      title: "NAMA MUSYRIF",
      dataIndex: "full_name",
      width: 220,
      render: (value) => <Text strong>{value || "-"}</Text>,
    },
    { title: "USERNAME", dataIndex: "username", width: 180 },
    { title: "NO HP", dataIndex: "phone", width: 160, render: (value) => value || "-" },
    { title: "L/P", dataIndex: "gender", width: 80, align: "center", render: (value) => value || "-" },
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

  return (
    <ImportDrawer
      open={open}
      onClose={closeAndReset}
      icon={<UploadCloud size={16} />}
      title='Import Data Musyrif'
      description='Unggah Excel, tinjau homebase tiap baris, lalu impor ke sistem.'
      status={readinessLabel}
      statusColor={readinessColor}
      actions={
        <>
          <Button icon={<Download size={16} />} onClick={downloadMusyrifImportTemplate}>
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
                title='Aturan pengisian import musyrif'
                description={
                  <ul style={{ paddingLeft: 18, margin: 0 }}>
                    <li>Isi data di sheet pertama (<strong>Template</strong>).</li>
                    <li>
                      <strong>Username</strong> wajib unik dan dipakai sebagai akun login musyrif.
                    </li>
                    <li>
                      <strong>Password</strong> wajib diisi untuk setiap baris.
                    </li>
                    <li>
                      Isi <strong>L/P</strong> dengan <code>L</code> atau <code>P</code>.
                    </li>
                    <li>
                      Kolom <strong>Homebase</strong> boleh kosong; sistem memakai homebase default
                      {selectedHomebaseLabel ? ` (${selectedHomebaseLabel})` : ""}.
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
          hint='Sistem membaca template musyrif, mencocokkan homebase, lalu menampilkan hasil tinjauan sebelum impor.'
          note={`${homebaseOptions.length} homebase tersedia`}
        />
      ) : (
        <MuseCard
          flush
          title={
            <CardTitle
              title='Tinjau Data Musyrif'
              description='Periksa homebase, username, dan status tiap baris sebelum impor.'
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
              description='Perbaiki homebase atau hapus baris yang tidak ingin diimpor.'
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
                  <Text>Catatan: {record.notes || "-"}</Text>
                  <Text>Status aktif: {record.is_active ? "Aktif" : "Nonaktif"}</Text>
                  {record.errors.length ? (
                    <Text type='danger'>Perlu diperbaiki: {record.errors.join(", ")}</Text>
                  ) : null}
                </Flex>
              ),
            }}
            scroll={{ y: "calc(100vh - 420px)", x: 1200 }}
          />
        </MuseCard>
      )}
    </ImportDrawer>
  );
};

export default MusyrifImportDrawer;
