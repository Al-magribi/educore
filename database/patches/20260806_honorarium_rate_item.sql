-- Honorarium Phase 2: item rate (Rp/Jam, Transport, Wali Kelas, custom)

CREATE TABLE IF NOT EXISTS finance.honor_rate_item (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(120) NOT NULL,
    amount NUMERIC(14, 2) NOT NULL DEFAULT 0
        CHECK (amount >= 0),
    description TEXT,
    valid_from DATE,
    valid_to DATE,
    sort_order INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CONSTRAINT honor_rate_item_code_not_blank CHECK (length(trim(code)) > 0),
    CONSTRAINT honor_rate_item_name_not_blank CHECK (length(trim(name)) > 0),
    CONSTRAINT honor_rate_item_valid_range
        CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_honor_rate_item_homebase_code
    ON finance.honor_rate_item (homebase_id, lower(trim(code)));

CREATE INDEX IF NOT EXISTS idx_honor_rate_item_homebase_sort
    ON finance.honor_rate_item (homebase_id, sort_order ASC, id ASC);

CREATE INDEX IF NOT EXISTS idx_honor_rate_item_active_window
    ON finance.honor_rate_item (homebase_id, is_active, valid_from, valid_to);
