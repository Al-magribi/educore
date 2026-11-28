-- Penugasan wewenang guru oleh admin satuan.
-- Berlaku sampai dicabut. Satu guru boleh memegang lebih dari satu jenis.

CREATE TABLE IF NOT EXISTS public.u_staff_assignment (
    id SERIAL PRIMARY KEY,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    teacher_id integer NOT NULL REFERENCES public.u_teachers(user_id) ON DELETE CASCADE,
    assignment_type varchar(20) NOT NULL
      CHECK (assignment_type IN ('cbt', 'kurikulum', 'kesiswaan')),
    assigned_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_staff_assignment_active
ON public.u_staff_assignment (homebase_id, teacher_id, assignment_type)
WHERE (is_active = true);

CREATE INDEX IF NOT EXISTS idx_staff_assignment_teacher
ON public.u_staff_assignment (teacher_id, homebase_id, is_active);

CREATE INDEX IF NOT EXISTS idx_staff_assignment_homebase
ON public.u_staff_assignment (homebase_id, assignment_type, is_active);
