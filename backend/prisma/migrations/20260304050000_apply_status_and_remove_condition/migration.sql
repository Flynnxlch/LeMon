-- Drop ConditionHistory table (no longer used)
DROP TABLE IF EXISTS "ConditionHistory";

-- Migrate Asset status: Rented -> Available, Late -> Perlu Diupdate
UPDATE "Asset" SET "status" = 'Available' WHERE "status" = 'Rented';
UPDATE "Asset" SET "status" = 'Perlu Diupdate' WHERE "status" = 'Late';

-- Remove condition columns and add updateImages
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "condition";
ALTER TABLE "Asset" DROP COLUMN IF EXISTS "conditionNote";
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "updateImages" JSONB;
