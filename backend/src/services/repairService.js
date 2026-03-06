import { prisma } from '../lib/prisma.js';
import { invalidateAssets, invalidateBranches, invalidateTransferRequests } from '../utils/cache.js';
import * as transferRequestService from './transferRequestService.js';
import * as settingService from './settingService.js';

/**
 * Get active repair record for an asset (status = in_repair).
 */
export async function getActiveRepairByAssetId(assetId) {
  const repair = await prisma.assetRepair.findFirst({
    where: { assetId, status: 'in_repair' },
    include: {
      fromBranch: { select: { id: true, name: true } },
      toBranch: { select: { id: true, name: true } },
    },
  });
  if (!repair) return null;
  return {
    id: repair.id,
    assetId: repair.assetId,
    repairType: repair.repairType,
    fromBranchId: repair.fromBranchId,
    fromBranchName: repair.fromBranch?.name,
    toBranchId: repair.toBranchId,
    toBranchName: repair.toBranch?.name,
    transferRequestId: repair.transferRequestId,
    status: repair.status,
    completedAt: repair.completedAt?.toISOString() ?? null,
    createdAt: repair.createdAt?.toISOString() ?? null,
  };
}

/**
 * Start repair: at_branch (status -> Dalam Perbaikan) or transfer (create transfer request + repair record).
 * Admin Pusat only.
 */
export async function startRepair(assetId, payload, userRole, userId) {
  if (userRole !== 'Admin Pusat') throw new Error('Only Admin Pusat can start repair');
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, deletedAt: null },
    select: { id: true, branchId: true, status: true },
  });
  if (!asset) throw new Error('Asset not found');
  if (asset.status !== 'Rusak') throw new Error('Asset must have status Rusak to start repair');

  const repairType = payload.repairType === 'transfer' ? 'transfer' : 'at_branch';
  if (repairType === 'at_branch') {
    await prisma.$transaction([
      prisma.asset.update({
        where: { id: assetId },
        data: { status: 'Dalam Perbaikan' },
      }),
      prisma.assetRepair.create({
        data: {
          assetId,
          repairType: 'at_branch',
          fromBranchId: asset.branchId,
          status: 'in_repair',
        },
      }),
    ]);
    invalidateAssets();
    return { ok: true, repairType: 'at_branch' };
  }

  // transfer: create transfer request with purpose=repair, then create AssetRepair linked to it
  const toBranchId = payload.toBranchId;
  if (!toBranchId || toBranchId === asset.branchId) throw new Error('Select a different branch for repair transfer');
  const tr = await prisma.transferRequest.create({
    data: {
      assetId,
      fromBranchId: asset.branchId,
      toBranchId,
      notes: payload.notes || 'Transfer sementara untuk perbaikan',
      purpose: 'repair',
      requestedById: userId,
      status: 'Pending',
    },
  });
  await prisma.assetRepair.create({
    data: {
      assetId,
      repairType: 'transfer',
      fromBranchId: asset.branchId,
      toBranchId,
      transferRequestId: tr.id,
      status: 'in_repair',
    },
  });
  invalidateTransferRequests();
  invalidateAssets();
  return { ok: true, repairType: 'transfer', transferRequestId: tr.id };
}

/**
 * Complete repair: optionally return asset to original branch (if transfer), then set condition photos + assign (previous or new holder) and status Available.
 * Admin Pusat only.
 */
export async function completeRepair(assetId, payload, userRole, userId) {
  if (userRole !== 'Admin Pusat') throw new Error('Only Admin Pusat can complete repair');
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, deletedAt: null },
    include: {
      branch: { select: { id: true, name: true } },
      assignments: { orderBy: { assignedAt: 'desc' }, take: 1 },
    },
  });
  if (!asset) throw new Error('Asset not found');
  if (asset.status !== 'Dalam Perbaikan') throw new Error('Asset must have status Dalam Perbaikan to complete repair');

  const repair = await getActiveRepairByAssetId(assetId);
  if (!repair) throw new Error('No active repair record found for this asset');

  const returnToPreviousUser = payload.returnToPreviousUser === true || payload.returnToPreviousUser === 'true';
  const updateImages = Array.isArray(payload.updateImages) ? payload.updateImages : [];
  if (updateImages.length < 1 || updateImages.length > 4) {
    throw new Error('Condition photos: minimum 1, maximum 4');
  }

  // If transfer repair and asset is not at fromBranchId, do direct transfer back first
  if (repair.repairType === 'transfer' && asset.branchId !== repair.fromBranchId) {
    await transferRequestService.directTransfer({
      assetId,
      toBranchId: repair.fromBranchId,
    });
    // Re-fetch asset after transfer
    const updated = await prisma.asset.findFirst({
      where: { id: assetId },
      include: { assignments: { orderBy: { assignedAt: 'desc' }, take: 1 } },
    });
    asset.assignments = updated?.assignments ?? asset.assignments;
    asset.branchId = repair.fromBranchId;
  }

  const { defaultUpdateIntervalDays } = await settingService.getSettings();
  const now = new Date();
  const dueUpdate = new Date(now.getTime() + (defaultUpdateIntervalDays || 7) * 24 * 60 * 60 * 1000);

  let assignmentData;
  if (returnToPreviousUser && asset.assignments?.[0]) {
    const prev = asset.assignments[0];
    assignmentData = {
      assetId,
      holderFullName: prev.holderFullName,
      holderNip: prev.holderNip,
      holderBranchCode: prev.holderBranchCode,
      holderBranchId: prev.holderBranchId,
      holderDivision: prev.holderDivision,
      holderEmail: prev.holderEmail,
      holderPhone: prev.holderPhone,
      dueUpdate,
      latitude: payload.latitude ?? prev.latitude,
      longitude: payload.longitude ?? prev.longitude,
      address: payload.address ?? prev.address,
    };
  } else {
    if (!payload.holderFullName?.trim()) throw new Error('Holder name is required when reassigning');
    assignmentData = {
      assetId,
      holderFullName: payload.holderFullName,
      holderNip: payload.holderNip ?? null,
      holderBranchCode: payload.holderBranchCode ?? null,
      holderBranchId: payload.holderBranchId ?? null,
      holderDivision: payload.holderDivision ?? null,
      holderEmail: payload.holderEmail ?? null,
      holderPhone: payload.holderPhone ?? null,
      dueUpdate,
      latitude: payload.latitude ?? null,
      longitude: payload.longitude ?? null,
      address: payload.address ?? null,
    };
  }

  await prisma.$transaction([
    prisma.assetAssignment.create({
      data: assignmentData,
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: {
        status: 'Available',
        updateImages,
        dueUpdate,
        latitude: assignmentData.latitude ?? undefined,
        longitude: assignmentData.longitude ?? undefined,
      },
    }),
    prisma.assetRepair.update({
      where: { id: repair.id },
      data: { status: 'completed', completedAt: now },
    }),
  ]);
  invalidateAssets();
  invalidateBranches();
  return { ok: true };
}
