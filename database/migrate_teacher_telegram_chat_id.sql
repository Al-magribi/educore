-- Add Telegram chat_id for teachers (gate attendance notifications).
BEGIN;

ALTER TABLE public.u_teachers
  ADD COLUMN IF NOT EXISTS telegram_chat_id varchar(64);

CREATE UNIQUE INDEX IF NOT EXISTS uq_u_teachers_telegram_chat_id
  ON public.u_teachers (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL AND NULLIF(TRIM(telegram_chat_id), '') IS NOT NULL;

COMMIT;
