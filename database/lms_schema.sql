CREATE SCHEMA IF NOT EXISTS lms;

BEGIN;
SET search_path TO lms, public;

CREATE TABLE l_schedule_config(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT false,
    session_minutes integer NOT NULL,
    max_sessions_per_meeting integer NOT NULL DEFAULT 2,
    require_different_days_if_over_max boolean NOT NULL DEFAULT true,
    allow_same_day_multiple_meetings boolean NOT NULL DEFAULT true,
    minimum_gap_slots integer NOT NULL DEFAULT 4,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_config_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_schedule_config_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_schedule_config_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_schedule_config_name_check CHECK (length(btrim(name)) > 0),
    CONSTRAINT l_schedule_config_session_minutes_check CHECK ((session_minutes > 0)),
    CONSTRAINT l_schedule_config_max_sessions_per_meeting_check CHECK ((max_sessions_per_meeting > 0)),
    CONSTRAINT l_schedule_config_minimum_gap_slots_check CHECK ((minimum_gap_slots >= 0))
);
CREATE INDEX idx_schedule_config_lookup ON lms.l_schedule_config USING btree (homebase_id, periode_id, is_active, created_at DESC);
CREATE UNIQUE INDEX uq_schedule_config_active_periode ON lms.l_schedule_config USING btree (homebase_id, periode_id) WHERE (is_active = true);

CREATE TABLE l_schedule_config_group(
    id SERIAL NOT NULL,
    config_id integer NOT NULL,
    name text NOT NULL,
    description text,
    sort_order integer NOT NULL DEFAULT 1,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_config_group_config_id_fkey FOREIGN KEY(config_id) REFERENCES lms.l_schedule_config(id) ON DELETE CASCADE,
    CONSTRAINT l_schedule_config_group_name_check CHECK (length(btrim(name)) > 0),
    CONSTRAINT l_schedule_config_group_sort_order_check CHECK (sort_order > 0)
);
CREATE INDEX idx_schedule_config_group_lookup ON lms.l_schedule_config_group USING btree (config_id, sort_order, id);
CREATE UNIQUE INDEX uq_schedule_config_group_default ON lms.l_schedule_config_group USING btree (config_id) WHERE (is_default = true);

CREATE TABLE l_schedule_config_group_class(
    id SERIAL NOT NULL,
    config_group_id integer NOT NULL,
    class_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_config_group_class_config_group_id_fkey FOREIGN KEY(config_group_id) REFERENCES lms.l_schedule_config_group(id) ON DELETE CASCADE,
    CONSTRAINT l_schedule_config_group_class_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id)
);
CREATE UNIQUE INDEX uq_schedule_config_group_class ON lms.l_schedule_config_group_class USING btree (config_group_id, class_id);

