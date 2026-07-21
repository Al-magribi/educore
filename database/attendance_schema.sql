CREATE SCHEMA IF NOT EXISTS attendance;

BEGIN;
SET search_path TO attendance, public;
SET TIME ZONE 'Asia/Jakarta';

CREATE TABLE attendance_policy(
    id SERIAL NOT NULL,
    homebase_id integer REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    name varchar(120) NOT NULL,
    code varchar(60) NOT NULL,
    target_role varchar(20) NOT NULL,
    policy_type varchar(30) NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT attendance_policy_target_role_check
        CHECK (target_role IN ('student', 'teacher', 'all')),
    CONSTRAINT attendance_policy_type_check
        CHECK (policy_type IN ('student_fixed', 'teacher_schedule_based', 'teacher_fixed_daily', 'activity_fixed'))
);
CREATE UNIQUE INDEX uq_attendance_policy_code
ON attendance.attendance_policy(homebase_id, code);
CREATE INDEX idx_attendance_policy_lookup
ON attendance.attendance_policy(homebase_id, target_role, policy_type, is_active);

CREATE TABLE attendance_policy_day_rule(
    id SERIAL NOT NULL,
    policy_id integer NOT NULL REFERENCES attendance.attendance_policy(id) ON DELETE CASCADE,
    day_of_week smallint NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    checkin_start time without time zone,
    checkin_end time without time zone,
    reference_checkin_time time without time zone,
    late_tolerance_minutes integer NOT NULL DEFAULT 0,
    checkout_start time without time zone,
    reference_checkout_time time without time zone,
    checkout_is_optional boolean NOT NULL DEFAULT false,
    min_presence_minutes integer,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT attendance_policy_day_rule_day_check
        CHECK (day_of_week BETWEEN 1 AND 7),
    CONSTRAINT attendance_policy_day_rule_checkin_range_check
        CHECK (
            (checkin_start IS NULL AND checkin_end IS NULL)
            OR
            (checkin_start IS NOT NULL AND checkin_end IS NOT NULL AND checkin_start < checkin_end)
        ),
    CONSTRAINT attendance_policy_day_rule_checkout_range_check
        CHECK (
            (checkout_start IS NULL OR reference_checkout_time IS NULL)
            OR
            (checkout_start < reference_checkout_time)
        ),
    CONSTRAINT attendance_policy_day_rule_late_tolerance_check
        CHECK (late_tolerance_minutes >= 0),
    CONSTRAINT attendance_policy_day_rule_min_presence_check
        CHECK (min_presence_minutes IS NULL OR min_presence_minutes >= 0)
);
CREATE UNIQUE INDEX uq_attendance_policy_day_rule
ON attendance.attendance_policy_day_rule(policy_id, day_of_week);
CREATE INDEX idx_attendance_policy_day_rule_lookup
ON attendance.attendance_policy_day_rule(policy_id, day_of_week, is_active);

CREATE TABLE attendance_policy_assignment(
    id SERIAL NOT NULL,
    policy_id integer NOT NULL REFERENCES attendance.attendance_policy(id) ON DELETE CASCADE,
    assignment_scope varchar(20) NOT NULL,
    user_id integer REFERENCES public.u_users(id) ON DELETE CASCADE,
    class_id integer REFERENCES public.a_class(id) ON DELETE CASCADE,
    grade_id integer REFERENCES public.a_grade(id) ON DELETE CASCADE,
    homebase_id integer REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    effective_start_date date,
    effective_end_date date,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT attendance_policy_assignment_scope_check
        CHECK (assignment_scope IN ('user', 'class', 'grade', 'homebase')),
    CONSTRAINT attendance_policy_assignment_scope_ref_check
        CHECK (
            (assignment_scope = 'user' AND user_id IS NOT NULL AND class_id IS NULL AND grade_id IS NULL)
            OR
            (assignment_scope = 'class' AND user_id IS NULL AND class_id IS NOT NULL AND grade_id IS NULL)
            OR
            (assignment_scope = 'grade' AND user_id IS NULL AND class_id IS NULL AND grade_id IS NOT NULL)
            OR
            (assignment_scope = 'homebase' AND user_id IS NULL AND class_id IS NULL AND grade_id IS NULL AND homebase_id IS NOT NULL)
        ),
    CONSTRAINT attendance_policy_assignment_date_check
        CHECK (effective_end_date IS NULL OR effective_start_date IS NULL OR effective_end_date >= effective_start_date)
);
CREATE INDEX idx_attendance_policy_assignment_user
ON attendance.attendance_policy_assignment(user_id, is_active, effective_start_date, effective_end_date);
CREATE INDEX idx_attendance_policy_assignment_class
ON attendance.attendance_policy_assignment(class_id, is_active, effective_start_date, effective_end_date);
CREATE INDEX idx_attendance_policy_assignment_grade
ON attendance.attendance_policy_assignment(grade_id, is_active, effective_start_date, effective_end_date);
CREATE INDEX idx_attendance_policy_assignment_homebase
ON attendance.attendance_policy_assignment(homebase_id, is_active, effective_start_date, effective_end_date);

