import { Router } from 'express';
import * as assetRequestController from '../controllers/assetRequestController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateQuery } from '../middleware/validate.js';
import { uploadSingle, validateImageMagicSingle } from '../middleware/upload.js';
import {
  createAssetRequestSchema,
  approveAssetRequestSchema,
  getAssetRequestsQuerySchema,
} from '../validators/assetRequest.js';

const router = Router();

router.get('/', authMiddleware, validateQuery(getAssetRequestsQuerySchema), assetRequestController.getAssetRequests);
router.post(
  '/',
  authMiddleware,
  requireRole('Admin Cabang'),
  uploadSingle,
  validateImageMagicSingle,
  (req, res, next) => {
    const body = req.body || {};
    // FIX [F007]: Admin Cabang may only create asset requests for their own branch
    const branchId = req.user?.role === 'Admin Cabang' ? req.user?.branchId : (body.branchId || req.user?.branchId);
    const parsed = {
      serialNumber: body.serialNumber,
      type: body.type,
      brand: body.brand,
      model: body.model,
      detail: body.detail,
      branchId: branchId || req.user?.branchId,
    };
    const result = createAssetRequestSchema.safeParse(parsed);
    if (!result.success) {
      const issues = result.error?.issues ?? [];
      const first = issues[0];
      const message = first ? `${(first.path ?? []).join('.')}: ${first.message}` : 'Validation failed';
      return res.status(400).json({ success: false, error: message });
    }
    req.body = result.data;
    next();
  },
  assetRequestController.createAssetRequest
);
router.patch(
  '/:id/approve',
  authMiddleware,
  requireRole('Admin Pusat'),
  uploadSingle,
  validateImageMagicSingle,
  (req, res, next) => {
    const body = req.body || {};
    const result = approveAssetRequestSchema.safeParse({
      serialNumber: body.serialNumber,
      type: body.type,
      brand: body.brand,
      model: body.model,
      detail: body.detail,
      contractEndDate: body.contractEndDate,
    });
    req.body = result.success ? result.data : {};
    next();
  },
  assetRequestController.approveAssetRequest
);
router.patch('/:id/reject', authMiddleware, requireRole('Admin Pusat'), assetRequestController.rejectAssetRequest);

export default router;
