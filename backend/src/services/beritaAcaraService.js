import { prisma } from '../lib/prisma.js';

/**
 * Create a Berita Acara record (after PDF is uploaded to storage and URL is known).
 * DB columns: fileUrl, createdById (pdfUrl/userId mapped for API compatibility).
 */
export async function createBeritaAcara({ assetId, eventType, title, pdfUrl, referenceId = null, userId = null }) {
  return prisma.beritaAcara.create({
    data: {
      assetId,
      eventType,
      title: title ?? 'Berita Acara',
      fileUrl: pdfUrl,
      referenceId,
      createdById: userId,
    },
  });
}

/**
 * Get all Berita Acara for an asset, newest first (for Detail Asset tab).
 * Maps fileUrl -> pdfUrl and createdBy -> user for API response.
 */
export async function getByAssetId(assetId) {
  const rows = await prisma.beritaAcara.findMany({
    where: { assetId },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: { select: { id: true, name: true, email: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    assetId: r.assetId,
    eventType: r.eventType,
    title: r.title,
    pdfUrl: r.fileUrl,
    referenceId: r.referenceId,
    createdAt: r.createdAt.toISOString(),
    user: r.createdBy ? { id: r.createdBy.id, name: r.createdBy.name, email: r.createdBy.email } : null,
  }));
}
