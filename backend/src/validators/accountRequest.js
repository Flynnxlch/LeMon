import { z } from 'zod';

export const createAccountRequestSchema = z.object({
  name: z.string().min(1).max(200),
  nip: z.string().min(1).max(50),
  email: z.string().email().max(255),
  phone: z.string().min(1).max(30),
  password: z.string().min(8).max(128),
}).strict();

export const approveAccountRequestSchema = z.object({
  branchId: z.string().min(1, 'Branch must be assigned when approving'),
  password: z.string().min(8).max(128).optional(),
}).strict();
