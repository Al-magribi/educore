// Penetapan wali kelas per periode. File ini milik `main`.
//
// Sumber kebenaran: public.a_class_homeroom (satu wali per kelas per periode,
// satu kelas per guru per periode). Kolom lama tetap diisi sebagai cermin
// PERIODE AKTIF agar kode domain yang membacanya tetap benar:
//   - a_class.homeroom_teacher_id  = wali kelas di periode aktif
//   - u_teachers.is_homeroom       = guru menjadi wali kelas di periode aktif
// Cermin diperbarui setiap kali penetapan berubah dan saat periode diaktifkan
// (syncHomeroomMirror). Jangan menulis kolom cermin langsung dari kode domain;
// pakai fungsi di file ini.
//
// Untuk membaca wali kelas periode tertentu (riwayat), pakai
// getTeacherHomeroomClass / getClassHomeroomTeacher dengan periodeId.

import pool from "../config/connection.js";

const CREATE_TABLE_SQL = `
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
`;

// Data lama: wali kelas di a_class dianggap milik periode aktif homebase-nya.
// Versi lengkap (bisa dijalankan ulang): database/patches/20261128_class_homeroom.sql.
const BACKFILL_SQL = `
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
  ON CONFLICT DO NOTHING
`;

// Flag is_homeroom lama bisa tertinggal true tanpa kelas; samakan sekali.
// Satuan tanpa periode aktif dibiarkan.
const BACKFILL_FLAG_SQL = `
  UPDATE public.u_teachers t
  SET is_homeroom = h.is_homeroom
  FROM (
    SELECT t2.user_id,
           EXISTS (
             SELECT 1
             FROM public.a_class_homeroom ch
             WHERE ch.teacher_id = t2.user_id
               AND ch.periode_id = p.id
           ) AS is_homeroom
    FROM public.u_teachers t2
    JOIN public.a_periode p
      ON p.homebase_id = t2.homebase_id
     AND p.is_active = true
  ) h
  WHERE t.user_id = h.user_id
    AND t.is_homeroom IS DISTINCT FROM h.is_homeroom
`;

let schemaPromise = null;

/**
 * Idempoten, dijalankan sekali per proses lewat pool (di luar transaksi request).
 * Panggil di awal handler sebelum menulis apa pun, agar tidak menunggu kunci
 * baris milik transaksi request itu sendiri.
 */
export const ensureClassHomeroomTable = () => {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const existing = await pool.query(
        `SELECT to_regclass('public.a_class_homeroom') AS name`,
      );
      await pool.query(CREATE_TABLE_SQL);
      if (!existing.rows[0]?.name) {
        await pool.query(BACKFILL_SQL);
        await pool.query(BACKFILL_FLAG_SQL);
      }
    })().catch((error) => {
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
};

ensureClassHomeroomTable().catch((error) => {
  console.error("[homeroom] gagal menyiapkan tabel a_class_homeroom", error);
});

const userError = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode });

export const getActivePeriodeId = async (executor, homebaseId) => {
  if (!homebaseId) return null;
  const result = await executor.query(
    `SELECT id FROM public.a_periode
     WHERE homebase_id = $1 AND is_active = true
     ORDER BY id DESC
     LIMIT 1`,
    [homebaseId],
  );
  return result.rows[0]?.id || null;
};

const resolvePeriodeId = async (executor, homebaseId, periodeId) =>
  periodeId ? Number(periodeId) : getActivePeriodeId(executor, homebaseId);

/**
 * Samakan kolom cermin dengan penetapan di periode aktif homebase.
 * Tanpa periode aktif, cermin dibiarkan apa adanya (data lama tidak dihapus).
 */
export const syncHomeroomMirror = async (executor, homebaseId) => {
  await ensureClassHomeroomTable();
  const periodeId = await getActivePeriodeId(executor, homebaseId);
  if (!periodeId) return;

  await executor.query(
    `UPDATE public.a_class c
     SET homeroom_teacher_id = h.teacher_id
     FROM (
       SELECT c2.id AS class_id, ch.teacher_id
       FROM public.a_class c2
       LEFT JOIN public.a_class_homeroom ch
         ON ch.class_id = c2.id
        AND ch.periode_id = $2
       WHERE c2.homebase_id = $1
     ) h
     WHERE c.id = h.class_id
       AND c.homeroom_teacher_id IS DISTINCT FROM h.teacher_id`,
    [homebaseId, periodeId],
  );

  await executor.query(
    `UPDATE public.u_teachers t
     SET is_homeroom = h.is_homeroom
     FROM (
       SELECT t2.user_id,
              EXISTS (
                SELECT 1 FROM public.a_class_homeroom ch
                WHERE ch.teacher_id = t2.user_id
                  AND ch.periode_id = $2
              ) AS is_homeroom
       FROM public.u_teachers t2
       WHERE t2.homebase_id = $1
          OR t2.user_id IN (
            SELECT teacher_id FROM public.a_class_homeroom WHERE homebase_id = $1
          )
     ) h
     WHERE t.user_id = h.user_id
       AND t.is_homeroom IS DISTINCT FROM h.is_homeroom`,
    [homebaseId, periodeId],
  );
};

