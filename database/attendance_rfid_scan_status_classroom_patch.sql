-- Allow classroom-specific scan result statuses used by LCD firmware contract.
-- without this, rejectAndLog(too_early_checkout|cooldown) violates rfid_scan_log_status_check → HTTP 500.

ALTER TABLE attendance.rfid_scan_log
  DROP CONSTRAINT IF EXISTS rfid_scan_log_status_check;

ALTER TABLE attendance.rfid_scan_log
  ADD CONSTRAINT rfid_scan_log_status_check
  CHECK (
    result_status IN (
      'accepted',
      'duplicate',
      'rejected',
      'unregistered',
      'out_of_window',
      'not_scheduled',
      'card_inactive',
      'device_inactive',
      'user_inactive',
      'policy_missing',
      'too_early_checkout',
      'cooldown'
    )
  );