CREATE TABLE attendance_holiday(
    id SERIAL NOT NULL,
    homebase_id integer REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    holiday_date date NOT NULL,
    name varchar(150) NOT NULL,
    description text,
    applies_to_role varchar(20) DEFAULT 'all',
    is_active boolean NOT NULL DEFAULT true,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT attendance_holiday_role_check
        CHECK (applies_to_role IN ('all', 'student', 'teacher'))
);
CREATE UNIQUE INDEX uq_attendance_holiday
ON attendance.attendance_holiday(homebase_id, holiday_date, applies_to_role);
CREATE INDEX idx_attendance_holiday_lookup
ON attendance.attendance_holiday(homebase_id, holiday_date, is_active);

CREATE TABLE attendance_calendar_config(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    skip_saturday boolean NOT NULL DEFAULT false,
    skip_sunday boolean NOT NULL DEFAULT true,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);
CREATE UNIQUE INDEX uq_attendance_calendar_config_homebase
ON attendance.attendance_calendar_config(homebase_id);

CREATE TABLE attendance_feature_setting(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    feature_code varchar(60) NOT NULL,
    is_enabled boolean NOT NULL DEFAULT true,
    notes text,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT attendance_feature_setting_code_check
        CHECK (
            feature_code IN (
                'teacher_daily_attendance',
                'teacher_class_session_attendance',
                'student_daily_attendance',
                'student_checkout_logging',
                'activity_attendance'
            )
        )
);
CREATE UNIQUE INDEX uq_attendance_feature_setting
ON attendance.attendance_feature_setting(homebase_id, feature_code);
CREATE INDEX idx_attendance_feature_setting_lookup
ON attendance.attendance_feature_setting(homebase_id, feature_code, is_enabled);

CREATE TABLE rfid_device(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    -- Legacy single-class pointer (first mapped class). Source of truth for classroom
    -- mappings is attendance.rfid_device_class (one device -> many classes).
    class_id integer REFERENCES public.a_class(id) ON DELETE SET NULL,
    -- Legacy single-policy pointer (first mapped policy). Source of truth for
    -- extracurricular mappings is attendance.rfid_device_policy (one device -> many).
    policy_id integer REFERENCES attendance.attendance_policy(id) ON DELETE SET NULL,
    code varchar(60) NOT NULL,
    name varchar(120) NOT NULL,
    device_type varchar(20) NOT NULL,
    location_group varchar(60),
    location_detail text,
    ip_address varchar(60),
    mac_address varchar(60),
    api_token text NOT NULL,
    firmware_version varchar(50),
    is_active boolean NOT NULL DEFAULT true,
    last_seen_at timestamp with time zone,
    installed_at timestamp with time zone,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT rfid_device_type_check
        CHECK (device_type IN ('gate', 'classroom', 'extracurricular')),
    CONSTRAINT rfid_device_device_binding_check
        CHECK (
            (device_type = 'gate' AND class_id IS NULL AND policy_id IS NULL)
            OR
            (device_type = 'classroom' AND policy_id IS NULL)
            OR
            (device_type = 'extracurricular' AND class_id IS NULL)
        )
);
CREATE UNIQUE INDEX uq_rfid_device_code
ON attendance.rfid_device(code);
CREATE INDEX idx_rfid_device_lookup
ON attendance.rfid_device(homebase_id, device_type, class_id, is_active);
CREATE INDEX idx_rfid_device_location_group
ON attendance.rfid_device(location_group, device_type, is_active);
CREATE INDEX idx_rfid_device_policy
ON attendance.rfid_device(policy_id, device_type, is_active);

-- Classroom device may cover multiple classes (e.g. Device 1 -> 7A/7B/7C/7D).
CREATE TABLE rfid_device_class(
    device_id integer NOT NULL REFERENCES attendance.rfid_device(id) ON DELETE CASCADE,
    class_id integer NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(device_id, class_id)
);

