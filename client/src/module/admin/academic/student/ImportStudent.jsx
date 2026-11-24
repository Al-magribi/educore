import React, { useEffect, useMemo, useState } from "react";
import { Alert, Button, Collapse, Space, Table, Tag, Tooltip, message } from "antd";
import {
  CheckCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  InfoCircleOutlined,
  MinusCircleOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { UploadCloud } from "lucide-react";
import * as XLSX from "xlsx";
import {
  useLazyExportStudentsQuery,
  useImportStudentsMutation,
} from "../../../../service/academic/ApiStudent";
import {
  downloadStudentExcel,
  STUDENT_SHEET_NAME,
} from "./studentImportTemplate";
import { CardTitle, MuseCard } from "../../../../components/ui/muse";
import { ImportDrawer, ImportStats, UploadDropzone } from "../../../../components/ui/muse/ImportKit";
import { museColors } from "../../../../config/theme";

const normalizeText = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return `${value}`.trim();
};

const normalizeKey = (value) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, " ");

const pickValue = (row, keys) => {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && `${row[key]}`.trim() !== "") {
      return row[key];
    }
  }
  return "";
};

const buildClassLookup = (classes = []) => {
  const byGradeAndName = new Map();
  const byName = new Map();

  classes.forEach((item) => {
    const tingkat = normalizeKey(item.tingkat || item.grade_name);
    const kelas = normalizeKey(item.kelas || item.class_name || item.name);
    if (!kelas) return;

    byGradeAndName.set(`${tingkat}||${kelas}`, item);
    if (!byName.has(kelas)) byName.set(kelas, []);
    byName.get(kelas).push(item);
  });

  return { byGradeAndName, byName };
};

const resolveClass = (lookup, tingkat, kelas) => {
  const classKey = normalizeKey(kelas);
  const gradeKey = normalizeKey(tingkat);
  if (!classKey) return null;

  if (gradeKey) {
    const exact = lookup.byGradeAndName.get(`${gradeKey}||${classKey}`);
    if (exact) return exact;
  }

  const matches = lookup.byName.get(classKey) || [];
  return matches.length === 1 ? matches[0] : null;
};

const buildRow = ({ row, index, classLookup, currentByNis }) => {
  const nis = normalizeText(pickValue(row, ["NIS", "nis"]));
  const nisn = normalizeText(pickValue(row, ["NISN", "nisn"]));
  const fullName = normalizeText(
    pickValue(row, ["Nama", "Nama Lengkap", "full_name", "name"]),
  );
  const tingkat = normalizeText(
    pickValue(row, ["Tingkat", "Grade", "tingkat", "current_grade"]),
  );
  const kelas = normalizeText(
    pickValue(row, ["Kelas", "Class", "kelas", "current_class"]),
  );
  const rfidNo = normalizeText(
    pickValue(row, ["RFID", "No RFID", "rfid_no", "rfid"]),
  ).toUpperCase();

  const matchedClass = resolveClass(classLookup, tingkat, kelas);
  const current = currentByNis.get(nis);
  const errors = [];

  if (!nis) errors.push("NIS wajib diisi");
  if (!fullName) errors.push("Nama wajib diisi");
  if (!kelas) errors.push("Kelas wajib diisi");
  if (kelas && !matchedClass) {
    errors.push(`Kelas tidak ditemukan: ${tingkat ? `${tingkat} - ${kelas}` : kelas}`);
  }
  if (nis && !current) errors.push("Siswa tidak ditemukan");

  const changes = [];
  if (current && errors.length === 0) {
    if (normalizeKey(current.full_name) !== normalizeKey(fullName)) changes.push("Nama");
    if (normalizeText(current.nisn) !== nisn) changes.push("NISN");
    if (normalizeKey(current.tingkat) !== normalizeKey(tingkat) ||
      normalizeKey(current.kelas) !== normalizeKey(kelas)) {
      changes.push("Kelas");
    }
    if (normalizeText(current.rfid_no).toUpperCase() !== rfidNo) changes.push("RFID");
  }

  return {
    key: index,
    nis,
    nisn,
    full_name: fullName,
    tingkat,
    kelas,
    rfid_no: rfidNo,
    errors,
    changes,
    isValid: errors.length === 0,
    willUpdate: errors.length === 0 && changes.length > 0,
    unchanged: errors.length === 0 && changes.length === 0,
  };
};

