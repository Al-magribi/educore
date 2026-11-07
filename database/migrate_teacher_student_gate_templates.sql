-- Templates for notifying homeroom/linked teachers when a student taps datang/pulang.
BEGIN;

SET search_path TO attendance, public;

ALTER TABLE attendance.telegram_notification_config
  ADD COLUMN IF NOT EXISTS teacher_student_checkin_template text;

ALTER TABLE attendance.telegram_notification_config
  ADD COLUMN IF NOT EXISTS teacher_student_checkout_template text;

UPDATE attendance.telegram_notification_config
SET teacher_student_checkin_template = COALESCE(
      NULLIF(TRIM(teacher_student_checkin_template), ''),
      $tmpl$Assalamu'alaikum {teacher_name},

Siswa {student_name} sudah datang di sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$
    ),
    teacher_student_checkout_template = COALESCE(
      NULLIF(TRIM(teacher_student_checkout_template), ''),
      $tmpl$Assalamu'alaikum {teacher_name},

Siswa {student_name} sudah pulang dari sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$
    );

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN teacher_student_checkin_template SET DEFAULT $tmpl$Assalamu'alaikum {teacher_name},

Siswa {student_name} sudah datang di sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN teacher_student_checkout_template SET DEFAULT $tmpl$Assalamu'alaikum {teacher_name},

Siswa {student_name} sudah pulang dari sekolah.
Tanggal: {date_label}
Jam: {time_label}
Kelas: {class_name}{device_line}

Terima kasih.
-{school_name}$tmpl$;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN teacher_student_checkin_template SET NOT NULL;

ALTER TABLE attendance.telegram_notification_config
  ALTER COLUMN teacher_student_checkout_template SET NOT NULL;

COMMIT;