-- Extracurricular device may cover multiple activity policies (e.g. Silat + Tari).
CREATE TABLE rfid_device_policy(
    device_id integer NOT NULL REFERENCES attendance.rfid_device(id) ON DELETE CASCADE,
    policy_id integer NOT NULL REFERENCES attendance.attendance_policy(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(device_id, policy_id)
);
CREATE INDEX idx_rfid_device_policy_map_policy
ON attendance.rfid_device_policy(policy_id, device_id);
CREATE INDEX idx_rfid_device_policy_map_device
ON attendance.rfid_device_policy(device_id, policy_id);
CREATE INDEX idx_rfid_device_class_class
ON attendance.rfid_device_class(class_id, device_id);
CREATE INDEX idx_rfid_device_class_device
ON attendance.rfid_device_class(device_id, class_id);

CREATE TABLE rfid_card(
    id SERIAL NOT NULL,
    user_id integer NOT NULL REFERENCES public.u_users(id) ON DELETE CASCADE,
    card_uid varchar(100) NOT NULL,
    card_number varchar(100),
    card_type varchar(20) NOT NULL DEFAULT 'rfid',
    issued_at timestamp with time zone,
    expired_at timestamp with time zone,
    is_primary boolean NOT NULL DEFAULT true,
    is_active boolean NOT NULL DEFAULT true,
    notes text,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT rfid_card_type_check
        CHECK (card_type IN ('rfid', 'nfc')),
    CONSTRAINT rfid_card_expiry_check
        CHECK (expired_at IS NULL OR issued_at IS NULL OR expired_at >= issued_at)
);
CREATE UNIQUE INDEX uq_rfid_card_uid
ON attendance.rfid_card(card_uid);
CREATE INDEX idx_rfid_card_user
ON attendance.rfid_card(user_id, is_active, is_primary);

CREATE TABLE rfid_scan_log(
    id BIGSERIAL NOT NULL,
    homebase_id integer REFERENCES public.a_homebase(id) ON DELETE SET NULL,
    periode_id integer REFERENCES public.a_periode(id) ON DELETE SET NULL,
    device_id integer REFERENCES attendance.rfid_device(id) ON DELETE SET NULL,
    card_id integer REFERENCES attendance.rfid_card(id) ON DELETE SET NULL,
    user_id integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    class_id integer REFERENCES public.a_class(id) ON DELETE SET NULL,
    schedule_entry_id integer REFERENCES lms.l_schedule_entry(id) ON DELETE SET NULL,
    teacher_session_log_id integer REFERENCES lms.l_teacher_session_log(id) ON DELETE SET NULL,
    attendance_id bigint,
    activity_attendance_id bigint,
    scan_source varchar(20) NOT NULL,
    scan_action varchar(30),
    card_uid varchar(100) NOT NULL,
    scanned_at timestamp with time zone NOT NULL,
    device_time_at timestamp with time zone,
    server_received_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    result_status varchar(30) NOT NULL DEFAULT 'accepted',
    rejection_reason text,
    raw_payload jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT rfid_scan_log_source_check
        CHECK (scan_source IN ('gate', 'classroom', 'extracurricular')),
    CONSTRAINT rfid_scan_log_action_check
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
        ),
    CONSTRAINT rfid_scan_log_status_check
        CHECK (
            result_status IN (
                'accepted',
                'duplicate',
                'rejected',
                'unregistered',
                'out_of_window',
                'not_scheduled',
                'card_inactive',
                'device_inactive',
                'user_inactive',
                'policy_missing',
                'too_early_checkout',
                'cooldown'
            )
        )
);
CREATE INDEX idx_rfid_scan_log_user_time
ON attendance.rfid_scan_log(user_id, scanned_at DESC);
CREATE INDEX idx_rfid_scan_log_device_time
ON attendance.rfid_scan_log(device_id, scanned_at DESC);
CREATE INDEX idx_rfid_scan_log_card_time
ON attendance.rfid_scan_log(card_uid, scanned_at DESC);
CREATE INDEX idx_rfid_scan_log_schedule
ON attendance.rfid_scan_log(schedule_entry_id, teacher_session_log_id, scanned_at DESC);

