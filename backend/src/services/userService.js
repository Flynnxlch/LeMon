import { prisma } from '../lib/prisma.js';
import { cache, invalidateAccountRequests, invalidateUsers, KEYS } from '../utils/cache.js';

export async function getUsers(filters = {}) {
  const cacheKey = KEYS.USERS + JSON.stringify(filters);
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const where = {};
  if (filters.branchId) where.branchId = filters.branchId;
  if (filters.role) where.role = filters.role;
  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      branchId: true,
      nip: true,
      phone: true,
      status: true,
      createdAt: true,
      branch: { select: { name: true } },
    },
  });
  const result = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    branchId: u.branchId,
    branchName: u.branch?.name ?? null,
    nip: u.nip,
    phone: u.phone,
    status: u.status,
    created: u.createdAt,
  }));
  cache.set(cacheKey, result);
  return result;
}

export async function getAccountRequests(status) {
  const cacheKey = KEYS.ACCOUNT_REQUESTS + (status || '');
  const cached = cache.get(cacheKey);
  if (cached) return cached;
  const where = status ? { status } : {};
  const list = await prisma.accountRequest.findMany({
    where,
    orderBy: { requestedAt: 'desc' },
    select: {
      id: true,
      name: true,
      nip: true,
      email: true,
      phone: true,
      branchId: true,
      role: true,
      status: true,
      requestedAt: true,
      branch: { select: { name: true } },
    },
  });
  const result = list.map((r) => ({
    id: r.id,
    name: r.name,
    nip: r.nip,
    email: r.email,
    phone: r.phone,
    branchId: r.branchId,
    branchName: r.branch?.name ?? null,
    role: r.role,
    status: r.status,
    requestedAt: r.requestedAt,
  }));
  cache.set(cacheKey, result);
  return result;
}

export async function createAccountRequest(data, passwordHash) {
  const existing = await prisma.accountRequest.findFirst({
    where: { email: data.email, status: 'Pending' },
  });
  if (existing) {
    throw new Error('A pending account request with this email already exists');
  }
  const req = await prisma.accountRequest.create({
    data: {
      name: data.name,
      nip: data.nip,
      email: data.email,
      phone: data.phone,
      branchId: data.branchId ?? null,
      role: 'Admin Cabang',
      passwordHash,
      status: 'Pending',
    },
    include: { branch: true },
  });
  invalidateAccountRequests();
  return {
    id: req.id,
    name: req.name,
    email: req.email,
    branchId: req.branchId,
    branchName: req.branch?.name ?? null,
    status: req.status,
    requestedAt: req.requestedAt,
  };
}

export async function approveAccountRequest(requestId, adminUserId, options = {}) {
  const { passwordHash: optionalPasswordHash, branchId: assignedBranchId } = options;
  const req = await prisma.accountRequest.findUnique({
    where: { id: requestId },
    include: { branch: true },
  });
  if (!req) throw new Error('Account request not found');
  if (req.status !== 'Pending') throw new Error('Request already processed');
  if (!assignedBranchId) throw new Error('Branch must be assigned when approving');
  const passwordHash = optionalPasswordHash || req.passwordHash;
  const user = await prisma.user.create({
    data: {
      name: req.name,
      email: req.email,
      password: passwordHash,
      role: req.role,
      branchId: assignedBranchId,
      nip: req.nip,
      phone: req.phone,
      status: 'Active',
    },
  });
  await prisma.accountRequest.update({
    where: { id: requestId },
    data: { status: 'Approved', processedAt: new Date() },
  });
  invalidateAccountRequests();
  invalidateUsers();
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    branchId: user.branchId,
  };
}

export async function rejectAccountRequest(requestId) {
  const req = await prisma.accountRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error('Account request not found');
  if (req.status !== 'Pending') throw new Error('Request already processed');
  await prisma.accountRequest.update({
    where: { id: requestId },
    data: { status: 'Rejected', processedAt: new Date() },
  });
  invalidateAccountRequests();
  return { ok: true };
}

export async function updateUserBranch(userId, branchId, adminUserId) {
  if (userId === adminUserId) {
    throw new Error('Cannot update your own branch');
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  if (branchId) {
    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) throw new Error('Branch not found');
  }
  await prisma.user.update({
    where: { id: userId },
    data: { branchId: branchId || null },
  });
  invalidateUsers();
  return { ok: true };
}

export async function deleteUser(userId, adminUserId) {
  if (userId === adminUserId) {
    throw new Error('Cannot delete your own account');
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error('User not found');
  try {
    await prisma.user.delete({ where: { id: userId } });
  } catch (err) {
    if (err.code === 'P2003') {
      throw new Error('Cannot delete user: they have related records (transfer requests, reassignments, or asset requests)');
    }
    throw err;
  }
  invalidateUsers();
  return { ok: true };
}

// ── Password change requests (admin approval) ───────────────────────────

export async function getPasswordApprovals(status = 'Pending') {
  const list = await prisma.passwordChangeRequest.findMany({
    where: { status },
    orderBy: { requestedAt: 'desc' },
    include: {
      user: {
        select: { id: true, name: true, email: true, nip: true, role: true, branch: { select: { name: true } } },
      },
    },
  });
  return list.map((r) => ({
    id: r.id,
    userId: r.userId,
    name: r.user.name,
    email: r.user.email,
    nip: r.user.nip ?? null,
    role: r.user.role,
    branchName: r.user.branch?.name ?? null,
    requestedAt: r.requestedAt,
    status: r.status,
  }));
}

export async function getPasswordApprovalById(id) {
  const r = await prisma.passwordChangeRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, name: true, email: true, nip: true, phone: true, role: true, branch: { select: { name: true } } },
      },
    },
  });
  if (!r) return null;
  return {
    id: r.id,
    userId: r.userId,
    name: r.user.name,
    email: r.user.email,
    nip: r.user.nip ?? null,
    phone: r.user.phone ?? null,
    role: r.user.role,
    branchName: r.user.branch?.name ?? null,
    requestedAt: r.requestedAt,
    processedAt: r.processedAt,
    status: r.status,
  };
}

export async function approvePasswordRequest(requestId, adminUserId) {
  const req = await prisma.passwordChangeRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  if (!req) throw new Error('Password change request not found');
  if (req.status !== 'Pending') throw new Error('Request already processed');
  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.userId },
      data: { password: req.newPasswordHash },
    }),
    prisma.passwordChangeRequest.update({
      where: { id: requestId },
      data: { status: 'Approved', processedAt: new Date(), processedById: adminUserId },
    }),
  ]);
  invalidateUsers();
  return { ok: true };
}

export async function rejectPasswordRequest(requestId, adminUserId) {
  const req = await prisma.passwordChangeRequest.findUnique({ where: { id: requestId } });
  if (!req) throw new Error('Password change request not found');
  if (req.status !== 'Pending') throw new Error('Request already processed');
  await prisma.passwordChangeRequest.update({
    where: { id: requestId },
    data: { status: 'Rejected', processedAt: new Date(), processedById: adminUserId },
  });
  return { ok: true };
}
