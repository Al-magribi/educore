import * as XLSX from 'xlsx';
import { formatDateTimeCell } from './reportShared';

const STATUS_LABELS = {
  present: 'Hadir',
  late: 'Telat',
  absent: 'Alpa',
  sick: 'Sakit',
  permit: 'Izin',
  excused: 'Sakit/Izin (lama)',
  incomplete: 'Belum lengkap',
  insufficient_hours: 'Jam kurang',
  not_scheduled: 'Tidak terjadwal',
  pending: 'Belum tap',
};

const CATEGORY_LABELS = {
  hadir: 'Hadir',
  sakit: 'Sakit',
  izin: 'Izin',
  alpa: 'Alpa',
  lainnya: 'Belum tap/lengkap',
};

/**
 * Legacy `excused` rows predate the sick/permit split, so a note containing
 * "sakit" marks them as Sakit and anything else counts as Izin.
 */
const isSickNote = (notes) => /sakit/i.test(String(notes || ''));

/** Maps a raw status to its recap bucket; `null` means the day is not counted. */
export const resolveAttendanceCategory = (row) => {
  switch (row?.attendance_status) {
    case 'present':
    case 'late':
    case 'insufficient_hours':
      return 'hadir';
    case 'sick':
      return 'sakit';
    case 'permit':
      return 'izin';
    case 'excused':
      return isSickNote(row.notes) ? 'sakit' : 'izin';
    case 'absent':
      return 'alpa';
    case 'not_scheduled':
      return null;
    default:
      return 'lainnya';
  }
};

const toPercent = (count, total) => (total ? Math.round((count / total) * 10000) / 100 : 0);

const buildCounts = (rows) => {
  const counts = { hadir: 0, sakit: 0, izin: 0, alpa: 0, lainnya: 0 };
  rows.forEach((row) => {
    const category = resolveAttendanceCategory(row);
    if (category) counts[category] += 1;
  });
  const total = Object.values(counts).reduce((sum, value) => sum + value, 0);
  return {
    Hadir: counts.hadir,
    Sakit: counts.sakit,
    Izin: counts.izin,
    Alpa: counts.alpa,
    'Belum tap/lengkap': counts.lainnya,
    'Total Hari': total,
    '% Hadir': toPercent(counts.hadir, total),
    '% Sakit': toPercent(counts.sakit, total),
    '% Izin': toPercent(counts.izin, total),
    '% Alpa': toPercent(counts.alpa, total),
  };
};

const COUNT_COLUMN_WIDTHS = [8, 8, 8, 8, 17, 11, 9, 9, 9, 9];

const buildRecapSheet = ({ rows, groupKey, identityColumns, sortGroups }) => {
  const groups = new Map();
  rows.forEach((row) => {
    const key = groupKey(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  });

  const ordered = [...groups.values()].sort((a, b) => sortGroups(a[0], b[0]));
  const recapRows = ordered.map((ownRows, index) => {
    const identity = {};
    identityColumns.forEach((column) => {
      identity[column.label] = column.value(ownRows[0]) || '-';
    });
    return { No: index + 1, ...identity, ...buildCounts(ownRows) };
  });

  const totalIdentity = {};
  identityColumns.forEach((column, index) => {
    totalIdentity[column.label] = index === identityColumns.length - 1 ? 'TOTAL' : '';
  });
  recapRows.push({ No: '', ...totalIdentity, ...buildCounts(rows) });

  const sheet = XLSX.utils.json_to_sheet(recapRows);
  XLSX.utils.sheet_add_aoa(
    sheet,
    [
      [],
      ['Keterangan:'],
      ['Hadir mencakup status hadir, telat, dan jam kurang.'],
      ['Data lama Sakit/Izin (sebelum dipisah): catatan berisi kata "sakit" dihitung Sakit, selain itu Izin.'],
      ['Persentase dihitung dari Total Hari (hari tidak terjadwal tidak dihitung).'],
    ],
    { origin: -1 },
  );
  sheet['!cols'] = [
    { wch: 5 },
    ...identityColumns.map((column) => ({ wch: column.width || 14 })),
    ...COUNT_COLUMN_WIDTHS.map((wch) => ({ wch })),
  ];
  return sheet;
};

const buildDetailSheet = ({ rows, identityColumns }) => {
  const detailRows = rows.map((row, index) => {
    const identity = {};
    identityColumns.forEach((column) => {
      identity[column.label] = column.value(row) || '-';
    });
    const category = resolveAttendanceCategory(row);
    return {
      No: index + 1,
      Tanggal: row.attendance_date,
      ...identity,
      Status: STATUS_LABELS[row.attendance_status] || row.attendance_status || '-',
      Kategori: category ? CATEGORY_LABELS[category] : '-',
      Datang: formatDateTimeCell(row.checkin_at),
      Pulang: formatDateTimeCell(row.checkout_at),
      'Terlambat (menit)': Number(row.late_minutes || 0),
      Catatan: row.notes || '',
    };
  });

  const sheet = XLSX.utils.json_to_sheet(detailRows);
  sheet['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    ...identityColumns.map((column) => ({ wch: column.width || 14 })),
    { wch: 14 },
    { wch: 17 },
    { wch: 17 },
    { wch: 17 },
    { wch: 16 },
    { wch: 32 },
  ];
  return sheet;
};

const compareText = (a, b) =>
  String(a || '').localeCompare(String(b || ''), 'id', { numeric: true, sensitivity: 'base' });

const REPORT_CONFIGS = {
  student: {
    filePrefix: 'Presensi_Siswa',
    groupKey: (row) => row.user_id,
    identityColumns: [
      { label: 'NIS', value: (row) => row.nis, width: 14 },
      { label: 'Kelas', value: (row) => row.class_name, width: 12 },
      { label: 'Nama', value: (row) => row.full_name, width: 32 },
    ],
    sortGroups: (a, b) =>
      compareText(a.class_name, b.class_name) || compareText(a.full_name, b.full_name),
  },
  teacher: {
    filePrefix: 'Presensi_Guru',
    groupKey: (row) => row.user_id,
    identityColumns: [
      { label: 'NIP', value: (row) => row.nip, width: 20 },
      { label: 'Nama', value: (row) => row.full_name, width: 32 },
    ],
    sortGroups: (a, b) => compareText(a.full_name, b.full_name),
  },
  staff: {
    filePrefix: 'Presensi_Tendik',
    groupKey: (row) => row.staff_id,
    identityColumns: [
      { label: 'NIP', value: (row) => row.nip, width: 20 },
      { label: 'Nama', value: (row) => row.full_name, width: 32 },
    ],
    sortGroups: (a, b) => compareText(a.full_name, b.full_name),
  },
};

/** Downloads the daily attendance rows as "Rekapitulasi" and "Detail" sheets. */
export const downloadDailyAttendanceExcel = ({ type, rows, range }) => {
  const config = REPORT_CONFIGS[type];
  const detailRows = [...(rows || [])].sort(
    (a, b) =>
      compareText(a.attendance_date, b.attendance_date) ||
      config.sortGroups(a, b),
  );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    buildRecapSheet({ rows: detailRows, ...config }),
    'Rekapitulasi',
  );
  XLSX.utils.book_append_sheet(
    workbook,
    buildDetailSheet({ rows: detailRows, identityColumns: config.identityColumns }),
    'Detail',
  );

  const startLabel = range?.[0]?.format('YYYYMMDD') || 'awal';
  const endLabel = range?.[1]?.format('YYYYMMDD') || 'akhir';
  XLSX.writeFile(workbook, `${config.filePrefix}_${startLabel}_${endLabel}.xlsx`);
};
