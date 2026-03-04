import { z } from 'zod';

const conditionOptions = ['Bagus', 'Rusak', 'Dalam Perbaikan', 'Hilang'];
const statusOptions = ['Available', 'Rented', 'Late'];

export const createAssetSchema = z.object({
  serialNumber: z.string().min(1).max(100),
  type: z.string().min(1).max(100),
  brand: z.string().min(1).max(100),
  model: z.string().min(1).max(100),
  detail: z.string().max(1000).optional(),
  branchId: z.string().min(1),
}).strict();

export const updateAssetSchema = z.object({
  serialNumber: z.string().min(1).max(100).optional(),
  type: z.string().min(1).max(100).optional(),
  brand: z.string().min(1).max(100).optional(),
  model: z.string().min(1).max(100).optional(),
  detail: z.string().max(1000).optional(),
  branchId: z.string().min(1).optional(),
  status: z.enum(statusOptions).optional(),
  condition: z.enum(conditionOptions).optional().nullable(),
  conditionNote: z.string().max(1000).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  dueUpdate: z.string().datetime().optional().nullable(),
}).strict();

export const assignAssetSchema = z.object({
  holderFullName: z.string().min(1).max(200),
  holderNip: z.string().max(50).optional(),
  holderBranchCode: z.string().max(20).optional(),
  holderDivision: z.string().max(100).optional(),
  holderEmail: z.string().email().max(255).optional(),
  holderPhone: z.string().max(30).optional(),
  dueUpdate: z.string().datetime().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().max(500).optional(),
  condition: z.enum(conditionOptions),
  conditionNote: z.string().max(1000).optional(),
  conditionImages: z.array(z.string().url()).optional(),
}).strict();

export const updateConditionSchema = z.object({
  condition: z.enum(conditionOptions),
  conditionNote: z.string().max(1000).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  conditionImages: z.array(z.string().url()).optional(),
}).strict();

export const getAssetsQuerySchema = z.object({
  branchId: z.string().optional(),
  status: z.enum(statusOptions).optional(),
  excludeDeleted: z.coerce.boolean().optional(),
}).strict();
