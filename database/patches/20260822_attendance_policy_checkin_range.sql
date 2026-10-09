-- Allow checkin_start without checkin_end (teacher_schedule_based uses
-- Checkin Mulai + Jam Pulang, without Checkin Selesai).
-- Also keeps the strict paired window for student_fixed / teacher_fixed_daily
-- when checkin_end is provided.

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

-- Normalize schedule-based rules that still carry a stale checkin_end.
UPDATE attendance.attendance_policy_day_rule r
SET
  checkin_end = NULL,
  updated_at = NOW()
FROM attendance.attendance_policy p
WHERE r.policy_id = p.id
  AND p.policy_type = 'teacher_schedule_based'
  AND r.checkin_end IS NOT NULL;
