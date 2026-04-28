-- Hapus semua data table CBT dan reset ulang sequence/id.
--
-- PERINGATAN:
-- Script ini menghapus seluruh data di schema cbt.
-- Jalankan hanya jika memang ingin mengosongkan data CBT.

BEGIN;

TRUNCATE TABLE
    cbt.c_student_answer,
    cbt.c_answer,
    cbt.c_exam_attendance,
    cbt.c_student_session,
    cbt.c_question_options,
    cbt.c_question,
    cbt.c_exam_class,
    cbt.c_exam,
    cbt.c_bank
RESTART IDENTITY CASCADE;

COMMIT;
