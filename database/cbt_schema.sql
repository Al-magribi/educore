CREATE SCHEMA IF NOT EXISTS cbt;

SET search_path TO cbt, public;

BEGIN;

CREATE TABLE cbt.c_bank (
    id SERIAL PRIMARY KEY,
    teacher_id integer REFERENCES public.u_teachers(user_id),
    subject_id integer REFERENCES public.a_subject(id),
    title varchar(255) NOT NULL,
    type varchar(50), -- UH, PTS, PAS
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_c_bank_teacher_created
ON cbt.c_bank (teacher_id, created_at DESC);

CREATE TABLE cbt.c_exam (
    id SERIAL PRIMARY KEY,
    bank_id integer REFERENCES cbt.c_bank(id) ON DELETE CASCADE,
    name varchar(255) NOT NULL,
    duration_minutes integer NOT NULL,
    token varchar(10),
    is_active boolean DEFAULT true,
    is_shuffle boolean DEFAULT false,
    grade_id integer REFERENCES public.a_grade(id),
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_c_exam_bank
ON cbt.c_exam (bank_id);

-- RELASI UJIAN KE KELAS
CREATE TABLE cbt.c_exam_class (
    id SERIAL PRIMARY KEY,
    exam_id integer REFERENCES cbt.c_exam(id) ON DELETE CASCADE,
    class_id integer REFERENCES public.a_class(id) ON DELETE CASCADE
);

CREATE INDEX idx_c_exam_class_exam
ON cbt.c_exam_class (exam_id, class_id);

CREATE INDEX idx_c_exam_class_class
ON cbt.c_exam_class (class_id, exam_id);

CREATE TABLE cbt.c_question (
    id SERIAL PRIMARY KEY,
    bank_id integer REFERENCES cbt.c_bank(id) ON DELETE CASCADE,
    q_type smallint NOT NULL, -- 1=PG, 2=Essay, dll
    bloom_level smallint DEFAULT NULL, -- 1=Remembering, 2=Understanding, 3=Applying, 4=Analyzing, 5=Evaluating, 6=Creating
    content text NOT NULL,
    media_url text,
    audio_url text,
    score_point integer DEFAULT 1
);

CREATE INDEX idx_c_question_bank
ON cbt.c_question (bank_id, id);

CREATE TABLE cbt.c_question_options (
    id SERIAL PRIMARY KEY,
    question_id integer REFERENCES cbt.c_question(id) ON DELETE CASCADE,
    label text, -- A, B, C, D
    content text,
    media_url text,
    is_correct boolean DEFAULT false
);

CREATE INDEX idx_c_question_options_question
ON cbt.c_question_options (question_id, id);

CREATE TABLE cbt.c_student_session (
    id SERIAL PRIMARY KEY,
    exam_id integer REFERENCES cbt.c_exam(id) ON DELETE CASCADE,
    student_id integer REFERENCES public.u_students(user_id),
    start_time timestamp DEFAULT CURRENT_TIMESTAMP,
    finish_time timestamp,
    score_final numeric(5,2)
);

-- LOG KEHADIRAN CBT SISWA
CREATE TABLE cbt.c_exam_attendance (
    id SERIAL PRIMARY KEY,
    exam_id integer REFERENCES cbt.c_exam(id) ON DELETE CASCADE,
    student_id integer REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    class_id integer REFERENCES public.a_class(id),
    status varchar(20) DEFAULT 'mengerjakan'
      CHECK (status IN ('belum_masuk', 'izin', 'izinkan', 'mengerjakan', 'pelanggaran', 'selesai')),
    ip_address text,
    browser text,
    start_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_exam_student UNIQUE (exam_id, student_id)
);

CREATE INDEX idx_exam_attendance_exam ON cbt.c_exam_attendance (exam_id);
CREATE INDEX idx_students_current_class ON public.u_students (current_class_id);

CREATE TABLE cbt.c_answer (
    id SERIAL PRIMARY KEY,
    session_id integer REFERENCES cbt.c_student_session(id) ON DELETE CASCADE,
    question_id integer REFERENCES cbt.c_question(id) ON DELETE CASCADE,
    selected_option_id integer REFERENCES cbt.c_question_options(id) ON DELETE CASCADE,
    essay_text text,
    is_correct boolean,
    score_obtained numeric(5,2)
);

-- Jawaban siswa untuk autosave (semua tipe soal)
CREATE TABLE cbt.c_student_answer (
    id SERIAL PRIMARY KEY,
    exam_id integer REFERENCES cbt.c_exam(id) ON DELETE CASCADE,
    student_id integer REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    question_id integer REFERENCES cbt.c_question(id) ON DELETE CASCADE,
    answer_json jsonb,
    score_obtained numeric(6,2),
    is_doubt boolean DEFAULT false,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_student_answer UNIQUE (exam_id, student_id, question_id)
);


-- =========================================================
-- RUBRIK SOAL URAIAN
-- Mendukung template umum, eksak, non-eksak
-- =========================================================

CREATE TABLE cbt.c_rubric_template (
    id SERIAL PRIMARY KEY,
    code varchar(50) NOT NULL UNIQUE,
    name varchar(100) NOT NULL,
    category varchar(30) NOT NULL DEFAULT 'general'
      CHECK (category IN ('general', 'exact', 'non_exact')),
    description text,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_c_rubric_template_category
ON cbt.c_rubric_template (category, is_active);

CREATE TABLE cbt.c_rubric_template_item (
    id SERIAL PRIMARY KEY,
    template_id integer NOT NULL REFERENCES cbt.c_rubric_template(id) ON DELETE CASCADE,
    criteria_name varchar(255) NOT NULL,
    criteria_description text,
    default_weight numeric(6,2) DEFAULT 0,
    order_no integer DEFAULT 1,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_c_rubric_template_item_weight CHECK (default_weight >= 0)
);

CREATE INDEX idx_c_rubric_template_item_template
ON cbt.c_rubric_template_item (template_id, order_no);

-- Rubrik final yang dipakai oleh soal uraian tertentu
CREATE TABLE cbt.c_question_rubric (
    id SERIAL PRIMARY KEY,
    question_id integer NOT NULL REFERENCES cbt.c_question(id) ON DELETE CASCADE,
    template_id integer REFERENCES cbt.c_rubric_template(id) ON DELETE SET NULL,
    criteria_name varchar(255) NOT NULL,
    criteria_description text,
    max_score numeric(6,2) NOT NULL DEFAULT 0,
    order_no integer DEFAULT 1,
    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_c_question_rubric_max_score CHECK (max_score >= 0)
);

CREATE INDEX idx_c_question_rubric_question
ON cbt.c_question_rubric (question_id, order_no);

CREATE INDEX idx_c_question_rubric_template
ON cbt.c_question_rubric (template_id);

-- Optional: cegah duplikasi urutan rubric dalam 1 soal
CREATE UNIQUE INDEX uq_c_question_rubric_question_order
ON cbt.c_question_rubric (question_id, order_no);


-- =========================================================
-- HASIL KOREKSI MANUAL/AI PER SOAL
-- =========================================================

CREATE TABLE cbt.c_answer_review (
    id BIGSERIAL PRIMARY KEY,
    exam_id integer NOT NULL REFERENCES cbt.c_exam(id) ON DELETE CASCADE,
    student_id integer NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    question_id integer NOT NULL REFERENCES cbt.c_question(id) ON DELETE CASCADE,

    review_status varchar(20) NOT NULL DEFAULT 'pending'
      CHECK (review_status IN ('pending', 'reviewed', 'finalized')),
    grading_source varchar(20) NOT NULL DEFAULT 'manual'
      CHECK (grading_source IN ('manual', 'ai', 'hybrid')),
    total_score numeric(6,2) NOT NULL DEFAULT 0
      CHECK (total_score >= 0),
    reviewer_id integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    reviewed_at timestamptz,
    finalized_at timestamptz,
    notes text,

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_c_answer_review UNIQUE (exam_id, student_id, question_id)
);

CREATE INDEX idx_c_answer_review_lookup
ON cbt.c_answer_review (exam_id, student_id, review_status);

CREATE INDEX idx_c_answer_review_question
ON cbt.c_answer_review (question_id, grading_source);


-- =========================================================
-- DETAIL SKOR PER ASPEK RUBRIC
-- =========================================================

CREATE TABLE cbt.c_answer_review_detail (
    id BIGSERIAL PRIMARY KEY,
    review_id bigint NOT NULL REFERENCES cbt.c_answer_review(id) ON DELETE CASCADE,
    question_rubric_id integer NOT NULL REFERENCES cbt.c_question_rubric(id) ON DELETE CASCADE,

    score numeric(6,2) NOT NULL DEFAULT 0
      CHECK (score >= 0),
    feedback text,
    source varchar(20) NOT NULL DEFAULT 'manual'
      CHECK (source IN ('manual', 'ai')),

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_c_answer_review_detail UNIQUE (review_id, question_rubric_id)
);

CREATE INDEX idx_c_answer_review_detail_review
ON cbt.c_answer_review_detail (review_id);

CREATE INDEX idx_c_answer_review_detail_rubric
ON cbt.c_answer_review_detail (question_rubric_id);



-- =========================================================
-- SEED TEMPLATE RUBRIK BAWAAN
-- =========================================================

INSERT INTO cbt.c_rubric_template (code, name, category, description)
VALUES
  ('general_essay', 'Rubrik Umum Uraian', 'general', 'Rubrik umum untuk berbagai jenis soal uraian'),
  ('exact_essay', 'Rubrik Uraian Eksak', 'exact', 'Rubrik untuk mapel eksak seperti Matematika dan IPA'),
  ('non_exact_essay', 'Rubrik Uraian Non-Eksak', 'non_exact', 'Rubrik untuk mapel non-eksak seperti Bahasa, IPS, PAI');

-- Template umum
INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Ketepatan Isi', 'Menilai ketepatan konsep atau jawaban utama.', 0, 1
FROM cbt.c_rubric_template
WHERE code = 'general_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Kelengkapan Jawaban', 'Menilai kelengkapan unsur yang diminta pada soal.', 0, 2
FROM cbt.c_rubric_template
WHERE code = 'general_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Kejelasan Penjelasan', 'Menilai kejelasan alur penjelasan atau uraian.', 0, 3
FROM cbt.c_rubric_template
WHERE code = 'general_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Relevansi Pendukung', 'Menilai relevansi contoh, alasan, data, atau bukti pendukung.', 0, 4
FROM cbt.c_rubric_template
WHERE code = 'general_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Struktur Penyajian', 'Menilai kerapihan dan struktur penyampaian jawaban.', 0, 5
FROM cbt.c_rubric_template
WHERE code = 'general_essay';

-- Template eksak
INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Ketepatan Hasil Akhir', 'Menilai kebenaran hasil akhir atau solusi utama.', 0, 1
FROM cbt.c_rubric_template
WHERE code = 'exact_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Ketepatan Langkah Penyelesaian', 'Menilai urutan langkah penyelesaian yang benar.', 0, 2
FROM cbt.c_rubric_template
WHERE code = 'exact_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Penggunaan Rumus atau Metode', 'Menilai kesesuaian rumus, metode, atau prosedur.', 0, 3
FROM cbt.c_rubric_template
WHERE code = 'exact_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Kelengkapan Proses', 'Menilai kelengkapan proses pengerjaan.', 0, 4
FROM cbt.c_rubric_template
WHERE code = 'exact_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Kerapihan Kerja', 'Menilai kerapihan dan keterbacaan jawaban.', 0, 5
FROM cbt.c_rubric_template
WHERE code = 'exact_essay';

-- Template non-eksak
INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Ketepatan Konsep', 'Menilai ketepatan pemahaman konsep utama.', 0, 1
FROM cbt.c_rubric_template
WHERE code = 'non_exact_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Kelengkapan Argumen', 'Menilai kelengkapan ide, pendapat, atau argumen.', 0, 2
FROM cbt.c_rubric_template
WHERE code = 'non_exact_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Relevansi Contoh atau Data', 'Menilai kecocokan contoh, data, atau ilustrasi pendukung.', 0, 3
FROM cbt.c_rubric_template
WHERE code = 'non_exact_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Kejelasan Uraian', 'Menilai kejelasan penyampaian jawaban.', 0, 4
FROM cbt.c_rubric_template
WHERE code = 'non_exact_essay';

INSERT INTO cbt.c_rubric_template_item (template_id, criteria_name, criteria_description, default_weight, order_no)
SELECT id, 'Struktur Bahasa atau Presentasi', 'Menilai struktur bahasa, susunan, dan kerapihan penyajian.', 0, 5
FROM cbt.c_rubric_template
WHERE code = 'non_exact_essay';



CREATE INDEX idx_student_answer_lookup
ON cbt.c_student_answer (exam_id, student_id);

CREATE INDEX idx_c_student_answer_question
ON cbt.c_student_answer (question_id);


-- =========================================================
-- DRAFT GENERATE SOAL AI
-- Menyimpan hasil generate AI sebagai draft sebelum disetujui
-- =========================================================

CREATE TABLE cbt.c_ai_question_job (
    id BIGSERIAL PRIMARY KEY,
    bank_id integer NOT NULL REFERENCES cbt.c_bank(id) ON DELETE CASCADE,
    requested_by integer NOT NULL REFERENCES public.u_users(id) ON DELETE RESTRICT,
    ai_teacher_config_id bigint REFERENCES public.ai_teacher_config(id) ON DELETE SET NULL,

    boss_job_id uuid,
    boss_queue_name varchar(100) NOT NULL DEFAULT 'cbt-ai-question-generator',

    feature_code varchar(50) NOT NULL DEFAULT 'question_generator',
    status varchar(20) NOT NULL DEFAULT 'queued'
      CHECK (status IN ('queued', 'running', 'completed', 'failed', 'approved', 'discarded', 'cancelled')),

    provider varchar(30) NOT NULL DEFAULT 'openai',
    model varchar(100),
    temperature numeric(4,2),

    grade_id integer REFERENCES public.a_grade(id) ON DELETE SET NULL,
    subject_id integer REFERENCES public.a_subject(id) ON DELETE SET NULL,

    total_requested integer NOT NULL DEFAULT 0 CHECK (total_requested >= 0),
    total_generated integer NOT NULL DEFAULT 0 CHECK (total_generated >= 0),
    total_approved integer NOT NULL DEFAULT 0 CHECK (total_approved >= 0),
    total_discarded integer NOT NULL DEFAULT 0 CHECK (total_discarded >= 0),

    requested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at timestamptz,
    finished_at timestamptz,
    approved_at timestamptz,
    discarded_at timestamptz,

    request_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_message text,

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_c_ai_question_job_boss_job
ON cbt.c_ai_question_job (boss_job_id)
WHERE boss_job_id IS NOT NULL;

CREATE INDEX idx_c_ai_question_job_bank_status
ON cbt.c_ai_question_job (bank_id, status, requested_at DESC);

CREATE INDEX idx_c_ai_question_job_requested_by
ON cbt.c_ai_question_job (requested_by, requested_at DESC);


CREATE TABLE cbt.c_ai_question_draft (
    id BIGSERIAL PRIMARY KEY,
    job_id bigint NOT NULL REFERENCES cbt.c_ai_question_job(id) ON DELETE CASCADE,
    bank_id integer NOT NULL REFERENCES cbt.c_bank(id) ON DELETE CASCADE,

    q_type smallint NOT NULL
      CHECK (q_type IN (1, 2, 3, 4, 5, 6)),
    bloom_level smallint
      CHECK (bloom_level IS NULL OR bloom_level BETWEEN 1 AND 6),

    content text NOT NULL,
    score_point numeric(6,2) NOT NULL DEFAULT 0
      CHECK (score_point >= 0),

    options_json jsonb NOT NULL DEFAULT '[]'::jsonb,
    rubric_template_id integer REFERENCES cbt.c_rubric_template(id) ON DELETE SET NULL,
    rubric_json jsonb NOT NULL DEFAULT '[]'::jsonb,

    sort_order integer NOT NULL DEFAULT 1,
    source_payload jsonb NOT NULL DEFAULT '{}'::jsonb,

    draft_status varchar(20) NOT NULL DEFAULT 'draft'
      CHECK (draft_status IN ('draft', 'reviewed', 'approved', 'discarded')),
    is_edited boolean NOT NULL DEFAULT false,

    approved_question_id integer REFERENCES cbt.c_question(id) ON DELETE SET NULL,
    approved_at timestamptz,
    discarded_at timestamptz,

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_c_ai_question_draft_job
ON cbt.c_ai_question_draft (job_id, sort_order, id);

CREATE INDEX idx_c_ai_question_draft_bank_status
ON cbt.c_ai_question_draft (bank_id, draft_status, created_at DESC);

CREATE INDEX idx_c_ai_question_draft_approved_question
ON cbt.c_ai_question_draft (approved_question_id);


-- =========================================================
-- JOB KOREKSI AI MASSAL
-- Tracking aplikasi untuk proses background via pg-boss
-- =========================================================

CREATE TABLE cbt.c_ai_grading_job (
    id BIGSERIAL PRIMARY KEY,
    exam_id integer NOT NULL REFERENCES cbt.c_exam(id) ON DELETE CASCADE,
    requested_by integer NOT NULL REFERENCES public.u_users(id) ON DELETE RESTRICT,
    ai_teacher_config_id bigint,

    boss_job_id uuid,
    boss_queue_name varchar(100) NOT NULL DEFAULT 'cbt-ai-grading',

    feature_code varchar(50) NOT NULL DEFAULT 'cbt_exam_grading',
    target_scope varchar(20) NOT NULL DEFAULT 'manual_review'
      CHECK (target_scope IN ('manual_review', 'essay_only', 'short_only', 'match_only', 'all_supported')),
    grading_mode varchar(20) NOT NULL DEFAULT 'all_students'
      CHECK (grading_mode IN ('all_students', 'selected_students', 'single_student')),
    status varchar(20) NOT NULL DEFAULT 'queued'
      CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),

    provider varchar(30) NOT NULL DEFAULT 'openai',
    model varchar(100),
    temperature numeric(4,2),

    total_students integer NOT NULL DEFAULT 0 CHECK (total_students >= 0),
    total_items integer NOT NULL DEFAULT 0 CHECK (total_items >= 0),
    processed_items integer NOT NULL DEFAULT 0 CHECK (processed_items >= 0),
    success_items integer NOT NULL DEFAULT 0 CHECK (success_items >= 0),
    failed_items integer NOT NULL DEFAULT 0 CHECK (failed_items >= 0),
    skipped_items integer NOT NULL DEFAULT 0 CHECK (skipped_items >= 0),

    requested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at timestamptz,
    finished_at timestamptz,
    cancelled_at timestamptz,

    options_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
    error_message text,

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uq_c_ai_grading_job_boss_job
ON cbt.c_ai_grading_job (boss_job_id)
WHERE boss_job_id IS NOT NULL;

CREATE INDEX idx_c_ai_grading_job_exam_status
ON cbt.c_ai_grading_job (exam_id, status, requested_at DESC);

CREATE INDEX idx_c_ai_grading_job_requested_by
ON cbt.c_ai_grading_job (requested_by, requested_at DESC);


CREATE TABLE cbt.c_ai_grading_job_item (
    id BIGSERIAL PRIMARY KEY,
    job_id bigint NOT NULL REFERENCES cbt.c_ai_grading_job(id) ON DELETE CASCADE,
    exam_id integer NOT NULL REFERENCES cbt.c_exam(id) ON DELETE CASCADE,
    student_id integer NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    question_id integer NOT NULL REFERENCES cbt.c_question(id) ON DELETE CASCADE,
    answer_review_id bigint REFERENCES cbt.c_answer_review(id) ON DELETE SET NULL,

    question_type smallint NOT NULL
      CHECK (question_type IN (3, 4, 6)),
    status varchar(20) NOT NULL DEFAULT 'queued'
      CHECK (status IN ('queued', 'running', 'completed', 'failed', 'skipped')),
    grading_source varchar(20) NOT NULL DEFAULT 'ai'
      CHECK (grading_source IN ('ai', 'hybrid')),

    max_score numeric(6,2) NOT NULL DEFAULT 0 CHECK (max_score >= 0),
    score_awarded numeric(6,2) CHECK (score_awarded >= 0),
    confidence_score numeric(5,2)
      CHECK (confidence_score IS NULL OR (confidence_score >= 0 AND confidence_score <= 100)),

    attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
    max_attempts integer NOT NULL DEFAULT 3 CHECK (max_attempts >= 1),

    queued_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at timestamptz,
    finished_at timestamptz,

    prompt_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    response_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    feedback_summary text,
    error_message text,

    created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT uq_c_ai_grading_job_item UNIQUE (job_id, student_id, question_id)
);

CREATE INDEX idx_c_ai_grading_job_item_job_status
ON cbt.c_ai_grading_job_item (job_id, status, queued_at);

CREATE INDEX idx_c_ai_grading_job_item_lookup
ON cbt.c_ai_grading_job_item (exam_id, student_id, question_id);

CREATE INDEX idx_c_ai_grading_job_item_answer_review
ON cbt.c_ai_grading_job_item (answer_review_id);


CREATE TABLE cbt.c_ai_grading_job_event (
    id BIGSERIAL PRIMARY KEY,
    job_id bigint NOT NULL REFERENCES cbt.c_ai_grading_job(id) ON DELETE CASCADE,
    job_item_id bigint REFERENCES cbt.c_ai_grading_job_item(id) ON DELETE CASCADE,
    event_type varchar(30) NOT NULL
      CHECK (event_type IN ('queued', 'started', 'progress', 'completed', 'failed', 'cancelled', 'retry')),
    message text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_c_ai_grading_job_event_job
ON cbt.c_ai_grading_job_event (job_id, created_at DESC);

CREATE INDEX idx_c_ai_grading_job_event_item
ON cbt.c_ai_grading_job_event (job_item_id, created_at DESC);


COMMIT;
