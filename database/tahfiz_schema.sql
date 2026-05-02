CREATE SCHEMA IF NOT EXISTS tahfiz;

BEGIN;
SET search_path TO tahfiz, public;

ALTER TABLE IF EXISTS public.t_surah SET SCHEMA tahfiz;
ALTER TABLE IF EXISTS public.t_juz SET SCHEMA tahfiz;
ALTER TABLE IF EXISTS public.t_juz_detail SET SCHEMA tahfiz;
ALTER TABLE IF EXISTS public.t_activity_type SET SCHEMA tahfiz;
ALTER TABLE IF EXISTS public.t_musyrif SET SCHEMA tahfiz;
ALTER TABLE IF EXISTS public.t_halaqoh SET SCHEMA tahfiz;
ALTER TABLE IF EXISTS public.t_halaqoh_students SET SCHEMA tahfiz;
ALTER TABLE IF EXISTS public.t_target_plan SET SCHEMA tahfiz;
ALTER TABLE IF EXISTS public.t_target_item SET SCHEMA tahfiz;
ALTER TABLE IF EXISTS public.t_daily_record SET SCHEMA tahfiz;

CREATE TABLE IF NOT EXISTS t_surah(
    id SERIAL NOT NULL,
    number integer NOT NULL,
    name_latin varchar(100) NOT NULL,
    total_ayat integer NOT NULL,
    PRIMARY KEY(id),
    CONSTRAINT uq_t_surah_number UNIQUE(number),
    CONSTRAINT ck_t_surah_total_ayat CHECK (total_ayat > 0)
);

CREATE TABLE IF NOT EXISTS t_juz(
    id SERIAL NOT NULL,
    number integer NOT NULL,
    line_count integer,
    description text,
    PRIMARY KEY(id),
    CONSTRAINT uq_t_juz_number UNIQUE(number),
    CONSTRAINT ck_t_juz_line_count CHECK (line_count IS NULL OR line_count >= 0)
);

CREATE TABLE IF NOT EXISTS t_juz_detail(
    id SERIAL NOT NULL,
    juz_id integer NOT NULL REFERENCES tahfiz.t_juz(id) ON DELETE CASCADE,
    surah_id integer NOT NULL REFERENCES tahfiz.t_surah(id) ON DELETE CASCADE,
    start_ayat integer,
    end_ayat integer,
    PRIMARY KEY(id),
    CONSTRAINT ck_t_juz_detail_ayat
        CHECK (
            (start_ayat IS NULL AND end_ayat IS NULL) OR
            (start_ayat IS NOT NULL AND end_ayat IS NOT NULL AND start_ayat <= end_ayat)
        )
);
CREATE INDEX IF NOT EXISTS idx_t_juz_detail_juz ON tahfiz.t_juz_detail(juz_id);
CREATE INDEX IF NOT EXISTS idx_t_juz_detail_surah ON tahfiz.t_juz_detail(surah_id);

CREATE TABLE IF NOT EXISTS t_activity_type(
    id SERIAL NOT NULL,
    name varchar(50) NOT NULL,
    code varchar(10),
    PRIMARY KEY(id),
    CONSTRAINT uq_t_activity_type_code UNIQUE(code),
    CONSTRAINT uq_t_activity_type_name UNIQUE(name)
);

CREATE TABLE IF NOT EXISTS t_musyrif(
    id SERIAL NOT NULL,
    homebase_id integer REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    full_name varchar(150) NOT NULL,
    phone varchar(30),
    gender varchar(10),
    is_active boolean NOT NULL DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT ck_t_musyrif_gender
        CHECK (gender IN ('L', 'P', 'male', 'female') OR gender IS NULL)
);
CREATE INDEX IF NOT EXISTS idx_t_musyrif_homebase_active
ON tahfiz.t_musyrif(homebase_id, is_active);

CREATE TABLE IF NOT EXISTS t_halaqoh(
    id SERIAL NOT NULL,
    periode_id integer REFERENCES public.a_periode(id) ON DELETE CASCADE,
    name varchar(100) NOT NULL,
    musyrif_id integer REFERENCES tahfiz.t_musyrif(id) ON DELETE SET NULL,
    is_active boolean NOT NULL DEFAULT true,
    PRIMARY KEY(id)
);
CREATE INDEX IF NOT EXISTS idx_t_halaqoh_periode_active
ON tahfiz.t_halaqoh(periode_id, is_active);
CREATE INDEX IF NOT EXISTS idx_t_halaqoh_musyrif
ON tahfiz.t_halaqoh(musyrif_id);

