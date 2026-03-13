CREATE SCHEMA IF NOT EXISTS lms;
SET search_path TO lms, public;

CREATE TABLE l_schedule_config(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
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
    CONSTRAINT l_schedule_config_session_minutes_check CHECK ((session_minutes > 0)),
    CONSTRAINT l_schedule_config_max_sessions_per_meeting_check CHECK ((max_sessions_per_meeting > 0)),
    CONSTRAINT l_schedule_config_minimum_gap_slots_check CHECK ((minimum_gap_slots >= 0))
);
CREATE UNIQUE INDEX uq_schedule_config_homebase_periode ON lms.l_schedule_config USING btree (homebase_id, periode_id);

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
    day_of_week smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_school_day boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_day_template_config_id_fkey FOREIGN KEY(config_id) REFERENCES lms.l_schedule_config(id),
    CONSTRAINT l_schedule_day_template_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT chk_day_template_time_range CHECK ((start_time < end_time))
);
CREATE UNIQUE INDEX uq_schedule_day_template ON lms.l_schedule_day_template USING btree (config_id, day_of_week);
CREATE INDEX idx_schedule_day_template_config ON lms.l_schedule_day_template USING btree (config_id, day_of_week);

CREATE TABLE l_schedule_break(
    id SERIAL NOT NULL,
    day_template_id integer NOT NULL,
    break_start time without time zone NOT NULL,
    break_end time without time zone NOT NULL,
    label text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_break_day_template_id_fkey FOREIGN KEY(day_template_id) REFERENCES lms.l_schedule_day_template(id),
    CONSTRAINT chk_schedule_break_time_range CHECK ((break_start < break_end))
);
CREATE INDEX idx_schedule_break_day_template ON lms.l_schedule_break USING btree (day_template_id, break_start, break_end);

CREATE TABLE l_time_slot(
    id SERIAL NOT NULL,
    config_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    slot_no integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_break boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_time_slot_config_id_fkey FOREIGN KEY(config_id) REFERENCES lms.l_schedule_config(id),
    CONSTRAINT l_time_slot_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT l_time_slot_slot_no_check CHECK ((slot_no > 0)),
    CONSTRAINT chk_time_slot_range CHECK ((start_time < end_time))
);
CREATE UNIQUE INDEX uq_time_slot_slot_no ON lms.l_time_slot USING btree (config_id, day_of_week, slot_no);
CREATE UNIQUE INDEX uq_time_slot_range ON lms.l_time_slot USING btree (config_id, day_of_week, start_time, end_time);
CREATE INDEX idx_time_slot_config_day ON lms.l_time_slot USING btree (config_id, day_of_week, slot_no);

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

CREATE TABLE l_schedule_entry(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
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
CREATE UNIQUE INDEX uq_schedule_entry_meeting ON lms.l_schedule_entry USING btree (teaching_load_id, meeting_no);
CREATE INDEX idx_schedule_entry_lookup ON lms.l_schedule_entry USING btree (periode_id, homebase_id, day_of_week, class_id, teacher_id);

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

CREATE TABLE l_teacher_session_log(
    id SERIAL NOT NULL,
    schedule_entry_id integer NOT NULL,
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
    CONSTRAINT l_teacher_session_log_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_teacher_session_log_duty_assignment_id_fkey FOREIGN KEY(duty_assignment_id) REFERENCES lms.l_duty_assignment(id),
    CONSTRAINT l_teacher_session_log_checkin_by_fkey FOREIGN KEY(checkin_by) REFERENCES public.u_users(id),
    CONSTRAINT l_teacher_session_log_checkout_by_fkey FOREIGN KEY(checkout_by) REFERENCES public.u_users(id),
    CONSTRAINT chk_teacher_session_time_order CHECK (((checkout_at IS NULL) OR (checkin_at IS NULL) OR (checkout_at >= checkin_at)))
);
CREATE UNIQUE INDEX uq_teacher_session_daily ON lms.l_teacher_session_log USING btree (schedule_entry_id, date);
CREATE INDEX idx_teacher_session_log_lookup ON lms.l_teacher_session_log USING btree (date, teacher_id, schedule_entry_id);

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

SET search_path TO public;
