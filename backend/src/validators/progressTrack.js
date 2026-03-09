import { z } from 'zod';

const statusOptions = [
  'Available',
  'Perlu Diupdate',
  'Diperbaiki',
  'Rusak',
  'Dalam Perbaikan',
  'Hilang',
  'Pending',
  'Approved',
  'Rejected',
];

export const getProgressTrackQuerySchema = z
  .object({
    branchId: z.string().optional(),
    status: z.union([z.enum(statusOptions), z.literal('all')]).optional(),
    search: z.string().max(200).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  })
  .strict();
