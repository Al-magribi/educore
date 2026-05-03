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

CREATE TABLE IF NOT EXISTS t_ayah(
    id SERIAL NOT NULL,
    surah_id integer NOT NULL REFERENCES tahfiz.t_surah(id) ON DELETE CASCADE,
    juz_id integer NOT NULL REFERENCES tahfiz.t_juz(id) ON DELETE RESTRICT,
    ayah_number integer NOT NULL,
    ayah_global_number integer NOT NULL,
    text_arabic text NOT NULL,
    page_number integer,
    hizb_quarter integer,
    audio_path text,
    audio_url text,
    PRIMARY KEY(id),
    CONSTRAINT uq_t_ayah_surah_ayah UNIQUE(surah_id, ayah_number),
    CONSTRAINT uq_t_ayah_global_number UNIQUE(ayah_global_number),
    CONSTRAINT ck_t_ayah_number CHECK (ayah_number > 0),
    CONSTRAINT ck_t_ayah_global_number CHECK (ayah_global_number > 0),
    CONSTRAINT ck_t_ayah_page_number CHECK (page_number IS NULL OR page_number > 0),
    CONSTRAINT ck_t_ayah_hizb_quarter CHECK (hizb_quarter IS NULL OR hizb_quarter > 0)
);
CREATE INDEX IF NOT EXISTS idx_t_ayah_surah ON tahfiz.t_ayah(surah_id, ayah_number);
CREATE INDEX IF NOT EXISTS idx_t_ayah_juz ON tahfiz.t_ayah(juz_id);
CREATE INDEX IF NOT EXISTS idx_t_ayah_global_number ON tahfiz.t_ayah(ayah_global_number);

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
CREATE UNIQUE INDEX IF NOT EXISTS uq_t_juz_detail_range
ON tahfiz.t_juz_detail(juz_id, surah_id, start_ayat, end_ayat);

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

INSERT INTO tahfiz.t_juz_detail (juz_id, surah_id, start_ayat, end_ayat)
SELECT
    j.id,
    s.id,
    d.start_ayat,
    d.end_ayat
FROM (
    VALUES
        (1, 1, 1, 7), (1, 2, 1, 141),
        (2, 2, 142, 252),
        (3, 2, 253, 286), (3, 3, 1, 92),
        (4, 3, 93, 200), (4, 4, 1, 23),
        (5, 4, 24, 147),
        (6, 4, 148, 176), (6, 5, 1, 81),
        (7, 5, 82, 120), (7, 6, 1, 110),
        (8, 6, 111, 165), (8, 7, 1, 87),
        (9, 7, 88, 206), (9, 8, 1, 40),
        (10, 8, 41, 75), (10, 9, 1, 92),
        (11, 9, 93, 129), (11, 10, 1, 109), (11, 11, 1, 5),
        (12, 11, 6, 123), (12, 12, 1, 52),
        (13, 12, 53, 111), (13, 13, 1, 43), (13, 14, 1, 52),
        (14, 15, 1, 99), (14, 16, 1, 128),
        (15, 17, 1, 111), (15, 18, 1, 74),
        (16, 18, 75, 110), (16, 19, 1, 98), (16, 20, 1, 135),
        (17, 21, 1, 112), (17, 22, 1, 78),
        (18, 23, 1, 118), (18, 24, 1, 64), (18, 25, 1, 20),
        (19, 25, 21, 77), (19, 26, 1, 227), (19, 27, 1, 55),
        (20, 27, 56, 93), (20, 28, 1, 88), (20, 29, 1, 45),
        (21, 29, 46, 69), (21, 30, 1, 60), (21, 31, 1, 34), (21, 32, 1, 30), (21, 33, 1, 30),
        (22, 33, 31, 73), (22, 34, 1, 54), (22, 35, 1, 45), (22, 36, 1, 27),
        (23, 36, 28, 83), (23, 37, 1, 182), (23, 38, 1, 88), (23, 39, 1, 31),
        (24, 39, 32, 75), (24, 40, 1, 85), (24, 41, 1, 46),
        (25, 41, 47, 54), (25, 42, 1, 53), (25, 43, 1, 89), (25, 44, 1, 59), (25, 45, 1, 37),
        (26, 46, 1, 35), (26, 47, 1, 38), (26, 48, 1, 29), (26, 49, 1, 18), (26, 50, 1, 45), (26, 51, 1, 30),
        (27, 51, 31, 60), (27, 52, 1, 49), (27, 53, 1, 62), (27, 54, 1, 55), (27, 55, 1, 78), (27, 56, 1, 96), (27, 57, 1, 29),
        (28, 58, 1, 22), (28, 59, 1, 24), (28, 60, 1, 13), (28, 61, 1, 14), (28, 62, 1, 11), (28, 63, 1, 11), (28, 64, 1, 18), (28, 65, 1, 12), (28, 66, 1, 12),
        (29, 67, 1, 30), (29, 68, 1, 52), (29, 69, 1, 52), (29, 70, 1, 44), (29, 71, 1, 28), (29, 72, 1, 28), (29, 73, 1, 20), (29, 74, 1, 56), (29, 75, 1, 40), (29, 76, 1, 31), (29, 77, 1, 50),
        (30, 78, 1, 40), (30, 79, 1, 46), (30, 80, 1, 42), (30, 81, 1, 29), (30, 82, 1, 19), (30, 83, 1, 36), (30, 84, 1, 25), (30, 85, 1, 22), (30, 86, 1, 17), (30, 87, 1, 19), (30, 88, 1, 26), (30, 89, 1, 30), (30, 90, 1, 20), (30, 91, 1, 15), (30, 92, 1, 21), (30, 93, 1, 11), (30, 94, 1, 8), (30, 95, 1, 8), (30, 96, 1, 19), (30, 97, 1, 5), (30, 98, 1, 8), (30, 99, 1, 8), (30, 100, 1, 11), (30, 101, 1, 11), (30, 102, 1, 8), (30, 103, 1, 3), (30, 104, 1, 9), (30, 105, 1, 5), (30, 106, 1, 4), (30, 107, 1, 7), (30, 108, 1, 3), (30, 109, 1, 6), (30, 110, 1, 3), (30, 111, 1, 5), (30, 112, 1, 4), (30, 113, 1, 5), (30, 114, 1, 6)
) AS d(juz_number, surah_number, start_ayat, end_ayat)
JOIN tahfiz.t_juz j ON j.number = d.juz_number
JOIN tahfiz.t_surah s ON s.number = d.surah_number
ON CONFLICT (juz_id, surah_id, start_ayat, end_ayat) DO NOTHING;

SET search_path TO public;
COMMIT;
