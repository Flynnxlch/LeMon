-- CreateIndex for faster list/filter queries (target 120-250ms response)
CREATE INDEX "User_branchId_idx" ON "User"("branchId");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "Asset_branchId_idx" ON "Asset"("branchId");
CREATE INDEX "Asset_deletedAt_idx" ON "Asset"("deletedAt");
CREATE INDEX "Asset_status_idx" ON "Asset"("status");
