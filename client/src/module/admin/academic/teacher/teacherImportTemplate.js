import * as XLSX from "xlsx";

const normalizeText = (value) => value?.toString().trim() || "";

export const buildTeacherAllocationExample = () =>
  "MTK:X IPA 1|X IPA 2; BIND:X IPA 1";

export const buildAllocationsInputFromTeacher = (
  allocations = [],
  subjects = [],
) => {
  const subjectById = new Map(
    (subjects || []).map((subject) => [Number(subject.id), subject]),
  );
  const grouped = new Map();

  (allocations || []).forEach((item) => {
    const subject = subjectById.get(Number(item.subject_id));
    const token =
      normalizeText(subject?.code) ||
      normalizeText(subject?.name) ||
      normalizeText(item.subject_name);
    const className = normalizeText(item.class_name);

    if (!token || !className) return;

    if (!grouped.has(token)) grouped.set(token, []);
    const classList = grouped.get(token);
    if (!classList.includes(className)) classList.push(className);
  });

  return [...grouped.entries()]
    .map(([token, classList]) => `${token}:${classList.join("|")}`)
    .join("; ");
};

const EXAMPLE_TEACHER_ROW = {
  Username: "ahmad.fauzi",
  Password: "123456",
  "Nama Lengkap": "Ahmad Fauzi, S.Pd",
  "NIP / NIY": "198901012015011001",
  "No RFID": "RFID-GURU-0001",
  "No. Telepon": "081234567890",
  Email: "ahmad.fauzi@school.sch.id",
  "Wali Kelas": "X IPA 1",
  "Alokasi Mengajar": buildTeacherAllocationExample(),
};

const buildTeacherRow = (teacher = {}, subjects = []) => ({
  Username: normalizeText(teacher.username),
  Password: "",
  "Nama Lengkap": normalizeText(teacher.full_name),
  "NIP / NIY": normalizeText(teacher.nip),
  "No RFID": normalizeText(teacher.rfid_no),
  "No. Telepon": normalizeText(teacher.phone),
  Email: normalizeText(teacher.email),
  "Wali Kelas": normalizeText(teacher.homeroom_class?.name),
  "Alokasi Mengajar": buildAllocationsInputFromTeacher(
    teacher.allocations,
    subjects,
  ),
});

export const downloadTeacherTemplate = ({
  teachers = [],
  classes = [],
  subjects = [],
} = {}) => {
  const hasTeachers = Array.isArray(teachers) && teachers.length > 0;
  const templateRows = hasTeachers
    ? teachers.map((teacher) => buildTeacherRow(teacher, subjects))
    : [EXAMPLE_TEACHER_ROW];

  const templateSheet = XLSX.utils.json_to_sheet(templateRows);

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
    ["Panduan Upload / Update Guru"],
    [],
    [
      "Isi sheet",
      hasTeachers
        ? "Sheet Template Guru berisi data guru yang sudah tersimpan. Edit lalu unggah kembali untuk memperbarui."
        : "Belum ada data guru tersimpan. Sheet Template Guru berisi contoh baris. Ganti dengan data guru aktual.",
    ],
    ["Langkah 1", "Edit data pada sheet Template Guru (jangan ubah nama kolom)"],
    [
      "Langkah 2",
      "Gunakan sheet Referensi Mapel dan Referensi Kelas untuk mencocokkan data",
    ],
    [
      "Langkah 3",
      "Upload kembali file ke sistem, cek baris error, lalu klik Impor",
    ],
    [],
    ["Kolom wajib", "Username, Nama Lengkap"],
    [
      "Username",
      "Kunci update. Jika username sudah ada di homebase ini, data guru akan diperbarui.",
    ],
    [
      "Password",
      "Kosongkan saat update agar password lama tetap. Isi hanya jika ingin mengganti password. Untuk guru baru, jika kosong akan diisi 123456.",
    ],
    ["NIP / NIY", "Opsional, tapi sebaiknya diisi agar mudah sinkronisasi"],
    ["No RFID", "Opsional, untuk sinkronisasi absensi RFID guru"],
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
    [
      "Catatan Update",
      "Import akan membuat guru baru atau memperbarui guru yang sudah ada berdasarkan Username (atau NIP jika username belum cocok).",
    ],
  ]);

  templateSheet["!cols"] = Object.keys(templateRows[0] || EXAMPLE_TEACHER_ROW).map(
    (key) => ({ wch: Math.max(14, key.length + 2) }),
  );
  guideSheet["!cols"] = [{ wch: 18 }, { wch: 96 }];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, templateSheet, "Template Guru");
  XLSX.utils.book_append_sheet(workbook, subjectSheet, "Referensi Mapel");
  XLSX.utils.book_append_sheet(workbook, classSheet, "Referensi Kelas");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Panduan");
  XLSX.writeFile(
    workbook,
    hasTeachers ? "Export_Data_Guru.xlsx" : "Template_Upload_Guru.xlsx",
  );
};
