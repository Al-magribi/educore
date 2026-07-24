-- Patch: allow one RFID extracurricular device to map to many activity policies
-- (e.g. Silat + Tari on the same reader), and restore extracurricular in the
-- device binding check (accidentally dropped by attendance_rfid_device_class_patch).
-- Safe to re-run (IF NOT EXISTS / ON CONFLICT).

BEGIN;
SET search_path TO attendance, public;
SET TIME ZONE 'Asia/Jakarta';

CREATE TABLE IF NOT EXISTS attendance.rfid_device_policy(
    device_id integer NOT NULL REFERENCES attendance.rfid_device(id) ON DELETE CASCADE,
    policy_id integer NOT NULL REFERENCES attendance.attendance_policy(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(device_id, policy_id)
);

CREATE INDEX IF NOT EXISTS idx_rfid_device_policy_policy
ON attendance.rfid_device_policy(policy_id, device_id);

CREATE INDEX IF NOT EXISTS idx_rfid_device_policy_device
ON attendance.rfid_device_policy(device_id, policy_id);

INSERT INTO attendance.rfid_device_policy (device_id, policy_id)
SELECT d.id, d.policy_id
FROM attendance.rfid_device d
WHERE d.device_type = 'extracurricular'
  AND d.policy_id IS NOT NULL
ON CONFLICT (device_id, policy_id) DO NOTHING;

-- Drop both historical constraint names from prior patches.
ALTER TABLE attendance.rfid_device
  DROP CONSTRAINT IF EXISTS rfid_device_classroom_check;

ALTER TABLE attendance.rfid_device
  DROP CONSTRAINT IF EXISTS rfid_device_device_binding_check;

-- class_id / policy_id on rfid_device remain legacy primary pointers.
-- Source of truth for multi-maps: rfid_device_class / rfid_device_policy.
ALTER TABLE attendance.rfid_device
  ADD CONSTRAINT rfid_device_device_binding_check
  CHECK (
      (device_type = 'gate' AND class_id IS NULL AND policy_id IS NULL)
      OR
      (device_type = 'classroom' AND policy_id IS NULL)
      OR
      (device_type = 'extracurricular' AND class_id IS NULL)
  );

COMMIT;
