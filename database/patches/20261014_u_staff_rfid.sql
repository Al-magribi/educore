ALTER TABLE public.u_staff
    ADD COLUMN IF NOT EXISTS rfid_no VARCHAR(100);

CREATE UNIQUE INDEX IF NOT EXISTS uq_u_staff_rfid
    ON public.u_staff (lower(trim(rfid_no)))
    WHERE rfid_no IS NOT NULL AND length(trim(rfid_no)) > 0;
