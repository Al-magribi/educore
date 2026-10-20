-- Weekly duty schedule template (Mon-Fri recurring assignments)

CREATE TABLE IF NOT EXISTS lms.l_duty_schedule (
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    duty_teacher_id integer NOT NULL,
    note text,
    is_active boolean NOT NULL DEFAULT true,
    assigned_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT l_duty_schedule_homebase_id_fkey
      FOREIGN KEY (homebase_id) REFERENCES public.a_homebase (id),
    CONSTRAINT l_duty_schedule_periode_id_fkey
      FOREIGN KEY (periode_id) REFERENCES public.a_periode (id),
    CONSTRAINT l_duty_schedule_duty_teacher_id_fkey
      FOREIGN KEY (duty_teacher_id) REFERENCES public.u_teachers (user_id),
    CONSTRAINT l_duty_schedule_assigned_by_fkey
      FOREIGN KEY (assigned_by) REFERENCES public.u_users (id),
    CONSTRAINT l_duty_schedule_day_of_week_check
      CHECK ((day_of_week >= 1) AND (day_of_week <= 5))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_duty_schedule_day_teacher
ON lms.l_duty_schedule (homebase_id, periode_id, day_of_week, duty_teacher_id)
WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_duty_schedule_lookup
ON lms.l_duty_schedule (homebase_id, periode_id, day_of_week, is_active);
