import { z } from 'zod';

export const createReassignmentRequestSchema = z.object({
  assetId: z.string().min(1),
  newHolderFullName: z.string().min(1).max(200),
  newHolderNip: z.string().max(50).optional(),
  newHolderBranchCode: z.string().max(20).optional(),
  newHolderBranchId: z.string().min(1).optional(),
  newHolderDivision: z.string().max(100).optional(),
  newHolderEmail: z.string().email().max(255).optional(),
  newHolderPhone: z.string().max(30).optional(),
  newHolderLatitude: z.coerce.number().optional().nullable(),
  newHolderLongitude: z.coerce.number().optional().nullable(),
  newHolderAddress: z.string().max(500).optional().nullable(),
  newHolderUpdateImages: z.array(z.string().url()).max(4).optional(),
  notes: z.string().max(2000).optional(),
}).strict();

export const getReassignmentRequestsQuerySchema = z.object({
  status: z.enum(['Pending', 'Approved', 'Rejected']).optional(),
}).strict();
