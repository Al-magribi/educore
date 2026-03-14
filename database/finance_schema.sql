-- Membuat skema baru untuk memisahkan semua tabel keuangan
CREATE SCHEMA finance;

SET search_path TO finance, public;

-- =================================================================================
-- Fitur: SPP (Tution Fee)
-- =================================================================================

-- Tabel master untuk menentukan tarif SPP berdasarkan jenjang/tingkat dan periode ajaran.
-- Memungkinkan tarif yang berbeda untuk setiap tingkat di setiap periode.
CREATE TABLE finance.spp_rates (
    rate_id SERIAL PRIMARY KEY,
    grade_id INT NOT NULL, -- FK ke tabel master jenjang/tingkat (misal: public.grades)
    periode_id INT NOT NULL, -- FK ke tabel master periode (misal: public.periodes)
    amount DECIMAL(12, 2) NOT NULL,
    description VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk men-generate tagihan SPP untuk setiap siswa pada setiap periode pembayaran (misal: bulanan).
CREATE TABLE finance.spp_bills (
    bill_id SERIAL PRIMARY KEY,
    student_id INT NOT NULL, -- FK ke tabel master siswa (misal: public.students)
    rate_id INT NOT NULL REFERENCES finance.spp_rates(rate_id),
    billing_month INT NOT NULL, -- Bulan tagihan (1-12)
    billing_year INT NOT NULL, -- Tahun tagihan
    amount_due DECIMAL(12, 2) NOT NULL,
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- unpaid, paid, overdue
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk mencatat setiap transaksi pembayaran SPP yang dilakukan siswa.
CREATE TABLE finance.spp_payments (
    payment_id SERIAL PRIMARY KEY,
    bill_id INT NOT NULL REFERENCES finance.spp_bills(bill_id),
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    amount_paid DECIMAL(12, 2) NOT NULL,
    payment_method VARCHAR(50), -- Cash, Transfer, etc.
    processed_by INT, -- FK ke user (admin/wali kelas) yang memproses
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =================================================================================
-- Fitur: Pembayaran Lainnya (Other Payments)
-- =================================================================================

-- Tabel master untuk jenis-jenis pembayaran lain (uang gedung, buku, seragam).
CREATE TABLE finance.other_payment_types (
    type_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT
);

-- Tabel untuk menetapkan tagihan 'pembayaran lain' kepada siswa (atau per angkatan/kelas).
-- Satu tagihan di sini bisa dicicil berkali-kali.
CREATE TABLE finance.other_payment_charges (
    charge_id SERIAL PRIMARY KEY,
    type_id INT NOT NULL REFERENCES finance.other_payment_types(type_id),
    student_id INT NOT NULL, -- FK ke tabel master siswa (misal: public.students)
    amount_due DECIMAL(12, 2) NOT NULL,
    due_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'unpaid', -- unpaid, partial, paid
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabel untuk mencatat transaksi cicilan untuk 'pembayaran lain'.
CREATE TABLE finance.other_payment_installments (
    installment_id SERIAL PRIMARY KEY,
    charge_id INT NOT NULL REFERENCES finance.other_payment_charges(charge_id),
    installment_number INT NOT NULL, -- Untuk melacak ini cicilan ke-berapa
    amount_paid DECIMAL(12, 2) NOT NULL,
    payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
    payment_method VARCHAR(50),
    processed_by INT, -- FK ke user yang memproses
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


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