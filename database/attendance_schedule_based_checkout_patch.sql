-- Schedule-based policy: Checkin Selesai diganti Jam Pulang.
-- Izinkan checkin_start tanpa checkin_end, lalu kosongkan checkin_end
-- pada day rule teacher_schedule_based.
-- Jalankan sekali di database yang sudah ada.

ALTER TABLE attendance.attendance_policy_day_rule
  DROP CONSTRAINT IF EXISTS attendance_policy_day_rule_checkin_range_check;

ALTER TABLE attendance.attendance_policy_day_rule
  ADD CONSTRAINT attendance_policy_day_rule_checkin_range_check
  CHECK (
    checkin_end IS NULL
    OR (
      checkin_start IS NOT NULL
      AND checkin_start < checkin_end
    )
  );

UPDATE attendance.attendance_policy_day_rule r
SET
  checkin_end = NULL,
  updated_at = NOW()
FROM attendance.attendance_policy p
WHERE r.policy_id = p.id
  AND p.policy_type = 'teacher_schedule_based'
  AND r.checkin_end IS NOT NULL;
