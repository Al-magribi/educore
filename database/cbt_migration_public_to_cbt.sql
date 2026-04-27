-- Migrasi CBT dari schema public ke schema cbt.
--
-- Jalankan script ini pada database existing yang masih menyimpan table CBT
-- sebagai public.c_*.
--
-- Catatan:
-- - Jangan jalankan setelah membuat table cbt.c_* dari cbt_schema.sql/newtable.sql.
-- - ALTER TABLE ... SET SCHEMA memindahkan table beserta data, index,
--   constraint, dan sequence SERIAL yang dimiliki kolom table tersebut.

BEGIN;

CREATE SCHEMA IF NOT EXISTS cbt;

DO $$
DECLARE
    table_names text[] := ARRAY[
        'c_bank',
        'c_exam',
        'c_exam_class',
        'c_question',
        'c_question_options',
        'c_student_session',
        'c_exam_attendance',
        'c_answer',
        'c_student_answer'
    ];
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY table_names LOOP
        IF to_regclass(format('public.%I', table_name)) IS NOT NULL
           AND to_regclass(format('cbt.%I', table_name)) IS NOT NULL THEN
            RAISE EXCEPTION
                'Migration dihentikan: public.% dan cbt.% sama-sama ada. Hapus/backup target cbt.% dulu agar data tidak tertimpa.',
                table_name,
                table_name,
                table_name;
        END IF;
    END LOOP;

    FOREACH table_name IN ARRAY table_names LOOP
        IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I SET SCHEMA cbt', table_name);
        END IF;
    END LOOP;
END $$;

-- Samakan struktur penting dengan schema CBT terbaru.
DO $$
BEGIN
    IF to_regclass('cbt.c_exam') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE cbt.c_exam ADD COLUMN IF NOT EXISTS grade_id integer REFERENCES public.a_grade(id)';
        EXECUTE 'ALTER TABLE cbt.c_exam ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP';
    END IF;

    IF to_regclass('cbt.c_question_options') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE cbt.c_question_options ALTER COLUMN label TYPE text';
    END IF;

    IF to_regclass('cbt.c_student_answer') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE cbt.c_student_answer ADD COLUMN IF NOT EXISTS score_obtained numeric(6,2)';
    END IF;

    IF to_regclass('cbt.c_exam_attendance') IS NOT NULL THEN
        EXECUTE 'ALTER TABLE cbt.c_exam_attendance DROP CONSTRAINT IF EXISTS c_exam_attendance_status_check';
        EXECUTE $sql$
            ALTER TABLE cbt.c_exam_attendance
            ADD CONSTRAINT c_exam_attendance_status_check
            CHECK (status IN ('belum_masuk', 'izin', 'izinkan', 'mengerjakan', 'pelanggaran', 'selesai'))
        $sql$;
    END IF;
END $$;

-- Pastikan constraint/index yang dibutuhkan router CBT tersedia setelah table dipindahkan.
DO $$
BEGIN
    IF to_regclass('cbt.c_bank') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_c_bank_teacher_created ON cbt.c_bank (teacher_id, created_at DESC)';
    END IF;

    IF to_regclass('cbt.c_exam') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_c_exam_bank ON cbt.c_exam (bank_id)';
    END IF;

    IF to_regclass('cbt.c_exam_class') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_c_exam_class_exam ON cbt.c_exam_class (exam_id, class_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_c_exam_class_class ON cbt.c_exam_class (class_id, exam_id)';
    END IF;

    IF to_regclass('cbt.c_question') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_c_question_bank ON cbt.c_question (bank_id, id)';
    END IF;

    IF to_regclass('cbt.c_question_options') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_c_question_options_question ON cbt.c_question_options (question_id, id)';
    END IF;

    IF to_regclass('cbt.c_exam_attendance') IS NOT NULL THEN
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS unique_exam_student ON cbt.c_exam_attendance (exam_id, student_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_exam_attendance_exam ON cbt.c_exam_attendance (exam_id)';
    END IF;

    IF to_regclass('cbt.c_student_answer') IS NOT NULL THEN
        EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS unique_student_answer ON cbt.c_student_answer (exam_id, student_id, question_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_student_answer_lookup ON cbt.c_student_answer (exam_id, student_id)';
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_c_student_answer_question ON cbt.c_student_answer (question_id)';
    END IF;

    IF to_regclass('public.u_students') IS NOT NULL THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_students_current_class ON public.u_students (current_class_id)';
    END IF;
END $$;

COMMIT;
