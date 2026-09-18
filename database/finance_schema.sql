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
    description TEXT,
    category VARCHAR(20) NOT NULL CHECK (category IN ('spp', 'other', 'savings')),
    charge_type VARCHAR(20) NOT NULL CHECK (charge_type IN ('monthly', 'once', 'custom')),
    scope VARCHAR(20) NOT NULL DEFAULT 'grade'
      CHECK (scope IN ('grade', 'student')),
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

CREATE TABLE IF NOT EXISTS finance.fee_assignment (
    id BIGSERIAL PRIMARY KEY,
    component_id BIGINT NOT NULL REFERENCES finance.fee_component(id) ON DELETE CASCADE,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) CHECK (amount IS NULL OR amount >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (component_id, periode_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_assignment_scope
    ON finance.fee_assignment(homebase_id, periode_id, component_id, is_active);

CREATE INDEX IF NOT EXISTS idx_fee_assignment_student
    ON finance.fee_assignment(student_id, periode_id, is_active);

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
    bruto_amount NUMERIC(14, 2),
    scholarship_cover NUMERIC(14, 2) NOT NULL DEFAULT 0,
    amount NUMERIC(14, 2) GENERATED ALWAYS AS (qty * unit_amount) STORED,
    item_type VARCHAR(20) NOT NULL CHECK (item_type IN ('spp', 'other')),
    reference_type VARCHAR(30),
    reference_id BIGINT
);

ALTER TABLE finance.invoice_item
    ADD COLUMN IF NOT EXISTS bruto_amount NUMERIC(14, 2);

ALTER TABLE finance.invoice_item
    ADD COLUMN IF NOT EXISTS scholarship_cover NUMERIC(14, 2) NOT NULL DEFAULT 0;

UPDATE finance.invoice_item
SET bruto_amount = unit_amount
WHERE bruto_amount IS NULL;

CREATE INDEX IF NOT EXISTS idx_invoice_item_invoice
    ON finance.invoice_item(invoice_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_invoice_item_monthly
    ON finance.invoice_item(component_id, fee_rule_id, bill_year, bill_month, invoice_id)
    WHERE bill_month IS NOT NULL AND bill_year IS NOT NULL;

-- =================================================================================
-- Fitur: Beasiswa
-- =================================================================================

CREATE TABLE IF NOT EXISTS finance.scholarship (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    code VARCHAR(50),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scholarship_homebase
    ON finance.scholarship(homebase_id, is_active);

CREATE TABLE IF NOT EXISTS finance.scholarship_benefit (
    id BIGSERIAL PRIMARY KEY,
    scholarship_id BIGINT NOT NULL
        REFERENCES finance.scholarship(id) ON DELETE CASCADE,
    benefit_target VARCHAR(20) NOT NULL
        CHECK (benefit_target IN ('spp', 'other')),
    benefit_type VARCHAR(20) NOT NULL
        CHECK (benefit_type IN ('fixed', 'full')),
    amount NUMERIC(14, 2)
        CHECK (amount IS NULL OR amount >= 0),
    component_id BIGINT REFERENCES finance.fee_component(id) ON DELETE CASCADE,
    periode_id INT REFERENCES public.a_periode(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    CHECK (
        (benefit_type = 'full')
        OR (benefit_type = 'fixed' AND amount IS NOT NULL AND amount > 0)
    ),
    CHECK (
        (benefit_target = 'spp' AND component_id IS NULL)
        OR (benefit_target = 'other' AND component_id IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_scholarship_benefit_scholarship
    ON finance.scholarship_benefit(scholarship_id, benefit_target);

CREATE TABLE IF NOT EXISTS finance.scholarship_benefit_month (
    id BIGSERIAL PRIMARY KEY,
    benefit_id BIGINT NOT NULL
        REFERENCES finance.scholarship_benefit(id) ON DELETE CASCADE,
    periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
    month_num SMALLINT NOT NULL CHECK (month_num BETWEEN 1 AND 12),
    UNIQUE (benefit_id, periode_id, month_num)
);

CREATE INDEX IF NOT EXISTS idx_scholarship_benefit_month_lookup
    ON finance.scholarship_benefit_month(benefit_id, periode_id, month_num);

CREATE TABLE IF NOT EXISTS finance.scholarship_student (
    id BIGSERIAL PRIMARY KEY,
    scholarship_id BIGINT NOT NULL
        REFERENCES finance.scholarship(id) ON DELETE CASCADE,
    student_id INT NOT NULL
        REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT true,
    notes TEXT,
    assigned_by INT REFERENCES public.u_users(id),
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (scholarship_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_scholarship_student_lookup
    ON finance.scholarship_student(student_id, is_active);

CREATE INDEX IF NOT EXISTS idx_scholarship_student_scholarship
    ON finance.scholarship_student(scholarship_id, is_active);

CREATE TABLE IF NOT EXISTS finance.invoice_item_scholarship (
    id BIGSERIAL PRIMARY KEY,
    invoice_item_id BIGINT NOT NULL
        REFERENCES finance.invoice_item(id) ON DELETE CASCADE,
    scholarship_id BIGINT NOT NULL
        REFERENCES finance.scholarship(id) ON DELETE CASCADE,
    benefit_id BIGINT
        REFERENCES finance.scholarship_benefit(id) ON DELETE SET NULL,
    cover_amount NUMERIC(14, 2) NOT NULL CHECK (cover_amount >= 0),
    benefit_type VARCHAR(20) NOT NULL
        CHECK (benefit_type IN ('fixed', 'full')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE (invoice_item_id, scholarship_id, benefit_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_item_scholarship_item
    ON finance.invoice_item_scholarship(invoice_item_id);

CREATE INDEX IF NOT EXISTS idx_invoice_item_scholarship_scholarship
    ON finance.invoice_item_scholarship(scholarship_id);

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


-- =================================================================================
-- Fitur: Pengeluaran Operasional Satuan
-- Catatan pengeluaran admin keuangan / pusat (bukan kas kelas).
-- =================================================================================

CREATE TABLE IF NOT EXISTS finance.expense (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id INT REFERENCES public.a_periode(id) ON DELETE SET NULL,
    category VARCHAR(30) NOT NULL
      CHECK (category IN (
        'operational',
        'utilities',
        'salary',
        'maintenance',
        'activity',
        'supplies',
        'other'
      )),
    title VARCHAR(150) NOT NULL,
    description TEXT,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(20) NOT NULL DEFAULT 'cash'
      CHECK (payment_method IN ('cash', 'transfer', 'other')),
    reference_no VARCHAR(120),
    notes TEXT,
    created_by INT REFERENCES public.u_users(id),
    updated_by INT REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expense_homebase_date
    ON finance.expense(homebase_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expense_periode
    ON finance.expense(homebase_id, periode_id, expense_date DESC);

CREATE INDEX IF NOT EXISTS idx_expense_category
    ON finance.expense(homebase_id, category, expense_date DESC);


-- =================================================================================
-- Fitur: Honorarium — Unit section (Yayasan / Guru / Tata Usaha) + Jabatan
-- Catatan: honor_unit ≠ a_homebase. homebase_id = satuan sekolah pemilik data.
-- =================================================================================

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

-- =================================================================================
-- Fitur: Honorarium — Item rate (Rp/Jam, Transport, Wali Kelas, custom)
-- =================================================================================

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

-- =================================================================================
-- Fitur: Honorarium — Tendik + Assignment multi-jabatan
-- =================================================================================

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

-- =================================================================================
-- Fitur: Honorarium — Payroll period draft + line snapshot
-- =================================================================================

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
