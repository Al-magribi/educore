-- Honorarium Phase 0–1: unit section (Yayasan/Guru/TU) + jabatan per unit
-- Catatan: honor_unit ≠ a_homebase. homebase_id = satuan sekolah pemilik data.

CREATE SCHEMA IF NOT EXISTS finance;

CREATE TABLE IF NOT EXISTS finance.honor_unit (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT honor_unit_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_unit_homebase_name
    ON finance.honor_unit (homebase_id, lower(trim(name)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_unit_homebase_code
    ON finance.honor_unit (homebase_id, lower(trim(code)))
    WHERE code IS NOT NULL AND length(trim(code)) > 0;

CREATE INDEX IF NOT EXISTS idx_honor_unit_homebase_sort
    ON finance.honor_unit (homebase_id, sort_order ASC, id ASC);

CREATE TABLE IF NOT EXISTS finance.honor_position (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    unit_id BIGINT NOT NULL REFERENCES finance.honor_unit(id) ON DELETE CASCADE,
    name VARCHAR(120) NOT NULL,
    allowance_amount NUMERIC(14, 2) NOT NULL DEFAULT 0
        CHECK (allowance_amount >= 0),
    base_salary NUMERIC(14, 2) NOT NULL DEFAULT 0
        CHECK (base_salary >= 0),
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT honor_position_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_position_unit_name
    ON finance.honor_position (unit_id, lower(trim(name)));

CREATE INDEX IF NOT EXISTS idx_honor_position_homebase_unit
    ON finance.honor_position (homebase_id, unit_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_honor_position_unit_active
    ON finance.honor_position (unit_id, is_active);
