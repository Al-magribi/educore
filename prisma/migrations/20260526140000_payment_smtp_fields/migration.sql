-- AlterTable
ALTER TABLE "payment_settings" ADD COLUMN IF NOT EXISTS "manual_enabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "payment_settings" ADD COLUMN IF NOT EXISTS "midtrans_merchant_id" TEXT;
ALTER TABLE "payment_settings" ADD COLUMN IF NOT EXISTS "bank_name" TEXT;
ALTER TABLE "payment_settings" ADD COLUMN IF NOT EXISTS "bank_account_number" TEXT;
ALTER TABLE "payment_settings" ADD COLUMN IF NOT EXISTS "bank_account_name" TEXT;

-- AlterTable
ALTER TABLE "smtp_settings" ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "smtp_settings" ADD COLUMN IF NOT EXISTS "secure" BOOLEAN NOT NULL DEFAULT false;
