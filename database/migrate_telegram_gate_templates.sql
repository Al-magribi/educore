-- Customizable datang/pulang Telegram templates for teacher, student, and parent.
BEGIN;

SET search_path TO attendance, public;

ALTER TABLE attendance.telegram_notification_config
  ADD COLUMN IF NOT EXISTS teacher_checkin_template text;

ALTER TABLE attendance.telegram_notification_config
  ADD COLUMN IF NOT EXISTS teacher_checkout_template text;

ALTER TABLE attendance.telegram_notification_config
  ADD COLUMN IF NOT EXISTS student_checkin_template text;

ALTER TABLE attendance.telegram_notification_config
  ADD COLUMN IF NOT EXISTS student_checkout_template text;

ALTER TABLE attendance.telegram_notification_config
  ADD COLUMN IF NOT EXISTS parent_checkin_template text;

ALTER TABLE attendance.telegram_notification_config
  ADD COLUMN IF NOT EXISTS parent_checkout_template text;

UPDATE attendance.telegram_notification_config
SET teacher_checkin_template = COALESCE(
      NULLIF(TRIM(teacher_checkin_template), ''),
      $tmpl$Assalamu'alaikum {teacher_name},

Absensi DATANG tercatat.
Tanggal: {date_label}
Jam: {time_label}{device_line}

Terima kasih.$tmpl$
    ),
    teacher_checkout_template = COALESCE(
      NULLIF(TRIM(teacher_checkout_template), ''),
      $tmpl$Assalamu'alaikum {teacher_name},

Absensi PULANG tercatat.
Tanggal: {date_label}
Jam: {time_label}{device_line}

Terima kasih.$tmpl$
    ),
    student_checkin_template = COALESCE(
      NULLIF(TRIM(student_checkin_template), ''),
      $tmpl$Assalamu'alaikum {student_name},

Presensi datang kamu sudah tercatat.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$
    ),
    student_checkout_template = COALESCE(
      NULLIF(TRIM(student_checkout_template), ''),
      $tmpl$Assalamu'alaikum {student_name},

Presensi pulang kamu sudah tercatat.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$
    ),
    parent_checkin_template = COALESCE(
      NULLIF(TRIM(parent_checkin_template), ''),
      $tmpl$Assalamu'alaikum {parent_name},

Anak Anda, {student_name}, sudah datang di sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$
    ),
    parent_checkout_template = COALESCE(
      NULLIF(TRIM(parent_checkout_template), ''),
      $tmpl$Assalamu'alaikum {parent_name},

Anak Anda, {student_name}, sudah pulang dari sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$
    );

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN teacher_checkin_template SET DEFAULT $tmpl$Assalamu'alaikum {teacher_name},

Absensi DATANG tercatat.
Tanggal: {date_label}
Jam: {time_label}{device_line}

Terima kasih.$tmpl$;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN teacher_checkout_template SET DEFAULT $tmpl$Assalamu'alaikum {teacher_name},

Absensi PULANG tercatat.
Tanggal: {date_label}
Jam: {time_label}{device_line}

Terima kasih.$tmpl$;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN student_checkin_template SET DEFAULT $tmpl$Assalamu'alaikum {student_name},

Presensi datang kamu sudah tercatat.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN student_checkout_template SET DEFAULT $tmpl$Assalamu'alaikum {student_name},

Presensi pulang kamu sudah tercatat.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN parent_checkin_template SET DEFAULT $tmpl$Assalamu'alaikum {parent_name},

Anak Anda, {student_name}, sudah datang di sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN parent_checkout_template SET DEFAULT $tmpl$Assalamu'alaikum {parent_name},

Anak Anda, {student_name}, sudah pulang dari sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN teacher_checkin_template SET NOT NULL;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN teacher_checkout_template SET NOT NULL;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN student_checkin_template SET NOT NULL;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN student_checkout_template SET NOT NULL;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN parent_checkin_template SET NOT NULL;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN parent_checkout_template SET NOT NULL;

COMMIT;
