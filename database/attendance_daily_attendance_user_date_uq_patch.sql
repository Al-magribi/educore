-- Fix: auto-absent/auto-checkout job gagal karena ON CONFLICT (user_id, attendance_date)
-- membutuhkan unique index yang ada di schema tapi belum terpasang di DB live.
-- Jalankan sekali.

CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_attendance_user_date
ON attendance.daily_attendance(user_id, attendance_date);
