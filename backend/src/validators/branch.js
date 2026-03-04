import { z } from 'zod';

export const createBranchSchema = z
  .object({
    name: z.string().min(1).max(200),
    address: z.string().max(500).optional(),
    city: z.string().max(100).optional(),
    phone: z.string().max(30).optional(),
  })
  .strict();

export const updateBranchSchema = createBranchSchema;
