-- Active: 1783378140119@@103.150.226.142@5432@ibnusyinaedu@attendance
-- Patch: extracurricular / activity attendance
-- Safe to re-run.

BEGIN;
SET search_path TO attendance, public;
SET TIME ZONE 'Asia/Jakarta';

-- 1) Policy: activity_fixed + target_role all
ALTER TABLE attendance.attendance_policy
  DROP CONSTRAINT IF EXISTS attendance_policy_target_role_check;
ALTER TABLE attendance.attendance_policy
  ADD CONSTRAINT attendance_policy_target_role_check
  CHECK (target_role IN ('student', 'teacher', 'all'));

ALTER TABLE attendance.attendance_policy
  DROP CONSTRAINT IF EXISTS attendance_policy_type_check;
ALTER TABLE attendance.attendance_policy
  ADD CONSTRAINT attendance_policy_type_check
  CHECK (
    policy_type IN (
      'student_fixed',
      'teacher_schedule_based',
      'teacher_fixed_daily',
      'activity_fixed'
    )
  );

-- 2) Feature flag
ALTER TABLE attendance.attendance_feature_setting
  DROP CONSTRAINT IF EXISTS attendance_feature_setting_code_check;
ALTER TABLE attendance.attendance_feature_setting
  ADD CONSTRAINT attendance_feature_setting_code_check
  CHECK (
    feature_code IN (
      'teacher_daily_attendance',
      'teacher_class_session_attendance',
      'student_daily_attendance',
      'student_checkout_logging',
      'activity_attendance'
    )
  );

-- 3) Device: extracurricular + optional policy_id
ALTER TABLE attendance.rfid_device
  ADD COLUMN IF NOT EXISTS policy_id integer
    REFERENCES attendance.attendance_policy(id) ON DELETE SET NULL;

ALTER TABLE attendance.rfid_device
  DROP CONSTRAINT IF EXISTS rfid_device_type_check;
ALTER TABLE attendance.rfid_device
  ADD CONSTRAINT rfid_device_type_check
  CHECK (device_type IN ('gate', 'classroom', 'extracurricular'));

ALTER TABLE attendance.rfid_device
  DROP CONSTRAINT IF EXISTS rfid_device_classroom_check;
ALTER TABLE attendance.rfid_device
  DROP CONSTRAINT IF EXISTS rfid_device_device_binding_check;
ALTER TABLE attendance.rfid_device
  ADD CONSTRAINT rfid_device_device_binding_check
  CHECK (
    (device_type = 'gate' AND class_id IS NULL AND policy_id IS NULL)
    OR (device_type = 'classroom' AND policy_id IS NULL)
    OR (device_type = 'extracurricular' AND class_id IS NULL)
  );

CREATE INDEX IF NOT EXISTS idx_rfid_device_policy
ON attendance.rfid_device(policy_id, device_type, is_active);

-- 4) Scan log: allow extracurricular source/actions
ALTER TABLE attendance.rfid_scan_log
  DROP CONSTRAINT IF EXISTS rfid_scan_log_source_check;
ALTER TABLE attendance.rfid_scan_log
  ADD CONSTRAINT rfid_scan_log_source_check
  CHECK (scan_source IN ('gate', 'classroom', 'extracurricular'));

ALTER TABLE attendance.rfid_scan_log
  DROP CONSTRAINT IF EXISTS rfid_scan_log_action_check;
ALTER TABLE attendance.rfid_scan_log
  ADD CONSTRAINT rfid_scan_log_action_check
  CHECK (
    scan_action IS NULL
    OR scan_action IN (
      'daily_gate',
      'daily_checkin',
      'daily_checkout',
      'teacher_session_checkin',
      'teacher_session_checkout',
      'activity_gate',
      'activity_checkin',
      'activity_checkout',
      'unknown'
    )
  );

ALTER TABLE attendance.rfid_scan_log
  ADD COLUMN IF NOT EXISTS activity_attendance_id bigint;

-- 5) Activity attendance (separate from daily gate attendance)
CREATE TABLE IF NOT EXISTS attendance.activity_attendance(
    id BIGSERIAL NOT NULL,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id integer REFERENCES public.a_periode(id) ON DELETE SET NULL,
    user_id integer NOT NULL REFERENCES public.u_users(id) ON DELETE CASCADE,
    policy_id integer NOT NULL REFERENCES attendance.attendance_policy(id) ON DELETE CASCADE,
    device_id integer REFERENCES attendance.rfid_device(id) ON DELETE SET NULL,
    attendance_date date NOT NULL,
    target_role varchar(20) NOT NULL,
    checkin_at timestamp with time zone,
    checkout_at timestamp with time zone,
    first_scan_id bigint REFERENCES attendance.rfid_scan_log(id) ON DELETE SET NULL,
    last_scan_id bigint REFERENCES attendance.rfid_scan_log(id) ON DELETE SET NULL,
    attendance_status varchar(30) NOT NULL DEFAULT 'pending',
    late_minutes integer NOT NULL DEFAULT 0,
    presence_minutes integer,
    notes text,
    evaluated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT activity_attendance_role_check
        CHECK (target_role IN ('student', 'teacher')),
    CONSTRAINT activity_attendance_status_check
        CHECK (
            attendance_status IN (
                'pending',
                'present',
                'late',
                'absent',
                'excused',
                'incomplete'
            )
        ),
    CONSTRAINT activity_attendance_time_order_check
        CHECK (checkout_at IS NULL OR checkin_at IS NULL OR checkout_at >= checkin_at),
    CONSTRAINT activity_attendance_late_check
        CHECK (late_minutes >= 0),
    CONSTRAINT activity_attendance_presence_check
        CHECK (presence_minutes IS NULL OR presence_minutes >= 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_activity_attendance_user_policy_date
ON attendance.activity_attendance(user_id, policy_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_activity_attendance_lookup
ON attendance.activity_attendance(homebase_id, policy_id, attendance_date, attendance_status);

CREATE INDEX IF NOT EXISTS idx_activity_attendance_user_date
ON attendance.activity_attendance(user_id, attendance_date DESC);

-- Link scan_log.activity_attendance_id after table exists
ALTER TABLE attendance.rfid_scan_log
  DROP CONSTRAINT IF EXISTS rfid_scan_log_activity_attendance_id_fkey;
ALTER TABLE attendance.rfid_scan_log
  ADD CONSTRAINT rfid_scan_log_activity_attendance_id_fkey
  FOREIGN KEY (activity_attendance_id)
  REFERENCES attendance.activity_attendance(id)
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rfid_scan_log_activity_attendance
ON attendance.rfid_scan_log(activity_attendance_id);

COMMIT;
