import { Router } from 'express';
import * as transferRequestController from '../controllers/transferRequestController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createTransferRequestSchema, getTransferRequestsQuerySchema, directTransferSchema } from '../validators/transferRequest.js';

const router = Router();

router.get('/', authMiddleware, validateQuery(getTransferRequestsQuerySchema), transferRequestController.getTransferRequests);
router.post('/direct', authMiddleware, requireRole('Admin Pusat'), validateBody(directTransferSchema), transferRequestController.directTransfer);
router.post('/', authMiddleware, requireRole('Admin Pusat', 'Admin Cabang'), validateBody(createTransferRequestSchema), transferRequestController.createTransferRequest);
router.patch('/:id/approve', authMiddleware, requireRole('Admin Pusat'), transferRequestController.approveTransferRequest);
router.patch('/:id/reject', authMiddleware, requireRole('Admin Pusat'), transferRequestController.rejectTransferRequest);

export default router;