CREATE TABLE daily_attendance(
    id BIGSERIAL NOT NULL,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id integer REFERENCES public.a_periode(id) ON DELETE SET NULL,
    user_id integer NOT NULL REFERENCES public.u_users(id) ON DELETE CASCADE,
    policy_id integer REFERENCES attendance.attendance_policy(id) ON DELETE SET NULL,
    attendance_date date NOT NULL,
    target_role varchar(20) NOT NULL,
    policy_type varchar(30),
    required_to_attend boolean NOT NULL DEFAULT true,
    requirement_source varchar(30) NOT NULL DEFAULT 'policy',
    checkin_at timestamp with time zone,
    checkout_at timestamp with time zone,
    first_gate_scan_id bigint REFERENCES attendance.rfid_scan_log(id) ON DELETE SET NULL,
    last_gate_scan_id bigint REFERENCES attendance.rfid_scan_log(id) ON DELETE SET NULL,
    attendance_status varchar(30) NOT NULL DEFAULT 'pending',
    late_minutes integer NOT NULL DEFAULT 0,
    presence_minutes integer,
    minimum_required_minutes integer,
    is_checkout_optional boolean NOT NULL DEFAULT false,
    is_early_checkout boolean NOT NULL DEFAULT false,
    has_midday_exit boolean NOT NULL DEFAULT false,
    notes text,
    evaluated_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT daily_attendance_role_check
        CHECK (target_role IN ('student', 'teacher')),
    CONSTRAINT daily_attendance_policy_type_check
        CHECK (
            policy_type IS NULL
            OR policy_type IN ('student_fixed', 'teacher_schedule_based', 'teacher_fixed_daily')
        ),
    CONSTRAINT daily_attendance_requirement_source_check
        CHECK (requirement_source IN ('policy', 'schedule', 'manual')),
    CONSTRAINT daily_attendance_status_check
        CHECK (
            attendance_status IN (
                'pending',
                'present',
                'late',
                'absent',
                'excused',
                'not_scheduled',
                'incomplete',
                'insufficient_hours'
            )
        ),
    CONSTRAINT daily_attendance_time_order_check
        CHECK (checkout_at IS NULL OR checkin_at IS NULL OR checkout_at >= checkin_at),
    CONSTRAINT daily_attendance_minutes_check
        CHECK (
            late_minutes >= 0
            AND (presence_minutes IS NULL OR presence_minutes >= 0)
            AND (minimum_required_minutes IS NULL OR minimum_required_minutes >= 0)
        )
);
CREATE UNIQUE INDEX uq_daily_attendance_user_date
ON attendance.daily_attendance(user_id, attendance_date);
CREATE INDEX idx_daily_attendance_homebase_date
ON attendance.daily_attendance(homebase_id, attendance_date, target_role, attendance_status);
CREATE INDEX idx_daily_attendance_policy
ON attendance.daily_attendance(policy_id, attendance_date, attendance_status);

CREATE TABLE daily_attendance_event(
    id BIGSERIAL NOT NULL,
    attendance_id bigint NOT NULL REFERENCES attendance.daily_attendance(id) ON DELETE CASCADE,
    scan_log_id bigint REFERENCES attendance.rfid_scan_log(id) ON DELETE SET NULL,
    event_type varchar(30) NOT NULL,
    event_time timestamp with time zone NOT NULL,
    event_source varchar(20) NOT NULL DEFAULT 'rfid',
    event_result varchar(20) NOT NULL DEFAULT 'applied',
    notes text,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT daily_attendance_event_type_check
        CHECK (
            event_type IN (
                'checkin',
                'checkout',
                'manual_checkin',
                'manual_checkout',
                'auto_checkout',
                'status_adjustment'
            )
        ),
    CONSTRAINT daily_attendance_event_source_check
        CHECK (event_source IN ('rfid', 'manual', 'system')),
    CONSTRAINT daily_attendance_event_result_check
        CHECK (event_result IN ('applied', 'ignored', 'reversed'))
);
CREATE INDEX idx_daily_attendance_event_lookup
ON attendance.daily_attendance_event(attendance_id, event_time);
CREATE INDEX idx_daily_attendance_event_scan_log
ON attendance.daily_attendance_event(scan_log_id);

