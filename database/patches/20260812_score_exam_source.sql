-- Track exam sync source and recorded date for formative/summative score columns.

BEGIN;

ALTER TABLE lms.l_score_formative
  ADD COLUMN IF NOT EXISTS exam_id integer REFERENCES cbt.c_exam(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE lms.l_score_summative
  ADD COLUMN IF NOT EXISTS exam_id integer REFERENCES cbt.c_exam(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;

-- Existing rows get DEFAULT CURRENT_TIMESTAMP on add; clear so headers fall back to month.
UPDATE lms.l_score_formative SET created_at = NULL WHERE exam_id IS NULL AND created_at IS NOT NULL;
UPDATE lms.l_score_summative SET created_at = NULL WHERE exam_id IS NULL AND created_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_score_formative_exam
  ON lms.l_score_formative(exam_id);

CREATE INDEX IF NOT EXISTS idx_score_summative_exam
  ON lms.l_score_summative(exam_id);

COMMIT;
