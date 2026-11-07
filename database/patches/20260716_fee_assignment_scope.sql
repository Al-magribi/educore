-- Phase 1: other payment scope (grade | student) + fee_assignment roster

ALTER TABLE finance.fee_component
  ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE finance.fee_component
  ADD COLUMN IF NOT EXISTS scope VARCHAR(20) NOT NULL DEFAULT 'grade';

DO $$
BEGIN
  ALTER TABLE finance.fee_component
    ADD CONSTRAINT fee_component_scope_check
    CHECK (scope IN ('grade', 'student'));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

UPDATE finance.fee_component
SET scope = 'grade'
WHERE scope IS NULL OR scope = '';

CREATE TABLE IF NOT EXISTS finance.fee_assignment (
  id BIGSERIAL PRIMARY KEY,
  component_id BIGINT NOT NULL REFERENCES finance.fee_component(id) ON DELETE CASCADE,
  homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
  periode_id INT NOT NULL REFERENCES public.a_periode(id) ON DELETE CASCADE,
  student_id INT NOT NULL REFERENCES public.u_students(user_id) ON DELETE CASCADE,
  amount NUMERIC(14, 2) CHECK (amount IS NULL OR amount >= 0),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by INT REFERENCES public.u_users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE (component_id, periode_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_assignment_scope
  ON finance.fee_assignment(homebase_id, periode_id, component_id, is_active);

CREATE INDEX IF NOT EXISTS idx_fee_assignment_student
  ON finance.fee_assignment(student_id, periode_id, is_active);
