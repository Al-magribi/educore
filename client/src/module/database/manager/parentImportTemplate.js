import * as XLSX from "xlsx";

const normalizeText = (value) => value?.toString().trim() || "";

export const buildParentStudentExample = () => "10001|10002";

export const downloadParentTemplate = ({ students = [] }) => {
  const templateSheet = XLSX.utils.json_to_sheet([
    {
      Username: "ortu.ahmad",
      Password: "123456",
      "Nama Lengkap": "Bapak Ahmad",
      "No. Telepon": "081234567890",
      Email: "ortu.ahmad@demo.sch.id",
      "NIS Siswa": buildParentStudentExample(),
    },
  ]);

  const studentSheet = XLSX.utils.json_to_sheet(
    students.map((item) => ({
      NIS: normalizeText(item.nis),
      "Nama Siswa": normalizeText(item.full_name),
      Tingkat: normalizeText(item.grade_name),
      Kelas: normalizeText(item.class_name),
    })),
  );

  const guideSheet = XLSX.utils.aoa_to_sheet([
    ["Panduan Import Orang Tua"],
    [],
    ["Kolom wajib", "Username, Password, Nama Lengkap, NIS Siswa"],
    ["NIS Siswa", "Boleh lebih dari satu. Pisahkan dengan | atau koma."],
    ["Password", "Jika kosong saat update import, password lama akan dipertahankan."],
    ["No. Telepon", "Opsional, tetapi disarankan diisi."],
    ["Email", "Opsional, tetapi disarankan diisi."],
    ["Sinkronisasi", "Import akan membuat akun baru atau memperbarui akun parent berdasarkan username."],
    ["Referensi", "Gunakan NIS dari sheet Referensi Siswa agar relasi siswa tepat."],
  ]);

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, templateSheet, "Template Orang Tua");
  XLSX.utils.book_append_sheet(workbook, studentSheet, "Referensi Siswa");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Panduan");
  XLSX.writeFile(workbook, "Template_Import_Orang_Tua.xlsx");
};
