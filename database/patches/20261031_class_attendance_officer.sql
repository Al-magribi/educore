CREATE TABLE IF NOT EXISTS attendance.class_attendance_officer (
    class_id integer NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
    student_id integer NOT NULL REFERENCES public.u_users(id) ON DELETE CASCADE,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    assigned_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (class_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_class_attendance_officer_student
    ON attendance.class_attendance_officer(student_id);
