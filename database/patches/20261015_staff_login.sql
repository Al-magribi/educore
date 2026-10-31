-- Akun login tendik: role 'staff' di u_users, ditautkan lewat u_staff.user_id.
-- Aman dijalankan berulang.

DO $$
DECLARE
    constraint_name text;
BEGIN
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        WHERE con.conrelid = 'public.u_users'::regclass
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%role%'
          AND pg_get_constraintdef(con.oid) NOT ILIKE '%''staff''%'
    LOOP
        EXECUTE format('ALTER TABLE public.u_users DROP CONSTRAINT %I', constraint_name);
    END LOOP;

    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint con
        WHERE con.conrelid = 'public.u_users'::regclass
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) ILIKE '%''staff''%'
    ) THEN
        ALTER TABLE public.u_users
            ADD CONSTRAINT u_users_role_check
            CHECK (role IN ('student', 'teacher', 'admin', 'parent', 'center', 'staff'));
    END IF;
END $$;

ALTER TABLE public.u_staff
    ADD COLUMN IF NOT EXISTS user_id INT REFERENCES public.u_users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_u_staff_user_id
    ON public.u_staff (user_id)
    WHERE user_id IS NOT NULL;
