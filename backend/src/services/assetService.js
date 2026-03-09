import { prisma } from '../lib/prisma.js';
import { deleteManyFromSupabase, uploadBeritaAcaraPdf as uploadBeritaAcaraPdfToStorage, uploadToSupabase, urlToStoragePath } from '../lib/supabase.js';
import { cache, invalidateAssets, invalidateBranches, KEYS } from '../utils/cache.js';
import * as assetHistoryService from './assetHistoryService.js';

function mapAsset(asset) {
  const currentAssignment = asset.assignments?.[0];
  // Current holder = latest assignment exists (status can be Available with holder after assign/reassign)
  const hasCurrentHolder = !!currentAssignment;
  const holder = hasCurrentHolder
    ? {
        fullName: currentAssignment.holderFullName,
        nip: currentAssignment.holderNip,
        branchCode: currentAssignment.holderBranchCode,
        branchId: currentAssignment.holderBranchId ?? null,
        branchName: currentAssignment.holderBranch?.name ?? currentAssignment.holderBranchCode ?? null,
        division: currentAssignment.holderDivision,
        email: currentAssignment.holderEmail,
        phone: currentAssignment.holderPhone,
      }
    : null;
  return {
    id: asset.id,
    serialNumber: asset.serialNumber,
    type: asset.type,
    brand: asset.brand,
    model: asset.model,
    detail: asset.detail,
    branch_id: asset.branchId,
    branch_name: asset.branch?.name ?? null,
    status: asset.status,
    photoUrl: asset.photoUrl,
    updateImages: asset.updateImages ?? null,
    latitude: asset.latitude,
    longitude: asset.longitude,
    dueUpdate: asset.dueUpdate?.toISOString() ?? null,
    contractEndDate: asset.contractEndDate?.toISOString() ?? null,
    lastUpdate: currentAssignment?.updatedAt?.toISOString() ?? asset.updatedAt?.toISOString(),
    holder,
    pastHolders: [],
    repairType: asset.repairs?.[0]?.repairType ?? null,
  };
}

export async function getAssets(filters, userRole, userBranchId) {
  const cacheKey = KEYS.ASSETS + JSON.stringify({ filters, userRole, userBranchId });
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const where = { deletedAt: null };
  if (filters.excludeDeleted !== false) {
    where.deletedAt = null;
  }
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.status) where.status = filters.status;
  if (userRole === 'Admin Cabang' && userBranchId) {
    where.branchId = userBranchId;
  }

  const contractFilter = filters.contract || 'active';
  if (contractFilter !== 'all') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (contractFilter === 'expired') {
      where.contractEndDate = { lt: today };
    } else {
      // active (default): include assets without contractEndDate or not past due
      where.OR = [{ contractEndDate: null }, { contractEndDate: { gte: today } }];
    }
  }

  const assets = await prisma.asset.findMany({
    where,
    select: {
      id: true,
      serialNumber: true,
      type: true,
      brand: true,
      model: true,
      detail: true,
      branchId: true,
      status: true,
      photoUrl: true,
      updateImages: true,
      latitude: true,
      longitude: true,
      dueUpdate: true,
      contractEndDate: true,
      updatedAt: true,
      branch: { select: { name: true } },
      assignments: {
        orderBy: { assignedAt: 'desc' },
        take: 1,
        select: {
          holderFullName: true,
          holderNip: true,
          holderBranchCode: true,
          holderBranchId: true,
          holderDivision: true,
          holderEmail: true,
          holderPhone: true,
          updatedAt: true,
          holderBranch: { select: { name: true } },
        },
      },
      repairs: {
        where: { status: 'in_repair' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { repairType: true },
      },
    },
  });

  const result = assets.map(mapAsset);
  cache.set(cacheKey, result);
  return result;
}

export async function getAssetById(id, userRole, userBranchId) {
  const cacheKey = KEYS.ASSET_ID(id);
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const asset = await prisma.asset.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      serialNumber: true,
      type: true,
      brand: true,
      model: true,
      detail: true,
      branchId: true,
      status: true,
      photoUrl: true,
      updateImages: true,
      latitude: true,
      longitude: true,
      dueUpdate: true,
      contractEndDate: true,
      updatedAt: true,
      branch: { select: { name: true } },
      assignments: {
        orderBy: { assignedAt: 'desc' },
        select: {
          id: true,
          holderFullName: true,
          holderNip: true,
          holderBranchCode: true,
          holderBranchId: true,
          holderDivision: true,
          holderEmail: true,
          holderPhone: true,
          assignedAt: true,
          dueUpdate: true,
          updatedAt: true,
          latitude: true,
          longitude: true,
          address: true,
          holderBranch: { select: { name: true } },
        },
      },
      repairs: {
        where: { status: 'in_repair' },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { repairType: true },
      },
    },
  });
  if (!asset) return null;
  if (userRole === 'Admin Cabang' && asset.branchId !== userBranchId) {
    return null;
  }
  const allAssignments = asset.assignments || [];
  const pastAssignments = allAssignments.slice(1);
  const result = {
    ...mapAsset(asset),
    pastHolders: pastAssignments.map((a) => ({
      fullName: a.holderFullName,
      nip: a.holderNip,
      branchCode: a.holderBranchCode,
      branchName: a.holderBranch?.name ?? a.holderBranchCode ?? null,
      division: a.holderDivision,
      email: a.holderEmail,
      phone: a.holderPhone,
      periodStart: a.assignedAt?.toISOString(),
      periodEnd: a.dueUpdate?.toISOString(),
      latitude: a.latitude,
      longitude: a.longitude,
      address: a.address,
    })),
  };
  cache.set(cacheKey, result);
  return result;
}

