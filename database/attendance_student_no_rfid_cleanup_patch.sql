-- Hapus daily_attendance siswa/guru yang tidak punya RFID aktif.
-- Auto-absent/auto-checkout ke depan hanya untuk yang punya RFID aktif
-- (siswa juga wajib enrollment periode aktif).

DELETE FROM attendance.daily_attendance da
WHERE da.target_role IN ('student', 'teacher')
  AND NOT EXISTS (
    SELECT 1
    FROM attendance.rfid_card rc
    WHERE rc.user_id = da.user_id
      AND rc.is_active = true
  );
