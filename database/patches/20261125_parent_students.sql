-- Satukan relasi orang tua - siswa di public.u_parent_students.
--
-- Sebelumnya ada dua model yang berjalan bersamaan:
--   - db (menu Database > Orang Tua) menyimpan banyak baris u_parents per akun.
--   - lms, finance, tahfiz membaca u_parent_students.
-- Anak yang dihubungkan lewat menu Database tidak terlihat di laporan,
-- notifikasi, tabungan, dan rapor tahfiz orang tua.
--
-- Patch ini idempoten (aman dijalankan ulang) dan berjalan dalam satu transaksi:
--   1. Pastikan tabel, kolom, dan index u_parent_students lengkap.
--   2. Salin semua relasi dari u_parents (model lama/db) ke u_parent_students.
--   3. Rapikan u_parents menjadi satu baris per akun (kontak + anak utama).
--   4. Pasang lagi aturan "1 siswa hanya milik 1 akun orang tua" bila data bersih.
--
-- Jalankan: psql "$DATABASE_URL" -f database/patches/20261125_parent_students.sql
-- Ambil backup dulu: pg_dump -t public.u_parents -t public.u_parent_students ...

BEGIN;

-- 1. Struktur -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.u_parent_students (
    id SERIAL PRIMARY KEY,
    parent_user_id integer NOT NULL REFERENCES public.u_users(id) ON DELETE CASCADE,
    student_id integer NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
    homebase_id integer REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    created_at timestamp DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.u_parent_students
    ADD COLUMN IF NOT EXISTS homebase_id integer REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS relationship varchar(50),
    ADD COLUMN IF NOT EXISTS is_primary boolean NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN IF NOT EXISTS updated_at timestamp DEFAULT CURRENT_TIMESTAMP;

-- Dipakai ON CONFLICT (parent_user_id, student_id) di db/lms.
CREATE UNIQUE INDEX IF NOT EXISTS uq_parent_student_pair
    ON public.u_parent_students(parent_user_id, student_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_parent_homebase
    ON public.u_parent_students(parent_user_id, homebase_id);
CREATE INDEX IF NOT EXISTS idx_parent_students_homebase
    ON public.u_parent_students(homebase_id);

UPDATE public.u_parent_students ups
SET homebase_id = s.homebase_id
FROM public.u_students s
WHERE s.user_id = ups.student_id
  AND ups.homebase_id IS DISTINCT FROM s.homebase_id
  AND s.homebase_id IS NOT NULL;

-- 2. Salin relasi dari u_parents ----------------------------------------------
-- Siswa yang sudah terhubung ke akun lain di u_parent_students tidak disalin
-- (aturan 1 siswa = 1 akun); jumlahnya dilaporkan di NOTICE.

DO $$
DECLARE
    skipped integer;
BEGIN
    SELECT COUNT(*) INTO skipped
    FROM public.u_parents p
    JOIN public.u_students s ON s.user_id = p.student_id
    WHERE p.student_id IS NOT NULL
      AND EXISTS (
          SELECT 1 FROM public.u_parent_students other
          WHERE other.student_id = p.student_id
            AND other.parent_user_id <> p.user_id
      )
      AND NOT EXISTS (
          SELECT 1 FROM public.u_parent_students same
          WHERE same.student_id = p.student_id
            AND same.parent_user_id = p.user_id
      );

    IF skipped > 0 THEN
        RAISE NOTICE 'u_parent_students: % relasi u_parents dilewati karena siswanya sudah terhubung ke akun orang tua lain. Periksa manual.', skipped;
    END IF;
END $$;

INSERT INTO public.u_parent_students (parent_user_id, student_id, homebase_id, relationship, is_primary)
SELECT DISTINCT ON (p.student_id)
    p.user_id,
    p.student_id,
    s.homebase_id,
    'wali',
    true
FROM public.u_parents p
JOIN public.u_users pu ON pu.id = p.user_id AND pu.role = 'parent'
JOIN public.u_students s ON s.user_id = p.student_id
WHERE p.student_id IS NOT NULL
  AND s.homebase_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1 FROM public.u_parent_students ups
      WHERE ups.student_id = p.student_id
  )
ORDER BY p.student_id, p.user_id
ON CONFLICT (parent_user_id, student_id) DO NOTHING;

-- 3. u_parents: satu baris per akun -------------------------------------------
-- Model db menyimpan banyak baris per akun dengan kontak yang sama. Setelah
-- relasinya tersalin, sisakan satu baris (anak utama = baris pertama).

DELETE FROM public.u_parents p
USING public.u_parents keep
WHERE p.user_id = keep.user_id
  AND p.ctid > keep.ctid;

-- Dipakai ON CONFLICT (user_id) di lms. Tidak berpengaruh bila user_id sudah PK.
CREATE UNIQUE INDEX IF NOT EXISTS uq_u_parents_user_id
    ON public.u_parents(user_id);

-- 4. Aturan 1 siswa = 1 akun orang tua ----------------------------------------

DO $$
DECLARE
    duplicated integer;
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'uq_parent_student_owner'
          AND conrelid = 'public.u_parent_students'::regclass
    ) THEN
        RETURN;
    END IF;

    SELECT COUNT(*) INTO duplicated
    FROM (
        SELECT student_id
        FROM public.u_parent_students
        GROUP BY student_id
        HAVING COUNT(*) > 1
    ) d;

    IF duplicated > 0 THEN
        RAISE NOTICE 'u_parent_students: % siswa terhubung ke lebih dari satu akun orang tua; constraint uq_parent_student_owner belum dipasang. Rapikan lalu jalankan ulang patch ini.', duplicated;
    ELSE
        ALTER TABLE public.u_parent_students
            ADD CONSTRAINT uq_parent_student_owner UNIQUE (student_id);
    END IF;
END $$;

COMMIT;

-- Cek hasil (opsional):
-- SELECT COUNT(*) AS relasi, COUNT(DISTINCT parent_user_id) AS akun FROM public.u_parent_students;
