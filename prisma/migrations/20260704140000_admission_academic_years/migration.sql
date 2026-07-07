-- CreateTable
CREATE TABLE "admission_academic_years" (
    "id" TEXT NOT NULL,
    "academic_year" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admission_academic_years_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admission_academic_years_academic_year_key" ON "admission_academic_years"("academic_year");

-- CreateIndex
CREATE INDEX "admission_academic_years_is_active_idx" ON "admission_academic_years"("is_active");

-- Migrate distinct academic years from existing periods
INSERT INTO "admission_academic_years" ("id", "academic_year", "is_active", "created_at", "updated_at")
SELECT
    'ay-' || REPLACE(academic_year, '/', '-'),
    academic_year,
    EXISTS (
        SELECT 1 FROM "admission_periods" ap2
        WHERE ap2.academic_year = ap.academic_year AND ap2.is_active = true
    ),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM (SELECT DISTINCT academic_year FROM "admission_periods") ap
ON CONFLICT ("academic_year") DO NOTHING;

-- Add academic_year_id column (nullable first for backfill)
ALTER TABLE "admission_periods" ADD COLUMN "academic_year_id" TEXT;

UPDATE "admission_periods" ap
SET "academic_year_id" = ay.id
FROM "admission_academic_years" ay
WHERE ay.academic_year = ap.academic_year;

-- Make academic_year_id required
ALTER TABLE "admission_periods" ALTER COLUMN "academic_year_id" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "admission_periods" ADD CONSTRAINT "admission_periods_academic_year_id_fkey" FOREIGN KEY ("academic_year_id") REFERENCES "admission_academic_years"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "admission_periods_academic_year_id_idx" ON "admission_periods"("academic_year_id");
