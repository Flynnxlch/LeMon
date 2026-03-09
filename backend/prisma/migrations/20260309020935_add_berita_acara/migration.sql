-- CreateTable (struktur sesuai DB: fileUrl, createdById; title ditambahkan di migration berikutnya)
CREATE TABLE "BeritaAcara" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "referenceId" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "payload" JSONB,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BeritaAcara_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BeritaAcara_assetId_idx" ON "BeritaAcara"("assetId");

-- CreateIndex
CREATE INDEX "BeritaAcara_createdAt_idx" ON "BeritaAcara"("createdAt");

-- AddForeignKey
ALTER TABLE "BeritaAcara" ADD CONSTRAINT "BeritaAcara_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BeritaAcara" ADD CONSTRAINT "BeritaAcara_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