CREATE TABLE l_schedule_generation_run(
    id SERIAL NOT NULL,
    config_id integer NOT NULL,
    generated_by integer,
    strategy text,
    status varchar(20) NOT NULL DEFAULT 'success'::character varying,
    notes text,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_generation_run_config_id_fkey FOREIGN KEY(config_id) REFERENCES lms.l_schedule_config(id),
    CONSTRAINT l_schedule_generation_run_generated_by_fkey FOREIGN KEY(generated_by) REFERENCES public.u_users(id),
    CONSTRAINT l_schedule_generation_run_status_check CHECK (((status)::text = ANY ((ARRAY['running'::character varying, 'success'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);

CREATE TABLE l_schedule_day_template(
    id SERIAL NOT NULL,
    config_id integer NOT NULL,
    config_group_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    session_minutes integer NOT NULL DEFAULT 40,
    is_school_day boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_day_template_config_id_fkey FOREIGN KEY(config_id) REFERENCES lms.l_schedule_config(id),
    CONSTRAINT l_schedule_day_template_config_group_id_fkey FOREIGN KEY(config_group_id) REFERENCES lms.l_schedule_config_group(id) ON DELETE CASCADE,
    CONSTRAINT l_schedule_day_template_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT chk_day_template_time_range CHECK ((start_time < end_time)),
    CONSTRAINT l_schedule_day_template_session_minutes_check CHECK ((session_minutes > 0))
);
CREATE UNIQUE INDEX uq_schedule_day_template ON lms.l_schedule_day_template USING btree (config_group_id, day_of_week);
CREATE INDEX idx_schedule_day_template_config ON lms.l_schedule_day_template USING btree (config_id, config_group_id, day_of_week);

CREATE TABLE l_schedule_break(
    id SERIAL NOT NULL,
    day_template_id integer NOT NULL,
    break_start time without time zone NOT NULL,
    break_end time without time zone NOT NULL,
    label text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_break_day_template_id_fkey FOREIGN KEY(day_template_id) REFERENCES lms.l_schedule_day_template(id) ON DELETE CASCADE,
    CONSTRAINT chk_schedule_break_time_range CHECK ((break_start < break_end))
);
CREATE INDEX idx_schedule_break_day_template ON lms.l_schedule_break USING btree (day_template_id, break_start, break_end);

CREATE TABLE l_time_slot(
    id SERIAL NOT NULL,
    config_id integer NOT NULL,
    config_group_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    slot_no integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_break boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_time_slot_config_id_fkey FOREIGN KEY(config_id) REFERENCES lms.l_schedule_config(id),
    CONSTRAINT l_time_slot_config_group_id_fkey FOREIGN KEY(config_group_id) REFERENCES lms.l_schedule_config_group(id) ON DELETE CASCADE,
    CONSTRAINT l_time_slot_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT l_time_slot_slot_no_check CHECK ((slot_no > 0)),
    CONSTRAINT chk_time_slot_range CHECK ((start_time < end_time))
);
CREATE UNIQUE INDEX uq_time_slot_slot_no ON lms.l_time_slot USING btree (config_group_id, day_of_week, slot_no);
CREATE UNIQUE INDEX uq_time_slot_range ON lms.l_time_slot USING btree (config_group_id, day_of_week, start_time, end_time);
CREATE INDEX idx_time_slot_config_day ON lms.l_time_slot USING btree (config_id, config_group_id, day_of_week, slot_no);

CREATE TABLE l_teaching_load(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    class_id integer NOT NULL,
    subject_id integer NOT NULL,
    teacher_id integer NOT NULL,
    weekly_sessions integer NOT NULL,
    max_sessions_per_meeting integer NOT NULL DEFAULT 2,
    require_different_days boolean NOT NULL DEFAULT true,
    allow_same_day_with_gap boolean NOT NULL DEFAULT true,
    minimum_gap_slots integer NOT NULL DEFAULT 4,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teaching_load_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_teaching_load_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_teaching_load_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id),
    CONSTRAINT l_teaching_load_subject_id_fkey FOREIGN KEY(subject_id) REFERENCES public.a_subject(id),
    CONSTRAINT l_teaching_load_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_teaching_load_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_teaching_load_weekly_sessions_check CHECK ((weekly_sessions > 0)),
    CONSTRAINT l_teaching_load_max_sessions_per_meeting_check CHECK ((max_sessions_per_meeting > 0)),
    CONSTRAINT l_teaching_load_minimum_gap_slots_check CHECK ((minimum_gap_slots >= 0))
);
CREATE UNIQUE INDEX uq_teaching_load ON lms.l_teaching_load USING btree (periode_id, class_id, subject_id, teacher_id);
CREATE INDEX idx_teaching_load_lookup ON lms.l_teaching_load USING btree (periode_id, homebase_id, class_id, teacher_id);

CREATE TABLE l_teaching_load_grade_rule(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    grade_id integer NOT NULL,
    subject_id integer NOT NULL,
    weekly_sessions integer NOT NULL,
    max_sessions_per_meeting integer NOT NULL DEFAULT 2,
    require_different_days boolean NOT NULL DEFAULT true,
    allow_same_day_with_gap boolean NOT NULL DEFAULT true,
    minimum_gap_slots integer NOT NULL DEFAULT 4,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teaching_load_grade_rule_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_teaching_load_grade_rule_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_teaching_load_grade_rule_grade_id_fkey FOREIGN KEY(grade_id) REFERENCES public.a_grade(id),
    CONSTRAINT l_teaching_load_grade_rule_subject_id_fkey FOREIGN KEY(subject_id) REFERENCES public.a_subject(id),
    CONSTRAINT l_teaching_load_grade_rule_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_teaching_load_grade_rule_max_sessions_per_meeting_check CHECK ((max_sessions_per_meeting > 0)),
    CONSTRAINT l_teaching_load_grade_rule_weekly_sessions_check CHECK ((weekly_sessions > 0)),
    CONSTRAINT l_teaching_load_grade_rule_minimum_gap_slots_check CHECK ((minimum_gap_slots >= 0))
);
CREATE UNIQUE INDEX uq_teaching_load_grade_rule ON lms.l_teaching_load_grade_rule USING btree (homebase_id, periode_id, grade_id, subject_id);
CREATE INDEX idx_teaching_load_grade_rule_lookup ON lms.l_teaching_load_grade_rule USING btree (periode_id, homebase_id, grade_id, subject_id);

CREATE TABLE l_teacher_unavailability(
    id SERIAL NOT NULL,
    teacher_id integer NOT NULL,
    periode_id integer NOT NULL,
    day_of_week smallint,
    specific_date date,
    start_time time without time zone,
    end_time time without time zone,
    reason text,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teacher_unavailability_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_teacher_unavailability_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_teacher_unavailability_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_teacher_unavailability_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT chk_unavailability_scope CHECK (((day_of_week IS NOT NULL) OR (specific_date IS NOT NULL))),
    CONSTRAINT chk_unavailability_time_pair CHECK ((((start_time IS NULL) AND (end_time IS NULL)) OR ((start_time IS NOT NULL) AND (end_time IS NOT NULL) AND (start_time < end_time))))
);
CREATE INDEX idx_teacher_unavailability_lookup ON lms.l_teacher_unavailability USING btree (teacher_id, periode_id, day_of_week, specific_date);

CREATE TABLE l_schedule_activity(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    config_id integer NOT NULL,
    name text NOT NULL,
    day_of_week smallint NOT NULL,
    slot_start_id integer NOT NULL,
    slot_count integer NOT NULL,
    scope_type varchar(30) NOT NULL DEFAULT 'all_classes',
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_activity_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_schedule_activity_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_schedule_activity_config_id_fkey FOREIGN KEY(config_id) REFERENCES lms.l_schedule_config(id),
    CONSTRAINT l_schedule_activity_slot_start_id_fkey FOREIGN KEY(slot_start_id) REFERENCES lms.l_time_slot(id),
    CONSTRAINT l_schedule_activity_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_schedule_activity_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT l_schedule_activity_slot_count_check CHECK ((slot_count > 0)),
    CONSTRAINT l_schedule_activity_scope_type_check CHECK (((scope_type)::text = ANY ((ARRAY['all_classes'::character varying, 'teaching_load'::character varying])::text[])))
);
CREATE INDEX idx_schedule_activity_lookup ON lms.l_schedule_activity USING btree (homebase_id, periode_id, config_id, day_of_week, is_active);

CREATE TABLE l_schedule_activity_target(
    id SERIAL NOT NULL,
    activity_id integer NOT NULL,
    teaching_load_id integer NOT NULL,
    teacher_id integer NOT NULL,
    subject_id integer NOT NULL,
    class_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_activity_target_activity_id_fkey FOREIGN KEY(activity_id) REFERENCES lms.l_schedule_activity(id) ON DELETE CASCADE,
    CONSTRAINT l_schedule_activity_target_teaching_load_id_fkey FOREIGN KEY(teaching_load_id) REFERENCES lms.l_teaching_load(id),
    CONSTRAINT l_schedule_activity_target_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_schedule_activity_target_subject_id_fkey FOREIGN KEY(subject_id) REFERENCES public.a_subject(id),
    CONSTRAINT l_schedule_activity_target_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id)
);
CREATE UNIQUE INDEX uq_schedule_activity_target_pair ON lms.l_schedule_activity_target USING btree (activity_id, teaching_load_id);
CREATE INDEX idx_schedule_activity_target_lookup ON lms.l_schedule_activity_target USING btree (activity_id, class_id, teacher_id);

CREATE TABLE l_teacher_journal(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    teacher_id integer NOT NULL,
    subject_id integer NOT NULL,
    class_id integer NOT NULL,
    journal_date date NOT NULL,
    meeting_no integer NOT NULL,
    learning_material text NOT NULL,
    activity text NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teacher_journal_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_teacher_journal_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_teacher_journal_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_teacher_journal_subject_id_fkey FOREIGN KEY(subject_id) REFERENCES public.a_subject(id),
    CONSTRAINT l_teacher_journal_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id),
    CONSTRAINT l_teacher_journal_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_teacher_journal_meeting_no_check CHECK ((meeting_no > 0))
);
CREATE INDEX idx_teacher_journal_lookup ON lms.l_teacher_journal USING btree (teacher_id, subject_id, periode_id, class_id, journal_date);

ALTER TABLE lms.l_teacher_journal
    ADD COLUMN IF NOT EXISTS subject_id integer;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE constraint_schema = 'lms'
          AND table_name = 'l_teacher_journal'
          AND constraint_name = 'l_teacher_journal_subject_id_fkey'
    ) THEN
        ALTER TABLE lms.l_teacher_journal
            ADD CONSTRAINT l_teacher_journal_subject_id_fkey
            FOREIGN KEY(subject_id) REFERENCES public.a_subject(id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_teacher_journal_lookup ON lms.l_teacher_journal USING btree (teacher_id, subject_id, periode_id, class_id, journal_date);

CREATE TABLE l_schedule_entry(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    config_id integer NOT NULL,
    teaching_load_id integer NOT NULL,
    class_id integer NOT NULL,
    subject_id integer NOT NULL,
    teacher_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    slot_start_id integer NOT NULL,
    slot_count integer NOT NULL,
    meeting_no integer NOT NULL,
    source_type varchar(20) NOT NULL DEFAULT 'generated'::character varying,
    is_manual_override boolean NOT NULL DEFAULT false,
    locked boolean NOT NULL DEFAULT false,
    status varchar(20) NOT NULL DEFAULT 'draft'::character varying,
    generated_run_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_entry_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_schedule_entry_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_schedule_entry_config_id_fkey FOREIGN KEY(config_id) REFERENCES lms.l_schedule_config(id),
    CONSTRAINT l_schedule_entry_teaching_load_id_fkey FOREIGN KEY(teaching_load_id) REFERENCES lms.l_teaching_load(id),
    CONSTRAINT l_schedule_entry_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id),
    CONSTRAINT l_schedule_entry_subject_id_fkey FOREIGN KEY(subject_id) REFERENCES public.a_subject(id),
    CONSTRAINT l_schedule_entry_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_schedule_entry_slot_start_id_fkey FOREIGN KEY(slot_start_id) REFERENCES lms.l_time_slot(id),
    CONSTRAINT l_schedule_entry_generated_run_id_fkey FOREIGN KEY(generated_run_id) REFERENCES lms.l_schedule_generation_run(id),
    CONSTRAINT l_schedule_entry_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_schedule_entry_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT l_schedule_entry_slot_count_check CHECK ((slot_count > 0)),
    CONSTRAINT l_schedule_entry_meeting_no_check CHECK ((meeting_no > 0)),
    CONSTRAINT l_schedule_entry_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['generated'::character varying, 'manual'::character varying])::text[]))),
    CONSTRAINT l_schedule_entry_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))
);
CREATE UNIQUE INDEX uq_schedule_entry_meeting ON lms.l_schedule_entry USING btree (config_id, teaching_load_id, meeting_no);
CREATE INDEX idx_schedule_entry_lookup ON lms.l_schedule_entry USING btree (periode_id, homebase_id, config_id, day_of_week, class_id, teacher_id);

