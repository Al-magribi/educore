/* REVISI FIXEDTABLE.SQL
   Digabungkan dengan fitur dari newtable.sql
*/

SET search_path TO public, public;

-- ================================================================
-- SECTION 1: MASTER WILAYAH & STUDENT DATABASE SCHEMA
-- DDL untuk tabel yang dipakai DbForm dipindahkan ke:
-- database/db_schema.sql
-- Schema target: "database"
-- ================================================================

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

-- PROFIL SISWA (tetap berada di schema public)
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
    province_id char(2) REFERENCES "database".db_province(id),
    city_id char(4) REFERENCES "database".db_city(id),
    district_id char(7) REFERENCES "database".db_district(id),
    village_id char(20) REFERENCES "database".db_village(id),
    postal_code text
);

-- Tabel pendukung DbForm pada schema "database" ada di file database/db_schema.sql

-- AKUN ORANG TUA (Login khusus ortu)
-- Revisi: 1 akun orang tua dapat terhubung ke lebih dari 1 siswa
CREATE TABLE u_parents (
    id SERIAL PRIMARY KEY,
    user_id integer REFERENCES u_users(id) ON DELETE CASCADE,
    student_id integer REFERENCES u_students(user_id), -- Link ke anak
    phone text,
    email text,
    CONSTRAINT uq_parent_student UNIQUE (user_id, student_id)
);

-- MIGRASI LEGACY:
-- Jika database lama masih memakai PRIMARY KEY (user_id) pada u_parents,
-- jalankan blok berikut agar 1 akun orang tua dapat terhubung ke lebih dari 1 siswa.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
         AND tc.table_schema = kcu.table_schema
         AND tc.table_name = kcu.table_name
        WHERE tc.table_schema = 'public'
          AND tc.table_name = 'u_parents'
          AND tc.constraint_type = 'PRIMARY KEY'
          AND kcu.column_name = 'user_id'
    ) THEN
        ALTER TABLE public.u_parents DROP CONSTRAINT u_parents_pkey;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints
        WHERE table_schema = 'public'
          AND table_name = 'u_parents'
          AND constraint_name = 'uq_parent_student'
    ) THEN
        ALTER TABLE public.u_parents
        ADD CONSTRAINT uq_parent_student UNIQUE (user_id, student_id);
    END IF;
END $$;

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
    is_active boolean DEFAULT true,
    homeroom_teacher_id integer REFERENCES u_teachers(user_id),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE a_class
ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

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
-- SECTION 5: LMS (LEARNING MANAGEMENT SYSTEM)
-- Menggabungkan fitur file, presensi, dan penilaian detail (sikap)
-- ================================================================

CREATE TABLE l_chapter (
    id SERIAL PRIMARY KEY,
    subject_id integer REFERENCES a_subject(id),
    title text NOT NULL,
    description text,
    order_number integer
);

