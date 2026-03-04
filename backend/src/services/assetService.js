import { prisma } from '../lib/prisma.js';
import { cache, KEYS, invalidateAssets, invalidateBranches } from '../utils/cache.js';
import { uploadToSupabase, urlToStoragePath, deleteManyFromSupabase } from '../lib/supabase.js';

function mapAsset(asset) {
  const currentAssignment = asset.assignments?.[0];
  // Available = sudah dikembalikan, tidak ada current holder; hanya Rented/Late yang punya holder
  const hasCurrentHolder = asset.status !== 'Available';
  const holder = hasCurrentHolder && currentAssignment
    ? {
        fullName: currentAssignment.holderFullName,
        nip: currentAssignment.holderNip,
        branchCode: currentAssignment.holderBranchCode,
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
    condition: asset.condition,
    conditionNote: asset.conditionNote,
    photoUrl: asset.photoUrl,
    latitude: asset.latitude,
    longitude: asset.longitude,
    dueUpdate: asset.dueUpdate?.toISOString() ?? null,
    lastUpdate: currentAssignment?.updatedAt?.toISOString() ?? asset.updatedAt?.toISOString(),
    holder,
    pastHolders: [], // can be filled from condition history if needed
    conditionHistory: (asset.conditionHistory || []).map((c) => ({
      id: c.id,
      updatedAt: c.updatedAt,
      condition: c.condition,
      conditionNote: c.conditionNote,
      conditionImages: c.conditionImages,
      latitude: c.latitude,
      longitude: c.longitude,
      holderSnapshot: c.holderSnapshot,
    })),
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
      condition: true,
      conditionNote: true,
      photoUrl: true,
      latitude: true,
      longitude: true,
      dueUpdate: true,
      updatedAt: true,
      branch: { select: { name: true } },
      assignments: {
        orderBy: { assignedAt: 'desc' },
        take: 1,
        select: {
          holderFullName: true,
          holderNip: true,
          holderBranchCode: true,
          holderDivision: true,
          holderEmail: true,
          holderPhone: true,
          updatedAt: true,
        },
      },
      conditionHistory: {
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          id: true,
          updatedAt: true,
          condition: true,
          conditionNote: true,
          conditionImages: true,
          latitude: true,
          longitude: true,
          holderSnapshot: true,
        },
      },
    },
  });

  const result = assets.map(mapAsset);
  cache.set(cacheKey, result);
  console.log('[getAssets] returning', result.length, 'assets');
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
      condition: true,
      conditionNote: true,
      photoUrl: true,
      latitude: true,
      longitude: true,
      dueUpdate: true,
      updatedAt: true,
      branch: { select: { name: true } },
      assignments: {
        orderBy: { assignedAt: 'desc' },
        select: {
          id: true,
          holderFullName: true,
          holderNip: true,
          holderBranchCode: true,
          holderDivision: true,
          holderEmail: true,
          holderPhone: true,
          assignedAt: true,
          dueUpdate: true,
          updatedAt: true,
        },
      },
      conditionHistory: {
        orderBy: { updatedAt: 'desc' },
        select: {
          id: true,
          updatedAt: true,
          condition: true,
          conditionNote: true,
          conditionImages: true,
          latitude: true,
          longitude: true,
          holderSnapshot: true,
        },
      },
    },
  });
  if (!asset) return null;
  if (userRole === 'Admin Cabang' && asset.branchId !== userBranchId) {
    return null;
  }
  const allAssignments = asset.assignments || [];
  // Available = dikembalikan → tidak ada current holder; semua assignment masuk past holder
  const pastAssignments = asset.status === 'Available' ? allAssignments : allAssignments.slice(1);
  const result = {
    ...mapAsset(asset),
    pastHolders: pastAssignments.map((a) => ({
      fullName: a.holderFullName,
      nip: a.holderNip,
      branchCode: a.holderBranchCode,
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

export async function createAsset(data, photoUrl) {
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
    },
    include: { branch: true, assignments: [], conditionHistory: [] },
  });
  invalidateAssets();
  invalidateBranches();
  return mapAsset(asset);
}

export async function updateAsset(id, data, userRole, userBranchId) {
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
  const asset = await prisma.asset.update({
    where: { id },
    data: payload,
    include: {
      branch: true,
      assignments: { orderBy: { assignedAt: 'desc' }, take: 1 },
      conditionHistory: { orderBy: { updatedAt: 'desc' }, take: 20 },
    },
  });
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
      conditionHistory: {
        select: { conditionImages: true },
      },
    },
  });
  if (!existing) throw new Error('Asset not found');
  if (userRole === 'Admin Cabang' && existing.branchId !== userBranchId) {
    throw new Error('Forbidden');
  }

  // Hapus semua file terkait dari Supabase Storage (foto aset + foto kondisi)
  const pathsToDelete = [];
  if (existing.photoUrl) {
    const p = urlToStoragePath(existing.photoUrl);
    if (p) pathsToDelete.push(p);
  }
  for (const ch of existing.conditionHistory || []) {
    const imgs = Array.isArray(ch.conditionImages) ? ch.conditionImages : [];
    for (const url of imgs) {
      const p = urlToStoragePath(url);
      if (p) pathsToDelete.push(p);
    }
  }
  if (pathsToDelete.length > 0) {
    await deleteManyFromSupabase(pathsToDelete);
  }

  // Hard delete: hapus dari database (relasi AssetAssignment, ConditionHistory, dll. cascade)
  await prisma.asset.delete({
    where: { id },
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

  const dueUpdate = payload.dueUpdate ? new Date(payload.dueUpdate) : null;
  await prisma.$transaction([
    prisma.assetAssignment.create({
      data: {
        assetId,
        holderFullName: payload.holderFullName,
        holderNip: payload.holderNip,
        holderBranchCode: payload.holderBranchCode,
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
        status: 'Rented',
        condition: payload.condition,
        conditionNote: payload.conditionNote,
        latitude: payload.latitude,
        longitude: payload.longitude,
        dueUpdate,
      },
    }),
    prisma.conditionHistory.create({
      data: {
        assetId,
        condition: payload.condition,
        conditionNote: payload.conditionNote ?? null,
        conditionImages: Array.isArray(payload.conditionImages) && payload.conditionImages.length > 0
          ? payload.conditionImages
          : null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        holderSnapshot: {
          fullName: payload.holderFullName,
          nip: payload.holderNip,
          branchCode: payload.holderBranchCode,
          division: payload.holderDivision,
          email: payload.holderEmail,
          phone: payload.holderPhone,
        },
      },
    }),
  ]);
  invalidateAssets();
  console.log('[assignAsset] assetId=', assetId, 'conditionImages count=', (payload.conditionImages || []).length);
  return getAssetById(assetId, userRole, userBranchId);
}

export async function updateAssetCondition(assetId, payload, userRole, userBranchId) {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, deletedAt: null },
    select: { id: true, branchId: true },
  });
  if (!asset) throw new Error('Asset not found');
  if (userRole === 'Admin Cabang' && asset.branchId !== userBranchId) {
    throw new Error('Forbidden');
  }
  const assignment = await prisma.assetAssignment.findFirst({
    where: { assetId },
    orderBy: { assignedAt: 'desc' },
  });
  const conditionImages = Array.isArray(payload.conditionImages) && payload.conditionImages.length > 0
    ? payload.conditionImages
    : null;
  await prisma.$transaction([
    prisma.conditionHistory.create({
      data: {
        assetId,
        condition: payload.condition,
        conditionNote: payload.conditionNote ?? null,
        conditionImages,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
        holderSnapshot: assignment
          ? {
              fullName: assignment.holderFullName,
              nip: assignment.holderNip,
              branchCode: assignment.holderBranchCode,
              division: assignment.holderDivision,
              email: assignment.holderEmail,
              phone: assignment.holderPhone,
            }
          : null,
      },
    }),
    prisma.asset.update({
      where: { id: assetId },
      data: {
        condition: payload.condition,
        conditionNote: payload.conditionNote ?? null,
        latitude: payload.latitude ?? null,
        longitude: payload.longitude ?? null,
      },
    }),
  ]);
  invalidateAssets();
  console.log('[updateAssetCondition] assetId=', assetId, 'conditionImages count=', (conditionImages || []).length);
  return getAssetById(assetId, userRole, userBranchId);
}

export async function uploadAssetPhoto(fileBuffer, fileName, mimeType) {
  return uploadToSupabase(fileBuffer, fileName, mimeType);
}
