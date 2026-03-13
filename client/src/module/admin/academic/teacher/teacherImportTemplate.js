import * as XLSX from "xlsx";

const normalizeText = (value) => value?.toString().trim() || "";

export const buildTeacherAllocationExample = () =>
  "MTK:X IPA 1|X IPA 2; BIND:X IPA 1";

export const downloadTeacherTemplate = ({ classes = [], subjects = [] }) => {
  const templateSheet = XLSX.utils.json_to_sheet([
    {
      Username: "ahmad.fauzi",
      Password: "123456",
      "Nama Lengkap": "Ahmad Fauzi, S.Pd",
      "NIP / NIY": "198901012015011001",
      "No. Telepon": "081234567890",
      Email: "ahmad.fauzi@school.sch.id",
      "Wali Kelas": "X IPA 1",
      "Alokasi Mengajar": buildTeacherAllocationExample(),
    },
  ]);

  const subjectSheet = XLSX.utils.json_to_sheet(
    subjects.map((subject) => ({
      Kode: normalizeText(subject.code) || "-",
      Nama: normalizeText(subject.name),
    })),
  );

  const classSheet = XLSX.utils.json_to_sheet(
    classes.map((item) => ({
      Kelas: normalizeText(item.name),
    })),
  );

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ["Panduan Upload Guru"],
    [],
    ["Kolom wajib", "Username, Nama Lengkap"],
    ["Password", "Opsional. Jika kosong akan diisi 123456"],
    ["NIP / NIY", "Opsional, tapi sebaiknya diisi agar mudah sinkronisasi"],
    ["Wali Kelas", "Isi nama kelas persis seperti referensi kelas"],
    [
      "Alokasi Mengajar",
      "Format: KODEMAPEL:KELAS1|KELAS2; KODEMAPEL2:KELAS3",
    ],
    [
      "Catatan Mapel",
      "Gunakan kode mapel dari sheet Referensi Mapel. Jika belum ada kode, nama mapel persis sistem juga didukung.",
    ],
    [
      "Catatan Kelas",
      "Gunakan nama kelas persis seperti sheet Referensi Kelas.",
    ],
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, templateSheet, "Template Guru");
  XLSX.utils.book_append_sheet(workbook, subjectSheet, "Referensi Mapel");
  XLSX.utils.book_append_sheet(workbook, classSheet, "Referensi Kelas");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Panduan");
  XLSX.writeFile(workbook, "Template_Upload_Guru.xlsx");
};
