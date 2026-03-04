-- DropForeignKey
ALTER TABLE "AccountRequest" DROP CONSTRAINT "AccountRequest_branchId_fkey";

-- AlterTable
ALTER TABLE "AccountRequest" ALTER COLUMN "branchId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "AccountRequest" ADD CONSTRAINT "AccountRequest_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
