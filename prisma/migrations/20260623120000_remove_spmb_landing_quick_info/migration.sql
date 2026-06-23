-- Drop quick_info column from spmb_landing_content (replaced by dynamic gelombang list)
ALTER TABLE "spmb_landing_content" DROP COLUMN IF EXISTS "quick_info";
