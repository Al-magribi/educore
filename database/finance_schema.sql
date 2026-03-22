-- Membuat skema baru untuk memisahkan semua tabel keuangan
CREATE SCHEMA finance;

SET search_path TO finance, public;

-- =================================================================================
-- Fitur: SPP (Tution Fee)
-- =================================================================================

-- Tarif SPP disusun per satuan, periode, dan tingkat agar nominal bisa berbeda
-- antar sekolah, tahun ajaran, dan level kelas.
CREATE TABLE finance.spp_tariff (
    id SERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
    grade_id INT NOT NULL REFERENCES public.a_grade(id) ON DELETE CASCADE,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (homebase_id, periode_id, grade_id)
);

-- Header transaksi pembayaran SPP.
CREATE TABLE finance.spp_payment_transaction (
    id SERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
    grade_id INT NOT NULL REFERENCES public.a_grade(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    total_amount NUMERIC(14, 2) NOT NULL CHECK (total_amount >= 0),
    payment_method VARCHAR(50),
    notes TEXT,
    paid_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_by INT REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Alokasi bulan yang dilunasi oleh satu transaksi.
CREATE TABLE finance.spp_payment_allocation (
    id SERIAL PRIMARY KEY,
    transaction_id INT NOT NULL REFERENCES finance.spp_payment_transaction(id) ON DELETE CASCADE,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
    student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    bill_month SMALLINT NOT NULL CHECK (bill_month BETWEEN 1 AND 12),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (student_id, periode_id, bill_month)
);

CREATE INDEX idx_spp_tariff_scope
    ON finance.spp_tariff(homebase_id, periode_id, grade_id, is_active);

CREATE INDEX idx_spp_payment_transaction_scope
    ON finance.spp_payment_transaction(homebase_id, periode_id, grade_id, student_id, paid_at DESC);

CREATE INDEX idx_spp_payment_allocation_scope
    ON finance.spp_payment_allocation(homebase_id, periode_id, bill_month, student_id);


-- =================================================================================
-- Fitur: Pembayaran Lainnya (Other Payments)
-- =================================================================================


-- =================================================================================
-- Fitur: Tabungan Siswa (Student Savings)
-- =================================================================================

-- Satu tabel untuk mencatat semua transaksi tabungan (setoran dan penarikan).
-- Saldo dihitung dari SUM(amount) berdasarkan tipe transaksi.
CREATE TABLE finance.savings_transactions (
    transaction_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL, -- FK ke tabel master siswa (misal: public.students)
    transaction_type VARCHAR(10) NOT NULL, -- 'deposit' atau 'withdrawal'
    amount DECIMAL(12, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_by INT, -- FK ke user (admin/wali kelas)
    description TEXT
);


-- =================================================================================
-- Fitur: Uang Kas Kelas (Class Petty Cash)
-- =================================================================================

-- Satu tabel untuk mencatat semua transaksi kas kelas (pemasukan dan pengeluaran).
-- Saldo dihitung dari SUM(amount) berdasarkan tipe transaksi.
CREATE TABLE finance.class_cash_transactions (
    transaction_id SERIAL PRIMARY KEY,
    class_id INT NOT NULL, -- FK ke tabel master kelas (misal: public.classes)
    transaction_type VARCHAR(10) NOT NULL, -- 'income' atau 'expense'
    amount DECIMAL(12, 2) NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processed_by INT, -- FK ke user (wali kelas)
    description TEXT NOT NULL -- Untuk mencatat keperluan pengeluaran/sumber pemasukan
);

-- =================================================================================
-- Revisi: Pembayaran Lainnya (Other Payments) multi-satuan dan cicilan
-- =================================================================================

CREATE TABLE finance.other_payment_types (
    type_id SERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
    grade_ids INT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_other_payment_types_homebase_name
    ON finance.other_payment_types(homebase_id, LOWER(name));

CREATE TABLE finance.other_payment_charges (
    charge_id SERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
    type_id INT NOT NULL REFERENCES finance.other_payment_types(type_id) ON DELETE RESTRICT,
    student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    amount_due NUMERIC(14, 2) NOT NULL CHECK (amount_due > 0),
    notes TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
      CHECK (status IN ('unpaid', 'partial', 'paid')),
    created_by INT REFERENCES public.u_users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_other_payment_charges_scope
    ON finance.other_payment_charges(homebase_id, periode_id, student_id, type_id, status);

CREATE TABLE finance.other_payment_installments (
    installment_id SERIAL PRIMARY KEY,
    charge_id INT NOT NULL REFERENCES finance.other_payment_charges(charge_id) ON DELETE CASCADE,
    installment_number INT NOT NULL DEFAULT 1,
    amount_paid NUMERIC(14, 2) NOT NULL CHECK (amount_paid > 0),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50),
    processed_by INT REFERENCES public.u_users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_other_payment_installments_charge
    ON finance.other_payment_installments(charge_id, payment_date DESC, installment_id DESC);
