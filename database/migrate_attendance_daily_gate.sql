-- Tambah scan_action daily_gate untuk mode gate tunggal (server resolve datang/pulang).
ALTER TABLE attendance.rfid_scan_log
  DROP CONSTRAINT IF EXISTS rfid_scan_log_action_check;

ALTER TABLE attendance.rfid_scan_log
  ADD CONSTRAINT rfid_scan_log_action_check
  CHECK (
    scan_action IS NULL
    OR scan_action IN (
      'daily_gate',
      'daily_checkin',
      'daily_checkout',
      'teacher_session_checkin',
      'teacher_session_checkout',
      'unknown'
    )
  );
