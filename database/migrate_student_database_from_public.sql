BEGIN;

SET search_path TO public, "database";

-- ================================================================
-- MIGRASI DATA SISWA: public -> "database"
-- Tabel:
-- - u_student_documents
-- - u_student_families / u_student_familied
-- - u_student_siblings
--
-- Catatan:
-- - Aman dijalankan ulang (idempotent) dengan ON CONFLICT.
-- - Untuk tabel keluarga, script akan memakai sumber:
--   1. public.u_student_families
--   2. public.u_student_familied
--   sesuai yang tersedia.
-- ================================================================

-- ================================================================
-- 1. FAMILY
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

-- ================================================================
-- 2. SIBLINGS
-- ================================================================
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

-- ================================================================
-- 3. DOCUMENTS
-- ================================================================
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

-- Sinkronkan sequence setelah insert manual id.
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
