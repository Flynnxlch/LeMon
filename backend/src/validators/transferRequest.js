import { z } from 'zod';

export const createTransferRequestSchema = z.object({
  assetId: z.string().min(1),
  toBranchId: z.string().min(1),
  notes: z.string().min(10).max(2000),
}).strict();

export const getTransferRequestsQuerySchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
}).strict();

export const directTransferSchema = z.object({
  assetId: z.string().min(1),
  toBranchId: z.string().min(1),
  notes: z.string().max(2000).optional(),
}).strict();
