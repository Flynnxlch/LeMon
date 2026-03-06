import { prisma } from '../lib/prisma.js';

/**
 * Record an asset history event.
 * @param {string} assetId
 * @param {string} eventType - created | status_change | assigned | condition_update | repair_started | repair_completed
 * @param {object} [payload] - event-specific data (fromStatus, toStatus, updateImages, holderSnapshot, etc.)
 * @param {string} [userId]
 */
export async function recordHistory(assetId, eventType, payload = null, userId = null) {
  await prisma.assetHistory.create({
    data: {
      assetId,
      eventType,
      payload: payload ? JSON.parse(JSON.stringify(payload)) : undefined,
      userId: userId || null,
    },
  });
}

/**
 * Get full history for an asset, ordered by createdAt desc (newest first).
 * Returns list suitable for API: id, eventType, payload, createdAt, user name if any.
 */
export async function getHistoryByAssetId(assetId) {
  const rows = await prisma.assetHistory.findMany({
    where: { assetId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    eventType: r.eventType,
    payload: r.payload ?? {},
    createdAt: r.createdAt.toISOString(),
    user: r.user ? { id: r.user.id, name: r.user.name, email: r.user.email } : null,
  }));
}
