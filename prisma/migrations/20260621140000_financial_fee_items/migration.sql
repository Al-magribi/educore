-- CreateTable
CREATE TABLE "financial_fee_items" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "frequency" TEXT NOT NULL DEFAULT 'once',
    "apply_to_all" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "financial_fee_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_fee_item_periods" (
    "id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "period_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "financial_fee_item_periods_pkey" PRIMARY KEY ("id")
);

-- Migrate existing JSON financial_fees into relational tables
DO $$
DECLARE
    period_row RECORD;
    item_row JSONB;
    item_id TEXT;
    item_label TEXT;
    item_frequency TEXT;
    item_amount INT;
    period_ids TEXT[];
    period_count INT;
    item_period_count INT;
BEGIN
    FOR period_row IN SELECT id, financial_fees FROM admission_periods WHERE financial_fees IS NOT NULL LOOP
        IF jsonb_typeof(period_row.financial_fees->'items') = 'array' THEN
            FOR item_row IN SELECT * FROM jsonb_array_elements(period_row.financial_fees->'items') LOOP
                item_id := COALESCE(NULLIF(TRIM(item_row->>'id'), ''), 'item_' || substr(md5(item_row->>'label'), 1, 12));
                item_label := COALESCE(NULLIF(TRIM(item_row->>'label'), ''), 'Item biaya');
                item_frequency := COALESCE(NULLIF(TRIM(item_row->>'frequency'), ''), 'once');
                item_amount := GREATEST(0, COALESCE((item_row->>'amount')::INT, 0));

                INSERT INTO financial_fee_items (id, label, frequency, apply_to_all, sort_order, created_at, updated_at)
                VALUES (
                    item_id,
                    item_label,
                    item_frequency,
                    true,
                    (SELECT COALESCE(MAX(sort_order), -1) + 1 FROM financial_fee_items),
                    CURRENT_TIMESTAMP,
                    CURRENT_TIMESTAMP
                )
                ON CONFLICT (id) DO UPDATE SET
                    label = EXCLUDED.label,
                    frequency = EXCLUDED.frequency,
                    updated_at = CURRENT_TIMESTAMP;

                INSERT INTO financial_fee_item_periods (id, item_id, period_id, amount)
                VALUES (
                    'ffip_' || period_row.id || '_' || item_id,
                    item_id,
                    period_row.id,
                    item_amount
                )
                ON CONFLICT DO NOTHING;
            END LOOP;
        END IF;
    END LOOP;

    SELECT array_agg(id), count(*)::INT INTO period_ids, period_count FROM admission_periods;

    IF period_count > 0 THEN
        UPDATE financial_fee_items fi
        SET apply_to_all = (
            SELECT count(DISTINCT ffip.period_id)::INT = period_count
            FROM financial_fee_item_periods ffip
            WHERE ffip.item_id = fi.id
        );
    END IF;
END $$;

-- CreateIndex
CREATE UNIQUE INDEX "financial_fee_item_periods_item_id_period_id_key" ON "financial_fee_item_periods"("item_id", "period_id");

-- CreateIndex
CREATE INDEX "financial_fee_item_periods_period_id_idx" ON "financial_fee_item_periods"("period_id");

-- AddForeignKey
ALTER TABLE "financial_fee_item_periods" ADD CONSTRAINT "financial_fee_item_periods_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "financial_fee_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_fee_item_periods" ADD CONSTRAINT "financial_fee_item_periods_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "admission_periods"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "admission_periods" DROP COLUMN "financial_fees";
