-- CreateIndex
CREATE INDEX "AccountRequest_status_idx" ON "AccountRequest"("status");

-- CreateIndex
CREATE INDEX "AssetAssignment_assetId_assignedAt_idx" ON "AssetAssignment"("assetId", "assignedAt");

-- CreateIndex
CREATE INDEX "AssetRequest_status_idx" ON "AssetRequest"("status");

-- CreateIndex
CREATE INDEX "AssetRequest_branchId_idx" ON "AssetRequest"("branchId");

-- CreateIndex
CREATE INDEX "ConditionHistory_assetId_updatedAt_idx" ON "ConditionHistory"("assetId", "updatedAt");

-- CreateIndex
CREATE INDEX "PasswordResetToken_userId_idx" ON "PasswordResetToken"("userId");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

-- CreateIndex
CREATE INDEX "ReassignmentRequest_status_idx" ON "ReassignmentRequest"("status");

-- CreateIndex
CREATE INDEX "ReassignmentRequest_assetId_idx" ON "ReassignmentRequest"("assetId");

-- CreateIndex
CREATE INDEX "TransferRequest_status_idx" ON "TransferRequest"("status");

-- CreateIndex
CREATE INDEX "TransferRequest_assetId_idx" ON "TransferRequest"("assetId");

-- CreateIndex
CREATE INDEX "TransferRequest_fromBranchId_idx" ON "TransferRequest"("fromBranchId");

-- CreateIndex
CREATE INDEX "TransferRequest_toBranchId_idx" ON "TransferRequest"("toBranchId");