CREATE TABLE l_schedule_entry_history(
    id SERIAL NOT NULL,
    schedule_entry_id integer,
    action_type varchar(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_entry_history_schedule_entry_id_fkey FOREIGN KEY(schedule_entry_id) REFERENCES lms.l_schedule_entry(id),
    CONSTRAINT l_schedule_entry_history_changed_by_fkey FOREIGN KEY(changed_by) REFERENCES public.u_users(id),
    CONSTRAINT l_schedule_entry_history_action_type_check CHECK (((action_type)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying])::text[])))
);

CREATE TABLE l_schedule_entry_slot(
    id SERIAL NOT NULL,
    schedule_entry_id integer NOT NULL,
    periode_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    slot_id integer NOT NULL,
    class_id integer NOT NULL,
    teacher_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_entry_slot_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_schedule_entry_slot_schedule_entry_id_fkey FOREIGN KEY(schedule_entry_id) REFERENCES lms.l_schedule_entry(id),
    CONSTRAINT l_schedule_entry_slot_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_schedule_entry_slot_slot_id_fkey FOREIGN KEY(slot_id) REFERENCES lms.l_time_slot(id),
    CONSTRAINT l_schedule_entry_slot_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id),
    CONSTRAINT l_schedule_entry_slot_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7)))
);
CREATE UNIQUE INDEX uq_schedule_entry_slot_pair ON lms.l_schedule_entry_slot USING btree (schedule_entry_id, slot_id);
CREATE UNIQUE INDEX uq_schedule_class_slot ON lms.l_schedule_entry_slot USING btree (periode_id, class_id, day_of_week, slot_id);
CREATE UNIQUE INDEX uq_schedule_teacher_slot ON lms.l_schedule_entry_slot USING btree (periode_id, teacher_id, day_of_week, slot_id);
CREATE INDEX idx_schedule_entry_slot_lookup ON lms.l_schedule_entry_slot USING btree (periode_id, day_of_week, slot_id, class_id, teacher_id);

