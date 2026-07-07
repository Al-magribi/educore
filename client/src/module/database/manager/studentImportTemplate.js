import * as XLSX from "xlsx";

const normalizeText = (value) => value?.toString().trim() || "";

const formatDateValue = (value) => {
  if (!value) return "";
  if (typeof value === "string" && value.includes("T")) {
    return value.split("T")[0];
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return normalizeText(value);
  return date.toISOString().split("T")[0];
};

const formatSiblingsForExcel = (siblings = []) => {
  if (!Array.isArray(siblings) || siblings.length === 0) return "";

  return siblings
    .filter((item) => normalizeText(item?.name))
    .map((item) =>
      [
        normalizeText(item.name),
        normalizeText(item.gender),
        formatDateValue(item.birth_date),
      ].join("|"),
    )
    .join(";;");
};

const buildStudentRow = (student = {}) => ({
  NIS: normalizeText(student.nis),
  NISN: normalizeText(student.nisn),
  "Nama Lengkap": normalizeText(student.full_name),
  "Jenis Kelamin": normalizeText(student.gender),
  Tingkat: normalizeText(student.grade_name),
  Kelas: normalizeText(student.class_name),
  "Tempat Lahir": normalizeText(student.birth_place),
  "Tanggal Lahir": formatDateValue(student.birth_date),
  Tinggi: normalizeText(student.height),
  Berat: normalizeText(student.weight),
  Kepala: normalizeText(student.head_circumference),
  "Anak Ke": student.order_number ?? "",
  "Jumlah Saudara": student.siblings_count ?? "",
  "Kode Pos": normalizeText(student.postal_code),
  "Alamat Lengkap": normalizeText(student.address),
  "Nama Ayah": normalizeText(student.father_name),
  "NIK Ayah": normalizeText(student.father_nik),
  "Tempat Lahir Ayah": normalizeText(student.father_birth_place),
  "Tanggal Lahir Ayah": formatDateValue(student.father_birth_date),
  "No Tlp Ayah": normalizeText(student.father_phone),
  "Nama Ibu": normalizeText(student.mother_name),
  "NIK Ibu": normalizeText(student.mother_nik),
  "Tempat Lahir Ibu": normalizeText(student.mother_birth_place),
  "Tanggal Lahir Ibu": formatDateValue(student.mother_birth_date),
  "No Tlp Ibu": normalizeText(student.mother_phone),
  "Data Saudara": formatSiblingsForExcel(student.siblings),
});

export const exportStudentsToExcel = ({ students = [], fileName }) => {
  const rows = students.map((item) => buildStudentRow(item));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Database Siswa");
  XLSX.writeFile(
    workbook,
    fileName || `Export_Database_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};
