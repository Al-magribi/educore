-- Fix FK blocking delete-admin / delete-homebase
-- Audit/user-ref columns should soft-clear when a user is deleted.

BEGIN;

ALTER TABLE finance.invoice ALTER COLUMN created_by DROP NOT NULL;
ALTER TABLE finance.payment ALTER COLUMN payer_user_id DROP NOT NULL;

ALTER TABLE finance.fee_component DROP CONSTRAINT IF EXISTS fee_component_created_by_fkey;
ALTER TABLE finance.fee_component
  ADD CONSTRAINT fee_component_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.fee_rule DROP CONSTRAINT IF EXISTS fee_rule_created_by_fkey;
ALTER TABLE finance.fee_rule
  ADD CONSTRAINT fee_rule_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.finance_setting DROP CONSTRAINT IF EXISTS finance_setting_created_by_fkey;
ALTER TABLE finance.finance_setting
  ADD CONSTRAINT finance_setting_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.finance_setting DROP CONSTRAINT IF EXISTS finance_setting_updated_by_fkey;
ALTER TABLE finance.finance_setting
  ADD CONSTRAINT finance_setting_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.invoice DROP CONSTRAINT IF EXISTS invoice_created_by_fkey;
ALTER TABLE finance.invoice
  ADD CONSTRAINT invoice_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.other_payment_charges DROP CONSTRAINT IF EXISTS other_payment_charges_created_by_fkey;
ALTER TABLE finance.other_payment_charges
  ADD CONSTRAINT other_payment_charges_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.other_payment_installments DROP CONSTRAINT IF EXISTS other_payment_installments_processed_by_fkey;
ALTER TABLE finance.other_payment_installments
  ADD CONSTRAINT other_payment_installments_processed_by_fkey
  FOREIGN KEY (processed_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.other_payment_types DROP CONSTRAINT IF EXISTS other_payment_types_created_by_fkey;
ALTER TABLE finance.other_payment_types
  ADD CONSTRAINT other_payment_types_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.payment DROP CONSTRAINT IF EXISTS payment_created_by_fkey;
ALTER TABLE finance.payment
  ADD CONSTRAINT payment_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.payment DROP CONSTRAINT IF EXISTS payment_payer_user_id_fkey;
ALTER TABLE finance.payment
  ADD CONSTRAINT payment_payer_user_id_fkey
  FOREIGN KEY (payer_user_id) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.payment DROP CONSTRAINT IF EXISTS payment_verified_by_fkey;
ALTER TABLE finance.payment
  ADD CONSTRAINT payment_verified_by_fkey
  FOREIGN KEY (verified_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.payment_gateway_config DROP CONSTRAINT IF EXISTS payment_gateway_config_created_by_fkey;
ALTER TABLE finance.payment_gateway_config
  ADD CONSTRAINT payment_gateway_config_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.payment_gateway_config DROP CONSTRAINT IF EXISTS payment_gateway_config_updated_by_fkey;
ALTER TABLE finance.payment_gateway_config
  ADD CONSTRAINT payment_gateway_config_updated_by_fkey
  FOREIGN KEY (updated_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.spp_monthly_payment DROP CONSTRAINT IF EXISTS spp_monthly_payment_processed_by_fkey;
ALTER TABLE finance.spp_monthly_payment
  ADD CONSTRAINT spp_monthly_payment_processed_by_fkey
  FOREIGN KEY (processed_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.spp_payment_transaction DROP CONSTRAINT IF EXISTS spp_payment_transaction_processed_by_fkey;
ALTER TABLE finance.spp_payment_transaction
  ADD CONSTRAINT spp_payment_transaction_processed_by_fkey
  FOREIGN KEY (processed_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE finance.spp_tariff DROP CONSTRAINT IF EXISTS spp_tariff_created_by_fkey;
ALTER TABLE finance.spp_tariff
  ADD CONSTRAINT spp_tariff_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.u_users(id) ON DELETE SET NULL;

ALTER TABLE lms.l_point_entry ALTER COLUMN given_by DROP NOT NULL;
ALTER TABLE lms.l_daily_absence_report ALTER COLUMN target_user_id DROP NOT NULL;

DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname, n.nspname, c.relname, a.attname
    FROM pg_constraint con
    JOIN pg_class c ON con.conrelid = c.oid
    JOIN pg_namespace n ON c.relnamespace = n.oid
    JOIN pg_class c2 ON con.confrelid = c2.oid
    JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord) ON true
    JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ck.attnum
    WHERE con.contype = 'f'
      AND c2.relname = 'u_users'
      AND n.nspname = 'lms'
      AND confdeltype = 'a'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT %I', r.nspname, r.relname, r.conname);
    EXECUTE format(
      'ALTER TABLE %I.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.u_users(id) ON DELETE SET NULL',
      r.nspname, r.relname, r.conname, r.attname
    );
  END LOOP;
END $$;

COMMIT;