CREATE TABLE l_duty_assignment(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    "date" date NOT NULL,
    slot_id integer,
    duty_teacher_id integer NOT NULL,
    assigned_by integer,
    note text,
    report_note text,
    status varchar(20) NOT NULL DEFAULT 'assigned'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_duty_assignment_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_duty_assignment_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_duty_assignment_slot_id_fkey FOREIGN KEY(slot_id) REFERENCES lms.l_time_slot(id),
    CONSTRAINT l_duty_assignment_duty_teacher_id_fkey FOREIGN KEY(duty_teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_duty_assignment_assigned_by_fkey FOREIGN KEY(assigned_by) REFERENCES public.u_users(id),
    CONSTRAINT l_duty_assignment_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'done'::character varying, 'cancelled'::character varying])::text[])))
);
CREATE INDEX idx_duty_assignment_lookup ON lms.l_duty_assignment USING btree (homebase_id, periode_id, date, duty_teacher_id);
CREATE UNIQUE INDEX uq_duty_assignment_daily_teacher ON lms.l_duty_assignment USING btree (homebase_id, periode_id, date, duty_teacher_id) WHERE ((status)::text <> 'cancelled'::text);
ALTER TABLE lms.l_duty_assignment ADD COLUMN IF NOT EXISTS report_note text;

