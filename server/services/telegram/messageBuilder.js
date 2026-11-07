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

export const getAttendanceStatusLabel = (status) =>
  STATUS_LABELS[String(status || "pending")] || String(status || "Belum ada data");

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

export const DEFAULT_TEACHER_STUDENT_CHECKIN_TEMPLATE = `Assalamu'alaikum {teacher_name},

Siswa {student_name} sudah datang di sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}`;

export const DEFAULT_TEACHER_STUDENT_CHECKOUT_TEMPLATE = `Assalamu'alaikum {teacher_name},

Siswa {student_name} sudah pulang dari sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}`;

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
