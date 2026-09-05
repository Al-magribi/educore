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
      return `${index + 1}. ${student.student_name} — ${statusLabel}${timeSuffix}`;
    })
    .join("\n");

export const DEFAULT_PARENT_DAILY_TEMPLATE = `Assalamu'alaikum Bapak/Ibu {parent_name},

Berikut laporan kehadiran anak Anda hari ini ({date_label}):

{students_block}

Terima kasih.
-{school_name}`;

export const DEFAULT_TEACHER_CHECKIN_TEMPLATE = `Assalamu'alaikum {teacher_name},

Absensi DATANG tercatat.
Tanggal: {date_label}
Jam: {time_label}{device_line}

Terima kasih.`;

export const DEFAULT_TEACHER_CHECKOUT_TEMPLATE = `Assalamu'alaikum {teacher_name},

Absensi PULANG tercatat.
Tanggal: {date_label}
Jam: {time_label}{device_line}

Terima kasih.`;

export const DEFAULT_STUDENT_CHECKIN_TEMPLATE = `Assalamu'alaikum {student_name},

Presensi datang kamu sudah tercatat.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}`;

export const DEFAULT_STUDENT_CHECKOUT_TEMPLATE = `Assalamu'alaikum {student_name},

Presensi pulang kamu sudah tercatat.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}`;

export const DEFAULT_PARENT_CHECKIN_TEMPLATE = `Assalamu'alaikum {parent_name},

Anak Anda, {student_name}, sudah datang di sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}`;

export const DEFAULT_PARENT_CHECKOUT_TEMPLATE = `Assalamu'alaikum {parent_name},

Anak Anda, {student_name}, sudah pulang dari sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}`;

export const renderTelegramMessage = ({
  template,
  parentName,
  attendanceDate,
  schoolName,
  students = [],
}) => {
  const safeTemplate = template || DEFAULT_PARENT_DAILY_TEMPLATE;
  const studentsBlock = buildStudentsBlock(students);

  return safeTemplate
    .replaceAll("{parent_name}", parentName || "Bapak/Ibu")
    .replaceAll("{date_label}", formatDateLabel(attendanceDate))
    .replaceAll("{students_block}", studentsBlock)
    .replaceAll("{school_name}", schoolName || "Sekolah");
};

const replaceGatePlaceholders = (template, vars = {}) => {
  const replacements = {
    "{teacher_name}": vars.teacherName || vars.name || "Bapak/Ibu",
    "{student_name}": vars.studentName || vars.name || "Siswa",
    "{parent_name}": vars.parentName || "Bapak/Ibu",
    "{name}": vars.name || vars.studentName || vars.teacherName || vars.parentName || "",
    "{date_label}": vars.dateLabel || "-",
    "{time_label}": vars.timeLabel || "-",
    "{action}": vars.actionLabel || "",
    "{school_name}": vars.schoolName || "Sekolah",
    "{device_name}": vars.deviceName || "-",
    "{device_line}": vars.deviceLine || "",
    "{class_name}": vars.className || "-",
    "{nis}": vars.nis || "-",
    "{status_label}": vars.statusLabel || "",
  };

  let result = String(template || "");
  for (const [token, value] of Object.entries(replacements)) {
    result = result.replaceAll(token, value);
  }
  return result;
};

export const renderGateTelegramMessage = (template, vars = {}) =>
  replaceGatePlaceholders(template, vars);
