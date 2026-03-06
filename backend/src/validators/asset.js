import { z } from 'zod';

const statusOptions = ['Available', 'Perlu Diupdate', 'Diperbaiki', 'Rusak', 'Dalam Perbaikan', 'Hilang'];

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
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  dueUpdate: z.string().datetime().optional().nullable(),
  updateImages: z.array(z.string().url()).optional().nullable(),
}).strict();

export const assignAssetSchema = z.object({
  holderFullName: z.string().min(1).max(200),
  holderNip: z.string().max(50).optional(),
  holderBranchCode: z.string().max(20).optional(),
  holderBranchId: z.string().min(1).optional(),
  holderDivision: z.string().max(100).optional(),
  holderEmail: z.string().email().max(255).optional(),
  holderPhone: z.string().max(30).optional(),
  dueUpdate: z.string().datetime().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().max(500).optional(),
  updateImages: z.array(z.string().url()).min(1).max(4).optional(),
}).strict();

export const updateAssetPhotosSchema = z.object({
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  updateImages: z.array(z.string().url()).min(1).max(4).optional(),
}).strict();

export const getAssetsQuerySchema = z.object({
  branchId: z.string().optional(),
  status: z.enum(statusOptions).optional(),
  excludeDeleted: z.coerce.boolean().optional(),
}).strict();

export const startRepairSchema = z.object({
  repairType: z.enum(['at_branch', 'transfer']),
  toBranchId: z.string().min(1).optional(), // required when repairType === 'transfer'
  notes: z.string().max(500).optional(),
}).strict().refine((data) => data.repairType !== 'transfer' || (data.toBranchId && data.toBranchId.length > 0), {
  message: 'toBranchId is required when repairType is transfer',
  path: ['toBranchId'],
});

export const completeRepairSchema = z.object({
  returnToPreviousUser: z.boolean().optional(),
  updateImages: z.array(z.string().url()).min(1).max(4),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  holderFullName: z.string().max(200).optional(),
  holderNip: z.string().max(50).optional().nullable(),
  holderBranchCode: z.string().max(20).optional().nullable(),
  holderBranchId: z.string().optional().nullable(),
  holderDivision: z.string().max(100).optional().nullable(),
  holderEmail: z.string().email().max(255).optional().nullable(),
  holderPhone: z.string().max(30).optional().nullable(),
}).strict().refine((data) => data.returnToPreviousUser === true || (data.holderFullName && String(data.holderFullName).trim().length > 0), {
  message: 'holderFullName is required when not returning to previous user',
  path: ['holderFullName'],
});
