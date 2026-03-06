-- AlterTable
ALTER TABLE "TransferRequest" ADD COLUMN     "purpose" TEXT NOT NULL DEFAULT 'normal';

-- CreateTable
CREATE TABLE "AssetRepair" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "repairType" TEXT NOT NULL,
    "fromBranchId" TEXT NOT NULL,
    "toBranchId" TEXT,
    "transferRequestId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'in_repair',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetRepair_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AssetRepair_assetId_idx" ON "AssetRepair"("assetId");

-- CreateIndex
CREATE INDEX "AssetRepair_status_idx" ON "AssetRepair"("status");

-- AddForeignKey
ALTER TABLE "AssetRepair" ADD CONSTRAINT "AssetRepair_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRepair" ADD CONSTRAINT "AssetRepair_fromBranchId_fkey" FOREIGN KEY ("fromBranchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetRepair" ADD CONSTRAINT "AssetRepair_toBranchId_fkey" FOREIGN KEY ("toBranchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
