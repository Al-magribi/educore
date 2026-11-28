import * as XLSX from "xlsx";

export const normalizeText = (value) =>
  `${value ?? ""}`
    .replace(/\u00a0/g, " ")
    .replace(/[\u200b-\u200d\uFEFF]/g, "")
    .replace(/^'(?=\S)/, "")
    .trim();
export const normalizeKey = (value) =>
  normalizeText(value).toLowerCase().replace(/\s+/g, " ");

export const parseBooleanValue = (value, defaultValue = true) => {
  if (value === undefined || value === null || `${value}`.trim() === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = normalizeKey(value);
  if (["true", "1", "ya", "yes", "aktif", "active", "on"].includes(normalized)) {
    return true;
  }
  if (["false", "0", "tidak", "no", "nonaktif", "inactive", "off"].includes(normalized)) {
    return false;
  }

  return defaultValue;
};

export const normalizeGenderValue = (value) => {
  const normalized = normalizeKey(value);
  if (!normalized) return "";
  if (["l", "lk", "laki", "laki-laki", "male"].includes(normalized)) return "L";
  if (["p", "pr", "perempuan", "female"].includes(normalized)) return "P";
  return normalizeText(value).toUpperCase();
};

export const parseDelimitedValues = (value) =>
  normalizeText(value)
    .split(/[\n,;]+/)
    .map((item) => normalizeText(item))
    .filter(Boolean);

const setColumnWidths = (worksheet, widths) => {
  worksheet["!cols"] = widths.map((wch) => ({ wch }));
};

const createGuideSheet = (rows) => {
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  setColumnWidths(worksheet, [24, 72]);
  return worksheet;
};

export const downloadMusyrifImportTemplate = () => {
  const workbook = XLSX.utils.book_new();
  const templateSheet = XLSX.utils.json_to_sheet([
    {
      Homebase: "SMP IT Putra",
      "Nama Musyrif": "Ahmad Fauzi",
      Username: "ahmad.fauzi",
      Password: "rahasia123",
      "No HP": "081234567890",
      "L/P": "L",
      "Status Aktif": "Aktif",
      Catatan: "Musyrif halaqoh pagi",
    },
    {
      Homebase: "SMP IT Putri",
      "Nama Musyrif": "Siti Maryam",
      Username: "siti.maryam",
      Password: "rahasia123",
      "No HP": "081298765432",
      "L/P": "P",
      "Status Aktif": "Aktif",
      Catatan: "",
    },
  ]);
  setColumnWidths(templateSheet, [24, 28, 24, 20, 18, 10, 16, 28]);

  const guideSheet = createGuideSheet([
    ["Kolom", "Keterangan"],
    ["Homebase", "Wajib untuk admin lintas homebase. Jika akun Anda hanya 1 homebase, kolom boleh dikosongkan."],
    ["Nama Musyrif", "Wajib diisi dengan nama lengkap musyrif."],
    ["Username", "Wajib, unik, hanya huruf/angka/titik/underscore/dash."],
    ["Password", "Wajib, minimal 6 karakter sesuai standar akun login."],
    ["No HP", "Opsional."],
    ["L/P", "Isi dengan L atau P."],
    ["Status Aktif", "Opsional. Gunakan Aktif/Nonaktif atau TRUE/FALSE."],
    ["Catatan", "Opsional untuk informasi tambahan."],
    ["Catatan Import", "Baris dibaca dari sheet pertama. Jangan ubah nama header agar auto-mapping bekerja baik."],
  ]);

  XLSX.utils.book_append_sheet(workbook, templateSheet, "Template");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Panduan");
  XLSX.writeFile(workbook, "Template_Import_Musyrif.xlsx");
};

export const downloadHalaqohImportTemplate = (reference = {}) => {
  const workbook = XLSX.utils.book_new();
  const templateSheet = XLSX.utils.json_to_sheet([
    {
      Satuan: "SMP IT Putra",
      Periode: "Tahun Ajaran 2026/2027",
      "Nama Halaqoh": "Halaqoh Al-Fatih",
      "Username Musyrif": "ahmad.fauzi",
      "Daftar NIS Siswa": "24001, 24002, 24003",
      "Status Aktif": "Aktif",
    },
    {
      Satuan: "SMP IT Putri",
      Periode: "Tahun Ajaran 2026/2027",
      "Nama Halaqoh": "Halaqoh An-Naba",
      "Username Musyrif": "siti.maryam",
      "Daftar NIS Siswa": "24011; 24012; 24013",
      "Status Aktif": "Aktif",
    },
  ]);
  setColumnWidths(templateSheet, [24, 28, 28, 24, 38, 16]);

  const guideSheet = createGuideSheet([
    ["Kolom", "Keterangan"],
    ["Satuan", "Sangat disarankan untuk admin lintas homebase. Isi dengan nama satuan sesuai sheet referensi agar mapping lebih presisi."],
    ["Periode", "Wajib. Gunakan nama periode yang tersedia pada sheet referensi. Pencocokan dilakukan lintas satuan."],
    ["Nama Halaqoh", "Wajib. Sebaiknya unik per periode."],
    ["Username Musyrif", "Wajib. Gunakan username login musyrif agar mapping lebih akurat."],
    ["Daftar NIS Siswa", "Opsional. Pisahkan beberapa NIS dengan koma, titik koma, atau baris baru."],
    ["Status Aktif", "Opsional. Gunakan Aktif/Nonaktif atau TRUE/FALSE."],
    ["Referensi Sheet", "Gunakan sheet Periode Aktif, Referensi Musyrif, dan Referensi Siswa untuk melihat data per satuan."],
    ["Catatan Import", "Baris dibaca dari sheet pertama. Filter satuan di halaman hanya memengaruhi tabel, bukan pembacaan file import."],
  ]);

  const activePeriodeSheet = XLSX.utils.json_to_sheet(
    ((reference.active_periodes || []).length
      ? reference.active_periodes
      : [{ homebase_name: "-", homebase_id: "-", periode_name: "-", periode_id: "-", is_active: false }]
    ).map((item) => ({
      "Nama Satuan": item.homebase_name || "-",
      "ID Satuan": item.homebase_id || "-",
      "Periode Aktif": item.periode_name || "-",
      "ID Periode": item.periode_id || "-",
      Status: item.is_active ? "Aktif" : "Tidak Aktif",
    })),
  );
  setColumnWidths(activePeriodeSheet, [24, 14, 28, 14, 14]);

  const musyrifSheet = XLSX.utils.json_to_sheet(
    ((reference.musyrif || []).length
      ? reference.musyrif
      : [{ homebase_name: "-", homebase_id: "-", username: "-", full_name: "-", is_active: false }]
    ).map((item) => ({
      "Nama Satuan": item.homebase_name || "-",
      "ID Satuan": item.homebase_id || "-",
      Username: item.username || "-",
      "Nama Musyrif": item.full_name || "-",
      Status: item.is_active ? "Aktif" : "Nonaktif",
    })),
  );
  setColumnWidths(musyrifSheet, [24, 14, 24, 28, 14]);

  const studentSheet = XLSX.utils.json_to_sheet(
    ((reference.students || []).length
      ? reference.students
      : [{ homebase_name: "-", active_periode_name: "-", nis: "-", full_name: "-", class_name: "-" }]
    ).map((item) => ({
      "Nama Satuan": item.homebase_name || "-",
      "ID Satuan": item.homebase_id || "-",
      "Periode Aktif": item.active_periode_name || "-",
      NIS: item.nis || "-",
      "Nama Siswa": item.full_name || "-",
      Kelas: item.class_name || "-",
    })),
  );
  setColumnWidths(studentSheet, [24, 14, 28, 16, 28, 24]);

  XLSX.utils.book_append_sheet(workbook, templateSheet, "Template");
  XLSX.utils.book_append_sheet(workbook, guideSheet, "Panduan");
  XLSX.utils.book_append_sheet(workbook, activePeriodeSheet, "Periode Aktif");
  XLSX.utils.book_append_sheet(workbook, musyrifSheet, "Referensi Musyrif");
  XLSX.utils.book_append_sheet(workbook, studentSheet, "Referensi Siswa");
  XLSX.writeFile(workbook, "Template_Import_Halaqoh.xlsx");
};
