import { z } from 'zod';

export const createReassignmentRequestSchema = z.object({
  assetId: z.string().min(1),
  newHolderFullName: z.string().min(1).max(200),
  newHolderNip: z.string().max(50).optional(),
  newHolderBranchCode: z.string().max(20).optional(),
  newHolderDivision: z.string().max(100).optional(),
  newHolderEmail: z.string().email().max(255).optional(),
  newHolderPhone: z.string().max(30).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

export const getReassignmentRequestsQuerySchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
}).strict();
