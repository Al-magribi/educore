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
-- Revisi: 1 akun orang tua dapat terhubung ke lebih dari 1 siswa
CREATE TABLE u_parents (
    id SERIAL PRIMARY KEY,
    user_id integer REFERENCES u_users(id) ON DELETE CASCADE,
    student_id integer REFERENCES u_students(user_id), -- Link ke anak
    phone text,
    email text,
    CONSTRAINT uq_parent_student UNIQUE (user_id, student_id)
);

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

-- ================================================================
-- SECTION 7: STUDENT DATABASE PRESENTATION VIEW
-- Dipakai untuk kebutuhan monitoring keterisian database siswa
-- ================================================================

CREATE OR REPLACE VIEW vw_student_database_profile AS
SELECT
    u.id AS student_id,
    u.full_name,
    u.gender,
    s.nis,
    s.nisn,
    s.birth_place,
    s.birth_date,
    s.height,
    s.weight,
    s.head_circumference,
    s.order_number,
    s.siblings_count,
    s.address,
    s.postal_code,
    hb.name AS education_unit,
    pr.name AS province,
    ci.name AS city,
    di.name AS district,
    vi.name AS village,
    cl.id AS class_id,
    cl.name AS class_name,
    gr.id AS grade_id,
    gr.name AS grade_name,
    pe.name AS academic_year,
    fam.father_name,
    fam.father_nik,
    fam.father_birth_place,
    fam.father_birth_date,
    fam.father_phone,
    fam.mother_name,
    fam.mother_nik,
    fam.mother_birth_place,
    fam.mother_birth_date,
    fam.mother_phone,
    COALESCE(sib.siblings, '[]'::json) AS siblings
FROM u_users u
JOIN u_students s ON s.user_id = u.id
LEFT JOIN a_homebase hb ON hb.id = s.homebase_id
LEFT JOIN LATERAL (
    SELECT ce.class_id, ce.periode_id
    FROM u_class_enrollments ce
    WHERE ce.student_id = u.id
    ORDER BY ce.enrolled_at DESC, ce.id DESC
    LIMIT 1
) ce_last ON true
LEFT JOIN a_class cl ON cl.id = ce_last.class_id
LEFT JOIN a_grade gr ON gr.id = cl.grade_id
LEFT JOIN a_periode pe ON pe.id = ce_last.periode_id
LEFT JOIN db_province pr ON pr.id = s.province_id
LEFT JOIN db_city ci ON ci.id = s.city_id
LEFT JOIN db_district di ON di.id = s.district_id
LEFT JOIN db_village vi ON vi.id = s.village_id
LEFT JOIN LATERAL (
    SELECT
      sf.father_name,
      sf.father_nik,
      sf.father_birth_place,
      sf.father_birth_date,
      sf.father_phone,
      sf.mother_name,
      sf.mother_nik,
      sf.mother_birth_place,
      sf.mother_birth_date,
      sf.mother_phone
    FROM u_student_families sf
    WHERE sf.student_id = u.id
    ORDER BY sf.id DESC
    LIMIT 1
) fam ON true
LEFT JOIN LATERAL (
    SELECT json_agg(
      json_build_object(
        'id', ss.id,
        'name', ss.name,
        'gender', ss.gender,
        'birth_date', ss.birth_date
      )
      ORDER BY ss.birth_date ASC NULLS LAST, ss.id ASC
    ) AS siblings
    FROM u_student_siblings ss
    WHERE ss.student_id = u.id
) sib ON true
WHERE u.role = 'student';