CREATE TABLE l_teacher_session_log(
    id SERIAL NOT NULL,
    schedule_entry_id integer,
    class_id integer NOT NULL,
    "date" date NOT NULL,
    teacher_id integer NOT NULL,
    duty_assignment_id integer,
    checkin_at timestamp without time zone,
    checkout_at timestamp without time zone,
    checkin_by integer,
    checkout_by integer,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teacher_session_log_schedule_entry_id_fkey FOREIGN KEY(schedule_entry_id) REFERENCES lms.l_schedule_entry(id),
    CONSTRAINT l_teacher_session_log_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id),
    CONSTRAINT l_teacher_session_log_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_teacher_session_log_duty_assignment_id_fkey FOREIGN KEY(duty_assignment_id) REFERENCES lms.l_duty_assignment(id),
    CONSTRAINT l_teacher_session_log_checkin_by_fkey FOREIGN KEY(checkin_by) REFERENCES public.u_users(id),
    CONSTRAINT l_teacher_session_log_checkout_by_fkey FOREIGN KEY(checkout_by) REFERENCES public.u_users(id),
    CONSTRAINT chk_teacher_session_time_order CHECK (((checkout_at IS NULL) OR (checkin_at IS NULL) OR (checkout_at >= checkin_at)))
);
CREATE UNIQUE INDEX uq_teacher_session_daily ON lms.l_teacher_session_log USING btree (date, teacher_id, class_id);
CREATE INDEX idx_teacher_session_log_lookup ON lms.l_teacher_session_log USING btree (date, teacher_id, class_id, schedule_entry_id);

CREATE TABLE l_daily_absence_report(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    "date" date NOT NULL,
    reporter_teacher_id integer NOT NULL,
    target_type varchar(20) NOT NULL,
    target_user_id integer NOT NULL,
    class_id integer,
    slot_id integer,
    reason text,
    follow_up text,
    status varchar(20) NOT NULL DEFAULT 'open'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_daily_absence_report_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_daily_absence_report_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_daily_absence_report_reporter_teacher_id_fkey FOREIGN KEY(reporter_teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_daily_absence_report_target_user_id_fkey FOREIGN KEY(target_user_id) REFERENCES public.u_users(id),
    CONSTRAINT l_daily_absence_report_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id),
    CONSTRAINT l_daily_absence_report_slot_id_fkey FOREIGN KEY(slot_id) REFERENCES lms.l_time_slot(id),
    CONSTRAINT l_daily_absence_report_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['teacher'::character varying, 'student'::character varying])::text[]))),
    CONSTRAINT l_daily_absence_report_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'closed'::character varying])::text[])))
);
CREATE INDEX idx_daily_absence_report_lookup ON lms.l_daily_absence_report USING btree (homebase_id, periode_id, date, target_type, target_user_id);

CREATE TABLE l_task(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    subject_id integer NOT NULL,
    chapter_id integer NOT NULL,
    teacher_id integer NOT NULL,
    title text NOT NULL,
    instruction text NOT NULL,
    deadline_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_task_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_task_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_task_subject_id_fkey FOREIGN KEY(subject_id) REFERENCES public.a_subject(id),
    CONSTRAINT l_task_chapter_id_fkey FOREIGN KEY(chapter_id) REFERENCES public.l_chapter(id),
    CONSTRAINT l_task_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_task_title_check CHECK (length(btrim(title)) > 0),
    CONSTRAINT l_task_instruction_check CHECK (length(btrim(instruction)) > 0)
);
CREATE INDEX idx_task_teacher_subject ON lms.l_task USING btree (teacher_id, subject_id, deadline_at ASC, created_at DESC);
CREATE INDEX idx_task_homebase_periode ON lms.l_task USING btree (homebase_id, periode_id, deadline_at ASC);
CREATE INDEX idx_task_chapter_lookup ON lms.l_task USING btree (chapter_id, deadline_at ASC);

CREATE TABLE l_task_class(
    id SERIAL NOT NULL,
    task_id integer NOT NULL,
    class_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_task_class_task_id_fkey FOREIGN KEY(task_id) REFERENCES lms.l_task(id) ON DELETE CASCADE,
    CONSTRAINT l_task_class_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id)
);
CREATE UNIQUE INDEX uq_task_class_pair ON lms.l_task_class USING btree (task_id, class_id);
CREATE INDEX idx_task_class_lookup ON lms.l_task_class USING btree (class_id, task_id);

CREATE TABLE l_task_submission(
    id SERIAL NOT NULL,
    task_id integer NOT NULL,
    student_id integer NOT NULL,
    file_url text NOT NULL,
    file_name text NOT NULL,
    file_mime varchar(120),
    submitted_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_task_submission_task_id_fkey FOREIGN KEY(task_id) REFERENCES lms.l_task(id) ON DELETE CASCADE,
    CONSTRAINT l_task_submission_student_id_fkey FOREIGN KEY(student_id) REFERENCES public.u_students(user_id),
    CONSTRAINT l_task_submission_file_url_check CHECK (length(btrim(file_url)) > 0),
    CONSTRAINT l_task_submission_file_name_check CHECK (length(btrim(file_name)) > 0)
);
CREATE UNIQUE INDEX uq_task_submission_student ON lms.l_task_submission USING btree (task_id, student_id);
CREATE INDEX idx_task_submission_student_lookup ON lms.l_task_submission USING btree (student_id, submitted_at DESC);
CREATE INDEX idx_task_submission_task_lookup ON lms.l_task_submission USING btree (task_id, submitted_at DESC);