CREATE TABLE l_content (
    id SERIAL PRIMARY KEY,
    chapter_id integer REFERENCES l_chapter(id),
    title text NOT NULL,
    body text,
    video_url text,
    attachment_url text, -- Menggantikan l_file, simpan path disini
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE l_attendance (
    id SERIAL PRIMARY KEY,
    class_id integer REFERENCES a_class(id),
    subject_id integer REFERENCES a_subject(id),
    student_id integer REFERENCES u_students(user_id),
    date date DEFAULT CURRENT_DATE,
    status varchar(20) CHECK (status IN ('Hadir', 'Izin', 'Sakit', 'Alpha')), 
    note text,
    teacher_id integer REFERENCES u_teachers(user_id)
);

-- PENGATURAN BOBOT NILAI (Dari l_weighting newtable)
CREATE TABLE l_score_weighting (
    id SERIAL PRIMARY KEY,
    teacher_id integer REFERENCES u_teachers(user_id),
    subject_id integer REFERENCES a_subject(id),
    weight_attendance integer DEFAULT 0,
    weight_attitude integer DEFAULT 0,
    weight_daily integer DEFAULT 0,
    weight_mid integer DEFAULT 0,
    weight_final integer DEFAULT 0,
    CONSTRAINT total_weight_100 CHECK ((weight_attendance + weight_attitude + weight_daily + weight_mid + weight_final) = 100)
);

-- NILAI SIKAP (Dari l_attitude newtable - Dibuat normalized)
CREATE TABLE l_score_attitude (
    id SERIAL PRIMARY KEY,
    student_id integer REFERENCES u_students(user_id),
    subject_id integer REFERENCES a_subject(id),
    periode_id integer REFERENCES a_periode(id),
    month varchar(20), -- Januari, Februari, dst
    kinerja integer DEFAULT 0,
    kedisiplinan integer DEFAULT 0,
    keaktifan integer DEFAULT 0,
    percaya_diri integer DEFAULT 0,
    
    teacher_note text,
    average_score numeric(5,2) GENERATED ALWAYS AS ((kinerja + kedisiplinan + keaktifan + percaya_diri) / 4.0) STORED
);

-- NILAI PENGETAHUAN (Formatif/Harian)
CREATE TABLE l_score_formative (
    id SERIAL PRIMARY KEY,
    student_id integer REFERENCES u_students(user_id),
    subject_id integer REFERENCES a_subject(id),
    chapter_id integer REFERENCES l_chapter(id),
    type varchar(50), -- Tugas 1, Kuis 1, Praktek
    score integer CHECK (score >= 0 AND score <= 100)
);

-- NILAI SUMATIF (PTS/PAS)
CREATE TABLE l_score_summative (
    id SERIAL PRIMARY KEY,
    student_id integer REFERENCES u_students(user_id),
    subject_id integer REFERENCES a_subject(id),
    periode_id integer REFERENCES a_periode(id),
    type varchar(20), -- 'PTS', 'PAS'
    score_written integer,
    score_skill integer, -- Nilai Praktek
    final_score numeric(5,2)
);

-- REKAP NILAI AKHIR (Untuk Rapor)
CREATE TABLE l_score_final (
    id SERIAL PRIMARY KEY,
    periode_id integer REFERENCES a_periode(id),
    student_id integer REFERENCES u_students(user_id),
    subject_id integer REFERENCES a_subject(id),
    final_grade integer, -- Nilai Akhir Angka
    letter_grade varchar(2) -- A, B, C
);

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
-- AI CONFIGURATION (TEACHER LEVEL / BYOK)
-- Dipakai lintas fitur: generator soal, penilaian essay, speech-to-text
-- Secret key disimpan dalam bentuk terenkripsi oleh server
-- =========================================

CREATE TABLE ai_teacher_config (
    id SERIAL PRIMARY KEY,
    teacher_id integer NOT NULL REFERENCES u_teachers(user_id) ON DELETE CASCADE,
    provider varchar(30) NOT NULL DEFAULT 'openai',
    api_key_encrypted text NOT NULL,
    api_key_hint varchar(30),
    default_model_text varchar(100) DEFAULT 'gpt-4.1-mini',
    default_model_audio varchar(100) DEFAULT 'gpt-4o-mini-transcribe',
    default_language varchar(20) DEFAULT 'id',
    default_mode varchar(20) DEFAULT 'live'
      CHECK (default_mode IN ('live', 'ai')),
    max_audio_duration_seconds integer DEFAULT 300
      CHECK (max_audio_duration_seconds > 0),
    max_audio_file_size_mb integer DEFAULT 20
      CHECK (max_audio_file_size_mb > 0),
    is_active boolean DEFAULT true,
    last_test_at timestamp,
    last_test_status varchar(20)
      CHECK (last_test_status IN ('success', 'failed', 'pending') OR last_test_status IS NULL),
    last_test_message text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_teacher_provider UNIQUE (teacher_id, provider)
);

CREATE INDEX idx_ai_teacher_config_teacher
ON ai_teacher_config(teacher_id);

CREATE INDEX idx_ai_teacher_config_provider
ON ai_teacher_config(provider, is_active);

CREATE TABLE ai_teacher_feature (
    id SERIAL PRIMARY KEY,
    teacher_config_id integer NOT NULL REFERENCES ai_teacher_config(id) ON DELETE CASCADE,
    feature_code varchar(50) NOT NULL
      CHECK (feature_code IN ('question_generator', 'essay_grader', 'speech_to_text')),
    is_enabled boolean DEFAULT true,
    model_override varchar(100),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ai_teacher_feature UNIQUE (teacher_config_id, feature_code)
);

CREATE INDEX idx_ai_teacher_feature_lookup
ON ai_teacher_feature(teacher_config_id, feature_code, is_enabled);

CREATE TABLE ai_usage_log (
    id BIGSERIAL PRIMARY KEY,
    teacher_id integer NOT NULL REFERENCES u_teachers(user_id) ON DELETE CASCADE,
    teacher_config_id integer REFERENCES ai_teacher_config(id) ON DELETE SET NULL,
    feature_code varchar(50) NOT NULL
      CHECK (feature_code IN ('question_generator', 'essay_grader', 'speech_to_text')),
    provider varchar(30) NOT NULL DEFAULT 'openai',
    model varchar(100),
    request_type varchar(20) NOT NULL
      CHECK (request_type IN ('text', 'audio')),
    mode varchar(20)
      CHECK (mode IN ('live', 'ai') OR mode IS NULL),
    reference_table varchar(100),
    reference_id bigint,
    audio_url text,
    audio_duration_seconds integer
      CHECK (audio_duration_seconds IS NULL OR audio_duration_seconds >= 0),
    input_units integer
      CHECK (input_units IS NULL OR input_units >= 0),
    output_units integer
      CHECK (output_units IS NULL OR output_units >= 0),
    transcript_text text,
    response_text text,
    estimated_cost_usd numeric(12,6)
      CHECK (estimated_cost_usd IS NULL OR estimated_cost_usd >= 0),
    status varchar(20) NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'processing', 'success', 'failed')),
    error_message text,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_usage_log_teacher_feature
ON ai_usage_log(teacher_id, feature_code, created_at DESC);

CREATE INDEX idx_ai_usage_log_status
ON ai_usage_log(status, created_at DESC);