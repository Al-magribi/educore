-- Modul Tata Usaha: buku induk, mutasi, alumni, ijazah, surat, sarana.

DO $$
DECLARE
  constraint_name text;
BEGIN
  IF to_regclass('public.u_staff_assignment') IS NULL THEN
    RETURN;
  END IF;

  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'u_staff_assignment'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) ILIKE '%assignment_type%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.u_staff_assignment DROP CONSTRAINT %I',
      constraint_name
    );
  END LOOP;

  ALTER TABLE public.u_staff_assignment
    ADD CONSTRAINT u_staff_assignment_assignment_type_check
    CHECK (assignment_type IN ('cbt', 'kurikulum', 'kesiswaan', 'tu'));
END $$;

CREATE TABLE IF NOT EXISTS public.tu_buku_induk (
  id SERIAL PRIMARY KEY,
  homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
  register_no integer,
  entry_year integer,
  student_status varchar(20) NOT NULL DEFAULT 'aktif'
    CHECK (student_status IN ('aktif', 'pindah', 'lulus', 'keluar')),
  profile jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_tu_buku_student UNIQUE (homebase_id, student_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tu_buku_register
  ON public.tu_buku_induk (homebase_id, entry_year, register_no)
  WHERE register_no IS NOT NULL AND entry_year IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tu_buku_homebase
  ON public.tu_buku_induk (homebase_id, entry_year, student_status);

CREATE TABLE IF NOT EXISTS public.tu_buku_score (
  id SERIAL PRIMARY KEY,
  buku_id integer NOT NULL REFERENCES public.tu_buku_induk(id) ON DELETE CASCADE,
  periode_id integer REFERENCES public.a_periode(id) ON DELETE SET NULL,
  periode_name text,
  semester smallint NOT NULL CHECK (semester IN (1, 2, 3)),
  subject_id integer REFERENCES public.a_subject(id) ON DELETE SET NULL,
  subject_name text NOT NULL,
  category_name text,
  kind varchar(20) NOT NULL DEFAULT 'mapel'
    CHECK (kind IN ('mapel', 'ekskul', 'us')),
  class_name text,
  homeroom_name text,
  score_lms numeric(6, 2),
  predicate_lms varchar(4),
  score_override numeric(6, 2),
  predicate_override varchar(8),
  sort_order integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tu_buku_score_subject
  ON public.tu_buku_score (buku_id, periode_id, semester, subject_id)
  WHERE subject_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_tu_buku_score_manual
  ON public.tu_buku_score (buku_id, COALESCE(periode_id, 0), semester, kind, lower(subject_name))
  WHERE subject_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_tu_buku_score_buku
  ON public.tu_buku_score (buku_id, periode_id, semester, sort_order);

CREATE TABLE IF NOT EXISTS public.tu_buku_attendance (
  id SERIAL PRIMARY KEY,
  buku_id integer NOT NULL REFERENCES public.tu_buku_induk(id) ON DELETE CASCADE,
  periode_id integer NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
  semester smallint NOT NULL CHECK (semester IN (1, 2)),
  sick_lms integer,
  permit_lms integer,
  absent_lms integer,
  sick_override integer,
  permit_override integer,
  absent_override integer,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_tu_buku_attendance UNIQUE (buku_id, periode_id, semester)
);

CREATE TABLE IF NOT EXISTS public.tu_buku_decision (
  id SERIAL PRIMARY KEY,
  buku_id integer NOT NULL REFERENCES public.tu_buku_induk(id) ON DELETE CASCADE,
  periode_id integer NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
  year_label text,
  decision varchar(20) CHECK (decision IN ('naik', 'tinggal', 'lulus')),
  note text,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_tu_buku_decision UNIQUE (buku_id, periode_id)
);

CREATE TABLE IF NOT EXISTS public.tu_buku_inspection (
  id SERIAL PRIMARY KEY,
  homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
  inspected_on date,
  officer_name text NOT NULL,
  position text,
  note text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tu_inspection_homebase
  ON public.tu_buku_inspection (homebase_id, inspected_on DESC);

CREATE TABLE IF NOT EXISTS public.tu_mutation (
  id SERIAL PRIMARY KEY,
  homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
  direction varchar(10) NOT NULL CHECK (direction IN ('masuk', 'keluar')),
  mutation_date date,
  school_name text,
  class_name text,
  reason text,
  created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tu_mutation_homebase
  ON public.tu_mutation (homebase_id, mutation_date DESC, id DESC);

CREATE TABLE IF NOT EXISTS public.tu_alumni (
  id SERIAL PRIMARY KEY,
  homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
  graduation_year integer,
  continue_to text,
  major_name text,
  workplace text,
  income text,
  phone text,
  note text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_tu_alumni_student UNIQUE (homebase_id, student_id)
);

CREATE TABLE IF NOT EXISTS public.tu_diploma (
  id SERIAL PRIMARY KEY,
  homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
  student_id integer NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
  kind varchar(10) NOT NULL CHECK (kind IN ('asal', 'terbit')),
  diploma_date date,
  diploma_no text,
  skhun_no text,
  exam_no text,
  school_name text,
  file_url text,
  note text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_tu_diploma_student_kind UNIQUE (homebase_id, student_id, kind)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tu_diploma_no
  ON public.tu_diploma (homebase_id, lower(diploma_no))
  WHERE diploma_no IS NOT NULL AND btrim(diploma_no) <> '';

CREATE TABLE IF NOT EXISTS public.tu_letter (
  id SERIAL PRIMARY KEY,
  homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
  direction varchar(10) NOT NULL CHECK (direction IN ('masuk', 'keluar')),
  letter_no text NOT NULL,
  letter_date date,
  subject text NOT NULL,
  party text,
  file_url text,
  file_name text,
  note text,
  created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_tu_letter_no UNIQUE (homebase_id, direction, letter_no)
);

CREATE INDEX IF NOT EXISTS idx_tu_letter_homebase
  ON public.tu_letter (homebase_id, direction, letter_date DESC);

CREATE TABLE IF NOT EXISTS public.tu_letter_sequence (
  homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
  year integer NOT NULL,
  direction varchar(10) NOT NULL CHECK (direction IN ('masuk', 'keluar')),
  last_number integer NOT NULL DEFAULT 0,
  PRIMARY KEY (homebase_id, year, direction)
);

CREATE TABLE IF NOT EXISTS public.tu_facility (
  id SERIAL PRIMARY KEY,
  homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
  code text,
  name text NOT NULL,
  category text,
  location text,
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  condition varchar(20) NOT NULL DEFAULT 'baik'
    CHECK (condition IN ('baik', 'rusak_ringan', 'rusak_berat')),
  acquired_year integer,
  note text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_tu_facility_code
  ON public.tu_facility (homebase_id, lower(code))
  WHERE code IS NOT NULL AND btrim(code) <> '';

CREATE INDEX IF NOT EXISTS idx_tu_facility_homebase
  ON public.tu_facility (homebase_id, category, condition);
