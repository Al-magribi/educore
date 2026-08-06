import * as XLSX from "xlsx";

const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

const HEADERS = [
  "No",
  "Nama",
  "Jabatan",
  "Mata Pelajaran",
  "Jmlh Jam",
  "Rp/Jam",
  "Transport",
  "Gapok",
  "Jmlh Hadir",
  "Honor Mengajar",
  "Jumlah Transport",
  "Tunj. Wali Kelas",
  "Tunj. Jabatan",
  "Total Penerimaan",
  "Catatan",
];

const emptyRow = () => HEADERS.map(() => "");

const money = (value) => Number(value || 0);

/**
 * Build & download honorarium payroll workbook (slip-like layout).
 * @param {object} detail - payroll detail from GET /honorarium/payrolls/:id
 * @param {object} [options]
 * @param {string} [options.homebaseName]
 */
export const exportHonorPayrollExcel = (detail, options = {}) => {
  if (!detail?.id) {
    throw new Error("Data payroll tidak tersedia");
  }

  const monthName = MONTH_NAMES[(Number(detail.month) || 1) - 1] || detail.month;
  const homebaseName =
    options.homebaseName || detail.homebase_name || "Satuan Pendidikan";
  const jamModeLabel =
    detail.jam_mode === "hidup" ? "Jam Hidup (bulanan)" : "Jam Mati (mingguan)";
  const statusLabel = detail.status === "locked" ? "LOCKED" : "DRAFT";

  const formatDate = (value) => {
    if (!value) {
      return "-";
    }
    if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
      const [y, m, d] = value.split("-");
      return `${d}/${m}/${y}`;
    }
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return String(value);
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${d}/${m}/${y}`;
  };

  const sheetRows = [
    [
      `Daftar Gaji Guru Staf Dan Karyawan Bulan ${monthName} ${detail.year} — ${homebaseName}`,
    ],
    [
      `Periode: ${detail.periode_name || "-"} | Mode: ${jamModeLabel} | Status: ${statusLabel} | ${formatDate(detail.start_date)} s/d ${formatDate(detail.end_date)}`,
    ],
    emptyRow(),
    HEADERS,
  ];

  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: HEADERS.length - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: HEADERS.length - 1 } },
  ];

  for (const unit of detail.units || []) {
    const unitRow = emptyRow();
    unitRow[0] = String(unit.unit_name || "UNIT").toUpperCase();
    sheetRows.push(unitRow);
    merges.push({
      s: { r: sheetRows.length - 1, c: 0 },
      e: { r: sheetRows.length - 1, c: HEADERS.length - 1 },
    });

    for (const line of unit.lines || []) {
      sheetRows.push([
        line.no || "",
        line.person_name || "",
        line.position_name || "",
        line.subjects_text || "",
        money(line.jam_final),
        money(line.rp_per_jam),
        money(line.transport_rate),
        money(line.gapok),
        money(line.hadir_final),
        money(line.honor_mengajar),
        money(line.jumlah_transport),
        money(line.tunjangan_wali_kelas),
        money(line.tunjangan_jabatan),
        money(line.total_penerimaan),
        line.notes || "",
      ]);
    }

    const subtotalRow = emptyRow();
    subtotalRow[0] = `Subtotal ${unit.unit_name || ""}`;
    subtotalRow[13] = money(unit.subtotal);
    sheetRows.push(subtotalRow);
    sheetRows.push(emptyRow());
  }

  const totalRow = emptyRow();
  totalRow[0] = "TOTAL";
  totalRow[13] = money(detail.summary?.grand_total ?? detail.grand_total);
  sheetRows.push(totalRow);

  sheetRows.push(emptyRow());
  sheetRows.push([
    `Diekspor dari EduCore Honorarium · Rate Rp/Jam ${money(detail.teaching_rate)} · Transport ${money(detail.transport_rate)} · Wali Kelas ${money(detail.homeroom_rate)}`,
  ]);
  merges.push({
    s: { r: sheetRows.length - 1, c: 0 },
    e: { r: sheetRows.length - 1, c: HEADERS.length - 1 },
  });

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
  worksheet["!merges"] = merges;
  worksheet["!cols"] = [
    { wch: 5 },
    { wch: 28 },
    { wch: 18 },
    { wch: 28 },
    { wch: 10 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 16 },
    { wch: 24 },
  ];

  const workbook = XLSX.utils.book_new();
  const sheetName = `${monthName} ${detail.year}`.slice(0, 31);
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  const safeHomebase = String(homebaseName)
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 40);
  const filename = `Honorarium_${safeHomebase || "Satuan"}_${detail.year}-${String(detail.month).padStart(2, "0")}.xlsx`;

  XLSX.writeFile(workbook, filename);
  return filename;
};
