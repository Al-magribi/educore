// Helper data profil siswa (dipakai komponen database).

export const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
};

export const isFemale = (gender) => gender === "Perempuan" || gender === "P";

export const getPersonalItems = (student = {}) => [
  { label: "Nama Lengkap", value: student.full_name },
  { label: "Jenis Kelamin", value: student.gender },
  { label: "NIS", value: student.nis },
  { label: "NISN", value: student.nisn },
  { label: "Satuan Pendidikan", value: student.education_unit },
  { label: "Tahun Pelajaran", value: student.academic_year },
  { label: "Tingkat", value: student.grade_name },
  { label: "Kelas", value: student.class_name },
  { label: "Tempat Lahir", value: student.birth_place },
  { label: "Tanggal Lahir", value: formatDate(student.birth_date) },
  { label: "Tinggi", value: student.height },
  { label: "Berat", value: student.weight },
  { label: "Lingkar Kepala", value: student.head_circumference },
  { label: "Anak Ke-", value: student.order_number },
  { label: "Jumlah Saudara", value: student.siblings_count },
  { label: "Provinsi", value: student.province },
  { label: "Kota / Kabupaten", value: student.city },
  { label: "Kecamatan", value: student.district },
  { label: "Desa / Kelurahan", value: student.village },
  { label: "Kode Pos", value: student.postal_code },
  { label: "Alamat Lengkap", value: student.address, wide: true },
];

export const getFatherItems = (student = {}) => [
  { label: "Nama Ayah", value: student.father_name },
  { label: "NIK Ayah", value: student.father_nik },
  { label: "Tempat Lahir", value: student.father_birth_place },
  { label: "Tanggal Lahir", value: formatDate(student.father_birth_date) },
  { label: "No. Telepon", value: student.father_phone },
];

export const getMotherItems = (student = {}) => [
  { label: "Nama Ibu", value: student.mother_name },
  { label: "NIK Ibu", value: student.mother_nik },
  { label: "Tempat Lahir", value: student.mother_birth_place },
  { label: "Tanggal Lahir", value: formatDate(student.mother_birth_date) },
  { label: "No. Telepon", value: student.mother_phone },
];

