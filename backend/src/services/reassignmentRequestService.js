import { prisma } from '../lib/prisma.js';
import { cache, invalidateAssets, invalidateReassignmentRequests, KEYS } from '../utils/cache.js';
import * as settingService from './settingService.js';

function mapReassignmentRequest(rr) {
  const currentAssignment = rr.asset?.assignments?.[0];
  return {
    id: rr.id,
    assetId: rr.assetId,
    assetSerialNumber: rr.asset?.serialNumber ?? null,
    assetType: rr.asset?.type ?? null,
    branchName: rr.asset?.branch?.name ?? null,
    branchId: rr.asset?.branchId ?? null,
    currentHolderName: currentAssignment?.holderFullName ?? null,
    currentHolderNip: currentAssignment?.holderNip ?? null,
    currentHolderDivision: currentAssignment?.holderDivision ?? null,
    currentHolderEmail: currentAssignment?.holderEmail ?? null,
    newHolderFullName: rr.newHolderFullName,
    newHolderNip: rr.newHolderNip,
    newHolderBranchCode: rr.newHolderBranchCode,
    newHolderDivision: rr.newHolderDivision,
    newHolderEmail: rr.newHolderEmail,
    newHolderPhone: rr.newHolderPhone,
    notes: rr.notes,
    reason: rr.notes,
    status: rr.status,
    requestDate: rr.requestDate,
    processedAt: rr.processedAt?.toISOString?.() ?? null,
    requestedBy: rr.requestedBy?.name ?? null,
    requestedById: rr.requestedById,
  };
}

export async function getReassignmentRequests(status) {
  const cacheKey = KEYS.REASSIGNMENT_REQUESTS + (status || '');
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const where = status ? { status } : {};
  const list = await prisma.reassignmentRequest.findMany({
    where,
    include: {
      asset: {
        include: {
          branch: { select: { name: true, id: true } },
          assignments: { orderBy: { assignedAt: 'desc' }, take: 1 },
        },
      },
      requestedBy: { select: { name: true } },
    },
    orderBy: { requestDate: 'desc' },
  });
  const result = list.map(mapReassignmentRequest);
  cache.set(cacheKey, result);
  return result;
}

// FIX [F006]: Admin Cabang may only create reassignment requests for assets in their branch
export async function createReassignmentRequest(data, userId, userRole, userBranchId) {
  const asset = await prisma.asset.findFirst({
    where: { id: data.assetId, deletedAt: null },
  });
  if (!asset) throw new Error('Asset not found');
  if (userRole === 'Admin Cabang' && asset.branchId !== userBranchId) {
    throw new Error('Forbidden');
  }
  const rr = await prisma.reassignmentRequest.create({
    data: {
      assetId: data.assetId,
      newHolderFullName: data.newHolderFullName,
      newHolderNip: data.newHolderNip,
      newHolderBranchCode: data.newHolderBranchCode,
      newHolderBranchId: data.newHolderBranchId ?? null,
      newHolderDivision: data.newHolderDivision,
      newHolderEmail: data.newHolderEmail,
      newHolderPhone: data.newHolderPhone,
      newHolderLatitude: data.newHolderLatitude != null ? Number(data.newHolderLatitude) : null,
      newHolderLongitude: data.newHolderLongitude != null ? Number(data.newHolderLongitude) : null,
      newHolderAddress: data.newHolderAddress ?? null,
      newHolderUpdateImages: Array.isArray(data.newHolderUpdateImages) ? data.newHolderUpdateImages : null,
      notes: data.notes,
      requestedById: userId,
      status: 'Pending',
    },
    include: {
      asset: {
        include: {
          branch: { select: { name: true, id: true } },
          assignments: { orderBy: { assignedAt: 'desc' }, take: 1 },
        },
      },
      requestedBy: { select: { name: true } },
    },
  });
  invalidateReassignmentRequests();
  return mapReassignmentRequest(rr);
}

export async function getReassignmentRequestById(requestId) {
  return prisma.reassignmentRequest.findUnique({
    where: { id: requestId },
    select: { id: true, assetId: true, newHolderFullName: true, status: true },
  });
}

export async function approveReassignmentRequest(requestId) {
  const rr = await prisma.reassignmentRequest.findUnique({
    where: { id: requestId },
    include: { asset: true },
  });
  if (!rr) throw new Error('Reassignment request not found');
  if (rr.status !== 'Pending') throw new Error('Request already processed');
  const assetId = rr.assetId;
  const { defaultUpdateIntervalDays } = await settingService.getSettings();
  const now = new Date();
  const dueUpdate = new Date(now.getTime() + defaultUpdateIntervalDays * 24 * 60 * 60 * 1000);

  const assignmentData = {
    assetId,
    holderFullName: rr.newHolderFullName,
    holderNip: rr.newHolderNip,
    holderBranchCode: rr.newHolderBranchCode,
    holderBranchId: rr.newHolderBranchId ?? null,
    holderDivision: rr.newHolderDivision,
    holderEmail: rr.newHolderEmail,
    holderPhone: rr.newHolderPhone,
    dueUpdate,
    latitude: rr.newHolderLatitude ?? undefined,
    longitude: rr.newHolderLongitude ?? undefined,
    address: rr.newHolderAddress ?? undefined,
  };
  const assetUpdateData = {
    status: 'Available',
    dueUpdate,
    ...(rr.newHolderLatitude != null && { latitude: rr.newHolderLatitude }),
    ...(rr.newHolderLongitude != null && { longitude: rr.newHolderLongitude }),
    ...(Array.isArray(rr.newHolderUpdateImages) && rr.newHolderUpdateImages.length > 0 && { updateImages: rr.newHolderUpdateImages }),
  };
  await prisma.$transaction([
    prisma.assetAssignment.create({
      data: assignmentData,
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: assetUpdateData,
    }),
    prisma.reassignmentRequest.update({
      where: { id: requestId },
      data: { status: 'Approved', processedAt: now },
    }),
  ]);
  invalidateReassignmentRequests();
  invalidateAssets();
  return { ok: true };
}

export async function rejectReassignmentRequest(requestId) {
  const rr = await prisma.reassignmentRequest.findUnique({ where: { id: requestId } });
  if (!rr) throw new Error('Reassignment request not found');
  if (rr.status !== 'Pending') throw new Error('Request already processed');
  await prisma.reassignmentRequest.update({
    where: { id: requestId },
    data: { status: 'Rejected', processedAt: new Date() },
  });
  invalidateReassignmentRequests();
  return { ok: true };
}
