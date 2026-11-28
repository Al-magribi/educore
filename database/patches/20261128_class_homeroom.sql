-- Wali kelas per periode: public.a_class_homeroom.
--
-- Sebelumnya wali kelas hanya disimpan di a_class.homeroom_teacher_id tanpa
-- periode. Setelah periode berganti, wali kelas lama tetap punya akses ke kelas
-- dan siswanya. Sekarang:
--   - a_class_homeroom menyimpan wali kelas per (periode, kelas).
--   - a_class.homeroom_teacher_id dan u_teachers.is_homeroom menjadi cermin
--     periode aktif, diisi ulang oleh server saat penetapan berubah atau
--     periode diaktifkan (server/utils/homeroom.js).
--
-- Patch ini idempoten. Server juga membuat tabel dan mengisi data awal sendiri
-- saat pertama kali jalan bila tabel BELUM ada. Bila tabel sudah ada (mis.
-- dibuat lebih awal), jalankan patch ini sesaat setelah deploy agar wali kelas
-- periode aktif disamakan lagi dengan a_class.
--
-- Jalankan: psql "$DATABASE_URL" -f database/patches/20261128_class_homeroom.sql

BEGIN;

CREATE TABLE IF NOT EXISTS public.a_class_homeroom (
    id SERIAL PRIMARY KEY,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id integer NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
    class_id integer NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
    teacher_id integer NOT NULL REFERENCES public.u_teachers(user_id) ON DELETE CASCADE,
    assigned_at timestamp DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_class_homeroom_class UNIQUE (periode_id, class_id),
    CONSTRAINT uq_class_homeroom_teacher UNIQUE (periode_id, teacher_id)
);

CREATE INDEX IF NOT EXISTS idx_class_homeroom_teacher
    ON public.a_class_homeroom(teacher_id, periode_id);
CREATE INDEX IF NOT EXISTS idx_class_homeroom_homebase
    ON public.a_class_homeroom(homebase_id, periode_id);

-- Periode aktif mengikuti a_class. Sebelum kode baru di-deploy, a_class adalah
-- sumber kebenaran; sesudahnya a_class adalah cermin periode aktif. Jadi
-- membangun ulang baris periode aktif dari a_class aman di kedua keadaan dan
-- membuat patch ini aman dijalankan ulang (termasuk bila tabel sudah ada lebih
-- dulu dan isinya tertinggal). Periode yang tidak aktif tidak disentuh.
-- Guru yang tercatat di beberapa kelas: hanya kelas dengan id terkecil yang dipakai.
DELETE FROM public.a_class_homeroom ch
USING public.a_periode p
WHERE p.id = ch.periode_id
  AND p.is_active = true;

INSERT INTO public.a_class_homeroom (homebase_id, periode_id, class_id, teacher_id)
SELECT DISTINCT ON (p.id, c.homeroom_teacher_id)
    c.homebase_id, p.id, c.id, c.homeroom_teacher_id
FROM public.a_class c
JOIN public.a_periode p
  ON p.homebase_id = c.homebase_id
 AND p.is_active = true
JOIN public.u_teachers t ON t.user_id = c.homeroom_teacher_id
WHERE c.homeroom_teacher_id IS NOT NULL
ORDER BY p.id, c.homeroom_teacher_id, c.id
ON CONFLICT DO NOTHING;

-- Kelas kedua dari guru yang sama tidak masuk tabel: kosongkan di cermin.
UPDATE public.a_class c
SET homeroom_teacher_id = NULL
FROM public.a_periode p
WHERE p.homebase_id = c.homebase_id
  AND p.is_active = true
  AND c.homeroom_teacher_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.a_class_homeroom ch
    WHERE ch.class_id = c.id AND ch.periode_id = p.id
  );

-- Flag is_homeroom mengikuti periode aktif. Satuan tanpa periode aktif dibiarkan.
UPDATE public.u_teachers t
SET is_homeroom = h.is_homeroom
FROM (
    SELECT t2.user_id,
           EXISTS (
               SELECT 1 FROM public.a_class_homeroom ch
               WHERE ch.teacher_id = t2.user_id AND ch.periode_id = p.id
           ) AS is_homeroom
    FROM public.u_teachers t2
    JOIN public.a_periode p
      ON p.homebase_id = t2.homebase_id
     AND p.is_active = true
) h
WHERE t.user_id = h.user_id
  AND t.is_homeroom IS DISTINCT FROM h.is_homeroom;

COMMIT;
