import { JAKARTA_TZ } from "../attendance/rfidDailyAttendance.js";

const STATUS_LABELS = {
  pending: "Belum ada data",
  present: "Hadir",
  late: "Terlambat",
  absent: "Tidak hadir",
  excused: "Izin",
  not_scheduled: "Tidak berjadwal",
  incomplete: "Belum lengkap",
  insufficient_hours: "Jam kurang",
};

const formatCheckinTime = (value) => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
};

const formatDateLabel = (attendanceDate) => {
  const date = new Date(`${attendanceDate}T12:00:00+07:00`);
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: JAKARTA_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
};

export const getAttendanceStatusLabel = (status) =>
  STATUS_LABELS[String(status || "pending")] || String(status || "Belum ada data");

export const buildStudentsBlock = (students = []) =>
  students
    .map((student, index) => {
      const statusLabel = getAttendanceStatusLabel(student.attendance_status);
      const checkinLabel = formatCheckinTime(student.checkin_at);
      const timeSuffix = checkinLabel ? ` (${checkinLabel})` : "";
      return `${index + 1}. *${student.student_name}* — ${statusLabel}${timeSuffix}`;
    })
    .join("\n");

export const renderWhatsappMessage = ({
  template,
  parentName,
  attendanceDate,
  schoolName,
  students = [],
}) => {
  const safeTemplate =
    template ||
    `Assalamu'alaikum Bapak/Ibu {parent_name},

Berikut laporan kehadiran anak Anda hari ini ({date_label}):

{students_block}

Terima kasih.
-{school_name}`;

  const studentsBlock = buildStudentsBlock(students);

  return safeTemplate
    .replaceAll("{parent_name}", parentName || "Bapak/Ibu")
    .replaceAll("{date_label}", formatDateLabel(attendanceDate))
    .replaceAll("{students_block}", studentsBlock)
    .replaceAll("{school_name}", schoolName || "Sekolah");
};
