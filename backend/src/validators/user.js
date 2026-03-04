import { z } from 'zod';

export const updateUserBranchSchema = z.object({
  branchId: z.string().min(1).nullable(),
}).strict();
