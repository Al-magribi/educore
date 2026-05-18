-- Membuat skema baru untuk memisahkan semua tabel keuangan
CREATE SCHEMA IF NOT EXISTS finance;

SET search_path TO finance, public;

CREATE TABLE IF NOT EXISTS public.u_parent_students (
    id SERIAL PRIMARY KEY,
    parent_user_id INT NOT NULL REFERENCES public.u_users(id) ON DELETE CASCADE,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    relationship VARCHAR(50),
    is_primary BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'uq_parent_student'
          AND conrelid = 'public.u_parent_students'::regclass
    ) THEN
        ALTER TABLE public.u_parent_students
        DROP CONSTRAINT uq_parent_student;
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_u_parent_students_parent_student
    ON public.u_parent_students(parent_user_id, student_id);

-- =================================================================================
-- TABEL AKTIF: Billing & Pembayaran Final
-- Dipakai untuk SPP, pembayaran lainnya, pembayaran manual, dan Midtrans.
-- =================================================================================

CREATE TABLE IF NOT EXISTS finance.fee_component (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    name VARCHAR(120) NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('spp', 'other', 'savings')),
    charge_type VARCHAR(20) NOT NULL CHECK (charge_type IN ('monthly', 'once', 'custom')),
    is_savings BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (homebase_id, code)
);

CREATE INDEX IF NOT EXISTS idx_fee_component_homebase
    ON finance.fee_component(homebase_id);

CREATE TABLE IF NOT EXISTS finance.fee_rule (
    id BIGSERIAL PRIMARY KEY,
    component_id BIGINT NOT NULL REFERENCES finance.fee_component(id) ON DELETE CASCADE,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    grade_id INT REFERENCES public.a_grade(id) ON DELETE SET NULL,
    periode_id INT REFERENCES public.a_periode(id) ON DELETE SET NULL,
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'once', 'custom')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    valid_from DATE,
    valid_to DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (valid_to IS NULL OR valid_from IS NULL OR valid_to >= valid_from)
);

CREATE INDEX IF NOT EXISTS idx_fee_rule_lookup
    ON finance.fee_rule(homebase_id, grade_id, periode_id, component_id, is_active);

CREATE TABLE IF NOT EXISTS finance.fee_rule_month (
    id BIGSERIAL PRIMARY KEY,
    fee_rule_id BIGINT NOT NULL REFERENCES finance.fee_rule(id) ON DELETE CASCADE,
    month_num SMALLINT NOT NULL CHECK (month_num BETWEEN 1 AND 12),
    UNIQUE (fee_rule_id, month_num)
);

CREATE INDEX IF NOT EXISTS idx_fee_rule_month_rule
    ON finance.fee_rule_month(fee_rule_id);

CREATE TABLE IF NOT EXISTS finance.invoice (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id),
    student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    periode_id INT REFERENCES public.a_periode(id),
    invoice_no VARCHAR(60) NOT NULL UNIQUE,
    issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'issued'
      CHECK (status IN ('draft', 'issued', 'partial', 'paid', 'cancelled', 'expired')),
    source_type VARCHAR(20) NOT NULL
      CHECK (source_type IN ('spp', 'other', 'mixed')),
    notes TEXT,
    created_by INT NOT NULL REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_student
    ON finance.invoice(student_id, status);

CREATE TABLE IF NOT EXISTS finance.invoice_item (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES finance.invoice(id) ON DELETE CASCADE,
    component_id BIGINT NOT NULL REFERENCES finance.fee_component(id),
    fee_rule_id BIGINT REFERENCES finance.fee_rule(id),
    bill_year SMALLINT,
    bill_month SMALLINT CHECK (bill_month BETWEEN 1 AND 12),
    description TEXT,
    qty NUMERIC(12, 2) NOT NULL DEFAULT 1 CHECK (qty > 0),
    unit_amount NUMERIC(14, 2) NOT NULL CHECK (unit_amount >= 0),
    amount NUMERIC(14, 2) GENERATED ALWAYS AS (qty * unit_amount) STORED,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('spp', 'other')),
    reference_type VARCHAR(30),
    reference_id BIGINT
);