CREATE TABLE teacher_schedule_requirement(
    id BIGSERIAL NOT NULL,
    attendance_id bigint NOT NULL REFERENCES attendance.daily_attendance(id) ON DELETE CASCADE,
    teacher_id integer NOT NULL REFERENCES public.u_teachers(user_id) ON DELETE CASCADE,
    schedule_entry_id integer NOT NULL REFERENCES lms.l_schedule_entry(id) ON DELETE CASCADE,
    first_slot_id integer REFERENCES lms.l_time_slot(id) ON DELETE SET NULL,
    last_slot_id integer REFERENCES lms.l_time_slot(id) ON DELETE SET NULL,
    class_id integer NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
    planned_start_at timestamp with time zone,
    planned_end_at timestamp with time zone,
    actual_checkin_at timestamp with time zone,
    actual_checkout_at timestamp with time zone,
    teacher_session_log_id integer REFERENCES lms.l_teacher_session_log(id) ON DELETE SET NULL,
    session_status varchar(30) NOT NULL DEFAULT 'pending',
    late_minutes integer NOT NULL DEFAULT 0,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT teacher_schedule_requirement_status_check
        CHECK (
            session_status IN (
                'pending',
                'present',
                'late',
                'missed',
                'partial',
                'excused'
            )
        ),
    CONSTRAINT teacher_schedule_requirement_time_check
        CHECK (
            (planned_end_at IS NULL OR planned_start_at IS NULL OR planned_end_at >= planned_start_at)
            AND (actual_checkout_at IS NULL OR actual_checkin_at IS NULL OR actual_checkout_at >= actual_checkin_at)
            AND late_minutes >= 0
        )
);
CREATE UNIQUE INDEX uq_teacher_schedule_requirement
ON attendance.teacher_schedule_requirement(attendance_id, schedule_entry_id);
CREATE INDEX idx_teacher_schedule_requirement_teacher
ON attendance.teacher_schedule_requirement(teacher_id, planned_start_at, session_status);
CREATE INDEX idx_teacher_schedule_requirement_session_log
ON attendance.teacher_schedule_requirement(teacher_session_log_id);