ALTER TABLE lms.l_schedule_config
    ADD COLUMN IF NOT EXISTS name text,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT false;

ALTER TABLE lms.l_schedule_activity
    ADD COLUMN IF NOT EXISTS config_id integer;

ALTER TABLE lms.l_schedule_day_template
    ADD COLUMN IF NOT EXISTS config_group_id integer;

ALTER TABLE lms.l_schedule_entry
    ADD COLUMN IF NOT EXISTS config_id integer;

ALTER TABLE lms.l_time_slot
    ADD COLUMN IF NOT EXISTS config_group_id integer;

UPDATE lms.l_schedule_config
SET name = 'Jadwal Utama'
WHERE COALESCE(btrim(name), '') = '';

WITH numbered_config AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY homebase_id, periode_id
            ORDER BY created_at ASC NULLS LAST, id ASC
        ) AS row_no
    FROM lms.l_schedule_config
)
UPDATE lms.l_schedule_config cfg
SET name = CASE
    WHEN numbered_config.row_no = 1 THEN 'Jadwal Utama'
    ELSE 'Jadwal ' || numbered_config.row_no
END
FROM numbered_config
WHERE cfg.id = numbered_config.id
  AND COALESCE(btrim(cfg.name), '') = '';

WITH missing_active AS (
    SELECT
        homebase_id,
        periode_id,
        MIN(id) AS activate_id
    FROM lms.l_schedule_config
    GROUP BY homebase_id, periode_id
    HAVING BOOL_OR(COALESCE(is_active, false)) = false
)
UPDATE lms.l_schedule_config cfg
SET is_active = true
FROM missing_active
WHERE cfg.id = missing_active.activate_id;

INSERT INTO lms.l_schedule_config_group (config_id, name, description, sort_order, is_default)
SELECT
    cfg.id,
    'Shift Pagi',
    'Shift belajar pagi hasil migrasi tahap 6.',
    1,
    true
FROM lms.l_schedule_config cfg
WHERE NOT EXISTS (
    SELECT 1
    FROM lms.l_schedule_config_group grp
    WHERE grp.config_id = cfg.id
      AND grp.is_default = true
);

UPDATE lms.l_schedule_config_group
SET name = 'Shift Pagi',
    description = COALESCE(NULLIF(description, ''), 'Shift belajar pagi hasil migrasi tahap 6.'),
    sort_order = 1,
    is_default = true,
    updated_at = CURRENT_TIMESTAMP
WHERE is_default = true
  AND (
    COALESCE(btrim(name), '') = ''
    OR lower(btrim(name)) = 'semua kelas'
    OR lower(btrim(name)) = 'shift pagi'
  );

INSERT INTO lms.l_schedule_config_group (config_id, name, description, sort_order, is_default)
SELECT
    cfg.id,
    'Shift Siang',
    'Shift belajar siang hasil migrasi tahap 6.',
    2,
    false
FROM lms.l_schedule_config cfg
WHERE NOT EXISTS (
    SELECT 1
    FROM lms.l_schedule_config_group grp
    WHERE grp.config_id = cfg.id
      AND lower(btrim(grp.name)) = 'shift siang'
);

UPDATE lms.l_schedule_day_template dt
SET config_group_id = grp.id
FROM lms.l_schedule_config_group grp
WHERE grp.config_id = dt.config_id
  AND grp.is_default = true
  AND dt.config_group_id IS NULL;

UPDATE lms.l_time_slot ts
SET config_group_id = grp.id
FROM lms.l_schedule_config_group grp
WHERE grp.config_id = ts.config_id
  AND grp.is_default = true
  AND ts.config_group_id IS NULL;

UPDATE lms.l_schedule_activity act
SET config_id = ts.config_id
FROM lms.l_time_slot ts
WHERE ts.id = act.slot_start_id
  AND act.config_id IS NULL;

WITH single_config_per_period AS (
    SELECT
        homebase_id,
        periode_id,
        MIN(id) AS config_id
    FROM lms.l_schedule_config
    GROUP BY homebase_id, periode_id
    HAVING COUNT(*) = 1
)
UPDATE lms.l_schedule_activity act
SET config_id = sc.config_id
FROM single_config_per_period sc
WHERE act.homebase_id = sc.homebase_id
  AND act.periode_id = sc.periode_id
  AND act.config_id IS NULL;

UPDATE lms.l_schedule_entry entry
SET config_id = ts.config_id
FROM lms.l_time_slot ts
WHERE ts.id = entry.slot_start_id
  AND entry.config_id IS NULL;

UPDATE lms.l_schedule_entry entry
SET config_id = run.config_id
FROM lms.l_schedule_generation_run run
WHERE run.id = entry.generated_run_id
  AND entry.config_id IS NULL;

