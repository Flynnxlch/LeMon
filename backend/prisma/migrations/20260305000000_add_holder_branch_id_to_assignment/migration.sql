-- AlterTable
ALTER TABLE "AssetAssignment" ADD COLUMN "holderBranchId" TEXT;

-- CreateIndex
CREATE INDEX "AssetAssignment_holderBranchId_idx" ON "AssetAssignment"("holderBranchId");

-- AddForeignKey
ALTER TABLE "AssetAssignment" ADD CONSTRAINT "AssetAssignment_holderBranchId_fkey" FOREIGN KEY ("holderBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