export async function createAsset(data, photoUrl, userId = null) {
  let contractEndDate = null;
  if (data.contractEndDate) {
    const raw = String(data.contractEndDate).trim();
    contractEndDate = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);
    if (Number.isNaN(contractEndDate.getTime())) contractEndDate = null;
  }
  const asset = await prisma.asset.create({
    data: {
      serialNumber: data.serialNumber,
      type: data.type,
      brand: data.brand,
      model: data.model,
      detail: data.detail,
      branchId: data.branchId,
      status: 'Available',
      photoUrl: photoUrl || null,
      contractEndDate,
    },
    include: { branch: true, assignments: [] },
  });
  await assetHistoryService.recordHistory(asset.id, 'created', {
    branchName: asset.branch?.name ?? null,
    serialNumber: asset.serialNumber,
  }, userId);
  invalidateAssets();
  invalidateBranches();
  return mapAsset(asset);
}

export async function updateAsset(id, data, userRole, userBranchId, userId = null) {
  const existing = await prisma.asset.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) throw new Error('Asset not found');
  if (userRole === 'Admin Cabang' && existing.branchId !== userBranchId) {
    throw new Error('Forbidden');
  }
  const payload = { ...data };
  if (payload.dueUpdate !== undefined && typeof payload.dueUpdate === 'string') {
    payload.dueUpdate = new Date(payload.dueUpdate);
  }
  if (payload.contractEndDate !== undefined) {
    if (payload.contractEndDate === null || payload.contractEndDate === '') {
      payload.contractEndDate = null;
    } else if (typeof payload.contractEndDate === 'string') {
      const raw = payload.contractEndDate.trim();
      payload.contractEndDate = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T00:00:00.000Z`) : new Date(raw);
    }
  }
  const statusChanged = payload.status !== undefined && payload.status !== existing.status;
  const hasConditionUpdate = Array.isArray(payload.updateImages) && payload.updateImages.length > 0;
  const asset = await prisma.asset.update({
    where: { id },
    data: payload,
    include: {
      branch: true,
      assignments: { orderBy: { assignedAt: 'desc' }, take: 1 },
    },
  });
  if (statusChanged) {
    await assetHistoryService.recordHistory(id, 'status_change', {
      fromStatus: existing.status,
      toStatus: asset.status,
    }, userId);
  }
  if (hasConditionUpdate) {
    await assetHistoryService.recordHistory(id, 'condition_update', {
      updateImages: payload.updateImages,
      latitude: payload.latitude ?? existing.latitude,
      longitude: payload.longitude ?? existing.longitude,
    }, userId);
  }
  invalidateAssets();
  return mapAsset(asset);
}

export async function deleteAsset(id, userRole, userBranchId) {
  const existing = await prisma.asset.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      branchId: true,
      photoUrl: true,
      updateImages: true,
    },
  });
  if (!existing) throw new Error('Asset not found');
  if (userRole === 'Admin Cabang' && existing.branchId !== userBranchId) {
    throw new Error('Forbidden');
  }

  const pathsToDelete = [];
  if (existing.photoUrl) {
    const p = urlToStoragePath(existing.photoUrl);
    if (p) pathsToDelete.push(p);
  }
  const imgs = Array.isArray(existing.updateImages) ? existing.updateImages : [];
  for (const url of imgs) {
    const p = urlToStoragePath(url);
    if (p) pathsToDelete.push(p);
  }
  if (pathsToDelete.length > 0) {
    await deleteManyFromSupabase(pathsToDelete);
  }

  await prisma.asset.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  invalidateAssets();
  invalidateBranches();
  return { ok: true };
}

export async function assignAsset(assetId, payload, userId, userRole, userBranchId) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, deletedAt: null },
    select: { id: true, branchId: true },
  });
  if (!asset) throw new Error('Asset not found');
  if (asset.branchId !== userBranchId) throw new Error('Forbidden');
  if (userRole !== 'Admin Cabang') throw new Error('Only Admin Cabang can assign');

  const updateImages = Array.isArray(payload.updateImages) ? payload.updateImages : [];
  if (updateImages.length < 1 || updateImages.length > 4) {
    throw new Error('Asset condition photos: minimum 1, maximum 4');
  }

  const dueUpdate = payload.dueUpdate ? new Date(payload.dueUpdate) : null;
  const holderBranchId = payload.holderBranchId || userBranchId || null;
  await prisma.$transaction([
    prisma.assetAssignment.create({
      data: {
        assetId,
        holderFullName: payload.holderFullName,
        holderNip: payload.holderNip,
        holderBranchCode: payload.holderBranchCode ?? null,
        holderBranchId,
        holderDivision: payload.holderDivision,
        holderEmail: payload.holderEmail,
        holderPhone: payload.holderPhone,
        dueUpdate,
        latitude: payload.latitude,
        longitude: payload.longitude,
        address: payload.address,
      },
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: {
        status: 'Available',
        updateImages,
        latitude: payload.latitude,
        longitude: payload.longitude,
        dueUpdate,
      },
    }),
  ]);
  await assetHistoryService.recordHistory(assetId, 'assigned', {
    holderFullName: payload.holderFullName,
    holderNip: payload.holderNip,
    holderBranchCode: payload.holderBranchCode,
    holderDivision: payload.holderDivision,
    updateImages,
    latitude: payload.latitude,
    longitude: payload.longitude,
    dueUpdate: dueUpdate?.toISOString?.() ?? null,
  }, userId);
  invalidateAssets();
  return getAssetById(assetId, userRole, userBranchId);
}

export async function uploadAssetPhoto(fileBuffer, fileName, mimeType) {
  return uploadToSupabase(fileBuffer, fileName, mimeType);
}

export async function uploadBeritaAcaraPdf(fileBuffer, fileName) {
  return uploadBeritaAcaraPdfToStorage(fileBuffer, fileName);
}