/**
 * Tetapkan guru sebagai wali kelas `classId` di periode (default: aktif).
 * `classId` kosong = guru tidak menjadi wali kelas di periode itu.
 * Wali lama kelas tersebut dan kelas lama guru ini di periode yang sama dilepas.
 */
export const setTeacherHomeroom = async (
  executor,
  { teacherId, homebaseId, classId, periodeId = null },
) => {
  await ensureClassHomeroomTable();
  const targetPeriodeId = await resolvePeriodeId(executor, homebaseId, periodeId);

  if (!targetPeriodeId) {
    if (classId) {
      throw userError(
        "Belum ada periode aktif. Aktifkan periode terlebih dahulu sebelum menetapkan wali kelas.",
      );
    }
    // Tanpa periode aktif: hanya lepas guru ini dari cermin lama.
    await executor.query(
      `UPDATE public.a_class SET homeroom_teacher_id = NULL WHERE homeroom_teacher_id = $1`,
      [teacherId],
    );
    await executor.query(
      `UPDATE public.u_teachers SET is_homeroom = false WHERE user_id = $1`,
      [teacherId],
    );
    return { periodeId: null };
  }

  await executor.query(
    `DELETE FROM public.a_class_homeroom
     WHERE periode_id = $1 AND teacher_id = $2`,
    [targetPeriodeId, teacherId],
  );

  if (classId) {
    const classCheck = await executor.query(
      `SELECT id FROM public.a_class WHERE id = $1 AND homebase_id = $2`,
      [classId, homebaseId],
    );
    if (classCheck.rowCount === 0) {
      throw userError("Kelas wali tidak valid untuk satuan ini.");
    }

    await executor.query(
      `INSERT INTO public.a_class_homeroom (homebase_id, periode_id, class_id, teacher_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (periode_id, class_id)
       DO UPDATE SET teacher_id = EXCLUDED.teacher_id,
                     assigned_at = CURRENT_TIMESTAMP`,
      [homebaseId, targetPeriodeId, classId, teacherId],
    );
  }

  await syncHomeroomMirror(executor, homebaseId);
  return { periodeId: targetPeriodeId };
};

/** Lepas guru dari semua penetapan wali kelas (dipakai sebelum guru dihapus). */
export const removeTeacherHomeroom = async (executor, { teacherId, homebaseId }) => {
  await ensureClassHomeroomTable();
  await executor.query(
    `DELETE FROM public.a_class_homeroom WHERE teacher_id = $1`,
    [teacherId],
  );
  await executor.query(
    `UPDATE public.a_class SET homeroom_teacher_id = NULL WHERE homeroom_teacher_id = $1`,
    [teacherId],
  );
  if (homebaseId) await syncHomeroomMirror(executor, homebaseId);
};

/**
 * Kelas yang diwalikan guru pada periode tertentu (default: periode aktif).
 * Mengembalikan null bila guru bukan wali kelas di periode itu.
 */
export const getTeacherHomeroomClass = async (
  executor,
  { teacherId, homebaseId, periodeId = null },
) => {
  await ensureClassHomeroomTable();
  const targetPeriodeId = await resolvePeriodeId(executor, homebaseId, periodeId);
  if (!targetPeriodeId) return null;

  const result = await executor.query(
    `SELECT
       c.id,
       c.name,
       c.grade_id,
       g.name AS grade_name,
       c.homebase_id,
       ch.periode_id
     FROM public.a_class_homeroom ch
     JOIN public.a_class c ON c.id = ch.class_id
     LEFT JOIN public.a_grade g ON g.id = c.grade_id
     WHERE ch.teacher_id = $1
       AND ch.homebase_id = $2
       AND ch.periode_id = $3
     LIMIT 1`,
    [teacherId, homebaseId, targetPeriodeId],
  );
  return result.rows[0] || null;
};

/** Wali kelas sebuah kelas pada periode tertentu (default: periode aktif). */
export const getClassHomeroomTeacher = async (
  executor,
  { classId, homebaseId, periodeId = null },
) => {
  await ensureClassHomeroomTable();
  const targetPeriodeId = await resolvePeriodeId(executor, homebaseId, periodeId);
  if (!targetPeriodeId) return null;

  const result = await executor.query(
    `SELECT u.id, u.full_name, ch.periode_id
     FROM public.a_class_homeroom ch
     JOIN public.u_users u ON u.id = ch.teacher_id
     WHERE ch.class_id = $1
       AND ch.periode_id = $2
     LIMIT 1`,
    [classId, targetPeriodeId],
  );
  return result.rows[0] || null;
};
