-- Active: 1768875297035@@212.85.24.143@5432@lms
/* REVISI FIXEDTABLE.SQL
   Digabungkan dengan fitur dari newtable.sql
*/

-- ================================================================
-- SECTION 1: MASTER WILAYAH (Diambil dari newtable db_*)
-- Penting untuk biodata siswa
-- ================================================================

CREATE TABLE db_province (
    id char(2) PRIMARY KEY,
    name varchar(255) NOT NULL
);

CREATE TABLE db_city (
    id char(4) PRIMARY KEY,
    province_id char(2) REFERENCES db_province(id),
    name varchar(255) NOT NULL
);

CREATE TABLE db_district (
    id char(7) PRIMARY KEY,
    city_id char(4) REFERENCES db_city(id),
    name varchar(255) NOT NULL
);

CREATE TABLE db_village (
    id char(20) PRIMARY KEY,
    district_id char(7) REFERENCES db_district(id),
    name varchar(255) NOT NULL,
    postal_code varchar(10)
);

-- ================================================================
-- SECTION 2: USER MANAGEMENT (GABUNGAN u_users & db_student)
-- Menggunakan konsep Single Login (u_users) tapi detail lengkap
-- ================================================================

-- TABEL INDUK USER (Login & Role)
CREATE TABLE u_users (
    id SERIAL PRIMARY KEY,
    username text UNIQUE NOT NULL,
    password text NOT NULL,
    full_name text NOT NULL,
    role varchar(20) NOT NULL CHECK (role IN ('student', 'teacher', 'admin', 'parent', 'center')),
    img_url text, -- dari u_teachers img
    gender varchar(10), -- dari u_teachers/db_student gender
    is_active boolean DEFAULT true,
    last_login timestamp,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- PROFIL ADMIN
CREATE TABLE u_admin (
    user_id integer PRIMARY KEY REFERENCES u_users(id) ON DELETE CASCADE,
    phone text,
    email text,
    level text DEFAULT 'admin' -- dari newtable
);

ALTER TABLE u_admin 
ADD COLUMN homebase_id integer REFERENCES a_homebase(id);

-- PROFIL GURU
CREATE TABLE u_teachers (
    user_id integer PRIMARY KEY REFERENCES u_users(id) ON DELETE CASCADE,
    nip text,
    phone text,
    email text,
    homebase_id integer, -- Relasi ke a_homebase
    is_homeroom boolean DEFAULT false -- Wali kelas
);

-- PROFIL SISWA (Digabung dengan db_student dari newtable agar terpusat)
CREATE TABLE u_students (
    user_id integer PRIMARY KEY REFERENCES u_users(id) ON DELETE CASCADE,
    nis text,
    nisn text,
    homebase_id integer,
    current_class_id integer, 
    current_periode_id integer,
    birth_place text,
    birth_date date,
    height text,
    weight text,
    head_circumference text,
    order_number integer, -- anak ke berapa
    siblings_count integer,
    address text,
    province_id char(2) REFERENCES db_province(id),
    city_id char(4) REFERENCES db_city(id),
    district_id char(7) REFERENCES db_district(id),
    village_id char(20) REFERENCES db_village(id),
    postal_code text
);

-- DATA KELUARGA SISWA (Dari db_family & db_student parents info)
CREATE TABLE u_student_families (
    id SERIAL PRIMARY KEY,
    student_id integer REFERENCES u_students(user_id) ON DELETE CASCADE,
    father_nik varchar(50),
    father_name varchar(255),
    father_birth_place varchar(255),
    father_birth_date date,
    father_job text,
    father_phone text,
    mother_nik varchar(50),
    mother_name varchar(255),
    mother_birth_place varchar(255),
    mother_birth_date date,
    mother_job text,
    mother_phone text,
    guardian_name varchar(255),
    guardian_phone text
);

-- Membuat tabel khusus untuk saudara kandung
CREATE TABLE u_student_siblings (
    id SERIAL PRIMARY KEY,
    student_id integer REFERENCES u_students ON DELETE CASCADE,
    name text NOT NULL,
    gender varchar(20),
    birth_date date,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- AKUN ORANG TUA (Login khusus ortu)
CREATE TABLE u_parents (
    user_id integer PRIMARY KEY REFERENCES u_users(id) ON DELETE CASCADE,
    student_id integer REFERENCES u_students(user_id), -- Legacy primary child (opsional)
    phone text,
    email text
);

-- RELASI ORANG TUA - SISWA (multi anak per orang tua)
-- Rule:
-- 1. 1 orang tua bisa memiliki banyak siswa
-- 2. 1 siswa hanya boleh dimiliki 1 orang tua
CREATE TABLE u_parent_students (
    id SERIAL PRIMARY KEY,
    parent_user_id integer NOT NULL REFERENCES u_users(id) ON DELETE CASCADE,
    student_id integer NOT NULL REFERENCES u_students(user_id) ON DELETE CASCADE,
    homebase_id integer NOT NULL REFERENCES a_homebase(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_parent_student_pair UNIQUE (parent_user_id, student_id),
    CONSTRAINT uq_parent_student_owner UNIQUE (student_id)
);

CREATE INDEX idx_parent_students_parent_homebase
ON u_parent_students(parent_user_id, homebase_id);

CREATE INDEX idx_parent_students_homebase
ON u_parent_students(homebase_id);

-- SYSTEM LOGS (Dari table logs newtable)
CREATE TABLE sys_logs (
    id SERIAL PRIMARY KEY,
    user_id integer REFERENCES u_users(id),
    action text,
    ip_address text,
    browser text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- ================================================================
-- SECTION 3: ACADEMIC (AKADEMIK)
-- ================================================================

CREATE TABLE a_homebase (
    id SERIAL PRIMARY KEY,
    name text NOT NULL,
    description text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE a_homebase 
ADD COLUMN level VARCHAR(50);

CREATE TABLE a_periode (
    id SERIAL PRIMARY KEY,
    homebase_id integer REFERENCES a_homebase(id),
    name text NOT NULL, -- e.g., "2025/2026 Ganjil"
    is_active boolean DEFAULT false,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- JURUSAN (Dari a_major newtable) - Penting untuk SMK/MA
CREATE TABLE a_major (
    id SERIAL PRIMARY KEY,
    homebase_id integer REFERENCES a_homebase(id),
    name text NOT NULL, -- IPA, IPS, Teknik Mesin
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE a_grade (
    id SERIAL PRIMARY KEY,
    homebase_id integer REFERENCES a_homebase(id),
    name text NOT NULL -- X, XI, XII
);

CREATE TABLE a_class (
    id SERIAL PRIMARY KEY,
    homebase_id integer REFERENCES a_homebase(id),
    grade_id integer REFERENCES a_grade(id),
    major_id integer REFERENCES a_major(id), -- Tambahan dari newtable
    name text NOT NULL, -- "X IPA 1"
    homeroom_teacher_id integer REFERENCES u_teachers(user_id),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

-- KATEGORI MAPEL (Dari a_category newtable) - Muatan Nasional, Lokal, dsb
CREATE TABLE a_subject_category (
    id SERIAL PRIMARY KEY,
    homebase_id integer REFERENCES a_homebase(id),
    name text NOT NULL
);

CREATE TABLE a_subject (
    id SERIAL PRIMARY KEY,
    homebase_id integer REFERENCES a_homebase(id),
    category_id integer REFERENCES a_subject_category(id),
    name text NOT NULL,
    code text,
    kkm integer DEFAULT 75,
    cover_image text -- dari newtable
);

-- ALOKASI GURU MENGAJAR
CREATE TABLE at_subject (
    id SERIAL PRIMARY KEY,
    teacher_id integer REFERENCES u_teachers(user_id),
    subject_id integer REFERENCES a_subject(id),
    class_id integer REFERENCES a_class(id),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);


-- 1. Buat tabel Cabang (Branch) sebagai penghubung Kategori dan Mapel
CREATE TABLE a_subject_branch (
    id SERIAL PRIMARY KEY,
    homebase_id integer REFERENCES a_homebase(id), -- Agar terikat ke sekolah tertentu
    category_id integer REFERENCES a_subject_category(id) ON DELETE CASCADE,
    name text NOT NULL,
    description text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);



ALTER TABLE a_subject 
ADD COLUMN branch_id integer REFERENCES a_subject_branch(id) ON DELETE CASCADE;

-- Optional: Indexing untuk performa
CREATE INDEX idx_subject_branch ON a_subject(branch_id);
CREATE INDEX idx_branch_category ON a_subject_branch(category_id);


CREATE TABLE u_class_enrollments (
    id SERIAL PRIMARY KEY,
    student_id integer REFERENCES u_students(user_id) ON DELETE CASCADE,
    class_id integer REFERENCES a_class(id) ON DELETE CASCADE,
    periode_id integer REFERENCES a_periode(id) ON DELETE CASCADE,
    homebase_id integer REFERENCES a_homebase(id),
    enrolled_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_enrollment UNIQUE (student_id, periode_id)  -- Constraint agar satu siswa hanya bisa masuk 1 kelas di periode yang sama
);

-- Index untuk performa query
CREATE INDEX idx_enrollment_lookup ON u_class_enrollments(class_id, periode_id);
CREATE INDEX idx_enrollment_history ON u_class_enrollments(student_id);



-- ================================================================
-- SECTION 4: CBT (COMPUTER BASED TEST)
-- Struktur Fixedtable lebih bagus (normalized), tapi fitur newtable diakomodir
-- ================================================================

CREATE TABLE c_bank (
    id SERIAL PRIMARY KEY,
    teacher_id integer REFERENCES u_teachers(user_id),
    subject_id integer REFERENCES a_subject(id),
    title varchar(255) NOT NULL,
    type varchar(50), -- UH, PTS, PAS
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE c_exam (
    id SERIAL PRIMARY KEY,
    bank_id integer REFERENCES c_bank(id),
    name varchar(255) NOT NULL,
    duration_minutes integer NOT NULL,
    token varchar(10),
    is_active boolean DEFAULT true,
    is_shuffle boolean DEFAULT false,
    grade_id integer REFERENCES a_grade(id),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE c_exam
ADD COLUMN grade_id integer REFERENCES a_grade(id);

ALTER TABLE c_exam
ADD COLUMN created_at timestamp DEFAULT CURRENT_TIMESTAMP;


-- RELASI UJIAN KE KELAS (Dari c_class newtable)
CREATE TABLE c_exam_class (
    id SERIAL PRIMARY KEY,
    exam_id integer REFERENCES c_exam(id) ON DELETE CASCADE,
    class_id integer REFERENCES a_class(id) ON DELETE CASCADE
);

CREATE TABLE c_question (
    id SERIAL PRIMARY KEY,
    bank_id integer REFERENCES c_bank(id) ON DELETE CASCADE,
    q_type smallint NOT NULL, -- 1=PG, 2=Essay, dll
    content text NOT NULL,
    media_url text,
    audio_url text,
    score_point integer DEFAULT 1 -- Poin per soal
);

CREATE TABLE c_question_options (
    id SERIAL PRIMARY KEY,
    question_id integer REFERENCES c_question(id) ON DELETE CASCADE,
    label varchar(5), -- A, B, C, D
    content text,
    media_url text,
    is_correct boolean DEFAULT false
);

ALTER TABLE c_question_options 
ALTER COLUMN label TYPE TEXT;

CREATE TABLE c_student_session (
    id SERIAL PRIMARY KEY,
    exam_id integer REFERENCES c_exam(id),
    student_id integer REFERENCES u_students(user_id),
    start_time timestamp DEFAULT CURRENT_TIMESTAMP,
    finish_time timestamp,
    score_final numeric(5,2)
);

-- LOG KEHADIRAN CBT SISWA
CREATE TABLE c_exam_attendance (
    id SERIAL PRIMARY KEY,
    exam_id integer REFERENCES c_exam(id) ON DELETE CASCADE,
    student_id integer REFERENCES u_students(user_id) ON DELETE CASCADE,
    class_id integer REFERENCES a_class(id),
    status varchar(20) DEFAULT 'mengerjakan'
      CHECK (status IN ('belum_masuk', 'izin', 'izinkan', 'mengerjakan', 'pelanggaran', 'selesai')),
    ip_address text,
    browser text,
    start_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_exam_student UNIQUE (exam_id, student_id)
);

CREATE INDEX idx_exam_attendance_exam ON c_exam_attendance (exam_id);
CREATE INDEX idx_students_current_class ON u_students (current_class_id);

CREATE TABLE c_answer (
    id SERIAL PRIMARY KEY,
    session_id integer REFERENCES c_student_session(id),
    question_id integer REFERENCES c_question(id),
    selected_option_id integer REFERENCES c_question_options(id),
    essay_text text,
    is_correct boolean,
    score_obtained numeric(5,2)
);

-- Jawaban siswa untuk autosave (semua tipe soal)
CREATE TABLE c_student_answer (
    id SERIAL PRIMARY KEY,
    exam_id integer REFERENCES c_exam(id) ON DELETE CASCADE,
    student_id integer REFERENCES u_students(user_id) ON DELETE CASCADE,
    question_id integer REFERENCES c_question(id) ON DELETE CASCADE,
    answer_json jsonb,
    score_obtained numeric(6,2),
    is_doubt boolean DEFAULT false,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_answer UNIQUE (exam_id, student_id, question_id)
);

ALTER TABLE c_student_answer ADD COLUMN score_obtained numeric(6,2);

CREATE INDEX idx_student_answer_lookup
ON c_student_answer (exam_id, student_id);


ALTER TABLE c_exam_attendance
  ALTER COLUMN start_at TYPE timestamptz USING start_at AT TIME ZONE 'Asia/Jakarta',
  ALTER COLUMN created_at TYPE timestamptz USING created_at AT TIME ZONE 'Asia/Jakarta',
  ALTER COLUMN updated_at TYPE timestamptz USING updated_at AT TIME ZONE 'Asia/Jakarta';

-- Jika sebelumnya pernah dikonversi memakai AT TIME ZONE 'UTC' (dan waktu jadi maju +7 jam),
-- jalankan sekali secara manual (opsional) untuk koreksi data lama:
-- UPDATE c_exam_attendance
-- SET
--   start_at = (start_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta',
--   created_at = (created_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta',
--   updated_at = (updated_at AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Jakarta';



  ALTER TABLE c_exam_attendance
  DROP CONSTRAINT IF EXISTS c_exam_attendance_status_check;

ALTER TABLE c_exam_attendance
  ADD CONSTRAINT c_exam_attendance_status_check
  CHECK (status IN ('belum_masuk', 'izin', 'izinkan', 'mengerjakan', 'pelanggaran', 'selesai'));







-- ================================================================
-- SECTION 5: LMS (LEARNING MANAGEMENT SYSTEM)
-- Menggabungkan fitur file, presensi, dan penilaian detail (sikap)
-- ================================================================

CREATE TABLE l_chapter (
    id SERIAL PRIMARY KEY,
    subject_id integer REFERENCES a_subject(id),
    title text NOT NULL,
    description text,
    order_number integer,
    grade_id integer REFERENCES a_grade(id),
    class_id integer REFERENCES a_class(id),
    class_ids integer[]
);

ALTER TABLE l_chapter
ADD COLUMN grade_id integer REFERENCES a_grade(id);

ALTER TABLE l_chapter
ADD COLUMN class_id integer REFERENCES a_class(id);

ALTER TABLE l_chapter
ADD COLUMN class_ids integer[];


CREATE TABLE l_content (
    id SERIAL PRIMARY KEY,
    chapter_id integer REFERENCES l_chapter(id),
    title text NOT NULL,
    body text,
    video_url text,
    attachment_url text, -- Menggantikan l_file, simpan path disini
    attachment_name text, -- Nama asli file
    order_number integer,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE l_content
ADD COLUMN order_number integer;

ALTER TABLE l_content
ADD COLUMN attachment_name text;


CREATE TABLE l_attendance (
    id SERIAL PRIMARY KEY,
    periode_id integer REFERENCES a_periode(id) ON DELETE CASCADE,
    class_id integer REFERENCES a_class(id),
    subject_id integer REFERENCES a_subject(id),
    student_id integer REFERENCES u_students(user_id),
    date date DEFAULT CURRENT_DATE,
    status varchar(20) CHECK (status IN ('Hadir', 'Telat', 'Izin', 'Sakit', 'Alpa')), 
    teacher_id integer REFERENCES u_teachers(user_id)
);

ALTER TABLE l_attendance
  ADD COLUMN IF NOT EXISTS periode_id integer REFERENCES a_periode(id) ON DELETE CASCADE;

ALTER TABLE l_attendance
  DROP CONSTRAINT IF EXISTS l_attendance_status_check;

ALTER TABLE l_attendance
  ADD CONSTRAINT l_attendance_status_check
  CHECK (status IN ('Hadir', 'Telat', 'Izin', 'Sakit', 'Alpa'));


 



-- PENGATURAN BOBOT NILAI (Dari l_weighting newtable)
CREATE TABLE l_score_weighting (
    id SERIAL PRIMARY KEY,
    teacher_id integer REFERENCES u_teachers(user_id),
    subject_id integer REFERENCES a_subject(id),
    weight_attendance integer DEFAULT 0,
    weight_attitude integer DEFAULT 0,
    weight_daily integer DEFAULT 0,
    weight_final integer DEFAULT 0,
    CONSTRAINT total_weight_100 CHECK ((weight_attendance + weight_attitude + weight_daily + weight_mid + weight_final) = 100)
);

-- NILAI SIKAP (Dari l_attitude newtable - Dibuat normalized)
CREATE TABLE l_score_attitude (
    id SERIAL PRIMARY KEY,
    student_id integer REFERENCES u_students(user_id),
    class_id integer REFERENCES a_class(id),
    subject_id integer REFERENCES a_subject(id),
    teacher_id integer REFERENCES u_teachers(user_id),
    periode_id integer REFERENCES a_periode(id),
    semester integer CHECK (semester >= 1 AND semester <= 2),
    month varchar(20),
    kinerja integer DEFAULT 0,
    kedisiplinan integer DEFAULT 0,
    keaktifan integer DEFAULT 0,
    percaya_diri integer DEFAULT 0,
    teacher_note text,
    average_score numeric(5,2) GENERATED ALWAYS AS ((kinerja + kedisiplinan + keaktifan + percaya_diri) / 4.0) STORED
);
CREATE INDEX idx_score_attitude_month ON l_score_attitude(month);
CREATE INDEX idx_score_attitude_semester ON l_score_attitude(semester);
CREATE INDEX idx_score_attitude_lookup ON l_score_attitude(subject_id, periode_id, month);
CREATE INDEX idx_score_attitude_class ON l_score_attitude(class_id);
CREATE INDEX idx_score_attitude_teacher ON l_score_attitude(teacher_id);
CREATE INDEX idx_score_attitude_teacher_class_month
ON l_score_attitude(teacher_id, class_id, month);

-- NILAI PENGETAHUAN (Formatif/Harian)
CREATE TABLE l_score_formative (
    id SERIAL PRIMARY KEY,
    periode_id integer REFERENCES a_periode(id),
    semester integer CHECK (semester >= 1 AND semester <= 2),
    month varchar(20),
    class_id integer REFERENCES a_class(id),
    student_id integer REFERENCES u_students(user_id),
    teacher_id integer REFERENCES u_teachers(user_id),
    subject_id integer REFERENCES a_subject(id),
    chapter_id integer REFERENCES l_chapter(id),
    type varchar(50), -- Tugas 1, Kuis 1, Praktek
    score integer CHECK (score >= 0 AND score <= 100)
);

CREATE INDEX idx_score_formative_month ON l_score_formative(month);
CREATE INDEX idx_score_formative_chapter ON l_score_formative(chapter_id);
CREATE INDEX idx_score_formative_semester ON l_score_formative(semester);
CREATE INDEX idx_score_formative_lookup ON l_score_formative(subject_id, chapter_id, month);
CREATE INDEX idx_score_formative_class ON l_score_formative(class_id);
CREATE INDEX idx_score_formative_teacher ON l_score_formative(teacher_id);
CREATE INDEX idx_score_formative_teacher_class_month
ON l_score_formative(teacher_id, class_id, month);

-- NILAI SUMATIF
CREATE TABLE l_score_summative (
    id SERIAL PRIMARY KEY,
    periode_id integer REFERENCES a_periode(id),
    semester integer CHECK (semester >= 1 AND semester <= 2),
    month varchar(20),
    class_id integer REFERENCES a_class(id),
    student_id integer REFERENCES u_students(user_id),
    teacher_id integer REFERENCES u_teachers(user_id),
    subject_id integer REFERENCES a_subject(id),
    chapter_id integer REFERENCES l_chapter(id),
    type varchar(50), -- Format: Mxx-B{chapter}-S{sub}
    score_written integer CHECK (score_written >= 0 AND score_written <= 100),
    score_skill integer CHECK (score_skill >= 0 AND score_skill <= 100), -- Nilai Praktek
    final_score numeric(5,2)
);

CREATE INDEX idx_score_summative_month ON l_score_summative(month);
CREATE INDEX idx_score_summative_chapter ON l_score_summative(chapter_id);
CREATE INDEX idx_score_summative_semester ON l_score_summative(semester);
CREATE INDEX idx_score_summative_lookup ON l_score_summative(subject_id, periode_id, month);
CREATE INDEX idx_score_summative_class ON l_score_summative(class_id);
CREATE INDEX idx_score_summative_teacher ON l_score_summative(teacher_id);
CREATE INDEX idx_score_summative_teacher_class_month
ON l_score_summative(teacher_id, class_id, month);
CREATE INDEX idx_score_summative_type ON l_score_summative(type);

-- REKAP NILAI AKHIR (Untuk Rapor)
CREATE TABLE l_score_final (
    id SERIAL PRIMARY KEY,
    periode_id integer REFERENCES a_periode(id),
    semester integer CHECK (semester >= 1 AND semester <= 2),
    class_id integer REFERENCES a_class(id),
    student_id integer REFERENCES u_students(user_id),
    teacher_id integer REFERENCES u_teachers(user_id),
    subject_id integer REFERENCES a_subject(id),
    final_grade integer CHECK (final_grade >= 0 AND final_grade <= 100)
);

CREATE INDEX idx_score_final_semester ON l_score_final(semester);
CREATE INDEX idx_score_final_lookup ON l_score_final(subject_id, periode_id, semester);
CREATE INDEX idx_score_final_class ON l_score_final(class_id);
CREATE INDEX idx_score_final_teacher ON l_score_final(teacher_id);
CREATE INDEX idx_score_final_teacher_class_semester
ON l_score_final(teacher_id, class_id, semester);

-- ================================================================
-- SECTION 6: TAHFIZ (AL-QUR'AN)
-- Gabungan struktur fixed (lebih rapi) dan fitur newtable (juz items)
-- ================================================================

CREATE TABLE t_surah (
    id SERIAL PRIMARY KEY,
    number integer NOT NULL UNIQUE,
    name_latin varchar(100) NOT NULL,
    total_ayat integer NOT NULL
);

CREATE TABLE t_juz (
    id SERIAL PRIMARY KEY,
    number integer NOT NULL UNIQUE,
    line_count integer,
    description text
);

ALTER TABLE t_juz
ADD COLUMN line_count integer;


-- MAPPING JUZ KE SURAH (Dari t_juzitems newtable)
-- Berguna untuk mengetahui Juz 30 itu surat apa sampai apa
CREATE TABLE t_juz_detail (
    id SERIAL PRIMARY KEY,
    juz_id integer REFERENCES t_juz(id),
    surah_id integer REFERENCES t_surah(id),
    start_ayat integer,
    end_ayat integer
);

CREATE TABLE t_activity_type (
    id SERIAL PRIMARY KEY,
    name varchar(50) NOT NULL, -- Ziyadah, Murajaah
    code varchar(10) UNIQUE
);

CREATE TABLE t_musyrif (
    id SERIAL PRIMARY KEY,
    homebase_id integer REFERENCES a_homebase(id),
    full_name varchar(150) NOT NULL,
    phone varchar(30),
    gender varchar(10),
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE t_halaqoh (
    id SERIAL PRIMARY KEY,
    periode_id integer REFERENCES a_periode(id),
    name varchar(100) NOT NULL,
    musyrif_id integer REFERENCES t_musyrif(id),
    is_active boolean DEFAULT true
);

CREATE TABLE t_halaqoh_students (
    id SERIAL PRIMARY KEY,
    halaqoh_id integer REFERENCES t_halaqoh(id),
    student_id integer REFERENCES u_students(user_id),
    CONSTRAINT uq_halaqoh_student UNIQUE (halaqoh_id, student_id)
);

CREATE TABLE t_target_plan (
  id SERIAL PRIMARY KEY,
  periode_id INT NOT NULL REFERENCES a_periode(id) ON DELETE CASCADE,
  homebase_id INT NULL REFERENCES a_homebase(id) ON DELETE CASCADE, -- NULL = berlaku semua satuan
  grade_id INT NOT NULL REFERENCES a_grade(id) ON DELETE CASCADE,
  title VARCHAR(150),
  notes TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT REFERENCES u_users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- satu rule per kombinasi periode + satuan + tingkat
CREATE UNIQUE INDEX uq_target_plan_scope
ON t_target_plan (periode_id, COALESCE(homebase_id, 0), grade_id);



CREATE TABLE t_target_item (
  id SERIAL PRIMARY KEY,
  plan_id INT NOT NULL REFERENCES t_target_plan(id) ON DELETE CASCADE,
  target_type VARCHAR(10) NOT NULL CHECK (target_type IN ('juz','surah')),
  juz_id INT NULL REFERENCES t_juz(id),
  surah_id INT NULL REFERENCES t_surah(id),
  start_ayat INT NULL,
  end_ayat INT NULL,
  order_no INT DEFAULT 1,
  is_mandatory BOOLEAN DEFAULT TRUE,
  notes TEXT, -- pastikan hanya salah satu: juz ATAU surah
  CONSTRAINT ck_target_item_ref CHECK (
    (target_type='juz' AND juz_id IS NOT NULL AND surah_id IS NULL) OR
    (target_type='surah' AND surah_id IS NOT NULL AND juz_id IS NULL)
  ),

  CONSTRAINT ck_target_item_ayat CHECK (  -- jika surah parsial, validasi ayat
    (target_type='juz' AND start_ayat IS NULL AND end_ayat IS NULL) OR
    (target_type='surah' AND (
      (start_ayat IS NULL AND end_ayat IS NULL) OR
      (start_ayat IS NOT NULL AND end_ayat IS NOT NULL AND start_ayat <= end_ayat)
    ))
  )
);

CREATE INDEX idx_target_item_plan ON t_target_item(plan_id);


-- SETORAN HARIAN (Menggabungkan t_process & t_daily_record)
CREATE TABLE t_daily_record (
    id SERIAL PRIMARY KEY,
    student_id integer REFERENCES u_students(user_id),
    halaqoh_id integer REFERENCES t_halaqoh(id),
    musyrif_id integer REFERENCES t_musyrif(id),
    date date DEFAULT CURRENT_DATE,
    
    type_id integer REFERENCES t_activity_type(id),
    

    start_surah_id integer REFERENCES t_surah(id),
    start_ayat integer,
    end_surah_id integer REFERENCES t_surah(id),
    end_ayat integer,
    
    lines_count integer, -- Jumlah baris (fitur newtable t_juzitems lines)

    fluency_grade varchar(2), -- Lancar (A), Kurang (B)
    tajweed_grade varchar(2),
    note text
);




CREATE TABLE configurations (
    id SERIAL PRIMARY KEY,
    key VARCHAR(100) UNIQUE NOT NULL, 
    value TEXT,                       
    category VARCHAR(50) DEFAULT 'general', 
    description TEXT,                
    type VARCHAR(20) DEFAULT 'string',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);



-- =========================================
-- FINANCE SCHEMA
-- =========================================
create schema if not exists finance;

-- =========================================
-- 1) MASTER KOMPONEN BIAYA
-- =========================================
create table if not exists finance.fee_component (
  id bigserial primary key,
  homebase_id int not null references public.a_homebase(id) on delete cascade,
  code varchar(50) not null,            -- SPP, UANG_GEDUNG, SERAGAM, BUKU, KAS_KELAS, TABUNGAN, dll
  name varchar(120) not null,
  charge_type varchar(20) not null check (charge_type in ('monthly','once','custom')),
  is_savings boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (homebase_id, code)
);

create index if not exists idx_fee_component_homebase
  on finance.fee_component(homebase_id);

-- =========================================
-- 2) RULE TARIF (PER SATUAN, TINGKAT, PERIODE)
-- =========================================
create table if not exists finance.fee_rule (
  id bigserial primary key,
  component_id bigint not null references finance.fee_component(id) on delete cascade,
  homebase_id int not null references public.a_homebase(id) on delete cascade,
  grade_id int references public.a_grade(id) on delete set null,       -- null = semua tingkat
  periode_id int references public.a_periode(id) on delete set null,   -- null = lintas periode/default
  billing_cycle varchar(20) not null check (billing_cycle in ('monthly','once','custom')),
  amount numeric(14,2) not null check (amount >= 0),
  valid_from date,
  valid_to date,
  is_active boolean not null default true,
  created_by int references public.u_users(id),
  created_at timestamptz not null default now(),
  check (valid_to is null or valid_from is null or valid_to >= valid_from)
);

create index if not exists idx_fee_rule_lookup
  on finance.fee_rule(homebase_id, grade_id, periode_id, component_id, is_active);

-- Bulan aktif untuk rule monthly (supaya support tahun ajaran Jul-Jun)
create table if not exists finance.fee_rule_month (
  id bigserial primary key,
  fee_rule_id bigint not null references finance.fee_rule(id) on delete cascade,
  month_num smallint not null check (month_num between 1 and 12),
  unique (fee_rule_id, month_num)
);

create index if not exists idx_fee_rule_month_rule
  on finance.fee_rule_month(fee_rule_id);

-- =========================================
-- 3) TAGIHAN
-- =========================================
create table if not exists finance.invoice (
  id bigserial primary key,
  homebase_id int not null references public.a_homebase(id),
  student_id int not null references public.u_students(user_id) on delete cascade,
  periode_id int references public.a_periode(id),
  invoice_no varchar(60) not null unique,
  issue_date date not null default current_date,
  due_date date,
  status varchar(20) not null default 'draft'
    check (status in ('draft','issued','partial','paid','cancelled')),
  notes text,
  created_by int not null references public.u_users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_invoice_student
  on finance.invoice(student_id, status);

create table if not exists finance.invoice_item (
  id bigserial primary key,
  invoice_id bigint not null references finance.invoice(id) on delete cascade,
  component_id bigint not null references finance.fee_component(id),
  fee_rule_id bigint references finance.fee_rule(id),
  bill_year smallint,                         -- contoh 2026
  bill_month smallint check (bill_month between 1 and 12), -- untuk SPP bulanan
  description text,
  qty numeric(12,2) not null default 1 check (qty > 0),
  unit_amount numeric(14,2) not null check (unit_amount >= 0),
  amount numeric(14,2) generated always as (qty * unit_amount) stored
);

create index if not exists idx_invoice_item_invoice
  on finance.invoice_item(invoice_id);

-- Cegah duplikasi SPP bulan yang sama di student yang sama
create unique index if not exists uq_invoice_item_monthly
  on finance.invoice_item(component_id, fee_rule_id, bill_year, bill_month, invoice_id)
  where bill_month is not null and bill_year is not null;

-- =========================================
-- 4) METODE PEMBAYARAN (MANUAL BANK / MIDTRANS)
-- =========================================
create table if not exists finance.payment_method (
  id bigserial primary key,
  homebase_id int not null references public.a_homebase(id) on delete cascade,
  method_type varchar(20) not null check (method_type in ('manual_bank','midtrans')),
  name varchar(100) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists finance.bank_account (
  id bigserial primary key,
  payment_method_id bigint not null references finance.payment_method(id) on delete cascade,
  bank_name varchar(100) not null,
  account_name varchar(120) not null,
  account_number varchar(60) not null,
  branch varchar(100),
  is_active boolean not null default true
);

-- =========================================
-- 5) PEMBAYARAN
-- =========================================
create table if not exists finance.payment (
  id bigserial primary key,
  homebase_id int not null references public.a_homebase(id),
  student_id int not null references public.u_students(user_id) on delete cascade,
  payer_user_id int not null references public.u_users(id), -- parent/siswa/admin
  method_id bigint not null references finance.payment_method(id),
  bank_account_id bigint references finance.bank_account(id),
  payment_date timestamptz not null default now(),
  amount numeric(14,2) not null check (amount > 0),
  status varchar(20) not null
    check (status in ('pending','paid','failed','expired','cancelled','refunded')),
  reference_no varchar(120),
  proof_url text, -- bukti transfer manual
  notes text,
  created_by int references public.u_users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_student
  on finance.payment(student_id, status, payment_date desc);

create table if not exists finance.payment_allocation (
  id bigserial primary key,
  payment_id bigint not null references finance.payment(id) on delete cascade,
  invoice_item_id bigint not null references finance.invoice_item(id) on delete cascade,
  allocated_amount numeric(14,2) not null check (allocated_amount > 0),
  unique (payment_id, invoice_item_id)
);

create index if not exists idx_payment_alloc_item
  on finance.payment_allocation(invoice_item_id);

-- =========================================
-- 6) GATEWAY TRANSACTION (MIDTRANS)
-- =========================================
create table if not exists finance.gateway_transaction (
  id bigserial primary key,
  payment_id bigint not null unique references finance.payment(id) on delete cascade,
  provider varchar(30) not null default 'midtrans',
  order_id varchar(120) not null unique,
  transaction_id varchar(120),
  transaction_status varchar(40),
  snap_token text,
  snap_redirect_url text,
  gross_amount numeric(14,2),
  raw_response jsonb,
  webhook_payload jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================================
-- 7) TABUNGAN SISWA (MANUAL OLEH WALIKELAS/ADMIN FINANCE)
-- =========================================
create table if not exists finance.savings_ledger (
  id bigserial primary key,
  homebase_id int not null references public.a_homebase(id),
  student_id int not null references public.u_students(user_id) on delete cascade,
  component_id bigint not null references finance.fee_component(id), -- wajib komponen is_savings=true (validasi di service/trigger)
  trx_date date not null default current_date,
  direction varchar(10) not null check (direction in ('in','out')),
  amount numeric(14,2) not null check (amount > 0),
  note text,
  recorded_by int not null references public.u_users(id),
  approved_by int references public.u_users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_savings_student
  on finance.savings_ledger(student_id, trx_date desc);

-- ================================================================
-- SECTION 9: LMS SCHEDULING
-- Dibuat dalam schema `lms` agar tampil seperti struktur pada gambar.
-- ================================================================

/* legacy order kept for reference
CREATE SCHEMA IF NOT EXISTS lms;
SET search_path TO lms, public;

-- Generated by the database client.
CREATE TABLE l_daily_absence_report(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    "date" date NOT NULL,
    reporter_teacher_id integer NOT NULL,
    target_type varchar(20) NOT NULL,
    target_user_id integer NOT NULL,
    class_id integer,
    slot_id integer,
    reason text,
    follow_up text,
    status varchar(20) NOT NULL DEFAULT 'open'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_daily_absence_report_homebase_id_fkey FOREIGN key(homebase_id) REFERENCES a_homebase(id),
    CONSTRAINT l_daily_absence_report_periode_id_fkey FOREIGN key(periode_id) REFERENCES a_periode(id),
    CONSTRAINT l_daily_absence_report_reporter_teacher_id_fkey FOREIGN key(reporter_teacher_id) REFERENCES u_teachers(user_id),
    CONSTRAINT l_daily_absence_report_target_user_id_fkey FOREIGN key(target_user_id) REFERENCES u_users(id),
    CONSTRAINT l_daily_absence_report_class_id_fkey FOREIGN key(class_id) REFERENCES a_class(id),
    CONSTRAINT l_daily_absence_report_slot_id_fkey FOREIGN key(slot_id) REFERENCES l_time_slot(id),
    CONSTRAINT l_daily_absence_report_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['teacher'::character varying, 'student'::character varying])::text[]))),
    CONSTRAINT l_daily_absence_report_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'closed'::character varying])::text[])))
);
CREATE INDEX idx_daily_absence_report_lookup ON lms.l_daily_absence_report USING btree (homebase_id, periode_id, date, target_type, target_user_id);


-- Generated by the database client.
CREATE TABLE l_duty_assignment(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    "date" date NOT NULL,
    slot_id integer,
    duty_teacher_id integer NOT NULL,
    assigned_by integer,
    note text,
    status varchar(20) NOT NULL DEFAULT 'assigned'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_duty_assignment_homebase_id_fkey FOREIGN key(homebase_id) REFERENCES a_homebase(id),
    CONSTRAINT l_duty_assignment_periode_id_fkey FOREIGN key(periode_id) REFERENCES a_periode(id),
    CONSTRAINT l_duty_assignment_slot_id_fkey FOREIGN key(slot_id) REFERENCES l_time_slot(id),
    CONSTRAINT l_duty_assignment_duty_teacher_id_fkey FOREIGN key(duty_teacher_id) REFERENCES u_teachers(user_id),
    CONSTRAINT l_duty_assignment_assigned_by_fkey FOREIGN key(assigned_by) REFERENCES u_users(id),
    CONSTRAINT l_duty_assignment_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'done'::character varying, 'cancelled'::character varying])::text[])))
);
CREATE INDEX idx_duty_assignment_lookup ON lms.l_duty_assignment USING btree (homebase_id, periode_id, date, duty_teacher_id);


-- Generated by the database client.
CREATE TABLE l_schedule_break(
    id SERIAL NOT NULL,
    day_template_id integer NOT NULL,
    break_start time without time zone NOT NULL,
    break_end time without time zone NOT NULL,
    label text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_break_day_template_id_fkey FOREIGN key(day_template_id) REFERENCES l_schedule_day_template(id),
    CONSTRAINT chk_schedule_break_time_range CHECK ((break_start < break_end))
);
CREATE INDEX idx_schedule_break_day_template ON lms.l_schedule_break USING btree (day_template_id, break_start, break_end);

-- Generated by the database client.
CREATE TABLE l_schedule_config(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    session_minutes integer NOT NULL,
    max_sessions_per_meeting integer NOT NULL DEFAULT 2,
    require_different_days_if_over_max boolean NOT NULL DEFAULT true,
    allow_same_day_multiple_meetings boolean NOT NULL DEFAULT true,
    minimum_gap_slots integer NOT NULL DEFAULT 4,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_config_homebase_id_fkey FOREIGN key(homebase_id) REFERENCES a_homebase(id),
    CONSTRAINT l_schedule_config_periode_id_fkey FOREIGN key(periode_id) REFERENCES a_periode(id),
    CONSTRAINT l_schedule_config_created_by_fkey FOREIGN key(created_by) REFERENCES u_users(id),
    CONSTRAINT l_schedule_config_session_minutes_check CHECK ((session_minutes > 0)),
    CONSTRAINT l_schedule_config_max_sessions_per_meeting_check CHECK ((max_sessions_per_meeting > 0)),
    CONSTRAINT l_schedule_config_minimum_gap_slots_check CHECK ((minimum_gap_slots >= 0))
);
CREATE UNIQUE INDEX uq_schedule_config_homebase_periode ON lms.l_schedule_config USING btree (homebase_id, periode_id);

-- Generated by the database client.
CREATE TABLE l_schedule_day_template(
    id SERIAL NOT NULL,
    config_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_school_day boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_day_template_config_id_fkey FOREIGN key(config_id) REFERENCES l_schedule_config(id),
    CONSTRAINT l_schedule_day_template_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT chk_day_template_time_range CHECK ((start_time < end_time))
);
CREATE UNIQUE INDEX uq_schedule_day_template ON lms.l_schedule_day_template USING btree (config_id, day_of_week);
CREATE INDEX idx_schedule_day_template_config ON lms.l_schedule_day_template USING btree (config_id, day_of_week);


-- Generated by the database client.
CREATE TABLE l_schedule_entry(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    teaching_load_id integer NOT NULL,
    class_id integer NOT NULL,
    subject_id integer NOT NULL,
    teacher_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    slot_start_id integer NOT NULL,
    slot_count integer NOT NULL,
    meeting_no integer NOT NULL,
    source_type varchar(20) NOT NULL DEFAULT 'generated'::character varying,
    is_manual_override boolean NOT NULL DEFAULT false,
    locked boolean NOT NULL DEFAULT false,
    status varchar(20) NOT NULL DEFAULT 'draft'::character varying,
    generated_run_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_entry_homebase_id_fkey FOREIGN key(homebase_id) REFERENCES a_homebase(id),
    CONSTRAINT l_schedule_entry_periode_id_fkey FOREIGN key(periode_id) REFERENCES a_periode(id),
    CONSTRAINT l_schedule_entry_teaching_load_id_fkey FOREIGN key(teaching_load_id) REFERENCES l_teaching_load(id),
    CONSTRAINT l_schedule_entry_class_id_fkey FOREIGN key(class_id) REFERENCES a_class(id),
    CONSTRAINT l_schedule_entry_subject_id_fkey FOREIGN key(subject_id) REFERENCES a_subject(id),
    CONSTRAINT l_schedule_entry_teacher_id_fkey FOREIGN key(teacher_id) REFERENCES u_teachers(user_id),
    CONSTRAINT l_schedule_entry_slot_start_id_fkey FOREIGN key(slot_start_id) REFERENCES l_time_slot(id),
    CONSTRAINT l_schedule_entry_generated_run_id_fkey FOREIGN key(generated_run_id) REFERENCES l_schedule_generation_run(id),
    CONSTRAINT l_schedule_entry_created_by_fkey FOREIGN key(created_by) REFERENCES u_users(id),
    CONSTRAINT l_schedule_entry_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT l_schedule_entry_slot_count_check CHECK ((slot_count > 0)),
    CONSTRAINT l_schedule_entry_meeting_no_check CHECK ((meeting_no > 0)),
    CONSTRAINT l_schedule_entry_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['generated'::character varying, 'manual'::character varying])::text[]))),
    CONSTRAINT l_schedule_entry_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))
);
CREATE UNIQUE INDEX uq_schedule_entry_meeting ON lms.l_schedule_entry USING btree (teaching_load_id, meeting_no);
CREATE INDEX idx_schedule_entry_lookup ON lms.l_schedule_entry USING btree (periode_id, homebase_id, day_of_week, class_id, teacher_id);

-- Generated by the database client.
CREATE TABLE l_schedule_entry_history(
    id SERIAL NOT NULL,
    schedule_entry_id integer,
    action_type varchar(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_entry_history_schedule_entry_id_fkey FOREIGN key(schedule_entry_id) REFERENCES l_schedule_entry(id),
    CONSTRAINT l_schedule_entry_history_changed_by_fkey FOREIGN key(changed_by) REFERENCES u_users(id),
    CONSTRAINT l_schedule_entry_history_action_type_check CHECK (((action_type)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying])::text[])))
);


-- Generated by the database client.
CREATE TABLE l_schedule_entry_slot(
    id SERIAL NOT NULL,
    schedule_entry_id integer NOT NULL,
    periode_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    slot_id integer NOT NULL,
    class_id integer NOT NULL,
    teacher_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_entry_slot_teacher_id_fkey FOREIGN key(teacher_id) REFERENCES u_teachers(user_id),
    CONSTRAINT l_schedule_entry_slot_schedule_entry_id_fkey FOREIGN key(schedule_entry_id) REFERENCES l_schedule_entry(id),
    CONSTRAINT l_schedule_entry_slot_periode_id_fkey FOREIGN key(periode_id) REFERENCES a_periode(id),
    CONSTRAINT l_schedule_entry_slot_slot_id_fkey FOREIGN key(slot_id) REFERENCES l_time_slot(id),
    CONSTRAINT l_schedule_entry_slot_class_id_fkey FOREIGN key(class_id) REFERENCES a_class(id),
    CONSTRAINT l_schedule_entry_slot_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7)))
);
CREATE UNIQUE INDEX uq_schedule_entry_slot_pair ON lms.l_schedule_entry_slot USING btree (schedule_entry_id, slot_id);
CREATE UNIQUE INDEX uq_schedule_class_slot ON lms.l_schedule_entry_slot USING btree (periode_id, class_id, day_of_week, slot_id);
CREATE UNIQUE INDEX uq_schedule_teacher_slot ON lms.l_schedule_entry_slot USING btree (periode_id, teacher_id, day_of_week, slot_id);
CREATE INDEX idx_schedule_entry_slot_lookup ON lms.l_schedule_entry_slot USING btree (periode_id, day_of_week, slot_id, class_id, teacher_id);


-- Generated by the database client.
CREATE TABLE l_schedule_generation_run(
    id SERIAL NOT NULL,
    config_id integer NOT NULL,
    generated_by integer,
    strategy text,
    status varchar(20) NOT NULL DEFAULT 'success'::character varying,
    notes text,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_generation_run_config_id_fkey FOREIGN key(config_id) REFERENCES l_schedule_config(id),
    CONSTRAINT l_schedule_generation_run_generated_by_fkey FOREIGN key(generated_by) REFERENCES u_users(id),
    CONSTRAINT l_schedule_generation_run_status_check CHECK (((status)::text = ANY ((ARRAY['running'::character varying, 'success'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);

-- Generated by the database client.
CREATE TABLE l_teacher_session_log(
    id SERIAL NOT NULL,
    schedule_entry_id integer NOT NULL,
    "date" date NOT NULL,
    teacher_id integer NOT NULL,
    duty_assignment_id integer,
    checkin_at timestamp without time zone,
    checkout_at timestamp without time zone,
    checkin_by integer,
    checkout_by integer,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teacher_session_log_schedule_entry_id_fkey FOREIGN key(schedule_entry_id) REFERENCES l_schedule_entry(id),
    CONSTRAINT l_teacher_session_log_teacher_id_fkey FOREIGN key(teacher_id) REFERENCES u_teachers(user_id),
    CONSTRAINT l_teacher_session_log_duty_assignment_id_fkey FOREIGN key(duty_assignment_id) REFERENCES l_duty_assignment(id),
    CONSTRAINT l_teacher_session_log_checkin_by_fkey FOREIGN key(checkin_by) REFERENCES u_users(id),
    CONSTRAINT l_teacher_session_log_checkout_by_fkey FOREIGN key(checkout_by) REFERENCES u_users(id),
    CONSTRAINT chk_teacher_session_time_order CHECK (((checkout_at IS NULL) OR (checkin_at IS NULL) OR (checkout_at >= checkin_at)))
);
CREATE UNIQUE INDEX uq_teacher_session_daily ON lms.l_teacher_session_log USING btree (schedule_entry_id, date);
CREATE INDEX idx_teacher_session_log_lookup ON lms.l_teacher_session_log USING btree (date, teacher_id, schedule_entry_id);


-- Generated by the database client.
CREATE TABLE l_teacher_unavailability(
    id SERIAL NOT NULL,
    teacher_id integer NOT NULL,
    periode_id integer NOT NULL,
    day_of_week smallint,
    specific_date date,
    start_time time without time zone,
    end_time time without time zone,
    reason text,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teacher_unavailability_teacher_id_fkey FOREIGN key(teacher_id) REFERENCES u_teachers(user_id),
    CONSTRAINT l_teacher_unavailability_periode_id_fkey FOREIGN key(periode_id) REFERENCES a_periode(id),
    CONSTRAINT l_teacher_unavailability_created_by_fkey FOREIGN key(created_by) REFERENCES u_users(id),
    CONSTRAINT l_teacher_unavailability_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT chk_unavailability_scope CHECK (((day_of_week IS NOT NULL) OR (specific_date IS NOT NULL))),
    CONSTRAINT chk_unavailability_time_pair CHECK ((((start_time IS NULL) AND (end_time IS NULL)) OR ((start_time IS NOT NULL) AND (end_time IS NOT NULL) AND (start_time < end_time))))
);
CREATE INDEX idx_teacher_unavailability_lookup ON lms.l_teacher_unavailability USING btree (teacher_id, periode_id, day_of_week, specific_date);

-- Generated by the database client.
CREATE TABLE l_teaching_load(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    class_id integer NOT NULL,
    subject_id integer NOT NULL,
    teacher_id integer NOT NULL,
    weekly_sessions integer NOT NULL,
    max_sessions_per_meeting integer NOT NULL DEFAULT 2,
    require_different_days boolean NOT NULL DEFAULT true,
    allow_same_day_with_gap boolean NOT NULL DEFAULT true,
    minimum_gap_slots integer NOT NULL DEFAULT 4,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teaching_load_homebase_id_fkey FOREIGN key(homebase_id) REFERENCES a_homebase(id),
    CONSTRAINT l_teaching_load_periode_id_fkey FOREIGN key(periode_id) REFERENCES a_periode(id),
    CONSTRAINT l_teaching_load_class_id_fkey FOREIGN key(class_id) REFERENCES a_class(id),
    CONSTRAINT l_teaching_load_subject_id_fkey FOREIGN key(subject_id) REFERENCES a_subject(id),
    CONSTRAINT l_teaching_load_teacher_id_fkey FOREIGN key(teacher_id) REFERENCES u_teachers(user_id),
    CONSTRAINT l_teaching_load_created_by_fkey FOREIGN key(created_by) REFERENCES u_users(id),
    CONSTRAINT l_teaching_load_weekly_sessions_check CHECK ((weekly_sessions > 0)),
    CONSTRAINT l_teaching_load_max_sessions_per_meeting_check CHECK ((max_sessions_per_meeting > 0)),
    CONSTRAINT l_teaching_load_minimum_gap_slots_check CHECK ((minimum_gap_slots >= 0))
);
CREATE UNIQUE INDEX uq_teaching_load ON lms.l_teaching_load USING btree (periode_id, class_id, subject_id, teacher_id);
CREATE INDEX idx_teaching_load_lookup ON lms.l_teaching_load USING btree (periode_id, homebase_id, class_id, teacher_id);


-- Generated by the database client.
CREATE TABLE l_teaching_load_grade_rule(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    grade_id integer NOT NULL,
    subject_id integer NOT NULL,
    weekly_sessions integer NOT NULL,
    max_sessions_per_meeting integer NOT NULL DEFAULT 2,
    require_different_days boolean NOT NULL DEFAULT true,
    allow_same_day_with_gap boolean NOT NULL DEFAULT true,
    minimum_gap_slots integer NOT NULL DEFAULT 4,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teaching_load_grade_rule_homebase_id_fkey FOREIGN key(homebase_id) REFERENCES a_homebase(id),
    CONSTRAINT l_teaching_load_grade_rule_periode_id_fkey FOREIGN key(periode_id) REFERENCES a_periode(id),
    CONSTRAINT l_teaching_load_grade_rule_grade_id_fkey FOREIGN key(grade_id) REFERENCES a_grade(id),
    CONSTRAINT l_teaching_load_grade_rule_subject_id_fkey FOREIGN key(subject_id) REFERENCES a_subject(id),
    CONSTRAINT l_teaching_load_grade_rule_created_by_fkey FOREIGN key(created_by) REFERENCES u_users(id),
    CONSTRAINT l_teaching_load_grade_rule_max_sessions_per_meeting_check CHECK ((max_sessions_per_meeting > 0)),
    CONSTRAINT l_teaching_load_grade_rule_weekly_sessions_check CHECK ((weekly_sessions > 0)),
    CONSTRAINT l_teaching_load_grade_rule_minimum_gap_slots_check CHECK ((minimum_gap_slots >= 0))
);
CREATE UNIQUE INDEX uq_teaching_load_grade_rule ON lms.l_teaching_load_grade_rule USING btree (homebase_id, periode_id, grade_id, subject_id);
CREATE INDEX idx_teaching_load_grade_rule_lookup ON lms.l_teaching_load_grade_rule USING btree (periode_id, homebase_id, grade_id, subject_id);

-- Generated by the database client.
CREATE TABLE l_time_slot(
    id SERIAL NOT NULL,
    config_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    slot_no integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_break boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_time_slot_config_id_fkey FOREIGN key(config_id) REFERENCES l_schedule_config(id),
    CONSTRAINT l_time_slot_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT l_time_slot_slot_no_check CHECK ((slot_no > 0)),
    CONSTRAINT chk_time_slot_range CHECK ((start_time < end_time))
);
CREATE UNIQUE INDEX uq_time_slot_slot_no ON lms.l_time_slot USING btree (config_id, day_of_week, slot_no);
CREATE UNIQUE INDEX uq_time_slot_range ON lms.l_time_slot USING btree (config_id, day_of_week, start_time, end_time);
CREATE INDEX idx_time_slot_config_day ON lms.l_time_slot USING btree (config_id, day_of_week, slot_no);


SET search_path TO public;
*/

CREATE SCHEMA IF NOT EXISTS lms;

BEGIN;
SET search_path TO lms, public;

CREATE TABLE l_schedule_config(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    session_minutes integer NOT NULL,
    max_sessions_per_meeting integer NOT NULL DEFAULT 2,
    require_different_days_if_over_max boolean NOT NULL DEFAULT true,
    allow_same_day_multiple_meetings boolean NOT NULL DEFAULT true,
    minimum_gap_slots integer NOT NULL DEFAULT 4,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_config_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_schedule_config_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_schedule_config_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_schedule_config_session_minutes_check CHECK ((session_minutes > 0)),
    CONSTRAINT l_schedule_config_max_sessions_per_meeting_check CHECK ((max_sessions_per_meeting > 0)),
    CONSTRAINT l_schedule_config_minimum_gap_slots_check CHECK ((minimum_gap_slots >= 0))
);
CREATE UNIQUE INDEX uq_schedule_config_homebase_periode ON lms.l_schedule_config USING btree (homebase_id, periode_id);

CREATE TABLE l_schedule_generation_run(
    id SERIAL NOT NULL,
    config_id integer NOT NULL,
    generated_by integer,
    strategy text,
    status varchar(20) NOT NULL DEFAULT 'success'::character varying,
    notes text,
    generated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_generation_run_config_id_fkey FOREIGN KEY(config_id) REFERENCES lms.l_schedule_config(id),
    CONSTRAINT l_schedule_generation_run_generated_by_fkey FOREIGN KEY(generated_by) REFERENCES public.u_users(id),
    CONSTRAINT l_schedule_generation_run_status_check CHECK (((status)::text = ANY ((ARRAY['running'::character varying, 'success'::character varying, 'failed'::character varying, 'cancelled'::character varying])::text[])))
);

CREATE TABLE l_schedule_day_template(
    id SERIAL NOT NULL,
    config_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_school_day boolean NOT NULL DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_day_template_config_id_fkey FOREIGN KEY(config_id) REFERENCES lms.l_schedule_config(id),
    CONSTRAINT l_schedule_day_template_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT chk_day_template_time_range CHECK ((start_time < end_time))
);
CREATE UNIQUE INDEX uq_schedule_day_template ON lms.l_schedule_day_template USING btree (config_id, day_of_week);
CREATE INDEX idx_schedule_day_template_config ON lms.l_schedule_day_template USING btree (config_id, day_of_week);

CREATE TABLE l_schedule_break(
    id SERIAL NOT NULL,
    day_template_id integer NOT NULL,
    break_start time without time zone NOT NULL,
    break_end time without time zone NOT NULL,
    label text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_break_day_template_id_fkey FOREIGN KEY(day_template_id) REFERENCES lms.l_schedule_day_template(id),
    CONSTRAINT chk_schedule_break_time_range CHECK ((break_start < break_end))
);
CREATE INDEX idx_schedule_break_day_template ON lms.l_schedule_break USING btree (day_template_id, break_start, break_end);

CREATE TABLE l_time_slot(
    id SERIAL NOT NULL,
    config_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    slot_no integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    is_break boolean NOT NULL DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_time_slot_config_id_fkey FOREIGN KEY(config_id) REFERENCES lms.l_schedule_config(id),
    CONSTRAINT l_time_slot_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT l_time_slot_slot_no_check CHECK ((slot_no > 0)),
    CONSTRAINT chk_time_slot_range CHECK ((start_time < end_time))
);
CREATE UNIQUE INDEX uq_time_slot_slot_no ON lms.l_time_slot USING btree (config_id, day_of_week, slot_no);
CREATE UNIQUE INDEX uq_time_slot_range ON lms.l_time_slot USING btree (config_id, day_of_week, start_time, end_time);
CREATE INDEX idx_time_slot_config_day ON lms.l_time_slot USING btree (config_id, day_of_week, slot_no);

CREATE TABLE l_teaching_load(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    class_id integer NOT NULL,
    subject_id integer NOT NULL,
    teacher_id integer NOT NULL,
    weekly_sessions integer NOT NULL,
    max_sessions_per_meeting integer NOT NULL DEFAULT 2,
    require_different_days boolean NOT NULL DEFAULT true,
    allow_same_day_with_gap boolean NOT NULL DEFAULT true,
    minimum_gap_slots integer NOT NULL DEFAULT 4,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teaching_load_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_teaching_load_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_teaching_load_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id),
    CONSTRAINT l_teaching_load_subject_id_fkey FOREIGN KEY(subject_id) REFERENCES public.a_subject(id),
    CONSTRAINT l_teaching_load_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_teaching_load_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_teaching_load_weekly_sessions_check CHECK ((weekly_sessions > 0)),
    CONSTRAINT l_teaching_load_max_sessions_per_meeting_check CHECK ((max_sessions_per_meeting > 0)),
    CONSTRAINT l_teaching_load_minimum_gap_slots_check CHECK ((minimum_gap_slots >= 0))
);
CREATE UNIQUE INDEX uq_teaching_load ON lms.l_teaching_load USING btree (periode_id, class_id, subject_id, teacher_id);
CREATE INDEX idx_teaching_load_lookup ON lms.l_teaching_load USING btree (periode_id, homebase_id, class_id, teacher_id);

CREATE TABLE l_teaching_load_grade_rule(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    grade_id integer NOT NULL,
    subject_id integer NOT NULL,
    weekly_sessions integer NOT NULL,
    max_sessions_per_meeting integer NOT NULL DEFAULT 2,
    require_different_days boolean NOT NULL DEFAULT true,
    allow_same_day_with_gap boolean NOT NULL DEFAULT true,
    minimum_gap_slots integer NOT NULL DEFAULT 4,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teaching_load_grade_rule_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_teaching_load_grade_rule_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_teaching_load_grade_rule_grade_id_fkey FOREIGN KEY(grade_id) REFERENCES public.a_grade(id),
    CONSTRAINT l_teaching_load_grade_rule_subject_id_fkey FOREIGN KEY(subject_id) REFERENCES public.a_subject(id),
    CONSTRAINT l_teaching_load_grade_rule_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_teaching_load_grade_rule_max_sessions_per_meeting_check CHECK ((max_sessions_per_meeting > 0)),
    CONSTRAINT l_teaching_load_grade_rule_weekly_sessions_check CHECK ((weekly_sessions > 0)),
    CONSTRAINT l_teaching_load_grade_rule_minimum_gap_slots_check CHECK ((minimum_gap_slots >= 0))
);
CREATE UNIQUE INDEX uq_teaching_load_grade_rule ON lms.l_teaching_load_grade_rule USING btree (homebase_id, periode_id, grade_id, subject_id);
CREATE INDEX idx_teaching_load_grade_rule_lookup ON lms.l_teaching_load_grade_rule USING btree (periode_id, homebase_id, grade_id, subject_id);

CREATE TABLE l_teacher_unavailability(
    id SERIAL NOT NULL,
    teacher_id integer NOT NULL,
    periode_id integer NOT NULL,
    day_of_week smallint,
    specific_date date,
    start_time time without time zone,
    end_time time without time zone,
    reason text,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teacher_unavailability_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_teacher_unavailability_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_teacher_unavailability_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_teacher_unavailability_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT chk_unavailability_scope CHECK (((day_of_week IS NOT NULL) OR (specific_date IS NOT NULL))),
    CONSTRAINT chk_unavailability_time_pair CHECK ((((start_time IS NULL) AND (end_time IS NULL)) OR ((start_time IS NOT NULL) AND (end_time IS NOT NULL) AND (start_time < end_time))))
);
CREATE INDEX idx_teacher_unavailability_lookup ON lms.l_teacher_unavailability USING btree (teacher_id, periode_id, day_of_week, specific_date);

CREATE TABLE l_schedule_entry(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    teaching_load_id integer NOT NULL,
    class_id integer NOT NULL,
    subject_id integer NOT NULL,
    teacher_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    slot_start_id integer NOT NULL,
    slot_count integer NOT NULL,
    meeting_no integer NOT NULL,
    source_type varchar(20) NOT NULL DEFAULT 'generated'::character varying,
    is_manual_override boolean NOT NULL DEFAULT false,
    locked boolean NOT NULL DEFAULT false,
    status varchar(20) NOT NULL DEFAULT 'draft'::character varying,
    generated_run_id integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_entry_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_schedule_entry_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_schedule_entry_teaching_load_id_fkey FOREIGN KEY(teaching_load_id) REFERENCES lms.l_teaching_load(id),
    CONSTRAINT l_schedule_entry_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id),
    CONSTRAINT l_schedule_entry_subject_id_fkey FOREIGN KEY(subject_id) REFERENCES public.a_subject(id),
    CONSTRAINT l_schedule_entry_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_schedule_entry_slot_start_id_fkey FOREIGN KEY(slot_start_id) REFERENCES lms.l_time_slot(id),
    CONSTRAINT l_schedule_entry_generated_run_id_fkey FOREIGN KEY(generated_run_id) REFERENCES lms.l_schedule_generation_run(id),
    CONSTRAINT l_schedule_entry_created_by_fkey FOREIGN KEY(created_by) REFERENCES public.u_users(id),
    CONSTRAINT l_schedule_entry_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7))),
    CONSTRAINT l_schedule_entry_slot_count_check CHECK ((slot_count > 0)),
    CONSTRAINT l_schedule_entry_meeting_no_check CHECK ((meeting_no > 0)),
    CONSTRAINT l_schedule_entry_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['generated'::character varying, 'manual'::character varying])::text[]))),
    CONSTRAINT l_schedule_entry_status_check CHECK (((status)::text = ANY ((ARRAY['draft'::character varying, 'published'::character varying, 'archived'::character varying])::text[])))
);
CREATE UNIQUE INDEX uq_schedule_entry_meeting ON lms.l_schedule_entry USING btree (teaching_load_id, meeting_no);
CREATE INDEX idx_schedule_entry_lookup ON lms.l_schedule_entry USING btree (periode_id, homebase_id, day_of_week, class_id, teacher_id);

CREATE TABLE l_schedule_entry_history(
    id SERIAL NOT NULL,
    schedule_entry_id integer,
    action_type varchar(20) NOT NULL,
    old_data jsonb,
    new_data jsonb,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_entry_history_schedule_entry_id_fkey FOREIGN KEY(schedule_entry_id) REFERENCES lms.l_schedule_entry(id),
    CONSTRAINT l_schedule_entry_history_changed_by_fkey FOREIGN KEY(changed_by) REFERENCES public.u_users(id),
    CONSTRAINT l_schedule_entry_history_action_type_check CHECK (((action_type)::text = ANY ((ARRAY['create'::character varying, 'update'::character varying, 'delete'::character varying])::text[])))
);

CREATE TABLE l_schedule_entry_slot(
    id SERIAL NOT NULL,
    schedule_entry_id integer NOT NULL,
    periode_id integer NOT NULL,
    day_of_week smallint NOT NULL,
    slot_id integer NOT NULL,
    class_id integer NOT NULL,
    teacher_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_schedule_entry_slot_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_schedule_entry_slot_schedule_entry_id_fkey FOREIGN KEY(schedule_entry_id) REFERENCES lms.l_schedule_entry(id),
    CONSTRAINT l_schedule_entry_slot_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_schedule_entry_slot_slot_id_fkey FOREIGN KEY(slot_id) REFERENCES lms.l_time_slot(id),
    CONSTRAINT l_schedule_entry_slot_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id),
    CONSTRAINT l_schedule_entry_slot_day_of_week_check CHECK (((day_of_week >= 1) AND (day_of_week <= 7)))
);
CREATE UNIQUE INDEX uq_schedule_entry_slot_pair ON lms.l_schedule_entry_slot USING btree (schedule_entry_id, slot_id);
CREATE UNIQUE INDEX uq_schedule_class_slot ON lms.l_schedule_entry_slot USING btree (periode_id, class_id, day_of_week, slot_id);
CREATE UNIQUE INDEX uq_schedule_teacher_slot ON lms.l_schedule_entry_slot USING btree (periode_id, teacher_id, day_of_week, slot_id);
CREATE INDEX idx_schedule_entry_slot_lookup ON lms.l_schedule_entry_slot USING btree (periode_id, day_of_week, slot_id, class_id, teacher_id);

CREATE TABLE l_duty_assignment(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    "date" date NOT NULL,
    slot_id integer,
    duty_teacher_id integer NOT NULL,
    assigned_by integer,
    note text,
    status varchar(20) NOT NULL DEFAULT 'assigned'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_duty_assignment_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_duty_assignment_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_duty_assignment_slot_id_fkey FOREIGN KEY(slot_id) REFERENCES lms.l_time_slot(id),
    CONSTRAINT l_duty_assignment_duty_teacher_id_fkey FOREIGN KEY(duty_teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_duty_assignment_assigned_by_fkey FOREIGN KEY(assigned_by) REFERENCES public.u_users(id),
    CONSTRAINT l_duty_assignment_status_check CHECK (((status)::text = ANY ((ARRAY['assigned'::character varying, 'done'::character varying, 'cancelled'::character varying])::text[])))
);
CREATE INDEX idx_duty_assignment_lookup ON lms.l_duty_assignment USING btree (homebase_id, periode_id, date, duty_teacher_id);

CREATE TABLE l_teacher_session_log(
    id SERIAL NOT NULL,
    schedule_entry_id integer NOT NULL,
    "date" date NOT NULL,
    teacher_id integer NOT NULL,
    duty_assignment_id integer,
    checkin_at timestamp without time zone,
    checkout_at timestamp without time zone,
    checkin_by integer,
    checkout_by integer,
    note text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_teacher_session_log_schedule_entry_id_fkey FOREIGN KEY(schedule_entry_id) REFERENCES lms.l_schedule_entry(id),
    CONSTRAINT l_teacher_session_log_teacher_id_fkey FOREIGN KEY(teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_teacher_session_log_duty_assignment_id_fkey FOREIGN KEY(duty_assignment_id) REFERENCES lms.l_duty_assignment(id),
    CONSTRAINT l_teacher_session_log_checkin_by_fkey FOREIGN KEY(checkin_by) REFERENCES public.u_users(id),
    CONSTRAINT l_teacher_session_log_checkout_by_fkey FOREIGN KEY(checkout_by) REFERENCES public.u_users(id),
    CONSTRAINT chk_teacher_session_time_order CHECK (((checkout_at IS NULL) OR (checkin_at IS NULL) OR (checkout_at >= checkin_at)))
);
CREATE UNIQUE INDEX uq_teacher_session_daily ON lms.l_teacher_session_log USING btree (schedule_entry_id, date);
CREATE INDEX idx_teacher_session_log_lookup ON lms.l_teacher_session_log USING btree (date, teacher_id, schedule_entry_id);

CREATE TABLE l_daily_absence_report(
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL,
    periode_id integer NOT NULL,
    "date" date NOT NULL,
    reporter_teacher_id integer NOT NULL,
    target_type varchar(20) NOT NULL,
    target_user_id integer NOT NULL,
    class_id integer,
    slot_id integer,
    reason text,
    follow_up text,
    status varchar(20) NOT NULL DEFAULT 'open'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT l_daily_absence_report_homebase_id_fkey FOREIGN KEY(homebase_id) REFERENCES public.a_homebase(id),
    CONSTRAINT l_daily_absence_report_periode_id_fkey FOREIGN KEY(periode_id) REFERENCES public.a_periode(id),
    CONSTRAINT l_daily_absence_report_reporter_teacher_id_fkey FOREIGN KEY(reporter_teacher_id) REFERENCES public.u_teachers(user_id),
    CONSTRAINT l_daily_absence_report_target_user_id_fkey FOREIGN KEY(target_user_id) REFERENCES public.u_users(id),
    CONSTRAINT l_daily_absence_report_class_id_fkey FOREIGN KEY(class_id) REFERENCES public.a_class(id),
    CONSTRAINT l_daily_absence_report_slot_id_fkey FOREIGN KEY(slot_id) REFERENCES lms.l_time_slot(id),
    CONSTRAINT l_daily_absence_report_target_type_check CHECK (((target_type)::text = ANY ((ARRAY['teacher'::character varying, 'student'::character varying])::text[]))),
    CONSTRAINT l_daily_absence_report_status_check CHECK (((status)::text = ANY ((ARRAY['open'::character varying, 'closed'::character varying])::text[])))
);
CREATE INDEX idx_daily_absence_report_lookup ON lms.l_daily_absence_report USING btree (homebase_id, periode_id, date, target_type, target_user_id);

SET search_path TO public;
COMMIT;

-- ================================================================
-- HELPER: Decode type format for monthly reports (Mxx-B{chapter}-S{sub})
-- Example: M02-B10-S3 -> month_num=2, chapter_id=10, subchapter=3
-- ================================================================
CREATE OR REPLACE FUNCTION fn_decode_score_type(p_type text)
RETURNS TABLE (
    month_num integer,
    chapter_id integer,
    subchapter integer
)
LANGUAGE sql
AS $$
    SELECT
        NULLIF(substring(p_type from 'M(\\d{2})'), '')::int AS month_num,
        NULLIF(substring(p_type from 'B(\\d+)'), '')::int AS chapter_id,
        NULLIF(substring(p_type from 'S(\\d+)'), '')::int AS subchapter;
$$;

-- ================================================================
-- VIEWS: Monthly Reports (Ready for frontend)
-- ================================================================

CREATE OR REPLACE VIEW v_report_attitude_monthly AS
SELECT
  e.periode_id,
  e.class_id,
  a.subject_id,
  a.teacher_id,
  a.month,
  a.semester,
  u.id AS student_id,
  u.full_name,
  st.nis,
  a.kinerja,
  a.kedisiplinan,
  a.keaktifan,
  a.percaya_diri,
  a.average_score,
  a.teacher_note
FROM u_class_enrollments e
JOIN u_users u ON e.student_id = u.id
JOIN u_students st ON e.student_id = st.user_id
LEFT JOIN l_score_attitude a
  ON a.student_id = e.student_id
 AND a.periode_id = e.periode_id;

CREATE OR REPLACE VIEW v_report_formative_monthly AS
SELECT
  e.periode_id,
  e.class_id,
  f.subject_id,
  f.teacher_id,
  f.month,
  f.semester,
  u.id AS student_id,
  u.full_name,
  st.nis,
  f.chapter_id,
  d.subchapter AS subchapter_index,
  f.score
FROM u_class_enrollments e
JOIN u_users u ON e.student_id = u.id
JOIN u_students st ON e.student_id = st.user_id
JOIN l_score_formative f ON f.student_id = e.student_id
LEFT JOIN LATERAL fn_decode_score_type(f.type) d ON true;

CREATE OR REPLACE VIEW v_report_summative_monthly AS
SELECT
  e.periode_id,
  e.class_id,
  s.subject_id,
  s.teacher_id,
  s.month,
  s.semester,
  u.id AS student_id,
  u.full_name,
  st.nis,
  s.chapter_id,
  d.subchapter AS subchapter_index,
  s.type,
  s.score_written,
  s.score_skill,
  s.final_score
FROM u_class_enrollments e
JOIN u_users u ON e.student_id = u.id
JOIN u_students st ON e.student_id = st.user_id
JOIN l_score_summative s ON s.student_id = e.student_id
LEFT JOIN LATERAL fn_decode_score_type(s.type) d ON true;

-- ================================================================
-- SAMPLE REPORT QUERIES (Bulanan)
-- ================================================================

-- 1) Laporan Nilai Sikap Bulanan (per kelas, mapel, periode)
-- Params: :subject_id, :class_id, :periode_id, :month, :semester
-- Note: join ke u_class_enrollments agar konteks kelas & periode akurat
-- SELECT
--   u.id AS student_id,
--   u.full_name,
--   st.nis,
--   a.month,
--   a.semester,
--   a.kinerja,
--   a.kedisiplinan,
--   a.keaktifan,
--   a.percaya_diri,
--   a.average_score,
--   a.teacher_note
-- FROM u_class_enrollments e
-- JOIN u_users u ON e.student_id = u.id
-- JOIN u_students st ON e.student_id = st.user_id
-- LEFT JOIN l_score_attitude a
--   ON a.student_id = e.student_id
--  AND a.subject_id = :subject_id
--  AND a.periode_id = :periode_id
--  AND a.month = :month
--  AND a.semester = :semester
-- WHERE e.class_id = :class_id
--   AND e.periode_id = :periode_id
-- ORDER BY u.full_name ASC;

-- 2) Laporan Nilai Formatif Bulanan (per bab/subbab)
-- Params: :subject_id, :class_id, :periode_id, :month, :semester
-- SELECT
--   u.id AS student_id,
--   u.full_name,
--   st.nis,
--   f.chapter_id,
--   d.subchapter AS subchapter_index,
--   f.score
-- FROM u_class_enrollments e
-- JOIN u_users u ON e.student_id = u.id
-- JOIN u_students st ON e.student_id = st.user_id
-- JOIN l_score_formative f ON f.student_id = e.student_id
-- LEFT JOIN LATERAL fn_decode_score_type(f.type) d ON true
-- WHERE f.subject_id = :subject_id
--   AND e.class_id = :class_id
--   AND e.periode_id = :periode_id
--   AND f.month = :month
--   AND f.semester = :semester
-- ORDER BY f.chapter_id, d.subchapter, u.full_name;

-- 3) Laporan Nilai Sumatif Bulanan (per bab)
-- Params: :subject_id, :class_id, :periode_id, :month, :semester
-- SELECT
--   u.id AS student_id,
--   u.full_name,
--   st.nis,
--   s.chapter_id,
--   s.score_written,
--   s.score_skill,
--   s.final_score
-- FROM u_class_enrollments e
-- JOIN u_users u ON e.student_id = u.id
-- JOIN u_students st ON e.student_id = st.user_id
-- JOIN l_score_summative s ON s.student_id = e.student_id
-- WHERE s.subject_id = :subject_id
--   AND e.class_id = :class_id
--   AND e.periode_id = :periode_id
--   AND s.month = :month
--   AND s.semester = :semester
-- ORDER BY s.chapter_id, u.full_name;

-- ================================================================
-- VIEW: Rekap Absensi Bulanan (LMS)
-- Menyediakan data dasar rekap attendance per siswa per hari
-- ================================================================
CREATE OR REPLACE VIEW v_report_attendance_monthly AS
SELECT
  e.periode_id,
  e.class_id,
  a.subject_id,
  a.teacher_id,
  EXTRACT(YEAR FROM a.date)::int AS year_num,
  EXTRACT(MONTH FROM a.date)::int AS month_num,
  u.id AS student_id,
  u.full_name,
  st.nis,
  a.date,
  a.status,
  CASE
    WHEN a.status IN ('Hadir', 'Telat') THEN 'H'
    WHEN a.status = 'Sakit' THEN 'S'
    WHEN a.status = 'Izin' THEN 'I'
    WHEN a.status = 'Alpa' THEN 'A'
    ELSE '-'
  END AS status_code
FROM u_class_enrollments e
JOIN u_users u ON u.id = e.student_id
JOIN u_students st ON st.user_id = e.student_id
LEFT JOIN l_attendance a
  ON a.student_id = e.student_id
 AND a.class_id = e.class_id;

-- ================================================================
-- PARENT DASHBOARD PERFORMANCE INDEXES (LMS)
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_parent_students_parent
ON u_parent_students(parent_user_id);

CREATE INDEX IF NOT EXISTS idx_l_attendance_student_periode
ON l_attendance(student_id, periode_id);

CREATE INDEX IF NOT EXISTS idx_l_chapter_class_ids_gin
ON l_chapter USING GIN (class_ids);

-- ================================================================
-- PARENT ACADEMIC REPORT PERFORMANCE INDEXES
-- ================================================================
CREATE INDEX IF NOT EXISTS idx_l_attendance_student_subject_date
ON l_attendance(student_id, subject_id, date);

CREATE INDEX IF NOT EXISTS idx_score_attitude_student_subject_semester_month
ON l_score_attitude(student_id, subject_id, semester, month);

CREATE INDEX IF NOT EXISTS idx_score_formative_student_subject_semester_month
ON l_score_formative(student_id, subject_id, semester, month);

CREATE INDEX IF NOT EXISTS idx_score_summative_student_subject_semester_month
ON l_score_summative(student_id, subject_id, semester, month);

