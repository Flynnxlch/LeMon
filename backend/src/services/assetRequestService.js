import { prisma } from '../lib/prisma.js';
import { cache, KEYS, invalidateAssetRequests, invalidateAssets, invalidateBranches } from '../utils/cache.js';
import { createAsset } from './assetService.js';

function mapAssetRequest(ar) {
  return {
    id: ar.id,
    serialNumber: ar.serialNumber,
    type: ar.type,
    brand: ar.brand,
    model: ar.model,
    detail: ar.detail,
    branchId: ar.branchId,
    branchName: ar.branch?.name ?? null,
    requestedById: ar.requestedById,
    requestedBy: ar.requestedBy?.name ?? null,
    photoUrl: ar.photoUrl,
    status: ar.status,
    requestDate: ar.requestDate,
  };
}

export async function getAssetRequests(status) {
  const cacheKey = KEYS.ASSET_REQUESTS + (status || '');
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const where = status ? { status } : {};
  const list = await prisma.assetRequest.findMany({
    where,
    include: { branch: true, requestedBy: true },
    orderBy: { requestDate: 'desc' },
  });
  const result = list.map(mapAssetRequest);
  cache.set(cacheKey, result);
  return result;
}

export async function createAssetRequest(data, requestedById, photoUrl) {
  const ar = await prisma.assetRequest.create({
    data: {
      serialNumber: data.serialNumber,
      type: data.type,
      brand: data.brand,
      model: data.model,
      detail: data.detail,
      branchId: data.branchId,
      requestedById,
      photoUrl: photoUrl || null,
      status: 'Pending',
    },
    include: { branch: true, requestedBy: true },
  });
  invalidateAssetRequests();
  return mapAssetRequest(ar);
}

export async function approveAssetRequest(requestId, editedPayload, photoUrl) {
  const ar = await prisma.assetRequest.findUnique({
    where: { id: requestId },
    include: { branch: true },
  });
  if (!ar) throw new Error('Asset request not found');
  if (ar.status !== 'Pending') throw new Error('Request already processed');
  const payload = {
    serialNumber: editedPayload?.serialNumber ?? ar.serialNumber,
    type: editedPayload?.type ?? ar.type,
    brand: editedPayload?.brand ?? ar.brand,
    model: editedPayload?.model ?? ar.model,
    detail: editedPayload?.detail ?? ar.detail,
    branchId: ar.branchId,
    contractEndDate: editedPayload?.contractEndDate,
  };
  const newAsset = await createAsset(payload, photoUrl ?? ar.photoUrl);
  await prisma.assetRequest.update({
    where: { id: requestId },
    data: { status: 'Approved', processedAt: new Date() },
  });
  invalidateAssetRequests();
  invalidateAssets();
  invalidateBranches();
  return { ok: true, assetId: newAsset.id };
}

export async function rejectAssetRequest(requestId) {
  const ar = await prisma.assetRequest.findUnique({ where: { id: requestId } });
  if (!ar) throw new Error('Asset request not found');
  if (ar.status !== 'Pending') throw new Error('Request already processed');
  await prisma.assetRequest.update({
    where: { id: requestId },
    data: { status: 'Rejected', processedAt: new Date() },
  });
  invalidateAssetRequests();
  return { ok: true };
}
