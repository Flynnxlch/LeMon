import { prisma } from '../lib/prisma.js';
import { cache, invalidateAssets, invalidateBranches, invalidateTransferRequests, KEYS } from '../utils/cache.js';

function mapTransferRequest(tr) {
  return {
    id: tr.id,
    assetId: tr.assetId,
    assetSerialNumber: tr.asset?.serialNumber,
    assetType: tr.asset?.type,
    fromBranchId: tr.fromBranchId,
    fromBranchName: tr.fromBranch?.name,
    toBranchId: tr.toBranchId,
    toBranchName: tr.toBranch?.name,
    notes: tr.notes,
    status: tr.status,
    requestDate: tr.requestDate,
    requestedBy: tr.requestedBy?.name,
    requestedById: tr.requestedById,
  };
}

export async function getTransferRequests(status) {
  const cacheKey = KEYS.TRANSFER_REQUESTS + (status || '');
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const where = status ? { status } : {};
  // Select only fields used by mapTransferRequest to reduce payload and DB I/O.
  const list = await prisma.transferRequest.findMany({
    where,
    select: {
      id: true,
      assetId: true,
      fromBranchId: true,
      toBranchId: true,
      notes: true,
      status: true,
      requestDate: true,
      requestedById: true,
      asset: { select: { serialNumber: true, type: true } },
      fromBranch: { select: { name: true } },
      toBranch: { select: { name: true } },
      requestedBy: { select: { name: true } },
    },
    orderBy: { requestDate: 'desc' },
  });
  const result = list.map(mapTransferRequest);
  cache.set(cacheKey, result);
  return result;
}

// FIX [F005]: Admin Cabang may only create transfer requests for assets in their branch
export async function createTransferRequest(data, userId, userRole, userBranchId) {
  const asset = await prisma.asset.findFirst({
    where: { id: data.assetId, deletedAt: null },
    select: { id: true, branchId: true },
  });
  if (!asset) throw new Error('Asset not found');
  if (userRole === 'Admin Cabang' && asset.branchId !== userBranchId) {
    throw new Error('Forbidden');
  }
  const tr = await prisma.transferRequest.create({
    data: {
      assetId: data.assetId,
      fromBranchId: asset.branchId,
      toBranchId: data.toBranchId,
      notes: data.notes,
      requestedById: userId,
      status: 'Pending',
    },
    select: {
      id: true,
      assetId: true,
      fromBranchId: true,
      toBranchId: true,
      notes: true,
      status: true,
      requestDate: true,
      requestedById: true,
      asset: { select: { serialNumber: true, type: true } },
      fromBranch: { select: { name: true } },
      toBranch: { select: { name: true } },
      requestedBy: { select: { name: true } },
    },
  });
  invalidateTransferRequests();
  return mapTransferRequest(tr);
}

export async function approveTransferRequest(requestId) {
  const tr = await prisma.transferRequest.findUnique({
    where: { id: requestId },
    select: { id: true, assetId: true, toBranchId: true, status: true },
  });
  if (!tr) throw new Error('Transfer request not found');
  if (tr.status !== 'Pending') throw new Error('Request already processed');
  await prisma.$transaction([
    prisma.asset.update({
      where: { id: tr.assetId },
      data: { branchId: tr.toBranchId },
    }),
    prisma.transferRequest.update({
      where: { id: requestId },
      data: { status: 'Approved', processedAt: new Date() },
    }),
  ]);
  invalidateTransferRequests();
  invalidateAssets();
  invalidateBranches();
  return { ok: true };
}

export async function rejectTransferRequest(requestId) {
  const tr = await prisma.transferRequest.findUnique({ where: { id: requestId } });
  if (!tr) throw new Error('Transfer request not found');
  if (tr.status !== 'Pending') throw new Error('Request already processed');
  await prisma.transferRequest.update({
    where: { id: requestId },
    data: { status: 'Rejected', processedAt: new Date() },
  });
  invalidateTransferRequests();
  return { ok: true };
}

/** Direct transfer: Admin Pusat only. Moves asset to target branch immediately (no request). */
export async function directTransfer(data) {
  const asset = await prisma.asset.findFirst({
    where: { id: data.assetId, deletedAt: null },
    select: { id: true, branchId: true },
  });
  if (!asset) throw new Error('Asset not found');
  if (asset.branchId === data.toBranchId) throw new Error('Cannot transfer to the same branch');
  await prisma.asset.update({
    where: { id: data.assetId },
    data: { branchId: data.toBranchId },
  });
  invalidateAssets();
  invalidateBranches();
  return { ok: true };
}