CREATE TABLE IF NOT EXISTS t_halaqoh_students(
    id SERIAL NOT NULL,
    halaqoh_id integer NOT NULL REFERENCES tahfiz.t_halaqoh(id) ON DELETE CASCADE,
    student_id integer NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    PRIMARY KEY(id),
    CONSTRAINT uq_halaqoh_student UNIQUE(halaqoh_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_t_halaqoh_students_student
ON tahfiz.t_halaqoh_students(student_id);

CREATE TABLE IF NOT EXISTS t_target_plan(
    id SERIAL NOT NULL,
    periode_id integer NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
    homebase_id integer REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    grade_id integer NOT NULL REFERENCES public.a_grade(id) ON DELETE CASCADE,
    title varchar(150),
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_t_target_plan_scope
ON tahfiz.t_target_plan(periode_id, COALESCE(homebase_id, 0), grade_id);
CREATE INDEX IF NOT EXISTS idx_t_target_plan_lookup
ON tahfiz.t_target_plan(periode_id, grade_id, is_active);

CREATE TABLE IF NOT EXISTS t_target_item(
    id SERIAL NOT NULL,
    plan_id integer NOT NULL REFERENCES tahfiz.t_target_plan(id) ON DELETE CASCADE,
    target_type varchar(10) NOT NULL,
    juz_id integer REFERENCES tahfiz.t_juz(id) ON DELETE RESTRICT,
    surah_id integer REFERENCES tahfiz.t_surah(id) ON DELETE RESTRICT,
    start_ayat integer,
    end_ayat integer,
    order_no integer NOT NULL DEFAULT 1,
    is_mandatory boolean NOT NULL DEFAULT true,
    notes text,
    PRIMARY KEY(id),
    CONSTRAINT ck_t_target_item_type CHECK (target_type IN ('juz', 'surah')),
    CONSTRAINT ck_t_target_item_ref CHECK (
        (target_type = 'juz' AND juz_id IS NOT NULL AND surah_id IS NULL) OR
        (target_type = 'surah' AND surah_id IS NOT NULL AND juz_id IS NULL)
    ),
    CONSTRAINT ck_t_target_item_ayat CHECK (
        (target_type = 'juz' AND start_ayat IS NULL AND end_ayat IS NULL) OR
        (
            target_type = 'surah' AND
            (
                (start_ayat IS NULL AND end_ayat IS NULL) OR
                (start_ayat IS NOT NULL AND end_ayat IS NOT NULL AND start_ayat <= end_ayat)
            )
        )
    )
);
CREATE INDEX IF NOT EXISTS idx_t_target_item_plan ON tahfiz.t_target_item(plan_id, order_no);
CREATE INDEX IF NOT EXISTS idx_t_target_item_juz ON tahfiz.t_target_item(juz_id);
CREATE INDEX IF NOT EXISTS idx_t_target_item_surah ON tahfiz.t_target_item(surah_id);

CREATE TABLE IF NOT EXISTS t_daily_record(
    id SERIAL NOT NULL,
    student_id integer REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    halaqoh_id integer REFERENCES tahfiz.t_halaqoh(id) ON DELETE SET NULL,
    musyrif_id integer REFERENCES tahfiz.t_musyrif(id) ON DELETE SET NULL,
    date date DEFAULT CURRENT_DATE,
    type_id integer REFERENCES tahfiz.t_activity_type(id) ON DELETE SET NULL,
    start_surah_id integer REFERENCES tahfiz.t_surah(id) ON DELETE SET NULL,
    start_ayat integer,
    end_surah_id integer REFERENCES tahfiz.t_surah(id) ON DELETE SET NULL,
    end_ayat integer,
    lines_count integer,
    fluency_grade varchar(2),
    tajweed_grade varchar(2),
    note text,
    PRIMARY KEY(id),
    CONSTRAINT ck_t_daily_record_ayat
        CHECK (
            (start_ayat IS NULL OR start_ayat > 0) AND
            (end_ayat IS NULL OR end_ayat > 0) AND
            (
                start_surah_id IS NULL OR
                end_surah_id IS NULL OR
                start_surah_id <> end_surah_id OR
                start_ayat IS NULL OR
                end_ayat IS NULL OR
                start_ayat <= end_ayat
            )
        ),
    CONSTRAINT ck_t_daily_record_lines_count
        CHECK (lines_count IS NULL OR lines_count >= 0)
);
CREATE INDEX IF NOT EXISTS idx_t_daily_record_student_date
ON tahfiz.t_daily_record(student_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_t_daily_record_halaqoh_date
ON tahfiz.t_daily_record(halaqoh_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_t_daily_record_musyrif_date
ON tahfiz.t_daily_record(musyrif_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_t_daily_record_type
ON tahfiz.t_daily_record(type_id);

SET search_path TO public;
COMMIT;