CREATE INDEX IF NOT EXISTS idx_invoice_item_invoice
    ON finance.invoice_item(invoice_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_item_monthly
    ON finance.invoice_item(component_id, fee_rule_id, bill_year, bill_month, invoice_id)
    WHERE bill_month IS NOT NULL AND bill_year IS NOT NULL;

CREATE TABLE IF NOT EXISTS finance.payment_method (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    method_type VARCHAR(20) NOT NULL CHECK (method_type IN ('manual_cash', 'manual_bank', 'midtrans')),
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.bank_account (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    payment_method_id BIGINT NOT NULL REFERENCES finance.payment_method(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_name VARCHAR(120) NOT NULL,
    account_number VARCHAR(60) NOT NULL,
    branch VARCHAR(100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.payment (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id),
    student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    payer_user_id INT NOT NULL REFERENCES public.u_users(id),
    method_id BIGINT NOT NULL REFERENCES finance.payment_method(id),
    bank_account_id BIGINT REFERENCES finance.bank_account(id),
    payment_channel VARCHAR(50),
    payment_source VARCHAR(20) NOT NULL
      CHECK (payment_source IN ('parent_manual', 'admin_manual', 'midtrans')),
    payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) NOT NULL
      CHECK (status IN ('pending', 'confirmed', 'rejected', 'expired', 'cancelled', 'refunded')),
    reference_no VARCHAR(120),
    proof_url TEXT,
    notes TEXT,
    created_by INT REFERENCES public.u_users(id),
    verified_by INT REFERENCES public.u_users(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_student
    ON finance.payment(student_id, status, payment_date DESC);

DO $$
BEGIN
    UPDATE finance.payment
    SET status = 'confirmed'
    WHERE status = 'paid';
EXCEPTION
    WHEN undefined_table THEN NULL;
    WHEN undefined_column THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS finance.payment_allocation (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL REFERENCES finance.payment(id) ON DELETE CASCADE,
    invoice_item_id BIGINT NOT NULL REFERENCES finance.invoice_item(id) ON DELETE CASCADE,
    allocated_amount NUMERIC(14, 2) NOT NULL CHECK (allocated_amount > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (payment_id, invoice_item_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_alloc_item
    ON finance.payment_allocation(invoice_item_id);

CREATE TABLE IF NOT EXISTS finance.gateway_transaction (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL UNIQUE REFERENCES finance.payment(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'midtrans',
    order_id VARCHAR(120) NOT NULL UNIQUE,
    transaction_id VARCHAR(120),
    transaction_status VARCHAR(40),
    fraud_status VARCHAR(40),
    payment_type VARCHAR(50),
    snap_token TEXT,
    snap_redirect_url TEXT,
    gross_amount NUMERIC(14, 2),
    currency VARCHAR(10) DEFAULT 'IDR',
    expiry_time TIMESTAMP WITH TIME ZONE,
    raw_response JSONB,
    webhook_payload JSONB,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS finance.payment_gateway_config (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    provider VARCHAR(30) NOT NULL DEFAULT 'midtrans',
    merchant_id VARCHAR(120) NOT NULL,
    client_key TEXT NOT NULL,
    server_key_encrypted TEXT NOT NULL,
    is_production BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    snap_enabled BOOLEAN NOT NULL DEFAULT true,
    va_fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_by INT REFERENCES public.u_users(id),
    updated_by INT REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (homebase_id, provider)
);

ALTER TABLE finance.payment_gateway_config
    ADD COLUMN IF NOT EXISTS va_fee_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS finance.finance_setting (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    officer_name VARCHAR(150),
    officer_signature_url TEXT,
    created_by INT REFERENCES public.u_users(id),
    updated_by INT REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (homebase_id)
);


-- =================================================================================
-- Fitur Aktif Non-Gateway: Tabungan Siswa
-- =================================================================================

-- Satu tabel untuk mencatat semua transaksi tabungan (setoran dan penarikan).
-- Saldo dihitung dari SUM(amount) berdasarkan tipe transaksi.
CREATE TABLE finance.savings_transactions (
    transaction_id SERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
    class_id INT NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('deposit', 'withdrawal')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    processed_by INT REFERENCES public.u_users(id),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_savings_transactions_scope
    ON finance.savings_transactions(homebase_id, periode_id, class_id, student_id, transaction_date DESC);


-- =================================================================================
-- Fitur: Uang Kas Kelas (Class Petty Cash)
-- =================================================================================

-- Menentukan siswa petugas kas per kelas dan periode aktif.
-- Role user tetap "student"; hak sebagai petugas ditentukan dari tabel ini.
CREATE TABLE finance.class_cash_officers (
    officer_id SERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
    class_id INT NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    assigned_by INT NOT NULL REFERENCES public.u_users(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (periode_id, class_id, student_id)
);

CREATE INDEX idx_class_cash_officers_scope
    ON finance.class_cash_officers(homebase_id, periode_id, class_id, is_active);

-- Ledger transaksi kas kelas per periode.
-- `student_id` diisi jika pemasukan berasal dari siswa tertentu,
-- dan bernilai NULL untuk pengeluaran umum kas kelas.
CREATE TABLE finance.class_cash_transactions (
    transaction_id SERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
    class_id INT NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
    student_id INT REFERENCES public.u_students(user_id) ON DELETE SET NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_by INT NOT NULL REFERENCES public.u_users(id) ON DELETE RESTRICT,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_class_cash_transactions_scope
    ON finance.class_cash_transactions(homebase_id, periode_id, class_id, transaction_date DESC);

CREATE INDEX idx_class_cash_transactions_student
    ON finance.class_cash_transactions(periode_id, class_id, student_id, transaction_type);
