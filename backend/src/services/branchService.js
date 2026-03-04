import { prisma } from '../lib/prisma.js';
import { cache, KEYS } from '../utils/cache.js';
import { invalidateBranches } from '../utils/cache.js';

export async function getBranches() {
  const cached = cache.get(KEYS.BRANCHES);
  if (cached) return cached;
  const [branches, assetCounts] = await Promise.all([
    prisma.branch.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        phone: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
    }),
    prisma.asset.groupBy({
      by: ['branchId'],
      where: { deletedAt: null },
      _count: true,
    }),
  ]);
  const countByBranch = Object.fromEntries(
    assetCounts.map((c) => [c.branchId, c._count])
  );
  const result = branches.map((b) => ({
    id: b.id,
    name: b.name,
    address: b.address,
    city: b.city,
    phone: b.phone,
    created: b.createdAt,
    userCount: b._count.users,
    assetCount: countByBranch[b.id] ?? 0,
  }));
  cache.set(KEYS.BRANCHES, result);
  return result;
}

export async function getBranchById(id) {
  const cacheKey = KEYS.BRANCH_ID(id);
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const branch = await prisma.branch.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      phone: true,
      createdAt: true,
      _count: { select: { users: true } },
    },
  });
  if (!branch) return null;
  const assetCount = await prisma.asset.count({
    where: { branchId: id, deletedAt: null },
  });
  const result = {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    city: branch.city,
    phone: branch.phone,
    created: branch.createdAt,
    userCount: branch._count.users,
    assetCount,
  };
  cache.set(cacheKey, result);
  return result;
}

export async function createBranch(data) {
  const branch = await prisma.branch.create({
    data: {
      name: data.name,
      address: data.address,
      city: data.city,
      phone: data.phone,
    },
    select: {
      id: true,
      name: true,
      address: true,
      city: true,
      phone: true,
      createdAt: true,
    },
  });
  invalidateBranches();
  return {
    id: branch.id,
    name: branch.name,
    address: branch.address,
    city: branch.city,
    phone: branch.phone,
    created: branch.createdAt,
  };
}

export async function deleteBranch(id) {
  const branch = await prisma.branch.findUnique({ where: { id } });
  if (!branch) throw new Error('Branch not found');
  const assetCount = await prisma.asset.count({ where: { branchId: id, deletedAt: null } });
  if (assetCount > 0) {
    throw new Error('Cannot delete branch: it has assets. Move or remove assets first.');
  }
  await prisma.branch.delete({ where: { id } });
  invalidateBranches();
  return { ok: true };
}
