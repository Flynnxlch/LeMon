import { z } from 'zod';

export const createAssetRequestSchema = z.object({
  serialNumber: z.string().min(1).max(100),
  type: z.string().min(1).max(100),
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  detail: z.string().max(1000).optional(),
  branchId: z.string().min(1),
}).strict();

export const approveAssetRequestSchema = z.object({
  serialNumber: z.string().min(1).max(100).optional(),
  type: z.string().min(1).max(100).optional(),
  brand: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  detail: z.string().max(1000).optional(),
}).strict();

export const getAssetRequestsQuerySchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
}).strict();
