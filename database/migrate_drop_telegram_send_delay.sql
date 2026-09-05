-- Remove configurable send delay columns; delay is hardcoded 1-3s in backend.
BEGIN;

ALTER TABLE attendance.telegram_notification_config
  DROP CONSTRAINT IF EXISTS telegram_notification_config_delay_min_check;

ALTER TABLE attendance.telegram_notification_config
  DROP CONSTRAINT IF EXISTS telegram_notification_config_delay_max_check;

ALTER TABLE attendance.telegram_notification_config
  DROP CONSTRAINT IF EXISTS telegram_notification_config_delay_cap_check;

ALTER TABLE attendance.telegram_notification_config
  DROP COLUMN IF EXISTS send_delay_min_seconds;

ALTER TABLE attendance.telegram_notification_config
  DROP COLUMN IF EXISTS send_delay_max_seconds;

COMMIT;
