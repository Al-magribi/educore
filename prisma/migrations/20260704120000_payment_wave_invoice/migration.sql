-- CreateEnum
CREATE TYPE "PaymentCategory" AS ENUM ('registration', 'wave_fee');

-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'cash';

-- AlterTable
ALTER TABLE "payments" ADD COLUMN "category" "PaymentCategory" NOT NULL DEFAULT 'registration';
ALTER TABLE "payments" ADD COLUMN "invoice_number" TEXT;
ALTER TABLE "payments" ADD COLUMN "invoice_issued_at" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "payments_invoice_number_key" ON "payments"("invoice_number");
CREATE INDEX "payments_application_id_category_idx" ON "payments"("application_id", "category");

-- CreateTable
CREATE TABLE "invoice_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "treasurer_name" TEXT,
    "treasurer_signature_url" TEXT,
    "invoice_logo_url" TEXT,
    "invoice_school_name" TEXT,
    "invoice_school_address" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invoice_settings_pkey" PRIMARY KEY ("id")
);