-- Extracurricular / activity attendance (independent from daily gate attendance).
CREATE TABLE activity_attendance(
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
CREATE UNIQUE INDEX uq_activity_attendance_user_policy_date
ON attendance.activity_attendance(user_id, policy_id, attendance_date);
CREATE INDEX idx_activity_attendance_lookup
ON attendance.activity_attendance(homebase_id, policy_id, attendance_date, attendance_status);
CREATE INDEX idx_activity_attendance_user_date
ON attendance.activity_attendance(user_id, attendance_date DESC);

CREATE TABLE attendance_manual_adjustment(
    id BIGSERIAL NOT NULL,
    attendance_id bigint REFERENCES attendance.daily_attendance(id) ON DELETE CASCADE,
    teacher_session_log_id integer REFERENCES lms.l_teacher_session_log(id) ON DELETE SET NULL,
    target_type varchar(20) NOT NULL,
    adjustment_type varchar(30) NOT NULL,
    before_data jsonb DEFAULT '{}'::jsonb,
    after_data jsonb DEFAULT '{}'::jsonb,
    reason text NOT NULL,
    approved_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT attendance_manual_adjustment_target_check
        CHECK (target_type IN ('daily_attendance', 'teacher_session')),
    CONSTRAINT attendance_manual_adjustment_type_check
        CHECK (
            adjustment_type IN (
                'checkin_edit',
                'checkout_edit',
                'status_edit',
                'policy_override',
                'session_override'
            )
        ),
    CONSTRAINT attendance_manual_adjustment_target_ref_check
        CHECK (
            (target_type = 'daily_attendance' AND attendance_id IS NOT NULL)
            OR
            (target_type = 'teacher_session' AND teacher_session_log_id IS NOT NULL)
        )
);
CREATE INDEX idx_attendance_manual_adjustment_attendance
ON attendance.attendance_manual_adjustment(attendance_id, created_at DESC);
CREATE INDEX idx_attendance_manual_adjustment_session
ON attendance.attendance_manual_adjustment(teacher_session_log_id, created_at DESC);

ALTER TABLE attendance.rfid_scan_log
ADD CONSTRAINT rfid_scan_log_attendance_id_fkey
FOREIGN KEY(attendance_id) REFERENCES attendance.daily_attendance(id) ON DELETE SET NULL;

-- ================================================================
-- WHATSAPP NOTIFICATION (LAPORAN KEHADIRAN KE ORANG TUA)
-- ================================================================

CREATE TABLE whatsapp_notification_config(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    is_enabled boolean NOT NULL DEFAULT false,
    send_time time without time zone NOT NULL DEFAULT '08:00:00',
    send_delay_min_seconds integer NOT NULL DEFAULT 15,
    send_delay_max_seconds integer NOT NULL DEFAULT 20,
    message_template text NOT NULL DEFAULT
        'Assalamu''alaikum Bapak/Ibu {parent_name},

Berikut laporan kehadiran anak Anda hari ini ({date_label}):

{students_block}

Terima kasih.
-{school_name}',
    skip_on_holiday boolean NOT NULL DEFAULT true,
    last_run_date date,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT whatsapp_notification_config_delay_min_check
        CHECK (send_delay_min_seconds >= 1),
    CONSTRAINT whatsapp_notification_config_delay_max_check
        CHECK (send_delay_max_seconds >= send_delay_min_seconds),
    CONSTRAINT whatsapp_notification_config_delay_cap_check
        CHECK (send_delay_max_seconds <= 120)
);
CREATE UNIQUE INDEX uq_whatsapp_notification_config_homebase
ON attendance.whatsapp_notification_config(homebase_id);
CREATE INDEX idx_whatsapp_notification_config_schedule
ON attendance.whatsapp_notification_config(is_enabled, send_time);

CREATE TABLE whatsapp_session(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    session_status varchar(20) NOT NULL DEFAULT 'disconnected',
    connected_phone varchar(30),
    qr_code text,
    qr_generated_at timestamp with time zone,
    last_connected_at timestamp with time zone,
    last_disconnected_at timestamp with time zone,
    last_error text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT whatsapp_session_status_check
        CHECK (
            session_status IN (
                'disconnected',
                'initializing',
                'qr_pending',
                'authenticated',
                'ready',
                'auth_failure'
            )
        )
);
CREATE UNIQUE INDEX uq_whatsapp_session_homebase
ON attendance.whatsapp_session(homebase_id);
CREATE INDEX idx_whatsapp_session_status
ON attendance.whatsapp_session(session_status, updated_at DESC);

CREATE TABLE whatsapp_notification_batch(
    id BIGSERIAL NOT NULL,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id integer REFERENCES public.a_periode(id) ON DELETE SET NULL,
    attendance_date date NOT NULL,
    batch_status varchar(20) NOT NULL DEFAULT 'pending',
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    total_recipients integer NOT NULL DEFAULT 0,
    sent_count integer NOT NULL DEFAULT 0,
    failed_count integer NOT NULL DEFAULT 0,
    skipped_count integer NOT NULL DEFAULT 0,
    error_message text,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT whatsapp_notification_batch_status_check
        CHECK (
            batch_status IN (
                'pending',
                'running',
                'completed',
                'failed',
                'cancelled'
            )
        ),
    CONSTRAINT whatsapp_notification_batch_count_check
        CHECK (
            total_recipients >= 0
            AND sent_count >= 0
            AND failed_count >= 0
            AND skipped_count >= 0
        )
);
CREATE UNIQUE INDEX uq_whatsapp_notification_batch_homebase_date
ON attendance.whatsapp_notification_batch(homebase_id, attendance_date);
CREATE INDEX idx_whatsapp_notification_batch_status
ON attendance.whatsapp_notification_batch(batch_status, attendance_date DESC);
CREATE INDEX idx_whatsapp_notification_batch_homebase_lookup
ON attendance.whatsapp_notification_batch(homebase_id, attendance_date DESC, batch_status);

CREATE TABLE whatsapp_notification_log(
    id BIGSERIAL NOT NULL,
    batch_id bigint NOT NULL REFERENCES attendance.whatsapp_notification_batch(id) ON DELETE CASCADE,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    parent_user_id integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    parent_name text,
    phone varchar(30) NOT NULL,
    message text NOT NULL,
    students_payload jsonb NOT NULL DEFAULT '[]'::jsonb,
    delivery_status varchar(20) NOT NULL DEFAULT 'queued',
    whatsapp_message_id varchar(120),
    error_message text,
    queued_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT whatsapp_notification_log_delivery_status_check
        CHECK (
            delivery_status IN (
                'queued',
                'sent',
                'failed',
                'skipped'
            )
        ),
    CONSTRAINT whatsapp_notification_log_students_payload_check
        CHECK (jsonb_typeof(students_payload) = 'array')
);
CREATE UNIQUE INDEX uq_whatsapp_notification_log_batch_parent
ON attendance.whatsapp_notification_log(batch_id, parent_user_id)
WHERE parent_user_id IS NOT NULL;
CREATE INDEX idx_whatsapp_notification_log_batch_status
ON attendance.whatsapp_notification_log(batch_id, delivery_status);
CREATE INDEX idx_whatsapp_notification_log_homebase_sent
ON attendance.whatsapp_notification_log(homebase_id, sent_at DESC);
CREATE INDEX idx_whatsapp_notification_log_phone
ON attendance.whatsapp_notification_log(phone, created_at DESC);

SET search_path TO public;
COMMIT;


