-- Honorarium Phase 3: tendik (non-guru) + multi-jabatan assignment

CREATE TABLE IF NOT EXISTS finance.honor_staff (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    nip VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(120),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT honor_staff_name_not_blank CHECK (length(trim(full_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_honor_staff_homebase_name
    ON finance.honor_staff (homebase_id, lower(trim(full_name)));

CREATE INDEX IF NOT EXISTS idx_honor_staff_homebase_active
    ON finance.honor_staff (homebase_id, is_active);

CREATE TABLE IF NOT EXISTS finance.honor_assignment (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    position_id BIGINT NOT NULL REFERENCES finance.honor_position(id) ON DELETE RESTRICT,
    person_type VARCHAR(20) NOT NULL
        CHECK (person_type IN ('teacher', 'staff')),
    teacher_id INT REFERENCES public.u_teachers(user_id) ON DELETE CASCADE,
    staff_id BIGINT REFERENCES finance.honor_staff(id) ON DELETE CASCADE,
    valid_from DATE,
    valid_to DATE,
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT honor_assignment_person_check CHECK (
        (person_type = 'teacher' AND teacher_id IS NOT NULL AND staff_id IS NULL)
        OR (person_type = 'staff' AND staff_id IS NOT NULL AND teacher_id IS NULL)
    ),
    CONSTRAINT honor_assignment_valid_range
        CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_assignment_teacher_position
    ON finance.honor_assignment (position_id, teacher_id)
    WHERE person_type = 'teacher'
      AND teacher_id IS NOT NULL
      AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_assignment_staff_position
    ON finance.honor_assignment (position_id, staff_id)
    WHERE person_type = 'staff'
      AND staff_id IS NOT NULL
      AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_honor_assignment_homebase_active
    ON finance.honor_assignment (homebase_id, is_active, position_id);

CREATE INDEX IF NOT EXISTS idx_honor_assignment_teacher
    ON finance.honor_assignment (teacher_id)
    WHERE teacher_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_honor_assignment_staff
    ON finance.honor_assignment (staff_id)
    WHERE staff_id IS NOT NULL;
