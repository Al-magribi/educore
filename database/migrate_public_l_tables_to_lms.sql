BEGIN;

CREATE SCHEMA IF NOT EXISTS lms;


SET search_path TO lms, public;

-- Pindahkan tabel legacy LMS dari public ke lms.
-- ALTER TABLE ... SET SCHEMA akan mempertahankan data, index, constraint,
-- dan foreign key yang terpasang pada tabel tersebut.

ALTER TABLE IF EXISTS public.l_attendance SET SCHEMA lms;
ALTER TABLE IF EXISTS public.l_chapter SET SCHEMA lms;
ALTER TABLE IF EXISTS public.l_content SET SCHEMA lms;
ALTER TABLE IF EXISTS public.l_score_attitude SET SCHEMA lms;
ALTER TABLE IF EXISTS public.l_score_final SET SCHEMA lms;
ALTER TABLE IF EXISTS public.l_score_formative SET SCHEMA lms;
ALTER TABLE IF EXISTS public.l_score_summative SET SCHEMA lms;
ALTER TABLE IF EXISTS public.l_score_weighting SET SCHEMA lms;

COMMIT;

-- Verifikasi: setelah migrasi, query ini seharusnya tidak lagi menampilkan
-- tabel legacy di schema public.
SELECT
    t.table_schema,
    t.table_name
FROM information_schema.tables t
WHERE t.table_schema IN ('public', 'lms')
  AND t.table_name IN (
      'l_attendance',
      'l_chapter',
      'l_content',
      'l_score_attitude',
      'l_score_final',
      'l_score_formative',
      'l_score_summative',
      'l_score_weighting'
  )
ORDER BY t.table_name, t.table_schema;

-- Opsional:
-- Kalau koneksi aplikasi belum memakai search_path ke lms,
-- jalankan ini sekali secara terpisah:
--
-- ALTER DATABASE educore_tr SET search_path TO lms, public;

