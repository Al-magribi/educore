export const ensureStaffTable = async (db) => {
  await db.query(`
    CREATE TABLE IF NOT EXISTS public.u_staff (
      id BIGSERIAL PRIMARY KEY,
      homebase_id INT NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
      full_name VARCHAR(150) NOT NULL,
      nip VARCHAR(50),
      phone VARCHAR(30),
      email VARCHAR(120),
      notes TEXT,
      rfid_no VARCHAR(100),
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
      updated_by INT REFERENCES public.u_users(id) ON DELETE SET NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT u_staff_name_not_blank CHECK (length(trim(full_name)) > 0)
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_u_staff_homebase_name
    ON public.u_staff (homebase_id, lower(trim(full_name)))
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS idx_u_staff_homebase_active
    ON public.u_staff (homebase_id, is_active)
  `);
  await db.query(`
    ALTER TABLE public.u_staff
    ADD COLUMN IF NOT EXISTS rfid_no VARCHAR(100)
  `);
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_u_staff_rfid
    ON public.u_staff (lower(trim(rfid_no)))
    WHERE rfid_no IS NOT NULL AND length(trim(rfid_no)) > 0
  `);
};
