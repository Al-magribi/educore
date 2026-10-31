import * as XLSX from 'xlsx';
import { statusLabel, timeOnly } from './classAttendanceShared';

const buildRecapRows = (students, rows) =>
  students.map((student, index) => {
    const own = rows.filter((row) => Number(row.user_id) === Number(student.user_id));
    const count = (...statuses) =>
      own.filter((row) => statuses.includes(row.attendance_status)).length;

    return {
      No: index + 1,
      NIS: student.nis || '-',
      Nama: student.full_name,
      Hadir: count('present', 'insufficient_hours'),
      Telat: count('late'),
      'Sakit/Izin': count('excused'),
      Absen: count('absent'),
      'Belum tap/lengkap': count('pending', 'incomplete'),
    };
  });

const buildDetailRows = (rows) =>
  rows.map((row, index) => ({
    No: index + 1,
    Tanggal: row.attendance_date,
    NIS: row.nis || '-',
    Nama: row.full_name,
    Status: statusLabel(row.attendance_status),
    Datang: timeOnly(row.checkin_at) || '-',
    Pulang: timeOnly(row.checkout_at) || '-',
    'Terlambat (menit)': Number(row.late_minutes || 0),
    Catatan: row.notes || '',
  }));

export const downloadClassAttendanceExcel = ({
  className,
  startDate,
  endDate,
  students,
  rows,
  detailRows,
}) => {
  const workbook = XLSX.utils.book_new();
  const recapSheet = XLSX.utils.json_to_sheet(buildRecapRows(students, rows));
  recapSheet['!cols'] = [
    { wch: 5 },
    { wch: 14 },
    { wch: 32 },
    { wch: 8 },
    { wch: 8 },
    { wch: 11 },
    { wch: 8 },
    { wch: 17 },
  ];
  const detailSheet = XLSX.utils.json_to_sheet(buildDetailRows(detailRows));
  detailSheet['!cols'] = [
    { wch: 5 },
    { wch: 12 },
    { wch: 14 },
    { wch: 32 },
    { wch: 14 },
    { wch: 8 },
    { wch: 8 },
    { wch: 16 },
    { wch: 32 },
  ];

  XLSX.utils.book_append_sheet(workbook, recapSheet, 'Rekap');
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Detail');
  const safeClassName = String(className || 'Kelas').replace(/[\\/:*?"<>|]/g, '-');
  XLSX.writeFile(workbook, `Presensi_${safeClassName}_${startDate}_${endDate}.xlsx`);
};
