CREATE SCHEMA IF NOT EXISTS cbt;

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
    bank_id integer REFERENCES cbt.c_bank(id),
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
    exam_id integer REFERENCES cbt.c_exam(id),
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
    session_id integer REFERENCES cbt.c_student_session(id),
    question_id integer REFERENCES cbt.c_question(id),
    selected_option_id integer REFERENCES cbt.c_question_options(id),
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

CREATE INDEX idx_student_answer_lookup
ON cbt.c_student_answer (exam_id, student_id);

CREATE INDEX idx_c_student_answer_question
ON cbt.c_student_answer (question_id);

COMMIT;
