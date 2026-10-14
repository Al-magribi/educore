-- Induk tendik ada di public.u_staff.
-- Data finance.honor_staff disalin dengan id yang sama dan tidak dihapus.
-- Perubahan di salah satu tabel disalin ke tabel lain selama finance.honor_staff masih ada.

CREATE TABLE IF NOT EXISTS public.u_staff (
    id BIGSERIAL PRIMARY KEY,
    homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    nip VARCHAR(50),
    phone VARCHAR(30),
    email VARCHAR(120),
    notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT u_staff_name_not_blank CHECK (length(trim(full_name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_u_staff_homebase_name
    ON public.u_staff (homebase_id, lower(trim(full_name)));

CREATE INDEX IF NOT EXISTS idx_u_staff_homebase_active
    ON public.u_staff (homebase_id, is_active);

DO $$
BEGIN
    IF to_regclass('finance.honor_staff') IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO public.u_staff (
        id, homebase_id, full_name, nip, phone, email, notes, is_active,
        created_by, updated_by, created_at, updated_at
    )
    SELECT
        id, homebase_id, full_name, nip, phone, email, notes, is_active,
        created_by, updated_by, created_at, updated_at
    FROM finance.honor_staff
    ON CONFLICT (id) DO NOTHING;
END $$;

SELECT setval(
    pg_get_serial_sequence('public.u_staff', 'id'),
    GREATEST(COALESCE((SELECT MAX(id) FROM public.u_staff), 1), 1),
    COALESCE((SELECT MAX(id) FROM public.u_staff), 0) > 0
);

CREATE OR REPLACE FUNCTION public.sync_staff_directory()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    target_table text;
BEGIN
    IF to_regclass('finance.honor_staff') IS NULL THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    IF pg_trigger_depth() > 1 THEN
        IF TG_OP = 'DELETE' THEN
            RETURN OLD;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_TABLE_NAME = 'u_staff' THEN
        target_table := 'finance.honor_staff';
    ELSE
        target_table := 'public.u_staff';
    END IF;

    IF TG_OP = 'DELETE' THEN
        EXECUTE format('DELETE FROM %s WHERE id = $1', target_table) USING OLD.id;
        RETURN OLD;
    END IF;

    EXECUTE format(
        'INSERT INTO %s (
            id, homebase_id, full_name, nip, phone, email, notes, is_active,
            created_by, updated_by, created_at, updated_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
        ON CONFLICT (id) DO UPDATE SET
            homebase_id = EXCLUDED.homebase_id,
            full_name = EXCLUDED.full_name,
            nip = EXCLUDED.nip,
            phone = EXCLUDED.phone,
            email = EXCLUDED.email,
            notes = EXCLUDED.notes,
            is_active = EXCLUDED.is_active,
            updated_by = EXCLUDED.updated_by,
            updated_at = EXCLUDED.updated_at',
        target_table
    )
    USING
        NEW.id, NEW.homebase_id, NEW.full_name, NEW.nip, NEW.phone, NEW.email,
        NEW.notes, NEW.is_active, NEW.created_by, NEW.updated_by,
        NEW.created_at, NEW.updated_at;

    IF TG_TABLE_NAME = 'u_staff' THEN
        PERFORM setval(
            pg_get_serial_sequence('finance.honor_staff', 'id'),
            GREATEST(COALESCE((SELECT MAX(id) FROM finance.honor_staff), 1), 1),
            true
        );
    ELSE
        PERFORM setval(
            pg_get_serial_sequence('public.u_staff', 'id'),
            GREATEST(COALESCE((SELECT MAX(id) FROM public.u_staff), 1), 1),
            true
        );
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_u_staff_to_honor ON public.u_staff;
CREATE TRIGGER trg_sync_u_staff_to_honor
AFTER INSERT OR UPDATE OR DELETE ON public.u_staff
FOR EACH ROW EXECUTE FUNCTION public.sync_staff_directory();

DO $$
BEGIN
    IF to_regclass('finance.honor_staff') IS NULL THEN
        RETURN;
    END IF;

    EXECUTE 'DROP TRIGGER IF EXISTS trg_sync_honor_staff_to_u ON finance.honor_staff';
    EXECUTE '
        CREATE TRIGGER trg_sync_honor_staff_to_u
        AFTER INSERT OR UPDATE OR DELETE ON finance.honor_staff
        FOR EACH ROW EXECUTE FUNCTION public.sync_staff_directory()
    ';
END $$;

DO $$
DECLARE
    rec record;
    newdef text;
BEGIN
    FOR rec IN
        SELECT
            n.nspname AS schema_name,
            c.relname AS table_name,
            con.conname,
            pg_get_constraintdef(con.oid) AS def
        FROM pg_constraint con
        JOIN pg_class c ON c.oid = con.conrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE con.contype = 'f'
          AND pg_get_constraintdef(con.oid) ILIKE '%finance.honor_staff%'
    LOOP
        newdef := replace(rec.def, 'finance.honor_staff', 'public.u_staff');
        EXECUTE format(
            'ALTER TABLE %I.%I DROP CONSTRAINT %I',
            rec.schema_name, rec.table_name, rec.conname
        );
        EXECUTE format(
            'ALTER TABLE %I.%I ADD CONSTRAINT %I %s',
            rec.schema_name, rec.table_name, rec.conname, newdef
        );
    END LOOP;
END $$;

DO $$
BEGIN
    IF to_regclass('finance.honor_assignment') IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM finance.honor_assignment a
            WHERE a.staff_id IS NOT NULL
              AND NOT EXISTS (
                    SELECT 1 FROM public.u_staff s WHERE s.id = a.staff_id
              )
       ) THEN
        RAISE EXCEPTION 'Migrasi tendik gagal: assignment jabatan kehilangan induk';
    END IF;

    IF to_regclass('finance.honor_eskul_assignment') IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM finance.honor_eskul_assignment a
            WHERE a.staff_id IS NOT NULL
              AND NOT EXISTS (
                    SELECT 1 FROM public.u_staff s WHERE s.id = a.staff_id
              )
       ) THEN
        RAISE EXCEPTION 'Migrasi tendik gagal: assignment eskul kehilangan induk';
    END IF;

    IF to_regclass('finance.honor_payroll_line') IS NOT NULL
       AND EXISTS (
            SELECT 1
            FROM finance.honor_payroll_line a
            WHERE a.staff_id IS NOT NULL
              AND NOT EXISTS (
                    SELECT 1 FROM public.u_staff s WHERE s.id = a.staff_id
              )
       ) THEN
        RAISE EXCEPTION 'Migrasi tendik gagal: slip honor kehilangan induk';
    END IF;
END $$;
