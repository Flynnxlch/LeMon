import { Router } from 'express';
import * as reassignmentRequestController from '../controllers/reassignmentRequestController.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createReassignmentRequestSchema, getReassignmentRequestsQuerySchema } from '../validators/reassignmentRequest.js';

const router = Router();

router.get('/', authMiddleware, validateQuery(getReassignmentRequestsQuerySchema), reassignmentRequestController.getReassignmentRequests);
router.post('/', authMiddleware, requireRole('Admin Cabang'), validateBody(createReassignmentRequestSchema), reassignmentRequestController.createReassignmentRequest);
router.patch('/:id/approve', authMiddleware, requireRole('Admin Pusat'), reassignmentRequestController.approveReassignmentRequest);
router.patch('/:id/reject', authMiddleware, requireRole('Admin Pusat'), reassignmentRequestController.rejectReassignmentRequest);

export default router;
