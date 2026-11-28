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
-- saat pertama kali jalan bila tabel belum ada, jadi patch ini opsional, tapi
-- disarankan dijalankan sebelum deploy agar data awal terisi dalam satu transaksi.
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

-- Data lama: wali kelas di a_class dianggap milik periode aktif homebase-nya.
-- Guru yang tercatat di beberapa kelas: hanya kelas dengan id terkecil yang dipakai.
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

-- Samakan cermin dengan periode aktif.
UPDATE public.a_class c
SET homeroom_teacher_id = ch.teacher_id
FROM public.a_class c2
LEFT JOIN public.a_periode p
  ON p.homebase_id = c2.homebase_id AND p.is_active = true
LEFT JOIN public.a_class_homeroom ch
  ON ch.class_id = c2.id AND ch.periode_id = p.id
WHERE c.id = c2.id
  AND c.homeroom_teacher_id IS DISTINCT FROM ch.teacher_id;

UPDATE public.u_teachers t
SET is_homeroom = EXISTS (
    SELECT 1
    FROM public.a_class_homeroom ch
    JOIN public.a_periode p ON p.id = ch.periode_id AND p.is_active = true
    WHERE ch.teacher_id = t.user_id
)
WHERE t.is_homeroom IS DISTINCT FROM EXISTS (
    SELECT 1
    FROM public.a_class_homeroom ch
    JOIN public.a_periode p ON p.id = ch.periode_id AND p.is_active = true
    WHERE ch.teacher_id = t.user_id
);

COMMIT;
