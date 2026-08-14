import * as XLSX from "xlsx";

const normalizeText = (value) => {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(Math.trunc(value));
  }
  return `${value}`.trim();
};

export const STUDENT_SHEET_NAME = "Data Siswa";
export const STUDENT_COLUMNS = ["NIS", "NISN", "Nama", "Tingkat", "Kelas", "RFID"];

const EXAMPLE_STUDENT_ROW = {
  NIS: "123456",
  NISN: "0012345678",
  Nama: "Contoh Siswa",
  Tingkat: "X",
  Kelas: "X IPA 1",
  RFID: "RFID-SISWA-0001",
};

const applyTextFormat = (sheet) => {
  Object.keys(sheet).forEach((cell) => {
    if (cell[0] === "!") return;
    const target = sheet[cell];
    if (target.v === undefined || target.v === null) return;
    target.t = "s";
    target.v = String(target.v);
    target.z = "@";
  });
};

export const buildStudentExportRow = (student = {}) => ({
  NIS: normalizeText(student.nis),
  NISN: normalizeText(student.nisn),
  Nama: normalizeText(student.full_name || student.nama),
  Tingkat: normalizeText(student.tingkat || student.current_grade),
  Kelas: normalizeText(student.kelas || student.current_class),
  RFID: normalizeText(student.rfid_no || student.rfid),
});

export const downloadStudentExcel = ({ students = [], classes = [] } = {}) => {
  const hasStudents = Array.isArray(students) && students.length > 0;
  const templateRows = hasStudents
    ? students.map((student) => buildStudentExportRow(student))
    : [EXAMPLE_STUDENT_ROW];

  const templateSheet = XLSX.utils.json_to_sheet(templateRows);
  applyTextFormat(templateSheet);
  templateSheet["!cols"] = STUDENT_COLUMNS.map((key) => ({
    wch: Math.max(16, key.length + 4),
  }));

  const classSheet = XLSX.utils.json_to_sheet(
    (classes || []).map((item) => ({
      Tingkat: normalizeText(item.tingkat || item.grade_name),
      Kelas: normalizeText(item.kelas || item.class_name || item.name),
    })),
  );
  applyTextFormat(classSheet);
  classSheet["!cols"] = [{ wch: 16 }, { wch: 24 }];

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ["Panduan Export / Import Data Siswa"],
    [],
    [
      "Isi sheet",
      hasStudents
        ? "Sheet Data Siswa berisi data aktual periode aktif. Edit lalu unggah kembali untuk memperbarui."
        : "Belum ada data siswa di periode aktif. Ganti baris contoh dengan data aktual.",
    ],
    ["Langkah 1", "Unduh file Excel dari halaman siswa"],
    ["Langkah 2", "Edit data pada sheet Data Siswa (jangan ubah nama kolom)"],
    [
      "Langkah 3",
      "Cocokkan Tingkat dan Kelas dengan sheet Referensi Kelas",
    ],
    ["Langkah 4", "Unggah kembali file, tinjau validasi, lalu klik Impor"],
    [],
    ["Kolom", "NIS, NISN, Nama, Tingkat, Kelas, RFID"],
    ["Kunci update", "NIS dipakai untuk menemukan siswa yang sudah ada"],
    [
      "Tingkat & Kelas",
      "Mengikuti data kelas pada periode akademik yang sedang aktif",
    ],
    [
      "Perilaku update",
      "Jika ada perbedaan data, sistem memperbarui. Jika data sama, baris dilewati.",
    ],
    [
      "Catatan",
      "Import tidak membuat siswa baru. NIS yang tidak ditemukan akan dilaporkan.",
    ],
  ]);
  guideSheet["!cols"] = [{ wch: 18 }, { wch: 96 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, templateSheet, STUDENT_SHEET_NAME);
  XLSX.utils.book_append_sheet(workbook, classSheet, "Referensi Kelas");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Panduan");
  XLSX.writeFile(
    workbook,
    hasStudents ? "Export_Data_Siswa.xlsx" : "Template_Data_Siswa.xlsx",
  );
};