const ImportStudent = ({ open, onClose, onFinish }) => {
  const [tableData, setTableData] = useState([]);
  const [fileList, setFileList] = useState([]);
  const [classRefs, setClassRefs] = useState([]);
  const [currentByNis, setCurrentByNis] = useState(new Map());
  const [refsReady, setRefsReady] = useState(false);
  const [fetchExport, { isFetching: isDownloading }] = useLazyExportStudentsQuery();
  const [importStudents, { isLoading: isUploading }] = useImportStudentsMutation();

  useEffect(() => {
    if (!open) {
      setTableData([]);
      setFileList([]);
      setRefsReady(false);
      return undefined;
    }

    let cancelled = false;
    setRefsReady(false);
    fetchExport()
      .unwrap()
      .then((result) => {
        if (cancelled) return;
        const students = result?.data || [];
        setCurrentByNis(
          new Map(students.map((item) => [normalizeText(item.nis), item])),
        );
        setClassRefs(result?.classes || []);
        setRefsReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          message.error("Gagal memuat data siswa periode aktif.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [open, fetchExport]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!tableData.length || !refsReady) return;
    setTableData((prev) =>
      prev.map((item) =>
        buildRow({
          row: item,
          index: item.key,
          classLookup: buildClassLookup(classRefs),
          currentByNis,
        }),
      ),
    );
  }, [classRefs, currentByNis, refsReady, tableData.length]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDownload = async () => {
    try {
      const result = await fetchExport().unwrap();
      const students = result?.data || [];
      const classes = result?.classes || [];
      setClassRefs(classes);
      setCurrentByNis(
        new Map(students.map((item) => [normalizeText(item.nis), item])),
      );
      downloadStudentExcel({ students, classes });
      message.success(
        students.length > 0
          ? `File berisi ${students.length} data siswa periode aktif siap diedit.`
          : "Template berhasil diunduh. Belum ada data siswa di periode aktif.",
      );
    } catch (error) {
      message.error(error?.data?.message || "Gagal mengunduh data siswa.");
    }
  };

  const handleFile = (file) => {
    if (!refsReady) {
      message.error("Data referensi periode aktif belum siap. Coba beberapa saat lagi.");
      return false;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames.includes(STUDENT_SHEET_NAME)
          ? STUDENT_SHEET_NAME
          : workbook.SheetNames[0];
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
          raw: false,
          defval: "",
        });
        const classLookup = buildClassLookup(classRefs);
        const formattedData = jsonData.map((row, index) =>
          buildRow({
            row,
            index,
            classLookup,
            currentByNis,
          }),
        );
        setTableData(formattedData);
        setFileList([{ uid: file.uid, name: file.name, status: "done" }]);
        message.success(`Berhasil memuat ${formattedData.length} baris data.`);
      } catch (error) {
        console.error(error);
        message.error("Gagal memproses file. Pastikan format Excel sesuai template.");
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
      return message.error("Tidak ada data valid untuk diimpor.");
    }

    try {
      const result = await importStudents({
        students: validData.map((item) => ({
          nis: item.nis,
          nisn: item.nisn,
          full_name: item.full_name,
          tingkat: item.tingkat,
          kelas: item.kelas,
          rfid_no: item.rfid_no,
        })),
      }).unwrap();

      const summary = result?.summary || {};
      message.success(
        result?.message ||
          `Import selesai. ${summary.updated || 0} diperbarui, ${summary.unchanged || 0} tidak berubah.`,
      );
      setTableData([]);
      setFileList([]);
      onClose();
      if (onFinish) onFinish();
    } catch (error) {
      message.error(error?.data?.message || "Gagal mengimpor data siswa.");
    }
  };

  const summary = useMemo(() => {
    const totalData = tableData.length;
    const validCount = tableData.filter((item) => item.isValid).length;
    const updateCount = tableData.filter((item) => item.willUpdate).length;
    const unchangedCount = tableData.filter((item) => item.unchanged).length;
    const errorCount = totalData - validCount;
    return { totalData, validCount, updateCount, unchangedCount, errorCount };
  }, [tableData]);

  const columns = [
    { title: "NIS", dataIndex: "nis", width: 140 },
    { title: "NISN", dataIndex: "nisn", width: 150 },
    { title: "Nama", dataIndex: "full_name", width: 220 },
    { title: "Tingkat", dataIndex: "tingkat", width: 110 },
    { title: "Kelas", dataIndex: "kelas", width: 160 },
    { title: "RFID", dataIndex: "rfid_no", width: 160 },
    {
      title: "Status",
      key: "status",
      width: 120,
      align: "center",
      render: (_, record) => {
        if (!record.isValid) {
          return (
            <Tooltip title={record.errors.join(", ")}>
              <Tag color="error" style={{ margin: 0 }}>
                <WarningOutlined /> Error
              </Tag>
            </Tooltip>
          );
        }
        if (record.unchanged) {
          return (
            <Tooltip title="Data sama, tidak akan diperbarui">
              <Tag style={{ margin: 0 }}>
                <MinusCircleOutlined /> Sama
              </Tag>
            </Tooltip>
          );
        }
        return (
          <Tooltip title={`Akan diperbarui: ${record.changes.join(", ")}`}>
            <Tag color="success" style={{ margin: 0 }}>
              <CheckCircleOutlined /> Update
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "Aksi",
      key: "action",
      width: 70,
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

  const statusLabel =
    summary.totalData === 0 ? "Menunggu file" : summary.errorCount > 0 ? "Perlu review" : "Siap impor";

  return (
    <ImportDrawer
      open={open}
      onClose={onClose}
      icon={<UploadCloud size={16} />}
      title="Import Pembaruan Data Siswa"
      description="Unggah Excel hasil unduhan. Hanya baris yang berbeda yang diperbarui pada periode aktif."
      status={statusLabel}
      statusColor={summary.errorCount > 0 ? "warning" : summary.totalData > 0 ? "success" : "processing"}
      actions={
        <>
          <Button icon={<DownloadOutlined />} onClick={handleDownload} loading={isDownloading}>
            Download
          </Button>
          <Button
            onClick={handleUploadSubmit}
            type="primary"
            loading={isUploading}
            disabled={summary.validCount === 0}
          >
            Impor {summary.updateCount > 0 ? `(${summary.updateCount})` : ""}
          </Button>
        </>
      }
    >
      {summary.totalData > 0 && (
        <ImportStats
          items={[
            { label: "Total", value: summary.totalData },
            { label: "Akan update", value: summary.updateCount, color: museColors.success },
            { label: "Tidak berubah", value: summary.unchangedCount, color: museColors.muted },
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
                <span>Panduan export & import Excel</span>
              </Space>
            ),
            children: (
              <Alert
                title="Aturan pengisian data"
                description={
                  <div>
                    <ol style={{ paddingLeft: 20, margin: "0 0 10px" }}>
                      <li>
                        Klik <strong>Download</strong> untuk mengunduh data siswa periode aktif: NIS,
                        NISN, Nama, Tingkat, Kelas, RFID.
                      </li>
                      <li>
                        Edit sheet <strong>Data Siswa</strong> saja. Jangan ubah nama kolom.
                      </li>
                      <li>
                        Cocokkan <strong>Tingkat</strong> dan <strong>Kelas</strong> dengan sheet{" "}
                        <strong>Referensi Kelas</strong>.
                      </li>
                      <li>
                        Unggah file, tinjau status baris, lalu klik <strong>Impor</strong>.
                      </li>
                    </ol>
                    <ul style={{ paddingLeft: 20, margin: 0 }}>
                      <li>
                        <strong>NIS</strong> dipakai sebagai kunci pencarian siswa.
                      </li>
                      <li>Jika data berbeda, baris diperbarui. Jika sama, dilewati.</li>
                      <li>
                        Import tidak menambah siswa baru. NIS yang tidak ditemukan ditandai error.
                      </li>
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
          disabled={!refsReady}
          hint={
            refsReady
              ? "Gunakan file hasil download data siswa periode aktif."
              : "Menunggu data siswa dan referensi kelas periode aktif..."
          }
          note="Update hanya jika data berbeda"
        />
      ) : (
        <MuseCard
          flush
          title={<CardTitle title="Review Perubahan" description="Tinjau status tiap baris sebelum impor." />}
        >
          {summary.errorCount > 0 && (
            <Alert
              title={`Ada ${summary.errorCount} baris belum valid.`}
              description="Periksa NIS, nama, atau kecocokan tingkat/kelas."
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
            scroll={{ x: 1100, y: "calc(100vh - 420px)" }}
          />
        </MuseCard>
      )}
    </ImportDrawer>
  );
};

export default ImportStudent;
