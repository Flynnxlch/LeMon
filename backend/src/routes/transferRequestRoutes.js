import { Router } from 'express';
import * as transferRequestController from '../controllers/transferRequestController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { uploadBeritaAcaraPdf, validateBeritaAcaraPdf } from '../middleware/upload.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createTransferRequestSchema, getTransferRequestsQuerySchema, directTransferSchema } from '../validators/transferRequest.js';

const router = Router();

router.get('/', authMiddleware, validateQuery(getTransferRequestsQuerySchema), transferRequestController.getTransferRequests);
router.post('/direct', authMiddleware, requireRole('Admin Pusat'), uploadBeritaAcaraPdf, validateBeritaAcaraPdf, (req, res, next) => {
  const b = req.body || {};
  req.body = { assetId: b.assetId, toBranchId: b.toBranchId };
  next();
}, validateBody(directTransferSchema), transferRequestController.directTransfer);
router.post('/', authMiddleware, requireRole('Admin Pusat', 'Admin Cabang'), validateBody(createTransferRequestSchema), transferRequestController.createTransferRequest);
router.patch('/:id/approve', authMiddleware, requireRole('Admin Pusat'), uploadBeritaAcaraPdf, validateBeritaAcaraPdf, transferRequestController.approveTransferRequest);
router.patch('/:id/reject', authMiddleware, requireRole('Admin Pusat'), transferRequestController.rejectTransferRequest);

export default router;
