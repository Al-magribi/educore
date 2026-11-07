-- Tendik (public.u_staff) bisa ditugaskan sebagai admin keuangan satuan.
-- Aman dijalankan berulang.

ALTER TABLE finance.homebase_finance_admin
    ADD COLUMN IF NOT EXISTS staff_id BIGINT REFERENCES public.u_staff(id) ON DELETE CASCADE;

ALTER TABLE finance.homebase_finance_admin
    ALTER COLUMN teacher_id DROP NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'homebase_finance_admin_person_check'
    ) THEN
        ALTER TABLE finance.homebase_finance_admin
            ADD CONSTRAINT homebase_finance_admin_person_check
            CHECK (num_nonnulls(teacher_id, staff_id) = 1);
    END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uq_homebase_finance_admin_staff_active
    ON finance.homebase_finance_admin (homebase_id, staff_id)
    WHERE is_active = true AND staff_id IS NOT NULL;
