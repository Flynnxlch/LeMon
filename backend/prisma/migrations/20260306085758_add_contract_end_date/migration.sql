-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "contractEndDate" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Asset_contractEndDate_idx" ON "Asset"("contractEndDate");
