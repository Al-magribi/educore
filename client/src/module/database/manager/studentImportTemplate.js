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

const compareStudentOrder = (a = {}, b = {}) => {
  const gradeCmp = normalizeText(a.grade_name).localeCompare(
    normalizeText(b.grade_name),
    "id",
    { numeric: true, sensitivity: "base" },
  );
  if (gradeCmp !== 0) return gradeCmp;

  const classCmp = normalizeText(a.class_name).localeCompare(
    normalizeText(b.class_name),
    "id",
    { numeric: true, sensitivity: "base" },
  );
  if (classCmp !== 0) return classCmp;

  return normalizeText(a.full_name).localeCompare(
    normalizeText(b.full_name),
    "id",
    { sensitivity: "base" },
  );
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

const COLUMN_GUIDE_ROWS = [
  ["Panduan Pengisian Export / Import Database Siswa"],
  [],
  [
    "Cara pakai",
    "Edit data di sheet Database Siswa, lalu unggah kembali lewat Import Excel. Jangan ubah nama kolom header.",
  ],
  [
    "Urutan data",
    "Data diurutkan otomatis berdasarkan Tingkat, lalu Kelas, lalu Nama Lengkap.",
  ],
  [
    "Kunci update",
    "Import mencocokkan siswa lewat kolom NIS. Jangan diubah agar data tersimpan ke siswa yang benar.",
  ],
  [],
  ["Kolom", "Wajib / Opsional", "Panduan pengisian"],
  [
    "NIS",
    "Wajib",
    "Nomor Induk Siswa. Dipakai sebagai kunci pencarian saat import. Jangan diubah.",
  ],
  [
    "NISN",
    "Opsional",
    "Nomor Induk Siswa Nasional. Disimpan ke tabel u_students.nisn.",
  ],
  [
    "Nama Lengkap",
    "Opsional",
    "Nama lengkap siswa. Disimpan ke u_users.full_name.",
  ],
  [
    "Jenis Kelamin",
    "Opsional",
    'Isi persis: "Laki-laki" atau "Perempuan". Disimpan ke u_users.gender.',
  ],
  [
    "Tingkat",
    "Referensi saja",
    "Nama tingkat/jenjang dari enrollment aktif. Tidak diubah saat import.",
  ],
  [
    "Kelas",
    "Referensi saja",
    "Nama kelas dari enrollment aktif. Tidak diubah saat import.",
  ],
  [
    "Tempat Lahir",
    "Opsional",
    "Tempat lahir siswa. Disimpan ke u_students.birth_place.",
  ],
  [
    "Tanggal Lahir",
    "Opsional",
    "Format tanggal YYYY-MM-DD (contoh: 2012-08-17). Disimpan ke u_students.birth_date.",
  ],
  [
    "Tinggi",
    "Opsional",
    "Tinggi badan (teks/angka, contoh: 145 atau 145 cm). Disimpan ke u_students.height.",
  ],
  [
    "Berat",
    "Opsional",
    "Berat badan (teks/angka, contoh: 38 atau 38 kg). Disimpan ke u_students.weight.",
  ],
  [
    "Kepala",
    "Opsional",
    "Lingkar kepala. Disimpan ke u_students.head_circumference.",
  ],
  [
    "Anak Ke",
    "Opsional",
    "Angka urutan anak (integer). Disimpan ke u_students.order_number.",
  ],
  [
    "Jumlah Saudara",
    "Opsional",
    "Jumlah saudara (integer). Disimpan ke u_students.siblings_count.",
  ],
  [
    "Kode Pos",
    "Opsional",
    "Kode pos alamat. Disimpan ke u_students.postal_code.",
  ],
  [
    "Alamat Lengkap",
    "Opsional",
    "Alamat lengkap siswa. Disimpan ke u_students.address.",
  ],
  [
    "Nama Ayah",
    "Opsional",
    "Nama ayah. Disimpan ke database.u_student_families.father_name.",
  ],
  [
    "NIK Ayah",
    "Opsional",
    "NIK ayah. Disimpan ke database.u_student_families.father_nik.",
  ],
  [
    "Tempat Lahir Ayah",
    "Opsional",
    "Tempat lahir ayah. Disimpan ke database.u_student_families.father_birth_place.",
  ],
  [
    "Tanggal Lahir Ayah",
    "Opsional",
    "Format YYYY-MM-DD. Disimpan ke database.u_student_families.father_birth_date.",
  ],
  [
    "No Tlp Ayah",
    "Opsional",
    "Nomor telepon ayah. Disimpan ke database.u_student_families.father_phone.",
  ],
  [
    "Nama Ibu",
    "Opsional",
    "Nama ibu. Disimpan ke database.u_student_families.mother_name.",
  ],
  [
    "NIK Ibu",
    "Opsional",
    "NIK ibu. Disimpan ke database.u_student_families.mother_nik.",
  ],
  [
    "Tempat Lahir Ibu",
    "Opsional",
    "Tempat lahir ibu. Disimpan ke database.u_student_families.mother_birth_place.",
  ],
  [
    "Tanggal Lahir Ibu",
    "Opsional",
    "Format YYYY-MM-DD. Disimpan ke database.u_student_families.mother_birth_date.",
  ],
  [
    "No Tlp Ibu",
    "Opsional",
    "Nomor telepon ibu. Disimpan ke database.u_student_families.mother_phone.",
  ],
  [
    "Data Saudara",
    "Opsional",
    'Format: Nama|JenisKelamin|YYYY-MM-DD. Pisahkan saudara dengan ;;. Contoh: Budi|Laki-laki|2010-01-01;;Siti|Perempuan|2014-05-20. Disimpan ke database.u_student_siblings.',
  ],
  [],
  [
    "Catatan import",
    "Saat import, data saudara lama diganti dengan isi kolom Data Saudara. Kosongkan kolom ini jika ingin menghapus semua data saudara.",
  ],
  [
    "Catatan wilayah",
    "Provinsi, kota, kecamatan, dan desa tidak ada di file Excel ini. Isi wilayah melalui form edit di aplikasi.",
  ],
];

export const exportStudentsToExcel = ({ students = [], fileName }) => {
  const sortedStudents = [...students].sort(compareStudentOrder);
  const rows = sortedStudents.map((item) => buildStudentRow(item));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const guideSheet = XLSX.utils.aoa_to_sheet(COLUMN_GUIDE_ROWS);

  guideSheet["!cols"] = [{ wch: 22 }, { wch: 16 }, { wch: 90 }];
  worksheet["!cols"] = Object.keys(rows[0] || buildStudentRow()).map((key) => ({
    wch: Math.max(12, key.length + 2),
  }));

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Database Siswa");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Panduan");
  XLSX.writeFile(
    workbook,
    fileName ||
      `Export_Database_Siswa_${new Date().toISOString().slice(0, 10)}.xlsx`,
  );
};
