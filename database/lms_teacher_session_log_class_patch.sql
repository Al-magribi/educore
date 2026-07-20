-- Add class_id to l_teacher_session_log for classroom RFID session tracking.
-- Safe to run multiple times.

BEGIN;

ALTER TABLE lms.l_teacher_session_log
  ADD COLUMN IF NOT EXISTS class_id integer;

UPDATE lms.l_teacher_session_log tsl
SET class_id = se.class_id
FROM lms.l_schedule_entry se
WHERE tsl.class_id IS NULL
  AND se.id = tsl.schedule_entry_id;

ALTER TABLE lms.l_teacher_session_log
  DROP CONSTRAINT IF EXISTS l_teacher_session_log_class_id_fkey;

ALTER TABLE lms.l_teacher_session_log
  ADD CONSTRAINT l_teacher_session_log_class_id_fkey
  FOREIGN KEY (class_id) REFERENCES public.a_class(id);

DROP INDEX IF EXISTS lms.uq_teacher_session_daily;

CREATE UNIQUE INDEX IF NOT EXISTS uq_teacher_session_daily
ON lms.l_teacher_session_log (date, teacher_id, class_id);

DROP INDEX IF EXISTS lms.idx_teacher_session_log_lookup;

CREATE INDEX IF NOT EXISTS idx_teacher_session_log_lookup
ON lms.l_teacher_session_log (date, teacher_id, class_id, schedule_entry_id);

COMMIT;
