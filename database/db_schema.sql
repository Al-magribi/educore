BEGIN;

CREATE SCHEMA IF NOT EXISTS "database";

-- ================================================================
-- STUDENT DATABASE SCHEMA
-- Tabel-tabel ini dipakai oleh komponen DbForm:
-- - wilayah siswa
-- - data keluarga
-- - saudara kandung
-- - dokumen siswa
-- ================================================================

CREATE TABLE IF NOT EXISTS "database".db_province (
    id char(2) PRIMARY KEY,
    name varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "database".db_city (
    id char(4) PRIMARY KEY,
    province_id char(2) REFERENCES "database".db_province(id),
    name varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "database".db_district (
    id char(7) PRIMARY KEY,
    city_id char(4) REFERENCES "database".db_city(id),
    name varchar(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS "database".db_village (
    id char(20) PRIMARY KEY,
    district_id char(7) REFERENCES "database".db_district(id),
    name varchar(255) NOT NULL,
    postal_code varchar(10)
);

-- ================================================================
-- MIGRASI DATA MASTER WILAYAH
-- Sumber: tabel lama di schema public
-- Tujuan: schema "database"
-- Jalankan setelah tabel public.db_* sudah terisi.
-- ================================================================

INSERT INTO "database".db_province (id, name)
SELECT p.id, p.name
FROM public.db_province p
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name;

INSERT INTO "database".db_city (id, province_id, name)
SELECT c.id, c.province_id, c.name
FROM public.db_city c
JOIN "database".db_province p ON p.id = c.province_id
ON CONFLICT (id) DO UPDATE
SET
    province_id = EXCLUDED.province_id,
    name = EXCLUDED.name;

INSERT INTO "database".db_district (id, city_id, name)
SELECT d.id, d.city_id, d.name
FROM public.db_district d
JOIN "database".db_city c ON c.id = d.city_id
ON CONFLICT (id) DO UPDATE
SET
    city_id = EXCLUDED.city_id,
    name = EXCLUDED.name;

INSERT INTO "database".db_village (id, district_id, name, postal_code)
SELECT v.id, v.district_id, v.name, v.postal_code
FROM public.db_village v
JOIN "database".db_district d ON d.id = v.district_id
ON CONFLICT (id) DO UPDATE
SET
    district_id = EXCLUDED.district_id,
    name = EXCLUDED.name,
    postal_code = EXCLUDED.postal_code;

CREATE TABLE IF NOT EXISTS "database".u_student_families (
    id SERIAL PRIMARY KEY,
    student_id integer REFERENCES public.u_students(user_id) ON DELETE CASCADE,
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

CREATE TABLE IF NOT EXISTS "database".u_student_siblings (
    id SERIAL PRIMARY KEY,
    student_id integer REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    name text NOT NULL,
    gender varchar(20),
    birth_date date,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "database".u_student_documents (
    id SERIAL PRIMARY KEY,
    student_id integer NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    document_type varchar(30) NOT NULL
      CHECK (document_type IN ('ijazah', 'akta_kelahiran', 'kartu_keluarga')),
    file_name text NOT NULL,
    original_file_name text,
    file_path text NOT NULL,
    mime_type text,
    file_size bigint,
    uploaded_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_document_type UNIQUE (student_id, document_type)
);

CREATE INDEX IF NOT EXISTS idx_student_documents_student
    ON "database".u_student_documents(student_id);

-- ================================================================
-- MIGRASI DATA STUDENT DATABASE
-- Sumber: tabel lama di schema public
-- Tujuan: schema "database"
-- Aman dijalankan ulang.
-- ================================================================

DO $$
DECLARE
    family_source regclass;
BEGIN
    family_source := COALESCE(
        to_regclass('public.u_student_families'),
        to_regclass('public.u_student_familied')
    );

    IF family_source IS NULL THEN
        RAISE NOTICE 'Skip family migration: source table public.u_student_families/public.u_student_familied not found.';
    ELSE
        EXECUTE format($sql$
            INSERT INTO "database".u_student_families (
                id,
                student_id,
                father_nik,
                father_name,
                father_birth_place,
                father_birth_date,
                father_job,
                father_phone,
                mother_nik,
                mother_name,
                mother_birth_place,
                mother_birth_date,
                mother_job,
                mother_phone,
                guardian_name,
                guardian_phone
            )
            SELECT
                id,
                student_id,
                father_nik,
                father_name,
                father_birth_place,
                father_birth_date,
                father_job,
                father_phone,
                mother_nik,
                mother_name,
                mother_birth_place,
                mother_birth_date,
                mother_job,
                mother_phone,
                guardian_name,
                guardian_phone
            FROM %s
            ON CONFLICT (id) DO UPDATE
            SET
                student_id = EXCLUDED.student_id,
                father_nik = EXCLUDED.father_nik,
                father_name = EXCLUDED.father_name,
                father_birth_place = EXCLUDED.father_birth_place,
                father_birth_date = EXCLUDED.father_birth_date,
                father_job = EXCLUDED.father_job,
                father_phone = EXCLUDED.father_phone,
                mother_nik = EXCLUDED.mother_nik,
                mother_name = EXCLUDED.mother_name,
                mother_birth_place = EXCLUDED.mother_birth_place,
                mother_birth_date = EXCLUDED.mother_birth_date,
                mother_job = EXCLUDED.mother_job,
                mother_phone = EXCLUDED.mother_phone,
                guardian_name = EXCLUDED.guardian_name,
                guardian_phone = EXCLUDED.guardian_phone
        $sql$, family_source);
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.u_student_siblings') IS NULL THEN
        RAISE NOTICE 'Skip siblings migration: source table public.u_student_siblings not found.';
    ELSE
        INSERT INTO "database".u_student_siblings (
            id,
            student_id,
            name,
            gender,
            birth_date,
            created_at
        )
        SELECT
            id,
            student_id,
            name,
            gender,
            birth_date,
            created_at
        FROM public.u_student_siblings
        ON CONFLICT (id) DO UPDATE
        SET
            student_id = EXCLUDED.student_id,
            name = EXCLUDED.name,
            gender = EXCLUDED.gender,
            birth_date = EXCLUDED.birth_date,
            created_at = EXCLUDED.created_at;
    END IF;
END $$;

DO $$
BEGIN
    IF to_regclass('public.u_student_documents') IS NULL THEN
        RAISE NOTICE 'Skip document migration: source table public.u_student_documents not found.';
    ELSE
        INSERT INTO "database".u_student_documents (
            id,
            student_id,
            document_type,
            file_name,
            original_file_name,
            file_path,
            mime_type,
            file_size,
            uploaded_by,
            created_at,
            updated_at
        )
        SELECT
            id,
            student_id,
            document_type,
            file_name,
            original_file_name,
            file_path,
            mime_type,
            file_size,
            uploaded_by,
            created_at,
            updated_at
        FROM public.u_student_documents
        ON CONFLICT (id) DO UPDATE
        SET
            student_id = EXCLUDED.student_id,
            document_type = EXCLUDED.document_type,
            file_name = EXCLUDED.file_name,
            original_file_name = EXCLUDED.original_file_name,
            file_path = EXCLUDED.file_path,
            mime_type = EXCLUDED.mime_type,
            file_size = EXCLUDED.file_size,
            uploaded_by = EXCLUDED.uploaded_by,
            created_at = EXCLUDED.created_at,
            updated_at = EXCLUDED.updated_at;
    END IF;
END $$;

SELECT setval(
    pg_get_serial_sequence('"database".u_student_families', 'id'),
    COALESCE((SELECT MAX(id) FROM "database".u_student_families), 1),
    true
);

SELECT setval(
    pg_get_serial_sequence('"database".u_student_siblings', 'id'),
    COALESCE((SELECT MAX(id) FROM "database".u_student_siblings), 1),
    true
);

SELECT setval(
    pg_get_serial_sequence('"database".u_student_documents', 'id'),
    COALESCE((SELECT MAX(id) FROM "database".u_student_documents), 1),
    true
);

COMMIT;
