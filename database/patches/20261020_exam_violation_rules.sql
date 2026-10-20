ALTER TABLE cbt.c_exam
    ADD COLUMN IF NOT EXISTS violation_tolerance integer NOT NULL DEFAULT 3;

ALTER TABLE cbt.c_exam
    ADD COLUMN IF NOT EXISTS violation_duration_seconds integer NOT NULL DEFAULT 5;

ALTER TABLE cbt.c_exam_attendance
    ADD COLUMN IF NOT EXISTS violation_count integer NOT NULL DEFAULT 0;

ALTER TABLE cbt.c_exam_attendance
    ADD COLUMN IF NOT EXISTS violation_baseline integer NOT NULL DEFAULT 0;

ALTER TABLE cbt.c_exam_attendance
    ADD COLUMN IF NOT EXISTS away_started_at timestamptz;

ALTER TABLE cbt.c_exam_attendance
    ADD COLUMN IF NOT EXISTS away_counted boolean NOT NULL DEFAULT false;
