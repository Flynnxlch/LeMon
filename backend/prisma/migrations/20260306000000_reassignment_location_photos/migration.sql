-- AlterTable
ALTER TABLE "ReassignmentRequest" ADD COLUMN "newHolderLatitude" DOUBLE PRECISION,
ADD COLUMN "newHolderLongitude" DOUBLE PRECISION,
ADD COLUMN "newHolderAddress" TEXT,
ADD COLUMN "newHolderUpdateImages" JSONB;
