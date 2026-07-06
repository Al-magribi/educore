
-- Izinkan penghapusan jadwal sambil mempertahankan riwayat audit.
ALTER TABLE lms.l_schedule_entry_history
  DROP CONSTRAINT IF EXISTS l_schedule_entry_history_schedule_entry_id_fkey;

ALTER TABLE lms.l_schedule_entry_history
  ADD CONSTRAINT l_schedule_entry_history_schedule_entry_id_fkey
  FOREIGN KEY (schedule_entry_id)
  REFERENCES lms.l_schedule_entry(id)
  ON DELETE SET NULL;

ALTER TABLE lms.l_teacher_session_log
  DROP CONSTRAINT IF EXISTS l_teacher_session_log_schedule_entry_id_fkey;

ALTER TABLE lms.l_teacher_session_log
  ADD CONSTRAINT l_teacher_session_log_schedule_entry_id_fkey
  FOREIGN KEY (schedule_entry_id)
  REFERENCES lms.l_schedule_entry(id)
  ON DELETE SET NULL;
