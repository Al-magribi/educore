-- Honorarium Phase 5: payroll period draft + line snapshot

CREATE TABLE IF NOT EXISTS finance.honor_payroll_period (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id INT REFERENCES public.a_periode(id) ON DELETE SET NULL,
    year INT NOT NULL CHECK (year >= 2000 AND year <= 2100),
    month INT NOT NULL CHECK (month >= 1 AND month <= 12),
    jam_mode VARCHAR(10) NOT NULL DEFAULT 'mati'
        CHECK (jam_mode IN ('mati', 'hidup')),
    status VARCHAR(20) NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'locked')),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    teaching_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (teaching_rate >= 0),
    transport_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (transport_rate >= 0),
    homeroom_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (homeroom_rate >= 0),
    grand_total NUMERIC(14, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    generated_at TIMESTAMP WITH TIME ZONE,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (homebase_id, year, month)
);

CREATE INDEX IF NOT EXISTS idx_honor_payroll_period_homebase
    ON finance.honor_payroll_period (homebase_id, year DESC, month DESC);

CREATE INDEX IF NOT EXISTS idx_honor_payroll_period_status
    ON finance.honor_payroll_period (homebase_id, status);

CREATE TABLE IF NOT EXISTS finance.honor_payroll_line (
    id BIGSERIAL PRIMARY KEY,
    payroll_id BIGINT NOT NULL REFERENCES finance.honor_payroll_period(id) ON DELETE CASCADE,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    assignment_id BIGINT REFERENCES finance.honor_assignment(id) ON DELETE SET NULL,
    unit_id BIGINT REFERENCES finance.honor_unit(id) ON DELETE SET NULL,
    position_id BIGINT REFERENCES finance.honor_position(id) ON DELETE SET NULL,
    person_type VARCHAR(20) NOT NULL
        CHECK (person_type IN ('teacher', 'staff')),
    teacher_id INT REFERENCES public.u_teachers(user_id) ON DELETE SET NULL,
    staff_id BIGINT REFERENCES finance.honor_staff(id) ON DELETE SET NULL,
    person_name VARCHAR(150) NOT NULL,
    person_nip VARCHAR(50),
    unit_name VARCHAR(100),
    unit_code VARCHAR(50),
    unit_sort_order INT NOT NULL DEFAULT 0,
    position_name VARCHAR(120),
    subjects_text TEXT,
    jam_mode VARCHAR(10) NOT NULL DEFAULT 'mati'
        CHECK (jam_mode IN ('mati', 'hidup')),
    jam_mati NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (jam_mati >= 0),
    jam_hidup NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (jam_hidup >= 0),
    jam_auto NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (jam_auto >= 0),
    jam_final NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (jam_final >= 0),
    jam_overridden BOOLEAN NOT NULL DEFAULT false,
    hadir_auto NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (hadir_auto >= 0),
    hadir_final NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (hadir_final >= 0),
    hadir_overridden BOOLEAN NOT NULL DEFAULT false,
    rp_per_jam NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (rp_per_jam >= 0),
    transport_rate NUMERIC(14, 2) NOT NULL DEFAULT 0 CHECK (transport_rate >= 0),
    is_homeroom BOOLEAN NOT NULL DEFAULT false,
    honor_mengajar NUMERIC(14, 2) NOT NULL DEFAULT 0,
    jumlah_transport NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tunjangan_wali_kelas NUMERIC(14, 2) NOT NULL DEFAULT 0,
    tunjangan_jabatan NUMERIC(14, 2) NOT NULL DEFAULT 0,
    gapok NUMERIC(14, 2) NOT NULL DEFAULT 0,
    total_penerimaan NUMERIC(14, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_honor_payroll_line_payroll
    ON finance.honor_payroll_line (payroll_id, unit_sort_order ASC, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_honor_payroll_line_assignment
    ON finance.honor_payroll_line (assignment_id);
