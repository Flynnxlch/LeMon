import { prisma } from '../lib/prisma.js';

const EVENT_LABELS = {
  created: 'Aset dibuat',
  assigned: 'Aset di-assign',
  condition_update: 'Update kondisi',
  status_change: 'Perubahan status',
  repair_started: 'Perbaikan dimulai',
  repair_completed: 'Perbaikan selesai',
};

function getHistoryDescription(entry) {
  if (entry.eventType === 'status_change') {
    const fromStatus = entry.payload?.fromStatus;
    const toStatus = entry.payload?.toStatus;
    if (toStatus === 'Hilang') return 'Aset Hilang';
    if (fromStatus === 'Hilang' && toStatus === 'Available') return 'Pengadaan Ulang';
  }
  return EVENT_LABELS[entry.eventType] ?? entry.eventType;
}

/**
 * Status aset setelah event ini (untuk filter Progress Track).
 * - Aset dibuat / di-assign / reassign / update kondisi / perbaikan selesai → Available
 * - Perbaikan dimulai → Dalam Perbaikan
 * - status_change → pakai toStatus dari payload
 */
function getHistoryStatus(entry) {
  if (entry.eventType === 'status_change' && entry.payload?.toStatus) {
    return entry.payload.toStatus;
  }
  switch (entry.eventType) {
    case 'created':
    case 'assigned':
    case 'condition_update':
    case 'repair_completed':
      return 'Available';
    case 'repair_started':
      return 'Dalam Perbaikan';
    default:
      return null;
  }
}

/**
 * Build unified progress track list: AssetHistory + TransferRequest + AssetRequest.
 * @param {object} opts - { branchId?, status?, search?, page, limit, userRole, userBranchId }
 * @returns {Promise<{ data: array, total: number, page: number, limit: number }>}
 */
export async function getProgressTrack(opts) {
  const { branchId, status, search, page = 1, limit = 25, userRole, userBranchId } = opts;
  const effectiveBranchId = userRole === 'Admin Cabang' ? userBranchId : branchId || null;
  const searchLower = search && String(search).trim().toLowerCase();
  const statusFilter = status && String(status).trim() !== '' && status !== 'all' ? status : null;

  const assetWhere = { deletedAt: null };
  if (effectiveBranchId) assetWhere.branchId = effectiveBranchId;

  const historyWhere = { asset: assetWhere };
  const transferWhere = { asset: assetWhere };
  const assetReqWhere = effectiveBranchId ? { branchId: effectiveBranchId } : {};

  const [historyRows, transferRows, assetReqRows] = await Promise.all([
    prisma.assetHistory.findMany({
      where: historyWhere,
      orderBy: { createdAt: 'desc' },
      take: 2000,
      include: {
        asset: { select: { id: true, serialNumber: true, branchId: true, branch: { select: { name: true } } } },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.transferRequest.findMany({
      where: transferWhere,
      orderBy: { requestDate: 'desc' },
      take: 500,
      include: {
        asset: { select: { id: true, serialNumber: true, branchId: true, branch: { select: { name: true } } } },
        requestedBy: { select: { id: true, name: true } },
      },
    }),
    prisma.assetRequest.findMany({
      where: assetReqWhere,
      orderBy: { requestDate: 'desc' },
      take: 500,
      include: {
        requestedBy: { select: { id: true, name: true } },
        branch: { select: { id: true, name: true } },
      },
    }),
  ]);

  const historyItems = historyRows.map((r) => ({
    id: `history-${r.id}`,
    type: 'history',
    assetId: r.assetId,
    serialNumber: r.asset?.serialNumber ?? '',
    branchId: r.asset?.branchId ?? null,
    branchName: r.asset?.branch?.name ?? null,
    description: getHistoryDescription(r),
    performedBy: r.user?.name ?? null,
    status: getHistoryStatus(r),
    createdAt: r.createdAt,
  }));

  const transferItems = transferRows.map((r) => ({
    id: `transfer-${r.id}`,
    type: 'transfer_request',
    assetId: r.assetId,
    serialNumber: r.asset?.serialNumber ?? '',
    branchId: r.asset?.branchId ?? null,
    branchName: r.asset?.branch?.name ?? null,
    description: 'Permintaan transfer aset',
    performedBy: r.requestedBy?.name ?? null,
    status: r.status,
    createdAt: r.requestDate,
  }));

  const assetReqItems = assetReqRows.map((r) => ({
    id: `asset_request-${r.id}`,
    type: 'asset_request',
    assetId: null,
    serialNumber: r.serialNumber ?? '',
    branchId: r.branchId,
    branchName: r.branch?.name ?? null,
    description: 'Permintaan aset baru',
    performedBy: r.requestedBy?.name ?? null,
    status: r.status,
    createdAt: r.requestDate,
  }));

  let merged = [...historyItems, ...transferItems, ...assetReqItems];
  merged.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  if (searchLower) {
    merged = merged.filter((item) => {
      const serial = (item.serialNumber || '').toLowerCase();
      const by = (item.performedBy || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      return serial.includes(searchLower) || by.includes(searchLower) || desc.includes(searchLower);
    });
  }

  if (statusFilter) {
    merged = merged.filter((item) => {
      const s = item.status;
      return s === statusFilter;
    });
  }

  const total = merged.length;
  const start = (page - 1) * limit;
  const data = merged.slice(start, start + limit).map((item) => ({
    ...item,
    createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
  }));

  return { data, total, page: Number(page), limit: Number(limit) };
}
