-- Patch: allow one RFID classroom device to map to many classes.
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).

BEGIN;
SET search_path TO attendance, public;
SET TIME ZONE 'Asia/Jakarta';

CREATE TABLE IF NOT EXISTS attendance.rfid_device_class(
    device_id integer NOT NULL REFERENCES attendance.rfid_device(id) ON DELETE CASCADE,
    class_id integer NOT NULL REFERENCES public.a_class(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(device_id, class_id)
);

CREATE INDEX IF NOT EXISTS idx_rfid_device_class_class
ON attendance.rfid_device_class(class_id, device_id);

CREATE INDEX IF NOT EXISTS idx_rfid_device_class_device
ON attendance.rfid_device_class(device_id, class_id);

INSERT INTO attendance.rfid_device_class (device_id, class_id)
SELECT d.id, d.class_id
FROM attendance.rfid_device d
WHERE d.device_type = 'classroom'
  AND d.class_id IS NOT NULL
ON CONFLICT (device_id, class_id) DO NOTHING;

ALTER TABLE attendance.rfid_device
  DROP CONSTRAINT IF EXISTS rfid_device_classroom_check;

ALTER TABLE attendance.rfid_device
  ADD CONSTRAINT rfid_device_classroom_check
  CHECK (
      (device_type = 'gate' AND class_id IS NULL)
      OR
      (device_type = 'classroom')
  );

COMMIT;