WITH single_config_per_period AS (
    SELECT
        homebase_id,
        periode_id,
        MIN(id) AS config_id
    FROM lms.l_schedule_config
    GROUP BY homebase_id, periode_id
    HAVING COUNT(*) = 1
)
UPDATE lms.l_schedule_entry entry
SET config_id = sc.config_id
FROM single_config_per_period sc
WHERE entry.homebase_id = sc.homebase_id
  AND entry.periode_id = sc.periode_id
  AND entry.config_id IS NULL;

INSERT INTO lms.l_schedule_config_group_class (config_group_id, class_id)
SELECT
    grp.id,
    cls.id
FROM lms.l_schedule_config cfg
JOIN lms.l_schedule_config_group grp
  ON grp.config_id = cfg.id
 AND grp.is_default = true
JOIN public.a_class cls
  ON cls.homebase_id = cfg.homebase_id
 AND COALESCE(cls.is_active, true) = true
WHERE NOT EXISTS (
    SELECT 1
    FROM lms.l_schedule_config_group_class gcc
    WHERE gcc.config_group_id = grp.id
      AND gcc.class_id = cls.id
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'lms'
          AND table_name = 'l_schedule_day_template'
          AND column_name = 'config_group_id'
          AND is_nullable = 'YES'
    ) AND NOT EXISTS (
        SELECT 1
        FROM lms.l_schedule_day_template
        WHERE config_group_id IS NULL
    ) THEN
        EXECUTE 'ALTER TABLE lms.l_schedule_day_template ALTER COLUMN config_group_id SET NOT NULL';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'lms'
          AND table_name = 'l_time_slot'
          AND column_name = 'config_group_id'
          AND is_nullable = 'YES'
    ) AND NOT EXISTS (
        SELECT 1
        FROM lms.l_time_slot
        WHERE config_group_id IS NULL
    ) THEN
        EXECUTE 'ALTER TABLE lms.l_time_slot ALTER COLUMN config_group_id SET NOT NULL';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'lms'
          AND table_name = 'l_schedule_activity'
          AND column_name = 'config_id'
          AND is_nullable = 'YES'
    ) AND NOT EXISTS (
        SELECT 1
        FROM lms.l_schedule_activity
        WHERE config_id IS NULL
    ) THEN
        EXECUTE 'ALTER TABLE lms.l_schedule_activity ALTER COLUMN config_id SET NOT NULL';
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'lms'
          AND table_name = 'l_schedule_entry'
          AND column_name = 'config_id'
          AND is_nullable = 'YES'
    ) AND NOT EXISTS (
        SELECT 1
        FROM lms.l_schedule_entry
        WHERE config_id IS NULL
    ) THEN
        EXECUTE 'ALTER TABLE lms.l_schedule_entry ALTER COLUMN config_id SET NOT NULL';
    END IF;
END $$;


DROP INDEX IF EXISTS lms.uq_schedule_day_template;
DROP INDEX IF EXISTS lms.idx_schedule_day_template_config;
DROP INDEX IF EXISTS lms.uq_time_slot_slot_no;
DROP INDEX IF EXISTS lms.uq_time_slot_range;
DROP INDEX IF EXISTS lms.idx_time_slot_config_day;
DROP INDEX IF EXISTS lms.idx_schedule_activity_lookup;
DROP INDEX IF EXISTS lms.uq_schedule_entry_meeting;
DROP INDEX IF EXISTS lms.idx_schedule_entry_lookup;

CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_day_template ON lms.l_schedule_day_template USING btree (config_group_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_schedule_day_template_config ON lms.l_schedule_day_template USING btree (config_id, config_group_id, day_of_week);
CREATE UNIQUE INDEX IF NOT EXISTS uq_time_slot_slot_no ON lms.l_time_slot USING btree (config_group_id, day_of_week, slot_no);
CREATE UNIQUE INDEX IF NOT EXISTS uq_time_slot_range ON lms.l_time_slot USING btree (config_group_id, day_of_week, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_time_slot_config_day ON lms.l_time_slot USING btree (config_id, config_group_id, day_of_week, slot_no);
CREATE INDEX IF NOT EXISTS idx_schedule_activity_lookup ON lms.l_schedule_activity USING btree (homebase_id, periode_id, config_id, day_of_week, is_active);
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_entry_meeting ON lms.l_schedule_entry USING btree (config_id, teaching_load_id, meeting_no);
CREATE INDEX IF NOT EXISTS idx_schedule_entry_lookup ON lms.l_schedule_entry USING btree (periode_id, homebase_id, config_id, day_of_week, class_id, teacher_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_config_active_periode ON lms.l_schedule_config USING btree (homebase_id, periode_id) WHERE (is_active = true);
CREATE INDEX IF NOT EXISTS idx_schedule_config_lookup ON lms.l_schedule_config USING btree (homebase_id, periode_id, is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_config_group_lookup ON lms.l_schedule_config_group USING btree (config_id, sort_order, id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_config_group_default ON lms.l_schedule_config_group USING btree (config_id) WHERE (is_default = true);
CREATE UNIQUE INDEX IF NOT EXISTS uq_schedule_config_group_class ON lms.l_schedule_config_group_class USING btree (config_group_id, class_id);

CREATE TABLE IF NOT EXISTS lms.l_point_config(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    show_balance boolean NOT NULL DEFAULT false,
    allow_homeroom_manage boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_point_config_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_point_config_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_point_config_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_point_config_homebase_periode ON lms.l_point_config USING btree (homebase_id, periode_id);
CREATE INDEX IF NOT EXISTS idx_point_config_lookup ON lms.l_point_config USING btree (homebase_id, periode_id, show_balance);

CREATE TABLE IF NOT EXISTS lms.l_point_rule(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    name text NOT NULL,
    point_type varchar(20) NOT NULL,
    point_value integer NOT NULL,
    description text,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_point_rule_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_point_rule_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_point_rule_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_point_rule_name_check CHECK (length(btrim(name)) > 0),
    CONSTRAINT l_point_rule_type_check CHECK (((point_type)::text = ANY ((ARRAY['reward'::character varying, 'punishment'::character varying])::text[]))),
    CONSTRAINT l_point_rule_value_check CHECK (((point_value >= 1) AND (point_value <= 100)))
);
CREATE INDEX IF NOT EXISTS idx_point_rule_lookup ON lms.l_point_rule USING btree (homebase_id, periode_id, point_type, is_active, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_point_rule_name_periode ON lms.l_point_rule USING btree (homebase_id, periode_id, lower(btrim(name)));

CREATE TABLE IF NOT EXISTS lms.l_point_entry(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    student_id integer NOT NULL,
    class_id integer NOT NULL,
    rule_id integer NOT NULL,
    point_type varchar(20) NOT NULL,
    point_value integer NOT NULL,
    title_snapshot text NOT NULL,
    description text,
    entry_date date NOT NULL DEFAULT CURRENT_DATE,
    given_by integer NOT NULL,
    updated_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_point_entry_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_point_entry_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_point_entry_student_id_fkey FOREIGN KEY(student_id) REFERENCES public.u_students(user_id),
    CONSTRAINT l_point_entry_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id),
    CONSTRAINT l_point_entry_rule_id_fkey FOREIGN KEY(rule_id) REFERENCES lms.l_point_rule(id),
    CONSTRAINT l_point_entry_given_by_fkey FOREIGN KEY(given_by) REFERENCES public.u_users(id),
    CONSTRAINT l_point_entry_updated_by_fkey FOREIGN KEY(updated_by) REFERENCES public.u_users(id),
    CONSTRAINT l_point_entry_title_snapshot_check CHECK (length(btrim(title_snapshot)) > 0),
    CONSTRAINT l_point_entry_type_check CHECK (((point_type)::text = ANY ((ARRAY['reward'::character varying, 'punishment'::character varying])::text[]))),
    CONSTRAINT l_point_entry_value_check CHECK (((point_value >= 1) AND (point_value <= 100)))
);
CREATE INDEX IF NOT EXISTS idx_point_entry_student_period ON lms.l_point_entry USING btree (student_id, periode_id, entry_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_entry_class_period ON lms.l_point_entry USING btree (class_id, periode_id, entry_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_point_entry_rule_lookup ON lms.l_point_entry USING btree (rule_id, point_type, entry_date DESC);
CREATE INDEX IF NOT EXISTS idx_point_entry_homebase_period ON lms.l_point_entry USING btree (homebase_id, periode_id, class_id, student_id);
CREATE INDEX IF NOT EXISTS idx_point_entry_given_by ON lms.l_point_entry USING btree (given_by, periode_id, entry_date DESC);

CREATE OR REPLACE VIEW lms.v_point_student_summary AS
SELECT
    pe.homebase_id,
    pe.periode_id,
    pe.class_id,
    pe.student_id,
    COUNT(*) AS total_entries,
    COUNT(*) FILTER (WHERE pe.point_type::text = 'reward'::text) AS reward_entries,
    COUNT(*) FILTER (WHERE pe.point_type::text = 'punishment'::text) AS punishment_entries,
    COALESCE(SUM(pe.point_value) FILTER (WHERE pe.point_type::text = 'reward'::text), 0) AS total_reward,
    COALESCE(SUM(pe.point_value) FILTER (WHERE pe.point_type::text = 'punishment'::text), 0) AS total_punishment,
    COALESCE(SUM(
        CASE
            WHEN pe.point_type::text = 'reward'::text THEN pe.point_value
            WHEN pe.point_type::text = 'punishment'::text THEN -pe.point_value
            ELSE 0
        END
    ), 0) AS balance
FROM lms.l_point_entry pe
GROUP BY pe.homebase_id, pe.periode_id, pe.class_id, pe.student_id;

SET search_path TO public;
COMMIT;

ROLLBACK
