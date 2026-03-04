import { Router } from 'express';
import * as assetController from '../controllers/assetController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { uploadSingle, uploadConditionPhotos, validateImageMagicSingle, validateImageMagicArray } from '../middleware/upload.js';
import { addAssetLimiter } from '../middleware/rateLimiter.js';
import {
  createAssetSchema,
  updateAssetSchema,
  assignAssetSchema,
  updateConditionSchema,
  getAssetsQuerySchema,
} from '../validators/asset.js';

const router = Router();

router.get('/', authMiddleware, validateQuery(getAssetsQuerySchema), assetController.getAssets);
router.get('/:id', authMiddleware, assetController.getAssetById);
router.post(
  '/',
  authMiddleware,
  requireRole('Admin Pusat'),
  addAssetLimiter,
  uploadSingle,
  validateImageMagicSingle,
  (req, res, next) => {
    const body = req.body || {};
    if (body.serialNumber !== undefined) req.body = body;
    else req.body = {};
    next();
  },
  (req, res, next) => {
    const raw = req.body || {};
    const parsed = {
      serialNumber: raw.serialNumber != null ? String(raw.serialNumber).trim() : undefined,
      type: raw.type != null ? String(raw.type).trim() : undefined,
      brand: raw.brand != null ? String(raw.brand).trim() : undefined,
      model: raw.model != null ? String(raw.model).trim() : undefined,
      detail: raw.detail != null && String(raw.detail).trim() !== '' ? String(raw.detail).trim() : undefined,
      branchId: raw.branchId != null && String(raw.branchId).trim() !== '' ? String(raw.branchId).trim() : undefined,
    };
    const result = createAssetSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error?.issues ?? [];
      const first = issues[0];
      const message = first ? `${(first.path ?? []).join('.')}: ${first.message}` : 'Validation failed';
      return res.status(400).json({ success: false, error: message });
    }
    req.body = result.data;
    next();
  },
  assetController.createAsset
);
router.patch('/:id', authMiddleware, validateBody(updateAssetSchema), assetController.updateAsset);
router.delete('/:id', authMiddleware, requireRole('Admin Pusat'), assetController.deleteAsset);

function coerceAssignBody(req, res, next) {
  const b = req.body || {};
  if (b.latitude !== undefined && b.latitude !== '') req.body.latitude = Number(b.latitude);
  if (b.longitude !== undefined && b.longitude !== '') req.body.longitude = Number(b.longitude);
  next();
}
function coerceConditionBody(req, res, next) {
  const b = req.body || {};
  if (b.latitude !== undefined && b.latitude !== '') req.body.latitude = Number(b.latitude);
  if (b.longitude !== undefined && b.longitude !== '') req.body.longitude = Number(b.longitude);
  next();
}

router.post(
  '/:id/assign',
  authMiddleware,
  requireRole('Admin Cabang'),
  uploadConditionPhotos,
  validateImageMagicArray,
  coerceAssignBody,
  validateBody(assignAssetSchema),
  assetController.assignAsset
);
router.patch(
  '/:id/condition',
  authMiddleware,
  requireRole('Admin Pusat', 'Admin Cabang'),
  uploadConditionPhotos,
  validateImageMagicArray,
  coerceConditionBody,
  validateBody(updateConditionSchema),
  assetController.updateCondition
);

export default router;
