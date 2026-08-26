-- Migrate attendance notifications: WhatsApp -> Telegram
-- Safe to re-run (IF EXISTS / IF NOT EXISTS).

BEGIN;

SET search_path TO public;

ALTER TABLE public.u_parents
  ADD COLUMN IF NOT EXISTS telegram_chat_id varchar(64);

CREATE UNIQUE INDEX IF NOT EXISTS uq_u_parents_telegram_chat_id
  ON public.u_parents (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL AND NULLIF(TRIM(telegram_chat_id), '') IS NOT NULL;

SET search_path TO attendance, public;

CREATE TABLE IF NOT EXISTS telegram_notification_config (
    id SERIAL NOT NULL,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    is_enabled boolean NOT NULL DEFAULT false,
    bot_token text,
    bot_username varchar(120),
    bot_status varchar(20) NOT NULL DEFAULT 'disconnected',
    last_update_id bigint,
    last_error text,
    send_time time without time zone NOT NULL DEFAULT '08:00:00',
    send_delay_min_seconds integer NOT NULL DEFAULT 1,
    send_delay_max_seconds integer NOT NULL DEFAULT 3,
    message_template text NOT NULL DEFAULT
        'Assalamu''alaikum Bapak/Ibu {parent_name},

Berikut laporan kehadiran anak Anda hari ini ({date_label}):

{students_block}

Terima kasih.
-{school_name}',
    skip_on_holiday boolean NOT NULL DEFAULT true,
    last_run_date date,
    last_connected_at timestamp with time zone,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT telegram_notification_config_delay_min_check
        CHECK (send_delay_min_seconds >= 0),
    CONSTRAINT telegram_notification_config_delay_max_check
        CHECK (send_delay_max_seconds >= send_delay_min_seconds),
    CONSTRAINT telegram_notification_config_delay_cap_check
        CHECK (send_delay_max_seconds <= 120),
    CONSTRAINT telegram_notification_config_bot_status_check
        CHECK (
            bot_status IN (
                'disconnected',
                'ready',
                'invalid_token',
                'error'
            )
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_telegram_notification_config_homebase
ON attendance.telegram_notification_config(homebase_id);

CREATE INDEX IF NOT EXISTS idx_telegram_notification_config_schedule
ON attendance.telegram_notification_config(is_enabled, send_time);

CREATE TABLE IF NOT EXISTS telegram_notification_batch (
    id BIGSERIAL NOT NULL,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    periode_id integer REFERENCES public.a_periode(id) ON DELETE SET NULL,
    attendance_date date NOT NULL,
    batch_status varchar(20) NOT NULL DEFAULT 'pending',
    scheduled_at timestamp with time zone,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    total_recipients integer NOT NULL DEFAULT 0,
    sent_count integer NOT NULL DEFAULT 0,
    failed_count integer NOT NULL DEFAULT 0,
    skipped_count integer NOT NULL DEFAULT 0,
    error_message text,
    created_by integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT telegram_notification_batch_status_check
        CHECK (
            batch_status IN (
                'pending',
                'running',
                'completed',
                'failed',
                'cancelled'
            )
        ),
    CONSTRAINT telegram_notification_batch_count_check
        CHECK (
            total_recipients >= 0
            AND sent_count >= 0
            AND failed_count >= 0
            AND skipped_count >= 0
        )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_telegram_notification_batch_homebase_date
ON attendance.telegram_notification_batch(homebase_id, attendance_date);

CREATE INDEX IF NOT EXISTS idx_telegram_notification_batch_status
ON attendance.telegram_notification_batch(batch_status, attendance_date DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_notification_batch_homebase_lookup
ON attendance.telegram_notification_batch(homebase_id, attendance_date DESC, batch_status);

CREATE TABLE IF NOT EXISTS telegram_notification_log (
    id BIGSERIAL NOT NULL,
    batch_id bigint NOT NULL REFERENCES attendance.telegram_notification_batch(id) ON DELETE CASCADE,
    homebase_id integer NOT NULL REFERENCES public.a_homebase(id) ON DELETE CASCADE,
    parent_user_id integer REFERENCES public.u_users(id) ON DELETE SET NULL,
    parent_name text,
    chat_id varchar(64) NOT NULL,
    message text NOT NULL,
    students_payload jsonb NOT NULL DEFAULT '[]'::jsonb,
    delivery_status varchar(20) NOT NULL DEFAULT 'queued',
    telegram_message_id varchar(120),
    error_message text,
    queued_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    sent_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY(id),
    CONSTRAINT telegram_notification_log_delivery_status_check
        CHECK (
            delivery_status IN (
                'queued',
                'sent',
                'failed',
                'skipped'
            )
        ),
    CONSTRAINT telegram_notification_log_students_payload_check
        CHECK (jsonb_typeof(students_payload) = 'array')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_telegram_notification_log_batch_parent
ON attendance.telegram_notification_log(batch_id, parent_user_id)
WHERE parent_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_telegram_notification_log_batch_status
ON attendance.telegram_notification_log(batch_id, delivery_status);

CREATE INDEX IF NOT EXISTS idx_telegram_notification_log_homebase_sent
ON attendance.telegram_notification_log(homebase_id, sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_telegram_notification_log_chat
ON attendance.telegram_notification_log(chat_id, created_at DESC);

-- Drop legacy WhatsApp tables (order: log -> batch -> session/config)
DROP TABLE IF EXISTS attendance.whatsapp_notification_log CASCADE;
DROP TABLE IF EXISTS attendance.whatsapp_notification_batch CASCADE;
DROP TABLE IF EXISTS attendance.whatsapp_session CASCADE;
DROP TABLE IF EXISTS attendance.whatsapp_notification_config CASCADE;

SET search_path TO public;
COMMIT;
