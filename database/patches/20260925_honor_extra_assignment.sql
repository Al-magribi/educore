-- Pendapatan tambahan (insentif x kehadiran) dan tugas tambahan (insentif tetap)

ALTER TABLE finance.honor_rate_item
    ADD COLUMN IF NOT EXISTS item_kind VARCHAR(20) NOT NULL DEFAULT 'standard';

ALTER TABLE finance.honor_rate_item
    DROP CONSTRAINT IF EXISTS honor_rate_item_kind_check;

ALTER TABLE finance.honor_rate_item
    ADD CONSTRAINT honor_rate_item_kind_check
    CHECK (item_kind IN ('standard', 'extra_income', 'extra_duty'));

ALTER TABLE finance.honor_payroll_line
    ADD COLUMN IF NOT EXISTS extra_income NUMERIC(14, 2) NOT NULL DEFAULT 0;

ALTER TABLE finance.honor_payroll_line
    ADD COLUMN IF NOT EXISTS extra_duty NUMERIC(14, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS finance.honor_extra_assignment (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    rate_item_id BIGINT NOT NULL REFERENCES finance.honor_rate_item(id) ON DELETE CASCADE,
    teacher_id INT NOT NULL REFERENCES public.u_teachers(user_id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0
        CHECK (quantity >= 0),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_extra_assignment_active
    ON finance.honor_extra_assignment (rate_item_id, teacher_id)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_honor_extra_assignment_homebase
    ON finance.honor_extra_assignment (homebase_id, rate_item_id, is_active);

CREATE TABLE IF NOT EXISTS finance.honor_assignment_duty (
    assignment_id BIGINT NOT NULL REFERENCES finance.honor_assignment(id) ON DELETE CASCADE,
    rate_item_id BIGINT NOT NULL REFERENCES finance.honor_rate_item(id) ON DELETE CASCADE,
    PRIMARY KEY (assignment_id, rate_item_id)
);

ALTER TABLE finance.honor_rate_item
    DROP CONSTRAINT IF EXISTS honor_rate_item_kind_check;

ALTER TABLE finance.honor_rate_item
    ADD CONSTRAINT honor_rate_item_kind_check
    CHECK (item_kind IN ('standard', 'extra_income', 'extra_duty', 'eskul'));

CREATE TABLE IF NOT EXISTS finance.honor_eskul_assignment (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    rate_item_id BIGINT NOT NULL REFERENCES finance.honor_rate_item(id) ON DELETE CASCADE,
    person_type VARCHAR(20) NOT NULL
        CHECK (person_type IN ('teacher', 'staff')),
    teacher_id INT REFERENCES public.u_teachers(user_id) ON DELETE CASCADE,
    staff_id BIGINT REFERENCES finance.honor_staff(id) ON DELETE CASCADE,
    quantity NUMERIC(12, 2) NOT NULL DEFAULT 0
        CHECK (quantity >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT honor_eskul_assignment_person_check CHECK (
        (person_type = 'teacher' AND teacher_id IS NOT NULL AND staff_id IS NULL)
        OR (person_type = 'staff' AND staff_id IS NOT NULL AND teacher_id IS NULL)
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_eskul_assignment_teacher
    ON finance.honor_eskul_assignment (rate_item_id, teacher_id)
    WHERE person_type = 'teacher' AND teacher_id IS NOT NULL AND is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_eskul_assignment_staff
    ON finance.honor_eskul_assignment (rate_item_id, staff_id)
    WHERE person_type = 'staff' AND staff_id IS NOT NULL AND is_active = true;
